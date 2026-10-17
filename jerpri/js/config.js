/* =========================================================
   JERPRI · Dónde está el servidor
   ---------------------------------------------------------
   La página se puede abrir de dos formas y en las dos usa la
   base de datos PostgreSQL a través del servidor de Node:
   - Con Live Server (VS Code → clic derecho en index.html →
     "Open with Live Server"): la página busca sola el servidor
     en el mismo equipo, en el puerto de abajo.
   - Desde el propio servidor: http://localhost:3000
   Cambiá el número solo si cambiaste PORT en servidor/.env.
   ========================================================= */
window.JERPRI_CONFIG = {
  puertoServidor: 3000
};
