// Die gemeinsame Arbeitsfläche. Alle Werkzeuge (außer dem Commitment) legen
// ihre Elemente auf dieselbe Fläche – beim Werkzeugwechsel bleibt alles liegen,
// es wechselt nur die Seitenleiste.
import { h, uid } from '../util.js';
import { createBoard } from '../board.js';
import { phaseById } from '../data.js';
import { FIGUR_TYPE, SYMBOL_TYPE, PERSON_TYPE, figurToolbar, figurenTray, symboleTray, umbenennen, reiterLeiste } from './aktionsbrett.js';
import { KARTE_TYPE, kartenToolbar, kartenTray, beschriften, ampelHintergrund, ampelZone } from './karten.js';
import { GEFUEHL_TYPE, gefuehlToolbar, gefuehlStapel } from './gefuehle.js';
import { SKALA_TYPE, skalaToolbar, skalaTray, frageSchreiben, neueSkala } from './skala-element.js';
import {
  ZEITSTRAHL_TYPE,
  LANDKARTE_TYPE,
  grossToolbar,
  zeitstrahlTray,
  landkarteTray,
  neuerZeitstrahl,
  neueLandkarte,
  ichFigurDazu,
} from './elemente.js';

const TYPES = {
  figur: FIGUR_TYPE,
  symbol: SYMBOL_TYPE,
  person: PERSON_TYPE,
  karte: KARTE_TYPE,
  gefuehl: GEFUEHL_TYPE,
  skala: SKALA_TYPE,
  zeitstrahl: ZEITSTRAHL_TYPE,
  landkarte: LANDKARTE_TYPE,
};

/** Welche Seitenleiste zu welchem Werkzeug gehört – und was beim Öffnen automatisch dazukommt. */
export const FLAECHEN_WERKZEUGE = {
  gefuehle: { reiter: ['gefuehle'], hinweis: 'Welche Gefühle hast du gerade? Lege sie hierher.' },
  skala: { reiter: ['skalen'], hinweis: 'Ziehe eine Skala auf die Fläche', auto: 'skala' },
  aktionsbrett: { reiter: ['figuren', 'symbole', 'skalen'], hinweis: 'Ziehe Figuren und Symbole auf das Brett' },
  karten: { reiter: ['karten', 'skalen'], hinweis: 'Ziehe eine Karte auf die Fläche und beschrifte sie' },
  zeitlinie: { reiter: ['zeitstrahl', 'karten', 'gefuehle', 'figuren'], hinweis: '', auto: 'zeitstrahl' },
  landkarte: { reiter: ['landkarte', 'figuren', 'symbole', 'karten'], hinweis: '', auto: 'landkarte' },
};

const REITER_NAMEN = {
  karten: 'Karten',
  figuren: 'Figuren',
  symbole: 'Symbole',
  skalen: 'Skalen',
  gefuehle: 'Gefühle',
  zeitstrahl: 'Zeitstrahl',
  landkarte: 'Landkarte',
};

export const leereFlaeche = () => ({ items: [], links: [], ink: [], flaeche: true });

// ---------------------------------------------------------------
// Ältere Daten (eine Fläche pro Werkzeug) übernehmen
// ---------------------------------------------------------------

/** Wandelt den Zustand eines alten Werkzeugs in das Format der gemeinsamen Fläche um. */
export function altesFormat(state, toolId) {
  if (!state || state.flaeche) return state;
  // Skala als Treppe (erste Version)
  if (!Array.isArray(state.items) && Array.isArray(state.marker)) {
    state.items = [
      neueSkala({
        id: uid(),
        x: 0.5,
        y: 0.45,
        scale: 1.5,
        modus: state.modus || 'zahlen',
        titel: state.frage || '',
        marker: state.marker.map((m) => ({ id: m.id || uid(), typ: m.typ, wert: m.wert })),
      }),
    ];
  }
  state.items ||= [];
  state.links ||= [];
  state.ink ||= [];
  // Zeitlinie und Landkarte waren früher Hintergründe – jetzt Elemente
  if (toolId === 'zeitlinie' && !state.items.some((i) => i.type === 'zeitstrahl')) {
    state.items.unshift(neuerZeitstrahl({ id: uid(), x: 0.5, y: 0.6, scale: 1.1 }));
    state.links.forEach((l) => (l.pfeil = true));
  }
  if (toolId === 'landkarte' && !state.items.some((i) => i.type === 'landkarte')) {
    state.items.unshift(neueLandkarte({ id: uid(), x: 0.5, y: 0.5, scale: 1.25 }));
  }
  delete state.frage;
  delete state.modus;
  delete state.marker;
  state.flaeche = true;
  return state;
}

/**
 * Baut die gemeinsame Fläche eines Bereichs (Phase oder „alle“) aus den
 * alten Einzelflächen zusammen. Nichts geht verloren.
 */
export function flaecheZusammenfuehren(boards, bereich) {
  const neu = leereFlaeche();
  for (const id of Object.keys(FLAECHEN_WERKZEUGE)) {
    const key = `${bereich}:${id}`;
    const alt = boards[key];
    if (!alt) continue;
    altesFormat(alt, id);
    const unten = alt.items.filter((i) => TYPES[i.type]?.unten);
    const oben = alt.items.filter((i) => !TYPES[i.type]?.unten);
    neu.items = [...unten, ...neu.items, ...oben];
    neu.links.push(...alt.links);
    neu.ink.push(...alt.ink);
    if (alt.vorlage) neu.vorlage = alt.vorlage;
    delete boards[key];
  }
  return neu;
}

// ---------------------------------------------------------------
// Anzeige
// ---------------------------------------------------------------

export function flaecheMount(container, { state, readOnly = false, onChange = () => {}, onHistory, werkzeug, phase }) {
  altesFormat(state, werkzeug);
  const wrap = h('div', { class: 'tool tool-flaeche' + (readOnly ? ' readonly' : '') });
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
    // In der Zeitlinie zeigen neue Verbindungen eine Richtung (Kraftquelle „mitnehmen“)
    pfeile: () => aktuell === 'zeitlinie',
    onChange: () => {
      onChange();
      stapel?.neuZeichnen();
    },
    onHistory,
    emptyHint: FLAECHEN_WERKZEUGE[werkzeug]?.hinweis || '',
    hintergrund: (s) => (s.vorlage === 'ampel' ? ampelHintergrund() : null),
    onMoved: (it) => ampelZone(state, it),
    onPlaced: (it) => {
      if (it.type === 'karte' && !it.text && !it.ink?.striche?.length) beschriften(it, board.api);
    },
    onDoubleTap: (it, api) => {
      if (it.type === 'karte') beschriften(it, api);
      else if (it.type === 'skala') frageSchreiben(it, api);
      else if (it.type === 'figur' || it.type === 'symbol' || it.type === 'person') umbenennen(it, api);
    },
    toolbar: (it, api) => {
      if (it.type === 'karte') return kartenToolbar(it, api);
      if (it.type === 'gefuehl') return gefuehlToolbar(it, api);
      if (it.type === 'skala') return skalaToolbar(it, api, board);
      if (it.type === 'zeitstrahl' || it.type === 'landkarte') return grossToolbar(it, api);
      return figurToolbar(it, api);
    },
  });

  const vorlage = {
    get: () => state.vorlage || 'frei',
    set(v) {
      state.vorlage = v === 'ampel' ? 'ampel' : undefined;
      board.hintergrundNeu();
      onChange();
    },
  };

  const INHALT = {
    karten: () => kartenTray(board, { vorlage }),
    figuren: () => figurenTray(board),
    symbole: () => symboleTray(board),
    skalen: () => skalaTray(board),
    gefuehle: () => stapelHolen().el,
    zeitstrahl: () => zeitstrahlTray(board),
    landkarte: () => landkarteTray(board),
  };

  let tray = null;
  let aktuell = werkzeug;

  /** Werkzeug wechseln: neue Seitenleiste, die Fläche bleibt. */
  function werkzeugSetzen(id, phaseId = phase) {
    aktuell = id;
    const def = FLAECHEN_WERKZEUGE[id];
    if (!def) return;
    board.setHinweis(def.hinweis);
    if (readOnly) return;
    const neu = reiterLeiste(def.reiter.map((r) => ({ id: r, label: REITER_NAMEN[r], inhalt: INHALT[r] })));
    if (tray) tray.replaceWith(neu);
    else wrap.append(neu);
    tray = neu;
    autoElement(def.auto, phaseId);
  }

  // Auf einer leeren Fläche legt das Werkzeug sein Hauptelement gleich bereit.
  // Liegt schon etwas da, wird nichts darübergelegt – dann aus der Seitenleiste holen.
  function autoElement(art, phaseId) {
    if (state.items.length || state.ink.length) return;
    if (art) board.ansichtZuruecksetzen();
    const hat = (typ) => state.items.some((i) => i.type === typ);
    if (art === 'skala' && !hat('skala')) {
      board.addItem(neueSkala({ id: uid(), x: 0.5, y: 0.42, scale: 1.5, titel: phaseById(phaseId).skalaFrage }));
    } else if (art === 'zeitstrahl' && !hat('zeitstrahl')) {
      board.addItem(neuerZeitstrahl({ id: uid(), x: 0.5, y: 0.6 }));
      // Die Ich-Figur steht auf dem Zeitstrahl über „Heute“
      ichFigurDazu(board, 0.5, 0.53);
    } else if (art === 'landkarte' && !hat('landkarte')) {
      board.addItem(neueLandkarte({ id: uid(), x: 0.5, y: 0.5 }));
    }
  }

  werkzeugSetzen(werkzeug, phase);

  return {
    flaeche: true,
    werkzeugSetzen,
    get werkzeug() {
      return aktuell;
    },
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
}

/** Werkzeug-Objekt für die Registry (alle nutzen dieselbe Fläche). */
export function flaecheWerkzeug(id) {
  return {
    flaeche: true,
    create: leereFlaeche,
    mount: (container, opts) => flaecheMount(container, { ...opts, werkzeug: id }),
  };
}
