// Skalierung: Skalen als Elemente auf einer Arbeitsfläche – beliebig viele,
// frei kombinierbar, mit Punkten wie „Heute“, „Ziel“ oder „Nächster Schritt“.
import { h, uid } from '../util.js';
import { createBoard } from '../board.js';
import { phaseById } from '../data.js';
import { SKALA_TYPE, neueSkala, skalaToolbar, skalaTray, frageSchreiben } from './skala-element.js';

const TYPES = { skala: SKALA_TYPE };

/** Ältere Sitzungen (Treppe mit einer Skala) in das neue Format überführen. */
function umwandeln(state) {
  if (Array.isArray(state.items)) return;
  state.items = [
    neueSkala({
      id: uid(),
      x: 0.5,
      y: 0.45,
      scale: 1.5,
      modus: state.modus || 'zahlen',
      titel: state.frage || '',
      marker: (state.marker || []).map((m) => ({ id: m.id || uid(), typ: m.typ, wert: m.wert })),
    }),
  ];
  state.links = [];
  delete state.frage;
  delete state.modus;
  delete state.marker;
}

export default {
  create(phaseId) {
    return {
      items: [neueSkala({ id: uid(), x: 0.5, y: 0.42, scale: 1.5, titel: phaseById(phaseId).skalaFrage })],
      links: [],
      ink: [],
    };
  },

  mount(container, { state, readOnly = false, onChange, onHistory }) {
    umwandeln(state);
    const wrap = h('div', { class: 'tool tool-skala' + (readOnly ? ' readonly' : '') });
    const main = h('div', { class: 'tool-main' });
    wrap.append(main);
    container.append(wrap);

    const board = createBoard(main, {
      state,
      types: TYPES,
      readOnly,
      onChange,
      onHistory,
      emptyHint: 'Ziehe eine Skala auf die Fläche',
      onDoubleTap: (it, api) => frageSchreiben(it, api),
      toolbar: (it, api) => skalaToolbar(it, api, board),
    });

    if (!readOnly) {
      const tray = h('div', { class: 'tray glass' }, skalaTray(board));
      tray.append(
        h(
          'div',
          { class: 'tray-tipp' },
          h('b', null, 'Tipp: '),
          'Die Frage mit dem Stift oben auf die Skala schreiben. Mit zwei Fingern drehen (z. B. senkrecht) und vergrößern.',
        ),
      );
      wrap.append(tray);
    }

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
