// Zeichnen und Schreiben mit dem Apple Pencil (oder dem Finger).
// Striche werden als Punktlisten gespeichert: [x, y, Druck].
import { getStroke } from './vendor/perfect-freehand.js';
import { h, s, uid } from './util.js';
import { icon } from './icons.js';
import { sheet } from './ui.js';
import { SVG_FORMEN, formSvg } from './formen.js';

export const STIFT_FARBEN = ['#1d2340', '#1c7ed6', '#e03131', '#2b9348', '#f76707', '#9c36b5'];

/** Gemeinsame Stift-Einstellungen für alle Flächen einer Sitzung. */
export const stift = {
  farbe: STIFT_FARBEN[0],
  dick: false,
  radierer: false,
  finger: false,
};

// Handballen-Erkennung: Solange der Pencil aufliegt (und kurz danach)
// zählen Berührungen mit der Hand nicht.
const stiftZustand = { gesehen: false, unten: 0, zuletzt: 0 };
export function stiftRunter() {
  stiftZustand.gesehen = true;
  stiftZustand.unten++;
  stiftZustand.zuletzt = performance.now();
}
export function stiftHoch() {
  stiftZustand.unten = Math.max(0, stiftZustand.unten - 1);
  stiftZustand.zuletzt = performance.now();
}
/** Ist diese Berührung vermutlich der Handballen beim Schreiben? */
export function istHandballen(e) {
  if (e.pointerType !== 'touch' || stift.finger || !stiftZustand.gesehen) return false;
  const seit = performance.now() - stiftZustand.zuletzt;
  // (Sicherheitsnetz: ein verlorenes „Stift hoch“ blockiert die Finger höchstens kurz)
  return (stiftZustand.unten > 0 && seit < 8000) || seit < 600;
}

/** Zeichnet der Zeiger (Pencil immer, Finger/Maus nur im Finger-Modus)? */
export const zeichnetZeiger = (e) => e.pointerType === 'pen' || stift.finger;

function umriss(outline) {
  if (outline.length < 2) return '';
  const r = (n) => Math.round(n * 100) / 100;
  const d = ['M', r(outline[0][0]), r(outline[0][1]), 'Q'];
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[(i + 1) % outline.length];
    d.push(r(x0), r(y0), r((x0 + x1) / 2), r((y0 + y1) / 2));
  }
  d.push('Z');
  return d.join(' ');
}

/** SVG-Pfad für einen Strich. punkte in Zielkoordinaten, groesse in denselben Einheiten. */
export function strichD(punkte, groesse, druck = true, fertig = true) {
  return umriss(
    getStroke(punkte, {
      size: groesse,
      thinning: druck ? 0.6 : 0.45,
      smoothing: 0.55,
      streamline: 0.4,
      simulatePressure: !druck,
      last: fertig,
      start: { cap: true, taper: 0 },
      end: { cap: true, taper: 0 },
    }),
  );
}

/** Liefert die Punkte eines Zeiger-Ereignisses (bei Pencil bis zu 240 pro Sekunde). */
export function ereignisPunkte(e) {
  const liste = e.getCoalescedEvents?.() || [];
  return liste.length ? liste : [e];
}

export const druckVon = (e) => (e.pointerType === 'pen' ? Math.max(0.05, e.pressure || 0.5) : 0.5);

// ---------------------------------------------------------------
// Handschrift auf Karten
// ---------------------------------------------------------------

/** SVG für die Handschrift einer Karte (skaliert mit der Karte mit). */
export function karteInkSvg(ink) {
  const svg = s('svg', {
    class: 'karte-ink',
    viewBox: `0 0 ${ink.vw} ${ink.vh}`,
    preserveAspectRatio: 'xMidYMid meet',
  });
  for (const st of ink.striche || []) {
    svg.append(s('path', { d: strichD(st.p, st.g, st.druck), fill: st.farbe }));
  }
  return svg;
}

const GROESSE_KARTE = { duenn: 16, dick: 30 };
export const kartenStiftGroesse = () => (stift.dick ? GROESSE_KARTE.dick : GROESSE_KARTE.duenn);

/**
 * Großes Schreibfeld in Form der Karte.
 * Liefert die neue Handschrift oder null bei Abbruch.
 */
export function schreibfeld({ titel = 'Schreib auf die Karte', form, farbe, ink, seitenverhaeltnis }) {
  return new Promise((resolve) => {
    const vw = ink?.vw || 1000;
    const vh = ink?.vh || Math.round(1000 * seitenverhaeltnis);
    const striche = (ink?.striche || []).map((st) => ({ ...st }));
    let fertig = false;

    // Größe des Feldes an den Bildschirm anpassen
    const maxB = Math.min(860, window.innerWidth - 120);
    const maxH = Math.min(window.innerHeight * 0.58, 560);
    const faktor = Math.min(maxB / vw, maxH / vh);
    const breite = Math.round(vw * faktor);
    const hoehe = Math.round(vh * faktor);

    const svg = s('svg', { class: 'pad-ink', viewBox: `0 0 ${vw} ${vh}`, preserveAspectRatio: 'none' });
    const leer = h('div', { class: 'pad-leer' }, icon('pencil'), 'Schreib oder male hier');
    const flaeche = h(
      'div',
      {
        class: `karte ${form} pad` + (SVG_FORMEN[form] ? ' form-svg' : ''),
        style: { '--c': farbe, width: breite + 'px', height: hoehe + 'px' },
      },
      SVG_FORMEN[form] ? formSvg(form) : null,
      leer,
      svg,
    );

    function zeichnen() {
      svg.replaceChildren(...striche.map((st) => s('path', { d: strichD(st.p, st.g, st.druck), fill: st.farbe })));
      leer.classList.toggle('weg', striche.length > 0);
      undoBtn.disabled = striche.length === 0;
      loeschBtn.disabled = striche.length === 0;
    }

    // --- Zeichnen ---
    let aktiv = null;
    const lokal = (e) => {
      const r = svg.getBoundingClientRect();
      return [
        Math.round(((e.clientX - r.left) / r.width) * vw * 10) / 10,
        Math.round(((e.clientY - r.top) / r.height) * vh * 10) / 10,
      ];
    };
    flaeche.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (istHandballen(e)) return;
      if (e.pointerType === 'pen') {
        stiftRunter();
        // Lag die Hand zuerst auf, war das kein Strich – der Stift hat Vorrang
        if (aktiv && aktiv.typ !== 'pen') {
          aktiv.pfad.remove();
          aktiv = null;
        }
      }
      if (aktiv) return;
      flaeche.setPointerCapture(e.pointerId);
      const druck = e.pointerType === 'pen';
      aktiv = {
        id: e.pointerId,
        typ: e.pointerType,
        strich: { id: uid(), farbe: stift.farbe, g: kartenStiftGroesse(), druck, p: [[...lokal(e), druckVon(e)]] },
        pfad: s('path', { fill: stift.farbe }),
      };
      svg.append(aktiv.pfad);
      leer.classList.add('weg');
    });
    flaeche.addEventListener('pointermove', (e) => {
      if (!aktiv || e.pointerId !== aktiv.id) return;
      for (const pe of ereignisPunkte(e)) aktiv.strich.p.push([...lokal(pe), druckVon(pe)]);
      aktiv.pfad.setAttribute('d', strichD(aktiv.strich.p, aktiv.strich.g, aktiv.strich.druck, false));
    });
    const ende = (e) => {
      if (e.pointerType === 'pen') stiftHoch();
      if (!aktiv || e.pointerId !== aktiv.id) return;
      striche.push(aktiv.strich);
      aktiv = null;
      zeichnen();
    };
    flaeche.addEventListener('pointerup', ende);
    flaeche.addEventListener('pointercancel', ende);

    // --- Bedienleiste ---
    const farbKnoepfe = h('div', { class: 'ink-dots' });
    function farbenZeichnen() {
      farbKnoepfe.replaceChildren(
        ...STIFT_FARBEN.map((f) =>
          h('button', {
            class: 'ink-dot' + (f === stift.farbe ? ' active' : ''),
            style: { '--f': f },
            'aria-label': 'Stiftfarbe',
            onClick: () => {
              stift.farbe = f;
              farbenZeichnen();
            },
          }),
        ),
        h(
          'button',
          {
            class: 'tbtn dicke' + (stift.dick ? ' active' : ''),
            'aria-label': 'Strichstärke',
            onClick: () => {
              stift.dick = !stift.dick;
              farbenZeichnen();
            },
          },
          h('span', { class: 'dicke-strich' + (stift.dick ? ' dick' : '') }),
          stift.dick ? 'dick' : 'dünn',
        ),
      );
    }
    farbenZeichnen();

    const undoBtn = h(
      'button',
      {
        class: 'gbtn glass',
        onClick: () => {
          striche.pop();
          zeichnen();
        },
      },
      icon('undo'),
      'Zurück',
    );
    const loeschBtn = h(
      'button',
      {
        class: 'gbtn glass',
        onClick: () => {
          striche.length = 0;
          zeichnen();
        },
      },
      icon('eraser'),
      'Alles löschen',
    );
    const inhalt = h(
      'div',
      { class: 'pad-wrap' },
      flaeche,
      h('div', { class: 'pad-tools' }, farbKnoepfe),
      h(
        'div',
        { class: 'actions pad-actions' },
        undoBtn,
        loeschBtn,
        h(
          'button',
          {
            class: 'gbtn primary',
            onClick: () => {
              fertig = true;
              blatt.close();
              resolve({ vw, vh, striche });
            },
          },
          icon('check'),
          'Fertig',
        ),
      ),
    );
    const blatt = sheet({
      title: titel,
      content: inhalt,
      wide: true,
      cls: 'sheet-pad',
      onClose: () => {
        if (!fertig) resolve(null);
      },
    });
    zeichnen();
  });
}

// ---------------------------------------------------------------
// Stiftleiste auf der Arbeitsfläche
// ---------------------------------------------------------------

export function stiftleiste({ onClear, onChange = () => {} }) {
  const bar = h('div', { class: 'inkbar glass' });
  function zeichnen() {
    bar.replaceChildren(
      h('span', { class: 'ink-badge', title: 'Mit dem Stift zeichnen' }, icon('pencil', 'small')),
      ...STIFT_FARBEN.map((f) =>
        h('button', {
          class: 'ink-dot' + (f === stift.farbe && !stift.radierer ? ' active' : ''),
          style: { '--f': f },
          'aria-label': 'Stiftfarbe',
          onClick: () => {
            stift.farbe = f;
            stift.radierer = false;
            zeichnen();
            onChange();
          },
        }),
      ),
      h('i', { class: 'ink-sep' }),
      h(
        'button',
        {
          class: 'tbtn' + (stift.dick ? ' active' : ''),
          'aria-label': 'Strichstärke',
          onClick: () => {
            stift.dick = !stift.dick;
            zeichnen();
          },
        },
        h('span', { class: 'dicke-strich' + (stift.dick ? ' dick' : '') }),
      ),
      h(
        'button',
        {
          class: 'tbtn' + (stift.radierer ? ' active' : ''),
          'aria-label': 'Radierer',
          onClick: () => {
            stift.radierer = !stift.radierer;
            zeichnen();
            onChange();
          },
        },
        icon('eraser'),
      ),
      h(
        'button',
        {
          class: 'tbtn' + (stift.finger ? ' active' : ''),
          'aria-label': 'Mit dem Finger zeichnen',
          onClick: () => {
            stift.finger = !stift.finger;
            zeichnen();
            onChange();
          },
        },
        icon('hand'),
        stift.finger ? h('span', { class: 'tlabel' }, 'Finger malt') : '',
      ),
      h('button', { class: 'tbtn danger', 'aria-label': 'Zeichnung löschen', onClick: onClear }, icon('trash')),
    );
  }
  zeichnen();
  return { el: bar, refresh: zeichnen };
}

// ---------------------------------------------------------------
// Schreibfeld direkt in der Seite (z. B. auf dem Commitment-Kärtchen)
// ---------------------------------------------------------------

/**
 * Fläche, auf die man mit Stift oder Finger schreibt.
 * onStart() wird vor jedem Strich aufgerufen (für Rückgängig),
 * onChange(ink) danach mit der neuen Handschrift.
 */
export function inkFeld({ ink = null, readOnly = false, onStart = () => {}, onChange = () => {} }) {
  let aktuell = ink;
  const svg = s('svg', { class: 'feld-ink', preserveAspectRatio: 'xMidYMid meet' });
  const el = h('div', { class: 'ink-feld' + (readOnly ? ' readonly' : '') }, svg);

  function zeichnen() {
    if (!aktuell) {
      svg.replaceChildren();
      svg.removeAttribute('viewBox');
      el.classList.remove('beschrieben');
      return;
    }
    svg.setAttribute('viewBox', `0 0 ${aktuell.vw} ${aktuell.vh}`);
    svg.replaceChildren(...aktuell.striche.map((st) => s('path', { d: strichD(st.p, st.g, st.druck), fill: st.farbe })));
    el.classList.toggle('beschrieben', aktuell.striche.length > 0);
  }
  zeichnen();
  if (readOnly) return { el, set: (i) => ((aktuell = i), zeichnen()) };

  let strich = null;
  let pfad = null;
  let masse = null;
  const punkt = (e) => {
    const { r, f, ox, oy } = masse;
    return [
      Math.round(((e.clientX - r.left - ox) / f) * 10) / 10,
      Math.round(((e.clientY - r.top - oy) / f) * 10) / 10,
      druckVon(e),
    ];
  };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (istHandballen(e)) return;
    if (e.pointerType === 'pen') {
      stiftRunter();
      // Lag die Hand zuerst auf, hat der Stift Vorrang
      if (strich && !strich.druck) {
        pfad.remove();
        strich = null;
      }
    }
    if (strich) return;
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    if (!aktuell) {
      aktuell = { vw: 1000, vh: Math.round((1000 * r.height) / r.width), striche: [] };
      svg.setAttribute('viewBox', `0 0 ${aktuell.vw} ${aktuell.vh}`);
    }
    const f = Math.min(r.width / aktuell.vw, r.height / aktuell.vh);
    masse = { r, f, ox: (r.width - aktuell.vw * f) / 2, oy: (r.height - aktuell.vh * f) / 2 };
    onStart();
    // Strichstärke in Bildschirm-Pixeln der unskalierten Karte
    const g = ((stift.dick ? 9 : 5) * aktuell.vw) / (el.offsetWidth || r.width);
    strich = { id: uid(), farbe: stift.farbe, g, druck: e.pointerType === 'pen', p: [punkt(e)], pid: e.pointerId };
    pfad = s('path', { fill: strich.farbe });
    svg.append(pfad);
  });
  el.addEventListener('pointermove', (e) => {
    if (!strich || e.pointerId !== strich.pid) return;
    for (const pe of ereignisPunkte(e)) strich.p.push(punkt(pe));
    pfad.setAttribute('d', strichD(strich.p, strich.g, strich.druck, false));
  });
  const ende = (e) => {
    if (e.pointerType === 'pen') stiftHoch();
    if (!strich || e.pointerId !== strich.pid) return;
    delete strich.pid;
    aktuell = { ...aktuell, striche: [...aktuell.striche, strich] };
    strich = null;
    zeichnen();
    onChange(aktuell);
  };
  el.addEventListener('pointerup', ende);
  el.addEventListener('pointercancel', ende);

  return {
    el,
    set(i) {
      aktuell = i;
      zeichnen();
    },
  };
}
