/* =========================================================
   JERPRI · Contraseñas y sesiones
   - Las contraseñas se guardan con scrypt (módulo crypto de
     Node), con una "sal" distinta por usuario.
   - Al iniciar sesión se crea un token aleatorio que se guarda
     en la tabla "sesiones" y en una cookie HttpOnly (el código
     JavaScript del navegador no puede leerla).
   ========================================================= */
'use strict';
const crypto = require('crypto');
const { query } = require('./db');
const { DIAS_SESION } = require('./config');

const COOKIE = 'jerpri_sesion';
const N = 16384, LARGO = 64;

function scrypt(clave, sal) {
  return new Promise((resolve, reject) =>
    crypto.scrypt(clave, sal, LARGO, { N }, (err, buf) => err ? reject(err) : resolve(buf)));
}

/** Devuelve "scrypt$<sal>$<hash>" para guardar en usuarios.clave_hash */
async function hashClave(clave) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(String(clave), sal);
  return `scrypt$${sal}$${hash.toString('hex')}`;
}

async function verificarClave(clave, guardado) {
  const [tipo, sal, hashHex] = String(guardado || '').split('$');
  if (tipo !== 'scrypt' || !sal || !hashHex) return false;
  const hash = await scrypt(String(clave), sal);
  const esperado = Buffer.from(hashHex, 'hex');
  return esperado.length === hash.length && crypto.timingSafeEqual(esperado, hash);
}

// Hash de una contraseña inexistente: se compara igual para no revelar qué correos están registrados.
let hashFalso = null;
async function compararSinUsuario(clave) {
  if (!hashFalso) hashFalso = await hashClave('clave-que-no-existe');
  await verificarClave(clave, hashFalso);
  return false;
}

/* ---------------- Cookies y sesiones ---------------- */
function leerCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(par => {
    const i = par.indexOf('=');
    if (i > 0) out[par.slice(0, i).trim()] = decodeURIComponent(par.slice(i + 1).trim());
  });
  return out;
}

async function crearSesion(res, usuarioId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + DIAS_SESION * 24 * 3600 * 1000);
  await query('INSERT INTO sesiones (token, usuario_id, expira_en) VALUES ($1, $2, $3)', [token, usuarioId, expira]);
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${DIAS_SESION * 24 * 3600}`);
}

async function cerrarSesion(req, res) {
  const token = leerCookies(req)[COOKIE];
  if (token) await query('DELETE FROM sesiones WHERE token = $1', [token]);
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

/** Devuelve el usuario de la sesión actual (o null). */
async function usuarioActual(req) {
  const token = leerCookies(req)[COOKIE];
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const r = await query(
    `SELECT u.* FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token = $1 AND s.expira_en > now()`, [token]);
  return r.rows[0] || null;
}

module.exports = { hashClave, verificarClave, compararSinUsuario, crearSesion, cerrarSesion, usuarioActual };
