// Methodenkarten: rechteckig, rund oder oval – frei beschriften, legen und verbinden.
import { h } from '../util.js';
import { createBoard, trayItem } from '../board.js';
import { FARBEN } from '../data.js';
import { ask } from '../ui.js';

const FORMEN = {
  rechteckig: { name: 'rechteckig', size: [21, 13.5] },
  rund: { name: 'rund', size: [15.5, 15.5] },
  oval: { name: 'oval', size: [23, 14] },
};
const FORM_REIHE = ['rechteckig', 'rund', 'oval'];

function schriftgroesse(text) {
  const n = (text || '').length;
  if (n <= 10) return 2.7;
  if (n <= 24) return 2.2;
  if (n <= 45) return 1.8;
  if (n <= 80) return 1.5;
  return 1.25;
}

function karteElement(form, farbe, text) {
  return h(
    'div',
    { class: `karte ${form}`, style: { '--c': farbe } },
    h(
      'span',
      { class: 'karte-text' + (text ? '' : ' leer'), style: { fontSize: `calc(var(--u) * ${schriftgroesse(text)})` } },
      text || '…',
    ),
  );
}

const TYPES = {
  karte: {
    size: (it) => FORMEN[it.form]?.size || FORMEN.rechteckig.size,
    rotate: true,
    scale: true,
    radius: (it) => (it.form === 'rechteckig' ? 'calc(var(--u) * 2.2)' : '50%'),
    render(it, inner) {
      inner.append(karteElement(it.form, it.farbe, it.text));
    },
  },
};

export default {
  create() {
    return { items: [], links: [] };
  },

  mount(container, { state, readOnly = false, onChange, onHistory }) {
    const wrap = h('div', { class: 'tool tool-karten' + (readOnly ? ' readonly' : '') });
    const main = h('div', { class: 'tool-main' });
    wrap.append(main);
    container.append(wrap);

    async function beschriften(it, api) {
      const text = await ask({
        title: 'Was steht auf der Karte?',
        value: it.text || '',
        placeholder: 'Schreibe oder sprich hier …',
        multiline: true,
      });
      if (text !== null && text !== it.text) api.change(it, () => (it.text = text));
    }

    const board = createBoard(main, {
      state,
      types: TYPES,
      readOnly,
      links: true,
      onChange,
      onHistory,
      emptyHint: 'Ziehe eine Karte auf die Fläche und beschrifte sie',
      onPlaced: (it) => {
        if (!it.text) beschriften(it, board.api);
      },
      onDoubleTap: (it, api) => beschriften(it, api),
      toolbar(it, api) {
        return [
          { icon: 'pencil', label: 'Text', onClick: () => beschriften(it, api) },
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
              FORM_REIHE.map((f) => ({
                content: h('span', { class: 'form-mini ' + f }),
                label: FORMEN[f].name,
                active: f === it.form,
                onClick: () => api.change(it, () => (it.form = f)),
              })),
          },
          { icon: 'link', label: 'Verbinden', onClick: () => api.startLink(it) },
          { icon: 'trash', danger: true, onClick: () => api.remove(it) },
        ];
      },
    });

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
  let farbe = FARBEN[2];
  const inhalt = h('div', { class: 'tray-content' });
  tray.append(inhalt);

  function zeichnen() {
    inhalt.replaceChildren(
      h('h3', null, 'Neue Karte'),
      h('p', { class: 'tray-hint' }, 'Tippe oder ziehe eine Karte auf die Fläche.'),
      h(
        'div',
        { class: 'tray-grid cards' },
        FORM_REIHE.map((form) =>
          trayItem(
            h('div', { class: 'card-preview ' + form }, karteElement(form, farbe, ''), h('span', null, FORMEN[form].name)),
            (e) => board.addItem({ type: 'karte', form, farbe, text: '', rot: 0, scale: 1 }, e),
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
      h(
        'div',
        { class: 'tray-tipp' },
        h('b', null, 'Tipp: '),
        'Mit zwei Fingern drehen und vergrößern. Zweimal tippen zum Beschriften.',
      ),
    );
  }
  zeichnen();
  return tray;
}
