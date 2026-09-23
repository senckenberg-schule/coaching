// Skala als Element auf der Arbeitsfläche: eine Leiste von 0 bis 10,
// auf die man Punkte zieht. Mehrere Skalen lassen sich frei kombinieren,
// verschieben, drehen (z. B. senkrecht) und vergrößern.
import { h, img, uid, clamp } from '../util.js';
import { icon } from '../icons.js';
import { attachGesture } from '../gestures.js';
import { karteInkSvg, schreibfeld } from '../ink.js';
import { FARBEN } from '../data.js';
import { toast, segmented } from '../ui.js';
import { trayItem } from '../board.js';

export const MARKER = {
  heute: { label: 'Heute', bild: 'bilder/app/heute.svg', farbe: '#f76707' },
  ziel: { label: 'Ziel', bild: 'bilder/app/flagge.svg', farbe: '#f59f00' },
  schritt: { label: 'Nächster Schritt', bild: 'bilder/app/schritt.svg', farbe: '#2f9e44' },
  eigene: { label: 'Eigener Punkt', bild: 'bilder/app/eigene.svg', farbe: '#7048e8' },
};

const GESICHTER = { 0: 0, 3: 1, 5: 2, 7: 3, 10: 4 };
const FRAGE_BEREICH = [0.04, 0.03, 0.92, 0.28]; // hier schreibt man die Frage hin
const SPUR_LINKS = 7; // Prozent
const SPUR_BREITE = 86;
const pos = (wert) => SPUR_LINKS + (SPUR_BREITE * wert) / 10;

// Neu gesetzte Punkte einmal „hineinfallen“ lassen
const frisch = new Set();

export function neueSkala(extra = {}) {
  return { type: 'skala', modus: 'zahlen', farbe: null, titel: '', marker: [], rot: 0, scale: 1, ...extra };
}

export const SKALA_TYPE = {
  size: () => [52, 21],
  rotate: true,
  scale: true,
  schreibbar: true,
  inkBereich: () => FRAGE_BEREICH,
  inkSeiten: () => [1000, 250],
  radius: () => 'calc(var(--u) * 3.2)',
  render(it, inner, ctx) {
    inner.append(skalaElement(it, ctx));
  },
};

function skalaElement(it, ctx) {
  it.marker ||= [];
  const el = h('div', { class: 'skala-el' + (it.modus === 'gesichter' ? ' faces' : ''), style: { '--sc': it.farbe || 'var(--accent)' } });

  // Frage (Handschrift, früher getippter Text oder Platzhalter)
  const hatSchrift = it.ink?.striche?.length > 0;
  const frage = h(
    'div',
    { class: 'se-frage' },
    !hatSchrift && it.titel ? h('span', { class: 'se-frage-text' }, it.titel) : null,
    !hatSchrift && !it.titel ? h('span', { class: 'se-frage-leer' }, icon('pencil'), 'Frage') : null,
    it.ink ? karteInkSvg(it.ink) : null,
  );

  const belegt = new Set(it.marker.map((m) => m.wert));
  const spur = h('div', { class: 'se-spur' });
  const striche = [];
  for (let i = 0; i <= 10; i++) {
    let beschriftung;
    if (it.modus === 'gesichter') beschriftung = i in GESICHTER ? img(`bilder/app/skala-${GESICHTER[i]}.svg`) : h('b', { class: 'mini' });
    else beschriftung = String(i);
    striche.push(
      h('div', { class: 'se-tick' + (belegt.has(i) ? ' hot' : ''), style: { left: pos(i) + '%' } }, h('i'), h('span', null, beschriftung)),
    );
  }

  const pins = h('div', { class: 'se-pins' });
  const zaehler = {};
  for (const m of it.marker) {
    const stapel = (zaehler[m.wert] = (zaehler[m.wert] ?? -1) + 1);
    const art = MARKER[m.typ] || MARKER.eigene;
    const pin = h(
      'div',
      {
        class: 'se-pin' + (frisch.has(m.id) ? ' drop' : ''),
        style: { left: pos(m.wert) + '%', '--pc': art.farbe, '--stapel': stapel },
        title: art.label,
      },
      h('div', { class: 'se-pin-kopf' }, img(art.bild)),
      h('div', { class: 'se-pin-name' }, art.label),
    );
    frisch.delete(m.id);
    if (!ctx?.readOnly) pinGeste(it, m, pin, striche, ctx);
    pins.append(pin);
  }

  el.append(frage, spur, ...striche, pins);
  return el;
}

/** Mitte eines Elements auf dem Bildschirm. */
function mitte(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Projiziert einen Punkt auf die Skala: Wert 0–10 und Abstand zur Leiste (px). */
function aufSkala(striche, x, y) {
  const a = mitte(striche[0]);
  const b = mitte(striche[10]);
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const l2 = vx * vx + vy * vy || 1;
  const t = clamp(((x - a.x) * vx + (y - a.y) * vy) / l2, 0, 1);
  const abstand = Math.abs((x - a.x) * vy - (y - a.y) * vx) / Math.sqrt(l2);
  return { t, wert: Math.round(t * 10), abstand };
}

function pinGeste(it, m, pin, striche, ctx) {
  let vorher = null;
  let weg = false;
  attachGesture(pin, {
    onStart() {
      vorher = ctx.api.capture();
      pin.classList.add('dragging');
    },
    onMove({ x, y }) {
      const p = aufSkala(striche, x, y);
      m.wert = p.wert;
      pin.style.left = pos(p.t * 10) + '%';
      pin.style.setProperty('--stapel', 0);
      weg = p.abstand > 90;
      pin.classList.toggle('weg', weg);
      striche.forEach((s, i) => s.classList.toggle('hot', i === p.wert));
    },
    onEnd({ moved }) {
      pin.classList.remove('dragging');
      if (!moved) return;
      // Weit weggezogen: Punkt entfernen
      if (weg) it.marker = it.marker.filter((x) => x !== m);
      ctx.api.commit(it, vorher);
    },
  });
}

/** Punkt auf eine Skala setzen – auf die unter dem Finger, die ausgewählte oder die zuletzt gelegte. */
export function markerSetzen(board, typ, ziel) {
  const items = board.items();
  let it = ziel ? items.find((i) => i.id === ziel.id) : null;
  it ||= items.find((i) => i.id === board.auswahlId && i.type === 'skala');
  it ||= [...items].reverse().find((i) => i.type === 'skala');
  if (!it) {
    toast('Leg zuerst eine Skala auf die Fläche.', 'bilder/app/skala.svg');
    return;
  }
  let wert = 5;
  if (ziel?.x != null) {
    const striche = [...board.elementVon(it.id).querySelectorAll('.se-tick')];
    wert = aufSkala(striche, ziel.x, ziel.y).wert;
  }
  const m = { id: uid(), typ, wert };
  frisch.add(m.id);
  board.api.change(it, () => {
    it.marker ||= [];
    it.marker.push(m);
  });
}

export async function frageSchreiben(it, api) {
  const ink = await schreibfeld({
    titel: 'Frage zur Skala',
    form: 'rechteckig',
    farbe: '#ffffff',
    ink: it.ink,
    seitenverhaeltnis: 0.25,
  });
  if (!ink) return;
  api.change(it, () => {
    it.ink = ink;
    if (ink.striche.length) it.titel = '';
  });
}

export function skalaToolbar(it, api, board) {
  return [
    { icon: 'pencil', label: 'Frage', onClick: () => frageSchreiben(it, api) },
    {
      icon: 'plus',
      label: 'Punkt',
      menu: () =>
        Object.entries(MARKER).map(([typ, art]) => ({
          content: img(art.bild, 'tb-img'),
          label: art.label.replace('Nächster ', ''),
          onClick: () => markerSetzen(board, typ, { id: it.id }),
        })),
    },
    {
      content: it.modus === 'gesichter' ? h('b', { class: 'tb-zahl' }, '1 2 3') : img('bilder/app/skala-4.svg', 'tb-img'),
      label: it.modus === 'gesichter' ? 'Zahlen' : 'Gesichter',
      onClick: () => api.change(it, () => (it.modus = it.modus === 'gesichter' ? 'zahlen' : 'gesichter')),
    },
    {
      icon: 'palette',
      label: 'Farbe',
      menu: () => [
        { swatch: 'var(--accent)', active: !it.farbe, onClick: () => api.change(it, () => (it.farbe = null)) },
        ...FARBEN.map((f) => ({ swatch: f, active: f === it.farbe, onClick: () => api.change(it, () => (it.farbe = f)) })),
      ],
    },
    { icon: 'trash', danger: true, onClick: () => api.remove(it) },
  ];
}

// ---------------------------------------------------------------
// Seitenleiste: Skalen und Punkte
// ---------------------------------------------------------------

function miniSkala(modus) {
  return h(
    'div',
    { class: 'mini-skala' + (modus === 'gesichter' ? ' faces' : '') },
    h('i', { class: 'ms-spur' }),
    h(
      'span',
      { class: 'ms-zahlen' },
      modus === 'gesichter'
        ? [0, 2, 4].map((n) => img(`bilder/app/skala-${n}.svg`))
        : ['0', '5', '10'].map((n) => h('b', null, n)),
    ),
  );
}

/** Punkt aus der Seitenleiste auf eine Skala ziehen (oder antippen). */
function markerChip(board, typ, art) {
  const chip = h('button', { class: 'marker-chip', style: { '--pc': art.farbe } }, img(art.bild), h('span', null, art.label));
  chip.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    try {
      chip.setPointerCapture(e.pointerId);
    } catch {
      /* egal */
    }
    const start = { x: e.clientX, y: e.clientY };
    let bewegt = false;
    let ziel = null;
    const geist = h('div', { class: 'marker-ghost', style: { '--pc': art.farbe } }, img(art.bild));
    const setzen = (x, y) => {
      geist.style.transform = `translate(${x}px, ${y}px)`;
    };
    setzen(e.clientX, e.clientY);

    const move = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      if (!bewegt && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 8) {
        bewegt = true;
        document.getElementById('layer').append(geist);
      }
      if (!bewegt) return;
      setzen(ev.clientX, ev.clientY);
      const el = document.elementsFromPoint(ev.clientX, ev.clientY).find((n) => n.classList?.contains('bitem-skala'));
      if (ziel !== el) {
        ziel?.classList.remove('drop-ziel');
        el?.classList.add('drop-ziel');
        ziel = el || null;
      }
    };
    const up = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      chip.removeEventListener('pointermove', move);
      chip.removeEventListener('pointerup', up);
      chip.removeEventListener('pointercancel', up);
      ziel?.classList.remove('drop-ziel');
      if (!bewegt) markerSetzen(board, typ, null);
      else if (ziel && ev.type === 'pointerup') markerSetzen(board, typ, { id: ziel.dataset.id, x: ev.clientX, y: ev.clientY });
      geist.classList.add('out');
      setTimeout(() => geist.remove(), 250);
    };
    chip.addEventListener('pointermove', move);
    chip.addEventListener('pointerup', up);
    chip.addEventListener('pointercancel', up);
  });
  return chip;
}

export function skalaTray(board) {
  let modus = 'zahlen';
  const kacheln = h('div', { class: 'tray-grid skalen' });
  function kachelnZeichnen() {
    kacheln.replaceChildren(
      trayItem(h('div', { class: 'skala-preview' }, miniSkala(modus), h('span', null, 'Skala 0 – 10')), (e) =>
        board.addItem(neueSkala({ modus }), e),
      ),
    );
  }
  kachelnZeichnen();
  return h(
    'div',
    { class: 'tray-content' },
    h('h3', null, 'Neue Skala'),
    h('p', { class: 'tray-hint' }, 'Tippe oder ziehe eine Skala auf die Fläche. Du kannst mehrere Skalen legen.'),
    kacheln,
    segmented(
      [
        { value: 'zahlen', label: 'Zahlen' },
        { value: 'gesichter', label: 'Gesichter' },
      ],
      modus,
      (v) => {
        modus = v;
        kachelnZeichnen();
      },
    ),
    h('h3', null, 'Punkte'),
    h('p', { class: 'tray-hint' }, 'Ziehe einen Punkt auf eine Skala. Zum Löschen den Punkt weit wegziehen.'),
    h(
      'div',
      { class: 'marker-list' },
      Object.entries(MARKER).map(([typ, art]) => markerChip(board, typ, art)),
    ),
  );
}
