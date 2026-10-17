/* =========================================================
   JERPRI · Cuentas, sesión y roles
   ---------------------------------------------------------
   Roles: admin (todo), empleado (productos, pedidos, categorías,
   usuarios y ajustes) y cliente (compra). Toda cuenta nueva es
   cliente; solo la administración cambia los roles.
   Registro, ingreso, sesión (cookie HttpOnly), contraseñas
   (cifradas con scrypt) y permisos los resuelve el servidor:
   cada función de acá llama a la API.
   ========================================================= */
window.JP = window.JP || {};

JP.auth = (function () {
  const R = JP.repo;
  const enc = encodeURIComponent;

  /** Usuario con sesión iniciada (lo manda el servidor al cargar los datos). */
  function current() { return JP.api.cache.me; }
  function isAdmin() { const u = current(); return !!u && u.role === 'admin'; }

  /* ---------------- Roles y permisos ---------------- */
  const ROLES = { admin: 'Administración', empleado: 'Empleado', cliente: 'Cliente' };
  // Secciones del panel que puede usar cada rol
  const ACCESS = {
    admin: ['resumen', 'productos', 'pedidos', 'categorias', 'usuarios', 'estadisticas', 'ajustes'],
    empleado: ['productos', 'pedidos', 'categorias', 'usuarios', 'ajustes'],
    cliente: []
  };
  /** ¿La cuenta es del personal de la tienda (administración o empleado)? */
  function isStaff() { const u = current(); return !!u && (u.role === 'admin' || u.role === 'empleado'); }
  /** ¿La cuenta actual puede entrar a esta sección del panel? */
  function can(section) { const u = current(); return !!u && (ACCESS[u.role] || []).includes(section); }
  /** Primera pantalla del panel según el rol. */
  function panelHome() { return can('resumen') ? '/admin' : '/admin/pedidos'; }

  /** Cambia el rol de una cuenta (solo administración y nunca la propia). */
  function setRole(userId, role) {
    if (!ROLES[role]) return { ok: false, error: 'Elegí un rol válido.' };
    return JP.api.send('PATCH', '/usuarios/' + enc(userId) + '/rol', { role });
  }

  async function register(d) {
    const r = await JP.api.send('POST', '/auth/registro', { name: d.name, email: d.email, phone: d.phone, password: d.password, confirm: d.confirm });
    if (r.ok) JP.utils.emit('auth:change');
    return r;
  }

  async function login(email, password) {
    const r = await JP.api.send('POST', '/auth/ingresar', { email, password });
    if (r.ok) JP.utils.emit('auth:change');
    return r;
  }

  async function logout() {
    const r = await JP.api.send('POST', '/auth/salir');
    JP.utils.emit('auth:change');
    return r;
  }

  function users() { return R.all('users'); }

  /* ---------------- Datos de la cuenta y direcciones ---------------- */
  function updateProfile(d) {
    return JP.api.send('PUT', '/cuenta', { name: d.name, phone: d.phone }).then(r => { if (r.ok) JP.utils.emit('auth:change'); return r; });
  }

  /** Valida una dirección. Devuelve {errors, data}. */
  function validateAddress(a) {
    const errors = {};
    const t = k => String((a || {})[k] || '').trim();
    const data = { province: t('province'), city: t('city'), zip: t('zip').toUpperCase(), street: t('street'), number: t('number').toUpperCase(), apt: t('apt') };
    if (!JP.utils.PROVINCES.includes(data.province)) errors.province = 'Elegí una provincia.';
    if (data.city.length < 2) errors.city = 'Ingresá la ciudad o localidad.';
    if (!/^(\d{4}|[A-Z]\d{4}[A-Z]{3})$/.test(data.zip)) errors.zip = 'Ingresá un código postal válido (por ejemplo 4400 o A4400XAB).';
    if (data.street.length < 2) errors.street = 'Ingresá la calle.';
    if (!/^(\d{1,6}[A-Z]?|S\/N)$/.test(data.number)) errors.number = 'Ingresá el número (o S/N si no tiene).';
    return { errors, data };
  }

  function addresses() { const u = current(); return u ? (u.addresses || []) : []; }

  /** Agrega o modifica una dirección de la cuenta. */
  function saveAddress(input) {
    return input.id ? JP.api.send('PUT', '/cuenta/direcciones/' + enc(input.id), input) : JP.api.send('POST', '/cuenta/direcciones', input);
  }
  function deleteAddress(id) { return JP.api.send('DELETE', '/cuenta/direcciones/' + enc(id)); }
  function setDefaultAddress(id) { return JP.api.send('PUT', '/cuenta/direcciones/' + enc(id) + '/principal'); }

  /* ---------------- Recuperar contraseña con código por SMS ----------------
     1) sendResetCode(teléfono)        → el servidor manda un código de 6 números al teléfono de la cuenta.
     2) verifyResetCode(teléfono, cód) → el servidor controla el código y devuelve un permiso (token).
     3) finishReset(token, clave, rep) → el servidor guarda la contraseña nueva (cifrada). */
  function sendResetCode(phone) { return JP.api.call('POST', '/auth/recuperar/codigo', { phone }); }
  function verifyResetCode(phone, code) { return JP.api.call('POST', '/auth/recuperar/verificar', { phone, code }); }
  function finishReset(token, password, confirm) { return JP.api.call('POST', '/auth/recuperar/cambiar', { token, password, confirm }); }

  return { current, isAdmin, isStaff, can, panelHome, setRole, ROLES, register, login, logout, sendResetCode, verifyResetCode, finishReset, users, updateProfile, validateAddress, addresses, saveAddress, deleteAddress, setDefaultAddress };
})();
