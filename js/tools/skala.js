// Skalierung: eine Treppe von 0 bis 10, auf die man Punkte setzt.
import { h, img, uid, clamp } from '../util.js';
import { icon } from '../icons.js';
import { attachGesture } from '../gestures.js';
import { createHistory } from '../history.js';
import { phaseById } from '../data.js';
import { ask, segmented } from '../ui.js';

const MARKER = {
  heute: { label: 'Heute', bild: 'bilder/app/heute.svg', farbe: '#f76707' },
  ziel: { label: 'Ziel', bild: 'bilder/app/flagge.svg', farbe: '#f59f00' },
  schritt: { label: 'Nächster Schritt', bild: 'bilder/app/schritt.svg', farbe: '#2f9e44' },
  eigene: { label: 'Eigener Punkt', bild: 'bilder/app/eigene.svg', farbe: '#7048e8' },
};

const GESICHTER = { 0: 0, 3: 1, 5: 2, 7: 3, 10: 4 };

export default {
  create(phaseId) {
    return { frage: phaseById(phaseId).skalaFrage, modus: 'zahlen', marker: [] };
  },

  mount(container, { state, readOnly = false, onChange = () => {}, onHistory = () => {} }) {
    state.marker ||= [];
    state.modus ||= 'zahlen';

    const wrap = h('div', { class: 'tool tool-skala' + (readOnly ? ' readonly' : '') });
    const main = h('div', { class: 'tool-main skala-main' });
    const frage = h('button', { class: 'skala-frage glass' });
    const buehne = h('div', { class: 'skala-stage' });
    const stufenEl = h('div', { class: 'stufen' });
    const labels = h('div', { class: 'skala-labels' });
    const pins = h('div', { class: 'pins' });
    buehne.append(stufenEl, labels, pins);
    main.append(frage, buehne);
    wrap.append(main);
    container.append(wrap);

    const hist = createHistory(
      () => state,
      (s) => {
        Object.assign(state, s);
        allesZeichnen();
        onChange();
      },
      onHistory,
    );

    // ----- Treppe -----
    const stufen = [];
    for (let i = 0; i <= 10; i++) {
      const st = h('div', {
        class: 'stufe',
        style: {
          '--h': 12 + i * 8.8 + '%',
          '--sc': `color-mix(in srgb, var(--accent) ${22 + i * 7}%, white)`,
          '--delay': i * 35 + 'ms',
        },
      });
      stufen.push(st);
      stufenEl.append(st);
    }

    function labelsZeichnen() {
      labels.replaceChildren(
        ...stufen.map((_, i) => {
          if (state.modus === 'gesichter') {
            return h(
              'div',
              { class: 'slabel face' },
              i in GESICHTER ? img(`bilder/app/skala-${GESICHTER[i]}.svg`) : h('i', { class: 'mini' }),
            );
          }
          return h('div', { class: 'slabel' }, String(i));
        }),
      );
    }

    function frageZeichnen() {
      frage.replaceChildren(
        h('span', null, state.frage || 'Tippe hier, um eine Frage zu schreiben'),
        readOnly ? '' : icon('pencil', 'small'),
      );
      frage.classList.toggle('leer', !state.frage);
    }
    if (!readOnly) {
      frage.addEventListener('click', async () => {
        const t = await ask({ title: 'Frage zur Skala', value: state.frage, placeholder: 'Wie …?' });
        if (t !== null) {
          hist.push();
          state.frage = t;
          frageZeichnen();
          onChange();
        }
      });
    }

    // ----- Punkte (Marker) -----
    const pinEls = new Map();
    let auswahl = null;

    function geometrie(wert) {
      const st = stufen[wert];
      return { x: st.offsetLeft + st.offsetWidth / 2, top: st.offsetTop };
    }

    function wertAus(clientX) {
      const r = stufenEl.getBoundingClientRect();
      const rel = (clientX - r.left) / r.width;
      return clamp(Math.round(rel * 11 - 0.5), 0, 10);
    }

    /**
     * Setzt alle Punkte auf ihre Stufe. Überlappen sich Punkte, rutscht der
     * spätere nach oben. Ein gerade gezogener Punkt folgt frei dem Finger.
     */
    function anordnen(frei = null) {
      const belegt = [];
      const reihe = [...state.marker].sort((a, b) => a.wert - b.wert);
      for (const m of reihe) {
        const e = pinEls.get(m.id);
        if (!e) continue;
        const g = geometrie(m.wert);
        const w = e.offsetWidth || 120;
        const hh = e.offsetHeight || 52;
        let top = g.top - hh - 14;
        if (frei && frei.m === m) {
          e.style.left = frei.x + 'px';
          e.style.top = top + 'px';
          continue;
        }
        const x = g.x;
        const stoesst = () =>
          belegt.some(
            (r) => x - w / 2 < r.x + r.w / 2 + 4 && x + w / 2 > r.x - r.w / 2 - 4 && top < r.top + r.h + 6 && top + hh > r.top - 6,
          );
        while (stoesst()) top -= 6;
        belegt.push({ x, w, top, h: hh });
        e.style.left = x + 'px';
        e.style.top = top + 'px';
      }
    }

    function alleStufenMarkieren(heiss = null) {
      const belegt = new Set(state.marker.map((m) => m.wert));
      stufen.forEach((st, i) => {
        st.classList.toggle('has', belegt.has(i));
        st.classList.toggle('hot', i === heiss);
      });
      [...labels.children].forEach((l, i) => l.classList.toggle('hot', i === heiss || belegt.has(i)));
    }

    function pinBauen(m, { drop = false } = {}) {
      const art = MARKER[m.typ] || MARKER.eigene;
      const el = h(
        'div',
        { class: 'pin' + (drop ? ' drop' : ''), style: { '--pc': art.farbe } },
        h('div', { class: 'pin-body' }, img(art.bild), h('span', null, m.label || art.label)),
      );
      pinEls.set(m.id, el);
      pins.append(el);
      if (drop) setTimeout(() => el.classList.remove('drop'), 700);
      if (!readOnly) el._gesture = pinGeste(m, el);
      return el;
    }

    function pinGeste(m, el) {
      let vorher = null;
      let neu = false;
      return attachGesture(el, {
        onStart() {
          vorher = hist.capture();
          neu = !!m._neu;
          auswahlSetzen(null);
          el.classList.add('dragging');
        },
        onMove({ x }) {
          m.wert = wertAus(x);
          const r = buehne.getBoundingClientRect();
          const minX = geometrie(0).x;
          const maxX = geometrie(10).x;
          anordnen({ m, x: clamp(x - r.left, minX, maxX) });
          alleStufenMarkieren(m.wert);
        },
        onEnd({ moved }) {
          el.classList.remove('dragging');
          if (neu) {
            delete m._neu;
          } else if (moved) {
            hist.push(vorher);
          }
          alleSetzen();
          alleStufenMarkieren();
          stufen[m.wert].classList.add('bump');
          setTimeout(() => stufen[m.wert].classList.remove('bump'), 140);
          if (moved || neu) onChange();
          if (neu && m.typ === 'eigene' && !m.label) umbenennen(m);
        },
        onTap() {
          if (neu) return;
          auswahlSetzen(auswahl === m.id ? null : m.id);
        },
      });
    }

    function alleSetzen() {
      anordnen();
      auswahlLeiste();
    }

    async function umbenennen(m) {
      const t = await ask({
        title: 'Wie heißt dieser Punkt?',
        value: m.label || '',
        placeholder: 'z. B. Letzte Woche, Mein Wunsch …',
      });
      if (t === null) return;
      hist.push();
      m.label = t;
      pinEls.get(m.id)?.remove();
      pinEls.delete(m.id);
      pinBauen(m);
      alleSetzen();
      onChange();
    }

    function entfernen(m) {
      hist.push();
      state.marker = state.marker.filter((x) => x !== m);
      const el = pinEls.get(m.id);
      pinEls.delete(m.id);
      el?.classList.add('vanish');
      setTimeout(() => el?.remove(), 300);
      auswahlSetzen(null);
      alleSetzen();
      alleStufenMarkieren();
      onChange();
    }

    const leiste = h('div', { class: 'pin-actions glass hidden' });
    pins.append(leiste);

    function auswahlSetzen(id) {
      auswahl = id;
      pinEls.forEach((el, mid) => el.classList.toggle('selected', mid === id));
      auswahlLeiste();
    }

    function auswahlLeiste() {
      const m = state.marker.find((x) => x.id === auswahl);
      if (!m || readOnly) {
        leiste.classList.add('hidden');
        return;
      }
      leiste.replaceChildren(
        h('button', { class: 'tbtn', onClick: () => umbenennen(m) }, icon('pencil'), h('span', { class: 'tlabel' }, 'Name')),
        h('button', { class: 'tbtn danger', onClick: () => entfernen(m) }, icon('trash')),
      );
      leiste.classList.remove('hidden');
      const el = pinEls.get(m.id);
      const breite = leiste.offsetWidth;
      const x = clamp(parseFloat(el.style.left), breite / 2 + 4, buehne.clientWidth - breite / 2 - 4);
      leiste.style.left = x + 'px';
      leiste.style.top = parseFloat(el.style.top) - 62 + 'px';
    }

    buehne.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.pin') && !e.target.closest('.pin-actions')) auswahlSetzen(null);
    });

    function allesZeichnen() {
      pinEls.forEach((el) => el.remove());
      pinEls.clear();
      state.marker.forEach((m) => pinBauen(m));
      labelsZeichnen();
      frageZeichnen();
      auswahlSetzen(null);
      requestAnimationFrame(() => {
        alleSetzen();
        alleStufenMarkieren();
      });
    }

    const ro = new ResizeObserver(() => alleSetzen());
    ro.observe(buehne);
    allesZeichnen();

    // ----- Seitenleiste -----
    if (!readOnly) {
      const tray = h('div', { class: 'tray glass tray-skala' });
      const modusSchalter = segmented(
        [
          { value: 'zahlen', label: '0 – 10' },
          { value: 'gesichter', label: 'Gesichter' },
        ],
        state.modus,
        (v) => {
          hist.push();
          state.modus = v;
          labelsZeichnen();
          alleStufenMarkieren();
          onChange();
        },
      );
      tray.append(
        h('h3', null, 'Punkt setzen'),
        h('p', { class: 'tray-hint' }, 'Tippe oder ziehe einen Punkt auf die Treppe.'),
        h(
          'div',
          { class: 'marker-list' },
          Object.entries(MARKER).map(([typ, art]) => {
            const el = h(
              'button',
              { class: 'marker-chip', style: { '--pc': art.farbe } },
              img(art.bild),
              h('span', null, art.label),
              icon('plus', 'small'),
            );
            el.addEventListener('pointerdown', (e) => {
              if (e.button > 0) return;
              e.preventDefault();
              hist.push();
              const m = { id: uid(), typ, label: typ === 'eigene' ? '' : art.label, wert: 5, _neu: true };
              state.marker.push(m);
              const pin = pinBauen(m, { drop: true });
              anordnen();
              alleStufenMarkieren();
              pin._gesture.begin(e);
            });
            return el;
          }),
        ),
        h('h3', null, 'Ansicht'),
        modusSchalter,
      );
      wrap.append(tray);
    }

    return {
      destroy() {
        ro.disconnect();
        wrap.remove();
      },
      undo() {
        hist.undo();
      },
      canUndo: () => hist.canUndo,
    };
  },
};
