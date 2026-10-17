/* =========================================================
   JERPRI · Almacenamiento
   ---------------------------------------------------------
   Todos los datos de la tienda (productos, pedidos, cuentas,
   ajustes) se guardan en PostgreSQL a través del servidor.
   En el navegador solo quedan cosas propias de cada visitante:
   - localStorage: el carrito y los favoritos de cada cuenta.
   - sessionStorage: borradores de la compra en curso.
   ========================================================= */
window.JP = window.JP || {};

JP.storage = (function () {
  const PREFIX = 'jerpri:';

  function _get(store, key, fallback) {
    try {
      const raw = store.getItem(PREFIX + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  /** Devuelve true si se guardó. Nunca lanza excepciones. */
  function _set(store, key, value) {
    try { store.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function _remove(store, key) { try { store.removeItem(PREFIX + key); } catch (e) { /* sin acción */ } }

  const local = {
    get: (k, f) => _get(window.localStorage, k, f),
    set: (k, v) => _set(window.localStorage, k, v),
    remove: k => _remove(window.localStorage, k)
  };
  const session = {
    get: (k, f) => _get(window.sessionStorage, k, f),
    set: (k, v) => _set(window.sessionStorage, k, v),
    remove: k => _remove(window.sessionStorage, k)
  };

  function isAvailable() {
    try { const k = PREFIX + '__test'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; }
    catch (e) { return false; }
  }

  return { local, session, isAvailable };
})();

/* ---------------------------------------------------------
   Lectura de los datos que mandó el servidor (JP.api.cache).
   Los servicios leen con JP.repo y envían cada cambio a la API.
   --------------------------------------------------------- */
JP.repo = (function () {
  function all(col) { return (JP.api.cache[col] || []).slice(); }
  function get(col, id) { return all(col).find(x => x.id === id) || null; }
  function getSettings() { return JP.api.cache.settings || {}; }
  return { all, get, getSettings };
})();

/* Ajustes de la tienda (panel → Ajustes): PUT /api/ajustes */
JP.settingsService = {
  save(patch) { return JP.api.send('PUT', '/ajustes', patch); }
};
