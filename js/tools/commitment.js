// Commitment-Kärtchen: „Das nehme ich mir vor“ – von Hand geschrieben,
// mit Zuversicht (0–10) und Unterschriften. Wird beim Abschluss gezeigt
// und in der nächsten Sitzung wieder aufgegriffen.
import { h, img, formatDate, deepClone } from '../util.js';
import { icon } from '../icons.js';
import { inkFeld, STIFT_FARBEN, stift } from '../ink.js';
import { createHistory } from '../history.js';

const FELDER = [
  { id: 'vorhaben', label: 'Das nehme ich mir vor:' },
  { id: 'bis', label: 'Bis wann?' },
  { id: 'hilfe', label: 'Wer oder was hilft mir?' },
  { id: 'ich', label: 'Unterschrift' },
  { id: 'coach', label: 'Coach' },
];

export const ERGEBNISSE = {
  geklappt: { text: 'Geschafft!', bild: 'bilder/app/feier.svg', farbe: '#2f9e44' },
  teilweise: { text: 'Teilweise', bild: 'bilder/app/skala-3.svg', farbe: '#f59f00' },
  nochnicht: { text: 'Noch nicht', bild: 'bilder/app/skala-1.svg', farbe: '#7048e8' },
};

// Die Karte wird in fester Größe gestaltet und passend skaliert.
const BREITE = 900;
const HOEHE = 660;

export function hatInhalt(state) {
  if (!state) return false;
  return state.sicher != null || Object.values(state.felder || {}).some((f) => f?.striche?.length);
}

/** Findet das Commitment einer Sitzung (egal in welcher Phase es entstand). */
export function commitmentAus(ses) {
  const keys = Object.keys(ses.boards || {}).filter((k) => k.endsWith(':commitment'));
  keys.sort((a, b) => (a.startsWith('alle') ? -1 : 0) - (b.startsWith('alle') ? -1 : 0));
  for (const k of keys) if (hatInhalt(ses.boards[k])) return ses.boards[k];
  return null;
}

function karteBauen(state, { readOnly, schueler, vorAenderung, nachAenderung }) {
  const felder = {};
  for (const f of FELDER) {
    const feld = inkFeld({
      ink: state.felder[f.id] || null,
      readOnly,
      onStart: vorAenderung,
      onChange: (ink) => {
        state.felder[f.id] = ink;
        nachAenderung();
      },
    });
    const leeren = readOnly
      ? null
      : h(
          'button',
          {
            class: 'cm-leeren',
            'aria-label': 'Feld leeren',
            onClick: () => {
              vorAenderung();
              delete state.felder[f.id];
              feld.set(null);
              nachAenderung();
            },
          },
          icon('x', 'small'),
        );
    feld.el.append(leeren || '');
    felder[f.id] = h('div', { class: `cm-feld cm-${f.id}` }, h('label', null, f.label), feld.el);
  }

  const sicherReihe = h('div', { class: 'cm-sicher-reihe' });
  function sicherZeichnen() {
    sicherReihe.replaceChildren(
      img('bilder/app/skala-0.svg', 'cm-gesicht'),
      ...Array.from({ length: 11 }, (_, i) =>
        h(
          'button',
          {
            class: 'cm-punkt' + (state.sicher != null && i <= state.sicher ? ' an' : '') + (i === state.sicher ? ' wahl' : ''),
            style: { '--i': i },
            disabled: readOnly,
            onClick: () => {
              vorAenderung();
              state.sicher = state.sicher === i ? null : i;
              sicherZeichnen();
              nachAenderung();
            },
          },
          String(i),
        ),
      ),
      img('bilder/app/skala-4.svg', 'cm-gesicht'),
    );
  }
  sicherZeichnen();

  const erg = ERGEBNISSE[state.ergebnis];
  return h(
    'div',
    { class: 'cm-karte' },
    h(
      'div',
      { class: 'cm-kopf' },
      img('bilder/app/commitment.svg', 'cm-icon'),
      h('h2', null, 'Mein Versprechen an mich'),
      h('div', { class: 'cm-datum' }, schueler ? h('b', null, schueler.name) : null, formatDate(state.datum || Date.now())),
    ),
    felder.vorhaben,
    felder.bis,
    felder.hilfe,
    h('div', { class: 'cm-feld cm-sicher' }, h('label', null, 'So sicher bin ich:'), sicherReihe),
    felder.ich,
    felder.coach,
    erg
      ? h('div', { class: 'cm-stempel', style: { '--f': erg.farbe } }, img(erg.bild), h('span', null, erg.text))
      : null,
  );
}

const werkzeug = {
  create() {
    return { felder: {}, sicher: null, datum: Date.now() };
  },

  mount(container, { state, readOnly = false, onChange = () => {}, onHistory = () => {}, schueler }) {
    state.felder ||= {};
    const wrap = h('div', { class: 'tool tool-commitment' + (readOnly ? ' readonly' : '') });
    const buehne = h('div', { class: 'cm-buehne' });
    const skalierer = h('div', { class: 'cm-skalierer' });
    buehne.append(skalierer);
    wrap.append(buehne);
    container.append(wrap);

    const hist = createHistory(
      () => state,
      (s) => {
        state.felder = s.felder || {};
        state.sicher = s.sicher ?? null;
        zeichnen();
        onChange();
      },
      onHistory,
    );
    let vorher = null;
    const ctx = {
      readOnly,
      schueler,
      vorAenderung: () => (vorher = hist.capture()),
      nachAenderung: () => {
        if (vorher) hist.push(vorher);
        vorher = null;
        onChange();
      },
    };

    function zeichnen() {
      skalierer.replaceChildren(karteBauen(state, ctx));
    }
    zeichnen();

    // Karte in die verfügbare Fläche einpassen
    const ro = new ResizeObserver(() => {
      const f = Math.min(buehne.clientWidth / BREITE, buehne.clientHeight / HOEHE);
      skalierer.style.transform = `scale(${f})`;
      skalierer.style.left = (buehne.clientWidth - BREITE * f) / 2 + 'px';
      skalierer.style.top = (buehne.clientHeight - HOEHE * f) / 2 + 'px';
    });
    ro.observe(buehne);

    if (!readOnly) {
      const leiste = h('div', { class: 'cm-stiftleiste glass' });
      const leisteZeichnen = () =>
        leiste.replaceChildren(
          h('span', { class: 'ink-badge' }, icon('pencil', 'small')),
          ...STIFT_FARBEN.map((f) =>
            h('button', {
              class: 'ink-dot' + (f === stift.farbe ? ' active' : ''),
              style: { '--f': f },
              'aria-label': 'Stiftfarbe',
              onClick: () => {
                stift.farbe = f;
                leisteZeichnen();
              },
            }),
          ),
          h(
            'button',
            {
              class: 'tbtn' + (stift.dick ? ' active' : ''),
              'aria-label': 'Strichstärke',
              onClick: () => {
                stift.dick = !stift.dick;
                leisteZeichnen();
              },
            },
            h('span', { class: 'dicke-strich' + (stift.dick ? ' dick' : '') }),
          ),
        );
      leisteZeichnen();
      wrap.append(leiste);
    }

    return {
      destroy() {
        ro.disconnect();
        wrap.remove();
      },
      undo: () => hist.undo(),
      canUndo: () => hist.canUndo,
    };
  },
};

export default werkzeug;

/** Nur-Lese-Ansicht eines Commitments (für Abschluss und Rückblick). */
export function commitmentAnsicht(state, schueler) {
  const box = h('div', { class: 'cm-vorschau' });
  requestAnimationFrame(() => werkzeug.mount(box, { state: deepClone(state), readOnly: true, schueler }));
  return box;
}
