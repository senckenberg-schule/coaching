// Zeitlinie: Vergangenheit – Heute – Zukunft. Die Ich-Figur wandert auf der Linie,
// Ereignisse, Gefühle und Symbole werden daneben gelegt, Pfeile nehmen
// Kraftquellen aus der Vergangenheit mit in die Zukunft.
import { h, uid } from '../util.js';
import { mischWerkzeug } from './misch.js';

function hintergrund() {
  return h(
    'div',
    { class: 'vorlage-zeitlinie' },
    h('div', { class: 'zl-flaeche vergangenheit' }),
    h('div', { class: 'zl-flaeche zukunft' }),
    h('div', { class: 'zl-linie' }),
    h('div', { class: 'zl-heute' }, h('i'), h('b', null, 'Heute')),
    h('div', { class: 'zl-label links' }, h('b', null, 'Vergangenheit'), h('small', null, 'Was war?')),
    h('div', { class: 'zl-label rechts' }, h('b', null, 'Zukunft'), h('small', null, 'Wie soll es sein?')),
  );
}

export default mischWerkzeug({
  klasse: 'tool-zeitlinie',
  reiter: ['karten', 'gefuehle', 'symbole', 'figuren'],
  hintergrund,
  pfeile: true,
  emptyHint: '',
  tipp: 'Schieb die Ich-Figur an verschiedene Zeitpunkte. Verbinde eine Karte aus der Vergangenheit mit der Zukunft – so nimmst du eine Kraftquelle mit.',
  create() {
    return {
      items: [
        // Die Ich-Figur steht auf „Heute“ und schaut in die Zukunft
        { id: uid(), type: 'figur', form: 'rund', groesse: 'gross', farbe: '#4c6ef5', name: 'Ich', rot: 90, x: 0.5, y: 0.48 },
      ],
      links: [],
      ink: [],
    };
  },
});
