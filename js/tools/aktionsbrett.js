// Aktionsbrett / Familienbrett: Figuren und Symbole aufstellen.
import { h, img } from '../util.js';
import { createBoard, trayItem } from '../board.js';
import { FARBEN } from '../data.js';
import { getSymbole } from '../assets.js';
import { ask, segmented } from '../ui.js';

const TYPES = {
  figur: {
    size: (it) => (it.groesse === 'klein' ? [8.5, 8.5] : [12.5, 12.5]),
    rotate: true,
    radius: (it) => (it.form === 'rund' ? '50%' : '26%'),
    render(it, inner) {
      inner.append(figurElement(it.form, it.farbe));
    },
    label: (it) => it.name,
  },
  symbol: {
    size: () => [10, 10],
    rotate: true,
    scale: true,
    radius: () => '50%',
    render(it, inner) {
      inner.append(img(it.bild, 'symbol'));
    },
    label: (it) => it.name,
  },
};

function figurElement(form, farbe) {
  return h(
    'div',
    { class: `figur ${form}`, style: { '--c': farbe } },
    h('div', { class: 'augen' }, h('i'), h('i')),
  );
}

export default {
  create() {
    return { items: [], links: [] };
  },

  mount(container, { state, readOnly = false, onChange, onHistory }) {
    const wrap = h('div', { class: 'tool tool-aktionsbrett' + (readOnly ? ' readonly' : '') });
    const main = h('div', { class: 'tool-main' });
    wrap.append(main);
    container.append(wrap);

    const board = createBoard(main, {
      state,
      types: TYPES,
      readOnly,
      onChange,
      onHistory,
      emptyHint: 'Ziehe Figuren und Symbole auf das Brett',
      onDoubleTap: (it, api) => umbenennen(it, api),
      toolbar(it, api) {
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
              label: it.form === 'rund' ? 'eckig' : 'rund',
              onClick: () => api.change(it, () => (it.form = it.form === 'rund' ? 'eckig' : 'rund')),
            },
            {
              icon: 'resize',
              label: it.groesse === 'klein' ? 'groß' : 'klein',
              onClick: () => api.change(it, () => (it.groesse = it.groesse === 'klein' ? 'gross' : 'klein')),
            },
          );
        }
        liste.push({ icon: 'trash', danger: true, onClick: () => api.remove(it) });
        return liste;
      },
    });

    async function umbenennen(it, api) {
      const name = await ask({
        title: it.type === 'figur' ? 'Wer ist das?' : 'Wofür steht das?',
        value: it.name || '',
        placeholder: it.type === 'figur' ? 'z. B. Ich, Mama, Lea …' : 'z. B. Mathe, Fußball …',
      });
      if (name !== null) api.change(it, () => (it.name = name));
    }

    if (!readOnly) wrap.append(seitenleiste(board));

    return {
      destroy() {
        board.destroy();
        wrap.remove();
      },
      undo: () => board.undo(),
      canUndo: () => board.canUndo(),
    };
  },
};

function seitenleiste(board) {
  const tray = h('div', { class: 'tray glass' });
  let farbe = FARBEN[5];
  let reiter = 'figuren';

  const inhalt = h('div', { class: 'tray-content' });
  const tabs = segmented(
    [
      { value: 'figuren', label: 'Figuren' },
      { value: 'symbole', label: 'Symbole' },
    ],
    reiter,
    (v) => {
      reiter = v;
      zeichnen();
    },
  );
  tray.append(tabs, inhalt);

  function zeichnen() {
    inhalt.replaceChildren();
    inhalt.classList.remove('swap');
    void inhalt.offsetWidth;
    inhalt.classList.add('swap');
    if (reiter === 'figuren') {
      const varianten = [
        { form: 'rund', groesse: 'gross', text: 'groß' },
        { form: 'eckig', groesse: 'gross', text: 'groß' },
        { form: 'rund', groesse: 'klein', text: 'klein' },
        { form: 'eckig', groesse: 'klein', text: 'klein' },
      ];
      inhalt.append(
        h('p', { class: 'tray-hint' }, 'Tippe oder ziehe eine Figur aufs Brett.'),
        h(
          'div',
          { class: 'tray-grid figs' },
          varianten.map((v) =>
            trayItem(
              h('div', { class: 'fig-preview ' + v.groesse }, figurElement(v.form, farbe)),
              (e) =>
                board.addItem({ type: 'figur', form: v.form, groesse: v.groesse, farbe, rot: 0, name: '' }, e),
            ),
          ),
        ),
        h('h3', null, 'Farbe'),
        h(
          'div',
          { class: 'swatches' },
          FARBEN.map((f) =>
            h('button', {
              class: 'swatch' + (f === farbe ? ' active' : ''),
              style: { background: f },
              'aria-label': 'Farbe wählen',
              onClick: () => {
                farbe = f;
                zeichnen();
              },
            }),
          ),
        ),
      );
    } else {
      inhalt.append(
        h('p', { class: 'tray-hint' }, 'Symbole für Orte, Dinge, Hindernisse und Kraftquellen.'),
        h(
          'div',
          { class: 'tray-grid syms' },
          getSymbole().map((sym) =>
            trayItem(
              h('div', { class: 'sym-preview' }, img(sym.bild), h('span', null, sym.name)),
              (e) => board.addItem({ type: 'symbol', bild: sym.bild, rot: 0, scale: 1, name: '' }, e),
            ),
          ),
        ),
      );
    }
  }
  zeichnen();
  return tray;
}
