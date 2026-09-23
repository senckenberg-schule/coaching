// Besondere Kartenformen (Herz, Stern, Kopf seitlich) als SVG.
// Die Form wird auf die Kartengröße gestreckt (Koordinaten 0–100).
import { s } from './util.js';

function sternPfad() {
  const punkte = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 49 : 22;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    punkte.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(53 + r * Math.sin(a)).toFixed(1)}`);
  }
  return 'M' + punkte.join(' L') + ' Z';
}

export const SVG_FORMEN = {
  herz: 'M50 94 C22 72 3 54 4 31 C5 12 23 3 38 9 C45 12 49 18 50 23 C51 18 55 12 62 9 C77 3 95 12 96 31 C97 54 78 72 50 94 Z',
  stern: sternPfad(),
  // Kopf im Profil, Blick nach rechts
  kopf: 'M40 97 L40 83 C27 80 13 71 9 55 C4 34 15 8 44 4 C68 1 85 15 87 34 C88 40 87 44 89 48 L96 58 C98 61 96 64 92 64 L89 65 C90 69 89 71 87 72 C89 75 88 78 85 80 C83 84 77 86 70 85 L66 85 L66 97 Z',
};

let zaehler = 0;

/** Hintergrund einer Karte in besonderer Form (Farbe kommt aus --c). */
export function formSvg(form) {
  const id = 'fv' + ++zaehler;
  return s(
    'svg',
    { class: 'form-svg-bg', viewBox: '0 0 100 100', preserveAspectRatio: 'none' },
    s(
      'defs',
      null,
      s(
        'linearGradient',
        { id, x1: '0', y1: '0', x2: '0.4', y2: '1' },
        s('stop', { offset: '0', class: 'fs-hell' }),
        s('stop', { offset: '1', class: 'fs-satt' }),
      ),
    ),
    s('path', { d: SVG_FORMEN[form], fill: `url(#${id})`, 'vector-effect': 'non-scaling-stroke' }),
  );
}

/** Kleines Umriss-Symbol der Form (für Menüs). */
export function formMiniSvg(form) {
  return s('svg', { class: 'form-mini-svg', viewBox: '0 0 100 100' }, s('path', { d: SVG_FORMEN[form] }));
}
