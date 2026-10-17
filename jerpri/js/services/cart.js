/* =========================================================
   JERPRI · Carrito y favoritos
   Para usar el carrito y los favoritos hay que iniciar sesión:
   cada cuenta tiene los suyos (se guardan en este navegador,
   separados por usuario). Sin sesión, agregar devuelve
   { ok: false, needLogin: 'cart' | 'fav' } y la tienda muestra
   el aviso para ingresar.
   Cada línea del carrito se identifica por la VARIANTE (talle +
   color), así dos talles del mismo producto son líneas distintas.
   ========================================================= */
window.JP = window.JP || {};

JP.cart = (function () {
  const S = () => JP.storage.local;
  const C = JP.catalog;
  const KEY = 'carts';   // { idDeUsuario: [líneas] }
  const LOGIN = { ok: false, needLogin: 'cart', error: 'Iniciá sesión para agregar productos al carrito.' };

  function owner() { const u = JP.auth.current(); return u ? u.id : null; }
  function all() { const m = S().get(KEY, {}); return m && !Array.isArray(m) ? m : {}; }
  function raw() { const k = owner(); return k ? (all()[k] || []) : []; }
  function persist(items) {
    const k = owner();
    if (!k) return LOGIN;
    const m = all(); m[k] = items;
    const ok = S().set(KEY, m);
    if (ok) JP.utils.emit('cart:change');
    return ok ? { ok: true } : { ok: false, error: 'No se pudo guardar el carrito en este navegador.' };
  }

  function qtyInCart(variantId) { const l = raw().find(i => i.variantId === variantId); return l ? l.qty : 0; }

  /** Agrega unidades validando que no se supere lo disponible. */
  function add(productId, variantId, qty) {
    if (!owner()) return LOGIN;
    const p = C.product(productId);
    if (!p || !C.isPublic(p)) return { ok: false, error: 'Este producto no está disponible.' };
    const v = C.variant(p, variantId);
    if (!v) return { ok: false, error: 'Elegí una variante válida.' };
    const n = JP.utils.toInt(qty, 1, 999);
    if (n === null) return { ok: false, error: 'La cantidad debe ser un número entero mayor a cero.' };
    const max = C.availableQty(p, v);
    if (max <= 0) return { ok: false, error: 'Esta variante no tiene stock disponible.' };
    const items = raw();
    const line = items.find(i => i.variantId === variantId);
    const current = line ? line.qty : 0;
    if (current + n > max) {
      const left = Math.max(0, max - current);
      return { ok: false, error: left ? `Solo podés agregar ${left} unidad${left === 1 ? '' : 'es'} más de esta variante.` : 'Ya tenés en el carrito todas las unidades disponibles de esta variante.' };
    }
    if (line) line.qty += n; else items.push({ productId, variantId, qty: n, addedAt: new Date().toISOString() });
    return persist(items);
  }

  function setQty(variantId, qty) {
    const items = raw();
    const line = items.find(i => i.variantId === variantId);
    if (!line) return { ok: false, error: 'La línea ya no está en el carrito.' };
    const n = JP.utils.toInt(qty, 1, 999);
    if (n === null) return { ok: false, error: 'La cantidad debe ser un número entero mayor a cero.' };
    const p = C.product(line.productId);
    const v = p && C.variant(p, variantId);
    const max = v ? C.availableQty(p, v) : 0;
    if (n > max) return { ok: false, error: max ? `Hay ${max} unidad${max === 1 ? '' : 'es'} disponible${max === 1 ? '' : 's'} de esta variante.` : 'Esta variante ya no tiene stock.' };
    line.qty = n;
    return persist(items);
  }

  function remove(variantId) { return persist(raw().filter(i => i.variantId !== variantId)); }
  function clear() { return persist([]); }
  function count() { return raw().reduce((s, i) => s + i.qty, 0); }

  /**
   * Resuelve las líneas con los datos actuales del catálogo y detecta problemas
   * (producto desactivado, variante eliminada o stock insuficiente).
   */
  function lines() {
    return raw().map(i => {
      const p = C.product(i.productId);
      const v = p ? C.variant(p, i.variantId) : null;
      let problem = null;
      let max = 0;
      if (!p || !v) problem = 'Este producto o variante ya no existe. Quitalo para continuar.';
      else if (!C.isPublic(p)) problem = 'Este producto ya no está disponible en la tienda.';
      else {
        max = C.availableQty(p, v);
        if (max <= 0) problem = 'Esta variante se quedó sin stock.';
        else if (i.qty > max) problem = `Solo quedan ${max} unidad${max === 1 ? '' : 'es'}. Ajustá la cantidad.`;
      }
      return { ...i, product: p, variant: v, max, problem, unitPrice: p ? p.price : 0, subtotal: p ? p.price * i.qty : 0 };
    });
  }

  /** deliveryOptionId: la seña solo se aplica si la modalidad elegida es de retiro (no pide dirección). */
  function summary(deliveryOptionId) {
    const ls = lines();
    const total = ls.filter(l => l.product).reduce((s, l) => s + l.subtotal, 0);
    const pedidoSubtotal = ls.filter(l => l.product && l.product.saleType === 'pedido').reduce((s, l) => s + l.subtotal, 0);
    const opt = deliveryOptionId ? (JP.repo.getSettings().deliveryOptions || []).find(o => o.id === deliveryOptionId) : null;
    const isPickup = !!opt && !opt.requiresAddress;
    return { lines: ls, total, pedidoSubtotal, hasProblems: ls.some(l => l.problem), deposit: isPickup ? depositFor(total, pedidoSubtotal) : null };
  }

  /** Seña opcional para productos por pedido, solo en pedidos para retirar (configurable en Ajustes). */
  function depositFor(total, pedidoSubtotal) {
    const d = JP.repo.getSettings().deposit || {};
    if (!d.enabled || !pedidoSubtotal) return null;
    const percent = Math.min(100, Math.max(1, Number(d.percent) || 0));
    const amount = Math.round(pedidoSubtotal * percent / 100);
    return { percent, amount, balance: total - amount, note: d.note || '' };
  }

  return { add, setQty, remove, clear, count, lines, summary, qtyInCart, depositFor };
})();

/* ---------------------------------------------------------
   Favoritos: se guardan por usuario. Sin sesión no hay favoritos.
   --------------------------------------------------------- */
JP.favorites = (function () {
  const S = () => JP.storage.local;
  const KEY = 'favorites';
  function owner() { const u = JP.auth.current(); return u ? u.id : null; }
  function map() { return S().get(KEY, {}) || {}; }
  function list() { const k = owner(); return k ? (map()[k] || []) : []; }
  function has(id) { return list().includes(id); }

  function toggle(productId) {
    const k = owner();
    if (!k) return { ok: false, needLogin: 'fav', error: 'Iniciá sesión para guardar favoritos.' };
    const m = map();
    const cur = m[k] || [];
    const added = !cur.includes(productId);
    m[k] = added ? cur.concat(productId) : cur.filter(x => x !== productId);
    if (!S().set(KEY, m)) return { ok: false, error: 'No se pudo guardar el favorito.' };
    JP.utils.emit('fav:change');
    return { ok: true, added };
  }

  /** Productos favoritos que todavía existen y se muestran en la tienda. */
  function products() { return list().map(id => JP.catalog.product(id)).filter(p => p && JP.catalog.isPublic(p)); }
  function count() { return products().length; }

  return { list, has, toggle, products, count };
})();
