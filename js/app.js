/* =========================================================
   JERPRI · Enrutador y arranque de la aplicación
   Navegación por hash (#/ruta) para que funcione abriendo el
   archivo directamente o con un servidor local.
   ========================================================= */
window.JP = window.JP || {};

JP.router = (function () {
  const U = JP.utils;
  const V = JP.views;
  const A = () => JP.views.admin;

  // area: 'store' | 'admin' · guard: 'user' (con sesión) | sección del panel ('productos', 'pedidos', …) según el rol
  const ROUTES = [
    { path: '/', view: () => V.home, area: 'store' },
    { path: '/catalogo', view: () => V.catalog, area: 'store' },
    { path: '/producto/:id', view: () => V.product, area: 'store' },
    { path: '/favoritos', view: () => V.favorites, area: 'store' },
    { path: '/carrito', view: () => V.cart, area: 'store' },
    { path: '/checkout', view: () => V.checkout, area: 'store', guard: 'user' },       // comprar requiere sesión
    { path: '/pedido/:id', view: () => V.order, area: 'store' },
    { path: '/mis-pedidos', view: () => V.myOrders, area: 'store', guard: 'user' },
    { path: '/seguimiento', view: () => () => ({ redirect: '/mis-pedidos' }), area: 'store' },
    { path: '/ingresar', view: () => V.login, area: 'store' },
    { path: '/registro', view: () => V.register, area: 'store' },
    { path: '/recuperar', view: () => V.recover, area: 'store' },
    { path: '/cuenta', view: () => V.account, area: 'store', guard: 'user' },
    { path: '/admin', view: () => A().dashboard, area: 'admin', guard: 'resumen' },
    { path: '/admin/productos', view: () => A().products, area: 'admin', guard: 'productos' },
    { path: '/admin/productos/:id', view: () => A().productEdit, area: 'admin', guard: 'productos' },
    { path: '/admin/pedidos', view: () => A().orders, area: 'admin', guard: 'pedidos' },
    { path: '/admin/pedidos/:id', view: () => A().orderDetail, area: 'admin', guard: 'pedidos' },
    { path: '/admin/categorias', view: () => A().categories, area: 'admin', guard: 'categorias' },
    { path: '/admin/usuarios', view: () => A().users, area: 'admin', guard: 'usuarios' },
    { path: '/admin/estadisticas', view: () => A().stats, area: 'admin', guard: 'estadisticas' },
    { path: '/admin/ajustes', view: () => A().settings, area: 'admin', guard: 'ajustes' }
  ];

  let currentArea = null;
  let current = null;   // { route, ctx, refreshOn }

  function parse() {
    const raw = decodeURI(location.hash.replace(/^#/, '')) || '/';
    const [path, qs] = raw.split('?');
    return { path: path.replace(/\/+$/, '') || '/', query: U.parseQuery(qs) };
  }

  function match(path) {
    for (const r of ROUTES) {
      const a = r.path.split('/'), b = path.split('/');
      if (a.length !== b.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < a.length; i++) {
        if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
        else if (a[i] !== b[i]) { ok = false; break; }
      }
      if (ok) return { route: r, params };
    }
    return null;
  }

  function go(path) {
    const target = '#' + path;
    if (location.hash === target) render(); else location.hash = target;
  }

  function render(opts) {
    const { path, query } = parse();
    const m = match(path);
    const route = m ? m.route : { area: 'store', view: () => V.notFound };
    const user = JP.auth.current();

    if (route.guard === 'user' && !user) return go('/ingresar?volver=' + encodeURIComponent(path));
    if (route.guard && route.guard !== 'user' && !JP.auth.can(route.guard)) {
      if (!user) return go('/ingresar?motivo=admin&volver=' + encodeURIComponent(path));
      // Empleados: si la sección no es suya, van a una que sí pueden usar
      if (JP.auth.isStaff()) { if (path !== '/admin') JP.ui.toast('Tu cuenta no tiene acceso a esa sección.', 'error'); return go(JP.auth.panelHome()); }
      JP.ui.toast('Tu cuenta no tiene acceso al panel de administración.', 'error'); return go('/');
    }

    // Estructura (tienda o administración)
    const app = document.getElementById('app');
    if (currentArea !== route.area) {
      app.innerHTML = route.area === 'admin' ? JP.layout.admin() : JP.layout.store();
      currentArea = route.area;
      bindShell();
      JP.asistente.mountFloating();   // botón flotante "JERPRI te ayuda a elegir" (solo en la tienda)
    }
    closeMenus();

    const ctx = { params: m ? m.params : {}, query, path };
    let out;
    try { out = route.view()(ctx) || {}; }
    catch (err) {
      console.error(err);
      out = { title: 'Error', html: `<div class="container page">${JP.ui.empty({ icon: 'alert', title: 'Ocurrió un error al mostrar esta sección', text: 'Probá recargar la página. Si el problema sigue, avisanos por WhatsApp.', action: { href: '#/', label: 'Ir al inicio' } })}</div>` };
    }
    if (out.redirect) return go(out.redirect);

    // Recordar el foco para restaurarlo si es solo una actualización
    const keep = opts && opts.keepFocus ? focusKey(document.activeElement) : null;

    // Contenedor nuevo en cada render: así no se acumulan los eventos de la vista anterior.
    const prev = document.getElementById('view');
    const view = prev.cloneNode(false);
    prev.replaceWith(view);
    view.innerHTML = out.html || '';
    document.title = (out.title ? out.title + ' · ' : '') + (route.area === 'admin' ? 'Administración JERPRI' : 'JERPRI');
    current = { ctx, refreshOn: out.refreshOn || [] };
    if (out.mount) {
      try { out.mount(view, ctx); }
      catch (err) { console.error(err); JP.ui.toast('Ocurrió un error en esta sección. Recargá la página.', 'error'); }
    }
    JP.layout.markActive(path);
    JP.layout.noticeBadges();
    JP.layout.refreshHeader();

    if (keep) restoreFocus(keep);
    else if (!opts || !opts.keepScroll) {
      window.scrollTo(0, 0);
      const main = document.getElementById('main');
      if (main) main.focus({ preventScroll: true });
    }
  }

  function focusKey(el) {
    if (!el || el === document.body) return null;
    if (el.id) return '#' + CSS.escape(el.id);
    if (el.name) return `[name="${CSS.escape(el.name)}"]`;
    const step = el.closest('[data-step]');
    const line = el.closest('[data-line]');
    if (step && line) return `[data-line="${CSS.escape(line.dataset.line)}"] [data-step="${step.dataset.step}"]`;
    return null;
  }
  function restoreFocus(sel) { const el = document.querySelector(sel); if (el) el.focus({ preventScroll: true }); }

  function refresh() { render({ keepFocus: true, keepScroll: true }); }

  /* ---------------- Interacciones de la estructura ---------------- */
  function closeMenus() {
    const nav = document.getElementById('mobileNav');
    if (nav && !nav.hidden) toggleMobile(false);
    U.qsa('.submenu.is-open').forEach(s => { s.classList.remove('is-open'); s.previousElementSibling.setAttribute('aria-expanded', 'false'); });
    const um = document.getElementById('userMenu'); if (um) { um.hidden = true; }
    document.body.classList.remove('admin-nav-open');
    const ab = document.getElementById('adminBackdrop'); if (ab) ab.hidden = true;
    const amb = document.getElementById('adminMenu'); if (amb) amb.setAttribute('aria-expanded', 'false');
  }

  function toggleMobile(open) {
    const nav = document.getElementById('mobileNav');
    const btn = document.getElementById('menuToggle');
    if (!nav) return;
    nav.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('has-modal', open);
    if (open) nav.querySelector('input, a').focus(); else btn.focus({ preventScroll: true });
  }

  function bindShell() {
    const mt = document.getElementById('menuToggle');
    if (mt) mt.addEventListener('click', () => toggleMobile(true));
    U.qsa('[data-close-nav]').forEach(b => b.addEventListener('click', () => toggleMobile(false)));
    ['headerSearch', 'mobileSearch'].forEach(id => {
      const f = document.getElementById(id);
      if (f) f.addEventListener('submit', e => { e.preventDefault(); const q = f.q.value.trim(); f.q.value = ''; go('/catalogo' + U.buildQuery({ q })); });
    });
    const sub = document.querySelector('.nav-sub-btn');
    if (sub) sub.addEventListener('click', () => {
      const m = sub.nextElementSibling; const open = !m.classList.contains('is-open');
      m.classList.toggle('is-open', open); sub.setAttribute('aria-expanded', String(open));
    });
    const am = document.getElementById('adminMenu');
    if (am) am.addEventListener('click', () => {
      const open = !document.body.classList.contains('admin-nav-open');
      document.body.classList.toggle('admin-nav-open', open);
      am.setAttribute('aria-expanded', String(open));
      document.getElementById('adminBackdrop').hidden = !open;
    });
    const ab = document.getElementById('adminBackdrop');
    if (ab) ab.addEventListener('click', closeMenus);
  }

  /** Vuelve a dibujar todo, incluida la estructura. */
  function reload(path) { currentArea = null; go(path || '/'); }

  return { render, refresh, go, reload, closeMenus, toggleMobile, current: () => current };
})();

/* ---------------- Arranque y eventos globales ---------------- */
(function () {
  const U = JP.utils;
  const ui = JP.ui;

  async function boot() {
    const app = document.getElementById('app');
    if (!JP.storage.isAvailable()) {
      app.innerHTML = '<div class="fatal"><h1>No se puede guardar información</h1><p>El navegador bloquea el almacenamiento local (por ejemplo, en modo privado estricto). Abrí el proyecto en una ventana normal o con Live Server.</p></div>';
      return;
    }
    // Los datos viven en PostgreSQL: sin servidor la tienda no puede funcionar.
    const det = await JP.api.detect();
    if (!det.server) return sinServidor(app);
    if (!det.db) {
      app.innerHTML = `<div class="fatal"><h1>El servidor no puede conectarse a PostgreSQL</h1><p>${U.esc(det.error || '')}</p><p>Revisá que PostgreSQL esté encendido y los datos del archivo <code>servidor/.env</code> (mirá la <strong>GUIA-DE-INICIO.md</strong>). Después recargá la página.</p></div>`;
      return;
    }
    JP.api.on = true;
    const r = await JP.api.load();
    if (!r.ok) { app.innerHTML = `<div class="fatal"><h1>No se pudieron cargar los datos</h1><p>${U.esc(r.error)}</p></div>`; return; }

    window.addEventListener('hashchange', () => JP.router.render());

    // Avisos (número rojo): se actualizan cuando cambian los datos
    U.on('data:change', () => JP.layout.noticeBadges());
    // Cada 30 segundos se pregunta si hay pedidos nuevos o novedades (también al volver a la pestaña)
    const revisar = () => { if (document.visibilityState === 'visible') JP.api.checkNotices(); };
    setInterval(revisar, 30000);
    document.addEventListener('visibilitychange', revisar);

    // Volver a dibujar la vista si cambia algo que la afecta
    ['cart:change', 'fav:change', 'auth:change'].forEach(evt => U.on(evt, () => {
      JP.layout.refreshHeader();
      const c = JP.router.current();
      if (c && c.refreshOn.includes(evt)) JP.router.refresh();
    }));
    U.on('auth:change', () => { const c = JP.router.current(); if (c && c.ctx.path.startsWith('/admin') && !JP.auth.isStaff()) JP.router.go('/'); });

    bindGlobal();
    JP.router.render();
  }

  /** Pantalla cuando el servidor está apagado: explica qué hacer y se conecta sola cuando arranca. */
  function sinServidor(app) {
    const archivo = JP.api.abiertaComoArchivo;
    app.innerHTML = `<div class="fatal fatal--server">
      <div class="fatal__pulse" aria-hidden="true"></div>
      <h1>Encendé el servidor de JERPRI</h1>
      <p>Los productos, los pedidos y las cuentas se guardan en la base de datos, así que la tienda necesita que el servidor esté funcionando.</p>
      <ol>
        <li>En VS Code abrí una terminal: menú <strong>Terminal → New Terminal</strong>.</li>
        <li>Escribí <code>cd servidor</code> y apretá Enter.</li>
        <li>Escribí <code>npm start</code> y apretá Enter. Dejá esa terminal abierta.</li>
      </ol>
      ${archivo ? '<p class="fatal__warn">Abriste el archivo con doble clic. Abrilo con <strong>Live Server</strong> (clic derecho en <code>index.html</code> → <em>Open with Live Server</em>).</p>' : ''}
      <p class="fatal__wait" aria-live="polite">Buscando el servidor en <code>${U.esc(JP.api.base || location.origin)}</code>… la página se va a abrir sola.</p>
    </div>`;
    if (archivo) return;
    const t = setInterval(async () => {
      const d = await JP.api.detect();
      if (d.server) { clearInterval(t); location.reload(); }
    }, 3000);
  }

  function bindGlobal() {
    // Imagen que no carga → imagen de demostración
    document.addEventListener('error', e => {
      const img = e.target;
      if (img && img.tagName === 'IMG' && img.dataset.fallback && img.src !== img.dataset.fallback) img.src = img.dataset.fallback;
    }, true);

    document.addEventListener('click', async e => {
      // Favoritos
      const fav = e.target.closest('[data-action="fav"]');
      if (fav) {
        const r = JP.favorites.toggle(fav.dataset.id);
        if (r.needLogin) return ui.loginPrompt('fav');
        if (!r.ok) return ui.toast(r.error, 'error');
        const p = JP.catalog.product(fav.dataset.id);
        U.qsa(`[data-action="fav"][data-id="${CSS.escape(fav.dataset.id)}"]`).forEach(b => {
          b.classList.toggle('is-on', r.added); b.setAttribute('aria-pressed', String(r.added));
          b.setAttribute('aria-label', `${r.added ? 'Quitar de favoritos' : 'Agregar a favoritos'}: ${p ? p.name : ''}`);
          b.innerHTML = JP.icon('heart', { fill: r.added, size: 18 });
        });
        ui.toast(r.added ? 'Guardado en favoritos.' : 'Quitado de favoritos.', r.added ? 'success' : 'info');
        return;
      }
      // Desplegar subcategorías dentro del menú Categorías
      const st = e.target.closest('.subtree__btn');
      if (st) {
        const list = document.getElementById(st.getAttribute('aria-controls'));
        const open = list.hidden;
        // Se abre una categoría por vez
        U.qsa('.subtree__btn[aria-expanded="true"]', st.closest('ul')).forEach(b => { if (b !== st) { b.setAttribute('aria-expanded', 'false'); document.getElementById(b.getAttribute('aria-controls')).hidden = true; } });
        list.hidden = !open; st.setAttribute('aria-expanded', String(open));
        return;
      }
      // Copiar alias / CBU
      const cp = e.target.closest('[data-copy]');
      if (cp) {
        const v = cp.dataset.copy;
        try { await navigator.clipboard.writeText(v); ui.toast('Copiado: ' + v); }
        catch (err) { ui.toast('No se pudo copiar automáticamente. Seleccioná el texto y copialo.', 'info'); }
        return;
      }
      if (e.target.closest('[data-action="wa-missing"]')) { ui.toast('El número de WhatsApp todavía no fue cargado por la administración (Panel → Ajustes).', 'info'); return; }
      // Agregar directo (productos sin talles ni colores)
      const qa = e.target.closest('[data-action="quick-add"]');
      if (qa) {
        const p = JP.catalog.product(qa.dataset.id);
        const r = p ? JP.cart.add(p.id, p.variants[0].id, 1) : { ok: false, error: 'Producto no disponible.' };
        if (r.needLogin) return ui.loginPrompt('cart');
        if (r.ok) ui.toast(`${p.name} se agregó al carrito.`); else ui.toast(r.error, 'error');
        return;
      }
      // Selector de cantidad
      const step = e.target.closest('[data-step]');
      if (step) {
        const box = step.closest('[data-qty]');
        const inp = box.querySelector('input');
        const max = Number(inp.max) || 1;
        const cur = Number(inp.value) || 1;
        const next = Math.min(max, Math.max(1, cur + Number(step.dataset.step)));
        if (next === cur) { if (Number(step.dataset.step) > 0) ui.toast('No hay más unidades disponibles de esta variante.', 'info'); return; }
        inp.value = next;
        box.dispatchEvent(new CustomEvent('qty:change', { bubbles: true, detail: { value: next } }));
        return;
      }
      // Menú de usuario
      const um = e.target.closest('.user-menu__btn');
      if (um) {
        const panel = document.getElementById('userMenu');
        panel.hidden = !panel.hidden; um.setAttribute('aria-expanded', String(!panel.hidden));
        return;
      }
      if (!e.target.closest('.user-menu')) { const p = document.getElementById('userMenu'); if (p && !p.hidden) { p.hidden = true; document.querySelector('.user-menu__btn').setAttribute('aria-expanded', 'false'); } }
      if (!e.target.closest('.has-sub')) U.qsa('.submenu.is-open').forEach(s => { s.classList.remove('is-open'); s.previousElementSibling.setAttribute('aria-expanded', 'false'); });

      // Cerrar sesión
      if (e.target.closest('[data-action="logout"]')) {
        const r = await JP.auth.logout();
        if (r && r.ok === false) return ui.toast(r.error, 'error');
        ui.toast('Cerraste sesión.', 'info');
        JP.router.go('/');
        return;
      }
    });

    // Cantidad escrita a mano
    document.addEventListener('change', e => {
      const inp = e.target.closest('.qty__input');
      if (!inp) return;
      const max = Number(inp.max) || 1;
      let v = Math.round(Number(inp.value));
      if (!Number.isFinite(v) || v < 1) { v = 1; ui.toast('La cantidad mínima es 1.', 'info'); }
      if (v > max) { v = max; ui.toast(`Hay ${max} unidad${max === 1 ? '' : 'es'} disponible${max === 1 ? '' : 's'}.`, 'info'); }
      inp.value = v;
      inp.closest('[data-qty]').dispatchEvent(new CustomEvent('qty:change', { bubbles: true, detail: { value: v } }));
    });

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const nav = document.getElementById('mobileNav');
      if (nav && !nav.hidden) JP.router.toggleMobile(false);
      JP.router.closeMenus();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
