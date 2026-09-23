// Ressourcen-Landkarte: „Ich“ in der Mitte, rundherum sechs Bereiche.
// Je näher etwas an der Mitte liegt, desto wichtiger ist es.
import { s } from '../util.js';
import { mischWerkzeug } from './misch.js';

const BEREICHE = [
  { name: 'Menschen', bild: 'bilder/app/lk-menschen.svg', farbe: '#ffc9c9' },
  { name: 'Stärken', bild: 'bilder/app/lk-staerken.svg', farbe: '#ffd8a8' },
  { name: 'Hobbys', bild: 'bilder/app/lk-hobbys.svg', farbe: '#fff3bf' },
  { name: 'Orte', bild: 'bilder/app/lk-orte.svg', farbe: '#c3fae8' },
  { name: 'Erfolge', bild: 'bilder/app/lk-erfolge.svg', farbe: '#d0ebff' },
  { name: 'Tiere & Dinge', bild: 'bilder/app/lk-tiere.svg', farbe: '#e5dbff' },
];

const M = 500; // Mitte im 1000er-Koordinatensystem
const R = 488; // äußerer Radius
const punkt = (r, grad) => {
  const a = ((grad - 90) * Math.PI) / 180;
  return [M + r * Math.cos(a), M + r * Math.sin(a)];
};

function hintergrund() {
  // Unten etwas Platz lassen, damit die Stiftleiste nichts verdeckt
  const svg = s('svg', { class: 'vorlage-landkarte', viewBox: '0 0 1000 1110', preserveAspectRatio: 'xMidYMid meet' });
  const defs = s('defs');
  svg.append(defs);
  const n = BEREICHE.length;
  BEREICHE.forEach((b, i) => {
    const von = (360 / n) * i - 360 / n / 2;
    const bis = von + 360 / n;
    const [x1, y1] = punkt(R, von);
    const [x2, y2] = punkt(R, bis);
    const verlauf = s(
      'radialGradient',
      { id: 'lk-v' + i, cx: M, cy: M, r: R, gradientUnits: 'userSpaceOnUse' },
      s('stop', { offset: '0.2', 'stop-color': b.farbe, 'stop-opacity': '0.95' }),
      s('stop', { offset: '1', 'stop-color': b.farbe, 'stop-opacity': '0.35' }),
    );
    defs.append(verlauf);
    svg.append(
      s('path', {
        class: 'lk-sektor',
        d: `M${M},${M} L${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2} Z`,
        fill: `url(#lk-v${i})`,
      }),
    );
  });
  // Nähe-Ringe
  for (const [r, text] of [
    [215, 'ganz nah'],
    [345, 'nah'],
    [R - 2, 'weiter weg'],
  ]) {
    svg.append(s('circle', { class: 'lk-ring', cx: M, cy: M, r }));
    const [tx, ty] = punkt(r - 16, 180 / n);
    svg.append(s('text', { class: 'lk-ringtext', x: tx, y: ty, 'text-anchor': 'middle' }, text));
  }
  // Beschriftung der Bereiche
  BEREICHE.forEach((b, i) => {
    const mitte = (360 / n) * i;
    const [x, y] = punkt(415, mitte);
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
  // „Ich“ in der Mitte
  svg.append(
    s('circle', { class: 'lk-ich-schein', cx: M, cy: M, r: 112 }),
    s('circle', { class: 'lk-ich', cx: M, cy: M, r: 88 }),
    s('text', { class: 'lk-ich-text', x: M, y: M + 18, 'text-anchor': 'middle' }, 'Ich'),
  );
  return svg;
}

export default mischWerkzeug({
  klasse: 'tool-landkarte',
  reiter: ['figuren', 'symbole', 'karten'],
  hintergrund,
  tipp: 'Leg Menschen, Dinge und Karten in die passenden Bereiche. Je näher an der Mitte, desto wichtiger.',
  create() {
    return { items: [], links: [], ink: [] };
  },
});
