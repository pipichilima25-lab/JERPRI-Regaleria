/* =========================================================
   JERPRI · Validaciones del servidor
   El servidor NUNCA confía en lo que manda el navegador:
   vuelve a validar todo antes de guardar. Los mensajes son los
   mismos que muestra la tienda.
   ========================================================= */
'use strict';

const PROVINCIAS = ['Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy',
  'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán'];

/** Para quién es ideal un producto (asistente "JERPRI te ayuda a elegir"). */
const PARA = ['mi', 'pareja', 'amistad', 'familia', 'peques'];
const txt = v => String(v == null ? '' : v).trim();
const esEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(txt(s));
function esTelefono(s) { const t = txt(s); const d = t.replace(/\D/g, ''); return /^[\d\s()+-]+$/.test(t) && d.length >= 8 && d.length <= 15; }
/**
 * Forma única de un teléfono argentino, para comparar números escritos de distintas maneras:
 * "387 4123456", "0387 15 4123456" y "+54 9 387 4123456" dan todos "3874123456".
 */
function telefonoClave(s) {
  let d = txt(s).replace(/\D/g, '');
  if (d.startsWith('549') && d.length >= 12) d = d.slice(3);
  else if (d.startsWith('54') && d.length >= 11) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length === 12) {   // tiene el "15" después del código de área
    for (const n of [2, 3, 4]) if (d.slice(n, n + 2) === '15') { d = d.slice(0, n) + d.slice(n + 2); break; }
  }
  return d;
}
/** Número en formato internacional para mandar el SMS (+549 + código de área + número). */
function telefonoInternacional(s) { const d = telefonoClave(s); return d.length === 10 ? '+549' + d : '+' + d; }
/** Muestra solo los últimos 4 números: "••• •••-3456". */
function telefonoOculto(s) { const d = telefonoClave(s); return '••• •••-' + d.slice(-4); }
const claveValida = pw => typeof pw === 'string' && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
const MSJ_CLAVE = 'La contraseña debe tener al menos 8 caracteres, con letras y números.';

function normalizar(s) { return txt(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function slug(s) { return normalizar(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item'; }
function entero(v, min, max) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  if (!Number.isInteger(n)) return null;
  if (min != null && n < min) return null;
  if (max != null && n > max) return null;
  return n;
}

function registro(d) {
  const errors = {};
  const name = txt(d.name), email = txt(d.email).toLowerCase(), phone = txt(d.phone), pw = String(d.password || '');
  if (name.length < 3 || !/\s/.test(name)) errors.name = 'Ingresá nombre y apellido.';
  if (!esEmail(email)) errors.email = 'Ingresá un correo electrónico válido.';
  if (!claveValida(pw)) errors.password = MSJ_CLAVE;
  if (d.confirm !== undefined && d.confirm !== pw) errors.confirm = 'Las contraseñas no coinciden.';
  if (!esTelefono(phone)) errors.phone = 'Ingresá un número de teléfono válido, con código de área (por ejemplo 387 4123456).';
  return { errors, name, email, phone, pw };
}

function perfil(d) {
  const errors = {};
  const name = txt(d.name), phone = txt(d.phone);
  if (name.length < 3 || !/\s/.test(name)) errors.name = 'Ingresá nombre y apellido.';
  if (!esTelefono(phone)) errors.phone = 'Ingresá un número de teléfono válido, con código de área.';
  return { errors, name, phone };
}

function direccion(a) {
  const errors = {};
  a = a || {};
  const data = { province: txt(a.province), city: txt(a.city), zip: txt(a.zip).toUpperCase(), street: txt(a.street), number: txt(a.number).toUpperCase(), apt: txt(a.apt) };
  if (!PROVINCIAS.includes(data.province)) errors.province = 'Elegí una provincia.';
  if (data.city.length < 2) errors.city = 'Ingresá la ciudad o localidad.';
  if (!/^(\d{4}|[A-Z]\d{4}[A-Z]{3})$/.test(data.zip)) errors.zip = 'Ingresá un código postal válido (por ejemplo 4400 o A4400XAB).';
  if (data.street.length < 2) errors.street = 'Ingresá la calle.';
  if (!/^(\d{1,6}[A-Z]?|S\/N)$/.test(data.number)) errors.number = 'Ingresá el número (o S/N si no tiene).';
  return { errors, data };
}

function etiquetaVariante(size, color) {
  const p = [];
  if (size) p.push('Talle ' + size);
  if (color) p.push(color);
  return p.join(' · ') || 'Único';
}

/** Producto completo (datos + variantes). `categoriaExiste` es un booleano ya consultado. */
function producto(input, categoriaExiste) {
  const errors = {};
  const name = txt(input.name);
  if (name.length < 2) errors.name = 'Ingresá un nombre de al menos 2 caracteres.';
  const price = Number(input.price);
  if (!Number.isFinite(price) || price <= 0) errors.price = 'Ingresá un precio mayor a cero.';
  else if (!Number.isInteger(price)) errors.price = 'Ingresá el precio sin centavos.';
  if (!categoriaExiste) errors.categoryId = 'Elegí una categoría válida.';
  const saleType = input.saleType === 'pedido' ? 'pedido' : 'stock';
  const variants = (Array.isArray(input.variants) ? input.variants : []).map(v => ({
    id: v.id ? txt(v.id) : null, size: txt(v.size) || null, color: txt(v.color) || null,
    stock: saleType === 'pedido' ? 0 : entero(v.stock, 0, 99999), active: v.active !== false
  }));
  if (!variants.length) errors.variants = 'Agregá al menos una variante (para productos sin talle ni color, una variante "Única").';
  const vistas = new Set();
  variants.forEach(v => {
    const k = (v.size || '') + '|' + (v.color || '');
    if (vistas.has(k)) errors.variants = 'Hay variantes repetidas: ' + etiquetaVariante(v.size, v.color) + '. Cada combinación de talle y color debe ser única.';
    vistas.add(k);
    if (v.stock === null) errors.variants = 'El stock de cada variante debe ser un número entero mayor o igual a cero.';
  });
  const images = (Array.isArray(input.images) ? input.images : []).map(String).filter(Boolean)
    .filter(src => /^(https?:\/\/|assets\/|\.\/|data:image\/)/i.test(src)).slice(0, 12);
  const colors = (Array.isArray(input.colors) ? input.colors : []).map(c => ({ name: txt(c.name), hex: /^#[0-9a-f]{3,8}$/i.test(txt(c.hex)) ? txt(c.hex) : '#CCCCCC' }));
  return {
    errors,
    data: { name, price, saleType, variants, images, colors, description: txt(input.description).slice(0, 2000),
      featured: !!input.featured, isNew: !!input.isNew, active: input.active !== false,
      audience: PARA.filter(k => Array.isArray(input.audience) && input.audience.includes(k)),
      gender: input.gender === 'mujer' || input.gender === 'hombre' ? input.gender : '' }
  };
}

module.exports = { PROVINCIAS, txt, esEmail, esTelefono, telefonoClave, telefonoInternacional, telefonoOculto, claveValida, MSJ_CLAVE, normalizar, slug, entero, registro, perfil, direccion, producto, etiquetaVariante };
