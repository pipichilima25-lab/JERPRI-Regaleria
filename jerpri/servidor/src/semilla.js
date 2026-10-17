/* =========================================================
   JERPRI · Cuenta de administración inicial
   La tienda arranca sin productos ni pedidos (se cargan desde el
   panel). Lo único que se crea automáticamente es la cuenta de
   administración, con los datos de servidor/.env
   (ADMIN_EMAIL, ADMIN_CLAVE, ADMIN_NOMBRE y ADMIN_TELEFONO).
   ========================================================= */
'use strict';
const { hashClave } = require('./seguridad');
const val = require('./validaciones');

/**
 * Si la base todavía no tiene ninguna cuenta de administración (por ejemplo, porque
 * las tablas se crearon pegando el SQL en pgAdmin), la crea con los datos de
 * servidor/.env: ADMIN_EMAIL, ADMIN_CLAVE, ADMIN_NOMBRE y ADMIN_TELEFONO (opcional).
 * La contraseña se guarda cifrada (scrypt), nunca en texto plano.
 * Devuelve un mensaje para mostrar en la terminal, o null si no hizo falta.
 */
async function asegurarAdmin(query) {
  const hay = await query("SELECT 1 FROM usuarios WHERE rol = 'admin' LIMIT 1");
  if (hay.rows.length) return null;
  const email = val.txt(process.env.ADMIN_EMAIL).toLowerCase();
  const clave = process.env.ADMIN_CLAVE || '';
  if (!email || !clave) return { ok: false, msj: 'Todavía no hay cuenta de administración: completá ADMIN_EMAIL y ADMIN_CLAVE en servidor/.env y reiniciá (npm start).' };
  if (!val.esEmail(email)) return { ok: false, msj: 'ADMIN_EMAIL de servidor/.env no es un correo válido.' };
  if (!val.claveValida(clave)) return { ok: false, msj: 'ADMIN_CLAVE de servidor/.env no es válida. ' + val.MSJ_CLAVE };
  const nombre = val.txt(process.env.ADMIN_NOMBRE) || 'Administración JERPRI';
  let telefono = val.txt(process.env.ADMIN_TELEFONO);
  if (telefono && !val.esTelefono(telefono)) telefono = '';
  // Si esa persona ya se había registrado en la tienda con ese correo, se la convierte en administración
  const existe = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (existe.rows.length) {
    await query("UPDATE usuarios SET rol = 'admin' WHERE id = $1", [existe.rows[0].id]);
    return { ok: true, msj: `La cuenta ${email} ahora es de administración (conserva su contraseña).` };
  }
  if (telefono) {
    const usados = await query("SELECT telefono FROM usuarios WHERE telefono <> ''");
    if (usados.rows.some(u => val.telefonoClave(u.telefono) === val.telefonoClave(telefono))) telefono = '';
  }
  await query("INSERT INTO usuarios (id, nombre, email, telefono, rol, clave_hash) VALUES ($1, $2, $3, $4, 'admin', $5)",
    ['u-' + require('crypto').randomBytes(5).toString('hex'), nombre, email, telefono, await hashClave(clave)]);
  return { ok: true, msj: `Se creó la cuenta de administración ${email}.` };
}

module.exports = { asegurarAdmin };
