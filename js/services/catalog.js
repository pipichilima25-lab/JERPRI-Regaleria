/* =========================================================
   JERPRI · Servicio de catálogo
   Categorías, productos, variantes y stock.
   Los datos se leen de JP.api.cache (cargado desde PostgreSQL) y
   cada cambio se envía al servidor, que lo valida y lo guarda.
   ========================================================= */
window.JP = window.JP || {};

JP.catalog = (function () {
  const U = JP.utils;
  const R = JP.repo;
  const enc = encodeURIComponent;

  /* ¿Para quién es ideal cada producto? Lo usa "JERPRI te ayuda a elegir".
     Un producto sin ninguna marcada sirve para cualquiera. */
  const AUDIENCES = [
    ['mi', 'Para mí'], ['pareja', 'Mi pareja'], ['amistad', 'Un amigo o amiga'],
    ['familia', 'Alguien de mi familia'], ['peques', 'Un niño o niña']
  ];
  /** ¿El producto sirve para esa persona? */
  function forAudience(p, key) { return !key || !(p.audience || []).length || p.audience.includes(key); }
  /* ¿Es para mujer, para hombre o para los dos? ('' = para los dos) */
  const GENDERS = [['mujer', 'Mujer'], ['hombre', 'Hombre'], ['', 'Para los dos']];
  function forGender(p, g) { return !g || !p.gender || p.gender === g; }

  /* ---------------- Configuración relevante ---------------- */
  function lowThreshold() { return Number(R.getSettings().lowStockThreshold) || 3; }
  /** Productos por pedido: no hay un máximo configurable; 99 solo evita cantidades absurdas. */
  function maxPedido() { return 99; }

  /* ---------------- Categorías ---------------- */
  function categories(opts) {
    const all = R.all('categories');
    return opts && opts.includeInactive ? all : all.filter(c => c.active);
  }
  function category(id) { return R.get('categories', id); }

  function saveCategory(data) {
    return data.id ? JP.api.send('PUT', '/categorias/' + enc(data.id), data) : JP.api.send('POST', '/categorias', data);
  }
  function setCategoryActive(id, active) { return JP.api.send('PATCH', '/categorias/' + enc(id) + '/activa', { active: !!active }); }

  /* ---------------- Subcategorías ---------------- */
  function subcategories(categoryId, opts) {
    return R.all('subcategories')
      .filter(s => (!categoryId || s.categoryId === categoryId) && (opts && opts.includeInactive ? true : s.active))
      .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name, 'es'));
  }
  function subcategory(id) { return id ? R.get('subcategories', id) : null; }
  function productsInSubcategory(id) { return R.all('products').filter(p => p.subcategoryId === id); }

  function saveSubcategory(data) {
    return data.id ? JP.api.send('PUT', '/subcategorias/' + enc(data.id), data) : JP.api.send('POST', '/subcategorias', data);
  }
  function setSubcategoryActive(id, active) { return JP.api.send('PATCH', '/subcategorias/' + enc(id) + '/activa', { active: !!active }); }
  /** Elimina la subcategoría. Sus productos siguen en la categoría, sin subcategoría. */
  function deleteSubcategory(id) { return JP.api.send('DELETE', '/subcategorias/' + enc(id)); }
  function productsInCategory(id) { return R.all('products').filter(p => p.categoryId === id); }

  /* ---------------- Productos ---------------- */
  function products() { return R.all('products'); }
  function product(id) { return R.get('products', id); }

  /** Un producto es visible en la tienda si está activo y su categoría también. */
  function isPublic(p) {
    if (!p || !p.active) return false;
    const c = category(p.categoryId);
    return !!c && c.active;
  }
  function publicProducts() { return products().filter(isPublic); }

  /* ---------------- Variantes y stock ---------------- */
  function sizes(p) { return [...new Set(p.variants.map(v => v.size).filter(Boolean))]; }
  function colors(p) { return [...new Set(p.variants.map(v => v.color).filter(Boolean))]; }
  function colorHex(p, name) { const c = (p.colors || []).find(c => c.name === name); return c ? c.hex : (JP.COLORES[name] || '#CCCCCC'); }
  function hasOptions(p) { return sizes(p).length > 0 || colors(p).length > 0; }
  function findVariant(p, size, color) {
    return p.variants.find(v => (v.size || null) === (size || null) && (v.color || null) === (color || null)) || null;
  }
  function variant(p, variantId) { return p.variants.find(v => v.id === variantId) || null; }

  /**
   * Cantidad máxima que se puede pedir de una variante.
   * - Productos disponibles: el stock de esa variante.
   * - Productos por pedido: no se descuenta stock; se limita la cantidad por pedido.
   */
  function availableQty(p, v) {
    if (!p || !v || v.active === false) return 0;
    if (p.saleType === 'pedido') return maxPedido();
    return Math.max(0, Number(v.stock) || 0);
  }
  function isAvailable(p, v) { return availableQty(p, v) > 0; }

  function totalStock(p) { return p.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0); }

  /** Estado general para mostrar en tarjetas: pedido | agotado | bajo | disponible */
  function stockStatus(p) {
    if (p.saleType === 'pedido') return p.variants.some(v => v.active !== false) ? 'pedido' : 'agotado';
    const avail = p.variants.filter(v => v.stock > 0);
    if (!avail.length) return 'agotado';
    if (avail.every(v => v.stock < lowThreshold())) return 'bajo';
    return 'disponible';
  }

  function stockLabel(p) {
    return { pedido: 'Por pedido', agotado: 'Sin stock', bajo: 'Últimas unidades', disponible: 'Disponible' }[stockStatus(p)];
  }

  /** Variantes (solo productos con stock) por debajo del umbral. */
  function lowStockVariants() {
    const th = lowThreshold();
    const out = [];
    products().forEach(p => {
      if (p.saleType === 'pedido') return;
      p.variants.forEach(v => {
        if (v.active !== false && v.stock < th) out.push({ product: p, variant: v, level: v.stock === 0 ? 'agotado' : 'bajo' });
      });
    });
    return out.sort((a, b) => a.variant.stock - b.variant.stock);
  }

  function variantLabel(size, color) {
    const parts = [];
    if (size) parts.push('Talle ' + size);
    if (color) parts.push(color);
    return parts.join(' · ') || 'Único';
  }

  /* ---------------- Búsqueda y filtros ---------------- */
  /**
   * f: { q, cat, min, max, disp: ''|'disponible'|'stock'|'pedido', dest: bool, nuevo: bool, orden: ''|'precio-asc'|'precio-desc'|'nombre' }
   */
  function filter(f) {
    const q = U.normalize(f.q);
    const min = f.min !== '' && f.min != null ? Number(f.min) : null;
    const max = f.max !== '' && f.max != null ? Number(f.max) : null;
    let list = publicProducts().filter(p => {
      if (f.cat && p.categoryId !== f.cat) return false;
      if (f.sub && p.subcategoryId !== f.sub) return false;
      if (q) {
        const hay = U.normalize(p.name + ' ' + p.description + ' ' + (category(p.categoryId) || {}).name + ' ' + ((subcategory(p.subcategoryId) || {}).name || '') + ' ' + colors(p).join(' '));
        if (!q.split(/\s+/).every(w => hay.includes(w))) return false;
      }
      if (min != null && !isNaN(min) && p.price < min) return false;
      if (max != null && !isNaN(max) && p.price > max) return false;
      const st = stockStatus(p);
      if (f.disp === 'disponible' && st === 'agotado') return false;
      if (f.disp === 'stock' && (p.saleType !== 'stock' || st === 'agotado')) return false;
      if (f.disp === 'pedido' && p.saleType !== 'pedido') return false;
      if (f.dest && !p.featured) return false;
      if (f.nuevo && !p.isNew) return false;
      // Color y talle: tiene que existir UNA variante disponible que cumpla ambos.
      const cols = f.colors || [], szs = f.sizes || [];
      if (cols.length || szs.length) {
        const hit = p.variants.some(v => isAvailable(p, v) && (!cols.length || cols.includes(v.color)) && (!szs.length || szs.includes(v.size)));
        if (!hit) return false;
      }
      return true;
    });
    const byName = (a, b) => a.name.localeCompare(b.name, 'es');
    if (f.orden === 'precio-asc') list.sort((a, b) => a.price - b.price || byName(a, b));
    else if (f.orden === 'precio-desc') list.sort((a, b) => b.price - a.price || byName(a, b));
    else if (f.orden === 'nombre') list.sort(byName);
    else list.sort((a, b) => (b.featured - a.featured) || ((stockStatus(a) === 'agotado') - (stockStatus(b) === 'agotado')) || byName(a, b));
    return list;
  }

  function related(p, n) {
    return publicProducts().filter(x => x.categoryId === p.categoryId && x.id !== p.id).slice(0, n || 4);
  }

  /* ---------------- Alta, edición y baja (administración) ---------------- */
  /**
   * Valida y guarda un producto completo. Devuelve {ok, data} o {ok:false, errors:{campo:mensaje}}.
   * El precio nuevo NO afecta pedidos anteriores: cada pedido guarda su propia copia del precio.
   */
  function saveProduct(input) {
    const body = Object.assign({}, input);
    delete body.sizesText;
    return input.id && product(input.id) ? JP.api.send('PUT', '/productos/' + enc(input.id), body) : JP.api.send('POST', '/productos', body);
  }

  function setProductActive(id, active) { return JP.api.send('PATCH', '/productos/' + enc(id) + '/activo', { active: !!active }); }
  /** Eliminar no afecta los pedidos: guardan una copia de los datos del producto. */
  function deleteProduct(id) { return JP.api.send('DELETE', '/productos/' + enc(id)); }

  /** Borra TODOS los productos (solo administración). Los pedidos guardan su propia copia y no cambian. */
  function deleteAllProducts() {
    const u = JP.auth.current();
    if (!u || u.role !== 'admin') return { ok: false, error: 'Solo la administración puede borrar todos los productos.' };
    return JP.api.send('DELETE', '/productos', { confirmar: 'BORRAR' });
  }

  return {
    categories, category, saveCategory, setCategoryActive, productsInCategory,
    subcategories, subcategory, saveSubcategory, setSubcategoryActive, deleteSubcategory, productsInSubcategory,
    products, product, isPublic, publicProducts,
    sizes, colors, colorHex, hasOptions, findVariant, variant, availableQty, isAvailable, totalStock,
    stockStatus, stockLabel, lowStockVariants, variantLabel, lowThreshold, maxPedido,
    filter, related, saveProduct, AUDIENCES, forAudience, GENDERS, forGender, setProductActive, deleteProduct, deleteAllProducts
  };
})();
