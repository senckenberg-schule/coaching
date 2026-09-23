// Gespeicherte Momente ansehen und nebeneinander vergleichen.
import { h, img, deepClone, formatTime } from '../util.js';
import { WERKZEUGE, phaseById } from '../data.js';
import { TOOL_IMPL } from '../tools/index.js';
import { sheet } from '../ui.js';

function ansicht(m) {
  const ph = phaseById(m.phase);
  const flaeche = h('div', { class: 'moment-stage' });
  const wrap = h(
    'div',
    { class: 'moment-pane theme-' + m.phase },
    h(
      'div',
      { class: 'mp-head' },
      img(ph.icon),
      h('div', null, h('b', null, m.titel), h('small', null, `${ph.name} · ${WERKZEUGE[m.tool]?.name || ''} · ${formatTime(m.createdAt)} Uhr`)),
    ),
    flaeche,
  );
  let inst = null;
  requestAnimationFrame(() => {
    inst = TOOL_IMPL[m.tool]?.mount(flaeche, { state: deepClone(m.state), readOnly: true, phase: m.phase });
  });
  return { el: wrap, destroy: () => inst?.destroy() };
}

export function zeigeMoment(m) {
  const a = ansicht(m);
  sheet({ title: 'Moment', content: a.el, cls: 'sheet-moment', onClose: a.destroy });
}

export function vergleicheMomente(m1, m2) {
  const [a, b] = [m1, m2].sort((x, y) => x.createdAt - y.createdAt).map(ansicht);
  const inhalt = h('div', { class: 'compare' }, a.el, b.el);
  sheet({
    title: 'Vergleich',
    content: inhalt,
    cls: 'sheet-moment compare-sheet',
    onClose: () => {
      a.destroy();
      b.destroy();
    },
  });
}
