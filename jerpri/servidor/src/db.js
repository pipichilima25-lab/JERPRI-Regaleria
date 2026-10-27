/* =========================================================
   JERPRI · Conexión a PostgreSQL
   Usa el paquete "pg". Los datos de conexión salen del
   archivo .env (ver .env.ejemplo).
   ========================================================= */
'use strict';
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});


// Si una conexión inactiva se corta, se avisa en la consola sin apagar el servidor.
pool.on('error', err => console.error('[db] Error en una conexión inactiva:', err.message));

/** Ejecuta una consulta. Ejemplo: query('SELECT * FROM productos WHERE id = $1', [id]) */
function query(text, params) {
  return pool.query(text, params);
}

/**
 * Ejecuta varias consultas en una TRANSACCIÓN: o se guardan todas, o ninguna.
 * Uso: await transaccion(async cli => { await cli.query(...); await cli.query(...); });
 */
async function transaccion(fn) {
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const resultado = await fn(cli);
    await cli.query('COMMIT');
    return resultado;
  } catch (err) {
    try { await cli.query('ROLLBACK'); } catch (e) { /* sin acción */ }
    throw err;
  } finally {
    cli.release();
  }
}

/** Comprueba que la base de datos responde. */
async function probarConexion() {
  const r = await pool.query('SELECT current_database() AS base, version() AS version');
  return r.rows[0];
}

/**
 * - Si la base está vacía (recién creada en pgAdmin), crea todas las tablas con
 *   db/base-de-datos-completa.sql (categorías, subcategorías y ajustes iniciales).
 * - Si ya tiene tablas, la pone al día sin borrar datos (por ejemplo, agrega el rol
 *   "empleado" y la tabla de códigos para recuperar la contraseña).
 * Devuelve 'creada' o 'actualizada'.
 */
async function actualizarEsquema() {
  const r = await pool.query("SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'usuarios'");
  if (!r.rows.length) {
    const sql = require('fs').readFileSync(require('path').join(__dirname, '..', 'db', 'base-de-datos-completa.sql'), 'utf8');
    await pool.query(sql);
    return 'creada';
  }
  await pool.query(`ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('admin', 'empleado', 'cliente'));
    CREATE TABLE IF NOT EXISTS recuperaciones (
      id          SERIAL PRIMARY KEY,
      usuario_id  TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      codigo_hash TEXT NOT NULL,                 -- el código de 6 números, cifrado (nunca en texto plano)
      intentos    INTEGER NOT NULL DEFAULT 0,    -- códigos equivocados escritos
      token_hash  TEXT,                          -- se crea al verificar el código: permite cambiar la contraseña
      usado       BOOLEAN NOT NULL DEFAULT FALSE,
      creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
      expira_en   TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS recuperaciones_usuario_idx ON recuperaciones (usuario_id, creado_en DESC);
    ALTER TABLE productos ADD COLUMN IF NOT EXISTS para JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE productos ADD COLUMN IF NOT EXISTS genero TEXT NOT NULL DEFAULT '';
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS novedades_vistas_en TIMESTAMPTZ;
    ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS actualizado_tienda_en TIMESTAMPTZ;
    ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS novedad TEXT NOT NULL DEFAULT '';
    -- los pedidos que ya existían cuentan como vistos; los nuevos empiezan sin ver
    ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS visto_personal BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE pedidos ALTER COLUMN visto_personal SET DEFAULT FALSE;`);
  return 'actualizada';
}

module.exports = { pool, query, transaccion, probarConexion, actualizarEsquema };
