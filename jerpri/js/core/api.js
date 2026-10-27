/* =========================================================
   JERPRI · Conexión con el servidor (PostgreSQL)
   ---------------------------------------------------------
   Todos los datos se leen y se guardan en PostgreSQL a través
   de la API del servidor de Node (carpeta servidor/).
   - Si la página se abre desde el servidor (http://localhost:3000)
     la API está en la misma dirección.
   - Si se abre con Live Server (http://127.0.0.1:5500), la API
     se busca en el mismo equipo, en el puerto de js/config.js.
   Al abrir la página se cargan todos los datos en JP.api.cache,
   y después de cada cambio se vuelven a pedir al servidor para
   que la pantalla quede al día.
   ========================================================= */
window.JP = window.JP || {};

JP.api = (function () {
  /** Dirección base de la API según cómo se abrió la página. */
  function baseUrl() {
    const port = String((window.JERPRI_CONFIG || {}).puertoservidor || 3000);
    
    // Si estás trabajando de forma local en tu PC (con Live Server o localhost)
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        return 'http://localhost:' + port;
} 
    
    // Si lo abres con doble clic directamente (protocolo file://)
    if (location.protocol === 'file:') {
        return 'http://localhost:' + port; 
    }
    
    // Para cualquier otro sitio web en internet (como tu despliegue en GitHub Pages)
    return 'https://onrender.com';
}                            

  const api = {
    on: false,                 // true = conectada al servidor
    base: baseUrl(),
    abiertaComoArchivo: location.protocol === 'file:',
    cache: { categories: [], subcategories: [], products: [], orders: [], users: [], settings: {}, me: null }
  };

  /** Petición a la API. Siempre devuelve { ok, ... } y nunca lanza errores. */
  async function call(method, path, body) {
    try {
      const res = await fetch(api.base + '/api' + path, {
        method,
        credentials: 'include',
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
      let data;
      try { data = await res.json(); } catch (e) { data = { ok: false, error: 'Respuesta inválida del servidor.' }; }
      if (!res.ok && data.ok !== false) data = { ok: false, error: data.error || 'Error ' + res.status };
      return data;
    } catch (e) {
      return { ok: false, error: 'No se pudo conectar con el servidor. Revisá que esté encendido (npm start).' };
    }
  }

  /** ¿Responde el servidor de JERPRI? */
  async function detect() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(api.base + '/api/salud', { signal: ctrl.signal, credentials: 'include' });
      clearTimeout(t);
      if (!res.ok) return { server: false };
      const d = await res.json();
      if (d.app !== 'jerpri') return { server: false };
      return { server: true, db: !!d.db, error: d.error };
    } catch (e) { return { server: false }; }
  }

  /** Carga todos los datos desde PostgreSQL. */
  async function load() {
    const d = await call('GET', '/datos');
    if (!d.ok) return d;
    ['categories', 'subcategories', 'products', 'orders', 'users'].forEach(k => { api.cache[k] = d[k] || []; });
    api.cache.settings = d.settings || {};
    api.cache.me = d.me || null;
    return { ok: true };
  }

  /**
   * Envía un cambio al servidor y, si salió bien, vuelve a cargar los datos.
   * Se usa en todos los servicios: JP.api.send('PUT', '/productos/x', datos)
   */
  async function send(method, path, body) {
    const r = await call(method, path, body === undefined ? {} : body);
    if (r.ok) {
      const l = await load();
      if (!l.ok) console.warn('[api] El cambio se guardó, pero no se pudieron recargar los datos:', l.error);
      JP.utils.emit('data:change');
    }
    return r;
  }

  /**
   * Pregunta al servidor cuántos avisos hay (consulta liviana). Si cambió algo
   * (por ejemplo, entró un pedido nuevo), vuelve a cargar los datos y actualiza los números rojos.
   */
  let revisando = false;
  async function checkNotices() {
    if (!api.on || revisando || !api.cache.me) return;
    revisando = true;
    try {
      const r = await call('GET', '/avisos');
      if (!r.ok) return;
      const personal = JP.orders.newForStaff().length, cliente = JP.orders.customerUpdates().length;
      if (r.nuevos !== personal || r.novedades !== cliente) {
        const l = await load();
        if (!l.ok) return;
        JP.utils.emit('data:change');
        // Si está mirando la lista de pedidos, se actualiza para mostrar lo nuevo
        if (['#/admin/pedidos', '#/mis-pedidos'].includes(location.hash)) JP.router.refresh();
      }
    } finally { revisando = false; }
  }

 api._call = typeof call !== 'undefined' ? call : undefined;
    api.detect = typeof detect !== 'undefined' ? detect : undefined;
    api.load = typeof load !== 'undefined' ? load : undefined;
    api.send = typeof send !== 'undefined' ? send : undefined;
    api.checkNotices = typeof checkNotices !== 'undefined' ? checkNotices : undefined;

    return api;
})();
