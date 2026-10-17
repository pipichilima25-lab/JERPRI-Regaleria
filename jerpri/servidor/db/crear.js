/* =========================================================
   JERPRI · Crear la base de datos desde la terminal
   Uso (dentro de la carpeta servidor):  npm run db:crear
   Hace lo mismo que pegar base-de-datos-completa.sql en pgAdmin:
   1) Crea (o vuelve a crear) todas las tablas.
   2) Carga las categorías, subcategorías y ajustes iniciales.
   3) Crea la cuenta de administración de servidor/.env.
   ATENCIÓN: borra los datos que hubiera en esas tablas.
   ========================================================= */
'use strict';
require('../src/config');
const fs = require('fs');
const path = require('path');
const { pool, probarConexion, query } = require('../src/db');
const { asegurarAdmin } = require('../src/semilla');

(async () => {
  try {
    const info = await probarConexion();
    console.log(`✔ Conectado a la base "${info.base}"`);
    const sql = fs.readFileSync(path.join(__dirname, 'base-de-datos-completa.sql'), 'utf8');
    await pool.query(sql);
    console.log('✔ Tablas creadas con las categorías, subcategorías y ajustes iniciales');
    const admin = await asegurarAdmin(query);
    if (admin) console.log(`${admin.ok ? '✔' : '⚠'} ${admin.msj}`);
    console.log('\nListo. Ahora ejecutá:  npm start');
  } catch (err) {
    console.error('\n✘ No se pudo crear la base de datos.');
    console.error('  ' + err.message);
    if (err.code === '28P01') console.error('  → La contraseña de PostgreSQL es incorrecta. Revisá PGPASSWORD en servidor/.env');
    else if (err.code === '3D000') console.error('  → La base de datos no existe. Creala en pgAdmin con el nombre que pusiste en PGDATABASE (por ejemplo "jerpri").');
    else if (err.code === 'ECONNREFUSED') console.error('  → PostgreSQL no está encendido o el puerto no es el correcto (por defecto 5432).');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
