// Coach-Bereich: seitliche Schublade mit Phasen, Werkzeugen, Leitfragen, Momenten und Notizen.
import { h, img, formatTime, formatDate } from '../util.js';
import { icon } from '../icons.js';
import { PHASEN, WERKZEUGE, WERKZEUG_REIHENFOLGE, MOMENT_VORSCHLAEGE, phaseById, phaseIndex } from '../data.js';
import { ask, confirmDialog } from '../ui.js';
import { zeigeMoment, vergleicheMomente } from './moments.js';

export function openCoach(ctx) {
  const { ses } = ctx;
  const scrim = h('div', { class: 'drawer-scrim' });
  const panel = h('aside', { class: 'drawer glass' });
  scrim.append(panel);
  document.getElementById('layer').append(scrim);
  requestAnimationFrame(() => scrim.classList.add('open'));

  let vergleichsModus = false;
  const gewaehlt = new Set();

  function schliessen() {
    scrim.classList.remove('open');
    setTimeout(() => scrim.remove(), 380);
  }
  scrim.addEventListener('pointerdown', (e) => {
    if (e.target === scrim) schliessen();
  });

  function abschnitt(titel, ...inhalt) {
    return h('section', { class: 'dr-section' }, h('h3', null, titel), ...inhalt);
  }

  function zeichnen() {
    const p = phaseById(ses.phase);
    const aktivIdx = phaseIndex(ses.phase);
    const aktuell = ctx.aktuellesWerkzeug();

    panel.replaceChildren(
      h(
        'div',
        { class: 'dr-head' },
        h('div', { class: 'dr-title' }, img('bilder/app/coach.svg'), h('div', null, h('h2', null, 'Coach-Bereich'), h('small', null, `${ctx.schueler.name} · ${formatDate(ses.createdAt)}`))),
        h('button', { class: 'iconbtn glass', 'aria-label': 'Schließen', onClick: schliessen }, icon('x')),
      ),

      abschnitt(
        'Phase',
        h(
          'div',
          { class: 'dr-phases' },
          PHASEN.map((ph, i) =>
            h(
              'button',
              {
                class: 'dr-phase' + (ph.id === ses.phase ? ' active' : ''),
                'data-phase': ph.id,
                onClick: () => {
                  schliessen();
                  ctx.phaseWechseln(ph.id);
                },
              },
              img(ph.icon),
              h('span', null, h('small', null, `Phase ${i + 1}`), h('b', null, ph.name)),
            ),
          ),
        ),
        aktivIdx < PHASEN.length - 1
          ? h(
              'button',
              {
                class: 'gbtn primary wide',
                onClick: () => {
                  schliessen();
                  ctx.phaseWechseln(PHASEN[aktivIdx + 1].id);
                },
              },
              `Weiter zu „${PHASEN[aktivIdx + 1].name}“`,
              icon('arrowRight'),
            )
          : null,
      ),

      abschnitt(
        `Werkzeug für „${p.name}“`,
        h(
          'div',
          { class: 'dr-tools' },
          WERKZEUG_REIHENFOLGE.map((id) => {
            const w = WERKZEUGE[id];
            const empfohlen = p.werkzeuge.includes(id);
            return h(
              'button',
              {
                class: 'dr-tool' + (aktuell === id ? ' active' : ''),
                onClick: () => {
                  schliessen();
                  ctx.werkzeugWaehlen(id);
                },
              },
              img(w.icon),
              h('b', null, w.name),
              h('small', null, w.info),
              empfohlen ? h('span', { class: 'badge' }, 'passt gut') : null,
            );
          }),
          h(
            'button',
            {
              class: 'dr-tool none' + (!aktuell ? ' active' : ''),
              onClick: () => {
                schliessen();
                ctx.werkzeugWaehlen(null);
              },
            },
            img(p.icon),
            h('b', null, 'Phasenbild'),
            h('small', null, 'Nur Name und Frage der Phase zeigen'),
          ),
        ),
        aktuell
          ? h(
              'button',
              {
                class: 'gbtn ghost small-link',
                onClick: () => {
                  schliessen();
                  ctx.werkzeugLeeren();
                },
              },
              icon('eraser', 'small'),
              `${WERKZEUGE[aktuell].name} leeren`,
            )
          : null,
      ),

      abschnitt(
        'Leitfragen',
        h(
          'ul',
          { class: 'dr-questions' },
          p.leitfragen.map((q) => h('li', null, q)),
        ),
      ),

      abschnitt(
        'Momente',
        h(
          'button',
          {
            class: 'gbtn glass wide' + (aktuell ? '' : ' disabled'),
            onClick: async () => {
              if (!aktuell) return;
              const titel = await ask({
                title: 'Moment festhalten',
                placeholder: 'Titel, z. B. „So ist es jetzt“',
                suggestions: MOMENT_VORSCHLAEGE,
                okText: 'Festhalten',
              });
              if (titel === null) return;
              ctx.momentFesthalten(titel);
              zeichnen();
            },
          },
          img('bilder/app/moment.svg', 'btn-img'),
          aktuell ? 'Moment festhalten' : 'Erst ein Werkzeug wählen',
        ),
        momentListe(),
      ),

      abschnitt(
        'Notizen (nur für dich)',
        (() => {
          const ta = h('textarea', { class: 'field notes', rows: '5', placeholder: 'Beobachtungen, Vereinbarungen …', value: ses.notes || '' });
          ta.addEventListener('input', () => {
            ses.notes = ta.value;
            ctx.notizGeaendert();
          });
          return ta;
        })(),
      ),

      h(
        'div',
        { class: 'dr-footer' },
        h(
          'button',
          {
            class: 'gbtn primary wide',
            onClick: async () => {
              const ok = await confirmDialog({
                title: 'Sitzung beenden?',
                text: 'Die Sitzung wird gespeichert und als abgeschlossen markiert.',
                okText: 'Beenden',
              });
              if (!ok) return;
              schliessen();
              ctx.beenden();
            },
          },
          icon('flag'),
          'Sitzung beenden',
        ),
        h(
          'button',
          {
            class: 'gbtn glass wide',
            onClick: () => {
              schliessen();
              ctx.verlassen();
            },
          },
          icon('home'),
          'Zur Übersicht',
        ),
      ),
    );
  }

  function momentListe() {
    const liste = ses.moments || [];
    if (liste.length === 0) return h('p', { class: 'dr-empty' }, 'Noch keine Momente. Halte wichtige Zwischenstände fest, z. B. „So ist es jetzt“ und „So soll es sein“.');
    const wrap = h('div', { class: 'dr-moments' });
    if (liste.length >= 2) {
      wrap.append(
        h(
          'button',
          {
            class: 'chip glass' + (vergleichsModus ? ' active' : ''),
            onClick: () => {
              vergleichsModus = !vergleichsModus;
              gewaehlt.clear();
              zeichnen();
            },
          },
          icon('compare', 'small'),
          vergleichsModus ? 'Zwei Momente antippen …' : 'Vergleichen',
        ),
      );
    }
    for (const m of [...liste].reverse()) {
      const ph = phaseById(m.phase);
      const w = WERKZEUGE[m.tool];
      wrap.append(
        h(
          'button',
          {
            class: 'dr-moment' + (gewaehlt.has(m.id) ? ' picked' : ''),
            onClick: () => {
              if (!vergleichsModus) {
                zeigeMoment(m);
                return;
              }
              if (gewaehlt.has(m.id)) gewaehlt.delete(m.id);
              else gewaehlt.add(m.id);
              if (gewaehlt.size === 2) {
                const [a, b] = liste.filter((x) => gewaehlt.has(x.id));
                vergleichsModus = false;
                gewaehlt.clear();
                vergleicheMomente(a, b);
              }
              zeichnen();
            },
          },
          img(w?.icon || ph.icon),
          h('span', null, h('b', null, m.titel), h('small', null, `${ph.name} · ${w?.name || ''} · ${formatTime(m.createdAt)} Uhr`)),
          vergleichsModus ? h('i', { class: 'pick' }, icon('check', 'small')) : icon('chevronRight', 'small'),
        ),
      );
    }
    return wrap;
  }

  zeichnen();
}
