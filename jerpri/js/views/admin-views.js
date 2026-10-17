/* =========================================================
   JERPRI · Vistas del panel administrativo
   Solo accesibles con rol "admin" (control de interfaz; la
   autorización real debe hacerse en el backend futuro).
   ========================================================= */
window.JP = window.JP || {};
JP.views = JP.views || {};

(function () {
  const U = JP.utils;
  const I = JP.icon;
  const C = JP.catalog;
  const O = JP.orders;
  const ui = JP.ui;
  const A = JP.views.admin = {};

  function head(title, sub, actions) {
    return `<div class="ahead"><div><h1>${U.esc(title)}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${actions ? `<div class="row-btns">${actions}</div>` : ''}</div>`;
  }
  function kpi(icon, label, value, note, tone) {
    return `<div class="kpi${tone ? ' kpi--' + tone : ''}"><span class="kpi__icon">${I(icon, { size: 20 })}</span><div><p class="kpi__label">${label}</p><p class="kpi__value">${value}</p>${note ? `<p class="kpi__note">${note}</p>` : ''}</div></div>`;
  }
  function bars(rows, fmt) {
    const max = Math.max(1, ...rows.map(r => r.value));
    return `<ul class="hbars">${rows.map(r => `<li><span class="hbars__label">${U.esc(r.label)}</span><span class="hbars__track"><span class="hbars__fill${r.tone ? ' hbars__fill--' + r.tone : ''}" style="width:${(r.value / max * 100).toFixed(1)}%"></span></span><span class="hbars__val">${fmt ? fmt(r.value) : r.value}</span></li>`).join('')}</ul>`;
  }
  function orderRow(o, compact, isNew) {
    return `<tr${isNew ? ' class="row--new"' : ''}>
      <td data-label="Pedido"><a href="#/admin/pedidos/${o.id}"><strong>${o.id}</strong></a>${isNew ? ' <span class="tag-new">Nuevo</span>' : ''}</td>
      <td data-label="Fecha">${U.fmtDate(o.createdAt)}</td>
      <td data-label="Cliente">${U.esc(o.customer.name)}${o.userId ? '' : ' <small class="muted">(invitado)</small>'}</td>
      <td data-label="Total">${U.money(o.total)}</td>
      ${compact ? '' : `<td data-label="Método">${U.esc(O.PAYMENT_METHOD[o.payment.method])}</td>`}
      <td data-label="Pago">${ui.statusBadge('payment', o.payment.status)}</td>
      <td data-label="Pedido">${ui.statusBadge('order', o.status)}</td>
      ${compact ? '' : `<td data-label="Entrega">${ui.statusBadge('delivery', o.delivery.status)}</td>`}
      <td><a class="btn btn--ghost btn--sm" href="#/admin/pedidos/${o.id}">${compact ? 'Ver' : 'Ver y gestionar'}</a></td></tr>`;
  }
  const orderHead = compact => `<thead><tr><th scope="col">Pedido</th><th scope="col">Fecha</th><th scope="col">Cliente</th><th scope="col">Total</th>${compact ? '' : '<th scope="col">Método</th>'}<th scope="col">Pago</th><th scope="col">Estado</th>${compact ? '' : '<th scope="col">Entrega</th>'}<th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>`;

  /* =======================================================
     RESUMEN (DASHBOARD)
     ======================================================= */
  A.dashboard = function () {
    const s = JP.stats.summary();
    const low = C.lowStockVariants().slice(0, 8);
    const top = JP.stats.topProducts(5);
    const html = `
      ${head('Resumen', 'Indicadores calculados con los pedidos registrados.')}
      ${!s.totalOrders ? `<p class="notice">${I('info', { size: 18 })}<span>Todavía no hay pedidos registrados: los indicadores de ventas están en cero y se actualizarán con cada pedido.</span></p>` : ''}
      <div class="kpis">
        ${kpi('box', 'Productos activos', s.activeProducts, `de ${s.totalProducts} cargados`)}
        ${kpi('receipt', 'Pedidos', s.totalOrders, `${s.cancelledOrders} cancelado${s.cancelledOrders === 1 ? '' : 's'}`)}
        ${kpi('clock', 'Pedidos pendientes', s.pendingOrders, 'sin entregar ni cancelar', s.pendingOrders ? 'warn' : '')}
        ${kpi('cash', 'Pagos por verificar', s.paymentsToVerify, 'pendientes o informados', s.paymentsToVerify ? 'warn' : '')}
        ${kpi('receipt', 'Ventas registradas', U.money(s.registeredSales), `${s.registeredCount} pedido${s.registeredCount === 1 ? '' : 's'} no cancelado${s.registeredCount === 1 ? '' : 's'}`)}
        ${kpi('checkCircle', 'Ingresos verificados', U.money(s.verifiedRevenue), `${s.verifiedCount} con pago verificado`, 'ok')}
        ${kpi('alert', 'Variantes con stock bajo', s.lowStockVariants, `menos de ${C.lowThreshold()} unidades`, s.lowStockVariants ? 'warn' : '')}
        ${kpi('alert', 'Variantes sin stock', s.outOfStockVariants, `${s.outOfStockProducts} producto${s.outOfStockProducts === 1 ? '' : 's'} agotado${s.outOfStockProducts === 1 ? '' : 's'}`, s.outOfStockVariants ? 'danger' : '')}
      </div>
      <div class="agrid">
        <section class="card"><div class="card__head"><h2>Últimos pedidos</h2><a class="link-arrow" href="#/admin/pedidos">Ver todos ${I('arrowRight', { size: 16 })}</a></div>
          ${s.latest.length ? `<div class="table-wrap"><table class="table table--cards">${orderHead(true)}<tbody>${s.latest.map(o => orderRow(o, true)).join('')}</tbody></table></div>` : '<p class="muted">Sin pedidos todavía.</p>'}</section>
        <section class="card"><div class="card__head"><h2>Stock bajo y agotado</h2><a class="link-arrow" href="#/admin/productos?stock=bajo">Ver productos ${I('arrowRight', { size: 16 })}</a></div>
          ${low.length ? `<ul class="alist">${low.map(x => `<li><span><a href="#/admin/productos/${x.product.id}">${U.esc(x.product.name)}</a><small>${U.esc(C.variantLabel(x.variant.size, x.variant.color))}${x.product.active ? '' : ' · producto inactivo'}</small></span><span class="pill pill--${x.level}">${x.variant.stock} u.</span></li>`).join('')}</ul>` : `<p class="muted">No hay variantes con menos de ${C.lowThreshold()} unidades.</p>`}</section>
        <section class="card"><div class="card__head"><h2>Más vendidos</h2><a class="link-arrow" href="#/admin/estadisticas">Estadísticas ${I('arrowRight', { size: 16 })}</a></div>
          ${top.length ? bars(top.map(t => ({ label: t.name, value: t.qty })), v => v + ' u.') : '<p class="muted">Todavía no hay datos suficientes.</p>'}</section>
      </div>`;
    return { title: 'Resumen', html };
  };

  /* =======================================================
     PRODUCTOS · LISTADO
     ======================================================= */
  A.products = function (ctx) {
    const st = { q: '', cat: '', estado: 'todos', stock: ctx.query.stock || '' };
    const cats = C.categories({ includeInactive: true });
    const html = `
      ${head('Productos', 'Los cambios se ven al instante en la tienda.', `<a class="btn btn--primary" href="#/admin/productos/nuevo">${I('plus', { size: 18 })}Nuevo producto</a>`)}
      <form class="toolbar" id="pFilters" role="search" aria-label="Filtrar productos">
        <div class="input-icon">${I('search', { size: 18 })}<label class="sr-only" for="pq">Buscar producto</label><input id="pq" name="q" type="search" placeholder="Buscar por nombre"></div>
        <label class="sr-only" for="pc">Categoría</label><select id="pc" name="cat"><option value="">Todas las categorías</option>${cats.map(c => `<option value="${c.id}">${U.esc(c.name)}${c.active ? '' : ' (inactiva)'}</option>`).join('')}</select>
        <label class="sr-only" for="pe">Estado</label><select id="pe" name="estado"><option value="todos">Activos e inactivos</option><option value="activos">Solo activos</option><option value="inactivos">Solo inactivos</option></select>
        <label class="sr-only" for="ps">Stock</label><select id="ps" name="stock"><option value="">Todo el stock</option><option value="bajo" ${st.stock === 'bajo' ? 'selected' : ''}>Con stock bajo o agotado</option><option value="pedido">Por pedido</option></select>
      </form>
      <p class="muted small" id="pCount" aria-live="polite"></p>
      <div class="table-wrap"><table class="table table--cards"><thead><tr><th scope="col">Producto</th><th scope="col">Categoría</th><th scope="col">Precio</th><th scope="col">Venta</th><th scope="col">Stock</th><th scope="col">Activo</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody id="pRows"></tbody></table></div>`;

    function rows() {
      const q = U.normalize(st.q);
      const th = C.lowThreshold();
      const list = C.products().filter(p => {
        if (q && !U.normalize(p.name).includes(q)) return false;
        if (st.cat && p.categoryId !== st.cat) return false;
        if (st.estado === 'activos' && !p.active) return false;
        if (st.estado === 'inactivos' && p.active) return false;
        if (st.stock === 'bajo' && !(p.saleType === 'stock' && p.variants.some(v => v.stock < th))) return false;
        if (st.stock === 'pedido' && p.saleType !== 'pedido') return false;
        return true;
      }).sort((a, b) => a.name.localeCompare(b.name, 'es'));
      return list;
    }

    function render(el) {
      const list = rows();
      el.querySelector('#pCount').textContent = `${list.length} producto${list.length === 1 ? '' : 's'}`;
      el.querySelector('#pRows').innerHTML = list.length ? list.map(p => {
        const cat = C.category(p.categoryId);
        const low = p.variants.filter(v => v.stock < C.lowThreshold()).length;
        const stockCell = p.saleType === 'pedido' ? '<span class="muted">No aplica</span>'
          : `${C.totalStock(p)} u. en ${p.variants.length} variante${p.variants.length === 1 ? '' : 's'}${low ? `<br><span class="pill pill--${C.stockStatus(p) === 'agotado' ? 'agotado' : 'bajo'}">${low} con stock bajo</span>` : ''}`;
        return `<tr class="${p.active ? '' : 'is-inactive'}">
          <td data-label="Producto"><div class="tprod">${ui.img(p, 'tprod__img')}<span><a href="#/admin/productos/${p.id}"><strong>${U.esc(p.name)}</strong></a><small>${p.featured ? 'Destacado' : ''}${p.featured && p.isNew ? ' · ' : ''}${p.isNew ? 'Nuevo' : ''}</small></span></div></td>
          <td data-label="Categoría">${U.esc(cat ? cat.name : '—')}${cat && !cat.active ? ' <small class="muted">(inactiva)</small>' : ''}</td>
          <td data-label="Precio">${U.money(p.price)}</td>
          <td data-label="Venta">${p.saleType === 'pedido' ? 'Por pedido' : 'Disponible'}</td>
          <td data-label="Stock">${stockCell}</td>
          <td data-label="Activo"><button type="button" class="switch" role="switch" aria-checked="${p.active}" data-toggle="${p.id}" aria-label="${p.active ? 'Desactivar' : 'Activar'} ${U.esc(p.name)}"><span></span></button></td>
          <td><div class="row-btns row-btns--end"><a class="icon-btn" href="#/admin/productos/${p.id}" aria-label="Editar ${U.esc(p.name)}">${I('edit', { size: 18 })}</a><a class="icon-btn" href="#/producto/${p.id}" aria-label="Ver ${U.esc(p.name)} en la tienda">${I('eye', { size: 18 })}</a><button type="button" class="icon-btn icon-btn--danger" data-del="${p.id}" aria-label="Eliminar ${U.esc(p.name)}">${I('trash', { size: 18 })}</button></div></td>
        </tr>`;
      }).join('') : `<tr><td colspan="7">${ui.empty({ icon: 'box', title: 'No hay productos con esos filtros' })}</td></tr>`;
    }

    function mount(el) {
      const f = el.querySelector('#pFilters');
      const read = () => { const d = ui.formData(f); Object.assign(st, { q: d.q, cat: d.cat, estado: d.estado, stock: d.stock }); render(el); };
      f.addEventListener('input', U.debounce(read, 150)); f.addEventListener('change', read); f.addEventListener('submit', e => { e.preventDefault(); read(); });
      el.addEventListener('click', async e => {
        const t = e.target.closest('[data-toggle]');
        if (t) {
          const p = C.product(t.dataset.toggle);
          const r = await C.setProductActive(p.id, !p.active);
          if (!r.ok) return ui.toast(r.error, 'error');
          ui.toast(`${p.name} ${!p.active ? 'ahora se muestra' : 'ya no se muestra'} en la tienda.`);
          render(el); el.querySelector(`[data-toggle="${p.id}"]`)?.focus();
        }
        const d = e.target.closest('[data-del]');
        if (d) {
          const p = C.product(d.dataset.del);
          const ok = await ui.confirm({ danger: true, title: 'Eliminar producto', confirmText: 'Eliminar definitivamente',
            html: `<p>Vas a eliminar <strong>${U.esc(p.name)}</strong> y todas sus variantes. Esta acción no se puede deshacer.</p><p class="muted small">Los pedidos ya registrados conservan su copia del producto. Si solo querés ocultarlo, desactivalo.</p>` });
          if (!ok) return;
          const r = await C.deleteProduct(p.id);
          if (!r.ok) return ui.toast(r.error, 'error');
          ui.toast('Producto eliminado.'); render(el);
        }
      });
      render(el);
    }
    return { title: 'Productos', html, mount };
  };

  /* =======================================================
     PRODUCTOS · ALTA Y EDICIÓN (incluye variantes y stock)
     ======================================================= */
  A.productEdit = function (ctx) {
    const isNew = ctx.params.id === 'nuevo';
    const src = isNew ? null : C.product(ctx.params.id);
    if (!isNew && !src) return JP.views.notFound({ title: 'Producto no encontrado', action: { href: '#/admin/productos', label: 'Volver a productos' } });
    const cats = C.categories({ includeInactive: true });
    const draft = src ? U.deepClone(src) : { name: '', description: '', categoryId: cats[0] ? cats[0].id : '', subcategoryId: null, price: '', saleType: 'stock', featured: false, isNew: true, active: true, audience: [], images: [], colors: [], variants: [{ size: null, color: null, stock: 0, active: true }] };
    draft.sizesText = C.sizes(draft).join(', ');
    const initial = JSON.stringify(draft);

    const html = `
      ${head(isNew ? 'Nuevo producto' : 'Editar producto', isNew ? 'Completá los datos y definí las variantes con su stock.' : U.esc(src.name))}
      <form class="aform" id="pForm" novalidate>
        <section class="card"><h2>Información</h2>
          <div class="field"><label for="e-name">Nombre <span class="req" aria-hidden="true">*</span></label><input id="e-name" name="name" required maxlength="80" value="${U.esc(draft.name)}"></div>
          <div class="field"><label for="e-desc">Descripción</label><textarea id="e-desc" name="description" rows="3" maxlength="600">${U.esc(draft.description)}</textarea></div>
          <div class="row-2">
            <div class="field"><label for="e-cat">Categoría <span class="req" aria-hidden="true">*</span></label><select id="e-cat" name="categoryId">${cats.map(c => `<option value="${c.id}" ${draft.categoryId === c.id ? 'selected' : ''}>${U.esc(c.name)}${c.active ? '' : ' (inactiva)'}</option>`).join('')}</select></div>
            <div class="field"><label for="e-sub">Subcategoría</label><select id="e-sub" name="subcategoryId"></select><p class="field-hint" id="subHint"></p></div>
            <div class="field"><label for="e-price">Precio (ARS) <span class="req" aria-hidden="true">*</span></label><input id="e-price" name="price" type="number" min="1" step="1" inputmode="numeric" required value="${U.esc(draft.price)}">${isNew ? '' : '<p class="field-hint">Cambiar el precio no modifica los pedidos ya registrados.</p>'}</div>
          </div>
        </section>
        <section class="card"><h2>Venta y para quién es</h2>
          <fieldset class="field"><legend>Tipo de venta</legend>
            <label class="choice choice--inline"><input type="radio" name="saleType" value="stock" ${draft.saleType === 'stock' ? 'checked' : ''}><span class="choice__body"><strong>Disponible</strong><span>Se vende según el stock de cada variante.</span></span></label>
            <label class="choice choice--inline"><input type="radio" name="saleType" value="pedido" ${draft.saleType === 'pedido' ? 'checked' : ''}><span class="choice__body"><strong>Por pedido</strong><span>Se encarga; no descuenta stock.</span></span></label>
          </fieldset>
          <fieldset class="field"><legend>¿Es para mujer o para hombre?</legend>
            <p class="field-hint">Lo usa el asistente: si el cliente escribe "mi novio" o "mi mamá", se fija en esto.</p>
            <div class="seg">${C.GENDERS.map(([k, l]) => `<label class="seg__opt"><input type="radio" name="gender" value="${k}" ${(draft.gender || '') === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
          </fieldset>
          <fieldset class="field"><legend>¿Para quién es ideal?</legend>
            <p class="field-hint">Lo usa el asistente "JERPRI te ayuda a elegir". Si no marcás ninguna, se recomienda para cualquiera.</p>
            <div class="checks">${C.AUDIENCES.map(([k, l]) => `<label class="check"><input type="checkbox" name="para_${k}" ${(draft.audience || []).includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div>
          </fieldset>
        </section>
        <section class="card"><h2>Imágenes</h2>
          <p class="muted small">Si no cargás imágenes, la tienda muestra una imagen genérica con el nombre del producto. Máximo 400 KB por imagen.</p>
          <div class="imgs" id="imgList"></div>
          <div class="row-2 row-2--end">
            <div class="field"><label for="e-url">Agregar por dirección (URL o ruta local)</label><input id="e-url" type="text" placeholder="https://… o assets/img/mi-foto.jpg"></div>
            <div class="row-btns"><button type="button" class="btn btn--ghost" id="addUrl">${I('plus', { size: 16 })}Agregar</button>
            <label class="btn btn--ghost file-btn">${I('upload', { size: 16 })}Subir archivo<input type="file" id="e-file" accept="image/*" class="sr-only"></label></div>
          </div>
        </section>
        <section class="card"><h2>Variantes y stock</h2>
          <p class="muted small">Cada combinación de talle y color tiene su propio stock. Dejá talle o color vacíos si el producto no los usa.</p>
          <div class="row-2">
            <div class="field"><label for="e-sizes">Talles <span class="muted">(separados por coma)</span></label><input id="e-sizes" name="sizesText" placeholder="Ej.: 36, 37, 38" value="${U.esc(draft.sizesText)}"><p class="field-hint">Aparecen como sugerencia al escribir el talle de cada variante.</p><datalist id="sizeList"></datalist></div>
            <div class="field"><span class="sub-label" id="colorsLbl">Colores</span><div class="color-chips" id="colorChips" aria-labelledby="colorsLbl"></div>
              <div class="add-color"><label class="sr-only" for="e-cname">Nombre del color</label><input id="e-cname" list="colorNames" placeholder="Nuevo color"><datalist id="colorNames">${Object.keys(JP.COLORES).map(n => `<option value="${n}">`).join('')}</datalist>
              <label class="sr-only" for="e-chex">Muestra del color</label><input id="e-chex" type="color" value="#cccccc"><button type="button" class="btn btn--ghost btn--sm" id="addColor">${I('plus', { size: 14 })}Agregar color</button></div></div>
          </div>
          <div class="row-btns"><button type="button" class="btn btn--ghost btn--sm" id="addVariant">${I('plus', { size: 16 })}Agregar variante</button></div>
          <div class="table-wrap"><table class="table vtable"><thead><tr><th scope="col">Talle</th><th scope="col">Color</th><th scope="col" id="stockCol">Stock</th><th scope="col"><span class="sr-only">Quitar</span></th></tr></thead><tbody id="vRows"></tbody></table></div>
          <div data-error-for="variants"></div>
        </section>
        <div class="aform__bar"><button type="button" class="btn btn--ghost" id="cancelEdit">Cancelar</button><button type="submit" class="btn btn--primary">${I('check', { size: 18 })}Guardar producto</button></div>
      </form>`;

    function mount(el) {
      const f = el.querySelector('#pForm');

      function syncBasic() {
        const d = ui.formData(f);
        draft.name = d.name; draft.description = d.description; draft.categoryId = d.categoryId; draft.subcategoryId = d.subcategoryId || null; draft.price = d.price;
        draft.saleType = d.saleType; draft.sizesText = d.sizesText; draft.gender = d.gender || '';
        draft.audience = C.AUDIENCES.map(a => a[0]).filter(k => d['para_' + k]);
      }

      function renderImages() {
        const box = el.querySelector('#imgList');
        box.innerHTML = draft.images.length ? draft.images.map((src, i) => `<figure class="imgs__item"><img src="${U.esc(src)}" alt="Imagen ${i + 1} del producto" data-fallback="${U.esc(ui.placeholder(draft, null, 0))}"><button type="button" class="icon-btn icon-btn--danger" data-rmimg="${i}" aria-label="Quitar imagen ${i + 1}">${I('trash', { size: 16 })}</button></figure>`).join('')
          : `<p class="muted small">${I('image', { size: 16 })} Sin imágenes cargadas: se usará una imagen genérica.</p>`;
      }
      function renderColors() {
        el.querySelector('#colorChips').innerHTML = draft.colors.length ? draft.colors.map((c, i) => `<span class="color-chip"><span class="dot" style="background:${U.esc(c.hex)}"></span>${U.esc(c.name)}<button type="button" data-rmcolor="${i}" aria-label="Quitar color ${U.esc(c.name)}">${I('close', { size: 14 })}</button></span>`).join('') : '<span class="muted small">Sin colores.</span>';
      }
      function renderSizeList() {
        const sizes = [...new Set(String(el.querySelector('#e-sizes').value || '').split(',').map(s => s.trim()).filter(Boolean))];
        el.querySelector('#sizeList').innerHTML = sizes.map(s => `<option value="${U.esc(s)}">`).join('');
      }
      function renderVariants() {
        renderSizeList();
        const pedido = draft.saleType === 'pedido';
        el.querySelector('#stockCol').textContent = pedido ? 'Habilitada' : 'Stock';
        const th = C.lowThreshold();
        el.querySelector('#vRows').innerHTML = draft.variants.map((v, i) => `<tr data-v="${i}">
          <td data-label="Talle"><label class="sr-only" for="vs-${i}">Talle de la variante ${i + 1}</label><input id="vs-${i}" data-vf="size" list="sizeList" value="${U.esc(v.size || '')}" placeholder="—" maxlength="12"></td>
          <td data-label="Color"><label class="sr-only" for="vc-${i}">Color de la variante ${i + 1}</label><select id="vc-${i}" data-vf="color"><option value="">Sin color</option>${draft.colors.map(c => `<option ${v.color === c.name ? 'selected' : ''}>${U.esc(c.name)}</option>`).join('')}${v.color && !draft.colors.some(c => c.name === v.color) ? `<option selected>${U.esc(v.color)}</option>` : ''}</select></td>
          <td data-label="${pedido ? 'Habilitada' : 'Stock'}">${pedido
            ? `<label class="check"><input type="checkbox" data-vf="active" ${v.active !== false ? 'checked' : ''}> Se puede encargar</label>`
            : `<label class="sr-only" for="vk-${i}">Stock de la variante ${i + 1}</label><input id="vk-${i}" data-vf="stock" type="number" min="0" step="1" inputmode="numeric" value="${v.stock == null ? 0 : v.stock}" class="stock-input">
               <span class="pill pill--${Number(v.stock) === 0 ? 'agotado' : Number(v.stock) < th ? 'bajo' : 'ok'}" data-vpill>${Number(v.stock) === 0 ? 'Sin stock' : Number(v.stock) < th ? 'Stock bajo' : 'OK'}</span>`}</td>
          <td><button type="button" class="icon-btn icon-btn--danger" data-rmv="${i}" aria-label="Quitar variante ${i + 1}" ${draft.variants.length === 1 ? 'disabled' : ''}>${I('trash', { size: 16 })}</button></td></tr>`).join('');
      }

      // Edición en línea de variantes (sin redibujar para no perder el foco)
      el.querySelector('#vRows').addEventListener('input', e => {
        const tr = e.target.closest('[data-v]'); if (!tr) return;
        const v = draft.variants[Number(tr.dataset.v)];
        const fld = e.target.dataset.vf;
        if (fld === 'size') v.size = e.target.value.trim() || null;
        if (fld === 'stock') {
          v.stock = e.target.value === '' ? '' : Number(e.target.value);
          const pill = tr.querySelector('[data-vpill]'); const n = Number(v.stock); const th = C.lowThreshold();
          if (pill) { pill.className = 'pill pill--' + (n === 0 ? 'agotado' : n < th ? 'bajo' : 'ok'); pill.textContent = n === 0 ? 'Sin stock' : n < th ? 'Stock bajo' : 'OK'; }
        }
      });
      el.querySelector('#vRows').addEventListener('change', e => {
        const tr = e.target.closest('[data-v]'); if (!tr) return;
        const v = draft.variants[Number(tr.dataset.v)];
        if (e.target.dataset.vf === 'color') v.color = e.target.value || null;
        if (e.target.dataset.vf === 'active') v.active = e.target.checked;
      });

      el.addEventListener('click', async e => {
        const rmv = e.target.closest('[data-rmv]');
        if (rmv) {
          const v = draft.variants[Number(rmv.dataset.rmv)];
          if (v.stock > 0 && !(await ui.confirm({ title: 'Quitar variante', danger: true, confirmText: 'Quitar', message: `La variante ${C.variantLabel(v.size, v.color)} tiene ${v.stock} unidades. Se quitará al guardar el producto.` }))) return;
          draft.variants.splice(Number(rmv.dataset.rmv), 1); renderVariants();
        }
        const rc = e.target.closest('[data-rmcolor]');
        if (rc) {
          const c = draft.colors[Number(rc.dataset.rmcolor)];
          const used = draft.variants.filter(v => v.color === c.name).length;
          if (used && !(await ui.confirm({ title: 'Quitar color', danger: true, confirmText: 'Quitar color y variantes', message: `Hay ${used} variante(s) con el color ${c.name}. Se quitarán junto con su stock al guardar.` }))) return;
          draft.colors.splice(Number(rc.dataset.rmcolor), 1);
          draft.variants = draft.variants.filter(v => v.color !== c.name);
          if (!draft.variants.length) draft.variants.push({ size: null, color: null, stock: 0, active: true });
          renderColors(); renderVariants();
        }
        const ri = e.target.closest('[data-rmimg]');
        if (ri) { draft.images.splice(Number(ri.dataset.rmimg), 1); renderImages(); }
      });

      el.querySelector('#e-cname').addEventListener('input', e => { const hex = JP.COLORES[e.target.value.trim()]; if (hex) el.querySelector('#e-chex').value = hex.toLowerCase(); });
      el.querySelector('#addColor').addEventListener('click', () => {
        const name = el.querySelector('#e-cname').value.trim();
        if (!name) return ui.toast('Escribí el nombre del color.', 'error');
        if (draft.colors.some(c => U.normalize(c.name) === U.normalize(name))) return ui.toast('Ese color ya está agregado.', 'error');
        draft.colors.push({ name: name.charAt(0).toUpperCase() + name.slice(1), hex: el.querySelector('#e-chex').value });
        el.querySelector('#e-cname').value = '';
        renderColors(); renderVariants();
        ui.toast('Color agregado. Elegilo en una variante o agregá una variante nueva.', 'info');
      });
      el.querySelector('#addVariant').addEventListener('click', () => { draft.variants.push({ size: null, color: null, stock: 0, active: true }); renderVariants(); el.querySelector(`#vs-${draft.variants.length - 1}`).focus(); });
      f.addEventListener('change', e => { if (e.target.name === 'saleType') { syncBasic(); renderVariants(); } });
      el.querySelector('#e-sizes').addEventListener('input', renderSizeList);

      el.querySelector('#addUrl').addEventListener('click', () => {
        const inp = el.querySelector('#e-url');
        const v = inp.value.trim();
        if (!v) return ui.toast('Escribí una dirección de imagen.', 'error');
        if (!/^(https?:\/\/|assets\/|\.\/|data:image\/)/i.test(v)) return ui.toast('La dirección debe empezar con https://, http:// o assets/.', 'error');
        draft.images.push(v); inp.value = ''; renderImages();
      });
      el.querySelector('#e-file').addEventListener('change', e => {
        const file = e.target.files[0]; e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) return ui.toast('El archivo debe ser una imagen.', 'error');
        if (file.size > 400 * 1024) return ui.toast('La imagen pesa más de 400 KB. Reducila antes de subirla.', 'error');
        const reader = new FileReader();
        reader.onload = () => { draft.images.push(reader.result); renderImages(); ui.toast('Imagen agregada. Se guarda al guardar el producto.', 'info'); };
        reader.onerror = () => ui.toast('No se pudo leer la imagen.', 'error');
        reader.readAsDataURL(file);
      });

      el.querySelector('#cancelEdit').addEventListener('click', async () => {
        syncBasic();
        if (JSON.stringify(draft) !== initial && !(await ui.confirm({ title: 'Descartar cambios', message: 'Hay cambios sin guardar. ¿Querés salir igual?', confirmText: 'Descartar', danger: true }))) return;
        JP.router.go('/admin/productos');
      });

      f.addEventListener('submit', async e => {
        e.preventDefault();
        syncBasic();
        const btn = f.querySelector('button[type=submit]');
        const r = await ui.busy(btn, async () => C.saveProduct(draft));
        if (!r.ok) return ui.showErrors(f, r.errors || {}, r.error || 'Revisá los campos marcados.');
        ui.toast(isNew ? 'Producto creado.' : 'Cambios guardados.');
        JP.router.go('/admin/productos');
      });

      // Subcategorías de la categoría elegida
      function renderSubs() {
        const sel = el.querySelector('#e-sub');
        const subs = C.subcategories(el.querySelector('#e-cat').value, { includeInactive: true });
        sel.innerHTML = `<option value="">Sin subcategoría</option>` + subs.map(x => `<option value="${x.id}" ${draft.subcategoryId === x.id ? 'selected' : ''}>${U.esc(x.name)}${x.active ? '' : ' (oculta)'}</option>`).join('');
        sel.disabled = !subs.length;
        el.querySelector('#subHint').textContent = subs.length ? '' : 'Esta categoría no tiene subcategorías. Podés crearlas en Categorías.';
      }
      el.querySelector('#e-cat').addEventListener('change', () => { draft.subcategoryId = null; renderSubs(); });
      renderSubs();
      renderImages(); renderColors(); renderVariants();
    }
    return { title: isNew ? 'Nuevo producto' : 'Editar producto', html, mount };
  };

  /* =======================================================
     PEDIDOS · LISTADO
     ======================================================= */
  A.orders = function () {
    // Pedidos nuevos sin ver: se destacan esta vez y, al entrar, el aviso se va para todo el personal
    const nuevos = new Set(O.newForStaff().map(o => o.id));
    const html = `
      ${head('Pedidos', 'Confirmar un pedido no verifica el pago: la verificación es manual.')}
      <form class="toolbar" id="oFilters" role="search" aria-label="Filtrar pedidos">
        <div class="input-icon">${I('search', { size: 18 })}<label class="sr-only" for="oq">Buscar por número o cliente</label><input id="oq" name="q" type="search" placeholder="Número de pedido, cliente o teléfono"></div>
        <label class="sr-only" for="os">Estado del pedido</label><select id="os" name="status"><option value="">Todos los estados</option>${Object.entries(O.ORDER_STATUS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
        <label class="sr-only" for="op">Estado del pago</label><select id="op" name="pay"><option value="">Todos los pagos</option>${Object.entries(O.PAYMENT_STATUS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      </form>
      <p class="muted small" id="oCount" aria-live="polite"></p>
      <div class="table-wrap"><table class="table table--cards">${orderHead(false)}<tbody id="oRows"></tbody></table></div>`;
    function mount(el) {
      const f = el.querySelector('#oFilters');
      function render() {
        const d = ui.formData(f);
        const q = U.normalize(d.q);
        const list = O.all().filter(o => (!q || U.normalize(o.id).includes(q) || U.normalize(o.customer.name).includes(q) || (/^[\d\s()+-]{3,}$/.test(q) && String(o.customer.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))))
          && (!d.status || o.status === d.status) && (!d.pay || o.payment.status === d.pay));
        el.querySelector('#oCount').textContent = `${list.length} pedido${list.length === 1 ? '' : 's'}`;
        el.querySelector('#oRows').innerHTML = list.length ? list.map(o => orderRow(o, false, nuevos.has(o.id))).join('') : `<tr><td colspan="9">${ui.empty({ icon: 'receipt', title: 'No hay pedidos con esos filtros' })}</td></tr>`;
      }
      f.addEventListener('input', U.debounce(render, 150)); f.addEventListener('change', render); f.addEventListener('submit', e => { e.preventDefault(); render(); });
      render();
      if (nuevos.size) O.markSeen('pedidos');
    }
    return { title: 'Pedidos', html, mount };
  };

  /* =======================================================
     PEDIDOS · DETALLE Y GESTIÓN
     ======================================================= */
  A.orderDetail = function (ctx) {
    const o = O.get(ctx.params.id);
    if (!o) return JP.views.notFound({ title: 'Pedido no encontrado', action: { href: '#/admin/pedidos', label: 'Volver a pedidos' } });
    const cancelled = o.status === 'cancelado';
    const dis = cancelled ? 'disabled' : '';
    // Barra de seguimiento del pedido
    const FLOW = [['recibido', 'Recibido', 'receipt'], ['en_preparacion', 'Confirmado', 'check'], ['listo', 'Listo', 'box'], ['entregado', 'Entregado', 'truck']];
    const idx = FLOW.findIndex(f => f[0] === o.status);
    const units = o.items.reduce((n, i) => n + i.qty, 0);
    const html = `
      <a class="od__back" href="#/admin/pedidos">${I('arrowLeft', { size: 16 })}Volver a pedidos</a>

      <header class="card od__head${cancelled ? ' od__head--cancel' : ''}">
        <div class="od__id">
          <p class="eyebrow">Pedido</p>
          <h1 class="order-no">${o.id}</h1>
          <p class="muted small">${I('clock', { size: 14 })} Recibido el ${U.fmtDateTime(o.createdAt)}</p>
        </div>
        <div class="od__who"><span class="od__avatar" aria-hidden="true">${U.esc(o.customer.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>
          <div><strong>${U.esc(o.customer.name)}</strong><span class="muted small">${units} producto${units === 1 ? '' : 's'} · ${U.esc(o.delivery.optionName)}</span></div></div>
        <div class="od__total"><span class="muted small">Total</span><strong>${U.money(o.total)}</strong>${ui.statusBadge('order', o.status)}</div>
      </header>

      ${cancelled
        ? `<p class="notice notice--warn">${I('info', { size: 18 })}<span>Pedido cancelado. ${o.stockRestored ? 'El stock ya fue devuelto y no se volverá a sumar.' : ''} No se cuenta como venta.</span></p>`
        : `<ol class="od__flow" aria-label="Seguimiento del pedido">${FLOW.map((f, k) => `<li class="${k < idx ? 'is-done' : k === idx ? 'is-current' : ''}"${k === idx ? ' aria-current="step"' : ''}><span class="od__dot">${I(k < idx ? 'check' : f[2], { size: 16 })}</span><span>${f[1]}</span></li>`).join('')}</ol>`}

      <div class="odx">
        <section class="card"><h2>Productos</h2>
          <table class="table"><thead><tr><th scope="col">Producto</th><th scope="col">Cant.</th><th scope="col">Precio</th><th scope="col">Subtotal</th></tr></thead><tbody>
          ${o.items.map(i => `<tr><td>${U.esc(i.name)}<br><small class="muted">${U.esc(C.variantLabel(i.size, i.color))}${i.saleType === 'pedido' ? ' · Por pedido' : ''}${C.product(i.productId) ? '' : ' · producto eliminado del catálogo'}</small></td><td>${i.qty}</td><td>${U.money(i.unitPrice)}</td><td>${U.money(i.qty * i.unitPrice)}</td></tr>`).join('')}
          </tbody><tfoot><tr><th scope="row" colspan="3">Total</th><td><strong>${U.money(o.total)}</strong></td></tr>
          ${o.deposit ? `<tr><th scope="row" colspan="3">Seña (${o.deposit.percent}%)</th><td>${U.money(o.deposit.amount)}</td></tr><tr><th scope="row" colspan="3">Saldo</th><td>${U.money(o.deposit.balance)}</td></tr>` : ''}</tfoot></table>
          <p class="muted small">${I('lock', { size: 14 })} Precios históricos del momento de la compra: no se pueden modificar.</p>
        </section>
        <section class="card"><h2>Cliente</h2>
          <dl class="dl"><div><dt>Nombre</dt><dd>${U.esc(o.customer.name)}${o.userId ? '' : ' (sin cuenta)'}</dd></div>
          <div><dt>Teléfono</dt><dd>${U.esc(o.customer.phone || '—')}${o.customer.phone ? ` <a class="small" href="https://wa.me/${String(o.customer.phone).replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>` : ''}</dd></div>
          <div><dt>Entrega</dt><dd>${U.esc(o.delivery.optionName)}${o.delivery.address ? '<br>' + U.esc(U.addressLine(o.delivery.address)) : ''}</dd></div>
          ${o.customer.email ? `<div><dt>Correo</dt><dd>${U.esc(o.customer.email)}</dd></div>` : ''}
          ${o.notes ? `<div><dt>Observaciones</dt><dd>${U.esc(o.notes)}</dd></div>` : ''}</dl>
        </section>
        <form class="card form" id="fStatus"><h2>Estado del pedido</h2>
          <div class="field"><label for="a-st">Estado</label><select id="a-st" name="status" ${dis}>${Object.entries(O.ORDER_STATUS).filter(([k]) => k !== 'cancelado' || cancelled).map(([k, l]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="row-btns row-btns--end"><button class="btn btn--primary btn--sm" type="submit" ${dis}>Guardar estado</button></div></form>
        <section class="card" id="fPay"><h2>Pago</h2>
          <p class="muted small">Marcá como verificado solo cuando confirmes que recibiste el dinero.</p>
          <dl class="dl"><div><dt>Método</dt><dd>${U.esc(O.PAYMENT_METHOD[o.payment.method])}</dd></div>
          <div><dt>Estado del pago</dt><dd>${ui.statusBadge('payment', o.payment.status)}</dd></div>
          ${o.payment.verifiedAt ? `<div><dt>Verificado</dt><dd>${U.fmtDateTime(o.payment.verifiedAt)}</dd></div>` : ''}</dl>
          ${o.payment.status !== 'verificado' && !cancelled ? `<div class="row-btns row-btns--end"><button type="button" class="btn btn--primary btn--sm" id="verifyPay">${I('check', { size: 16 })}Verificar pago</button></div>` : ''}
        </section>
        <form class="card form" id="fDel"><h2>Entrega</h2>
          <div class="field"><label for="a-del">Estado de la entrega</label><select id="a-del" name="status" ${dis}>${Object.entries(O.DELIVERY_STATUS).map(([k, l]) => `<option value="${k}" ${o.delivery.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label for="a-dn">Observaciones de entrega</label><textarea id="a-dn" name="notes" rows="2" maxlength="300" ${dis}>${U.esc(o.delivery.notes)}</textarea></div>
          <div class="row-btns row-btns--end"><button class="btn btn--primary btn--sm" type="submit" ${dis}>Guardar entrega</button></div></form>
        ${cancelled ? '' : `<section class="card card--danger"><h2>Cancelar pedido</h2><p class="small">Se devolverá al stock lo descontado (solo productos disponibles), una única vez.</p><div class="row-btns row-btns--end"><button type="button" class="btn btn--danger btn--sm" id="cancelOrder">${I('close', { size: 16 })}Cancelar pedido</button></div></section>`}
        <section class="card"><h2>Historial</h2><ol class="timeline">${o.history.slice().reverse().map(h => `<li><time>${U.fmtDateTime(h.at)}</time><p>${U.esc(h.text)}</p></li>`).join('')}</ol></section>
      </div>`;

    function mount(el) {
      // Espera la respuesta (en modo servidor llega de PostgreSQL) y actualiza la pantalla
      const done = async (pr, okMsg) => { const r = await pr; if (r.ok) { ui.toast(typeof okMsg === 'function' ? okMsg(r) : okMsg); JP.router.refresh(); } else ui.toast(r.error, 'error'); return r; };
      el.querySelector('#fStatus').addEventListener('submit', e => { e.preventDefault(); done(O.setStatus(o.id, e.target.status.value), 'Estado del pedido actualizado.'); });
      const vb = el.querySelector('#verifyPay');
      if (vb) vb.addEventListener('click', async () => {
        if (!(await ui.confirm({ title: 'Verificar pago', message: `¿Confirmás que recibiste ${U.money(o.total)} del pedido ${o.id}? Esta verificación es manual.`, confirmText: 'Sí, verificar' }))) return;
        done(O.setPaymentStatus(o.id, 'verificado'), 'Pago verificado.');
      });
      el.querySelector('#fDel').addEventListener('submit', e => { e.preventDefault(); done(O.updateDelivery(o.id, { status: e.target.status.value, notes: e.target.notes.value }), 'Entrega actualizada.'); });
      const cb = el.querySelector('#cancelOrder');
      if (cb) cb.addEventListener('click', async () => {
        const stockItems = o.items.filter(i => i.saleType === 'stock').reduce((s, i) => s + i.qty, 0);
        const reason = await ui.modal({
          title: 'Cancelar pedido ' + o.id, size: 'sm',
          html: `<div class="confirm"><span class="confirm__icon">${I('alert', { size: 26 })}</span><div><p>El pedido dejará de contarse como venta.${stockItems ? ` Se devolverán <strong>${stockItems} unidad${stockItems === 1 ? '' : 'es'}</strong> al stock.` : ''} Esta acción no se puede deshacer.</p>
            <div class="field"><label for="cancelReason">Motivo <span class="muted">(opcional)</span></label><textarea id="cancelReason" rows="2" maxlength="200"></textarea></div></div></div>`,
          actions: [{ label: 'Volver', value: null }, { label: 'Cancelar pedido', variant: 'danger', close: false, onClick: (dlg, close) => { close({ reason: dlg.querySelector('#cancelReason').value }); return false; } }]
        });
        if (!reason) return;
        await done(O.cancel(o.id, reason.reason), r => `Pedido cancelado.${r.restored ? ` Se devolvieron ${r.restored} unidades al stock.` : ''}`);
      });
    }
    return { title: 'Pedido ' + o.id, html, mount: el => { mount(el); O.markSeen('pedidos'); } };
  };

  /* =======================================================
     CATEGORÍAS Y SUBCATEGORÍAS
     ======================================================= */
  const CAT_ICONS = [['shoe', 'Calzado'], ['bow', 'Moño'], ['gem', 'Gema'], ['gift', 'Regalo'], ['tag', 'Etiqueta'], ['star', 'Estrella'], ['sparkle', 'Brillo'], ['package', 'Paquete']];
  A.categories = function () {
    const html = `
      ${head('Categorías', 'Desactivar una categoría oculta sus productos de la tienda, pero no los elimina.',
        `<button type="button" class="btn btn--primary" id="newCat">${I('plus', { size: 18 })}Nueva categoría</button><button type="button" class="btn btn--ghost" id="newSub">${I('plus', { size: 18 })}Agregar subcategoría</button>`)}
      <div class="catlist" id="catList"></div>`;

    function render(el) {
      el.querySelector('#catList').innerHTML = C.categories({ includeInactive: true }).map(c => {
        const ps = C.productsInCategory(c.id);
        const subs = C.subcategories(c.id, { includeInactive: true });
        return `<article class="catrow card${c.active ? '' : ' is-inactive'}">
          <div class="catrow__main">
            <span class="catrow__icon">${I(c.icon || 'tag', { size: 22 })}</span>
            <div class="catrow__info"><h2>${U.esc(c.name)}</h2><p class="muted small">${U.esc(c.description || 'Sin descripción')} · ${ps.length} producto${ps.length === 1 ? '' : 's'} (${ps.filter(p => p.active).length} activos)</p></div>
            <div class="row-btns row-btns--end">
              <span class="small muted">${c.active ? 'Activa' : 'Inactiva'}</span>
              <button type="button" class="switch" role="switch" aria-checked="${c.active}" data-ctoggle="${c.id}" aria-label="${c.active ? 'Desactivar' : 'Activar'} ${U.esc(c.name)}"><span></span></button>
              <button type="button" class="icon-btn" data-cedit="${c.id}" aria-label="Editar categoría ${U.esc(c.name)}">${I('edit', { size: 18 })}</button>
            </div>
          </div>
          <div class="catrow__subs">
            <span class="catrow__label">Subcategorías</span>
            ${subs.length ? subs.map(x => `<button type="button" class="subchip${x.active ? '' : ' is-off'}" data-sedit="${x.id}" aria-label="Editar subcategoría ${U.esc(x.name)}">${U.esc(x.name)} <small>${C.productsInSubcategory(x.id).length}</small>${x.active ? '' : ' <em>(oculta)</em>'} ${I('edit', { size: 13 })}</button>`).join('') : '<span class="muted small">Sin subcategorías</span>'}
            <button type="button" class="subchip subchip--add" data-snew="${c.id}">${I('plus', { size: 13 })}Agregar</button>
          </div>
        </article>`;
      }).join('');
    }

    function catEditor(cat) {
      return ui.modal({
        title: cat ? 'Editar categoría' : 'Nueva categoría',
        html: `<form id="catForm" class="form" novalidate>
          <div class="field"><label for="cf-n">Nombre</label><input id="cf-n" name="name" maxlength="40" value="${U.esc(cat ? cat.name : '')}" autofocus></div>
          <div class="field"><label for="cf-d">Descripción</label><input id="cf-d" name="description" maxlength="120" value="${U.esc(cat ? cat.description || '' : '')}"></div>
          <fieldset class="field"><legend>Ícono</legend><div class="icon-pick">${CAT_ICONS.map(([k, l]) => `<label><input type="radio" name="icon" value="${k}" ${(cat ? cat.icon : 'tag') === k ? 'checked' : ''}><span title="${l}">${I(k, { size: 22 })}<span class="sr-only">${l}</span></span></label>`).join('')}</div></fieldset>
        </form>`,
        actions: [{ label: 'Cancelar', value: null }, {
          label: 'Guardar', variant: 'primary', close: false, onClick: async (dlg, close) => {
            const f = dlg.querySelector('#catForm');
            const r = await C.saveCategory(Object.assign({ id: cat ? cat.id : null }, ui.formData(f)));
            if (!r.ok) { ui.showErrors(f, { [r.field || 'name']: r.error }); return false; }
            close(true); return false;
          }
        }]
      });
    }

    function subEditor(sub, categoryId) {
      const cats = C.categories({ includeInactive: true });
      const n = sub ? C.productsInSubcategory(sub.id).length : 0;
      const actions = [{ label: 'Cancelar', value: null }];
      if (sub) actions.push({ label: 'Eliminar', variant: 'danger', value: 'delete' });
      actions.push({
        label: sub ? 'Guardar' : 'Agregar subcategoría', variant: 'primary', close: false, onClick: async (dlg, close) => {
          const f = dlg.querySelector('#subForm');
          const d = ui.formData(f);
          const r = await C.saveSubcategory({ id: sub ? sub.id : null, name: d.name, categoryId: d.categoryId });
          if (!r.ok) { ui.showErrors(f, r.errors || {}, r.error); return false; }
          if (sub && !!d.active !== sub.active) {
            const ra = await C.setSubcategoryActive(sub.id, !!d.active);
            if (!ra.ok) { ui.showErrors(f, {}, ra.error); return false; }
          }
          close('saved'); return false;
        }
      });
      return ui.modal({
        title: sub ? 'Editar subcategoría' : 'Agregar subcategoría',
        html: `<form id="subForm" class="form" novalidate>
          <div class="field"><label for="sf-c">Categoría</label><select id="sf-c" name="categoryId">${cats.map(c => `<option value="${c.id}" ${(sub ? sub.categoryId : categoryId) === c.id ? 'selected' : ''}>${U.esc(c.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="sf-n">Nombre de la subcategoría</label><input id="sf-n" name="name" maxlength="40" placeholder="Ej.: Zapatillas, Aritos, Collares" value="${U.esc(sub ? sub.name : '')}" autofocus></div>
          ${sub ? `<label class="check"><input type="checkbox" name="active" ${sub.active ? 'checked' : ''}> Visible en el menú de la tienda</label>
          <p class="muted small">Tiene ${n} producto${n === 1 ? '' : 's'}. Si la eliminás, esos productos siguen en la categoría, sin subcategoría.</p>` : ''}
        </form>`,
        actions
      });
    }

    function mount(el) {
      el.querySelector('#newCat').addEventListener('click', async () => { if (await catEditor(null)) { ui.toast('Categoría creada.'); JP.router.reload('/admin/categorias'); } });
      el.querySelector('#newSub').addEventListener('click', async () => { if (await subEditor(null, (C.categories({ includeInactive: true })[0] || {}).id)) { ui.toast('Subcategoría agregada. Ya aparece en el menú Categorías.'); render(el); } });
      el.addEventListener('click', async e => {
        const ed = e.target.closest('[data-cedit]');
        if (ed && await catEditor(C.category(ed.dataset.cedit))) { ui.toast('Categoría actualizada.'); render(el); }
        const sn = e.target.closest('[data-snew]');
        if (sn && await subEditor(null, sn.dataset.snew)) { ui.toast('Subcategoría agregada. Ya aparece en el menú Categorías.'); render(el); }
        const se = e.target.closest('[data-sedit]');
        if (se) {
          const sub = C.subcategory(se.dataset.sedit);
          const r = await subEditor(sub);
          if (r === 'saved') { ui.toast('Subcategoría actualizada.'); render(el); }
          if (r === 'delete') {
            const n = C.productsInSubcategory(sub.id).length;
            if (!(await ui.confirm({ danger: true, title: 'Eliminar subcategoría', confirmText: 'Eliminar', html: `<p>Vas a eliminar <strong>${U.esc(sub.name)}</strong>.</p>${n ? `<p>Sus ${n} producto${n === 1 ? '' : 's'} <strong>no se eliminan</strong>: quedan en la categoría, sin subcategoría.</p>` : ''}` }))) return;
            const d = await C.deleteSubcategory(sub.id);
            if (d.ok) { ui.toast('Subcategoría eliminada.'); render(el); } else ui.toast(d.error, 'error');
          }
        }
        const t = e.target.closest('[data-ctoggle]');
        if (t) {
          const c = C.category(t.dataset.ctoggle);
          const n = C.productsInCategory(c.id).filter(p => p.active).length;
          if (c.active && n && !(await ui.confirm({ title: 'Desactivar categoría', confirmText: 'Desactivar',
            html: `<p>La categoría <strong>${U.esc(c.name)}</strong> tiene ${n} producto${n === 1 ? '' : 's'} activo${n === 1 ? '' : 's'}.</p><p>Esos productos <strong>no se eliminan</strong>: dejan de mostrarse en la tienda hasta que reactives la categoría o los muevas a otra.</p>` }))) return;
          const r = await C.setCategoryActive(c.id, !c.active);
          if (!r.ok) return ui.toast(r.error, 'error');
          ui.toast(`Categoría ${c.active ? 'desactivada' : 'activada'}.`); render(el);
          el.querySelector(`[data-ctoggle="${c.id}"]`)?.focus();
        }
      });
      render(el);
    }
    return { title: 'Categorías', html, mount };
  };

  /* =======================================================
     USUARIOS
     ======================================================= */
  A.users = function () {
    const ROLES = JP.auth.ROLES;
    const me = JP.auth.current();
    const soyAdmin = me && me.role === 'admin';
    const BADGE = { admin: 'badge--dark', empleado: 'badge--gold', cliente: 'badge--muted' };
    const html = `
      ${head('Usuarios', soyAdmin ? 'Elegí el rol de cada cuenta. Las cuentas nuevas siempre empiezan como cliente.' : 'Clientes registrados en la tienda.')}
      <form class="toolbar" id="uFilters" role="search" aria-label="Buscar usuarios">
        <div class="input-icon">${I('search', { size: 18 })}<label class="sr-only" for="uq">Buscar ${soyAdmin ? 'usuarios' : 'clientes'}</label><input id="uq" name="q" type="search" placeholder="Nombre, correo o teléfono"></div>
        ${soyAdmin ? `<label class="sr-only" for="ur">Filtrar por rol</label><select id="ur" name="role"><option value="">Todos los roles</option>${Object.entries(ROLES).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>` : ''}
      </form>
      <p class="muted small" id="uCount" aria-live="polite"></p>
      <div class="table-wrap"><table class="table table--cards"><thead><tr><th scope="col">Nombre</th><th scope="col">Correo</th><th scope="col">Teléfono</th>${soyAdmin ? '<th scope="col">Rol</th>' : ''}<th scope="col">Alta</th><th scope="col">Pedidos</th></tr></thead><tbody id="uRows"></tbody></table></div>`;

    function roleCell(u) {
      if (!soyAdmin || u.id === me.id) {
        return `<span class="badge ${BADGE[u.role] || ''}">${ROLES[u.role] || u.role}</span>${u.id === me.id ? ' <small class="muted">(vos)</small>' : ''}`;
      }
      return `<label class="sr-only" for="role-${U.esc(u.id)}">Rol de ${U.esc(u.name)}</label>
        <select class="role-select" id="role-${U.esc(u.id)}" data-role-user="${U.esc(u.id)}">${Object.entries(ROLES).map(([k, l]) => `<option value="${k}"${u.role === k ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
    }

    function mount(el) {
      const f = el.querySelector('#uFilters');
      function render() {
        const d = ui.formData(f);
        const q = U.normalize(d.q);
        const digits = String(d.q || '').replace(/\D/g, '');
        // Los empleados solo ven a los clientes
        const role = soyAdmin ? d.role : 'cliente';
        const list = JP.auth.users().filter(u => (!role || u.role === role) && (!q
            || U.normalize(u.name).includes(q) || U.normalize(u.email).includes(q)
            || (digits.length >= 3 && String(u.phone || '').replace(/\D/g, '').includes(digits))))
          .sort((a, b) => a.name.localeCompare(b.name, 'es'));
        const word = soyAdmin ? 'usuario' : 'cliente';
        el.querySelector('#uCount').textContent = `${list.length} ${word}${list.length === 1 ? '' : 's'}`;
        el.querySelector('#uRows').innerHTML = list.length ? list.map(u => `<tr>
            <td data-label="Nombre"><strong>${U.esc(u.name)}</strong></td><td data-label="Correo">${U.esc(u.email)}</td><td data-label="Teléfono">${U.esc(u.phone || '—')}</td>
            ${soyAdmin ? `<td data-label="Rol">${roleCell(u)}</td>` : ''}<td data-label="Alta">${U.fmtDate(u.createdAt)}</td><td data-label="Pedidos">${JP.orders.forUser(u.id).length}</td></tr>`).join('')
          : `<tr><td colspan="${soyAdmin ? 6 : 5}">${ui.empty({ icon: 'users', title: q ? 'No hay usuarios con esa búsqueda' : soyAdmin ? 'No hay usuarios con ese rol' : 'Todavía no hay clientes registrados' })}</td></tr>`;
      }
      f.addEventListener('input', U.debounce(render, 150)); f.addEventListener('change', e => { if (!e.target.closest('[data-role-user]')) render(); }); f.addEventListener('submit', e => { e.preventDefault(); render(); });

      // Cambio de rol (solo administración)
      el.addEventListener('change', async e => {
        const sel = e.target.closest('[data-role-user]');
        if (!sel) return;
        const u = JP.auth.users().find(x => x.id === sel.dataset.roleUser);
        if (!u) return;
        const role = sel.value;
        const msg = { admin: 'tendrá acceso a <strong>todo el panel</strong>, incluido el cambio de roles.', empleado: 'podrá entrar al panel para gestionar productos, pedidos, categorías, usuarios y ajustes.', cliente: 'ya no podrá entrar al panel de administración.' }[role];
        const ok = await ui.confirm({ title: `¿Cambiar a ${ROLES[role]}?`, html: `<p><strong>${U.esc(u.name)}</strong> ${msg}</p>`, confirmText: 'Cambiar rol' });
        if (!ok) { sel.value = u.role; return; }
        sel.disabled = true;
        const r = await JP.auth.setRole(u.id, role);
        if (!r.ok) { sel.value = u.role; sel.disabled = false; return ui.toast(r.error, 'error'); }
        ui.toast(`${u.name} ahora es ${ROLES[role]}.`, 'success');
        render();
      });
      render();
    }
    return { title: 'Usuarios', html, mount };
  };

  /* =======================================================
     ESTADÍSTICAS
     ======================================================= */
  A.stats = function () {
    const s = JP.stats.summary();
    const st = JP.stats.byStatus();
    const pay = JP.stats.byPayment();
    const months = JP.stats.byMonth(6);
    const top = JP.stats.topProducts(5);
    const low = C.lowStockVariants();
    const maxM = Math.max(1, ...months.map(m => m.registered));
    const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
    const ticket = s.registeredCount ? Math.round(s.registeredSales / s.registeredCount) : 0;
    const STATUS_TONE = { recibido: 'info', en_preparacion: 'warn', listo: 'warn', entregado: 'ok', cancelado: 'muted' };
    const PAY_TONE = { pendiente: 'warn', informado: 'info', verificado: 'ok' };

    // Barra apilada (100 %) con leyenda: muestra cómo se reparte un total.
    function stack(rows, total) {
      return `<div class="stackbar" role="img" aria-label="${rows.map(r => `${r.label}: ${r.count}`).join(', ')}">
          ${rows.filter(r => r.count).map(r => `<span class="stackbar__seg stackbar__seg--${r.tone}" style="width:${(r.count / total * 100).toFixed(2)}%"></span>`).join('')}
        </div>
        <ul class="slegend">${rows.map(r => `<li><i class="sdot sdot--${r.tone}"></i><span>${U.esc(r.label)}</span><strong>${r.count}</strong><span class="muted">${pct(r.count, total)}%</span></li>`).join('')}</ul>`;
    }

    const html = `
      ${head('Estadísticas', 'Calculadas con los pedidos guardados. Los pedidos cancelados no cuentan como venta.')}

      <div class="kpis">
        ${kpi('receipt', 'Ventas registradas', U.money(s.registeredSales), `${s.registeredCount} pedidos no cancelados`)}
        ${kpi('checkCircle', 'Ingresos confirmados', U.money(s.verifiedRevenue), `${s.verifiedCount} con pago verificado`, 'ok')}
        ${kpi('clock', 'Pagos a confirmar', U.money(s.registeredSales - s.verifiedRevenue), `${s.paymentsToVerify} pedido${s.paymentsToVerify === 1 ? '' : 's'}`, 'warn')}
        ${kpi('tag', 'Ticket promedio', U.money(ticket), 'por pedido no cancelado')}
      </div>

      <section class="card">
        <div class="card__head"><h2>Ventas por mes</h2><p class="legend"><span><i class="lg lg--reg"></i>Registradas</span><span><i class="lg lg--ok"></i>Confirmadas</span></p></div>
        ${months.some(m => m.count) ? `<div class="vchart" role="img" aria-label="Ventas registradas y confirmadas de los últimos 6 meses">
          ${months.map(m => `<div class="vchart__col">
            <span class="vchart__val">${m.registered ? U.money(m.registered) : ''}</span>
            <div class="vchart__bars"><span class="vchart__bar" style="height:${(m.registered / maxM * 100).toFixed(1)}%" title="Registradas: ${U.money(m.registered)}"></span><span class="vchart__bar vchart__bar--ok" style="height:${(m.verified / maxM * 100).toFixed(1)}%" title="Confirmadas: ${U.money(m.verified)}"></span></div>
            <span class="vchart__label">${U.esc(m.label)}<small>${m.count} ped.</small></span></div>`).join('')}
        </div>
        <details class="sdetails"><summary>Ver tabla por mes</summary>
          <table class="table table--compact"><thead><tr><th scope="col">Mes</th><th scope="col">Pedidos</th><th scope="col">Registradas</th><th scope="col">Confirmadas</th></tr></thead><tbody>${months.map(m => `<tr><td>${U.esc(m.label)}</td><td>${m.count}</td><td>${U.money(m.registered)}</td><td>${U.money(m.verified)}</td></tr>`).join('')}</tbody></table>
        </details>` : '<p class="muted">No hay ventas en los últimos 6 meses.</p>'}
      </section>

      <div class="agrid agrid--2 agrid--eq">
        <section class="card"><div class="card__head"><h2>Pedidos por estado</h2><span class="muted small">${s.totalOrders} en total</span></div>
          ${s.totalOrders ? stack(st.map(x => ({ label: x.label, count: x.count, tone: STATUS_TONE[x.key] })), s.totalOrders) : '<p class="muted">Sin pedidos.</p>'}</section>
        <section class="card"><div class="card__head"><h2>Estado de los pagos</h2><span class="muted small">pedidos no cancelados</span></div>
          ${s.registeredCount ? stack(pay.map(x => ({ label: x.label, count: x.count, tone: PAY_TONE[x.key] })), s.registeredCount) : '<p class="muted">Sin pedidos.</p>'}</section>
      </div>

      <div class="agrid agrid--2 agrid--eq">
        <section class="card"><div class="card__head"><h2>Más vendidos</h2><span class="muted small">unidades</span></div>
          ${top.length ? `<ol class="rank">${top.map((t, i) => `<li><span class="rank__n">${i + 1}</span><span class="rank__name">${U.esc(t.name)}<small>${U.money(t.amount)}</small></span>
            <span class="rank__bar"><span style="width:${(t.qty / top[0].qty * 100).toFixed(0)}%"></span></span><strong>${t.qty}</strong></li>`).join('')}</ol>` : '<p class="muted">Sin datos suficientes.</p>'}</section>
        <section class="card"><div class="card__head"><h2>Stock bajo</h2><a class="link-arrow" href="#/admin/productos?stock=bajo">Ver productos ${I('arrowRight', { size: 16 })}</a></div>
          <div class="mini-kpis"><div><strong>${low.filter(x => x.level === 'agotado').length}</strong><span>sin stock</span></div><div><strong>${low.filter(x => x.level === 'bajo').length}</strong><span>con menos de ${C.lowThreshold()}</span></div></div>
          ${low.length ? `<ul class="alist alist--scroll">${low.slice(0, 8).map(x => `<li><span><a href="#/admin/productos/${x.product.id}">${U.esc(x.product.name)}</a><small>${U.esc(C.variantLabel(x.variant.size, x.variant.color))}</small></span><span class="pill pill--${x.level}">${x.variant.stock} u.</span></li>`).join('')}</ul>
            ${low.length > 8 ? `<p class="muted small">y ${low.length - 8} variantes más.</p>` : ''}` : `<p class="muted">Ninguna variante tiene menos de ${C.lowThreshold()} unidades.</p>`}</section>
      </div>`;
    return { title: 'Estadísticas', html };
  };

  /* =======================================================
     AJUSTES
     ======================================================= */
  /** Reduce una foto (máx. 1600 px de ancho, JPG) para que entre en el almacenamiento del navegador. */
  function compressImage(file, maxW) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, (maxW || 1600) / img.naturalWidth);
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen')); };
      img.src = url;
    });
  }
  A._compressImage = compressImage;

  A.settings = function () {
    const s = JP.repo.getSettings();
    const banners = U.deepClone(s.banners || []);
    const delivery = U.deepClone(s.deliveryOptions || []);
    const t = Object.assign({ alias: '', cbu: '', holder: '', bankName: '', note: '' }, s.transfer || {});
    const links = [['#/catalogo', 'Todos los productos'], ['#/catalogo?disp=pedido', 'Productos por pedido'], ['#/catalogo?dest=1', 'Destacados'], ['#/catalogo?nuevo=1', 'Nuevos ingresos']]
      .concat(C.categories({ includeInactive: true }).flatMap(c => [['#/catalogo?cat=' + c.id, c.name]]
        .concat(C.subcategories(c.id).map(x => ['#/catalogo?cat=' + c.id + '&sub=' + x.id, c.name + ' › ' + x.name]))));

    const html = `
      ${head('Ajustes', 'Configuración de la tienda.')}
      <nav class="anchors" aria-label="Secciones de ajustes"><a href="#" data-goto="sBan">Publicidades</a><a href="#" data-goto="sPay">Pagos</a><a href="#" data-goto="sContact">Contacto</a><a href="#" data-goto="sDel">Entregas</a><a href="#" data-goto="sGeneral">Stock</a></nav>

      <form class="card form" id="sBan"><div class="card__head"><h2>Marco publicitario</h2><button type="button" class="btn btn--ghost btn--sm" id="addBan">${I('plus', { size: 16 })}Agregar publicidad</button></div>
        <p class="muted small">Aparecen debajo del inicio y se deslizan solas cada 5 segundos. Podés subir una foto para cada una (se recomienda horizontal, por ejemplo 1600 × 600). No cargues promociones ni descuentos que no existan.</p>
        <div id="banRows"></div>
        <div class="row-btns row-btns--end"><button class="btn btn--primary" type="submit">${I('check', { size: 16 })}Guardar publicidades</button></div></form>

      <form class="card form" id="sPay"><h2>Pagos</h2>
        <h3 class="form__sub">Datos para transferencias</h3>
        <p class="muted small">Se muestran al cliente cuando elige pagar por transferencia y en la confirmación del pedido. ${!t.alias && !t.cbu ? '<strong>Todavía no cargaste los datos: completalos para que los clientes puedan transferir.</strong>' : ''}</p>
        <div class="row-2">
          <div class="field"><label for="s-alias">Alias</label><input id="s-alias" name="alias" maxlength="40" value="${U.esc(t.alias)}"></div>
          <div class="field"><label for="s-cbu">CBU o CVU</label><input id="s-cbu" name="cbu" inputmode="numeric" maxlength="22" value="${U.esc(t.cbu)}"><p class="field-hint">22 números.</p></div>
        </div>
        <div class="row-2">
          <div class="field"><label for="s-holder">Nombre completo del titular</label><input id="s-holder" name="holder" maxlength="80" value="${U.esc(t.holder)}"></div>
          <div class="field"><label for="s-bank">Banco o billetera <span class="muted">(opcional)</span></label><input id="s-bank" name="bankName" maxlength="40" value="${U.esc(t.bankName)}"></div>
        </div>
        <div class="field"><label for="s-tnote">Aclaración <span class="muted">(opcional)</span></label><input id="s-tnote" name="note" maxlength="160" placeholder="Ej.: enviá el comprobante por WhatsApp" value="${U.esc(t.note)}"></div>
        <h3 class="form__sub">Seña para productos por pedido (solo para retirar)</h3>
        <label class="check"><input type="checkbox" name="depEnabled" ${s.deposit && s.deposit.enabled ? 'checked' : ''}> Pedir seña en productos por pedido</label>
        <p class="field-hint">La seña solo se pide cuando el pedido es <strong>para retirar</strong> (modalidades que no piden dirección). Con envío a domicilio no se pide seña.</p>
        <div class="row-2"><div class="field"><label for="s-dp">Porcentaje de seña</label><input id="s-dp" name="depPercent" type="number" min="1" max="100" value="${s.deposit ? Number(s.deposit.percent) : 30}"></div>
        <div class="field"><label for="s-dn">Aclaración para el cliente</label><input id="s-dn" name="depNote" maxlength="160" value="${U.esc(s.deposit ? s.deposit.note : '')}"></div></div>
        <div class="row-btns row-btns--end"><button class="btn btn--primary" type="submit">${I('check', { size: 16 })}Guardar pagos</button></div></form>

      <form class="card form" id="sContact"><h2>Contacto</h2>
        <div class="row-2">
          <div class="field"><label for="s-wa">Número de WhatsApp</label><input id="s-wa" name="whatsapp" type="tel" placeholder="Ej.: 54 9 387 4123456" value="${U.esc(s.whatsapp || '')}"><p class="field-hint">Con código de país (54) y de área. Lo usa el botón "WhatsApp" del pedido.</p></div>
          <div class="field"><label for="s-ig">Usuario de Instagram</label><div class="input-prefix"><span>@</span><input id="s-ig" name="instagram" value="${U.esc(s.instagram)}"></div></div>
        </div>
        <div class="row-btns row-btns--end"><button class="btn btn--primary" type="submit">${I('check', { size: 16 })}Guardar contacto</button></div></form>

      <form class="card form" id="sDel"><div class="card__head"><h2>Modalidades de entrega</h2><button type="button" class="btn btn--ghost btn--sm" id="addDel">${I('plus', { size: 16 })}Agregar modalidad</button></div>
        <p class="muted small">Si una modalidad "pide dirección", el cliente completa provincia, ciudad, código postal, calle y número.</p>
        <div id="delRows"></div>
        <div class="row-btns row-btns--end"><button class="btn btn--primary" type="submit">${I('check', { size: 16 })}Guardar entregas</button></div></form>

      <form class="card form" id="sGeneral"><h2>Stock</h2>
        <div class="field field--narrow"><label for="s-low">Umbral de stock bajo</label><input id="s-low" name="lowStockThreshold" type="number" min="1" max="50" value="${Number(s.lowStockThreshold) || 3}"><p class="field-hint">Avisa cuando una variante tiene menos de este número.</p></div>
        <div class="row-btns row-btns--end"><button class="btn btn--primary" type="submit">${I('check', { size: 16 })}Guardar</button></div></form>

      ${JP.auth.isAdmin() ? `<section class="card card--danger" id="sDanger"><h2>Borrar todos los productos</h2>
        <p>Elimina <strong>todos los productos</strong> del catálogo, con sus talles, colores y stock, para cargar los productos reales desde cero.</p>
        <p class="muted small">Los pedidos ya hechos, las cuentas, las categorías y los ajustes no se borran. Esta acción no se puede deshacer.</p>
        <button type="button" class="btn btn--danger" id="delAllProducts">${I('trash', { size: 18 })}Borrar todos los productos</button></section>` : ''}`;

    function mount(el) {
      const del = el.querySelector('#delAllProducts');
      if (del) del.addEventListener('click', async () => {
        const n = C.products().length;
        if (!n) return ui.toast('No hay productos para borrar.', 'info');
        const ok = await ui.confirm({ danger: true, title: 'Borrar todos los productos', confirmText: `Borrar ${n} producto${n === 1 ? '' : 's'}`,
          html: `<p>Se van a borrar <strong>${n} producto${n === 1 ? '' : 's'}</strong> con todo su stock.</p><p>Los pedidos ya hechos se conservan. Esta acción no se puede deshacer.</p>` });
        if (!ok) return;
        const r = await ui.busy(del, () => C.deleteAllProducts());
        if (!r.ok) return ui.toast(r.error, 'error');
        ui.toast('Se borraron todos los productos. Ya podés cargar los nuevos desde Productos.', 'success');
        JP.router.go('/admin/productos');
      });
      U.qsa('[data-goto]', el).forEach(a => a.addEventListener('click', e => { e.preventDefault(); const f = el.querySelector('#' + a.dataset.goto); f.scrollIntoView({ behavior: 'smooth' }); f.querySelector('input, select, button').focus({ preventScroll: true }); }));

      function renderBan() {
        el.querySelector('#banRows').innerHTML = banners.map((b, i) => `<fieldset class="banedit" data-i="${i}"><legend class="sr-only">Publicidad ${i + 1}</legend>
          <div class="banedit__media">
            <div class="banedit__preview${b.image ? ' has-img' : ''}">${b.image ? `<img src="${U.esc(b.image)}" alt="Foto de la publicidad ${i + 1}">` : `<span>${I('image', { size: 26 })}Sin foto</span>`}</div>
            <div class="row-btns">
              <label class="btn btn--ghost btn--sm file-btn">${I('upload', { size: 15 })}${b.image ? 'Cambiar foto' : 'Subir foto'}<input type="file" accept="image/*" class="sr-only" data-banimg="${i}"></label>
              ${b.image ? `<button type="button" class="btn btn--ghost btn--sm" data-rmimg="${i}">${I('trash', { size: 15 })}Quitar foto</button>` : ''}
            </div>
          </div>
          <div class="banedit__fields">
            <div class="row-2"><div class="field"><label for="bt-${i}">Título</label><input id="bt-${i}" data-k="title" value="${U.esc(b.title)}" maxlength="60"></div>
            <div class="field"><label for="bx-${i}">Texto</label><input id="bx-${i}" data-k="text" value="${U.esc(b.text)}" maxlength="160"></div></div>
            <div class="row-2"><div class="field"><label for="bc-${i}">Texto del botón</label><input id="bc-${i}" data-k="cta" value="${U.esc(b.cta)}" maxlength="30"></div>
            <div class="field"><label for="bl-${i}">Al tocar el botón, ir a</label><select id="bl-${i}" data-k="link">${links.map(([h, l]) => `<option value="${h}" ${b.link === h ? 'selected' : ''}>${U.esc(l)}</option>`).join('')}</select></div></div>
            <div class="row-btns"><label class="check"><input type="checkbox" data-k="active" ${b.active ? 'checked' : ''}> Visible</label>
              <span class="row-btns row-btns--end grow">
                <button type="button" class="icon-btn" data-move="${i}|-1" aria-label="Subir publicidad ${i + 1}" ${i === 0 ? 'disabled' : ''}>${I('chevronLeft', { size: 18, cls: 'rot90' })}</button>
                <button type="button" class="icon-btn" data-move="${i}|1" aria-label="Bajar publicidad ${i + 1}" ${i === banners.length - 1 ? 'disabled' : ''}>${I('chevronRight', { size: 18, cls: 'rot90' })}</button>
                <button type="button" class="btn btn--ghost btn--sm" data-rmban="${i}">${I('trash', { size: 15 })}Quitar</button></span></div>
          </div></fieldset>`).join('') || '<p class="muted">No hay publicidades: el carrusel no se mostrará.</p>';
      }
      function renderDel() {
        el.querySelector('#delRows').innerHTML = delivery.map((d, i) => `<fieldset class="repeat" data-i="${i}"><legend class="sr-only">Modalidad ${i + 1}</legend>
          <div class="row-2"><div class="field"><label for="dn-${i}">Nombre</label><input id="dn-${i}" data-k="name" value="${U.esc(d.name)}" maxlength="40"></div>
          <div class="field"><label for="dd-${i}">Descripción</label><input id="dd-${i}" data-k="description" value="${U.esc(d.description)}" maxlength="140"></div></div>
          <div class="row-btns"><label class="check"><input type="checkbox" data-k="active" ${d.active ? 'checked' : ''}> Habilitada</label><label class="check"><input type="checkbox" data-k="requiresAddress" ${d.requiresAddress ? 'checked' : ''}> Pide dirección</label><button type="button" class="btn btn--ghost btn--sm" data-rmdel="${i}">${I('trash', { size: 16 })}Quitar</button></div></fieldset>`).join('') || '<p class="muted">No hay modalidades.</p>';
      }
      const bind = (box, arr) => ['input', 'change'].forEach(ev => box.addEventListener(ev, e => {
        const fs = e.target.closest('[data-i]'); if (!fs || !e.target.dataset.k) return;
        arr[Number(fs.dataset.i)][e.target.dataset.k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      }));
      bind(el.querySelector('#delRows'), delivery);
      bind(el.querySelector('#banRows'), banners);

      // Fotos de las publicidades
      el.querySelector('#banRows').addEventListener('change', async e => {
        const inp = e.target.closest('[data-banimg]'); if (!inp) return;
        const file = inp.files[0]; inp.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) return ui.toast('El archivo debe ser una imagen.', 'error');
        if (file.size > 8 * 1024 * 1024) return ui.toast('La foto pesa más de 8 MB. Elegí una más liviana.', 'error');
        try {
          banners[Number(inp.dataset.banimg)].image = await compressImage(file, 1600);
          renderBan(); ui.toast('Foto lista. Tocá "Guardar publicidades" para publicarla.', 'info');
        } catch (err) { ui.toast('No se pudo leer la imagen.', 'error'); }
      });

      el.addEventListener('click', e => {
        const rd = e.target.closest('[data-rmdel]'); if (rd) { delivery.splice(Number(rd.dataset.rmdel), 1); renderDel(); }
        const rb = e.target.closest('[data-rmban]'); if (rb) { banners.splice(Number(rb.dataset.rmban), 1); renderBan(); }
        const ri = e.target.closest('[data-rmimg]'); if (ri) { banners[Number(ri.dataset.rmimg)].image = ''; renderBan(); }
        const mv = e.target.closest('[data-move]');
        if (mv) {
          const [i, dir] = mv.dataset.move.split('|').map(Number);
          const j = i + dir; if (j < 0 || j >= banners.length) return;
          [banners[i], banners[j]] = [banners[j], banners[i]]; renderBan();
          el.querySelector(`[data-move="${j}|${dir}"]`)?.focus();
        }
      });
      el.querySelector('#addDel').addEventListener('click', () => { delivery.push({ id: U.uid('ent'), name: '', description: '', requiresAddress: false, active: true }); renderDel(); el.querySelector(`#dn-${delivery.length - 1}`).focus(); });
      el.querySelector('#addBan').addEventListener('click', () => { banners.push({ id: U.uid('b'), kicker: '', title: '', text: '', cta: 'Ver productos', link: '#/catalogo', image: '', active: true }); renderBan(); el.querySelector(`#bt-${banners.length - 1}`).focus(); });

      const result = async (pr, msg) => { const r = await pr; if (r.ok) ui.toast(msg); else ui.toast(r.error || 'No se pudo guardar. Probá con una foto más liviana.', 'error'); return r; };
      el.querySelector('#sBan').addEventListener('submit', e => {
        e.preventDefault();
        if (banners.some(b => !String(b.title).trim())) return ui.toast('Todas las publicidades necesitan un título.', 'error');
        result(JP.settingsService.save({ banners: banners.map(b => ({ ...b, kicker: String(b.kicker || '').trim(), title: b.title.trim(), text: String(b.text).trim(), cta: String(b.cta).trim() })) }), 'Publicidades guardadas. Ya se ven en el inicio.');
      });
      el.querySelector('#sPay').addEventListener('submit', e => {
        e.preventDefault();
        const d = ui.formData(e.target);
        const errs = {};
        const cbu = String(d.cbu).replace(/\s/g, '');
        if (cbu && !/^\d{22}$/.test(cbu)) errs.cbu = 'El CBU o CVU tiene 22 números.';
        if (d.alias && !/^[A-Za-z0-9.\-]{6,20}$/.test(String(d.alias).trim())) errs.alias = 'El alias tiene entre 6 y 20 caracteres (letras, números, punto o guion).';
        const pct = U.toInt(d.depPercent, 1, 100);
        if (pct === null) errs.depPercent = 'Ingresá un porcentaje entero entre 1 y 100.';
        if (Object.keys(errs).length) return ui.showErrors(e.target, errs);
        ui.clearErrors(e.target);
        result(JP.settingsService.save({
          transfer: { alias: String(d.alias).trim().toUpperCase(), cbu, holder: String(d.holder).trim(), bankName: String(d.bankName).trim(), note: String(d.note).trim() },
          deposit: { enabled: !!d.depEnabled, percent: pct, note: String(d.depNote).trim() }
        }), 'Datos de pago guardados.');
      });
      el.querySelector('#sContact').addEventListener('submit', e => {
        e.preventDefault();
        const d = ui.formData(e.target);
        const errs = {};
        const wa = String(d.whatsapp).trim();
        if (wa && (wa.replace(/\D/g, '').length < 10 || !/^[\d\s()+-]+$/.test(wa))) errs.whatsapp = 'Ingresá el número con código de país y de área (solo números).';
        const ig = String(d.instagram).trim().replace(/^@/, '');
        if (!/^[A-Za-z0-9._]{1,30}$/.test(ig)) errs.instagram = 'Usuario no válido (solo letras, números, punto y guion bajo).';
        if (Object.keys(errs).length) return ui.showErrors(e.target, errs);
        ui.clearErrors(e.target);
        result(JP.settingsService.save({ whatsapp: wa, instagram: ig }), 'Datos de contacto guardados.');
      });
      el.querySelector('#sDel').addEventListener('submit', e => {
        e.preventDefault();
        if (delivery.some(d => !String(d.name).trim())) return ui.toast('Todas las modalidades necesitan un nombre.', 'error');
        if (!delivery.some(d => d.active)) return ui.toast('Dejá al menos una modalidad habilitada para poder recibir pedidos.', 'error');
        result(JP.settingsService.save({ deliveryOptions: delivery.map(d => ({ ...d, name: d.name.trim(), description: String(d.description).trim(), requiresAddress: !!d.requiresAddress })) }), 'Modalidades de entrega guardadas.');
      });
      el.querySelector('#sGeneral').addEventListener('submit', e => {
        e.preventDefault();
        const d = ui.formData(e.target);
        const errs = {};
        const low = U.toInt(d.lowStockThreshold, 1, 50); if (low === null) errs.lowStockThreshold = 'Ingresá un número entre 1 y 50.';
        if (Object.keys(errs).length) return ui.showErrors(e.target, errs);
        ui.clearErrors(e.target);
        result(JP.settingsService.save({ lowStockThreshold: low }), 'Ajustes de stock guardados.');
      });
      renderBan(); renderDel();
    }
    return { title: 'Ajustes', html, mount };
  };
})();
