/* =========================================================
   JERPRI · Servicio de pedidos
   ---------------------------------------------------------
   Reglas:
   - Cada pedido guarda una COPIA de productos, variantes y
     precios del momento de la compra (no cambia si después se
     edita el producto).
   - Estado del pedido, estado del pago y estado de la entrega
     son independientes. Confirmar un pedido NO verifica el pago.
   - Política de stock: al confirmar el pedido se descuenta el
     stock de los productos disponibles (no de los "por pedido").
     Al cancelar se devuelve UNA sola vez (marca stockRestored).
   Todo se guarda en PostgreSQL a través del servidor: crear y
   cancelar son TRANSACCIONES (descuentan/devuelven stock y guardan
   el pedido juntos). Precios, stock y seña los calcula el servidor.
   ========================================================= */
window.JP = window.JP || {};

JP.orders = (function () {
  const R = JP.repo;
  const U = JP.utils;
  const path = (id, accion) => '/pedidos/' + encodeURIComponent(id) + '/' + accion;

  const ORDER_STATUS = {
    recibido: 'Recibido', en_preparacion: 'En preparación', listo: 'Listo para entregar', entregado: 'Entregado', cancelado: 'Cancelado'
  };
  const PAYMENT_STATUS = { pendiente: 'Pago a confirmar', informado: 'Pago informado', verificado: 'Pago verificado' };
  const DELIVERY_STATUS = { a_coordinar: 'A coordinar', coordinada: 'Coordinada', entregada: 'Entregada' };
  const PAYMENT_METHOD = { efectivo: 'Efectivo', transferencia: 'Transferencia bancaria' };

  function all() { return R.all('orders').sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  function get(id) { return R.get('orders', String(id || '').trim().toUpperCase()); }
  function forUser(userId) { return all().filter(o => o.userId === userId); }

  /** El servidor solo envía los pedidos que el usuario puede ver (los suyos, o todos si es del personal). */
  function canView(order) { return !!order; }

  /* ---------- Creación ---------- */
  /** Modalidad de entrega elegida (si está habilitada). */
  function deliveryOption(id) { return (R.getSettings().deliveryOptions || []).find(o => o.id === id && o.active) || null; }

  function validateCheckout(d) {
    const errors = {};
    if (String(d.name || '').trim().length < 3) errors.name = 'Ingresá tu nombre y apellido.';
    if (!U.isPhone(d.phone)) errors.phone = 'Ingresá un número de teléfono válido, con código de área.';
    if (d.email && !U.isEmail(d.email)) errors.email = 'El correo no es válido.';
    const opt = deliveryOption(d.deliveryOptionId);
    if (!opt) errors.deliveryOptionId = 'Elegí una modalidad de entrega.';
    if (opt && opt.requiresAddress) {
      const saved = d.addressId && d.addressId !== 'nueva' ? JP.auth.addresses().find(a => a.id === d.addressId) : null;
      if (!saved) {
        const v = JP.auth.validateAddress(d.address || {});
        Object.entries(v.errors).forEach(([k, m]) => { errors['address.' + k] = m; });
      }
    }
    if (!PAYMENT_METHOD[d.paymentMethod]) errors.paymentMethod = 'Elegí un medio de pago.';
    return { errors, opt };
  }

  /**
   * Crea el pedido en el servidor. El navegador solo manda qué productos y cuántos:
   * el servidor recalcula precios, stock y seña dentro de una transacción.
   */
  async function create(d) {
    const user = JP.auth.current();
    if (!user) return { ok: false, error: 'Iniciá sesión para confirmar tu compra.' };
    const { errors } = validateCheckout(d);
    if (Object.keys(errors).length) return { ok: false, errors, error: 'Revisá los datos marcados.' };
    const sum = JP.cart.summary(d.deliveryOptionId);
    if (!sum.lines.length) return { ok: false, error: 'Tu carrito está vacío.' };
    if (sum.hasProblems) return { ok: false, error: 'Algunos productos de tu carrito cambiaron de disponibilidad. Revisá el carrito antes de confirmar.' };
    const r = await JP.api.send('POST', '/pedidos', {
      name: d.name, phone: d.phone, deliveryOptionId: d.deliveryOptionId, addressId: d.addressId, address: d.address,
      saveAddress: !!d.saveAddress, notes: d.notes, paymentMethod: d.paymentMethod,
      items: sum.lines.map(l => ({ productId: l.productId, variantId: l.variantId, qty: l.qty }))
    });
    if (r.ok) JP.cart.clear();
    return r;
  }

  /* ---------- Cambios de estado (los valida y guarda el servidor) ---------- */
  function setStatus(id, status) { return JP.api.send('PATCH', path(id, 'estado'), { status }); }
  /** Verificación manual del pago por el personal. */
  function setPaymentStatus(id, status) { return JP.api.send('PATCH', path(id, 'pago'), { status }); }
  /** El cliente avisa que transfirió. NO verifica el pago. */
  function informPayment(id) { return JP.api.send('POST', path(id, 'informar-pago')); }
  function updateDelivery(id, data) { return JP.api.send('PATCH', path(id, 'entrega'), { status: data.status, notes: data.notes }); }
  /** Cancela y devuelve el stock UNA sola vez (transacción en el servidor). */
  function cancel(id, reason) { return JP.api.send('POST', path(id, 'cancelar'), { reason: reason || '' }); }

  /* ---------- Avisos (número rojo) ---------- */
  const after = (a, b) => !!a && (!b || a > b);
  /** Cliente: pedidos suyos que la tienda cambió y todavía no vio. */
  function customerUpdates() {
    const u = JP.auth.current();
    if (!u) return [];
    return forUser(u.id).filter(o => after(o.staffUpdatedAt, u.updatesSeenAt));
  }
  /** Personal: pedidos nuevos que nadie del personal vio todavía (es un aviso compartido). */
  function newForStaff() {
    if (!JP.auth.isStaff()) return [];
    return all().filter(o => o.staffSeen === false);
  }
  /**
   * Marca como vistos los avisos:
   * - 'pedidos': el personal entró a Pedidos → el aviso se va para TODO el personal (admin y empleados).
   * - 'novedades': el cliente entró a Mis pedidos → se va su aviso.
   */
  function markSeen(kind) {
    const u = JP.auth.current();
    if (!u) return Promise.resolve({ ok: false });
    if (kind === 'pedidos' && !newForStaff().length) return Promise.resolve({ ok: true });
    if (kind === 'novedades' && !customerUpdates().length) return Promise.resolve({ ok: true });
    return JP.api.send('POST', '/avisos/vistos', { tipo: kind });
  }

  return {
    customerUpdates, newForStaff, markSeen,
    ORDER_STATUS, PAYMENT_STATUS, DELIVERY_STATUS, PAYMENT_METHOD, deliveryOption,
    all, get, forUser, canView, validateCheckout, create,
    setStatus, setPaymentStatus, informPayment, updateDelivery, cancel
  };
})();
