// Figuren und Symbole (Aktionsbrett / Familienbrett) – Bausteine für die Arbeitsfläche.
import { h, img } from '../util.js';
import { trayItem } from '../board.js';
import { FARBEN } from '../data.js';
import { getSymbole, getPersonen } from '../assets.js';
import { ask, segmented } from '../ui.js';

// Holzfiguren: vier Formen, drei Größen
export const FIGUR_FORMEN = [
  { id: 'rund', name: 'rund' },
  { id: 'eckig', name: 'eckig' },
  { id: 'dreieck', name: 'Dreieck' },
  { id: 'sechseck', name: 'Sechseck' },
];
export const FIGUR_GROESSEN = [
  { id: 'gross', name: 'groß', u: 12.5 },
  { id: 'mittel', name: 'mittel', u: 10.5 },
  { id: 'klein', name: 'klein', u: 8.5 },
];
const groesseVon = (id) => (FIGUR_GROESSEN.find((g) => g.id === id) || FIGUR_GROESSEN[0]).u;

/** Vieleck mit abgerundeten Ecken als CSS-Polygon (Punkte in Prozent). */
function rundesVieleck(ecken, r) {
  const punkte = [];
  const n = ecken.length;
  for (let i = 0; i < n; i++) {
    const [px, py] = ecken[(i + n - 1) % n];
    const [x, y] = ecken[i];
    const [nx, ny] = ecken[(i + 1) % n];
    const a1 = Math.atan2(py - y, px - x);
    const a2 = Math.atan2(ny - y, nx - x);
    let halb = (a2 - a1) / 2;
    if (halb > Math.PI / 2) halb -= Math.PI;
    if (halb < -Math.PI / 2) halb += Math.PI;
    const abstand = r / Math.tan(Math.abs(halb));
    const mitte = a1 + halb;
    const d = r / Math.sin(Math.abs(halb));
    const cx = x + Math.cos(mitte) * d;
    const cy = y + Math.sin(mitte) * d;
    const s1 = [x + Math.cos(a1) * abstand, y + Math.sin(a1) * abstand];
    const s2 = [x + Math.cos(a2) * abstand, y + Math.sin(a2) * abstand];
    let w1 = Math.atan2(s1[1] - cy, s1[0] - cx);
    let w2 = Math.atan2(s2[1] - cy, s2[0] - cx);
    while (w2 - w1 > Math.PI) w2 -= 2 * Math.PI;
    while (w1 - w2 > Math.PI) w2 += 2 * Math.PI;
    for (let k = 0; k <= 6; k++) {
      const w = w1 + ((w2 - w1) * k) / 6;
      punkte.push(`${(cx + Math.cos(w) * r).toFixed(1)}% ${(cy + Math.sin(w) * r).toFixed(1)}%`);
    }
  }
  return `polygon(${punkte.join(', ')})`;
}
const sechseckEcken = Array.from({ length: 6 }, (_, i) => {
  const a = ((i * 60 - 90) * Math.PI) / 180;
  return [50 + 50 * Math.cos(a), 50 + 50 * Math.sin(a)];
});
const CLIP = {
  dreieck: rundesVieleck([[50, 2], [99, 95], [1, 95]], 9),
  sechseck: rundesVieleck(sechseckEcken, 9),
};

export const FIGUR_TYPE = {
  size: (it) => {
    const u = groesseVon(it.groesse);
    return [u, u];
  },
  rotate: true,
  radius: (it) => (it.form === 'rund' ? '50%' : it.form === 'eckig' ? '26%' : '32%'),
  render(it, inner) {
    inner.append(figurElement(it.form, it.farbe));
  },
  label: (it) => it.name,
};

export const SYMBOL_TYPE = {
  size: () => [10, 10],
  rotate: true,
  scale: true,
  radius: () => '50%',
  render(it, inner) {
    inner.append(img(it.bild, 'symbol'));
  },
  label: (it) => it.name,
};

// Personen und Tiere (Bilder aus bilder/personen)
export const PERSON_TYPE = {
  size: () => [14, 14],
  rotate: true,
  scale: true,
  radius: () => '30%',
  render(it, inner) {
    inner.append(img(it.bild, 'symbol person'));
  },
  label: (it) => it.name,
};

export function figurElement(form, farbe) {
  const figur = h('div', { class: `figur ${form}`, style: { '--c': farbe } }, h('div', { class: 'augen' }, h('i'), h('i')));
  if (CLIP[form]) figur.style.clipPath = CLIP[form];
  return h('div', { class: 'figur-huelle' + (CLIP[form] ? ' geschnitten' : '') }, figur);
}

export async function umbenennen(it, api) {
  const wesen = it.type === 'figur' || it.type === 'person';
  const name = await ask({
    title: wesen ? 'Wer ist das?' : 'Wofür steht das?',
    value: it.name || '',
    placeholder: wesen ? 'z. B. Ich, Mama, Lea …' : 'z. B. Mathe, Fußball …',
  });
  if (name !== null) api.change(it, () => (it.name = name));
}

/** Werkzeugleiste für Figuren, Personen und Symbole. */
export function figurToolbar(it, api) {
  const liste = [{ icon: 'pencil', label: 'Name', onClick: () => umbenennen(it, api) }];
  if (it.type === 'figur') {
    liste.push(
      {
        icon: 'palette',
        label: 'Farbe',
        menu: () =>
          FARBEN.map((f) => ({
            swatch: f,
            active: f === it.farbe,
            onClick: () => api.change(it, () => (it.farbe = f)),
          })),
      },
      {
        icon: 'shape',
        label: 'Form',
        menu: () =>
          FIGUR_FORMEN.map((f) => ({
            content: h('span', { class: 'fig-mini' }, figurElement(f.id, it.farbe)),
            label: f.name,
            active: (it.form || 'rund') === f.id,
            onClick: () => api.change(it, () => (it.form = f.id)),
          })),
      },
      {
        icon: 'resize',
        label: 'Größe',
        menu: () =>
          FIGUR_GROESSEN.map((g) => ({
            label: g.name,
            active: (it.groesse || 'gross') === g.id,
            onClick: () => api.change(it, () => (it.groesse = g.id)),
          })),
      },
    );
  }
  liste.push({ icon: 'trash', danger: true, onClick: () => api.remove(it) });
  return liste;
}

/** Seitenleisten-Inhalt: Holzfiguren (Form, Größe, Farbe) und Personen. */
export function figurenTray(board) {
  let farbe = FARBEN[5];
  let groesse = 'gross';
  const el = h('div', { class: 'tray-content' });
  const formen = h('div', { class: 'tray-grid figs' });
  function formenZeichnen() {
    formen.replaceChildren(
      ...FIGUR_FORMEN.map((f) =>
        trayItem(h('div', { class: 'fig-preview ' + groesse }, figurElement(f.id, farbe)), (e) =>
          board.addItem({ type: 'figur', form: f.id, groesse, farbe, rot: 0, name: '' }, e),
        ),
      ),
    );
  }
  const farben = h('div', { class: 'swatches' });
  function farbenZeichnen() {
    farben.replaceChildren(
      ...FARBEN.map((f) =>
        h('button', {
          class: 'swatch' + (f === farbe ? ' active' : ''),
          style: { background: f },
          'aria-label': 'Farbe wählen',
          onClick: () => {
            farbe = f;
            farbenZeichnen();
            formenZeichnen();
          },
        }),
      ),
    );
  }
  formenZeichnen();
  farbenZeichnen();
  el.append(
    h('p', { class: 'tray-hint' }, 'Tippe oder ziehe eine Figur aufs Brett.'),
    formen,
    segmented(
      FIGUR_GROESSEN.map((g) => ({ value: g.id, label: g.name })),
      groesse,
      (v) => {
        groesse = v;
        formenZeichnen();
      },
    ),
    h('h3', null, 'Farbe'),
    farben,
  );
  const personen = getPersonen();
  if (personen.length) {
    el.append(
      h('h3', null, 'Personen & Tiere'),
      h(
        'div',
        { class: 'tray-grid syms' },
        personen.map((p) =>
          trayItem(h('div', { class: 'sym-preview' }, img(p.bild), h('span', null, p.name)), (e) =>
            board.addItem({ type: 'person', bild: p.bild, rot: 0, scale: 1, name: '' }, e),
          ),
        ),
      ),
    );
  }
  return el;
}

/** Seitenleisten-Inhalt: Symbole. */
export function symboleTray(board) {
  return h(
    'div',
    { class: 'tray-content' },
    h('p', { class: 'tray-hint' }, 'Symbole für Orte, Dinge, Hindernisse und Kraftquellen.'),
    h(
      'div',
      { class: 'tray-grid syms' },
      getSymbole().map((sym) =>
        trayItem(h('div', { class: 'sym-preview' }, img(sym.bild), h('span', null, sym.name)), (e) =>
          board.addItem({ type: 'symbol', bild: sym.bild, rot: 0, scale: 1, name: '' }, e),
        ),
      ),
    ),
  );
}

/** Seitenleiste mit Reitern; die Inhalte bleiben beim Umschalten erhalten. */
export function reiterLeiste(reiter) {
  const tray = h('div', { class: 'tray glass' + (reiter.length > 3 ? ' viele-reiter' : '') });
  const cache = new Map();
  const platz = h('div', { class: 'tray-platz' });
  function zeigen(id) {
    if (!cache.has(id)) cache.set(id, reiter.find((r) => r.id === id).inhalt());
    const el = cache.get(id);
    el.classList.remove('swap');
    void el.offsetWidth;
    el.classList.add('swap');
    platz.replaceChildren(el);
  }
  if (reiter.length > 1) {
    tray.append(
      segmented(
        reiter.map((r) => ({ value: r.id, label: r.label })),
        reiter[0].id,
        zeigen,
      ),
    );
  }
  tray.append(platz);
  zeigen(reiter[0].id);
  return tray;
}

