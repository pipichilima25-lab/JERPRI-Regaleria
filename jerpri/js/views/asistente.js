/* =========================================================
   JERPRI · 🎀 JERPRI te ayuda a elegir
   ---------------------------------------------------------
   Asistente con forma de chat. Hace tres preguntas:
     1) ¿Para quién buscás?   2) ¿Qué tipo de producto?   3) ¿Presupuesto?
   y muestra productos del catálogo que coinciden.
   Se puede responder tocando las opciones o escribiendo
   ("para mi novia", "aros", "hasta 10 mil", "entre 5000 y 15000").
   Todo pasa en el navegador: no se guarda nada.
   ========================================================= */
window.JP = window.JP || {};

JP.asistente = (function () {
  const U = JP.utils;
  const I = JP.icon;
  const C = JP.catalog;
  const N = s => U.normalize(s);

  const EMOJI_PARA = { mi: '🙋‍♀️', pareja: '💕', amistad: '🤝', familia: '👨‍👩‍👧', peques: '🧸' };
  const EMOJI_CAT = { calzado: '👟', accesorios: '🎀', bijouterie: '💍', regaleria: '🎁' };
  const RESPUESTA_PARA = {
    mi: '¡Me encanta! Darse un gusto siempre vale la pena ✨',
    pareja: '¡Qué lindo! 💕 Vamos a buscar algo especial.',
    amistad: '¡Las amistades se merecen lo mejor! 🎁',
    familia: '¡Un regalo para la familia, qué buena idea! 🏡',
    peques: '¡Para los más chiquitos! 🧸'
  };
  // Palabras que se pueden escribir para la pregunta 1
  const PALABRAS_PARA = [
    ['peques', /\b(hij[oa]s?|nen[ae]s?|niñ[oa]s?|nin[oa]s?|chic[oa]s?|sobrin[oa]s?|bebe|peque|nieto|nieta|infantil)/],
    ['pareja', /\b(pareja|novi[oa]|espos[oa]|marido|mi mujer|amor|enamorad)/],
    ['familia', /\b(mama|mami|madre|papa|papi|padre|herman[oa]|abuel[oa]|ti[oa]s?|prim[oa]|suegr[oa]|cunad[oa]|madrina|padrino|famil)/],
    ['amistad', /\b(amig[oa]s?|compa|colega|companer)/],
    ['mi', /\b(para mi|mi mism|yo\b|^mi$|^mi |para vos no|me lo|darme|regalarme)/]
  ];
  // Otras formas de nombrar lo que hay en el catálogo
  const SINONIMOS = {
    zapas: 'zapatillas', zapatos: 'calzado', zapato: 'calzado', aros: 'aritos', aritos: 'aritos', cadenita: 'collares', cadena: 'collares', collar: 'collares',
    pulsera: 'pulseras', anillo: 'anillos', dije: 'dijes', tobillera: 'tobilleras', sandalia: 'sandalias', ojota: 'ojotas', chinelas: 'ojotas',
    joya: 'bijouterie', joyas: 'bijouterie', bijou: 'bijouterie', bisuteria: 'bijouterie', regalo: 'regaleria', regalos: 'regaleria',
    pelo: 'accesorios', cabello: 'accesorios'
  };
  const PALABRAS_CUALQUIERA = /(sorprend|cualquier|lo que sea|no se|no importa|da igual|todo|de todo)/;

  /** Respuesta a "¿Para quién buscás?", teniendo en cuenta si es para él o para ella. */
  function respuestaPara(k, g) {
    const el = g === 'mujer' ? 'ella' : 'él';
    if (!g) return RESPUESTA_PARA[k] || '¡Perfecto! ✨';
    if (!k) return `¡Perfecto! Busco algo para ${el} ✨`;
    return {
      mi: RESPUESTA_PARA.mi,
      pareja: `¡Qué lindo! 💕 Vamos a buscar algo especial para ${el}.`,
      amistad: `¡Tu ${g === 'mujer' ? 'amiga' : 'amigo'} se merece lo mejor! 🎁`,
      familia: `¡Un regalo para ${el}, qué buena idea! 🏡`,
      peques: `¡Para ${g === 'mujer' ? 'una nena' : 'un nene'}! 🧸`
    }[k];
  }

  /* ---------------- Entender lo que escribe la persona ---------------- */
  /* Mujer u hombre, según la palabra que escribe (los botones no lo preguntan).
     "mi novio" → hombre · "mi mamá" → mujer · "mi familia" o "mis amigos" → los dos (''). */
  const PALABRAS_MUJER = /\b(novias?|esposas?|mujer(es)?|mamas?|mami|madres?|hermanas?|abuelas?|tias?|primas?|suegras?|cunadas?|hijas?|sobrinas?|nietas?|amigas?|nenas?|ninas?|chicas?|damas?|senoras?|madrinas?|ella)\b/;
  const PALABRAS_HOMBRE = /\b(novio|esposo|marido|hombre|papa|papi|padre|hermano|abuelo|tio|primo|suegro|cunado|hijo|sobrino|nieto|amigo|nene|nino|chico|varon|caballero|senor|padrino)\b/;
  function entenderGenero(texto) {
    const t = N(texto);
    const m = PALABRAS_MUJER.test(t), h = PALABRAS_HOMBRE.test(t);
    return m && !h ? 'mujer' : h && !m ? 'hombre' : '';
  }

  function entenderPara(texto) {
    const t = N(texto);
    for (const [k, re] of PALABRAS_PARA) if (re.test(t)) return k;
    const exacto = C.AUDIENCES.find(([, l]) => N(l) === t);
    return exacto ? exacto[0] : null;
  }

  /** Devuelve { cat, sub, q, label } o null. */
  function entenderTipo(texto) {
    const t = N(texto);
    if (!t) return null;
    if (PALABRAS_CUALQUIERA.test(t)) return { label: 'Sorprendeme' };
    const palabras = t.split(/[^a-z0-9ñ]+/).filter(w => w.length >= 3).map(w => SINONIMOS[w] || w);
    const raiz = w => w.slice(0, Math.max(4, Math.min(w.length, 6)));
    const coincide = nombre => { const n = N(nombre); return palabras.some(w => n.startsWith(raiz(w)) || raiz(n) === raiz(w)); };
    const cats = C.categories();
    for (const c of cats) for (const s of C.subcategories(c.id)) if (coincide(s.name)) return { cat: c.id, sub: s.id, label: s.name };
    for (const c of cats) if (coincide(c.name) || palabras.includes(c.id)) return { cat: c.id, label: c.name };
    // Por el nombre de un producto (ej.: "mochila", "billetera")
    for (const w of palabras.filter(w => w.length >= 4)) {
      if (C.publicProducts().some(p => N(p.name).includes(w))) return { q: w, label: w };
    }
    return null;
  }

  /** "hasta 10 mil", "15000", "entre 5 y 10 lucas", "más de 20k", "no importa" → { min, max } o null. */
  function entenderPresupuesto(texto) {
    const t = N(texto).replace(/\$/g, ' ');
    if (/(no importa|lo que sea|cualquier|sin limite|da igual|no se)/.test(t)) return { min: null, max: null };
    const nums = [];
    const re = /(\d+(?:[.,]\d+)*)\s*(k\b|mil\b|lucas?\b)?/g;
    let m;
    while ((m = re.exec(t))) {
      let raw = m[1];
      // "15.000" o "15,000" son miles; "2,5" es decimal
      if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) raw = raw.replace(/[.,]/g, '');
      else raw = raw.replace(',', '.');
      let n = parseFloat(raw);
      if (!Number.isFinite(n)) continue;
      if (m[2] || (n < 300 && /\b(mil|lucas?|k)\b/.test(t))) n *= 1000;
      else if (n < 300) n *= 1000;               // "hasta 10" = 10 mil
      nums.push(Math.round(n));
    }
    if (!nums.length) return null;
    if (nums.length >= 2) return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]) };
    if (/(mas de|desde|arriba de|mayor a|minimo)/.test(t)) return { min: nums[0], max: null };
    return { min: null, max: nums[0] };
  }

  /* ---------------- Buscar productos ---------------- */
  function candidatos(st) {
    return C.publicProducts().filter(p => C.forAudience(p, st.para) && C.forGender(p, st.genero)
      && (!st.cat || p.categoryId === st.cat) && (!st.sub || p.subcategoryId === st.sub)
      && (!st.q || N(p.name + ' ' + p.description).includes(N(st.q)))
      && C.stockStatus(p) !== 'agotado');
  }
  const enPresupuesto = (p, b) => (b.min == null || p.price >= b.min) && (b.max == null || p.price <= b.max);
  const orden = (a, b) => (b.featured - a.featured) || ((a.saleType === 'pedido') - (b.saleType === 'pedido')) || (a.price - b.price);

  /** Busca lo que coincide; si no hay nada, se acerca de a poco (presupuesto, después para quién). */
  function recomendar(st) {
    let lista = candidatos(st).filter(p => enPresupuesto(p, st.budget)).sort(orden);
    if (lista.length) return { lista, exacto: true };
    const ref = st.budget.max != null ? st.budget.max : st.budget.min;
    lista = candidatos(st).sort((a, b) => Math.abs(a.price - ref) - Math.abs(b.price - ref));
    if (lista.length) return { lista, exacto: false, motivo: 'presupuesto' };
    lista = candidatos(Object.assign({}, st, { para: null })).sort(orden);
    if (lista.length) return { lista, exacto: false, motivo: 'tipo' };
    lista = C.publicProducts().filter(p => C.stockStatus(p) !== 'agotado' && C.forAudience(p, st.para) && C.forGender(p, st.genero)).sort(orden);
    return { lista, exacto: false, motivo: 'nada' };
  }

  /** Rangos de precio "redondos" según los productos que quedan. */
  function rangos(st) {
    const precios = candidatos(st).map(p => p.price).sort((a, b) => a - b);
    const redondo = n => n >= 20000 ? Math.round(n / 5000) * 5000 : n >= 5000 ? Math.round(n / 1000) * 1000 : Math.max(1000, Math.round(n / 500) * 500);
    const out = [];
    if (precios.length >= 3) {
      const t1 = redondo(precios[Math.floor(precios.length / 3)]);
      const t2 = redondo(precios[Math.floor(precios.length * 2 / 3)]);
      out.push({ label: `Hasta ${U.money(t1)}`, min: null, max: t1 });
      if (t2 > t1) { out.push({ label: `${U.money(t1)} a ${U.money(t2)}`, min: t1, max: t2 }); out.push({ label: `Más de ${U.money(t2)}`, min: t2, max: null }); }
      else out.push({ label: `Más de ${U.money(t1)}`, min: t1, max: null });
    } else if (precios.length) {
      const t = redondo(precios[precios.length - 1]);
      out.push({ label: `Hasta ${U.money(t)}`, min: null, max: t });
    }
    out.push({ label: '💸 No importa', min: null, max: null });
    return out;
  }

  /* ---------------- Interfaz ---------------- */
  /** HTML del chat. */
  function html() {
    return `<div class="chat" data-chat>
      <div class="chat__head">
        <span class="chat__avatar" aria-hidden="true"><img src="assets/img/favicon.png" alt="" width="40" height="40"></span>
        <div class="chat__who"><strong>JERPRI te ayuda a elegir</strong><span class="chat__status"><span class="chat__dot"></span>En línea</span></div>
        <button type="button" class="icon-btn chat__restart" data-chat-restart aria-label="Empezar de nuevo" title="Empezar de nuevo">${I('refresh', { size: 18 })}</button>
        <button type="button" class="icon-btn chat__close" data-helper-close aria-label="Cerrar el chat" title="Cerrar">${I('close', { size: 18 })}</button>
      </div>
      <div class="chat__log" role="log" aria-live="polite" aria-label="Conversación con JERPRI" tabindex="0"></div>
      <div class="chat__chips" data-chat-chips aria-label="Respuestas rápidas"></div>
      <form class="chat__form" data-chat-form autocomplete="off">
        <label class="sr-only" for="chatInput">Escribí tu respuesta</label>
        <input id="chatInput" class="chat__input" name="msg" type="text" placeholder="Escribí tu respuesta…" maxlength="120">
        <button type="submit" class="chat__send" aria-label="Enviar">${I('arrowRight', { size: 20 })}</button>
      </form>
    </div>`;
  }

  /** Pone en marcha el chat que está dentro de `root`. */
  function mount(root) {
    const box = root.querySelector('[data-chat]');
    if (!box) return null;
    const log = box.querySelector('.chat__log');
    const chipsBox = box.querySelector('[data-chat-chips]');
    const form = box.querySelector('[data-chat-form]');
    const input = form.msg;
    const calma = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let st, cola = Promise.resolve(), sesion = 0;

    const vivo = () => box.isConnected;
    const espera = ms => new Promise(r => setTimeout(r, calma ? 0 : ms));
    const bajar = () => { log.scrollTop = log.scrollHeight; };

    function burbuja(quien, contenido, extraClase) {
      const b = document.createElement('div');
      b.className = `chat__msg chat__msg--${quien}${extraClase ? ' ' + extraClase : ''}`;
      b.innerHTML = contenido;
      log.appendChild(b); bajar();
      return b;
    }
    /** El bot "escribe" y después muestra el mensaje (en orden, uno detrás de otro). */
    function bot(contenido, extraClase) {
      const yo = sesion;
      cola = cola.then(async () => {
        if (!vivo() || yo !== sesion) return;
        const t = burbuja('bot', '<span class="chat__typing" aria-label="JERPRI está escribiendo"><i></i><i></i><i></i></span>', 'is-typing');
        await espera(Math.min(1100, 380 + String(contenido).replace(/<[^>]+>/g, '').length * 9));
        if (!vivo() || yo !== sesion) return t.remove();
        t.classList.remove('is-typing'); if (extraClase) t.classList.add(extraClase);
        t.innerHTML = contenido; bajar();
      });
      return cola;
    }
    function persona(texto) { burbuja('user', U.esc(texto)); }
    function opciones(lista) {
      const yo = sesion;
      cola = cola.then(() => {
        if (!vivo() || yo !== sesion) return;
        chipsBox.innerHTML = lista.map((o, i) => o.href
          ? `<a class="chat__chip chat__chip--link" href="${U.esc(o.href)}">${U.esc(o.label)}</a>`
          : `<button type="button" class="chat__chip" data-chip="${i}">${U.esc(o.label)}</button>`).join('');
        U.qsa('[data-chip]', chipsBox).forEach(b => b.addEventListener('click', () => {
          const o = lista[Number(b.dataset.chip)];
          chipsBox.innerHTML = '';
          persona(o.label);
          o.pick();
        }));
        bajar();
      });
    }
    const limpiarOpciones = () => { chipsBox.innerHTML = ''; };

    /* ---- Pregunta 1 ---- */
    function preguntarPara() {
      st.paso = 'para';
      bot('¿Para quién buscás?');
      opciones(C.AUDIENCES.map(([k, l]) => ({ label: `${EMOJI_PARA[k] || ''} ${l}`.trim(), pick: () => elegirPara(k) })));
    }
    function elegirPara(k, genero) {
      st.para = k || null; st.genero = genero || '';
      bot(respuestaPara(st.para, st.genero));
      preguntarTipo();
    }

    /* ---- Pregunta 2 ---- */
    function preguntarTipo() {
      st.paso = 'tipo';
      bot('¿Qué tipo de producto querés?');
      const cats = C.categories().filter(c => candidatos({ para: st.para, genero: st.genero, cat: c.id }).length);
      opciones(cats.map(c => ({ label: `${EMOJI_CAT[c.id] || '🛍️'} ${c.name}`, pick: () => elegirTipo({ cat: c.id, label: c.name }) }))
        .concat({ label: '✨ Sorprendeme', pick: () => elegirTipo({ label: 'Sorprendeme' }) }));
    }
    function elegirTipo(t) {
      st.cat = t.cat || null; st.sub = t.sub || null; st.q = t.q || null;
      bot(t.cat || t.sub || t.q ? `¡Buenísimo! Miro ${t.sub || t.q ? '<strong>' + U.esc(t.label) + '</strong>' : 'todo lo de <strong>' + U.esc(t.label) + '</strong>'} 👀` : '¡Me encantan los desafíos! Te muestro un poco de todo ✨');
      preguntarPresupuesto();
    }

    /* ---- Pregunta 3 ---- */
    function preguntarPresupuesto() {
      st.paso = 'presupuesto';
      bot('¿Cuál es tu presupuesto? <span class="chat__hint">Podés tocar una opción o escribir un monto, por ejemplo "hasta 15 mil".</span>');
      opciones(rangos(st).map(r => ({ label: r.label, pick: () => elegirPresupuesto({ min: r.min, max: r.max }) })));
    }
    function elegirPresupuesto(b) {
      st.budget = b;
      st.paso = 'fin';
      mostrarResultados();
    }

    /* ---- Resultados ---- */
    function tarjeta(p) {
      const img = ui().images(p)[0];
      return `<a class="chat-card" href="#/producto/${encodeURIComponent(p.id)}">
        <span class="chat-card__img"><img src="${U.esc(img.src)}" alt="" data-fallback="${U.esc(img.fallback)}" loading="lazy"></span>
        <span class="chat-card__name">${U.esc(p.name)}</span>
        <span class="chat-card__price">${U.money(p.price)}</span>
        <span class="chat-card__go">Ver ${I('arrowRight', { size: 14 })}</span></a>`;
    }
    function mostrarResultados() {
      const r = recomendar(st);
      const lista = r.lista.slice(0, 6);
      const b = st.budget;
      const texto = b.min != null && b.max != null ? `entre ${U.money(b.min)} y ${U.money(b.max)}` : b.max != null ? `hasta ${U.money(b.max)}` : b.min != null ? `de más de ${U.money(b.min)}` : '';
      if (!lista.length) {
        bot('Uy, por ahora no tenemos productos disponibles para recomendarte 😔. ¡Pronto vamos a cargar novedades!');
      } else if (r.exacto) {
        bot(`¡Listo! Encontré ${r.lista.length === 1 ? 'esta opción' : (r.lista.length > 6 ? 'estas opciones (te muestro las 6 mejores)' : `estas ${r.lista.length} opciones`)} para vos 👇`);
      } else if (r.motivo === 'presupuesto') {
        bot(`No encontré nada justo ${texto ? U.esc(texto) : 'con ese presupuesto'} 😅, pero estas opciones se acercan bastante 👇`);
      } else if (r.motivo === 'tipo') {
        bot('De ese tipo no encontré algo pensado para esa persona, pero estas opciones también pueden gustarle 👇');
      } else {
        bot('No encontré justo eso, pero mirá estas ideas que pueden gustarte 👇');
      }
      if (lista.length) {
        const yo = sesion;
        cola = cola.then(() => {
          if (!vivo() || yo !== sesion) return;
          const m = burbuja('bot', `<div class="chat__cards" role="list">${lista.map(p => `<div role="listitem">${tarjeta(p)}</div>`).join('')}</div>`, 'chat__msg--cards');
          U.qsa('img[data-fallback]', m).forEach(im => im.addEventListener('error', () => { if (im.src !== im.dataset.fallback) im.src = im.dataset.fallback; }, { once: true }));
        });
      }
      bot('¿Te ayudo con algo más? 😊');
      const q = {};
      if (st.cat) q.cat = st.cat;
      if (st.sub) q.sub = st.sub;
      if (st.q) q.q = st.q;
      if (r.exacto && b.min != null) q.min = b.min;
      if (r.exacto && b.max != null) q.max = b.max;
      opciones([
        { label: '🔄 Empezar de nuevo', pick: reiniciarDesdeChip },
        { label: 'Ver más en el catálogo', href: '#/catalogo' + U.buildQuery(q) }
      ]);
    }

    /* ---- Lo que escribe la persona ---- */
    form.addEventListener('submit', e => {
      e.preventDefault();
      const texto = input.value.trim();
      if (!texto) return;
      input.value = '';
      limpiarOpciones();
      persona(texto);
      if (/(de nuevo|reiniciar|empezar|otra vez|volver a empezar)/.test(N(texto))) return reiniciar(false);
      if (/^(hola|buenas|buen dia|buenas tardes|buenas noches)\b/.test(N(texto)) && st.paso === 'para') { bot('¡Hola! 👋'); return preguntarPara(); }
      if (st.paso === 'para') {
        const k = entenderPara(texto), g = entenderGenero(texto);
        if (k || g) return elegirPara(k, g);
        bot('Mmm, no te entendí 😅. Contame para quién es (por ejemplo "para mi mamá") o tocá una opción.');
        return preguntarParaOpciones();
      }
      if (st.paso === 'tipo') {
        const t = entenderTipo(texto);
        if (t) return elegirTipo(t);
        bot('No encontré ese tipo de producto 🤔. Probá con otra palabra (por ejemplo "aros" o "zapatillas") o tocá una opción.');
        return preguntarTipoOpciones();
      }
      if (st.paso === 'presupuesto') {
        const b = entenderPresupuesto(texto);
        if (b) return elegirPresupuesto(b);
        bot('No entendí el monto 😅. Escribilo con números, por ejemplo "hasta 15000" o "entre 5 y 10 mil".');
        return opciones(rangos(st).map(r => ({ label: r.label, pick: () => elegirPresupuesto({ min: r.min, max: r.max }) })));
      }
      bot('Si querés buscar otra cosa, empezamos de nuevo 😊');
      opciones([{ label: '🔄 Empezar de nuevo', pick: reiniciarDesdeChip }]);
    });
    const preguntarParaOpciones = () => opciones(C.AUDIENCES.map(([k, l]) => ({ label: `${EMOJI_PARA[k] || ''} ${l}`.trim(), pick: () => elegirPara(k) })));
    const preguntarTipoOpciones = () => {
      const cats = C.categories().filter(c => candidatos({ para: st.para, genero: st.genero, cat: c.id }).length);
      opciones(cats.map(c => ({ label: `${EMOJI_CAT[c.id] || '🛍️'} ${c.name}`, pick: () => elegirTipo({ cat: c.id, label: c.name }) }))
        .concat({ label: '✨ Sorprendeme', pick: () => elegirTipo({ label: 'Sorprendeme' }) }));
    };

    function reiniciarDesdeChip() { reiniciar(false); }
    function reiniciar(primeraVez) {
      sesion += 1; cola = Promise.resolve();
      st = { paso: 'para', para: null, genero: '', cat: null, sub: null, q: null, budget: { min: null, max: null } };
      limpiarOpciones();
      if (primeraVez) log.innerHTML = '';
      else burbuja('note', '— Empezamos de nuevo —');
      bot(primeraVez ? '¡Hola! 🎀 Soy JERPRI. Te hago <strong>tres preguntas</strong> y te muestro los productos que mejor van.' : '¡Dale! Arranquemos otra vez 🎀');
      preguntarPara();
    }
    box.querySelector('[data-chat-restart]').addEventListener('click', () => reiniciar(false));

    reiniciar(true);
    return { focus: () => input.focus({ preventScroll: true }) };
  }
  const ui = () => JP.ui;

  /* ---------------- Botón flotante (como el de WhatsApp) ----------------
     Un círculo chiquito arriba del botón de WhatsApp. Al tocarlo se abre
     el chat en una ventanita; la conversación sigue aunque se cambie de
     página dentro de la tienda. */
  const BURBUJA = `<svg class="hlp__ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v8a2.5 2.5 0 01-2.5 2.5H11l-4.6 3.6c-.5.4-1.4.1-1.4-.6V16h-.5A2.5 2.5 0 012 13.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" transform="translate(1 0)"/><circle cx="9" cy="9.6" r="1.1" fill="currentColor"/><circle cx="13" cy="9.6" r="1.1" fill="currentColor"/><circle cx="17" cy="9.6" r="1.1" fill="currentColor"/></svg>`;

  function floating() {
    return `<div class="hlp" data-helper>
      <div class="hlp__panel" id="helperPanel" role="dialog" aria-label="JERPRI te ayuda a elegir" hidden>${html()}</div>
      <p class="hlp__tip" id="helperTip" hidden><button type="button" class="hlp__tipbtn" data-action="open-helper">¿Te ayudo a elegir? 🎀</button><button type="button" class="hlp__tipx" aria-label="Ocultar sugerencia">${I('close', { size: 12 })}</button></p>
      <button type="button" class="hlp__btn" id="helperBtn" aria-controls="helperPanel" aria-expanded="false" aria-label="Abrir chat: JERPRI te ayuda a elegir" title="JERPRI te ayuda a elegir">
        ${BURBUJA}<span class="hlp__x" aria-hidden="true">${I('close', { size: 24 })}</span>
      </button>
    </div>`;
  }

  let abrirFlotante = null;
  /** Se llama cada vez que se dibuja la estructura de la tienda. */
  function mountFloating() {
    const root = document.querySelector('[data-helper]');
    if (!root) { abrirFlotante = null; return; }
    const panel = root.querySelector('#helperPanel');
    const btn = root.querySelector('#helperBtn');
    const tip = root.querySelector('#helperTip');
    let chat = null;

    function abrir() {
      ocultarTip();
      panel.hidden = false;
      requestAnimationFrame(() => root.classList.add('is-open'));
      btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-label', 'Cerrar el chat');
      if (!chat) chat = mount(panel);            // la conversación empieza la primera vez que se abre
      if (window.matchMedia('(min-width: 721px)').matches && chat) chat.focus();
    }
    function cerrar(devolverFoco) {
      root.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Abrir chat: JERPRI te ayuda a elegir');
      setTimeout(() => { if (!root.classList.contains('is-open')) panel.hidden = true; }, 180);
      if (devolverFoco) btn.focus();
    }
    const abierto = () => root.classList.contains('is-open');
    btn.addEventListener('click', () => (abierto() ? cerrar(false) : abrir()));
    root.querySelector('[data-helper-close]').addEventListener('click', () => cerrar(true));
    root.addEventListener('keydown', e => { if (e.key === 'Escape' && abierto()) { e.stopPropagation(); cerrar(true); } });
    // Al tocar un producto o "Ver más en el catálogo", se cierra para ver la página
    panel.addEventListener('click', e => { if (e.target.closest('a[href^="#/"]')) cerrar(false); });

    // Sugerencia chiquita, una sola vez por visita
    function ocultarTip() { tip.hidden = true; }
    tip.querySelector('.hlp__tipx').addEventListener('click', ocultarTip);
    // Al pasar el cursor (o llegar con el teclado) aparece la misma sugerencia
    let porCursor = false;
    const mostrarTip = () => { if (!abierto() && tip.hidden) { tip.hidden = false; porCursor = true; } };
    const quitarTip = () => { if (porCursor) { ocultarTip(); porCursor = false; } };
    btn.addEventListener('mouseenter', mostrarTip); btn.addEventListener('focus', () => { if (btn.matches(':focus-visible')) mostrarTip(); });
    btn.addEventListener('mouseleave', quitarTip); btn.addEventListener('blur', quitarTip);
    btn.addEventListener('click', () => { porCursor = false; });
    let visto = true;
    try { visto = !!sessionStorage.getItem('jerpri:helperTip'); sessionStorage.setItem('jerpri:helperTip', '1'); } catch (e) { /* sin acción */ }
    if (!visto) {
      setTimeout(() => { if (tip.isConnected && !abierto()) tip.hidden = false; }, 3500);
      setTimeout(() => { if (tip.isConnected) ocultarTip(); }, 11000);
    }
    abrirFlotante = abrir;
  }

  // Enlaces "Te ayudamos a elegir" (por ejemplo, en el pie de página)
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action="open-helper"]');
    if (!a || !abrirFlotante) return;
    e.preventDefault();
    abrirFlotante();
  });

  return { html, mount, floating, entenderGenero, mountFloating, open: () => abrirFlotante && abrirFlotante(), entenderPara, entenderTipo, entenderPresupuesto };
})();
