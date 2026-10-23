/* =========================================================
   JERPRI · Utilidades generales
   Funciones puras sin dependencia de datos ni de la interfaz.
   ========================================================= */
window.JP = window.JP || {};

JP.utils = (function () {
  const moneyFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const dateFmt = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dateTimeFmt = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const monthFmt = new Intl.DateTimeFormat('es-AR', { month: 'short', year: '2-digit' });

  /** Formatea un número como pesos argentinos. */
  function money(n) { return moneyFmt.format(Number(n) || 0); }

  /** Escapa texto para insertarlo de forma segura en HTML. */
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /** Identificador aleatorio con prefijo (p. ej. "p-x8k2m1"). */
  function uid(prefix) {
    const rnd = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
    return (prefix ? prefix + '-' : '') + rnd;
  }

  /** Texto en minúsculas y sin tildes, para búsquedas. */
  function normalize(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  function slug(s) { return normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item'; }

  function fmtDate(iso) { try { return dateFmt.format(new Date(iso)); } catch (e) { return '—'; } }
  function fmtDateTime(iso) { try { return dateTimeFmt.format(new Date(iso)); } catch (e) { return '—'; } }
  function fmtMonth(date) { return monthFmt.format(date); }

  /** Convierte a entero y lo limita a un rango. Devuelve null si no es un número válido. */
  function toInt(value, min, max) {
    if (value === '' || value == null) return null;
    const n = Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
    if (min != null && n < min) return null;
    if (max != null && n > max) return null;
    return n;
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
  }

  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

  /** Valida un correo con una expresión simple. */
  function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim()); }

  /** Lee los parámetros de la parte "?a=1&b=2" del hash. */
  function parseQuery(qs) {
    const out = {};
    new URLSearchParams(qs || '').forEach((v, k) => { out[k] = v; });
    return out;
  }

  function buildQuery(obj) {
    const p = new URLSearchParams();
    Object.entries(obj).forEach(([k, v]) => { if (v !== '' && v != null && v !== false) p.set(k, v); });
    const s = p.toString();
    return s ? '?' + s : '';
  }

  const qs = (sel, ctx) => (ctx || document).querySelector(sel);
  const qsa = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /** Bus de eventos simple para avisar cambios entre módulos. */
  const bus = new EventTarget();
  function emit(name, detail) { bus.dispatchEvent(new CustomEvent(name, { detail })); }
  function on(name, fn) { bus.addEventListener(name, e => fn(e.detail)); }

  /** Provincias de Argentina, para el formulario de dirección. */
  const PROVINCES = ['Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy',
    'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
    'Tierra del Fuego', 'Tucumán'];

  /** Teléfono: solo números, espacios, guiones, paréntesis y +; entre 8 y 15 dígitos. */
  function isPhone(s) { const t = String(s || '').trim(); const d = t.replace(/\D/g, ''); return /^[\d\s()+-]+$/.test(t) && d.length >= 8 && d.length <= 15; }

  /**
   * Forma única de un teléfono argentino para comparar números escritos de distintas maneras:
   * "387 4123456", "0387 15 4123456" y "+54 9 387 4123456" dan todos "3874123456".
   */
  function phoneKey(s) {
    let d = String(s || '').replace(/\D/g, '');
    if (d.startsWith('549') && d.length >= 12) d = d.slice(3);
    else if (d.startsWith('54') && d.length >= 11) d = d.slice(2);
    if (d.startsWith('0')) d = d.slice(1);
    if (d.length === 12) for (const n of [2, 3, 4]) if (d.slice(n, n + 2) === '15') { d = d.slice(0, n) + d.slice(n + 2); break; }
    return d;
  }

  /** Dirección en una línea: "Calle 123, 2° B, Ciudad (CP 4400), Provincia". */
  function addressLine(a) {
    if (!a) return '';
    return `${a.street} ${a.number}${a.apt ? ', ' + a.apt : ''}, ${a.city} (CP ${a.zip}), ${a.province}`;
  }

  return { PROVINCES, isPhone, phoneKey, addressLine, money, esc, uid, normalize, slug, fmtDate, fmtDateTime, fmtMonth, toInt, debounce, deepClone, isEmail, parseQuery, buildQuery, qs, qsa, emit, on };
})();
