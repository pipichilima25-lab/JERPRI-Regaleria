/* =========================================================
   JERPRI · Servidor web
   ---------------------------------------------------------
   - Atiende la API en /api/... (datos en PostgreSQL).
   - Sirve la tienda (index.html, css/, js/, assets/) en
     http://localhost:3000
   - También acepta la página abierta con Live Server
     (http://127.0.0.1:5500): le permite usar la API desde el
     mismo equipo (CORS con cookies).
   Usa solo módulos que vienen con Node.js + el paquete "pg".
   Iniciar:  npm start
   ========================================================= */
'use strict';
const { PUERTO, RAIZ_WEB, ORIGENES_EXTRA } = require('./config');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { probarConexion, actualizarEsquema } = require('./db');
const { usuarioActual } = require('./seguridad');
const rutas = require('./rutas');

const LIMITE_CUERPO = 15 * 1024 * 1024;   // 15 MB (las fotos subidas viajan dentro del JSON)

/* ---------------- Enrutador ---------------- */
// Convierte '/api/pedidos/:id/estado' en una expresión regular que captura :id
const tabla = rutas.lista.map(([metodo, patron, fn]) => {
  const nombres = [];
  const re = new RegExp('^' + patron.replace(/:([a-z]+)/g, (_, n) => { nombres.push(n); return '([^/]+)'; }) + '$');
  return { metodo, re, nombres, fn };
});

function buscarRuta(metodo, ruta) {
  let rutaExiste = false;
  for (const r of tabla) {
    const m = ruta.match(r.re);
    if (!m) continue;
    rutaExiste = true;
    if (r.metodo !== metodo) continue;
    const params = {};
    r.nombres.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
    return { fn: r.fn, params };
  }
  return { noPermitido: rutaExiste };
}

function enviarJson(res, estado, obj) {
  const cuerpo = JSON.stringify(obj);
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(cuerpo);
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const partes = [];
    req.on('data', parte => {
      total += parte.length;
      if (total > LIMITE_CUERPO) { reject(new rutas.ErrorHttp(413, 'Los datos enviados son demasiado grandes. Probá con imágenes más livianas.')); req.destroy(); return; }
      partes.push(parte);
    });
    req.on('end', () => {
      if (!total) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(partes).toString('utf8'))); }
      catch (e) { reject(new rutas.ErrorHttp(400, 'Los datos enviados no tienen un formato válido.')); }
    });
    req.on('error', reject);
  });
}

async function atenderApi(req, res, ruta) {
  const inicio = Date.now();
  let estado = 200;
  try {
    const r = buscarRuta(req.method, ruta);
    if (!r.fn) throw new rutas.ErrorHttp(r.noPermitido ? 405 : 404, r.noPermitido ? 'Método no permitido.' : 'La dirección de la API no existe.');
    // Protección contra envíos desde otros sitios: las escrituras deben llegar como JSON
    if (req.method !== 'GET' && !/^application\/json/i.test(req.headers['content-type'] || '')) {
      throw new rutas.ErrorHttp(415, 'Los datos deben enviarse en formato JSON.');
    }
    const body = req.method === 'GET' ? {} : await leerCuerpo(req);
    const usuario = r.fn === rutas.lista[0][2] ? null : await usuarioActual(req);   // /api/salud no necesita sesión
    const resultado = await r.fn({ req, res, params: r.params, body, usuario });
    enviarJson(res, estado, resultado);
  } catch (err) {
    if (err instanceof rutas.ErrorHttp) {
      estado = err.estado;
      enviarJson(res, estado, Object.assign({ ok: false, error: err.message }, err.extra));
    } else if (['ECONNREFUSED', 'ENOTFOUND', '28P01', '3D000', '57P01'].includes(err.code)) {
      estado = 503;
      console.error('[db] No se pudo usar PostgreSQL:', err.message);
      enviarJson(res, estado, { ok: false, error: 'No se pudo conectar con la base de datos. Verificá que PostgreSQL esté encendido.' });
    } else if (err.code === '23514' || err.code === '23505') {   // restricción de la base (stock negativo, dato repetido)
      estado = 409;
      enviarJson(res, estado, { ok: false, error: 'La operación no se pudo guardar porque los datos cambiaron. Actualizá la página e intentá de nuevo.' });
    } else {
      estado = 500;
      console.error('[error]', req.method, ruta, err);
      enviarJson(res, estado, { ok: false, error: 'Ocurrió un error en el servidor. Intentá de nuevo.' });
    }
  } finally {
    console.log(`${req.method} ${ruta} → ${estado} (${Date.now() - inicio} ms)`);
  }
}

/* ---------------- Archivos de la tienda ---------------- */
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2'
};
// Solo se publican estas carpetas: la carpeta "servidor" (con el .env y la contraseña) nunca se sirve.
const CARPETAS_PUBLICAS = ['css', 'js', 'assets'];

function servirArchivo(req, res, ruta) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  const relativa = ruta === '/' ? 'index.html' : decodeURIComponent(ruta).replace(/^\/+/, '');
  const primera = relativa.split('/')[0];
  const archivo = path.normalize(path.join(RAIZ_WEB, relativa));
  const permitido = (relativa === 'index.html' || CARPETAS_PUBLICAS.includes(primera)) && archivo.startsWith(RAIZ_WEB + path.sep);
  if (!permitido) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
  fs.readFile(archivo, (err, contenido) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : contenido);
  });
}

/* ---------------- Páginas abiertas con Live Server (CORS) ----------------
   Live Server abre la tienda en otro puerto (por ejemplo http://127.0.0.1:5500).
   Se permite usar la API a cualquier página abierta en el MISMO equipo que el
   servidor (mismo nombre de host, otro puerto) y a las direcciones de
   ORIGENES_PERMITIDOS en el .env. Cualquier otro sitio queda bloqueado. */
function hostDe(valor) { try { return new URL(valor).hostname; } catch (e) { return ''; } }
const LOCALES = ['localhost', '127.0.0.1', '::1'];
function origenPermitido(req, origen) {
  if (!origen || origen === 'null') return false;
  if (ORIGENES_EXTRA.includes(origen)) return true;
  const host = String(req.headers.host || '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
  const h = hostDe(origen).replace(/^\[|\]$/g, '');
  return h === host || (LOCALES.includes(h) && LOCALES.includes(host));
}

/* ---------------- Inicio ---------------- */
const servidor = http.createServer((req, res) => {
  const ruta = new URL(req.url, 'http://localhost').pathname;
  const origen = req.headers.origin;
  if (ruta.startsWith('/api/') && origen) {
    if (origenPermitido(req, origen)) {
      res.setHeader('Access-Control-Allow-Origin', origen);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' });
        return res.end();
      }
    } else if (req.method !== 'GET') {
      // Protección: otro sitio no puede modificar datos usando la sesión de quien visita
      return enviarJson(res, 403, { ok: false, error: 'Origen no permitido.' });
    }
  }
  if (ruta.startsWith('/api/')) atenderApi(req, res, ruta);
  else servirArchivo(req, res, ruta);
});

servidor.on('error', err => {
  if (err.code === 'EADDRINUSE') console.error(`\n✘ El puerto ${PUERTO} ya está en uso. Cerrá el otro programa o cambiá PORT en servidor/.env`);
  else console.error(err);
  process.exit(1);
});

servidor.listen(PUERTO, async () => {
  console.log('\n  JERPRI · Servidor iniciado');
  try {
    const info = await probarConexion();
    console.log(`  ✔ PostgreSQL conectado (base "${info.base}")`);
    if (await actualizarEsquema() === 'creada') console.log('  ✔ La base estaba vacía: se crearon las tablas, las categorías y los ajustes iniciales');
    const admin = await require('./semilla').asegurarAdmin(require('./db').query);
    if (admin) console.log(`  ${admin.ok ? '✔' : '⚠'} ${admin.msj}`);
  } catch (err) {
    console.log(`  ✘ PostgreSQL no responde: ${err.message}`);
    console.log('    Revisá que esté encendido y los datos de servidor/.env');
  }
  console.log(require('./sms').configurado()
    ? '  ✔ Recuperar contraseña: SMS con Twilio'
    : '  ⓘ SMS en modo prueba: los códigos para recuperar la contraseña se muestran en esta terminal');
  console.log(`\n  Abrí la tienda de cualquiera de estas formas:`);
  console.log(`   • En VS Code: clic derecho en index.html → "Open with Live Server"`);
  console.log(`   • En el navegador: http://localhost:${PUERTO}`);
  console.log(`  Dejá esta terminal abierta mientras uses la tienda (Ctrl + C para detener).\n`);
});

module.exports = servidor;
