// Gemischte Arbeitsfläche: Figuren, Symbole, Karten, Gefühle und Skalen
// auf einer Vorlage (z. B. Zeitlinie oder Ressourcen-Landkarte).
import { h } from '../util.js';
import { createBoard } from '../board.js';
import { FIGUR_TYPE, SYMBOL_TYPE, figurToolbar, figurenTray, symboleTray, umbenennen, reiterLeiste } from './aktionsbrett.js';
import { KARTE_TYPE, kartenToolbar, kartenTray, beschriften } from './karten.js';
import { GEFUEHL_TYPE, gefuehlToolbar, gefuehlStapel } from './gefuehle.js';
import { SKALA_TYPE, skalaToolbar, skalaTray, frageSchreiben } from './skala-element.js';

const TYPES = { figur: FIGUR_TYPE, symbol: SYMBOL_TYPE, karte: KARTE_TYPE, gefuehl: GEFUEHL_TYPE, skala: SKALA_TYPE };

const REITER = {
  karten: { label: 'Karten', inhalt: (b) => kartenTray(b) },
  figuren: { label: 'Figuren', inhalt: (b) => figurenTray(b) },
  symbole: { label: 'Symbole', inhalt: (b) => symboleTray(b) },
  skalen: { label: 'Skalen', inhalt: (b) => skalaTray(b) },
  gefuehle: { label: 'Gefühle', inhalt: (b, stapel) => stapel().el },
};

/**
 * @param {object} opt
 *   klasse: CSS-Klasse, reiter: Liste der Seitenleisten-Reiter,
 *   hintergrund: (state, kontext) => Element, create: (phase) => Zustand,
 *   emptyHint, pfeile, tipp
 */
export function mischWerkzeug(opt) {
  return {
    create: opt.create,

    mount(container, { state, readOnly = false, onChange = () => {}, onHistory, schueler }) {
      const wrap = h('div', { class: `tool ${opt.klasse}` + (readOnly ? ' readonly' : '') });
      const main = h('div', { class: 'tool-main' });
      wrap.append(main);
      container.append(wrap);

      let stapel = null;
      const stapelHolen = () => (stapel ||= gefuehlStapel(board, state));

      const board = createBoard(main, {
        state,
        types: TYPES,
        readOnly,
        links: true,
        pfeile: !!opt.pfeile,
        onChange: () => {
          onChange();
          stapel?.neuZeichnen();
        },
        onHistory,
        emptyHint: opt.emptyHint || '',
        hintergrund: (s) => opt.hintergrund(s, { schueler }),
        onPlaced: (it) => {
          if (it.type === 'karte' && !it.text && !it.ink?.striche?.length) beschriften(it, board.api);
        },
        onDoubleTap: (it, api) => {
          if (it.type === 'karte') beschriften(it, api);
          else if (it.type === 'skala') frageSchreiben(it, api);
          else if (it.type === 'figur' || it.type === 'symbol') umbenennen(it, api);
        },
        toolbar: (it, api) => {
          if (it.type === 'karte') return kartenToolbar(it, api);
          if (it.type === 'gefuehl') return gefuehlToolbar(it, api);
          if (it.type === 'skala') return skalaToolbar(it, api, board);
          return figurToolbar(it, api);
        },
      });

      if (!readOnly) {
        const tray = reiterLeiste(
          opt.reiter.map((id) => ({ id, label: REITER[id].label, inhalt: () => REITER[id].inhalt(board, stapelHolen) })),
        );
        if (opt.tipp) tray.append(h('div', { class: 'tray-tipp' }, h('b', null, 'Tipp: '), opt.tipp));
        wrap.append(tray);
      }

      return {
        destroy() {
          board.destroy();
          wrap.remove();
        },
        undo: () => {
          board.undo();
          stapel?.neuZeichnen();
        },
        canUndo: () => board.canUndo(),
      };
    },
  };
}
