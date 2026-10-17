/* =========================================================
   JERPRI · Preparación antes de "npm start"
   - Si falta la carpeta node_modules (el paquete "pg"), la instala.
   - Si falta el archivo .env, avisa cómo crearlo.
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const carpeta = path.join(__dirname, '..');
try { require.resolve('pg', { paths: [carpeta] }); }
catch (e) {
  console.log('\n  Instalando lo que necesita el servidor (solo la primera vez)…\n');
  execSync('npm install --no-audit --no-fund', { cwd: carpeta, stdio: 'inherit' });
}
if (!fs.existsSync(path.join(carpeta, '.env'))) {
  console.log('\n  ⚠ Falta el archivo servidor/.env');
  console.log('    Copiá servidor/.env.ejemplo con el nombre .env y escribí la contraseña de PostgreSQL.');
  console.log('    Está explicado paso a paso en GUIA-DE-INICIO.md\n');
}
