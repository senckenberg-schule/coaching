// Große Elemente, die unter allem anderen liegen: Zeitstrahl und Ressourcen-Landkarte.
// Sie lassen sich verschieben, drehen und vergrößern; was darauf liegt, wandert mit.
import { h, s, uid, clamp } from '../util.js';
import { trayItem } from '../board.js';

// ---------- Werkzeugleiste für große Elemente ----------
export function grossToolbar(it, api) {
  return [
    {
      icon: 'pin',
      label: it.fest ? 'Lösen' : 'Festmachen',
      active: !!it.fest,
      onClick: () => api.change(it, () => (it.fest = !it.fest)),
    },
    { icon: 'minus', label: 'Kleiner', onClick: () => api.change(it, () => (it.scale = clamp((it.scale || 1) / 1.15, 0.55, 2.6))) },
    { icon: 'plus', label: 'Größer', onClick: () => api.change(it, () => (it.scale = clamp((it.scale || 1) * 1.15, 0.55, 2.6))) },
    { icon: 'trash', danger: true, onClick: () => api.remove(it) },
  ];
}

// ---------- Zeitstrahl ----------
export const ZEITSTRAHL_TYPE = {
  size: () => [96, 36],
  rotate: true,
  scale: true,
  unten: true,
  traegt: true,
  radius: () => 'calc(var(--u) * 4)',
  render(it, inner) {
    inner.append(
      h(
        'div',
        { class: 'zs-el' + (it.fest ? ' fest' : '') },
        h('div', { class: 'zs-flaeche vergangenheit' }),
        h('div', { class: 'zs-flaeche zukunft' }),
        h('div', { class: 'zs-linie' }),
        h('div', { class: 'zs-heute' }, h('i'), h('b', null, 'Heute')),
        h('div', { class: 'zs-label links' }, h('b', null, 'Vergangenheit'), h('small', null, 'Was war?')),
        h('div', { class: 'zs-label rechts' }, h('b', null, 'Zukunft'), h('small', null, 'Wie soll es sein?')),
        it.fest ? h('div', { class: 'fest-nadel' }) : null,
      ),
    );
  },
};

export function neuerZeitstrahl(extra = {}) {
  return { type: 'zeitstrahl', rot: 0, scale: 1, ...extra };
}

/** Ich-Figur dazulegen, falls es noch keine gibt – sie steht über „Heute“ und schaut in die Zukunft. */
export function ichFigurDazu(board, x = 0.5, y = 0.5) {
  const gibt = board.items().some((i) => i.type === 'figur' && (i.name || '').trim().toLowerCase() === 'ich');
  if (gibt) return;
  board.addItem({ id: uid(), type: 'figur', form: 'rund', groesse: 'gross', farbe: '#4c6ef5', name: 'Ich', rot: 90, x, y });
}

export function zeitstrahlTray(board) {
  return h(
    'div',
    { class: 'tray-content' },
    h('h3', null, 'Zeitstrahl'),
    h('p', { class: 'tray-hint' }, 'Tippe oder ziehe einen Zeitstrahl auf die Fläche. Was darauf liegt, wandert beim Verschieben mit.'),
    h(
      'div',
      { class: 'tray-grid skalen' },
      trayItem(
        h('div', { class: 'skala-preview' }, h('div', { class: 'mini-zeitstrahl' }, h('i'), h('b')), h('span', null, 'Zeitstrahl')),
        (e) => board.addItem(neuerZeitstrahl(), e),
      ),
      trayItem(
        h('div', { class: 'skala-preview' }, h('div', { class: 'mini-ich' }, 'Ich'), h('span', null, 'Ich-Figur')),
        () => {
          if (board.items().some((i) => i.type === 'figur' && (i.name || '').toLowerCase() === 'ich')) return;
          ichFigurDazu(board);
        },
      ),
    ),
    h(
      'div',
      { class: 'tray-tipp' },
      h('b', null, 'Tipp: '),
      'Schieb die Ich-Figur an verschiedene Zeitpunkte. Verbinde eine Karte aus der Vergangenheit mit der Zukunft – so nimmst du eine Kraftquelle mit.',
    ),
  );
}

// ---------- Ressourcen-Landkarte ----------
const BEREICHE = [
  { name: 'Menschen', bild: 'bilder/app/lk-menschen.svg', farbe: '#ffc9c9' },
  { name: 'Stärken', bild: 'bilder/app/lk-staerken.svg', farbe: '#ffd8a8' },
  { name: 'Hobbys', bild: 'bilder/app/lk-hobbys.svg', farbe: '#fff3bf' },
  { name: 'Orte', bild: 'bilder/app/lk-orte.svg', farbe: '#c3fae8' },
  { name: 'Erfolge', bild: 'bilder/app/lk-erfolge.svg', farbe: '#d0ebff' },
  { name: 'Tiere & Dinge', bild: 'bilder/app/lk-tiere.svg', farbe: '#e5dbff' },
];
const M = 500;
const R = 492;
const punkt = (r, grad) => {
  const a = ((grad - 90) * Math.PI) / 180;
  return [M + r * Math.cos(a), M + r * Math.sin(a)];
};
let svgZaehler = 0;

function landkarteSvg() {
  const nr = ++svgZaehler;
  const svg = s('svg', { class: 'lk-svg', viewBox: '0 0 1000 1000' });
  const defs = s('defs');
  svg.append(defs);
  const n = BEREICHE.length;
  BEREICHE.forEach((b, i) => {
    const von = (360 / n) * i - 360 / n / 2;
    const [x1, y1] = punkt(R, von);
    const [x2, y2] = punkt(R, von + 360 / n);
    defs.append(
      s(
        'radialGradient',
        { id: `lk${nr}-${i}`, cx: M, cy: M, r: R, gradientUnits: 'userSpaceOnUse' },
        s('stop', { offset: '0.2', 'stop-color': b.farbe, 'stop-opacity': '0.95' }),
        s('stop', { offset: '1', 'stop-color': b.farbe, 'stop-opacity': '0.4' }),
      ),
    );
    svg.append(s('path', { class: 'lk-sektor', d: `M${M},${M} L${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2} Z`, fill: `url(#lk${nr}-${i})` }));
  });
  for (const [r, text] of [
    [215, 'ganz nah'],
    [345, 'nah'],
    [R - 4, 'weiter weg'],
  ]) {
    svg.append(s('circle', { class: 'lk-ring', cx: M, cy: M, r }));
    const [tx, ty] = punkt(r - 16, 180 / n);
    svg.append(s('text', { class: 'lk-ringtext', x: tx, y: ty, 'text-anchor': 'middle' }, text));
  }
  BEREICHE.forEach((b, i) => {
    const [x, y] = punkt(415, (360 / n) * i);
    const breite = 70 + b.name.length * 17;
    svg.append(
      s(
        'g',
        { class: 'lk-schild', transform: `translate(${x} ${y})` },
        s('rect', { x: -breite / 2, y: -26, width: breite, height: 52, rx: 26 }),
        s('image', { href: b.bild, x: -breite / 2 + 8, y: -20, width: 40, height: 40 }),
        s('text', { x: -breite / 2 + 56, y: 10 }, b.name),
      ),
    );
  });
  svg.append(
    s('circle', { class: 'lk-ich-schein', cx: M, cy: M, r: 112 }),
    s('circle', { class: 'lk-ich', cx: M, cy: M, r: 88 }),
    s('text', { class: 'lk-ich-text', x: M, y: M + 18, 'text-anchor': 'middle' }, 'Ich'),
  );
  return svg;
}

export const LANDKARTE_TYPE = {
  size: () => [74, 74],
  rotate: true,
  scale: true,
  unten: true,
  traegt: true,
  radius: () => '50%',
  render(it, inner) {
    inner.append(h('div', { class: 'lk-el' + (it.fest ? ' fest' : '') }, landkarteSvg(), it.fest ? h('div', { class: 'fest-nadel' }) : null));
  },
};

export function neueLandkarte(extra = {}) {
  return { type: 'landkarte', rot: 0, scale: 1.2, ...extra };
}

export function landkarteTray(board) {
  return h(
    'div',
    { class: 'tray-content' },
    h('h3', null, 'Ressourcen-Landkarte'),
    h('p', { class: 'tray-hint' }, 'Tippe oder ziehe eine Landkarte auf die Fläche. Was darauf liegt, wandert beim Verschieben mit.'),
    h(
      'div',
      { class: 'tray-grid skalen' },
      trayItem(h('div', { class: 'skala-preview' }, h('div', { class: 'mini-landkarte' }), h('span', null, 'Landkarte')), (e) =>
        board.addItem(neueLandkarte(), e),
      ),
    ),
    h(
      'div',
      { class: 'tray-tipp' },
      h('b', null, 'Tipp: '),
      'Leg Menschen, Dinge und Karten in die passenden Bereiche. Je näher an der Mitte, desto wichtiger. Mit der Stecknadel festmachen, damit nichts verrutscht.',
    ),
  );
}
