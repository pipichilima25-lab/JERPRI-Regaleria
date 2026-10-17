/* =========================================================
   JERPRI · Componentes de interfaz reutilizables
   Notificaciones, modales accesibles, confirmaciones, imágenes
   genéricas, tarjetas de producto y ayudas de formularios.
   ========================================================= */
window.JP = window.JP || {};

JP.ui = (function () {
  const U = JP.utils;
  const I = JP.icon;

  /* ---------------- Aviso "Iniciá sesión" ----------------
     Sale del ícono del carrito o de favoritos del encabezado,
     con una flechita que apunta al ícono. */
  const LOGIN_TXT = {
    cart: { icon: 'bag', title: 'Iniciá sesión para comprar', text: 'Para agregar productos al carrito necesitás una cuenta. Así guardamos tu carrito y podés hacer el pedido.' },
    fav: { icon: 'heart', title: 'Guardá tus favoritos', text: 'Iniciá sesión para guardar los productos que te gustan y encontrarlos cuando quieras.' }
  };
  let lpCleanup = null;
  function closeLoginPrompt() { if (lpCleanup) lpCleanup(); }
  function loginPrompt(kind) {
    closeLoginPrompt();
    const k = LOGIN_TXT[kind] ? kind : 'cart';
    const t = LOGIN_TXT[k];
    const anchor = document.getElementById(k === 'fav' ? 'favLink' : 'cartLink');
    const back = encodeURIComponent((location.hash || '#/').slice(1) || '/');
    const el = document.createElement('div');
    el.className = 'lp lp--' + k;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'false'); el.setAttribute('aria-labelledby', 'lpTitle');
    el.innerHTML = `<button type="button" class="lp__close" aria-label="Cerrar aviso">${I('close', { size: 16 })}</button>
      <span class="lp__icon" aria-hidden="true">${I(t.icon, { size: 22, fill: k === 'fav' })}</span>
      <h2 class="lp__title" id="lpTitle">${t.title}</h2>
      <p class="lp__text">${t.text}</p>
      <div class="lp__actions"><a class="btn btn--primary btn--sm" href="#/ingresar?volver=${back}">Iniciar sesión</a><a class="btn btn--ghost btn--sm" href="#/registro?volver=${back}">Crear cuenta</a></div>`;
    document.body.appendChild(el);

    // Ubicación: debajo del ícono, con la flecha apuntándolo
    // En pantallas grandes (TV) la página se agranda con "zoom": las medidas se pasan a la escala de la página.
    const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const r = anchor ? anchor.getBoundingClientRect() : null;
    const w = el.offsetWidth * z;
    if (r && r.width) {
      const cx = r.left + r.width / 2;
      const left = Math.min(Math.max(12, cx - w / 2), window.innerWidth - w - 12);
      el.style.top = (r.bottom + 12) / z + 'px'; el.style.left = left / z + 'px';
      el.style.setProperty('--arrow-x', (cx - left) / z + 'px');
      anchor.classList.remove('is-nudge'); void anchor.offsetWidth; anchor.classList.add('is-nudge');
    } else {
      el.classList.add('lp--free');
    }
    const prevFocus = document.activeElement;
    requestAnimationFrame(() => el.classList.add('is-open'));
    el.querySelector('.lp__actions a').focus({ preventScroll: true });

    const onDoc = e => { if (!el.contains(e.target) && !e.target.closest('[data-action="fav"], [data-action="quick-add"], #addBtn')) close(); };
    const onKey = e => { if (e.key === 'Escape') { close(); if (prevFocus && prevFocus.focus) prevFocus.focus(); } };
    function close() {
      document.removeEventListener('click', onDoc, true); document.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', close); window.removeEventListener('resize', close);
      if (anchor) anchor.classList.remove('is-nudge');
      el.classList.remove('is-open'); setTimeout(() => el.remove(), 200);
      lpCleanup = null;
    }
    el.querySelector('.lp__close').addEventListener('click', close);
    el.querySelectorAll('.lp__actions a').forEach(a => a.addEventListener('click', close));
    setTimeout(() => document.addEventListener('click', onDoc, true), 0);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', close); window.addEventListener('resize', close);
    lpCleanup = close;
  }

  /* ---------------- Notificaciones ---------------- */
  function toast(message, type) {
    const root = document.getElementById('toasts');
    if (!root) return;
    const t = type || 'success';
    const el = document.createElement('div');
    el.className = 'toast toast--' + t;
    el.setAttribute('role', t === 'error' ? 'alert' : 'status');
    el.innerHTML = I(t === 'error' ? 'alert' : t === 'info' ? 'info' : 'checkCircle', { size: 20 }) +
      `<p>${U.esc(message)}</p><button class="toast__close" type="button" aria-label="Cerrar aviso">${I('close', { size: 16 })}</button>`;
    root.appendChild(el);
    const close = () => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 200); };
    el.querySelector('button').addEventListener('click', close);
    setTimeout(close, t === 'error' ? 7000 : 4200);
  }

  /* ---------------- Modal accesible ---------------- */
  /**
   * opts: { title, html, size:'sm'|'md'|'lg', actions:[{label, variant, value, close:true}], onOpen(el, close) }
   * Devuelve una promesa con el `value` de la acción elegida (o null al cerrar).
   */
  function modal(opts) {
    return new Promise(resolve => {
      const root = document.getElementById('modalRoot');
      const prevFocus = document.activeElement;
      const id = U.uid('m');
      const wrap = document.createElement('div');
      wrap.className = 'modal';
      wrap.innerHTML = `
        <div class="modal__backdrop" data-close></div>
        <div class="modal__dialog modal__dialog--${opts.size || 'md'}" role="dialog" aria-modal="true" aria-labelledby="${id}-t">
          <header class="modal__head">
            <h2 id="${id}-t">${U.esc(opts.title || '')}</h2>
            <button type="button" class="icon-btn" data-close aria-label="Cerrar">${I('close')}</button>
          </header>
          <div class="modal__body">${opts.html || ''}</div>
          ${opts.actions && opts.actions.length ? `<footer class="modal__foot">${opts.actions.map((a, i) =>
            `<button type="button" class="btn btn--${a.variant || 'ghost'}" data-act="${i}">${U.esc(a.label)}</button>`).join('')}</footer>` : ''}
        </div>`;
      root.appendChild(wrap);
      document.body.classList.add('has-modal');
      const dialog = wrap.querySelector('.modal__dialog');

      function close(value) {
        document.removeEventListener('keydown', onKey, true);
        wrap.classList.add('is-leaving');
        setTimeout(() => {
          wrap.remove();
          if (!root.children.length) document.body.classList.remove('has-modal');
          if (prevFocus && prevFocus.focus) prevFocus.focus();
        }, 150);
        resolve(value === undefined ? null : value);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(null); return; }
        if (e.key !== 'Tab') return;
        const f = U.qsa('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', dialog).filter(x => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
      document.addEventListener('keydown', onKey, true);
      U.qsa('[data-close]', wrap).forEach(b => b.addEventListener('click', () => close(null)));
      U.qsa('[data-act]', wrap).forEach(b => b.addEventListener('click', async () => {
        const a = opts.actions[Number(b.dataset.act)];
        if (a.onClick) {
          const keep = await a.onClick(dialog, close);
          if (keep === false) return;
        }
        if (a.close !== false) close(a.value);
      }));
      if (opts.onOpen) opts.onOpen(dialog, close);
      const first = dialog.querySelector('[autofocus], input, select, textarea, .modal__foot .btn--primary, .modal__foot .btn--danger, button');
      (first || dialog).focus();
    });
  }

  /** Confirmación para acciones importantes. Devuelve true/false. */
  function confirm(opts) {
    return modal({
      title: opts.title || '¿Confirmás esta acción?',
      size: 'sm',
      html: `<div class="confirm">${opts.danger ? `<span class="confirm__icon">${I('alert', { size: 26 })}</span>` : ''}<div>${opts.html || `<p>${U.esc(opts.message || '')}</p>`}</div></div>`,
      actions: [
        { label: opts.cancelText || 'Cancelar', variant: 'ghost', value: false },
        { label: opts.confirmText || 'Confirmar', variant: opts.danger ? 'danger' : 'primary', value: true }
      ]
    }).then(v => v === true);
  }

  /* ---------------- Imágenes ---------------- */
  const CAT_ICON = { calzado: 'shoe', accesorios: 'bow', bijouterie: 'gem', regaleria: 'gift' };
  function catIcon(categoryId) {
    const c = JP.catalog.category(categoryId);
    return (c && c.icon) || CAT_ICON[categoryId] || 'tag';
  }

  /** Imagen genérica (SVG) para productos sin foto cargada. */
  function placeholder(p, colorName, index) {
    const hex = colorName ? JP.catalog.colorHex(p, colorName) : '#E8D7BF';
    const icon = JP.icon.paths[catIcon(p.categoryId)] || JP.icon.paths.tag;
    const tilt = [0, -8, 8][index % 3] || 0;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF9EF"/><stop offset="1" stop-color="#F1E6D6"/></linearGradient></defs>
      <rect width="600" height="600" fill="url(#g)"/>
      <circle cx="300" cy="280" r="170" fill="${hex}" fill-opacity="0.32"/>
      <circle cx="300" cy="280" r="170" fill="none" stroke="#D6B88A" stroke-opacity="0.6" stroke-width="2"/>
      <g transform="translate(300 280) rotate(${tilt}) translate(-132 -132) scale(11)" fill="none" stroke="#6B4A2F" stroke-width="0.85" stroke-linecap="round" stroke-linejoin="round">${icon}</g>
      <text x="300" y="530" text-anchor="middle" font-family="Georgia, serif" font-size="22" letter-spacing="8" fill="#8A6F57">JERPRI</text>
      ${colorName ? `<text x="300" y="562" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#8A6F57">${U.esc(colorName)}</text>` : ''}
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /** Lista de imágenes del producto: las cargadas o, si no hay, imágenes genéricas. */
  function images(p) {
    if (p.images && p.images.length) return p.images.map(src => ({ src, alt: p.name, demo: false, fallback: placeholder(p, null, 0) }));
    const cols = JP.catalog.colors(p);
    const list = cols.length ? cols.slice(0, 4) : [null, null];
    return list.map((c, i) => ({ src: placeholder(p, c, i), alt: `${p.name}${c ? ', color ' + c : ''}`, demo: true, fallback: placeholder(p, c, i) }));
  }

  function img(p, cls, index) {
    const list = images(p);
    const im = list[index || 0] || list[0];
    return `<img class="${cls || ''}" src="${U.esc(im.src)}" alt="${U.esc(im.alt)}" loading="lazy" data-fallback="${U.esc(im.fallback)}">`;
  }

  /* ---------------- Piezas de producto ---------------- */
  /** Solo se muestra el cartel "Sin stock" (sin Destacado, Nuevo, Por pedido ni Últimas unidades). */
  function badges(p) {
    return JP.catalog.stockStatus(p) === 'agotado' ? '<span class="badge badge--muted">Sin stock</span>' : '';
  }

  function stockPill(p) {
    const st = JP.catalog.stockStatus(p);
    return `<span class="stock stock--${st}">${U.esc(JP.catalog.stockLabel(p))}</span>`;
  }

  function favButton(p, extra) {
    const on = JP.favorites.has(p.id);
    return `<button type="button" class="fav-btn ${extra || ''}${on ? ' is-on' : ''}" data-action="fav" data-id="${p.id}" aria-pressed="${on}" aria-label="${on ? 'Quitar de favoritos' : 'Agregar a favoritos'}: ${U.esc(p.name)}">${I('heart', { fill: on, size: 18 })}</button>`;
  }

  /** Tarjeta de producto: imagen, favorito, categoría, nombre, precio y "Ver detalle". */
  function productCard(p) {
    const cat = JP.catalog.category(p.categoryId);
    const url = '#/producto/' + encodeURIComponent(p.id);
    const b = badges(p);
    return `<article class="pcard${b ? ' is-out' : ''}">
      <div class="pcard__media">
        <a href="${url}" tabindex="-1" aria-hidden="true">${img(p, 'pcard__img')}</a>
        ${b ? `<div class="pcard__badges">${b}</div>` : ''}
        ${favButton(p, 'pcard__fav')}
      </div>
      <div class="pcard__body">
        <p class="pcard__cat">${U.esc(cat ? cat.name : '')}</p>
        <h3 class="pcard__title"><a href="${url}">${U.esc(p.name)}</a></h3>
        <p class="price">${U.money(p.price)}</p>
        <a class="btn btn--primary btn--sm btn--block pcard__btn" href="${url}">Ver detalle</a>
      </div>
    </article>`;
  }

  function grid(list) { return `<div class="pgrid">${list.map(productCard).join('')}</div>`; }

  function empty(o) {
    return `<div class="empty">
      <span class="empty__icon">${I(o.icon || 'info', { size: 30 })}</span>
      <h2 class="empty__title">${U.esc(o.title)}</h2>
      ${o.text ? `<p>${U.esc(o.text)}</p>` : ''}
      ${o.action ? `<a class="btn btn--primary" href="${o.action.href}">${U.esc(o.action.label)}</a>` : ''}
    </div>`;
  }

  function statusBadge(type, key) {
    const maps = { order: JP.orders.ORDER_STATUS, payment: JP.orders.PAYMENT_STATUS, delivery: JP.orders.DELIVERY_STATUS };
    return `<span class="status status--${type}-${key}">${U.esc((maps[type] || {})[key] || key)}</span>`;
  }

  /* ---------------- Formularios ---------------- */
  function clearErrors(form) {
    U.qsa('.field-error', form).forEach(e => e.remove());
    U.qsa('[aria-invalid="true"]', form).forEach(e => { e.removeAttribute('aria-invalid'); e.removeAttribute('aria-describedby'); });
    U.qsa('.form-alert', form).forEach(e => e.remove());
  }

  /** Marca los campos con error, asocia el mensaje y enfoca el primero. */
  function showErrors(form, errors, general) {
    clearErrors(form);
    let first = null;
    Object.entries(errors || {}).forEach(([name, msg]) => {
      const field = form.querySelector(`[name="${name}"]`);
      const holder = field ? (field.closest('.field') || field.parentElement) : form.querySelector(`[data-error-for="${name}"]`);
      if (!holder) return;
      const id = 'err-' + name + '-' + Math.random().toString(36).slice(2, 6);
      const p = document.createElement('p');
      p.className = 'field-error'; p.id = id;
      p.innerHTML = I('alert', { size: 14 }) + U.esc(msg);
      holder.appendChild(p);
      const target = field && field.type !== 'radio' ? field : (holder.querySelector('input, select, textarea') || field);
      if (target) { target.setAttribute('aria-invalid', 'true'); target.setAttribute('aria-describedby', id); }
      if (!first) first = target;
    });
    if (general) {
      const a = document.createElement('div');
      a.className = 'form-alert'; a.setAttribute('role', 'alert');
      a.innerHTML = I('alert', { size: 18 }) + `<p>${U.esc(general)}</p>`;
      form.prepend(a);
    }
    if (first) first.focus();
  }

  function formData(form) {
    const out = {};
    new FormData(form).forEach((v, k) => { out[k] = typeof v === 'string' ? v : v; });
    U.qsa('input[type=checkbox][name]', form).forEach(c => { out[c.name] = c.checked; });
    return out;
  }

  /** Pone un botón en estado de carga mientras se ejecuta una promesa. */
  async function busy(btn, fn) {
    const html = btn.innerHTML;
    btn.disabled = true; btn.classList.add('is-loading');
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>' + html;
    try { return await fn(); }
    finally { btn.disabled = false; btn.classList.remove('is-loading'); btn.innerHTML = html; }
  }

  function qtyStepper(name, value, max, label) {
    return `<div class="qty" data-qty>
      <button type="button" class="qty__btn" data-step="-1" aria-label="Restar una unidad${label ? ' de ' + U.esc(label) : ''}">${I('minus', { size: 16 })}</button>
      <input class="qty__input" type="number" inputmode="numeric" name="${name}" value="${value}" min="1" max="${max}" step="1" aria-label="Cantidad${label ? ' de ' + U.esc(label) : ''}">
      <button type="button" class="qty__btn" data-step="1" aria-label="Sumar una unidad${label ? ' de ' + U.esc(label) : ''}">${I('plus', { size: 16 })}</button>
    </div>`;
  }

  return { toast, loginPrompt, closeLoginPrompt, modal, confirm, placeholder, images, img, badges, stockPill, favButton, productCard, grid, empty, statusBadge, clearErrors, showErrors, formData, busy, qtyStepper, catIcon };
})();
