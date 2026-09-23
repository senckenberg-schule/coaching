import commitment from './commitment.js';
import { flaecheWerkzeug } from './flaeche.js';

// Alle Werkzeuge außer dem Commitment arbeiten auf derselben Arbeitsfläche.
export const TOOL_IMPL = {
  gefuehle: flaecheWerkzeug('gefuehle'),
  skala: flaecheWerkzeug('skala'),
  aktionsbrett: flaecheWerkzeug('aktionsbrett'),
  karten: flaecheWerkzeug('karten'),
  zeitlinie: flaecheWerkzeug('zeitlinie'),
  landkarte: flaecheWerkzeug('landkarte'),
  commitment,
};

export const istFlaeche = (id) => !!TOOL_IMPL[id]?.flaeche;
