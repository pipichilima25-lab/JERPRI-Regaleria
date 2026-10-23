/* =========================================================
   JERPRI · Estructura de páginas (tienda y administración)
   ========================================================= */
window.JP = window.JP || {};

JP.layout = (function () {
  const U = JP.utils;
  const I = JP.icon;

  /* ---------------- Tienda ---------------- */
  function store() {
    const cats = JP.catalog.categories();
    const ig = JP.repo.getSettings().instagram || 'jerpri.dtb';
    const catLinks = cats.map(c => `<li><a href="#/catalogo?cat=${c.id}">${U.esc(c.name)}</a></li>`).join('');
    // Todas las secciones de productos viven dentro del menú "Categorías".
    // Las categorías con subcategorías se despliegan al tocarlas (por ejemplo Calzado → Zapatillas, Ojotas, Sandalias).
    const link = (href, icon, label, cls) => `<li${cls ? ` class="${cls}"` : ''}><a href="${href}">${I(icon, { size: 18 })}${U.esc(label)}</a></li>`;
    const sectionLinks = (cls, idp) => [
      link('#/catalogo', 'grid', 'Todos los productos', cls),
      ...cats.map(c => {
        const subs = JP.catalog.subcategories(c.id);
        if (!subs.length) return link('#/catalogo?cat=' + c.id, c.icon || 'tag', c.name, cls);
        const id = idp + '-' + c.id;
        return `<li class="subtree${cls ? ' ' + cls : ''}">
          <button type="button" class="subtree__btn" aria-expanded="false" aria-controls="${id}">${I(c.icon || 'tag', { size: 18 })}<span>${U.esc(c.name)}</span>${I('chevronDown', { size: 16, cls: 'subtree__chev' })}</button>
          <ul class="subtree__list" id="${id}" hidden>
            <li><a href="#/catalogo?cat=${c.id}">Todo ${U.esc(c.name.toLowerCase())}</a></li>
            ${subs.map(sc => `<li><a href="#/catalogo?cat=${c.id}&sub=${sc.id}">${U.esc(sc.name)}</a></li>`).join('')}
          </ul></li>`;
      }),
      '<li class="submenu__sep" role="separator"></li>',
      link('#/catalogo?nuevo=1', 'sparkle', 'Nuevos ingresos', cls),
      link('#/catalogo?dest=1', 'star', 'Destacados', cls),
      link('#/catalogo?disp=pedido', 'clock', 'Productos por pedido', cls)
    ].join('');
    const wa = String(JP.repo.getSettings().whatsapp || '').replace(/\D/g, '');
    // Mensaje automático al tocar el botón de WhatsApp
    const WA_MESSAGE = '¡Hola, JERPRI! 👋✨\nEstuve mirando la tienda y me encantaron sus productos 💕\nQuería hacerles una consulta:\n';
    const waFloat = wa
      ? `<a class="wa-float" href="https://wa.me/${wa}?text=${encodeURIComponent(WA_MESSAGE)}" target="_blank" rel="noopener noreferrer" aria-label="Escribinos por WhatsApp (se abre en una pestaña nueva)">${I('whatsapp', { size: 30, stroke: 1.7 })}</a>`
      : `<button type="button" class="wa-float" data-action="wa-missing" aria-label="Escribinos por WhatsApp">${I('whatsapp', { size: 30, stroke: 1.7 })}</button>`;
    return `
    <header class="site-header">
      <div class="container header__row">
        <button type="button" class="icon-btn header__menu" id="menuToggle" aria-controls="mobileNav" aria-expanded="false" aria-label="Abrir menú">${I('menu', { size: 22 })}</button>
        <a class="brand" href="#/" aria-label="JERPRI, ir al inicio"><img src="assets/img/wordmark.png" alt="JERPRI Regalería" width="150" height="50"></a>
        <form class="header__search" role="search" id="headerSearch">
          <label class="sr-only" for="hq">Buscar productos</label>
          <input id="hq" name="q" type="search" placeholder="Buscar productos" autocomplete="off">
          <button type="submit" class="icon-btn" aria-label="Buscar">${I('search', { size: 18 })}</button>
        </form>
        <nav class="header__nav" aria-label="Principal">
          <ul>
            <li><a href="#/" data-nav="/">Inicio</a></li>
            <li class="has-sub">
              <button type="button" class="nav-sub-btn" aria-expanded="false" aria-controls="catMenu" data-nav-cat>Categorías ${I('chevronDown', { size: 16 })}</button>
              <ul class="submenu" id="catMenu">${sectionLinks('', 'dsk')}</ul>
            </li>
          </ul>
        </nav>
        <div class="header__actions">
          <a class="icon-btn header__search-link" href="#/catalogo" aria-label="Buscar productos">${I('search')}</a>
          <a class="icon-btn" href="#/favoritos" aria-label="Favoritos" id="favLink">${I('heart')}<span class="count" id="favCount" hidden></span></a>
          <a class="icon-btn" href="#/carrito" aria-label="Carrito" id="cartLink">${I('bag')}<span class="count" id="cartCount" hidden></span></a>
          <div id="userSlot"></div>
        </div>
      </div>
    </header>
    <div class="mnav" id="mobileNav" hidden>
      <div class="mnav__backdrop" data-close-nav></div>
      <nav class="mnav__panel" aria-label="Menú móvil">
        <div class="mnav__head"><img src="assets/img/wordmark.png" alt="JERPRI Regalería" width="120" height="40"><button type="button" class="icon-btn" data-close-nav aria-label="Cerrar menú">${I('close')}</button></div>
        <form class="mnav__search" id="mobileSearch" role="search"><label class="sr-only" for="mq">Buscar productos</label><input id="mq" name="q" type="search" placeholder="Buscar productos"><button class="icon-btn" aria-label="Buscar">${I('search', { size: 18 })}</button></form>
        <ul class="mnav__list">
          <li><a href="#/">Inicio</a></li>
          <li class="mnav__label">Categorías</li>
          ${sectionLinks('mnav__sub', 'mob')}
          <li><a href="#/carrito">${I('bag', { size: 18 })}Carrito</a></li>
          <li><a href="#/mis-pedidos">${I('receipt', { size: 18 })}Mis pedidos<span class="nbadge" data-notice="cliente" hidden></span></a></li>
          <li id="mnavAccount"></li>
        </ul>
      </nav>
    </div>
    <main id="main" tabindex="-1"><div id="view"></div></main>
    <footer class="site-footer">
      <div class="container footer__grid">
        <div>
          <img src="assets/img/wordmark.png" alt="JERPRI Regalería" width="160" height="54" class="footer__logo">
          <p>Calzado, accesorios, bijouterie y regalería. Emprendimiento que trabaja desde casa, con productos disponibles y por pedido.</p>
        </div>
        <div><h2 class="footer__title">Tienda</h2><ul><li><a href="#/catalogo">Todos los productos</a></li>${catLinks}<li><a href="#/" data-action="open-helper">🎀 Te ayudamos a elegir</a></li></ul></div>
        <div><h2 class="footer__title">Tu compra</h2><ul><li><a href="#/carrito">Carrito</a></li><li><a href="#/favoritos">Favoritos</a></li><li><a href="#/mis-pedidos">Mis pedidos</a></li><li><a href="#/cuenta">Mi cuenta</a></li></ul></div>
        <div><h2 class="footer__title">Información</h2><ul><li>Pago en efectivo o transferencia bancaria</li><li>Envío a domicilio o retiro</li></ul></div>
      </div>
      <div class="container footer__legal"><p>© ${new Date().getFullYear()} JERPRI · Regalería</p></div>
    </footer>
    ${waFloat}
    ${JP.asistente.floating()}`;
  }

  /* ---------------- Administración ---------------- */
  const ADMIN_NAV = [
    // [ruta, ícono, texto, sección (para los permisos de cada rol)]
    ['/admin', 'grid', 'Resumen', 'resumen'], ['/admin/productos', 'box', 'Productos', 'productos'], ['/admin/pedidos', 'receipt', 'Pedidos', 'pedidos'],
    ['/admin/categorias', 'tag', 'Categorías', 'categorias'], ['/admin/usuarios', 'users', 'Usuarios', 'usuarios'], ['/admin/estadisticas', 'chart', 'Estadísticas', 'estadisticas'], ['/admin/ajustes', 'sliders', 'Ajustes', 'ajustes']
  ];
  function admin() {
    const u = JP.auth.current();
    return `
    <div class="admin">
      <aside class="admin__side" id="adminSide" aria-label="Menú de administración">
        <div class="admin__brand"><img src="assets/img/favicon.png" alt="" width="40" height="40"><div><strong>JERPRI</strong><span>Panel de administración</span></div></div>
        <nav><ul>${ADMIN_NAV.filter(n => JP.auth.can(n[3])).map(([href, ic, label, sec]) => `<li><a href="#${href}" data-admin-nav="${href}">${I(ic, { size: 18 })}${label}${sec === 'pedidos' ? '<span class="nbadge" data-notice="personal" hidden></span>' : ''}</a></li>`).join('')}</ul></nav>
        <div class="admin__side-foot">
          <a href="#/" class="admin__store">${I('store', { size: 18 })}Ver tienda</a>
          <button type="button" class="admin__logout" data-action="logout">${I('logout', { size: 18 })}Cerrar sesión</button>
        </div>
      </aside>
      <div class="admin__backdrop" id="adminBackdrop" hidden></div>
      <div class="admin__main">
        <header class="admin__top">
          <button type="button" class="icon-btn admin__menu" id="adminMenu" aria-controls="adminSide" aria-expanded="false" aria-label="Abrir menú de administración">${I('menu')}</button>
          ${JP.api && JP.api.on ? `<p class="admin__notice admin__notice--ok">${I('checkCircle', { size: 16 })}<span>Conectado a PostgreSQL: los cambios se guardan en la base de datos.</span></p>` : ''}
          <span class="admin__user">${I('user', { size: 18 })}${U.esc(u ? u.name : '')}${u ? `<small class="admin__role">${JP.auth.ROLES[u.role] || ''}</small>` : ''}</span>
        </header>
        <main id="main" tabindex="-1" class="admin__content"><div id="view"></div></main>
      </div>
    </div>`;
  }

  /** Actualiza contadores y menú de usuario del encabezado de la tienda. */
  function refreshHeader() {
    const cart = JP.cart.count();
    const fav = JP.favorites.count();
    const set = (id, n, linkId, label) => {
      const el = document.getElementById(id);
      const link = document.getElementById(linkId);
      if (!el || !link) return;
      el.hidden = !n; el.textContent = n > 99 ? '99+' : n;
      link.setAttribute('aria-label', `${label}${n ? ` (${n})` : ''}`);
    };
    set('cartCount', cart, 'cartLink', 'Carrito, unidades');
    set('favCount', fav, 'favLink', 'Favoritos');
    const u = JP.auth.current();
    const slot = document.getElementById('userSlot');
    if (slot) {
      slot.innerHTML = u
        ? `<div class="user-menu"><button type="button" class="icon-btn user-menu__btn" aria-expanded="false" aria-controls="userMenu" aria-label="Menú de ${U.esc(u.name)}">${I('user')}<span class="user-menu__dot"></span><span class="count count--alert" data-notice="total" hidden></span></button>
            <div class="user-menu__panel" id="userMenu" hidden>
              <p class="user-menu__name">${U.esc(u.name)}<span>${U.esc(u.email)}</span></p>
              ${JP.auth.isStaff() ? `<a href="#${JP.auth.panelHome()}">${I('grid', { size: 16 })}Panel de administración<span class="nbadge" data-notice="personal" hidden></span></a>` : ''}
              <a href="#/cuenta">${I('user', { size: 16 })}Mi cuenta</a>
              <a href="#/mis-pedidos">${I('receipt', { size: 16 })}Mis pedidos<span class="nbadge" data-notice="cliente" hidden></span></a>
              <button type="button" data-action="logout">${I('logout', { size: 16 })}Cerrar sesión</button>
            </div></div>`
        : `<a class="btn btn--ghost btn--sm header__login" href="#/ingresar">${I('user', { size: 16 })}<span>Ingresar</span></a>`;
    }
    const m = document.getElementById('mnavAccount');
    if (m) m.innerHTML = u
      ? `${JP.auth.isStaff() ? `<a href="#${JP.auth.panelHome()}">Panel de administración<span class="nbadge" data-notice="personal" hidden></span></a>` : ''}<a href="#/cuenta">${I('user', { size: 18 })}Mi cuenta</a><button type="button" class="mnav__btn" data-action="logout">${I('logout', { size: 18 })}Cerrar sesión</button>`
      : `<a href="#/ingresar">${I('login', { size: 18 })}Ingresar</a><a href="#/registro">${I('user', { size: 18 })}Crear cuenta</a>`;
    noticeBadges();
  }

  /**
   * Avisos con número rojo:
   * - cliente: novedades de sus pedidos (la tienda lo confirmó, lo canceló, etc.);
   * - personal: pedidos nuevos que nadie del personal vio todavía.
   */
  function noticeBadges() {
    const c = JP.auth.current() ? JP.orders.customerUpdates().length : 0;
    const p = JP.auth.isStaff() ? JP.orders.newForStaff().length : 0;
    const n = { cliente: c, personal: p, total: c + p };
    U.qsa('[data-notice]').forEach(b => {
      const k = n[b.dataset.notice] || 0;
      b.hidden = !k; b.textContent = k > 99 ? '99+' : k;
      b.setAttribute('aria-label', b.dataset.notice === 'personal' ? `${k} pedido${k === 1 ? '' : 's'} nuevo${k === 1 ? '' : 's'}` : `${k} novedad${k === 1 ? '' : 'es'}`);
    });
    const btn = document.querySelector('.user-menu__btn');
    const u = JP.auth.current();
    if (btn && u) btn.setAttribute('aria-label', `Menú de ${u.name}${n.total ? ` (${n.total} aviso${n.total === 1 ? '' : 's'})` : ''}`);
  }

  /** Marca el enlace activo del menú. */
  function markActive(path) {
    U.qsa('[data-nav]').forEach(a => { if (a.dataset.nav === path) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const catBtn = document.querySelector('[data-nav-cat]');
    if (catBtn) catBtn.classList.toggle('is-current', path === '/catalogo' || path.startsWith('/producto'));
    U.qsa('[data-admin-nav]').forEach(a => {
      const p = a.dataset.adminNav;
      const on = p === '/admin' ? path === '/admin' : path.startsWith(p);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  return { store, admin, refreshHeader, markActive, noticeBadges };
})();
