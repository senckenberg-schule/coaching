// Gefühlskarten: aus dem Stapel wählen, auf die Fläche legen, Stärke einschätzen.
import { h, img } from '../util.js';
import { createBoard, trayItem } from '../board.js';
import { getGefuehle, gefuehlById, gruppeById } from '../assets.js';

const STAERKEN = [
  { wert: 1, name: 'ein bisschen' },
  { wert: 2, name: 'mittel' },
  { wert: 3, name: 'sehr' },
];

function punkte(wert, farbe) {
  return h(
    'div',
    { class: 'dots' },
    [1, 2, 3].map((i) => h('i', { class: i <= wert ? 'on' : '', style: { '--gc': farbe } })),
  );
}

function karte(g, staerke) {
  const gruppe = gruppeById(g.gruppe);
  return h(
    'div',
    { class: 'gcard', style: { '--gc': gruppe.farbe } },
    img(g.bild, 'gimg'),
    h('div', { class: 'gname' }, g.name),
    staerke ? punkte(staerke, gruppe.farbe) : null,
  );
}

const TYPES = {
  gefuehl: {
    size: () => [14, 17.5],
    rotate: true,
    fixedScale: (it) => [0.9, 1, 1.13][(it.staerke || 2) - 1],
    radius: () => 'calc(var(--u) * 2.2)',
    render(it, inner) {
      const g = gefuehlById(it.gid);
      if (!g) {
        inner.append(h('div', { class: 'gcard' }, h('div', { class: 'gname' }, '?')));
        return;
      }
      inner.append(karte(g, it.staerke || 2));
    },
  },
};

export default {
  create() {
    return { items: [], links: [] };
  },

  mount(container, { state, readOnly = false, onChange, onHistory }) {
    const wrap = h('div', { class: 'tool tool-gefuehle' + (readOnly ? ' readonly' : '') });
    const main = h('div', { class: 'tool-main' });
    wrap.append(main);
    container.append(wrap);

    let stapelNeuZeichnen = () => {};
    const board = createBoard(main, {
      state,
      types: TYPES,
      readOnly,
      onChange: () => {
        onChange?.();
        stapelNeuZeichnen();
      },
      onHistory,
      emptyHint: 'Welche Gefühle hast du gerade? Lege sie hierher.',
      toolbar(it, api) {
        return [
          ...STAERKEN.map((st) => ({
            content: h(
              'span',
              { class: 'mini-dots' },
              [1, 2, 3].map((i) => h('i', { class: i <= st.wert ? 'on' : '' })),
            ),
            label: st.name,
            active: (it.staerke || 2) === st.wert,
            onClick: () => api.change(it, () => (it.staerke = st.wert)),
          })),
          { icon: 'trash', danger: true, onClick: () => api.remove(it) },
        ];
      },
    });

    if (!readOnly) {
      const { el, neuZeichnen } = stapel(board, state);
      stapelNeuZeichnen = neuZeichnen;
      wrap.append(el);
    }

    return {
      destroy() {
        board.destroy();
        wrap.remove();
      },
      undo: () => {
        board.undo();
        stapelNeuZeichnen();
      },
      canUndo: () => board.canUndo(),
    };
  },
};

function stapel(board, state) {
  const tray = h('div', { class: 'tray glass tray-gefuehle' });
  const daten = getGefuehle();
  let filter = 'alle';
  const chips = h('div', { class: 'gchips' });
  const raster = h('div', { class: 'tray-grid deck' });
  tray.append(h('h3', null, 'Gefühlskarten'), chips, raster);

  function chipsZeichnen() {
    chips.replaceChildren(
      h(
        'button',
        { class: 'gchip' + (filter === 'alle' ? ' active' : ''), onClick: () => setFilter('alle') },
        'Alle',
      ),
      ...daten.gruppen.map((g) =>
        h(
          'button',
          {
            class: 'gchip' + (filter === g.id ? ' active' : ''),
            style: { '--gc': g.farbe },
            onClick: () => setFilter(g.id),
          },
          h('i'),
          g.name,
        ),
      ),
    );
  }

  function setFilter(f) {
    filter = f;
    chipsZeichnen();
    rasterZeichnen(true);
  }

  function rasterZeichnen(anim = false) {
    const gelegt = new Set(state.items.map((i) => i.gid));
    raster.replaceChildren(
      ...daten.karten
        .filter((k) => filter === 'alle' || k.gruppe === filter)
        .map((k, i) => {
          const el = trayItem(
            h(
              'div',
              { class: 'deck-card', style: { '--gc': gruppeById(k.gruppe).farbe } },
              img(k.bild),
              h('span', null, k.name),
            ),
            (e) => board.addItem({ type: 'gefuehl', gid: k.id, staerke: 2, rot: (Math.random() - 0.5) * 8 }, e),
            gelegt.has(k.id) ? 'used' : '',
          );
          if (anim) {
            el.classList.add('deal');
            el.style.animationDelay = i * 22 + 'ms';
          }
          return el;
        }),
    );
  }

  chipsZeichnen();
  rasterZeichnen(true);
  return { el: tray, neuZeichnen: () => rasterZeichnen(false) };
}
