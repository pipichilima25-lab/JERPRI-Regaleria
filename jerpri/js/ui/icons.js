/* =========================================================
   JERPRI · Íconos SVG (trazos de 24×24, estilo lineal)
   Uso: JP.icon('heart')  ·  JP.icon('heart', {fill:true, size:18})
   ========================================================= */
window.JP = window.JP || {};

(function () {
  const P = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5l-4.2-4.2"/>',
    heart: '<path d="M20.4 5.1a5.2 5.2 0 00-7.4 0L12 6.2l-1-1.1a5.2 5.2 0 00-7.4 7.4l1 1L12 20.9l7.4-7.4 1-1a5.2 5.2 0 000-7.4z"/>',
    bag: '<path d="M5.5 7.5h13l-1 13h-11z"/><path d="M9 9.5V6.5a3 3 0 016 0v3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0115 0"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
    chevronRight: '<path d="M9 18l6-6-6-6"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>',
    edit: '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 00-3-3L5 17z"/><path d="M13.5 8.5l3 3"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 2H4.5z"/><path d="M10 20.5a2 2 0 004 0"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/><path d="M9.5 6.5h5"/>',
    alert: '<path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.1"/>',
    truck: '<path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3.5v3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v.1M18 14.5v.1"/>',
    transfer: '<path d="M4 8.5h15l-3.5-3.5M20 15.5H5l3.5 3.5"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.3 6.7v.1"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    box: '<path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5L12 11.5l8.5-4M12 11.5v9"/>',
    receipt: '<path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 7.5h6M9 11h6M9 14.5h4"/>',
    tag: '<path d="M3.5 12.5v-9h9l8 8-9 9z"/><circle cx="8" cy="8" r="1.4"/>',
    users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 5a3.5 3.5 0 010 7M17.5 14.2A6 6 0 0121.5 20"/>',
    chart: '<path d="M4 20.5V11M10 20.5V4.5M16 20.5V13M21.5 20.5h-19"/>',
    sliders: '<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>',
    logout: '<path d="M14.5 4h4.5v16h-4.5M10 8l-4 4 4 4M6 12h11"/>',
    login: '<path d="M14.5 4h4.5v16h-4.5M9 8l4 4-4 4M13 12H3"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    refresh: '<path d="M20 12a8 8 0 11-2.4-5.7M20 4.5V9h-4.5"/>',
    store: '<path d="M3.5 9.5l1.5-5h14l1.5 5M4.5 9.5V20h15V9.5M3.5 9.5h17"/><path d="M9.5 20v-5.5h5V20"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    filter: '<path d="M3.5 5h17l-6.5 7.5v6l-4 2v-8z"/>',
    arrowRight: '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
    arrowLeft: '<path d="M19.5 12h-15M10.5 6l-6 6 6 6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16.5l-5-5-9.5 8.5"/>',
    upload: '<path d="M12 15.5V4M7 8.5l5-5 5 5M4 19.5h16"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    sparkle: '<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8zM18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5a1.5 1.5 0 00-1.5-1.5H5A1.5 1.5 0 003.5 5v9A1.5 1.5 0 005 15.5h3.5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 014.8 1c0 1.7-2.3 2-2.3 3.5M12 17.2v.1"/>',
    package: '<path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5L12 11.5l8.5-4M7.8 5.5l8.5 4"/>',
    whatsapp: '<path d="M4 20l1.2-3.6A8 8 0 1112 20a8 8 0 01-3.9-1z"/><path d="M9 8.6c0 3 2.4 5.6 5.4 6.2l1.2-1.3-1.8-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-1.8z"/>',
    // Íconos de categorías
    shoe: '<path d="M2.5 17.5h19"/><path d="M2.5 17.5V9.5l3.6 1.6L8.5 9l2.2 2.2c2 2 5 3 7.8 3.4 1.7.3 3 1.3 3 2.9"/><path d="M11 11.6l-1.4 1.8M13.6 13l-1.3 1.8"/>',
    bow: '<path d="M12 12L4 7v10zM12 12l8-5v10z"/><circle cx="12" cy="12" r="1.6"/>',
    gem: '<path d="M6.5 3.5h11l4 5.5L12 20.5 2.5 9z"/><path d="M2.5 9h19M12 20.5L8.5 9l3.5-5.5L15.5 9z"/>',
    gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M12 8v12.5M19 12v8.5H5V12"/><path d="M12 8S10.8 3.5 8.2 3.5a2.2 2.2 0 000 4.5M12 8s1.2-4.5 3.8-4.5a2.2 2.2 0 010 4.5"/>'
  };

  JP.icon = function (name, opts) {
    const o = opts || {};
    const size = o.size || 20;
    const body = P[name] || P.tag;
    const fill = o.fill ? 'currentColor' : 'none';
    return `<svg class="icon${o.cls ? ' ' + o.cls : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${o.stroke || 1.6}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  };
  JP.icon.paths = P;
})();
