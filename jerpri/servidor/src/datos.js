/* =========================================================
   JERPRI · Lectura de datos
   Convierte las filas de PostgreSQL (columnas en español) al
   formato que usa la tienda en el navegador.
   ========================================================= */
'use strict';
const { query } = require('./db');

const iso = d => (d ? new Date(d).toISOString() : null);

/* ---------------- Catálogo ---------------- */
async function categorias(db = { query }) {
  const r = await db.query('SELECT * FROM categorias ORDER BY orden, nombre');
  return r.rows.map(c => ({ id: c.id, name: c.nombre, description: c.descripcion, icon: c.icono, active: c.activa }));
}

async function subcategorias(db = { query }) {
  const r = await db.query('SELECT * FROM subcategorias ORDER BY orden, nombre');
  return r.rows.map(s => ({ id: s.id, categoryId: s.categoria_id, name: s.nombre, order: s.orden, active: s.activa }));
}

/** Productos con sus variantes. Si se pasa `id`, devuelve solo ese producto (o null). */
async function productos(id, db = { query }) {
  const filtro = id ? 'WHERE p.id = $1' : '';
  const params = id ? [id] : [];
  const ps = await db.query(`SELECT p.* FROM productos p ${filtro} ORDER BY p.creado_en DESC, p.id`, params);
  const vs = await db.query(`SELECT v.* FROM variantes v ${id ? 'WHERE v.producto_id = $1' : ''} ORDER BY v.producto_id, v.orden, v.id`, params);
  const porProducto = {};
  vs.rows.forEach(v => {
    (porProducto[v.producto_id] = porProducto[v.producto_id] || []).push({ id: v.id, size: v.talle, color: v.color, stock: v.stock, active: v.activa });
  });
  const lista = ps.rows.map(p => ({
    id: p.id, name: p.nombre, description: p.descripcion, categoryId: p.categoria_id, subcategoryId: p.subcategoria_id,
    price: p.precio, saleType: p.tipo_venta, featured: p.destacado, isNew: p.nuevo, active: p.activo,
    images: p.imagenes || [], colors: p.colores || [], audience: p.para || [], gender: p.genero || '', variants: porProducto[p.id] || [],
    createdAt: iso(p.creado_en), demo: p.es_demo
  }));
  return id ? (lista[0] || null) : lista;
}

/* ---------------- Usuarios ---------------- */
function direccionPublica(d) {
  return { id: d.id, province: d.provincia, city: d.ciudad, zip: d.codigo_postal, street: d.calle, number: d.numero, apt: d.piso_depto, isDefault: d.principal };
}

/** Datos públicos de usuarios (sin la contraseña). Si se pasa `id`, solo ese usuario. */
async function usuarios(id, db = { query }) {
  const us = await db.query(`SELECT id, nombre, email, telefono, rol, es_demo, creado_en, novedades_vistas_en FROM usuarios ${id ? 'WHERE id = $1' : ''} ORDER BY creado_en`, id ? [id] : []);
  const ds = await db.query(`SELECT * FROM direcciones ${id ? 'WHERE usuario_id = $1' : ''} ORDER BY creada_en, id`, id ? [id] : []);
  const porUsuario = {};
  ds.rows.forEach(d => { (porUsuario[d.usuario_id] = porUsuario[d.usuario_id] || []).push(direccionPublica(d)); });
  const lista = us.rows.map(u => ({
    id: u.id, name: u.nombre, email: u.email, phone: u.telefono, role: u.rol, demo: u.es_demo,
    createdAt: iso(u.creado_en), addresses: porUsuario[u.id] || [],
    updatesSeenAt: u.novedades_vistas_en ? iso(u.novedades_vistas_en) : null
  }));
  return id ? (lista[0] || null) : lista;
}

/* ---------------- Pedidos ---------------- */
/**
 * filtro: { usuarioId } para los pedidos de un cliente, { id } para uno solo, o {} para todos (administración).
 */
async function pedidos(filtro = {}, db = { query }) {
  let where = '', params = [];
  if (filtro.id) { where = 'WHERE id = $1'; params = [filtro.id]; }
  else if (filtro.usuarioId) { where = 'WHERE usuario_id = $1'; params = [filtro.usuarioId]; }
  const ps = await db.query(`SELECT * FROM pedidos ${where} ORDER BY creado_en DESC`, params);
  if (!ps.rows.length) return filtro.id ? null : [];
  const sub = where ? `WHERE pedido_id IN (SELECT id FROM pedidos ${where})` : '';
  const items = await db.query(`SELECT * FROM pedido_items ${sub} ORDER BY id`, params);
  const hist = await db.query(`SELECT * FROM pedido_historial ${sub} ORDER BY fecha, id`, params);
  const it = {}, hi = {};
  items.rows.forEach(i => {
    (it[i.pedido_id] = it[i.pedido_id] || []).push({
      productId: i.producto_id, variantId: i.variante_id, name: i.nombre, size: i.talle, color: i.color,
      unitPrice: i.precio_unitario, qty: i.cantidad, saleType: i.tipo_venta, categoryId: i.categoria_id, image: i.imagen
    });
  });
  hist.rows.forEach(h => { (hi[h.pedido_id] = hi[h.pedido_id] || []).push({ at: iso(h.fecha), text: h.texto }); });
  const lista = ps.rows.map(o => ({
    id: o.id, createdAt: iso(o.creado_en), userId: o.usuario_id,
    customer: { name: o.cliente_nombre, phone: o.cliente_telefono, email: o.cliente_email },
    items: it[o.id] || [], total: o.total, deposit: o.sena,
    payment: { method: o.pago_metodo, status: o.pago_estado, verifiedAt: iso(o.pago_verificado_en) },
    status: o.estado,
    delivery: { optionId: o.entrega_opcion_id, optionName: o.entrega_opcion_nombre, address: o.entrega_direccion, notes: o.entrega_notas, status: o.entrega_estado },
    notes: o.notas, stockDeducted: o.stock_descontado, stockRestored: o.stock_devuelto,
    history: hi[o.id] || [], demo: o.es_demo,
    staffUpdatedAt: o.actualizado_tienda_en ? iso(o.actualizado_tienda_en) : null, notice: o.novedad || '', staffSeen: o.visto_personal
  }));
  return filtro.id ? lista[0] : lista;
}

/* ---------------- Ajustes ---------------- */
async function ajustes(db = { query }) {
  const r = await db.query('SELECT clave, valor FROM ajustes');
  const out = {};
  r.rows.forEach(a => { out[a.clave] = a.valor; });
  return out;
}

module.exports = { iso, categorias, subcategorias, productos, usuarios, pedidos, ajustes };
