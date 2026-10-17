/* =========================================================
   JERPRI · Rutas de la API
   ---------------------------------------------------------
   Cada ruta recibe ctx = { req, res, params, body, usuario }
   y devuelve un objeto que se envía como JSON.
   Para responder con error se usa fallo(estado, mensaje, extra).
   Las operaciones que tocan varias tablas (pedidos, stock) se
   hacen en TRANSACCIONES: o se guarda todo, o nada.
   ========================================================= */
'use strict';
const crypto = require('crypto');
const { query, transaccion } = require('./db');
const datos = require('./datos');
const val = require('./validaciones');
const seg = require('./seguridad');
const sms = require('./sms');

/* ---------------- Utilidades ---------------- */
class ErrorHttp extends Error {
  constructor(estado, mensaje, extra) { super(mensaje); this.estado = estado; this.extra = extra || {}; }
}
function fallo(estado, mensaje, extra) { throw new ErrorHttp(estado, mensaje, extra); }
function errores(errors, mensaje) { fallo(400, mensaje || 'Revisá los campos marcados.', { errors }); }
const hayErrores = e => Object.keys(e).length > 0;
const nuevoId = prefijo => prefijo + '-' + crypto.randomBytes(5).toString('hex');

/** Cuentas con ese número de teléfono (sin contar la cuenta `excepto`). */
async function cuentasConTelefono(telefono, excepto) {
  const clave = val.telefonoClave(telefono);
  if (!clave) return [];
  const r = await query("SELECT id, nombre, telefono FROM usuarios WHERE telefono <> ''");
  return r.rows.filter(u => u.id !== excepto && val.telefonoClave(u.telefono) === clave);
}
const MSJ_TEL_USADO = 'Ya hay una cuenta con este número de teléfono.';

function requerirUsuario(ctx) { if (!ctx.usuario) fallo(401, 'Iniciá sesión para continuar.'); return ctx.usuario; }
const ROLES = ['admin', 'empleado', 'cliente'];
/** Personal de la tienda: administración y empleados (productos, pedidos, categorías, usuarios y ajustes). */
const esPersonal = u => !!u && (u.rol === 'admin' || u.rol === 'empleado');
function requerirPersonal(ctx) { const u = requerirUsuario(ctx); if (!esPersonal(u)) fallo(403, 'Tu cuenta no tiene acceso al panel de administración.'); return u; }
/** Solo administración (por ejemplo, para cambiar roles). */
function requerirAdmin(ctx) { const u = requerirUsuario(ctx); if (u.rol !== 'admin') fallo(403, 'Solo la administración puede hacer esto.'); return u; }

/** Genera un id legible a partir de un nombre, sin repetir: "zapatilla-urbana", "zapatilla-urbana-x3k"… */
async function idUnico(tabla, nombre, db = { query }) {
  const base = val.slug(nombre);
  let id = base;
  for (;;) {
    const r = await db.query(`SELECT 1 FROM ${tabla} WHERE id = $1`, [id]);
    if (!r.rows.length) return id;
    id = base + '-' + crypto.randomBytes(2).toString('hex');
  }
}

async function ajuste(clave, db = { query }) {
  const r = await db.query('SELECT valor FROM ajustes WHERE clave = $1', [clave]);
  return r.rows.length ? r.rows[0].valor : undefined;
}

/* ---------------- Datos iniciales ---------------- */
async function salud() {
  try { await query('SELECT 1'); return { ok: true, app: 'jerpri', db: true }; }
  catch (e) { return { ok: true, app: 'jerpri', db: false, error: 'No se pudo conectar con PostgreSQL: ' + e.message }; }
}

/** Todo lo que la tienda necesita al abrirse. Cada usuario recibe solo lo que puede ver. */
async function cargarDatos(ctx) {
  const u = ctx.usuario;
  const personal = esPersonal(u);
  const [categories, subcategories, products, settings] = await Promise.all([
    datos.categorias(), datos.subcategorias(), datos.productos(), datos.ajustes()
  ]);
  return {
    ok: true, categories, subcategories, products, settings,
    me: u ? await datos.usuarios(u.id) : null,
    orders: personal ? await datos.pedidos({}) : u ? await datos.pedidos({ usuarioId: u.id }) : [],
    // Administración ve todas las cuentas; los empleados, solo las de clientes
    users: !personal ? [] : u.rol === 'admin' ? await datos.usuarios() : (await datos.usuarios()).filter(x => x.role === 'cliente')
  };
}

/* ---------------- Cuentas ---------------- */
async function registrar(ctx) {
  const { errors, name, email, phone, pw } = val.registro(ctx.body);
  if (!errors.email) {
    const r = await query('SELECT 1 FROM usuarios WHERE email = $1', [email]);
    if (r.rows.length) errors.email = 'Ya existe una cuenta con este correo.';
  }
  if (!errors.phone && (await cuentasConTelefono(phone)).length) errors.phone = MSJ_TEL_USADO;
  if (hayErrores(errors)) errores(errors);
  const id = nuevoId('u');
  try {
    await query('INSERT INTO usuarios (id, nombre, email, telefono, rol, clave_hash) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, name, email, phone, 'cliente', await seg.hashClave(pw)]);
  } catch (e) {
    if (e.code === '23505') errores({ email: 'Ya existe una cuenta con este correo.' });
    throw e;
  }
  await seg.crearSesion(ctx.res, id);
  return { ok: true, user: await datos.usuarios(id) };
}

async function ingresar(ctx) {
  const email = val.txt(ctx.body.email).toLowerCase();
  const clave = String(ctx.body.password || '');
  if (!val.esEmail(email) || !clave) fallo(400, 'Completá correo y contraseña.');
  const r = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
  const u = r.rows[0];
  const ok = u ? await seg.verificarClave(clave, u.clave_hash) : await seg.compararSinUsuario(clave);
  if (!ok) fallo(401, 'Correo o contraseña incorrectos.');
  await query('DELETE FROM sesiones WHERE expira_en < now()');   // limpieza de sesiones vencidas
  await seg.crearSesion(ctx.res, u.id);
  return { ok: true, user: await datos.usuarios(u.id) };
}

async function salir(ctx) {
  await seg.cerrarSesion(ctx.req, ctx.res);
  return { ok: true };
}

/* ---------------- Recuperar contraseña con código por SMS ----------------
   1) /recuperar/codigo    → manda un código de 6 números al teléfono de la cuenta.
   2) /recuperar/verificar → controla el código y entrega un permiso temporal (token).
   3) /recuperar/cambiar   → con ese permiso guarda la contraseña nueva.
   El código vence a los 10 minutos y admite 5 intentos. */
const COD_MINUTOS = 10, COD_INTENTOS = 5, COD_ESPERA_SEG = 60, COD_POR_HORA = 5, TOKEN_MINUTOS = 15;
const sha256 = t => crypto.createHash('sha256').update(String(t)).digest('hex');

async function cuentaParaRecuperar(phone) {
  if (!val.esTelefono(phone)) errores({ phone: 'Ingresá el número de teléfono de tu cuenta, con código de área.' });
  const cuentas = await cuentasConTelefono(phone);
  if (!cuentas.length) errores({ phone: 'No hay ninguna cuenta con ese número de teléfono.' });
  if (cuentas.length > 1) fallo(409, 'Hay más de una cuenta con ese número. Escribinos por WhatsApp para recuperarla.');
  return cuentas[0];
}

async function enviarCodigo(ctx) {
  const u = await cuentaParaRecuperar(ctx.body.phone);
  const prev = (await query(`SELECT count(*)::int AS n, max(creado_en) AS ultimo FROM recuperaciones
    WHERE usuario_id = $1 AND creado_en > now() - interval '1 hour'`, [u.id])).rows[0];
  if (prev.ultimo) {
    const espera = COD_ESPERA_SEG - Math.floor((Date.now() - new Date(prev.ultimo).getTime()) / 1000);
    if (espera > 0) fallo(429, `Esperá ${espera} segundos para pedir otro código.`, { resendIn: espera });
  }
  if (prev.n >= COD_POR_HORA) fallo(429, 'Pediste demasiados códigos. Probá de nuevo en una hora.');

  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await query('UPDATE recuperaciones SET usado = TRUE WHERE usuario_id = $1 AND NOT usado', [u.id]);   // anula los anteriores
  const r = await query(`INSERT INTO recuperaciones (usuario_id, codigo_hash, expira_en)
    VALUES ($1, $2, now() + interval '${COD_MINUTOS} minutes') RETURNING id`, [u.id, await seg.hashClave(codigo)]);
  const envio = await sms.enviarSms(val.telefonoInternacional(u.telefono),
    `JERPRI: tu código para recuperar la contraseña es ${codigo}. Vence en ${COD_MINUTOS} minutos. Si no lo pediste, ignorá este mensaje.`);
  if (!envio.ok) {
    await query('UPDATE recuperaciones SET usado = TRUE WHERE id = $1', [r.rows[0].id]);
    fallo(502, 'No pudimos enviar el SMS. Intentá de nuevo en unos minutos.');
  }
  return { ok: true, phoneMasked: val.telefonoOculto(u.telefono), resendIn: COD_ESPERA_SEG, expiresIn: COD_MINUTOS * 60 };
}

async function verificarCodigo(ctx) {
  const u = await cuentaParaRecuperar(ctx.body.phone);
  const codigo = val.txt(ctx.body.code).replace(/\s/g, '');
  if (!/^\d{6}$/.test(codigo)) errores({ code: 'Escribí los 6 números del código.' });
  const rec = (await query(`SELECT * FROM recuperaciones WHERE usuario_id = $1 AND NOT usado AND token_hash IS NULL AND expira_en > now()
    ORDER BY creado_en DESC LIMIT 1`, [u.id])).rows[0];
  if (!rec) fallo(400, 'El código venció o ya no es válido. Pedí uno nuevo.', { expired: true });
  if (!(await seg.verificarClave(codigo, rec.codigo_hash))) {
    const intentos = rec.intentos + 1;
    await query('UPDATE recuperaciones SET intentos = $1, usado = $2 WHERE id = $3', [intentos, intentos >= COD_INTENTOS, rec.id]);
    const quedan = COD_INTENTOS - intentos;
    if (!quedan) fallo(400, 'Escribiste mal el código demasiadas veces. Pedí uno nuevo.', { expired: true });
    errores({ code: `El código no es correcto. Te quedan ${quedan} intento${quedan === 1 ? '' : 's'}.` });
  }
  const token = crypto.randomBytes(32).toString('hex');
  await query(`UPDATE recuperaciones SET token_hash = $1, expira_en = now() + interval '${TOKEN_MINUTOS} minutes' WHERE id = $2`, [sha256(token), rec.id]);
  return { ok: true, token };
}

async function cambiarClaveRecuperada(ctx) {
  const b = ctx.body, errors = {};
  if (!val.claveValida(b.password)) errors.password = val.MSJ_CLAVE;
  if (b.confirm !== b.password) errors.confirm = 'Las contraseñas no coinciden.';
  if (hayErrores(errors)) errores(errors);
  const token = val.txt(b.token);
  if (!/^[a-f0-9]{64}$/.test(token)) fallo(400, 'El permiso para cambiar la contraseña no es válido. Empezá de nuevo.', { expired: true });
  await transaccion(async cli => {
    const rec = (await cli.query('SELECT id, usuario_id FROM recuperaciones WHERE token_hash = $1 AND NOT usado AND expira_en > now() FOR UPDATE', [sha256(token)])).rows[0];
    if (!rec) fallo(400, 'Pasó demasiado tiempo para cambiar la contraseña. Empezá de nuevo.', { expired: true });
    await cli.query('UPDATE usuarios SET clave_hash = $1 WHERE id = $2', [await seg.hashClave(b.password), rec.usuario_id]);
    await cli.query('UPDATE recuperaciones SET usado = TRUE WHERE usuario_id = $1', [rec.usuario_id]);
    await cli.query('DELETE FROM sesiones WHERE usuario_id = $1', [rec.usuario_id]);   // cierra las sesiones abiertas
  });
  return { ok: true };
}

async function actualizarPerfil(ctx) {
  const u = requerirUsuario(ctx);
  const { errors, name, phone } = val.perfil(ctx.body);
  if (!errors.phone && phone && (await cuentasConTelefono(phone, u.id)).length) errors.phone = MSJ_TEL_USADO;
  if (hayErrores(errors)) errores(errors);
  await query('UPDATE usuarios SET nombre = $1, telefono = $2 WHERE id = $3', [name, phone, u.id]);
  return { ok: true, user: await datos.usuarios(u.id) };
}

async function guardarDireccion(ctx) {
  const u = requerirUsuario(ctx);
  const { errors, data } = val.direccion(ctx.body);
  if (hayErrores(errors)) errores(errors);
  return transaccion(async cli => {
    const actuales = (await cli.query('SELECT id FROM direcciones WHERE usuario_id = $1', [u.id])).rows.map(r => r.id);
    let id = ctx.params.id;
    if (id) {
      if (!actuales.includes(id)) fallo(404, 'La dirección no existe.');
      await cli.query(`UPDATE direcciones SET provincia=$1, ciudad=$2, codigo_postal=$3, calle=$4, numero=$5, piso_depto=$6 WHERE id=$7`,
        [data.province, data.city, data.zip, data.street, data.number, data.apt, id]);
    } else {
      id = nuevoId('dir');
      await cli.query(`INSERT INTO direcciones (id, usuario_id, provincia, ciudad, codigo_postal, calle, numero, piso_depto, principal)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, u.id, data.province, data.city, data.zip, data.street, data.number, data.apt, !actuales.length]);
    }
    if (ctx.body.isDefault) {
      await cli.query('UPDATE direcciones SET principal = (id = $1) WHERE usuario_id = $2', [id, u.id]);
    }
    return { ok: true, data: Object.assign({ id }, data) };
  });
}

async function borrarDireccion(ctx) {
  const u = requerirUsuario(ctx);
  return transaccion(async cli => {
    const r = await cli.query('DELETE FROM direcciones WHERE id = $1 AND usuario_id = $2 RETURNING principal', [ctx.params.id, u.id]);
    if (!r.rows.length) fallo(404, 'La dirección no existe.');
    if (r.rows[0].principal) {   // si se borró la principal, la más antigua pasa a ser principal
      await cli.query(`UPDATE direcciones SET principal = TRUE WHERE id = (
        SELECT id FROM direcciones WHERE usuario_id = $1 ORDER BY creada_en, id LIMIT 1)`, [u.id]);
    }
    return { ok: true };
  });
}

async function direccionPrincipal(ctx) {
  const u = requerirUsuario(ctx);
  const r = await query('SELECT 1 FROM direcciones WHERE id = $1 AND usuario_id = $2', [ctx.params.id, u.id]);
  if (!r.rows.length) fallo(404, 'La dirección no existe.');
  await query('UPDATE direcciones SET principal = (id = $1) WHERE usuario_id = $2', [ctx.params.id, u.id]);
  return { ok: true };
}

/* ---------------- Catálogo (administración) ---------------- */
async function guardarCategoria(ctx) {
  requerirPersonal(ctx);
  const id = ctx.params.id || null;
  const name = val.txt(ctx.body.name);
  if (name.length < 2) fallo(400, 'El nombre de la categoría debe tener al menos 2 caracteres.', { field: 'name' });
  const existentes = (await query('SELECT id, nombre FROM categorias')).rows;
  if (existentes.some(c => val.normalizar(c.nombre) === val.normalizar(name) && c.id !== id)) fallo(400, 'Ya existe una categoría con ese nombre.', { field: 'name' });
  const description = val.txt(ctx.body.description).slice(0, 200);
  const icon = /^[a-zA-Z]{2,20}$/.test(ctx.body.icon || '') ? ctx.body.icon : 'tag';
  if (id) {
    const r = await query('UPDATE categorias SET nombre=$1, descripcion=$2, icono=$3 WHERE id=$4 RETURNING id', [name, description, icon, id]);
    if (!r.rows.length) fallo(404, 'El registro no existe.');
    return { ok: true, data: { id } };
  }
  const nuevo = await idUnico('categorias', name);
  await query('INSERT INTO categorias (id, nombre, descripcion, icono, orden) VALUES ($1,$2,$3,$4,(SELECT COALESCE(MAX(orden),0)+1 FROM categorias))', [nuevo, name, description, icon]);
  return { ok: true, data: { id: nuevo } };
}

async function activarCategoria(ctx) {
  requerirPersonal(ctx);
  const r = await query('UPDATE categorias SET activa = $1 WHERE id = $2 RETURNING id', [!!ctx.body.active, ctx.params.id]);
  if (!r.rows.length) fallo(404, 'El registro no existe.');
  return { ok: true };
}

async function guardarSubcategoria(ctx) {
  requerirPersonal(ctx);
  const id = ctx.params.id || null;
  const name = val.txt(ctx.body.name), categoryId = val.txt(ctx.body.categoryId), errors = {};
  const cat = (await query('SELECT 1 FROM categorias WHERE id = $1', [categoryId])).rows.length;
  if (!cat) errors.categoryId = 'Elegí la categoría a la que pertenece.';
  if (name.length < 2) errors.name = 'El nombre debe tener al menos 2 caracteres.';
  if (!errors.name) {
    const mismas = (await query('SELECT id, nombre FROM subcategorias WHERE categoria_id = $1', [categoryId])).rows;
    if (mismas.some(s => val.normalizar(s.nombre) === val.normalizar(name) && s.id !== id)) errors.name = 'Esa subcategoría ya existe en la categoría elegida.';
  }
  if (hayErrores(errors)) errores(errors);
  if (id) {
    return transaccion(async cli => {
      const r = await cli.query('UPDATE subcategorias SET nombre=$1, categoria_id=$2 WHERE id=$3 RETURNING id', [name, categoryId, id]);
      if (!r.rows.length) fallo(404, 'El registro no existe.');
      // Si cambió de categoría, los productos de otra categoría quedan sin subcategoría
      await cli.query('UPDATE productos SET subcategoria_id = NULL WHERE subcategoria_id = $1 AND categoria_id <> $2', [id, categoryId]);
      if (ctx.body.active !== undefined) await cli.query('UPDATE subcategorias SET activa = $1 WHERE id = $2', [!!ctx.body.active, id]);
      return { ok: true, data: { id } };
    });
  }
  const nuevo = await idUnico('subcategorias', name);
  await query('INSERT INTO subcategorias (id, categoria_id, nombre, orden) VALUES ($1,$2,$3,(SELECT COALESCE(MAX(orden),0)+1 FROM subcategorias))', [nuevo, categoryId, name]);
  return { ok: true, data: { id: nuevo } };
}

async function activarSubcategoria(ctx) {
  requerirPersonal(ctx);
  const r = await query('UPDATE subcategorias SET activa = $1 WHERE id = $2 RETURNING id', [!!ctx.body.active, ctx.params.id]);
  if (!r.rows.length) fallo(404, 'El registro no existe.');
  return { ok: true };
}

async function borrarSubcategoria(ctx) {
  requerirPersonal(ctx);
  const n = await query('SELECT COUNT(*)::int AS n FROM productos WHERE subcategoria_id = $1', [ctx.params.id]);
  const r = await query('DELETE FROM subcategorias WHERE id = $1 RETURNING id', [ctx.params.id]);   // los productos quedan sin subcategoría (ON DELETE SET NULL)
  if (!r.rows.length) fallo(404, 'El registro no existe.');
  return { ok: true, affected: n.rows[0].n };
}

/** Crea (POST) o modifica (PUT /:id) un producto con todas sus variantes. */
async function guardarProducto(ctx) {
  requerirPersonal(ctx);
  const b = ctx.body;
  const cat = (await query('SELECT 1 FROM categorias WHERE id = $1', [val.txt(b.categoryId)])).rows.length > 0;
  const { errors, data } = val.producto(b, cat);
  if (hayErrores(errors)) errores(errors);
  let subId = val.txt(b.subcategoryId) || null;
  if (subId) {
    const s = await query('SELECT categoria_id FROM subcategorias WHERE id = $1', [subId]);
    if (!s.rows.length || s.rows[0].categoria_id !== b.categoryId) subId = null;
  }
  const colores = [...new Set(data.variants.map(v => v.color).filter(Boolean))].map(n => {
    const dado = data.colors.find(c => c.name === n);
    return { name: n, hex: dado ? dado.hex : '#CCCCCC' };
  });

  return transaccion(async cli => {
    let id = ctx.params.id;
    const campos = [data.name, data.description, b.categoryId, subId, data.price, data.saleType, data.featured, data.isNew, data.active,
      JSON.stringify(data.images), JSON.stringify(colores), JSON.stringify(data.audience), data.gender];
    if (id) {
      const r = await cli.query(`UPDATE productos SET nombre=$1, descripcion=$2, categoria_id=$3, subcategoria_id=$4, precio=$5, tipo_venta=$6,
        destacado=$7, nuevo=$8, activo=$9, imagenes=$10::jsonb, colores=$11::jsonb, para=$12::jsonb, genero=$13 WHERE id=$14 RETURNING id`, campos.concat(id));
      if (!r.rows.length) fallo(404, 'El producto no existe.');
    } else {
      id = await idUnico('productos', data.name, cli);
      await cli.query(`INSERT INTO productos (nombre, descripcion, categoria_id, subcategoria_id, precio, tipo_venta, destacado, nuevo, activo, imagenes, colores, para, genero, id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14)`, campos.concat(id));
    }
    // Las variantes se reemplazan completas (se conservan los ids que ya existían).
    // Los pedidos guardan su propia copia, así que no se ven afectados.
    const propias = new Set((await cli.query('SELECT id FROM variantes WHERE producto_id = $1', [id])).rows.map(r => r.id));
    await cli.query('DELETE FROM variantes WHERE producto_id = $1', [id]);
    for (const [i, v] of data.variants.entries()) {
      const vid = v.id && propias.has(v.id) ? v.id
        : `${id}_${val.slug(v.size || 'u')}_${val.slug(v.color || 'u')}_${crypto.randomBytes(2).toString('hex')}`;
      await cli.query('INSERT INTO variantes (id, producto_id, talle, color, stock, activa, orden) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [vid, id, v.size, v.color, v.stock, v.active, i]);
    }
    return { ok: true, data: await datos.productos(id, cli) };
  });
}

async function activarProducto(ctx) {
  requerirPersonal(ctx);
  const r = await query('UPDATE productos SET activo = $1 WHERE id = $2 RETURNING id', [!!ctx.body.active, ctx.params.id]);
  if (!r.rows.length) fallo(404, 'El registro no existe.');
  return { ok: true };
}

async function borrarProducto(ctx) {
  requerirPersonal(ctx);
  const r = await query('DELETE FROM productos WHERE id = $1 RETURNING id', [ctx.params.id]);   // sus variantes se borran en cascada
  if (!r.rows.length) fallo(404, 'El registro no existe.');
  return { ok: true };
}

/**
 * Borra TODOS los productos (y sus talles/colores) para empezar a cargar el catálogo real.
 * Solo administración. Los pedidos ya hechos no se tocan: guardan su propia copia de cada producto.
 */
async function borrarTodosLosProductos(ctx) {
  requerirAdmin(ctx);
  if (ctx.body.confirmar !== 'BORRAR') fallo(400, 'Falta confirmar el borrado.');
  const r = await query('DELETE FROM productos');
  return { ok: true, borrados: r.rowCount };
}

/* ---------------- Pedidos ---------------- */
const ESTADOS = { recibido: 'Recibido', en_preparacion: 'En preparación', listo: 'Listo para entregar', entregado: 'Entregado', cancelado: 'Cancelado' };
const PAGOS = { pendiente: 'Pago a confirmar', informado: 'Pago informado', verificado: 'Pago verificado' };
const ENTREGAS = { a_coordinar: 'A coordinar', coordinada: 'Coordinada', entregada: 'Entregada' };
const METODOS = { efectivo: 'Efectivo', transferencia: 'Transferencia bancaria' };

/**
 * Confirmar un pedido. TODO se calcula en el servidor (precios, stock, seña):
 * el navegador solo indica qué productos, cuántos y los datos de entrega.
 */
async function crearPedido(ctx) {
  const u = requerirUsuario(ctx);
  const b = ctx.body, errors = {};
  const name = val.txt(b.name), phone = val.txt(b.phone);
  if (name.length < 3) errors.name = 'Ingresá tu nombre y apellido.';
  if (!val.esTelefono(phone)) errors.phone = 'Ingresá un número de teléfono válido, con código de área.';
  if (!METODOS[b.paymentMethod]) errors.paymentMethod = 'Elegí un medio de pago.';
  const opciones = (await ajuste('deliveryOptions')) || [];
  const opcion = opciones.find(o => o.id === b.deliveryOptionId && o.active);
  if (!opcion) errors.deliveryOptionId = 'Elegí una modalidad de entrega.';

  let direccion = null, direccionNueva = false;
  if (opcion && opcion.requiresAddress) {
    if (b.addressId && b.addressId !== 'nueva') {
      const r = await query('SELECT * FROM direcciones WHERE id = $1 AND usuario_id = $2', [b.addressId, u.id]);
      if (!r.rows.length) errors['address.street'] = 'Elegí una dirección válida.';
      else { const d = r.rows[0]; direccion = { province: d.provincia, city: d.ciudad, zip: d.codigo_postal, street: d.calle, number: d.numero, apt: d.piso_depto }; }
    } else {
      const v = val.direccion(b.address);
      Object.entries(v.errors).forEach(([k, m]) => { errors['address.' + k] = m; });
      direccion = v.data; direccionNueva = true;
    }
  }
  if (hayErrores(errors)) errores(errors, 'Revisá los datos marcados.');

  // Unificar el carrito: una línea por variante
  const cantidades = new Map();
  for (const it of Array.isArray(b.items) ? b.items : []) {
    const qty = val.entero(it.qty, 1, 999);
    if (!it.variantId || qty === null) fallo(400, 'La cantidad de un producto no es válida.');
    const k = it.productId + '|' + it.variantId;
    cantidades.set(k, (cantidades.get(k) || 0) + qty);
  }
  if (!cantidades.size) fallo(400, 'Tu carrito está vacío.');
  const maxPedido = 99;   // productos por pedido: sin máximo configurable (99 solo evita cantidades absurdas)
  const sena = (await ajuste('deposit')) || {};

  const id = await transaccion(async cli => {
    const items = [];
    // Se bloquean las variantes en orden (FOR UPDATE) para que dos compras simultáneas no vendan el mismo stock.
    for (const k of [...cantidades.keys()].sort()) {
      const [productoId, varianteId] = k.split('|');
      const qty = cantidades.get(k);
      const r = await cli.query(
        `SELECT p.id, p.nombre, p.precio, p.tipo_venta, p.activo, p.categoria_id, p.imagenes, c.activa AS cat_activa,
                v.id AS vid, v.talle, v.color, v.stock, v.activa AS v_activa
         FROM variantes v JOIN productos p ON p.id = v.producto_id JOIN categorias c ON c.id = p.categoria_id
         WHERE v.id = $1 AND p.id = $2 FOR UPDATE OF v`, [varianteId, productoId]);
      const f = r.rows[0];
      if (!f || !f.activo || !f.cat_activa || !f.v_activa) fallo(409, 'Un producto del carrito ya no está disponible.');
      const etiqueta = `${f.nombre} (${val.etiquetaVariante(f.talle, f.color)})`;
      if (f.tipo_venta === 'stock') {
        if (f.stock < qty) fallo(409, `No hay stock suficiente de ${etiqueta}.`);
        await cli.query('UPDATE variantes SET stock = stock - $1 WHERE id = $2', [qty, f.vid]);
      } else if (qty > maxPedido) {
        fallo(409, `Podés encargar hasta ${maxPedido} unidades de ${etiqueta}.`);
      }
      items.push({ productId: f.id, variantId: f.vid, name: f.nombre, size: f.talle, color: f.color, unitPrice: f.precio, qty,
        saleType: f.tipo_venta, categoryId: f.categoria_id, image: (f.imagenes || [])[0] || null });
    }

    const total = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    // Seña: solo para productos "por pedido" y solo si el pedido es para retirar
    const subPedido = items.filter(i => i.saleType === 'pedido').reduce((s, i) => s + i.unitPrice * i.qty, 0);
    let deposito = null;
    if (sena.enabled && subPedido > 0 && !opcion.requiresAddress) {
      const pct = Math.min(100, Math.max(1, Number(sena.percent) || 0));
      const monto = Math.round(subPedido * pct / 100);
      deposito = { percent: pct, amount: monto, balance: total - monto };
    }

    const n = (await cli.query(`SELECT 'JP-' || LPAD(nextval('pedidos_numero_seq')::text, 5, '0') AS id`)).rows[0].id;
    await cli.query(
      `INSERT INTO pedidos (id, usuario_id, cliente_nombre, cliente_telefono, cliente_email, total, sena, pago_metodo,
         entrega_opcion_id, entrega_opcion_nombre, entrega_direccion, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11::jsonb,$12)`,
      [n, u.id, name, phone, u.email, total, deposito ? JSON.stringify(deposito) : null, b.paymentMethod,
        opcion.id, opcion.name, direccion ? JSON.stringify(direccion) : null, val.txt(b.notes).slice(0, 300)]);
    for (const i of items) {
      await cli.query(`INSERT INTO pedido_items (pedido_id, producto_id, variante_id, nombre, talle, color, precio_unitario, cantidad, tipo_venta, categoria_id, imagen)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [n, i.productId, i.variantId, i.name, i.size, i.color, i.unitPrice, i.qty, i.saleType, i.categoryId, i.image]);
    }
    await cli.query('INSERT INTO pedido_historial (pedido_id, texto) VALUES ($1, $2)', [n, 'Pedido recibido. Pago pendiente de verificación.']);

    // Guardar la dirección nueva en la cuenta, si el cliente lo pidió
    if (direccion && direccionNueva && b.saveAddress) {
      const tiene = (await cli.query('SELECT 1 FROM direcciones WHERE usuario_id = $1', [u.id])).rows.length > 0;
      await cli.query(`INSERT INTO direcciones (id, usuario_id, provincia, ciudad, codigo_postal, calle, numero, piso_depto, principal)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [nuevoId('dir'), u.id, direccion.province, direccion.city, direccion.zip, direccion.street, direccion.number, direccion.apt, !tiene]);
    }
    return n;
  });
  return { ok: true, data: await datos.pedidos({ id }) };
}

/** Bloquea el pedido, aplica `cambiar` y guarda. `cambiar` devuelve { set: {...columnas}, historial: [...] } */
async function modificarPedido(id, puedeVer, cambiar) {
  return transaccion(async cli => {
    const r = await cli.query('SELECT * FROM pedidos WHERE id = $1 FOR UPDATE', [String(id || '').toUpperCase()]);
    const o = r.rows[0];
    if (!o || !puedeVer(o)) fallo(404, 'El pedido no existe.');
    const { set, historial } = await cambiar(o, cli);
    const cols = Object.keys(set);
    if (cols.length) {
      await cli.query(`UPDATE pedidos SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')} WHERE id = $${cols.length + 1}`, cols.map(c => set[c]).concat(o.id));
    }
    for (const t of historial || []) await cli.query('INSERT INTO pedido_historial (pedido_id, texto) VALUES ($1, $2)', [o.id, t]);
    return o.id;
  });
}

/* ---------------- Avisos (el número rojo) ----------------
   Cliente: novedades de sus pedidos que cambió la tienda y todavía no vio.
   Personal: pedidos nuevos que nadie del personal vio todavía. El aviso es
   compartido: si un admin o un empleado entra a Pedidos, se va para todos. */
const NOVEDAD_ESTADO = {
  recibido: 'Tu pedido volvió al estado "Recibido".',
  en_preparacion: '¡Tu pedido fue confirmado! Ya lo estamos preparando.',
  listo: '¡Tu pedido está listo! Te escribimos para coordinar la entrega.',
  entregado: 'Tu pedido fue entregado. ¡Gracias por tu compra!'
};
const NOVEDAD_PAGO = { verificado: '¡Confirmamos tu pago! Gracias.', informado: 'Actualizamos el estado de tu pago.', pendiente: 'Tu pago quedó pendiente de confirmar.' };
const NOVEDAD_ENTREGA = { a_coordinar: 'La entrega de tu pedido quedó a coordinar.', coordinada: 'Coordinamos la entrega de tu pedido.', entregada: 'Tu pedido fue entregado.' };
const conAviso = (set, texto) => Object.assign(set, { actualizado_tienda_en: new Date(), novedad: texto });

async function contarAvisos(u) {
  if (!u) return { nuevos: 0, novedades: 0 };
  const r = (await query(`SELECT
      (SELECT count(*)::int FROM pedidos WHERE usuario_id = $1 AND actualizado_tienda_en IS NOT NULL
         AND actualizado_tienda_en > COALESCE(us.novedades_vistas_en, 'epoch')) AS novedades,
      (SELECT count(*)::int FROM pedidos WHERE NOT visto_personal) AS nuevos
    FROM usuarios us WHERE us.id = $1`, [u.id])).rows[0] || { nuevos: 0, novedades: 0 };
  return { nuevos: esPersonal(u) ? r.nuevos : 0, novedades: r.novedades };
}
/** Consulta liviana para que la página sepa si hay avisos nuevos sin cargar todo. */
async function avisos(ctx) { return Object.assign({ ok: true }, await contarAvisos(ctx.usuario)); }
/** Marca como vistos los pedidos nuevos (personal) o las novedades de mis pedidos (cliente). */
async function marcarVistos(ctx) {
  const u = requerirUsuario(ctx);
  if (ctx.body.tipo === 'pedidos') {
    if (!esPersonal(u)) fallo(403, 'Tu cuenta no tiene acceso a los pedidos de la tienda.');
    await query('UPDATE pedidos SET visto_personal = TRUE WHERE NOT visto_personal');
  } else if (ctx.body.tipo === 'novedades') {
    await query('UPDATE usuarios SET novedades_vistas_en = now() WHERE id = $1', [u.id]);
  } else fallo(400, 'Tipo de aviso no válido.');
  return { ok: true };
}

async function cambiarEstado(ctx) {
  requerirPersonal(ctx);
  const st = ctx.body.status;
  const id = await modificarPedido(ctx.params.id, () => true, o => {
    if (o.estado === 'cancelado') fallo(409, 'El pedido está cancelado y no puede cambiar de estado.');
    if (!ESTADOS[st] || st === 'cancelado') fallo(400, 'Estado no válido. Para cancelar usá el botón "Cancelar pedido".');
    if (o.estado === st) fallo(400, 'El pedido ya tiene ese estado.');
    const set = conAviso({ estado: st }, NOVEDAD_ESTADO[st]), historial = ['Estado del pedido: ' + ESTADOS[st] + '.'];
    if (st === 'entregado' && o.entrega_estado !== 'entregada') { set.entrega_estado = 'entregada'; historial.push('Entrega marcada como entregada.'); }
    return { set, historial };
  });
  return { ok: true, data: await datos.pedidos({ id }) };
}

async function cambiarPago(ctx) {
  requerirPersonal(ctx);
  const st = ctx.body.status;
  const id = await modificarPedido(ctx.params.id, () => true, o => {
    if (o.estado === 'cancelado') fallo(409, 'No se puede modificar el pago de un pedido cancelado.');
    if (!PAGOS[st]) fallo(400, 'Estado de pago no válido.');
    if (o.pago_estado === st) fallo(400, 'El pago ya tiene ese estado.');
    return { set: conAviso({ pago_estado: st, pago_verificado_en: st === 'verificado' ? new Date() : null }, NOVEDAD_PAGO[st]),
      historial: ['Pago: ' + PAGOS[st] + (st === 'verificado' ? ' (verificación manual).' : '.')] };
  });
  return { ok: true, data: await datos.pedidos({ id }) };
}

/** El cliente avisa que transfirió. NO verifica el pago. */
async function informarPago(ctx) {
  const u = requerirUsuario(ctx);
  const id = await modificarPedido(ctx.params.id, o => esPersonal(u) || o.usuario_id === u.id, o => {
    if (o.estado === 'cancelado') fallo(409, 'El pedido está cancelado.');
    if (o.pago_metodo !== 'transferencia') fallo(400, 'Esta opción es solo para pagos por transferencia.');
    if (o.pago_estado !== 'pendiente') fallo(400, 'El pago ya fue informado.');
    return { set: { pago_estado: 'informado' }, historial: ['El cliente informó que realizó la transferencia. Pendiente de verificación.'] };
  });
  return { ok: true, data: await datos.pedidos({ id }) };
}

async function cambiarEntrega(ctx) {
  requerirPersonal(ctx);
  const st = ctx.body.status, notas = val.txt(ctx.body.notes).slice(0, 300);
  const id = await modificarPedido(ctx.params.id, () => true, o => {
    if (o.estado === 'cancelado') fallo(409, 'El pedido está cancelado.');
    if (!ENTREGAS[st]) fallo(400, 'Estado de entrega no válido.');
    if (o.entrega_estado === st && o.entrega_notas === notas) fallo(400, 'No hay cambios para guardar.');
    const historial = [];
    if (o.entrega_estado !== st) historial.push('Entrega: ' + ENTREGAS[st] + '.');
    if (o.entrega_notas !== notas) historial.push('Observaciones de entrega actualizadas.');
    const aviso = o.entrega_estado !== st ? NOVEDAD_ENTREGA[st] : 'Actualizamos los datos de la entrega de tu pedido.';
    return { set: conAviso({ entrega_estado: st, entrega_notas: notas }, aviso), historial };
  });
  return { ok: true, data: await datos.pedidos({ id }) };
}

/** Cancela el pedido y devuelve el stock UNA sola vez (columna stock_devuelto). */
async function cancelarPedido(ctx) {
  requerirPersonal(ctx);
  let devueltas = 0;
  const faltantes = [];
  const id = await modificarPedido(ctx.params.id, () => true, async (o, cli) => {
    if (o.estado === 'cancelado') fallo(409, 'El pedido ya estaba cancelado. El stock no se modificó.');
    const motivoCliente = val.txt(ctx.body.reason).slice(0, 200);
    const set = conAviso({ estado: 'cancelado' }, 'Tu pedido fue cancelado.' + (motivoCliente ? ' Motivo: ' + motivoCliente : ''));
    if (o.stock_descontado && !o.stock_devuelto) {
      const items = (await cli.query('SELECT * FROM pedido_items WHERE pedido_id = $1 AND tipo_venta = $2 ORDER BY variante_id', [o.id, 'stock'])).rows;
      for (const i of items) {
        const r = await cli.query('UPDATE variantes SET stock = stock + $1 WHERE id = $2 AND producto_id = $3 RETURNING id', [i.cantidad, i.variante_id, i.producto_id]);
        if (r.rows.length) devueltas += i.cantidad; else faltantes.push(i.nombre);
      }
      set.stock_devuelto = true;
    }
    const motivo = val.txt(ctx.body.reason).slice(0, 200);
    const texto = 'Pedido cancelado' + (motivo ? ': ' + motivo : '') + '. ' +
      (devueltas ? `Se devolvieron ${devueltas} unidad${devueltas === 1 ? '' : 'es'} al stock.` : 'No había stock para devolver.') +
      (faltantes.length ? ' No se encontró en el catálogo: ' + faltantes.join(', ') + '.' : '');
    return { set, historial: [texto] };
  });
  return { ok: true, data: await datos.pedidos({ id }), restored: devueltas, missing: faltantes };
}

/* ---------------- Ajustes ---------------- */
/** Guarda solo los ajustes enviados (los demás no cambian). */
async function guardarAjustes(ctx) {
  requerirPersonal(ctx);
  const b = ctx.body || {}, limpio = {};
  const texto = (v, max) => val.txt(v).slice(0, max);
  if ('instagram' in b) {
    const ig = texto(b.instagram, 40).replace(/^@/, '');
    if (!/^[A-Za-z0-9._]{1,30}$/.test(ig)) fallo(400, 'Usuario de Instagram no válido.');
    limpio.instagram = ig;
  }
  if ('whatsapp' in b) limpio.whatsapp = texto(b.whatsapp, 30);
  if ('lowStockThreshold' in b) { const n = val.entero(b.lowStockThreshold, 1, 50); if (n === null) fallo(400, 'El umbral de stock debe estar entre 1 y 50.'); limpio.lowStockThreshold = n; }
  if ('maxPerOrderPedido' in b) { const n = val.entero(b.maxPerOrderPedido, 1, 50); if (n === null) fallo(400, 'El máximo por pedido debe estar entre 1 y 50.'); limpio.maxPerOrderPedido = n; }
  if ('transfer' in b) {
    const t = b.transfer || {};
    limpio.transfer = { alias: texto(t.alias, 40), cbu: texto(t.cbu, 22), holder: texto(t.holder, 80), bankName: texto(t.bankName, 40), note: texto(t.note, 160) };
  }
  if ('deposit' in b) {
    const d = b.deposit || {}, pct = val.entero(d.percent, 1, 100);
    if (pct === null) fallo(400, 'El porcentaje de seña debe estar entre 1 y 100.');
    limpio.deposit = { enabled: !!d.enabled, percent: pct, note: texto(d.note, 160) };
  }
  if ('deliveryOptions' in b) {
    const lista = (Array.isArray(b.deliveryOptions) ? b.deliveryOptions : []).map(o => ({
      id: texto(o.id, 40) || nuevoId('ent'), name: texto(o.name, 40), description: texto(o.description, 140), requiresAddress: !!o.requiresAddress, active: !!o.active }));
    if (lista.some(o => !o.name)) fallo(400, 'Todas las modalidades necesitan un nombre.');
    if (!lista.some(o => o.active)) fallo(400, 'Dejá al menos una modalidad habilitada para poder recibir pedidos.');
    limpio.deliveryOptions = lista;
  }
  if ('banners' in b) {
    const lista = (Array.isArray(b.banners) ? b.banners : []).map(x => ({
      id: texto(x.id, 40) || nuevoId('b'), kicker: texto(x.kicker, 40), title: texto(x.title, 60), text: texto(x.text, 160), cta: texto(x.cta, 30),
      link: /^#\/[\w\-/?=&%.]*$/.test(String(x.link || '')) ? x.link : '#/catalogo',
      image: /^(data:image\/|https?:\/\/|assets\/)/i.test(String(x.image || '')) ? String(x.image) : '', active: !!x.active }));
    if (lista.some(x => !x.title)) fallo(400, 'Todas las publicidades necesitan un título.');
    limpio.banners = lista;
  }
  for (const [clave, valor] of Object.entries(limpio)) {
    await query('INSERT INTO ajustes (clave, valor) VALUES ($1, $2::jsonb) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor', [clave, JSON.stringify(valor)]);
  }
  return { ok: true, data: await datos.ajustes() };
}

/* ---------------- Usuarios (solo administración) ---------------- */
/** Cambia el rol de una cuenta: admin, empleado o cliente. */
async function cambiarRol(ctx) {
  const yo = requerirAdmin(ctx);
  const rol = String(ctx.body.role || '');
  if (!ROLES.includes(rol)) fallo(400, 'Elegí un rol válido.');
  if (ctx.params.id === yo.id) fallo(400, 'No podés cambiar tu propio rol. Pedile a otra cuenta de administración que lo haga.');
  const r = await query('UPDATE usuarios SET rol = $1 WHERE id = $2 RETURNING id', [rol, ctx.params.id]);
  if (!r.rows.length) fallo(404, 'La cuenta no existe.');
  return { ok: true };
}

/* ---------------- Tabla de rutas ---------------- */
module.exports = {
  ErrorHttp,
  lista: [
    ['GET', '/api/salud', salud],
    ['GET', '/api/datos', cargarDatos],
    ['POST', '/api/auth/registro', registrar],
    ['POST', '/api/auth/ingresar', ingresar],
    ['POST', '/api/auth/salir', salir],
    ['POST', '/api/auth/recuperar/codigo', enviarCodigo],
    ['POST', '/api/auth/recuperar/verificar', verificarCodigo],
    ['POST', '/api/auth/recuperar/cambiar', cambiarClaveRecuperada],
    ['PUT', '/api/cuenta', actualizarPerfil],
    ['POST', '/api/cuenta/direcciones', guardarDireccion],
    ['PUT', '/api/cuenta/direcciones/:id', guardarDireccion],
    ['DELETE', '/api/cuenta/direcciones/:id', borrarDireccion],
    ['PUT', '/api/cuenta/direcciones/:id/principal', direccionPrincipal],
    ['POST', '/api/categorias', guardarCategoria],
    ['PUT', '/api/categorias/:id', guardarCategoria],
    ['PATCH', '/api/categorias/:id/activa', activarCategoria],
    ['POST', '/api/subcategorias', guardarSubcategoria],
    ['PUT', '/api/subcategorias/:id', guardarSubcategoria],
    ['PATCH', '/api/subcategorias/:id/activa', activarSubcategoria],
    ['DELETE', '/api/subcategorias/:id', borrarSubcategoria],
    ['POST', '/api/productos', guardarProducto],
    ['PUT', '/api/productos/:id', guardarProducto],
    ['PATCH', '/api/productos/:id/activo', activarProducto],
    ['DELETE', '/api/productos', borrarTodosLosProductos],
    ['DELETE', '/api/productos/:id', borrarProducto],
    ['POST', '/api/pedidos', crearPedido],
    ['POST', '/api/pedidos/:id/informar-pago', informarPago],
    ['PATCH', '/api/pedidos/:id/estado', cambiarEstado],
    ['PATCH', '/api/pedidos/:id/pago', cambiarPago],
    ['PATCH', '/api/pedidos/:id/entrega', cambiarEntrega],
    ['POST', '/api/pedidos/:id/cancelar', cancelarPedido],
    ['PUT', '/api/ajustes', guardarAjustes],
    ['PATCH', '/api/usuarios/:id/rol', cambiarRol],
    ['GET', '/api/avisos', avisos],
    ['POST', '/api/avisos/vistos', marcarVistos]
  ]
};
