/* =========================================================
   JERPRI · Configuración
   Lee el archivo servidor/.env (si existe) y deja los valores
   en process.env. Se carga antes que todo lo demás.
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');

const ENV = path.join(__dirname, '..', '.env');

if (fs.existsSync(ENV)) {
  // Formato: CLAVE=valor (una por línea). Las líneas que empiezan con # se ignoran.
  // (se quita la marca BOM que agregan algunos editores de Windows)
  for (const linea of fs.readFileSync(ENV, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/i);
    if (!m || linea.trim().startsWith('#')) continue;
    let valor = m[2].trim();
    if (/^".*"$|^'.*'$/.test(valor)) valor = valor.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = valor;
  }
} else {
  console.warn('[config] No se encontró servidor/.env. Copiá .env.ejemplo como .env y completá la contraseña de PostgreSQL.');
}

module.exports = {
  PUERTO: Number(process.env.PORT || 3000),
  RAIZ_WEB: path.join(__dirname, '..', '..'),           // carpeta con index.html, css/, js/ y assets/
  DIAS_SESION: Number(process.env.DIAS_SESION || 7),
  // Direcciones extra desde las que se puede usar la API (separadas por coma).
  // No hace falta tocarlo para Live Server: se acepta cualquier página abierta en este mismo equipo.
  ORIGENES_EXTRA: String(process.env.ORIGENES_PERMITIDOS || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean)
};
