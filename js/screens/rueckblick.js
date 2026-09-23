// Rückblick: Zu Beginn einer neuen Sitzung wird das Commitment
// von letztem Mal gezeigt – „Wie ist es gelaufen?“
import { h, img, formatDate } from '../util.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { FARBEN } from '../data.js';
import { toast } from '../ui.js';
import { commitmentAus, commitmentAnsicht, ERGEBNISSE } from '../tools/commitment.js';

/** Das jüngste Commitment aus einer früheren Sitzung derselben Person. */
export function vorherigesCommitment(ses) {
  for (const s of store.sessionsFor(ses.studentId)) {
    if (s.id === ses.id || s.createdAt > ses.createdAt) continue;
    const state = commitmentAus(s);
    if (state) return { ses: s, state };
  }
  return null;
}

function konfetti() {
  const box = h('div', { class: 'confetti klein' });
  for (let i = 0; i < 40; i++) {
    box.append(
      h('i', {
        class: 'c' + (i % 3),
        style: {
          left: Math.random() * 100 + '%',
          background: FARBEN[i % FARBEN.length],
          animationDelay: Math.random() * 0.6 + 's',
          animationDuration: 2 + Math.random() * 1.5 + 's',
          '--drift': (Math.random() - 0.5) * 160 + 'px',
          '--spin': (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540) + 'deg',
        },
      }),
    );
  }
  return box;
}

export function zeigeRueckblick({ vorher, ses, schueler, onChange = () => {} }) {
  const vorschauPlatz = h('div', { class: 'rb-vorschau' }, commitmentAnsicht(vorher.state, schueler));
  const ov = h('div', { class: 'rueckblick' });
  const schliessen = () => {
    ov.classList.add('out');
    setTimeout(() => ov.remove(), 400);
  };

  function waehlen(key) {
    vorher.state.ergebnis = key;
    store.touch(vorher.ses);
    ses.rueckblick = { session: vorher.ses.id, ergebnis: key, am: Date.now() };
    onChange();
    // Karte mit Stempel neu zeigen
    vorschauPlatz.replaceChildren(commitmentAnsicht(vorher.state, schueler));
    if (key === 'geklappt') {
      ov.append(konfetti());
      toast('Super, du hast es geschafft!', 'bilder/app/feier.svg');
    }
    knoepfe.classList.add('gewaehlt');
    setTimeout(schliessen, key === 'geklappt' ? 2600 : 1600);
  }

  const knoepfe = h(
    'div',
    { class: 'rb-knoepfe' },
    Object.entries(ERGEBNISSE).map(([key, e]) =>
      h(
        'button',
        { class: 'rb-knopf' + (vorher.state.ergebnis === key ? ' aktiv' : ''), style: { '--f': e.farbe }, onClick: () => waehlen(key) },
        img(e.bild),
        h('span', null, key === 'geklappt' ? 'Hat geklappt!' : e.text),
      ),
    ),
  );

  ov.append(
    h(
      'div',
      { class: 'rb-karte glass' },
      h(
        'div',
        { class: 'rb-kopf' },
        h('div', null, h('h2', null, 'Letztes Mal hast du dir vorgenommen …'), h('small', null, `am ${formatDate(vorher.ses.createdAt)}`)),
        h('button', { class: 'iconbtn glass', 'aria-label': 'Später', onClick: schliessen }, icon('x')),
      ),
      vorschauPlatz,
      h('p', { class: 'rb-frage' }, 'Wie ist es gelaufen?'),
      knoepfe,
    ),
  );
  document.getElementById('layer').append(ov);
}
