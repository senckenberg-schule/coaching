// Abschluss: kleine Feier mit Konfetti.
import { h, img } from '../util.js';
import { PHASEN, FARBEN } from '../data.js';

export function showFinish(schueler, ses, weiter) {
  document.body.className = 'theme-plan';
  const konfetti = h('div', { class: 'confetti' });
  for (let i = 0; i < 70; i++) {
    const form = i % 3;
    konfetti.append(
      h('i', {
        class: 'c' + form,
        style: {
          left: Math.random() * 100 + '%',
          background: FARBEN[i % FARBEN.length],
          animationDelay: Math.random() * 1.2 + 's',
          animationDuration: 2.6 + Math.random() * 2 + 's',
          '--drift': (Math.random() - 0.5) * 160 + 'px',
          '--spin': (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540) + 'deg',
        },
      }),
    );
  }
  const geschafft = (ses.maxPhase ?? 0) + 1;
  const ov = h(
    'div',
    { class: 'finish' },
    konfetti,
    h(
      'div',
      { class: 'finish-card glass' },
      h('div', { class: 'fc-icon' }, img('bilder/app/feier.svg')),
      h('h1', null, `Super gemacht, ${schueler.name}!`),
      h('p', null, geschafft >= PHASEN.length ? 'Du hast alle vier Phasen geschafft.' : `Du hast heute ${geschafft} von ${PHASEN.length} Phasen geschafft.`),
      h(
        'div',
        { class: 'fc-phases' },
        PHASEN.map((p, i) =>
          h('div', { class: 'fc-phase' + (i < geschafft ? ' done' : ''), style: { '--d': 0.5 + i * 0.18 + 's' } }, img(p.icon), h('span', null, p.name)),
        ),
      ),
      h(
        'button',
        {
          class: 'gbtn primary big',
          onClick: () => {
            ov.classList.add('out');
            setTimeout(() => ov.remove(), 450);
            weiter();
          },
        },
        'Fertig',
      ),
    ),
  );
  document.getElementById('layer').append(ov);
}
