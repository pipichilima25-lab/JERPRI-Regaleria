/* =========================================================
   JERPRI · Vistas de la tienda (clientes)
   Cada vista devuelve { title, html, mount(el) }.
   ========================================================= */
window.JP = window.JP || {};
JP.views = JP.views || {};

(function () {
  const U = JP.utils;
  const I = JP.icon;
  const C = JP.catalog;
  const ui = JP.ui;
  const V = JP.views;

  function settings() { return JP.repo.getSettings(); }
  function igUrl() { return 'https://www.instagram.com/' + encodeURIComponent(settings().instagram || 'jerpri.dtb') + '/'; }
  function section(title, link, body, sub) {
    return `<section class="section"><div class="container">
      <div class="section__head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${link ? `<a class="link-arrow" href="${link.href}">${U.esc(link.label)} ${I('arrowRight', { size: 16 })}</a>` : ''}</div>
      ${body}</div></section>`;
  }
  function crumbs(list) {
    return `<nav class="crumbs" aria-label="Ruta de navegación"><ol>${list.map((c, i) => i === list.length - 1
      ? `<li aria-current="page">${U.esc(c[0])}</li>` : `<li><a href="${c[1]}">${U.esc(c[0])}</a></li>`).join('')}</ol></nav>`;
  }

  /* =======================================================
     INICIO
     ======================================================= */
  V.home = function () {
    const s = settings();
    const all = C.filter({});                       // todos los productos visibles, ordenados por relevancia
    const banners = (s.banners || []).filter(b => b.active);
    const cats = C.categories();
    const delivery = (s.deliveryOptions || []).filter(o => o.active);
    const marks = ['gift', 'clock', 'gem', 'shoe', 'bow'];
    // Corazón dibujado a mano y destello, como en la imagen de referencia
    const heart = cls => `<svg class="hb__heart ${cls}" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 34C9 26 4 20 4.6 13.4 5.2 7.6 11.8 4.8 16.4 8.6c1.6 1.3 2.8 3 3.6 4.8.8-1.9 2-3.6 3.7-4.9 4.6-3.6 11.3-.6 11.6 5.3.4 6.6-4.9 12.6-15.3 20.2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const spark = cls => `<svg class="hb__spark ${cls}" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3c1.2 8.8 4.6 12.6 16 17-11.4 4.4-14.8 8.2-16 17-1.2-8.8-4.6-12.6-16-17 11.4-4.4 14.8-8.2 16-17z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;

    // Inicio fijo (no se desliza): mismo diseño que la imagen de referencia.
    const hero = `<section class="hb hb--static hb--full" aria-labelledby="heroTitle">
        <div class="hb__slide is-active">
          <span class="hb__blob hb__blob--a" aria-hidden="true"></span><span class="hb__blob hb__blob--b" aria-hidden="true"></span>
          <span class="hb__line" aria-hidden="true"></span>
          <div class="container hb__inner">
            ${heart('hb__heart--a')}${heart('hb__heart--b')}${spark('hb__spark--a')}
            <div class="hb__text">
              <p class="hb__kicker">Todo lo que te gusta,</p>
              <h1 class="hb__title" id="heroTitle">En un solo lugar</h1>
              <p class="hb__desc">Accesorios, calzado, regalería y mucho más… Comprá fácil, rápido y desde donde estés.</p>
              <button type="button" class="btn btn--primary btn--lg hb__cta" data-scroll="productos">Ver productos ${I('arrowRight', { size: 18 })}</button>
            </div>
            <div class="hb__art hb__art--logo"><img src="assets/img/inicio-logo.jpg" alt="Logo de JERPRI Regalería"></div>
          </div>
        </div>
      </section>
      <div class="hb-divider" aria-hidden="true">
        <svg class="hb-divider__wave" viewBox="0 0 1440 60" preserveAspectRatio="none"><path d="M0 0h1440v20c-160 26-320 38-480 30S640 22 480 26 160 50 0 34z"/></svg>
        <div class="container hb-divider__orn"><span class="hb-divider__rule"></span>${spark('hb-divider__icon')}<span class="hb-divider__text">JERPRI · Regalería</span>${spark('hb-divider__icon')}<span class="hb-divider__rule"></span></div>
      </div>`;

    // Marco publicitario (debajo del inicio): se desliza solo cada 5 segundos.
    const carousel = banners.length ? `
      <section class="promo" aria-roledescription="carrusel" aria-label="Publicidades">
        <div class="container">
          <div class="promo__viewport">
            <div class="promo__track" id="promoTrack">
              ${banners.map((b, i) => `<div class="promo__slide${b.image ? ' promo__slide--img' : ''}" role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${banners.length}" ${i ? 'aria-hidden="true" inert' : ''}>
                ${b.image ? `<img class="promo__img" src="${U.esc(b.image)}" alt="" loading="lazy">` : ''}
                <div class="promo__text"><p class="eyebrow">${I('sparkle', { size: 14 })} JERPRI</p><h2>${U.esc(b.title)}</h2>${b.text ? `<p>${U.esc(b.text)}</p>` : ''}
                ${b.cta ? `<a class="btn btn--primary" href="${U.esc(b.link || '#/catalogo')}">${U.esc(b.cta)}</a>` : ''}</div>
                ${b.image ? '' : `<span class="promo__mark" aria-hidden="true">${I(marks[i % marks.length], { size: 110, stroke: 0.9 })}</span>`}
              </div>`).join('')}
            </div>
          </div>
          ${banners.length > 1 ? `<div class="promo__dots" aria-hidden="true">${banners.map((b, i) => `<span class="promo__dot${i === 0 ? ' is-active' : ''}"></span>`).join('')}</div>` : ''}
        </div>
      </section>` : '';

    const html = `
      ${hero}
      ${carousel}
      <section class="section" id="productos" tabindex="-1"><div class="container">
        <div class="section__head section__head--center"><div><h2>Nuestros productos</h2></div></div>
        ${all.length ? ui.grid(all) : ui.empty({ icon: 'box', title: 'Todavía no hay productos cargados' })}
      </div></section>
      <section class="section section--tight"><div class="container info-cards">
        <article class="info-card"><span class="info-card__icon">${I('cash', { size: 26 })}</span><h3>Medios de pago</h3><p>Efectivo o transferencia bancaria. El pago se confirma cuando lo recibimos.</p></article>
        <article class="info-card"><span class="info-card__icon">${I('truck', { size: 26 })}</span><h3>Entregas</h3><p>${delivery.length ? delivery.map(d => U.esc(d.name)).join(' o ') + '. ' : ''}Coordinamos el día y el horario por WhatsApp.</p></article>
        <article class="info-card"><span class="info-card__icon">${I('clock', { size: 26 })}</span><h3>Por pedido</h3><p>Si no hay stock de lo que buscás, algunos productos se pueden encargar.${s.deposit && s.deposit.enabled ? ` Si lo retirás, se pide una seña del ${Number(s.deposit.percent)}%.` : ''}</p></article>
      </div></section>
      <section class="ig-band"><div class="container ig-band__in">
        <h2>Visitá nuestro Instagram</h2>
        <a class="btn btn--primary btn--lg" href="${igUrl()}" target="_blank" rel="noopener noreferrer">${I('instagram')} @${U.esc(s.instagram)}<span class="sr-only"> (se abre en una pestaña nueva)</span></a>
      </div></section>`;

    function mount(el) {
      const sc = el.querySelector('[data-scroll]');
      if (sc) sc.addEventListener('click', () => {
        const t = el.querySelector('#productos');
        t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        t.focus({ preventScroll: true });
      });

      const track = el.querySelector('#promoTrack');
      if (!track) return;
      const slidesEls = U.qsa('.promo__slide', el);
      const dots = U.qsa('.promo__dot', el);
      if (slidesEls.length < 2) return;
      const box = el.querySelector('.promo');
      let idx = 0, timer = null, hold = false;

      function show(i) {
        idx = (i + slidesEls.length) % slidesEls.length;
        track.style.transform = `translateX(-${idx * 100}%)`;
        slidesEls.forEach((sl, j) => {
          if (j === idx) { sl.removeAttribute('aria-hidden'); sl.removeAttribute('inert'); }
          else { sl.setAttribute('aria-hidden', 'true'); sl.setAttribute('inert', ''); }
        });
        dots.forEach((d, j) => d.classList.toggle('is-active', j === idx));
      }
      function stop() { clearInterval(timer); timer = null; }
      function start() {
        stop();
        if (hold) return;
        timer = setInterval(() => {
          if (!document.body.contains(track)) return stop();   // la vista cambió
          show(idx + 1);
        }, 5000);                                              // avanza solo cada 5 segundos
      }
      box.addEventListener('mouseenter', () => { hold = true; stop(); });
      box.addEventListener('mouseleave', () => { hold = false; start(); });
      box.addEventListener('focusin', () => { hold = true; stop(); });
      box.addEventListener('focusout', e => { if (!box.contains(e.relatedTarget)) { hold = false; start(); } });
      let x0 = null;   // deslizar con el dedo en el celular
      box.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; stop(); }, { passive: true });
      box.addEventListener('touchend', e => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
        start();
      });
      start();
    }
    return { title: 'Inicio', html, mount };
  };

  /* =======================================================
     PRODUCTOS POR CATEGORÍA (con botones Filtrar y Ordenar)
     ======================================================= */
  V.catalog = function (ctx) {
    const q = ctx.query;
    const split = v => (v ? String(v).split(',').map(x => x.trim()).filter(Boolean) : []);
    const base = { q: q.q || '', cat: q.cat || '', sub: q.sub || '', disp: q.disp || '', dest: q.dest === '1', nuevo: q.nuevo === '1' };
    const sub = base.sub ? C.subcategory(base.sub) : null;
    if (sub && !base.cat) base.cat = sub.categoryId;
    const state = { colors: split(q.color), sizes: split(q.talle), min: q.min || '', max: q.max || '', orden: ['precio-asc', 'precio-desc'].includes(q.orden) ? q.orden : '' };
    const cat = base.cat ? C.category(base.cat) : null;
    const showSizes = base.cat === 'calzado';          // el filtro de talle solo aparece en Calzado
    if (!showSizes) state.sizes = [];

    // Opciones disponibles en esta sección
    const pool = C.filter(base);
    const avail = [];
    pool.forEach(p => p.variants.forEach(v => { if (C.isAvailable(p, v)) avail.push({ p, v }); }));
    const colorOpts = [...new Set(avail.map(x => x.v.color).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    const sizeOpts = [...new Set(avail.filter(x => x.p.categoryId === 'calzado').map(x => x.v.size).filter(Boolean))]
      .sort((a, b) => (parseFloat(a) - parseFloat(b)) || a.localeCompare(b));
    const hexOf = name => { const x = avail.find(a => a.v.color === name); return x ? C.colorHex(x.p, name) : '#ccc'; };

    let title = 'Todos los productos';
    if (cat) title = sub ? sub.name : cat.name;
    else if (base.disp === 'pedido') title = 'Productos por pedido';
    else if (base.dest) title = 'Destacados';
    else if (base.nuevo) title = 'Nuevos ingresos';
    if (base.q) title = `Resultados para “${base.q}”`;
    const SORTS = [['', 'Más relevante'], ['precio-desc', 'Precio: mayor a menor'], ['precio-asc', 'Precio: menor a mayor']];

    const html = `
      <div class="container page">
        ${crumbs(sub ? [['Inicio', '#/'], [cat.name, '#/catalogo?cat=' + cat.id], [sub.name]] : [['Inicio', '#/'], [cat ? cat.name : title]])}
        <div class="page__head"><h1>${U.esc(title)}</h1>${cat && cat.description && !sub ? `<p class="muted">${U.esc(cat.description)}</p>` : ''}</div>
        ${cat && C.subcategories(cat.id).length ? `<nav class="subnav" aria-label="Subcategorías de ${U.esc(cat.name)}">
          <a href="#/catalogo?cat=${cat.id}" ${!sub ? 'aria-current="page"' : ''}>Todo</a>
          ${C.subcategories(cat.id).map(x => `<a href="#/catalogo?cat=${cat.id}&sub=${x.id}" ${sub && sub.id === x.id ? 'aria-current="page"' : ''}>${U.esc(x.name)}</a>`).join('')}
        </nav>` : ''}
        <div class="ptools">
          <div class="ptools__btns">
            <div class="pop">
              <button type="button" class="btn btn--ghost pop__btn" id="filterBtn" aria-expanded="false" aria-controls="filterPanel">${I('filter', { size: 17 })}Filtrar<span class="pop__count" id="filterCount" hidden></span></button>
              <form class="pop__panel" id="filterPanel" hidden aria-label="Filtros">
                ${colorOpts.length ? `<fieldset class="fgroup"><legend>Color</legend><div class="fchips">
                  ${colorOpts.map(c => `<label class="fchip"><input type="checkbox" name="color" value="${U.esc(c)}" ${state.colors.includes(c) ? 'checked' : ''}><span><i style="background:${U.esc(hexOf(c))}"></i>${U.esc(c)}</span></label>`).join('')}</div></fieldset>` : ''}
                ${showSizes && sizeOpts.length ? `<fieldset class="fgroup"><legend>Talle</legend><div class="fchips">
                  ${sizeOpts.map(sz => `<label class="fchip fchip--size"><input type="checkbox" name="talle" value="${U.esc(sz)}" ${state.sizes.includes(sz) ? 'checked' : ''}><span>${U.esc(sz)}</span></label>`).join('')}</div></fieldset>` : ''}
                <fieldset class="fgroup"><legend>Precio</legend>
                  <div class="row-2"><div><label class="sub-label" for="f-min">Desde</label><input id="f-min" name="min" type="number" min="0" step="500" inputmode="numeric" placeholder="$ 0" value="${U.esc(state.min)}"></div>
                  <div><label class="sub-label" for="f-max">Hasta</label><input id="f-max" name="max" type="number" min="0" step="500" inputmode="numeric" placeholder="Sin límite" value="${U.esc(state.max)}"></div></div>
                  <p class="field-error" id="priceErr" hidden></p>
                </fieldset>
                <div class="pop__actions"><button type="button" class="btn btn--ghost btn--sm" id="clearFilters">Limpiar</button><button type="submit" class="btn btn--primary btn--sm">Ver resultados</button></div>
              </form>
            </div>
            <div class="pop">
              <button type="button" class="btn btn--ghost pop__btn" id="sortBtn" aria-expanded="false" aria-controls="sortPanel">${I('sliders', { size: 17 })}Ordenar: <span id="sortLabel">${SORTS.find(x => x[0] === state.orden)[1]}</span></button>
              <div class="pop__panel pop__panel--menu" id="sortPanel" hidden role="menu" aria-label="Ordenar por">
                ${SORTS.map(([v, l]) => `<button type="button" role="menuitemradio" aria-checked="${state.orden === v}" data-sort="${v}">${I('check', { size: 16 })}${l}</button>`).join('')}
              </div>
            </div>
          </div>
          <p class="muted small" id="resultCount" aria-live="polite"></p>
        </div>
        <div id="activeChips" class="chips"></div>
        <div id="results"></div>
      </div>`;

    function mount(el) {
      const form = el.querySelector('#filterPanel');
      const results = el.querySelector('#results');
      const count = el.querySelector('#resultCount');
      const chips = el.querySelector('#activeChips');
      const fBtn = el.querySelector('#filterBtn');
      const sBtn = el.querySelector('#sortBtn');
      const sPanel = el.querySelector('#sortPanel');

      function openPop(btn, panel, open) {
        panel.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
        if (open) (panel.querySelector('input, [aria-checked="true"], button') || panel).focus();
      }
      function closeAll(returnFocus) {
        [[fBtn, form], [sBtn, sPanel]].forEach(([b, p]) => { if (!p.hidden) { openPop(b, p, false); if (returnFocus) b.focus(); } });
      }

      function readForm() {
        state.colors = U.qsa('input[name=color]:checked', form).map(i => i.value);
        state.sizes = U.qsa('input[name=talle]:checked', form).map(i => i.value);
        state.min = form.querySelector('[name=min]').value.trim();
        state.max = form.querySelector('[name=max]').value.trim();
      }
      function syncForm() {
        U.qsa('input[name=color]', form).forEach(i => { i.checked = state.colors.includes(i.value); });
        U.qsa('input[name=talle]', form).forEach(i => { i.checked = state.sizes.includes(i.value); });
        form.querySelector('[name=min]').value = state.min;
        form.querySelector('[name=max]').value = state.max;
      }

      function apply() {
        const list = C.filter(Object.assign({}, base, { colors: state.colors, sizes: state.sizes, min: state.min, max: state.max, orden: state.orden }));
        count.textContent = `${list.length} producto${list.length === 1 ? '' : 's'}`;
        results.innerHTML = list.length ? ui.grid(list)
          : ui.empty({ icon: 'search', title: 'No encontramos productos', text: 'Probá con otros filtros o volvé a ver todos los productos de esta sección.' }) +
            '<p class="center"><button type="button" class="btn btn--primary" data-clear>Quitar filtros</button></p>';
        const n = state.colors.length + state.sizes.length + (state.min ? 1 : 0) + (state.max ? 1 : 0);
        const fc = el.querySelector('#filterCount'); fc.hidden = !n; fc.textContent = n;
        el.querySelector('#sortLabel').textContent = SORTS.find(x => x[0] === state.orden)[1];
        U.qsa('[data-sort]', sPanel).forEach(b => b.setAttribute('aria-checked', String(b.dataset.sort === state.orden)));
        renderChips();
        const qstr = U.buildQuery({ q: base.q, cat: base.cat, sub: base.sub, disp: base.disp, dest: base.dest ? 1 : '', nuevo: base.nuevo ? 1 : '',
          color: state.colors.join(','), talle: state.sizes.join(','), min: state.min, max: state.max, orden: state.orden });
        history.replaceState(null, '', '#/catalogo' + qstr);
      }
      function renderChips() {
        const c = [];
        state.colors.forEach(x => c.push(['color', x, 'Color ' + x]));
        state.sizes.forEach(x => c.push(['talle', x, 'Talle ' + x]));
        if (state.min) c.push(['min', '', 'Desde ' + U.money(state.min)]);
        if (state.max) c.push(['max', '', 'Hasta ' + U.money(state.max)]);
        chips.innerHTML = c.map(([k, v, l]) => `<button type="button" class="chip" data-chip="${k}" data-val="${U.esc(v)}">${U.esc(l)} ${I('close', { size: 14 })}<span class="sr-only">Quitar filtro</span></button>`).join('')
          + (c.length > 1 ? '<button type="button" class="chip chip--clear" data-clear>Quitar todos</button>' : '');
      }
      function clearAll() { state.colors = []; state.sizes = []; state.min = ''; state.max = ''; syncForm(); apply(); }

      fBtn.addEventListener('click', () => { const open = form.hidden; closeAll(); openPop(fBtn, form, open); });
      sBtn.addEventListener('click', () => { const open = sPanel.hidden; closeAll(); openPop(sBtn, sPanel, open); });
      form.addEventListener('submit', e => {
        e.preventDefault();
        readForm();
        const err = form.querySelector('#priceErr');
        if (state.min !== '' && state.max !== '' && Number(state.min) > Number(state.max)) {
          err.hidden = false; err.textContent = 'El precio "desde" no puede ser mayor que "hasta".';
          form.querySelector('[name=min]').focus(); return;
        }
        err.hidden = true;
        apply(); openPop(fBtn, form, false); fBtn.focus();
      });
      el.querySelector('#clearFilters').addEventListener('click', () => { clearAll(); openPop(fBtn, form, false); fBtn.focus(); });
      sPanel.addEventListener('click', e => {
        const b = e.target.closest('[data-sort]'); if (!b) return;
        state.orden = b.dataset.sort; apply(); openPop(sBtn, sPanel, false); sBtn.focus();
      });
      sPanel.addEventListener('keydown', e => {
        const items = U.qsa('[data-sort]', sPanel);
        const i = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      });
      el.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(true); });
      document.addEventListener('click', function outside(e) {
        if (!document.body.contains(form)) return document.removeEventListener('click', outside);
        if (!e.target.closest('.pop')) closeAll(false);
      });
      el.addEventListener('click', e => {
        if (e.target.closest('[data-clear]')) { clearAll(); return; }
        const b = e.target.closest('[data-chip]'); if (!b) return;
        const k = b.dataset.chip;
        if (k === 'color') state.colors = state.colors.filter(x => x !== b.dataset.val);
        else if (k === 'talle') state.sizes = state.sizes.filter(x => x !== b.dataset.val);
        else state[k] = '';
        syncForm(); apply();
      });
      apply();
    }
    return { title, html, mount };
  };

  /* =======================================================
     DETALLE DE PRODUCTO
     ======================================================= */
  V.product = function (ctx) {
    const p = C.product(ctx.params.id);
    const admin = JP.auth.isStaff();
    if (!p || (!C.isPublic(p) && !admin)) return V.notFound({ message: 'El producto que buscás no existe o ya no está disponible.' });
    const cat = C.category(p.categoryId);
    const sub = C.subcategory(p.subcategoryId);
    const sizes = C.sizes(p);
    const colors = C.colors(p);
    const imgs = ui.images(p);
    const s = settings();
    const isPedido = p.saleType === 'pedido';
    const rel = C.related(p, 4);

    const html = `
      <div class="container page">
        ${crumbs([['Inicio', '#/'], [cat ? cat.name : 'Categoría', '#/catalogo?cat=' + p.categoryId]].concat(sub ? [[sub.name, '#/catalogo?cat=' + p.categoryId + '&sub=' + sub.id]] : [], [[p.name]]))}
        ${!C.isPublic(p) ? `<div class="notice notice--warn">${I('lock', { size: 18 })}<p>Este producto está desactivado (o su categoría lo está). Solo lo ves porque iniciaste sesión con una cuenta del personal.</p></div>` : ''}
        <div class="pdp">
          <div class="gallery">
            <div class="gallery__main"><img id="mainImg" src="${U.esc(imgs[0].src)}" alt="${U.esc(imgs[0].alt)}" data-fallback="${U.esc(imgs[0].fallback)}"></div>
            ${imgs.length > 1 ? `<div class="gallery__thumbs" role="list">${imgs.map((im, i) => `<button type="button" role="listitem" class="gallery__thumb${i === 0 ? ' is-active' : ''}" data-img="${i}" aria-label="Ver imagen ${i + 1} de ${imgs.length}" ${i === 0 ? 'aria-current="true"' : ''}><img src="${U.esc(im.src)}" alt="" data-fallback="${U.esc(im.fallback)}"></button>`).join('')}</div>` : ''}
          </div>
          <div class="pdp__info">
            <p class="pdp__cat">${U.esc(cat ? cat.name : '')}${sub ? ' · ' + U.esc(sub.name) : ''}</p>
            <h1 class="pdp__title">${U.esc(p.name)}</h1>
            <div class="pdp__badges">${ui.badges(p)}</div>
            <p class="pdp__price">${U.money(p.price)}</p>
            <p class="pdp__desc">${U.esc(p.description)}</p>
            <p class="pdp__type">${isPedido ? `${I('clock', { size: 18 })}<span><strong>Por pedido.</strong> Se encarga y se confirma disponibilidad y plazo al coordinar.${s.deposit && s.deposit.enabled ? ` Si elegís retirarlo, se pide una seña del ${Number(s.deposit.percent)}%.` : ''}</span>` : `${I('box', { size: 18 })}<span><strong>Disponible</strong> para entrega coordinada.</span>`}</p>
            <form id="buyForm" class="buy" novalidate>
              ${sizes.length ? `<fieldset class="opt"><legend>Talle <span class="opt__sel" id="sizeSel"></span></legend><div class="opt__list" id="sizeList">
                ${sizes.map(sz => `<button type="button" class="opt__btn" data-size="${U.esc(sz)}" aria-pressed="false">${U.esc(sz)}</button>`).join('')}</div></fieldset>` : ''}
              ${colors.length ? `<fieldset class="opt"><legend>Color <span class="opt__sel" id="colorSel"></span></legend><div class="opt__list" id="colorList">
                ${colors.map(c => `<button type="button" class="opt__swatch" data-color="${U.esc(c)}" aria-pressed="false" aria-label="Color ${U.esc(c)}" title="${U.esc(c)}"><span style="background:${U.esc(C.colorHex(p, c))}"></span></button>`).join('')}</div></fieldset>` : ''}
              <p class="buy__stock" id="stockInfo" aria-live="polite"></p>
              <div class="buy__row">
                <div class="field field--inline"><span class="sub-label" id="qtyLbl">Cantidad</span>${ui.qtyStepper('qty', 1, 1, p.name)}</div>
                <button type="submit" class="btn btn--primary btn--lg buy__add" id="addBtn">${I('bag', { size: 18 })}Agregar al carrito</button>
                ${ui.favButton(p, 'fav-btn--lg')}
              </div>
              <p class="buy__msg" id="buyMsg" role="alert"></p>
            </form>
            <div class="pdp__help">
              <p>${I('cash', { size: 18 })}<span>Pagás en <strong>efectivo</strong> o por <strong>transferencia bancaria</strong>. El pago se verifica manualmente.</span></p>
              <p>${I('truck', { size: 18 })}<span>La entrega se <strong>coordina con vos</strong> después de confirmar el pedido.</span></p>
            </div>
          </div>
        </div>
        ${rel.length ? `<section class="section section--flush"><div class="section__head"><div><h2>También te puede interesar</h2></div></div>${ui.grid(rel)}</section>` : ''}
      </div>`;

    function mount(el) {
      let size = null, color = null;
      const qtyInput = el.querySelector('.qty__input');
      const addBtn = el.querySelector('#addBtn');
      const info = el.querySelector('#stockInfo');
      const msg = el.querySelector('#buyMsg');
      const avail = v => C.isAvailable(p, v);

      // Si hay una sola opción posible, se selecciona sola.
      if (sizes.length === 1) size = sizes[0];
      if (colors.length === 1) color = colors[0];

      function selected() {
        if (sizes.length && !size) return null;
        if (colors.length && !color) return null;
        return C.findVariant(p, size, color);
      }

      function update() {
        // Talles: deshabilitados si no hay ninguna variante disponible con ese talle.
        U.qsa('[data-size]', el).forEach(b => {
          const sz = b.dataset.size;
          const ok = p.variants.some(v => v.size === sz && avail(v));
          b.disabled = !ok; b.classList.toggle('is-out', !ok);
          b.setAttribute('aria-pressed', sz === size);
          b.setAttribute('aria-label', `Talle ${sz}${ok ? '' : ', sin stock'}`);
        });
        // Colores: deshabilitados si no hay stock para el talle elegido.
        U.qsa('[data-color]', el).forEach(b => {
          const c = b.dataset.color;
          const ok = p.variants.some(v => v.color === c && (!size || v.size === size) && avail(v));
          b.disabled = !ok; b.classList.toggle('is-out', !ok);
          b.setAttribute('aria-pressed', c === color);
          b.setAttribute('aria-label', `Color ${c}${ok ? '' : size ? ', sin stock en talle ' + size : ', sin stock'}`);
        });
        const ss = el.querySelector('#sizeSel'); if (ss) ss.textContent = size ? ': ' + size : '';
        const cs = el.querySelector('#colorSel'); if (cs) cs.textContent = color ? ': ' + color : '';

        const v = selected();
        let max = 0;
        if (!v) {
          info.className = 'buy__stock';
          info.textContent = (sizes.length && !size && colors.length && !color) ? 'Elegí talle y color.' : (sizes.length && !size) ? 'Elegí un talle.' : 'Elegí un color.';
          if (!p.variants.some(avail)) { info.textContent = 'Este producto no tiene stock en este momento.'; info.className = 'buy__stock is-out'; }
        } else if (!avail(v)) {
          info.className = 'buy__stock is-out'; info.textContent = 'Esta combinación no tiene stock.';
        } else {
          const inCart = JP.cart.qtyInCart(v.id);
          max = C.availableQty(p, v) - inCart;
          // Solo se avisa cuando quedan pocas unidades (menos que el umbral, por defecto 3).
          if (!isPedido && v.stock < C.lowThreshold()) { info.className = 'buy__stock is-low'; info.textContent = `¡Últimas unidades! Queda${v.stock === 1 ? '' : 'n'} ${v.stock}.`; }
          else { info.className = 'buy__stock'; info.textContent = ''; }
          if (max <= 0) { info.className = 'buy__stock is-low'; info.textContent = 'Ya agregaste al carrito todas las unidades disponibles de esta variante.'; }
        }
        qtyInput.max = Math.max(1, max);
        if (Number(qtyInput.value) > max && max > 0) qtyInput.value = max;
        if (!qtyInput.value || Number(qtyInput.value) < 1) qtyInput.value = 1;
        addBtn.disabled = !!v && max <= 0 || !p.variants.some(avail);
      }

      el.addEventListener('click', e => {
        const sb = e.target.closest('[data-size]');
        if (sb && !sb.disabled) {
          size = size === sb.dataset.size && sizes.length > 1 ? null : sb.dataset.size;
          if (color && !p.variants.some(v => v.color === color && (!size || v.size === size) && avail(v))) color = colors.length === 1 ? colors[0] : null;
          msg.textContent = ''; update();
        }
        const cb = e.target.closest('[data-color]');
        if (cb && !cb.disabled) {
          color = color === cb.dataset.color && colors.length > 1 ? null : cb.dataset.color;
          msg.textContent = ''; update();
        }
        const th = e.target.closest('[data-img]');
        if (th) {
          const i = Number(th.dataset.img);
          const main = el.querySelector('#mainImg');
          main.src = imgs[i].src; main.alt = imgs[i].alt; main.dataset.fallback = imgs[i].fallback;
          U.qsa('[data-img]', el).forEach((t, j) => { t.classList.toggle('is-active', i === j); if (i === j) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
        }
      });

      el.querySelector('#buyForm').addEventListener('submit', e => {
        e.preventDefault();
        if (!JP.auth.current()) return ui.loginPrompt('cart');
        const v = selected();
        if (!v) { msg.textContent = sizes.length && !size ? 'Elegí un talle antes de agregar al carrito.' : 'Elegí un color antes de agregar al carrito.'; return; }
        const r = JP.cart.add(p.id, v.id, qtyInput.value);
        if (!r.ok) { msg.textContent = r.error; return; }
        msg.textContent = '';
        ui.toast(`${p.name} (${C.variantLabel(v.size, v.color)}) se agregó al carrito.`);
        qtyInput.value = 1;
        update();
      });
      update();
    }
    return { title: p.name, html, mount };
  };

  /* =======================================================
     FAVORITOS
     ======================================================= */
  V.favorites = function () {
    const list = JP.favorites.products();
    const u = JP.auth.current();
    const html = `<div class="container page">
      ${crumbs([['Inicio', '#/'], ['Favoritos']])}
      <div class="page__head"><h1>Favoritos</h1>${u ? '<p class="muted">Los productos que guardaste con el corazón.</p>' : ''}</div>
      ${!u ? ui.empty({ icon: 'heart', title: 'Iniciá sesión para ver tus favoritos', text: 'Con tu cuenta podés guardar los productos que te gustan.', action: { href: '#/ingresar?volver=%2Ffavoritos', label: 'Iniciar sesión' } })
        : list.length ? ui.grid(list) : ui.empty({ icon: 'heart', title: 'Todavía no guardaste favoritos', text: 'Tocá el corazón de un producto para guardarlo y verlo después.', action: { href: '#/catalogo', label: 'Explorar productos' } })}
    </div>`;
    return { title: 'Favoritos', html, refreshOn: ['fav:change'] };
  };

  /* =======================================================
     CARRITO
     ======================================================= */
  V.cart = function () {
    const s = JP.cart.summary();
    if (!JP.auth.current()) return {
      title: 'Carrito',
      html: `<div class="container page">${crumbs([['Inicio', '#/'], ['Carrito']])}<div class="page__head"><h1>Carrito</h1></div>
        ${ui.empty({ icon: 'bag', title: 'Iniciá sesión para usar el carrito', text: 'Con tu cuenta guardamos los productos que elegís y podés hacer tu pedido.', action: { href: '#/ingresar?volver=%2Fcarrito', label: 'Iniciar sesión' } })}
        <p class="center muted small">¿No tenés cuenta? <a href="#/registro?volver=%2Fcarrito">Registrate</a></p></div>`
    };
    if (!s.lines.length) return {
      title: 'Carrito', refreshOn: ['cart:change'],
      html: `<div class="container page">${crumbs([['Inicio', '#/'], ['Carrito']])}<div class="page__head"><h1>Carrito</h1></div>
        ${ui.empty({ icon: 'bag', title: 'Tu carrito está vacío', text: 'Agregá productos desde el catálogo para armar tu pedido.', action: { href: '#/catalogo', label: 'Ir al catálogo' } })}</div>`
    };
    const html = `<div class="container page">
      ${crumbs([['Inicio', '#/'], ['Carrito']])}
      ${steps(1)}
      <div class="page__head"><h1>Carrito</h1><p class="muted">${JP.cart.count()} unidad${JP.cart.count() === 1 ? '' : 'es'}</p></div>
      <div class="cart">
        <ul class="cart__lines">${s.lines.map(l => line(l)).join('')}</ul>
        <aside class="summary" aria-label="Resumen del pedido">
          <h2>Resumen</h2>
          <dl>
            <div><dt>Subtotal</dt><dd>${U.money(s.total)}</dd></div>
            <div><dt>Entrega</dt><dd>A coordinar</dd></div>
            <div class="summary__total"><dt>Total</dt><dd>${U.money(s.total)}</dd></div>
            ${s.deposit ? `<div class="summary__dep"><dt>Seña (${s.deposit.percent}% de productos por pedido)</dt><dd>${U.money(s.deposit.amount)}</dd></div><div><dt>Saldo al entregar</dt><dd>${U.money(s.deposit.balance)}</dd></div>` : ''}
          </dl>
          ${s.hasProblems ? `<p class="notice notice--warn">${I('alert', { size: 18 })}<span>Hay productos con problemas de disponibilidad. Corregilos para continuar.</span></p>` : ''}
          ${JP.auth.current() ? `<a class="btn btn--primary btn--block btn--lg ${s.hasProblems ? 'is-disabled' : ''}" href="#/checkout" ${s.hasProblems ? 'aria-disabled="true" data-blocked' : ''}>Continuar con el pedido ${I('arrowRight', { size: 18 })}</a>`
            : `<a class="btn btn--primary btn--block btn--lg ${s.hasProblems ? 'is-disabled' : ''}" href="#/ingresar?volver=%2Fcheckout" ${s.hasProblems ? 'aria-disabled="true" data-blocked' : ''}>${I('user', { size: 18 })}Ingresá para comprar</a>
               <p class="summary__note">${I('lock', { size: 16 })}Para hacer un pedido necesitás iniciar sesión. ¿No tenés cuenta? <a href="#/registro?volver=%2Fcheckout">Creala acá</a>.</p>`}
          <a class="btn btn--ghost btn--block" href="#/catalogo">Seguir comprando</a>
          <p class="summary__note">${I('info', { size: 16 })}Pagás en efectivo o por transferencia. No se cobra nada en línea.</p>
        </aside>
      </div></div>`;

    function line(l) {
      const p = l.product;
      if (!p) return `<li class="cline cline--problem"><div class="cline__info"><p class="cline__name">Producto no disponible</p><p class="field-error">${I('alert', { size: 14 })}${U.esc(l.problem)}</p></div>
        <button type="button" class="icon-btn" data-remove="${U.esc(l.variantId)}" aria-label="Quitar del carrito">${I('trash')}</button></li>`;
      return `<li class="cline${l.problem ? ' cline--problem' : ''}" data-line="${U.esc(l.variantId)}">
        <a class="cline__img" href="#/producto/${p.id}">${ui.img(p, '', Math.max(0, C.colors(p).indexOf(l.variant ? l.variant.color : null)))}</a>
        <div class="cline__info">
          <a class="cline__name" href="#/producto/${p.id}">${U.esc(p.name)}</a>
          <p class="cline__var">${U.esc(C.variantLabel(l.variant && l.variant.size, l.variant && l.variant.color))}${p.saleType === 'pedido' ? ' · <span class="badge badge--outline">Por pedido</span>' : ''}</p>
          <p class="cline__unit">${U.money(l.unitPrice)} c/u</p>
          ${l.problem ? `<p class="field-error">${I('alert', { size: 14 })}${U.esc(l.problem)}</p>` : ''}
        </div>
        <div class="cline__qty">${ui.qtyStepper('q-' + l.variantId, l.qty, Math.max(l.max, 1), p.name)}</div>
        <p class="cline__sub"><span class="sr-only">Subtotal: </span>${U.money(l.subtotal)}</p>
        <button type="button" class="icon-btn cline__rm" data-remove="${U.esc(l.variantId)}" aria-label="Quitar ${U.esc(p.name)} del carrito">${I('trash')}</button>
      </li>`;
    }

    function mount(el) {
      el.addEventListener('click', async e => {
        const rm = e.target.closest('[data-remove]');
        if (rm) {
          const r = JP.cart.remove(rm.dataset.remove);
          if (r.ok) ui.toast('Producto quitado del carrito.', 'info'); else ui.toast(r.error, 'error');
        }
        if (e.target.closest('[data-blocked]')) { e.preventDefault(); ui.toast('Corregí los productos marcados antes de continuar.', 'error'); }
      });
      el.addEventListener('qty:change', e => {
        const li = e.target.closest('[data-line]'); if (!li) return;
        const r = JP.cart.setQty(li.dataset.line, e.detail.value);
        if (!r.ok) { ui.toast(r.error, 'error'); JP.router.refresh(); }
      });
    }
    return { title: 'Carrito', html, mount, refreshOn: ['cart:change'] };
  };

  function steps(current) {
    const list = ['Carrito', 'Tus datos', 'Pago', 'Confirmación'];
    return `<ol class="steps" aria-label="Pasos de la compra">${list.map((s, i) => {
      const n = i + 1;
      const st = n < current ? 'done' : n === current ? 'current' : 'todo';
      return `<li class="steps__item steps__item--${st}" ${st === 'current' ? 'aria-current="step"' : ''}><span class="steps__n">${st === 'done' ? I('check', { size: 14 }) : n}</span><span>${s}</span></li>`;
    }).join('')}</ol>`;
  }

  /* ---------- Piezas compartidas de compra ---------- */
  /** Enlace de WhatsApp del negocio (número configurable en Ajustes). */
  function waLink(text, label, cls) {
    const num = String(settings().whatsapp || '').replace(/\D/g, '');
    const icon = I('whatsapp', { size: 18 });
    if (!num) return `<button type="button" class="btn ${cls || 'btn--wa'}" data-action="wa-missing">${icon}${U.esc(label || 'WhatsApp')}</button>`;
    return `<a class="btn ${cls || 'btn--wa'}" href="https://wa.me/${num}?text=${encodeURIComponent(text || 'Hola JERPRI')}" target="_blank" rel="noopener noreferrer">${icon}${U.esc(label || 'WhatsApp')}<span class="sr-only"> (se abre en una pestaña nueva)</span></a>`;
  }

  /** Datos para transferir, editables por la administración (Ajustes → Pagos). */
  function bankBox() {
    const t = settings().transfer || {};
    if (!t.alias && !t.cbu) return `<p class="small muted">${I('whatsapp', { size: 16 })} Te enviamos los datos para transferir por WhatsApp.</p>`;
    const row = (label, value) => `<div class="bank__row"><dt>${label}</dt><dd><span>${value ? U.esc(value) : '<span class="muted">Sin cargar</span>'}</span>${value ? `<button type="button" class="bank__copy" data-copy="${U.esc(value)}" aria-label="Copiar ${label}">${I('copy', { size: 15 })}Copiar</button>` : ''}</dd></div>`;
    return `<dl class="bank">${row('Alias', t.alias)}${row('CBU', t.cbu)}${row('Titular', t.holder)}${t.bankName ? row('Banco', t.bankName) : ''}</dl>
      ${t.note ? `<p class="small muted">${U.esc(t.note)}</p>` : ''}`;
  }

  /** Campos de dirección. `prefix` arma los nombres (por ejemplo "address." en la compra). */
  function addressFields(prefix, a, idp) {
    const v = a || {};
    const n = k => prefix + k;
    const id = k => (idp || 'a') + '-' + k;
    return `<div class="addr">
      <div class="field"><label for="${id('province')}">Provincia <span class="req" aria-hidden="true">*</span></label>
        <select id="${id('province')}" name="${n('province')}" autocomplete="address-level1"><option value="">Elegí una provincia</option>${U.PROVINCES.map(p => `<option ${v.province === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      <div class="row-2">
        <div class="field"><label for="${id('city')}">Ciudad o localidad <span class="req" aria-hidden="true">*</span></label><input id="${id('city')}" name="${n('city')}" autocomplete="address-level2" value="${U.esc(v.city || '')}"></div>
        <div class="field"><label for="${id('zip')}">Código postal <span class="req" aria-hidden="true">*</span></label><input id="${id('zip')}" name="${n('zip')}" autocomplete="postal-code" inputmode="text" maxlength="8" placeholder="Ej.: 4400" value="${U.esc(v.zip || '')}"></div>
      </div>
      <div class="row-addr">
        <div class="field"><label for="${id('street')}">Calle <span class="req" aria-hidden="true">*</span></label><input id="${id('street')}" name="${n('street')}" autocomplete="address-line1" value="${U.esc(v.street || '')}"></div>
        <div class="field"><label for="${id('number')}">Número <span class="req" aria-hidden="true">*</span></label><input id="${id('number')}" name="${n('number')}" inputmode="numeric" maxlength="7" placeholder="Ej.: 1250" value="${U.esc(v.number || '')}"></div>
        <div class="field"><label for="${id('apt')}">Piso / depto <span class="muted">(opcional)</span></label><input id="${id('apt')}" name="${n('apt')}" maxlength="20" value="${U.esc(v.apt || '')}"></div>
      </div>
    </div>`;
  }
  /** Lee los campos de dirección de un formulario. */
  function readAddress(form, prefix) {
    const g = k => { const f = form.querySelector(`[name="${prefix + k}"]`); return f ? f.value : ''; };
    return { province: g('province'), city: g('city'), zip: g('zip'), street: g('street'), number: g('number'), apt: g('apt') };
  }
  V._addressFields = addressFields; V._readAddress = readAddress;

  /* =======================================================
     CHECKOUT (pasos 2 a 4) · requiere sesión iniciada
     ======================================================= */
  V.checkout = function () {
    const draftPeek = JP.storage.session.get('checkout', null);
    const sum = JP.cart.summary(draftPeek && draftPeek.data ? draftPeek.data.deliveryOptionId : null);
    if (!sum.lines.length) return { redirect: '/carrito' };
    if (sum.hasProblems) { ui.toast('Revisá tu carrito: hay productos con problemas de disponibilidad.', 'error'); return { redirect: '/carrito' }; }

    const SS = JP.storage.session;
    const u = JP.auth.current();
    const s = settings();
    const options = (s.deliveryOptions || []).filter(o => o.active);
    const saved = u.addresses || [];
    const def = saved.find(a => a.isDefault) || saved[0];
    const draft = SS.get('checkout', null) || { step: 2, data: {
      name: u.name, phone: u.phone || '', email: u.email, deliveryOptionId: options[0] ? options[0].id : '',
      addressId: def ? def.id : 'nueva', address: {}, saveAddress: true, notes: '', paymentMethod: '' } };
    const step = Math.min(3, Math.max(2, draft.step));   // 2 = tus datos · 3 = pago y confirmación
    const d = draft.data;
    d.address = d.address || {};
    const opt = options.find(o => o.id === d.deliveryOptionId);
    const isStep2Field = k => ['name', 'phone', 'deliveryOptionId'].includes(k) || k.startsWith('address.');

    const savedList = saved.length ? `<div class="addr-pick" role="radiogroup" aria-label="Direcciones guardadas">
        ${saved.map(a => `<label class="choice"><input type="radio" name="addressId" value="${a.id}" ${d.addressId === a.id ? 'checked' : ''}><span class="choice__body"><strong>${U.esc(a.street + ' ' + a.number)}${a.isDefault ? ' <span class="badge badge--outline">Principal</span>' : ''}</strong><span>${U.esc(U.addressLine(a))}</span></span></label>`).join('')}
        <label class="choice"><input type="radio" name="addressId" value="nueva" ${d.addressId === 'nueva' ? 'checked' : ''}><span class="choice__body"><strong>${I('plus', { size: 16 })} Usar otra dirección</strong></span></label>
      </div>` : '';

    const stepData = `
      <form class="card form" id="stepForm" novalidate>
        <h2>Tus datos</h2>
        <div class="row-2">
          <div class="field"><label for="c-name">Nombre y apellido <span class="req" aria-hidden="true">*</span></label><input id="c-name" name="name" autocomplete="name" value="${U.esc(d.name)}"></div>
          <div class="field"><label for="c-phone">Número de teléfono <span class="req" aria-hidden="true">*</span></label><input id="c-phone" name="phone" type="tel" autocomplete="tel" placeholder="Ej.: 387 4123456" value="${U.esc(d.phone)}"><p class="field-hint">Con código de área. Te escribimos por WhatsApp.</p></div>
        </div>
        <fieldset class="field" data-error-for="deliveryOptionId"><legend>Modalidad de entrega <span class="req" aria-hidden="true">*</span></legend>
          <div class="choice-row">${options.length ? options.map(o => `<label class="choice"><input type="radio" name="deliveryOptionId" value="${o.id}" ${d.deliveryOptionId === o.id ? 'checked' : ''}><span class="choice__icon">${I(o.requiresAddress ? 'truck' : 'store')}</span><span class="choice__body"><strong>${U.esc(o.name)}</strong><span>${U.esc(o.description || '')}</span></span></label>`).join('')
            : '<p class="notice notice--warn">No hay modalidades de entrega habilitadas. La administración debe configurarlas.</p>'}</div>
        </fieldset>
        <div id="addrBlock" ${opt && opt.requiresAddress ? '' : 'hidden'}>
          <h3 class="form__sub">Dirección de envío</h3>
          ${savedList}
          <div id="newAddr" ${saved.length && d.addressId !== 'nueva' ? 'hidden' : ''}>
            ${addressFields('address.', d.address, 'c')}
            <label class="check"><input type="checkbox" name="saveAddress" ${d.saveAddress ? 'checked' : ''}> Guardar esta dirección en mi cuenta</label>
          </div>
        </div>
        <p class="notice" id="pickupNote" ${opt && !opt.requiresAddress ? '' : 'hidden'}>${I('store', { size: 18 })}<span>Coordinamos el lugar y el horario de retiro por WhatsApp.</span></p>
        <div class="field"><label for="c-notes">Observaciones <span class="muted">(opcional)</span></label><textarea id="c-notes" name="notes" rows="2" maxlength="300">${U.esc(d.notes)}</textarea></div>
        <div class="form__actions"><a class="btn btn--ghost" href="#/carrito">${I('arrowLeft', { size: 16 })}Volver al carrito</a><button class="btn btn--primary" type="submit">Continuar al pago ${I('arrowRight', { size: 16 })}</button></div>
      </form>`;

    const stepPay = `
      <form class="card form" id="stepForm" novalidate>
        <h2>Medio de pago</h2>
        <p class="muted">No se realiza ningún cobro en línea.</p>
        <fieldset class="field" data-error-for="paymentMethod"><legend class="sr-only">Medio de pago</legend>
          <label class="choice"><input type="radio" name="paymentMethod" value="efectivo" ${d.paymentMethod === 'efectivo' ? 'checked' : ''}><span class="choice__icon">${I('cash')}</span><span class="choice__body"><strong>Efectivo</strong><span>Pagás al recibir o al retirar tu pedido.</span></span></label>
          <label class="choice"><input type="radio" name="paymentMethod" value="transferencia" ${d.paymentMethod === 'transferencia' ? 'checked' : ''}><span class="choice__icon">${I('transfer')}</span><span class="choice__body"><strong>Transferencia bancaria</strong><span>Transferí a la cuenta de JERPRI y avisanos desde tu pedido.</span></span></label>
        </fieldset>
        <div class="bank-wrap" id="bankWrap" ${d.paymentMethod === 'transferencia' ? '' : 'hidden'}>
          <h3 class="form__sub">Datos para transferir</h3>
          ${bankBox()}
        </div>
        <p class="notice">${I('info', { size: 18 })}<span>El pago se confirma <strong>manualmente</strong> cuando lo recibimos.</span></p>
        <div class="form__actions"><button type="button" class="btn btn--ghost" data-back>${I('arrowLeft', { size: 16 })}Volver</button><button class="btn btn--primary btn--lg" type="submit" id="confirmOrder">${I('check', { size: 18 })}Confirmar pedido</button></div>
      </form>`;

    const html = `<div class="container page">
      ${crumbs([['Inicio', '#/'], ['Carrito', '#/carrito'], ['Finalizar pedido']])}
      ${steps(step)}
      <h1 class="sr-only">Finalizar pedido</h1>
      <div class="checkout">
        <div>${step === 2 ? stepData : stepPay}</div>
        <aside class="summary" aria-label="Resumen del pedido"><h2>Tu pedido</h2>
          <ul class="mini">${sum.lines.map(l => `<li>${ui.img(l.product, 'mini__img')}<span>${U.esc(l.product.name)}<small>${U.esc(C.variantLabel(l.variant.size, l.variant.color))} · ${l.qty} u.</small></span><strong>${U.money(l.subtotal)}</strong></li>`).join('')}</ul>
          <dl><div class="summary__total"><dt>Total</dt><dd>${U.money(sum.total)}</dd></div>
          ${sum.deposit ? `<div class="summary__dep"><dt>Seña (${sum.deposit.percent}%)</dt><dd>${U.money(sum.deposit.amount)}</dd></div><div><dt>Saldo</dt><dd>${U.money(sum.deposit.balance)}</dd></div>` : ''}</dl>
        </aside>
      </div></div>`;

    function save(next) { SS.set('checkout', { step: next != null ? next : draft.step, data: d }); }
    function read(form) {
      const f = ui.formData(form);
      ['name', 'phone', 'deliveryOptionId', 'addressId', 'notes', 'paymentMethod'].forEach(k => { if (k in f) d[k] = f[k]; });
      if (form.querySelector('[name="saveAddress"]')) d.saveAddress = !!f.saveAddress;
      if (form.querySelector('[name="address.street"]')) d.address = readAddress(form, 'address.');
    }

    function mount(el) {
      const form = el.querySelector('#stepForm');
      const back = el.querySelector('[data-back]');
      if (back) back.addEventListener('click', () => { save(step - 1); JP.router.refresh(); });
      if (form) {
        const sync = () => {
          const o = options.find(x => x.id === d.deliveryOptionId);
          const ab = form.querySelector('#addrBlock'); if (ab) ab.hidden = !(o && o.requiresAddress);
          const pn = form.querySelector('#pickupNote'); if (pn) pn.hidden = !(o && !o.requiresAddress);
          const na = form.querySelector('#newAddr'); if (na) na.hidden = !!saved.length && d.addressId !== 'nueva';
          const bw = form.querySelector('#bankWrap'); if (bw) bw.hidden = d.paymentMethod !== 'transferencia';
        };
        form.addEventListener('input', () => { read(form); save(); });
        form.addEventListener('change', () => { read(form); save(); sync(); });
        form.addEventListener('submit', e => {
          e.preventDefault();
          read(form);
          const { errors } = JP.orders.validateCheckout(d);
          const mine = {};
          Object.keys(errors).forEach(k => { if (step === 2 ? isStep2Field(k) : k === 'paymentMethod') mine[k] = errors[k]; });
          if (Object.keys(mine).length) { ui.showErrors(form, mine, 'Revisá los campos marcados.'); return; }
          if (step === 2) { save(3); JP.router.refresh(); window.scrollTo({ top: 0 }); return; }
          confirmOrder(form.querySelector('#confirmOrder'));
        });
      }
      // Paso de pago: "Confirmar pedido" registra el pedido directamente.
      const confirmOrder = btn => ui.busy(btn, async () => {
        await new Promise(r => setTimeout(r, 350)); // pausa breve para mostrar el estado de carga
        const r = await JP.orders.create(d);
        if (!r.ok) {
          if (r.errors && Object.keys(r.errors).length) {
            save(Object.keys(r.errors).some(isStep2Field) ? 2 : 3); JP.router.refresh();
          }
          ui.toast(r.error || 'Revisá tus datos.', 'error');
          return;
        }
        SS.remove('checkout');
        JP.router.go('/pedido/' + r.data.id + '?nuevo=1');
      });
    }
    return { title: 'Finalizar pedido', html, mount };
  };

  /* =======================================================
     DETALLE DE PEDIDO (cliente)
     ======================================================= */
  V.order = function (ctx) {
    const o = JP.orders.get(ctx.params.id);
    if (!o || !JP.orders.canView(o)) return V.notFound({ title: 'No podemos mostrar este pedido', message: 'Ingresá con la cuenta con la que hiciste el pedido para verlo.', action: { href: '#/mis-pedidos', label: 'Ir a Mis pedidos' } });
    const isNew = ctx.query.nuevo === '1';
    const cancelled = o.status === 'cancelado';
    const isTransfer = o.payment.method === 'transferencia';
    const transferBlock = !cancelled && isTransfer ? (o.payment.status === 'pendiente'
      ? `<section class="card transfer">
          <h2>${I('transfer', { size: 20 })} ¿Ya hiciste tu transferencia?</h2>
          <div class="row-btns">
            <button type="button" class="btn btn--primary" id="informPay">${I('check', { size: 18 })}Ya transferí</button>
            <button type="button" class="btn btn--ghost" id="notYet" aria-expanded="false" aria-controls="payData">Aún no he transferido</button>
          </div>
          <div class="transfer__data" id="payData" hidden>
            <p class="transfer__amount">Monto a pagar: <strong>${U.money(o.deposit ? o.deposit.amount : o.total)}</strong>${o.deposit ? ' <span class="muted">(seña)</span>' : ''}</p>
            ${bankBox()}
            <p class="muted small">Cuando hagas la transferencia, tocá "Ya transferí".</p>
          </div>
        </section>`
      : o.payment.status === 'informado'
        ? `<p class="notice">${I('clock', { size: 18 })}<span>Nos avisaste que transferiste. El pago está <strong>a confirmar</strong> hasta que lo recibamos.</span></p>` : '') : '';

    const html = `<div class="container page page--narrow">
      ${isNew ? steps(5) : crumbs([['Inicio', '#/'], ['Mis pedidos', '#/mis-pedidos'], ['Pedido ' + o.id]])}
      ${isNew ? `<div class="success">
        <span class="success__icon">${I('check', { size: 34, stroke: 2 })}</span>
        <h1>¡Recibimos tu pedido!</h1>
        <p>Tu número de pedido es <strong class="order-no">${o.id}</strong>.</p>
        <p class="muted">Te vamos a escribir por WhatsApp para coordinar ${o.delivery.optionId === 'retiro' ? 'el retiro' : 'el envío'}.</p>
      </div>` : `<div class="page__head"><h1>Pedido <span class="order-no">${o.id}</span></h1><p class="muted">Realizado el ${U.fmtDateTime(o.createdAt)}</p></div>`}
      ${!isNew && o.notice ? `<p class="notice notice--news">${I('bell', { size: 18 })}<span><strong>${U.esc(o.notice)}</strong>${o.staffUpdatedAt ? `<small> · ${U.fmtDateTime(o.staffUpdatedAt)}</small>` : ''}</span></p>` : ''}
      <div class="status-grid">
        <div class="status-card"><p>Pedido</p>${ui.statusBadge('order', o.status)}</div>
        <div class="status-card"><p>Pago · ${U.esc(JP.orders.PAYMENT_METHOD[o.payment.method])}</p>${ui.statusBadge('payment', o.payment.status)}</div>
        <div class="status-card"><p>Entrega · ${U.esc(o.delivery.optionName)}</p>${ui.statusBadge('delivery', o.delivery.status)}</div>
      </div>
      <div class="card">
        <h2>Productos</h2>
        <table class="table"><thead><tr><th scope="col">Producto</th><th scope="col">Cant.</th><th scope="col">Precio</th><th scope="col">Subtotal</th></tr></thead><tbody>
        ${o.items.map(i => `<tr><td>${U.esc(i.name)}<br><small class="muted">${U.esc(C.variantLabel(i.size, i.color))}${i.saleType === 'pedido' ? ' · Por pedido' : ''}</small></td><td>${i.qty}</td><td>${U.money(i.unitPrice)}</td><td>${U.money(i.unitPrice * i.qty)}</td></tr>`).join('')}
        </tbody><tfoot><tr><th scope="row" colspan="3">Total</th><td><strong>${U.money(o.total)}</strong></td></tr>
        ${o.deposit ? `<tr><th scope="row" colspan="3">Seña (${o.deposit.percent}%)</th><td>${U.money(o.deposit.amount)}</td></tr><tr><th scope="row" colspan="3">Saldo</th><td>${U.money(o.deposit.balance)}</td></tr>` : ''}</tfoot></table>
      </div>
      ${transferBlock}
      <div class="form__actions"><a class="btn btn--ghost" href="#/catalogo">Seguir comprando</a><a class="btn btn--ghost" href="#/mis-pedidos">Ver mis pedidos</a></div>
    </div>`;
    function mount(el) {
      const ny = el.querySelector('#notYet');
      if (ny) ny.addEventListener('click', () => {
        const box = el.querySelector('#payData');
        box.hidden = !box.hidden;
        ny.setAttribute('aria-expanded', String(!box.hidden));
        if (!box.hidden) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      const b = el.querySelector('#informPay');
      if (b) b.addEventListener('click', async () => {
        const ok = await ui.confirm({ title: 'Avisar transferencia', message: 'Vamos a avisar a JERPRI que hiciste la transferencia. El pago queda "a confirmar" hasta que lo recibamos.', confirmText: 'Sí, ya transferí' });
        if (!ok) return;
        const r = await JP.orders.informPayment(o.id);
        if (r.ok) { ui.toast('¡Gracias! Avisamos que hiciste la transferencia.'); JP.router.refresh(); } else ui.toast(r.error, 'error');
      });
    }
    return { title: 'Pedido ' + o.id, html, mount };
  };

  /* =======================================================
     MIS PEDIDOS (requiere sesión)
     ======================================================= */
  V.myOrders = function () {
    const u = JP.auth.current();
    const list = JP.orders.forUser(u.id);
    // Pedidos con novedades sin ver (se marcan como vistas al entrar, pero se destacan esta vez)
    const nuevos = new Set(JP.orders.customerUpdates().map(o => o.id));
    const html = `<div class="container page">
      ${crumbs([['Inicio', '#/'], ['Mis pedidos']])}
      <div class="page__head"><h1>Mis pedidos</h1><p class="muted">${list.length ? `${list.length} pedido${list.length === 1 ? '' : 's'} hecho${list.length === 1 ? '' : 's'} con tu cuenta.` : 'Acá vas a ver los pedidos que hagas con tu cuenta.'}</p></div>
      ${nuevos.size ? `<p class="notice notice--news">${I('bell', { size: 18 })}<span>Tenés <strong>${nuevos.size} novedad${nuevos.size === 1 ? '' : 'es'}</strong> en tus pedidos.</span></p>` : ''}
      ${list.length ? `<div class="orders">${list.map(o => `<a class="ocard${nuevos.has(o.id) ? ' ocard--new' : ''}" href="#/pedido/${o.id}">
          <div class="ocard__top"><strong class="order-no">${o.id}</strong>${nuevos.has(o.id) ? '<span class="ocard__new">Novedad</span>' : ''}<span class="muted small">${U.fmtDate(o.createdAt)}</span></div>
          ${nuevos.has(o.id) && o.notice ? `<p class="ocard__notice">${I('bell', { size: 16 })}${U.esc(o.notice)}</p>` : ''}
          <p class="ocard__items">${o.items.map(i => U.esc(i.qty + ' × ' + i.name)).join(' · ')}</p>
          <div class="ocard__bottom"><span class="price">${U.money(o.total)}</span><span class="ocard__badges">${ui.statusBadge('order', o.status)}${ui.statusBadge('payment', o.payment.status)}</span></div>
        </a>`).join('')}</div>`
        : ui.empty({ icon: 'receipt', title: 'Todavía no hiciste pedidos', text: 'Cuando confirmes una compra, la vas a ver acá.', action: { href: '#/catalogo', label: 'Ver productos' } })}
    </div>`;
    return { title: 'Mis pedidos', html, mount: () => { if (nuevos.size) JP.orders.markSeen('novedades'); } };
  };

  /* =======================================================
     INGRESAR / REGISTRARSE / CUENTA
     ======================================================= */
  V.login = function (ctx) {
    // Destino seguro después de ingresar: solo rutas internas y el panel solo para el personal (administración y empleados).
    const staff = user => user.role === 'admin' || user.role === 'empleado';
    const target = user => {
      const v = ctx.query.volver;
      if (!v || !v.startsWith('/') || v.startsWith('//')) return staff(user) ? JP.auth.panelHome() : '/cuenta';
      if (v.startsWith('/admin') && !staff(user)) return '/cuenta';
      return v;
    };
    if (JP.auth.current()) return { redirect: target(JP.auth.current()) };
    const html = `<div class="container page page--auth">
      <div class="auth auth--single">
        <form class="card form" id="loginForm" novalidate>
          <h1>Ingresar</h1>
          ${(ctx.query.volver || '') === '/checkout' ? `<p class="notice">${I('bag', { size: 18 })}<span>Para finalizar tu compra, ingresá con tu cuenta o <a href="#/registro?volver=%2Fcheckout">creá una</a>. Tu carrito se mantiene.</span></p>` : ''}
          ${ctx.query.motivo === 'admin' ? `<p class="notice notice--warn">${I('lock', { size: 18 })}<span>Para entrar al panel de administración, ingresá con una cuenta autorizada.</span></p>` : ''}
          <div class="field"><label for="l-e">Correo electrónico</label><input id="l-e" name="email" type="email" autocomplete="username" required></div>
          <div class="field"><label for="l-p">Contraseña</label><div class="pw"><input id="l-p" name="password" type="password" autocomplete="current-password" required><button type="button" class="pw__toggle" data-pw aria-label="Mostrar contraseña" aria-pressed="false">${I('eye', { size: 18 })}</button></div>
            <p class="forgot"><a href="#/recuperar">¿Olvidaste tu contraseña?</a></p></div>
          <button class="btn btn--primary btn--block btn--lg" type="submit">Ingresar</button>
          <p class="auth__switch">¿No tenés cuenta? <a href="#/registro${ctx.query.volver ? '?volver=' + encodeURIComponent(ctx.query.volver) : ''}">Registrarte</a></p>
        </form>
      </div></div>`;
    function mount(el) {
      const f = el.querySelector('#loginForm');
      pwToggle(el);
      f.addEventListener('submit', e => {
        e.preventDefault();
        const btn = f.querySelector('button[type=submit]');
        ui.busy(btn, async () => {
          const r = await JP.auth.login(f.email.value, f.password.value);
          if (!r.ok) return ui.showErrors(f, {}, r.error);
          ui.toast('Hola, ' + r.user.name + '.');
          if (!staff(r.user) && (ctx.query.volver || '').startsWith('/admin')) ui.toast('Tu cuenta es de cliente: no tiene acceso al panel.', 'info');
          JP.router.go(target(r.user));
        });
      });
    }
    return { title: 'Ingresar', html, mount };
  };

  function pwToggle(el) {
    U.qsa('[data-pw]', el).forEach(b => b.addEventListener('click', () => {
      const inp = b.parentElement.querySelector('input');
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      b.setAttribute('aria-pressed', show);
      b.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
    }));
  }

  /* ---------- Recuperar contraseña: teléfono → código por SMS → contraseña nueva ---------- */
  V.recover = function () {
    if (JP.auth.current()) return { redirect: '/cuenta' };
    const STEPS = ['Teléfono', 'Código', 'Nueva contraseña'];
    const html = `<div class="container page page--auth"><div class="auth auth--single">
      <div class="card form rec" id="recCard">
        <h1>Recuperar contraseña</h1>
        <ol class="rec-steps" aria-label="Pasos">${STEPS.map((t, i) => `<li data-step-n="${i + 1}"><span class="rec-steps__n">${i + 1}</span><span class="rec-steps__t">${t}</span></li>`).join('')}</ol>
        <div id="recBody"></div>
        <p class="auth__switch"><a href="#/ingresar">${I('arrowLeft', { size: 14 })} Volver a ingresar</a></p>
      </div></div></div>`;

    function mount(el) {
      const body = el.querySelector('#recBody');
      const st = { phone: '', masked: '', token: '', timer: null };

      function setStep(n) {
        U.qsa('.rec-steps li', el).forEach(li => {
          const k = Number(li.dataset.stepN);
          li.classList.toggle('is-done', k < n); li.classList.toggle('is-current', k === n);
          if (k === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
        });
      }
      function stopTimer() { if (st.timer) { clearInterval(st.timer); st.timer = null; } }

      /* Paso 1: número de teléfono */
      function stepPhone() {
        stopTimer(); setStep(1);
        body.innerHTML = `<form id="recPhone" novalidate>
            <p class="muted small">Ingresá el número de teléfono de tu cuenta. Te vamos a mandar un <strong>SMS con un código</strong> para que puedas crear una contraseña nueva.</p>
            <div class="field"><label for="rc-t">Número de teléfono</label><input id="rc-t" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="Ej.: 387 4123456" value="${U.esc(st.phone)}" required><p class="field-hint">Con código de área, sin el 0 ni el 15.</p></div>
            <button class="btn btn--primary btn--block btn--lg" type="submit">${I('phone', { size: 18 })}Enviarme el código</button>
          </form>`;
        const f = body.querySelector('#recPhone');
        f.phone.focus();
        f.addEventListener('submit', e => {
          e.preventDefault();
          ui.busy(f.querySelector('button[type=submit]'), async () => {
            const r = await JP.auth.sendResetCode(f.phone.value);
            if (!r.ok) return ui.showErrors(f, r.errors || {}, r.error || 'Revisá el número.');
            st.phone = f.phone.value.trim(); st.masked = r.phoneMasked;
            ui.toast('Te enviamos el código por SMS.');
            stepCode(r);
          });
        });
      }

      /* Paso 2: código del SMS */
      function stepCode(sent) {
        setStep(2);
        body.innerHTML = `<form id="recCode" novalidate>
            <div class="rec-sent">${I('phone', { size: 22 })}<p>Te enviamos un SMS con un código de 6 números al <strong>${U.esc(st.masked)}</strong>.</p></div>
            <div class="field"><label for="rc-code">Código</label><input id="rc-code" name="code" class="code-input" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="••••••" required>
              <p class="field-hint">Vence en ${Math.round((sent.expiresIn || 600) / 60)} minutos.</p></div>
            <button class="btn btn--primary btn--block btn--lg" type="submit">Verificar código</button>
            <div class="rec-links">
              <button type="button" class="link-btn" id="recResend" disabled>Reenviar código</button>
              <button type="button" class="link-btn" id="recChange">Cambiar número</button>
            </div>
          </form>`;
        const f = body.querySelector('#recCode');
        const inp = f.code, resend = body.querySelector('#recResend');
        inp.focus();
        inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 6); });

        // Cuenta regresiva para poder pedir otro código
        let left = sent.resendIn || 60;
        const tick = () => {
          if (!resend.isConnected) return stopTimer();
          resend.disabled = left > 0;
          resend.textContent = left > 0 ? `Reenviar código (${left} s)` : 'Reenviar código';
          left -= 1;
          if (left < 0) stopTimer();
        };
        stopTimer(); tick(); st.timer = setInterval(tick, 1000);

        resend.addEventListener('click', () => ui.busy(resend, async () => {
          const r = await JP.auth.sendResetCode(st.phone);
          if (!r.ok) return ui.toast(r.error || 'No se pudo reenviar el código.', 'error');
          ui.toast('Te enviamos un código nuevo.');
          stepCode(r);
        }));
        body.querySelector('#recChange').addEventListener('click', stepPhone);
        f.addEventListener('submit', e => {
          e.preventDefault();
          ui.busy(f.querySelector('button[type=submit]'), async () => {
            const r = await JP.auth.verifyResetCode(st.phone, inp.value);
            if (!r.ok) {
              ui.showErrors(f, r.errors || {}, r.error || 'Revisá el código.');
              if (r.expired) { inp.value = ''; resend.disabled = false; resend.textContent = 'Pedir un código nuevo'; stopTimer(); }
              return;
            }
            st.token = r.token;
            stepPassword();
          });
        });
      }

      /* Paso 3: contraseña nueva */
      function stepPassword() {
        stopTimer(); setStep(3);
        body.innerHTML = `<form id="recPass" novalidate>
            <p class="notice notice--ok">${I('checkCircle', { size: 18 })}<span>¡Código correcto! Ahora elegí tu contraseña nueva.</span></p>
            <div class="field"><label for="rc-p">Contraseña nueva</label><div class="pw"><input id="rc-p" name="password" type="password" autocomplete="new-password" required><button type="button" class="pw__toggle" data-pw aria-label="Mostrar contraseña" aria-pressed="false">${I('eye', { size: 18 })}</button></div><p class="field-hint">Mínimo 8 caracteres, con letras y números.</p></div>
            <div class="field"><label for="rc-c">Repetir contraseña nueva</label><input id="rc-c" name="confirm" type="password" autocomplete="new-password" required></div>
            <button class="btn btn--primary btn--block btn--lg" type="submit">Cambiar contraseña</button>
          </form>`;
        pwToggle(body);
        const f = body.querySelector('#recPass');
        f.password.focus();
        f.addEventListener('submit', e => {
          e.preventDefault();
          ui.busy(f.querySelector('button[type=submit]'), async () => {
            const r = await JP.auth.finishReset(st.token, f.password.value, f.confirm.value);
            if (!r.ok) {
              ui.showErrors(f, r.errors || {}, r.error || 'Revisá los campos marcados.');
              if (r.expired) setTimeout(stepPhone, 1800);
              return;
            }
            ui.toast('¡Listo! Ya podés ingresar con tu contraseña nueva.');
            JP.router.go('/ingresar');
          });
        });
      }

      stepPhone();
    }
    return { title: 'Recuperar contraseña', html, mount };
  };

  V.register = function (ctx) {
    if (JP.auth.current()) return { redirect: '/cuenta' };
    const html = `<div class="container page page--auth"><div class="auth auth--single">
      <form class="card form" id="regForm" novalidate>
        <h1>Crear cuenta</h1>
        <div class="field"><label for="r-n">Nombre y apellido</label><input id="r-n" name="name" autocomplete="name" required></div>
        <div class="field"><label for="r-e">Correo electrónico</label><input id="r-e" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="r-t">Número de teléfono</label><input id="r-t" name="phone" type="tel" autocomplete="tel" placeholder="Ej.: 387 4123456" required><p class="field-hint">Con código de área. Lo usamos para coordinar tus pedidos por WhatsApp.</p></div>
        <div class="field"><label for="r-p">Contraseña</label><div class="pw"><input id="r-p" name="password" type="password" autocomplete="new-password" required><button type="button" class="pw__toggle" data-pw aria-label="Mostrar contraseña" aria-pressed="false">${I('eye', { size: 18 })}</button></div><p class="field-hint">Mínimo 8 caracteres, con letras y números.</p></div>
        <div class="field"><label for="r-c">Repetir contraseña</label><input id="r-c" name="confirm" type="password" autocomplete="new-password" required></div>
        <button class="btn btn--primary btn--block btn--lg" type="submit">Crear cuenta</button>
        <p class="auth__switch">¿Ya tenés cuenta? <a href="#/ingresar">Ingresar</a></p>
      </form></div></div>`;
    function mount(el) {
      const f = el.querySelector('#regForm');
      pwToggle(el);
      f.addEventListener('submit', e => {
        e.preventDefault();
        const btn = f.querySelector('button[type=submit]');
        ui.busy(btn, async () => {
          const r = await JP.auth.register(ui.formData(f));
          if (!r.ok) return ui.showErrors(f, r.errors || {}, r.error || 'Revisá los campos marcados.');
          ui.toast('¡Cuenta creada! Ya iniciaste sesión.');
          const v = ctx.query.volver || '';
          JP.router.go(v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/admin') ? v : '/cuenta');
        });
      });
    }
    return { title: 'Crear cuenta', html, mount };
  };

  V.account = function () {
    const u = JP.auth.current();
    const addrs = u.addresses || [];
    const html = `<div class="container page page--narrow">
      ${crumbs([['Inicio', '#/'], ['Mi cuenta']])}
      <div class="page__head page__head--row"><div><h1>Mi cuenta</h1></div>
        <div class="row-btns">${JP.auth.isStaff() ? `<a class="btn btn--primary" href="#${JP.auth.panelHome()}">${I('grid', { size: 18 })}Panel de administración</a>` : ''}<button type="button" class="btn btn--ghost" data-action="logout">${I('logout', { size: 18 })}Cerrar sesión</button></div></div>

      <section class="card account" aria-labelledby="accTitle">
        <div class="card__head"><h2 id="accTitle">Mis datos</h2><button type="button" class="btn btn--ghost btn--sm" id="editProfile">${I('edit', { size: 16 })}Editar</button></div>
        <div class="account__row">
          <span class="account__avatar" aria-hidden="true">${U.esc(u.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>
          <dl class="dl dl--flat">
            <div><dt>Nombre completo</dt><dd>${U.esc(u.name)}</dd></div>
            <div><dt>Número de teléfono</dt><dd>${u.phone ? U.esc(u.phone) : '<span class="muted">Sin cargar</span>'}</dd></div>
            <div><dt>Correo electrónico</dt><dd>${U.esc(u.email)}</dd></div>
          </dl>
        </div>
        <form class="form" id="profileForm" hidden novalidate>
          <div class="row-2">
            <div class="field"><label for="p-n">Nombre completo</label><input id="p-n" name="name" autocomplete="name" value="${U.esc(u.name)}"></div>
            <div class="field"><label for="p-t">Número de teléfono</label><input id="p-t" name="phone" type="tel" autocomplete="tel" value="${U.esc(u.phone || '')}"></div>
          </div>
          <div class="row-btns"><button type="button" class="btn btn--ghost btn--sm" id="cancelProfile">Cancelar</button><button type="submit" class="btn btn--primary btn--sm">Guardar</button></div>
        </form>
      </section>

      <section class="card" aria-labelledby="addrTitle">
        <div class="card__head"><h2 id="addrTitle">Mis direcciones</h2><button type="button" class="btn btn--primary btn--sm" id="addAddr">${I('plus', { size: 16 })}Agregar dirección</button></div>
        ${addrs.length ? `<ul class="addr-list">${addrs.map(a => `<li class="addr-card${a.isDefault ? ' is-default' : ''}">
            <span class="addr-card__icon">${I('truck', { size: 20 })}</span>
            <div class="addr-card__body"><p class="addr-card__title">${U.esc(a.street + ' ' + a.number)}${a.apt ? ', ' + U.esc(a.apt) : ''}${a.isDefault ? ' <span class="badge badge--outline">Principal</span>' : ''}</p>
              <p class="muted small">${U.esc(a.city)} (CP ${U.esc(a.zip)}), ${U.esc(a.province)}</p></div>
            <div class="row-btns row-btns--end">
              ${a.isDefault ? '' : `<button type="button" class="btn btn--ghost btn--sm" data-addr-default="${a.id}">Hacer principal</button>`}
              <button type="button" class="icon-btn" data-addr-edit="${a.id}" aria-label="Modificar dirección ${U.esc(a.street + ' ' + a.number)}">${I('edit', { size: 18 })}</button>
              <button type="button" class="icon-btn icon-btn--danger" data-addr-del="${a.id}" aria-label="Eliminar dirección ${U.esc(a.street + ' ' + a.number)}">${I('trash', { size: 18 })}</button>
            </div></li>`).join('')}</ul>`
          : `<p class="muted">Todavía no guardaste direcciones. Agregá una para usarla en tus envíos.</p>`}
      </section>
    </div>`;

    function addrModal(addr) {
      return ui.modal({
        title: addr ? 'Modificar dirección' : 'Agregar dirección',
        html: `<form id="addrForm" class="form" novalidate>${addressFields('', addr, 'm')}
          <label class="check"><input type="checkbox" name="isDefault" ${addr && addr.isDefault ? 'checked' : ''}> Usar como dirección principal</label></form>`,
        actions: [{ label: 'Cancelar', value: null }, {
          label: 'Guardar dirección', variant: 'primary', close: false, onClick: async (dlg, close) => {
            const f = dlg.querySelector('#addrForm');
            const data = Object.assign(readAddress(f, ''), { id: addr ? addr.id : null, isDefault: f.isDefault.checked });
            const r = await JP.auth.saveAddress(data);
            if (!r.ok) { ui.showErrors(f, r.errors || {}, r.error); return false; }
            close(true); return false;
          }
        }]
      });
    }

    function mount(el) {
      const pf = el.querySelector('#profileForm');
      const toggle = open => { pf.hidden = !open; el.querySelector('.account__row').hidden = open; el.querySelector('#editProfile').hidden = open; if (open) pf.querySelector('input').focus(); };
      el.querySelector('#editProfile').addEventListener('click', () => toggle(true));
      el.querySelector('#cancelProfile').addEventListener('click', () => { toggle(false); el.querySelector('#editProfile').focus(); });
      pf.addEventListener('submit', async e => {
        e.preventDefault();
        const r = await JP.auth.updateProfile(ui.formData(pf));
        if (!r.ok) return ui.showErrors(pf, r.errors || {}, r.error);
        ui.toast('Tus datos se guardaron.'); JP.router.refresh();
      });
      el.querySelector('#addAddr').addEventListener('click', async () => { if (await addrModal(null)) { ui.toast('Dirección agregada.'); JP.router.refresh(); } });
      el.addEventListener('click', async e => {
        const ed = e.target.closest('[data-addr-edit]');
        if (ed && await addrModal(addrs.find(a => a.id === ed.dataset.addrEdit))) { ui.toast('Dirección modificada.'); JP.router.refresh(); }
        const df = e.target.closest('[data-addr-default]');
        if (df) { const r = await JP.auth.setDefaultAddress(df.dataset.addrDefault); if (r.ok) { ui.toast('Dirección principal actualizada.'); JP.router.refresh(); } else ui.toast(r.error, 'error'); }
        const del = e.target.closest('[data-addr-del]');
        if (del && await ui.confirm({ title: 'Eliminar dirección', danger: true, confirmText: 'Eliminar', message: '¿Querés eliminar esta dirección de tu cuenta?' })) {
          const r = await JP.auth.deleteAddress(del.dataset.addrDel);
          if (r.ok) { ui.toast('Dirección eliminada.', 'info'); JP.router.refresh(); } else ui.toast(r.error, 'error');
        }
      });
    }
    return { title: 'Mi cuenta', html, mount };
  };

  V.notFound = function (o) {
    const x = o || {};
    return {
      title: 'No encontrado',
      html: `<div class="container page">${ui.empty({ icon: 'search', title: x.title || 'No encontramos esta página', text: x.message || 'Puede que el enlace sea incorrecto o que el contenido ya no exista.', action: x.action || { href: '#/', label: 'Volver al inicio' } })}</div>`
    };
  };
})();
