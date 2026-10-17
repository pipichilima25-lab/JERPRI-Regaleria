/* =========================================================
   JERPRI · Estadísticas
   Todo se calcula en el momento a partir de los pedidos y
   productos guardados. No hay cifras fijas.
   - "Ventas registradas": pedidos no cancelados (pago o no).
   - "Ingresos verificados": pedidos no cancelados con pago
     verificado manualmente por la administración.
   Los pedidos cancelados nunca cuentan como venta.
   FUTURO BACKEND: estas consultas pasan a ser endpoints de reportes.
   ========================================================= */
window.JP = window.JP || {};

JP.stats = (function () {
  const C = JP.catalog;

  function active(o) { return o.status !== 'cancelado'; }
  function verified(o) { return active(o) && o.payment.status === 'verificado'; }
  const sum = list => list.reduce((s, o) => s + o.total, 0);

  function summary() {
    const orders = JP.orders.all();
    const products = C.products();
    const low = C.lowStockVariants();
    const activeOrders = orders.filter(active);
    return {
      activeProducts: products.filter(p => p.active).length,
      totalProducts: products.length,
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => active(o) && o.status !== 'entregado').length,
      paymentsToVerify: orders.filter(o => active(o) && o.payment.status !== 'verificado').length,
      cancelledOrders: orders.filter(o => !active(o)).length,
      registeredSales: sum(activeOrders),
      registeredCount: activeOrders.length,
      verifiedRevenue: sum(orders.filter(verified)),
      verifiedCount: orders.filter(verified).length,
      lowStockVariants: low.filter(x => x.level === 'bajo').length,
      outOfStockVariants: low.filter(x => x.level === 'agotado').length,
      outOfStockProducts: products.filter(p => p.active && C.stockStatus(p) === 'agotado').length,
      latest: orders.slice(0, 5)
    };
  }

  function byStatus() {
    const orders = JP.orders.all();
    return Object.entries(JP.orders.ORDER_STATUS).map(([k, label]) => ({ key: k, label, count: orders.filter(o => o.status === k).length }));
  }
  function byPayment() {
    const orders = JP.orders.all().filter(active);
    return Object.entries(JP.orders.PAYMENT_STATUS).map(([k, label]) => ({ key: k, label, count: orders.filter(o => o.payment.status === k).length }));
  }

  /** Unidades vendidas por producto (pedidos no cancelados). */
  function topProducts(n) {
    const map = {};
    JP.orders.all().filter(active).forEach(o => o.items.forEach(i => {
      const m = map[i.productId] || (map[i.productId] = { productId: i.productId, name: i.name, qty: 0, amount: 0 });
      m.qty += i.qty; m.amount += i.qty * i.unitPrice;
    }));
    return Object.values(map).sort((a, b) => b.qty - a.qty || b.amount - a.amount).slice(0, n || 5);
  }

  /** Totales por mes de los últimos `months` meses. */
  function byMonth(months) {
    const out = [];
    const now = new Date();
    for (let i = (months || 6) - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ key: d.getFullYear() + '-' + d.getMonth(), label: JP.utils.fmtMonth(d), registered: 0, verified: 0, count: 0 });
    }
    JP.orders.all().filter(active).forEach(o => {
      const d = new Date(o.createdAt);
      const row = out.find(r => r.key === d.getFullYear() + '-' + d.getMonth());
      if (!row) return;
      row.registered += o.total; row.count += 1;
      if (verified(o)) row.verified += o.total;
    });
    return out;
  }

  return { summary, byStatus, byPayment, topProducts, byMonth };
})();
