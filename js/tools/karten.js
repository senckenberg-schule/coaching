// Methodenkarten: rechteckig, rund oder oval – mit dem Stift beschriften, legen,
// verbinden und mit der Ampel priorisieren.
import { h, fuellen } from '../util.js';
import { icon } from '../icons.js';
import { trayItem } from '../board.js';
import { FARBEN } from '../data.js';
import { schreibfeld, karteInkSvg } from '../ink.js';
import { SVG_FORMEN, formSvg, formMiniSvg } from '../formen.js';
import { segmented } from '../ui.js';

const FORMEN = {
  rechteckig: { name: 'rechteckig', size: [21, 13.5] },
  rund: { name: 'rund', size: [15.5, 15.5] },
  oval: { name: 'oval', size: [23, 14] },
  herz: { name: 'Herz', size: [18, 16.5] },
  stern: { name: 'Stern', size: [19, 18.5] },
  kopf: { name: 'Kopf', size: [17, 19.5] },
};
const FORM_REIHE = ['rechteckig', 'rund', 'oval', 'herz', 'stern', 'kopf'];

/** Kleines Symbol der Form für Menüs. */
const formMini = (f) => (SVG_FORMEN[f] ? formMiniSvg(f) : h('span', { class: 'form-mini ' + f }));

export const AMPEL = {
  rot: { name: 'Später', text: 'kann warten', farbe: '#f03e3e' },
  gelb: { name: 'Bald', text: 'kommt als Nächstes', farbe: '#fab005' },
  gruen: { name: 'Jetzt', text: 'das packe ich an', farbe: '#2f9e44' },
};
// Links grün (jetzt), rechts rot (später)
const AMPEL_REIHE = ['gruen', 'gelb', 'rot'];

function schriftgroesse(text) {
  const n = (text || '').length;
  if (n <= 10) return 2.7;
  if (n <= 24) return 2.2;
  if (n <= 45) return 1.8;
  if (n <= 80) return 1.5;
  return 1.25;
}

export function karteElement(form, farbe, text, ink, ampel) {
  const hatSchrift = ink?.striche?.length > 0;
  const besonders = !!SVG_FORMEN[form];
  return h(
    'div',
    {
      class: `karte ${form}` + (besonders ? ' form-svg' : '') + (ampel ? ' ampel-' + ampel : ''),
      style: { '--c': farbe, '--ampel': AMPEL[ampel]?.farbe },
    },
    besonders ? formSvg(form) : null,
    // Ältere, getippte Karten zeigen ihren Text
    text
      ? h('span', { class: 'karte-text', style: { fontSize: `calc(var(--u) * ${schriftgroesse(text)})` } }, text)
      : null,
    !hatSchrift && !text ? h('span', { class: 'karte-leer' }, icon('pencil')) : null,
    ink ? karteInkSvg(ink) : null,
  );
}

function ampelLichter(aktiv, cls = 'ampel-badge') {
  return h(
    'div',
    { class: cls },
    AMPEL_REIHE.map((a) => h('i', { class: a + (a === aktiv ? ' an' : '') })),
  );
}

export const KARTE_TYPE = {
  size: (it) => FORMEN[it.form]?.size || FORMEN.rechteckig.size,
  rotate: true,
  scale: true,
  radius: (it) => (it.form === 'rechteckig' ? 'calc(var(--u) * 2.2)' : SVG_FORMEN[it.form] ? '24%' : '50%'),
  // Mit dem Stift direkt auf die Karte schreiben
  schreibbar: true,
  render(it, inner) {
    inner.append(karteElement(it.form, it.farbe, it.text, it.ink, it.ampel));
    if (it.ampel) inner.append(ampelLichter(it.ampel, 'ampel-badge ' + it.form));
  },
};

export async function beschriften(it, api) {
  const [w, hh] = FORMEN[it.form]?.size || FORMEN.rechteckig.size;
  const ink = await schreibfeld({ form: it.form, farbe: it.farbe, ink: it.ink, seitenverhaeltnis: hh / w });
  if (!ink) return;
  api.change(it, () => {
    it.ink = ink;
    if (ink.striche.length) it.text = '';
  });
}

export function kartenToolbar(it, api) {
  return [
    { icon: 'pencil', label: 'Schreiben', onClick: () => beschriften(it, api) },
    {
      content: ampelLichter(it.ampel, 'ampel-mini'),
      label: 'Ampel',
      menu: () => [
        ...AMPEL_REIHE.map((a) => ({
          content: h('i', { class: 'ampel-punkt', style: { background: AMPEL[a].farbe } }),
          label: AMPEL[a].name,
          active: it.ampel === a,
          onClick: () => api.change(it, () => (it.ampel = a)),
        })),
        { icon: 'x', label: 'keine', active: !it.ampel, onClick: () => api.change(it, () => delete it.ampel) },
      ],
    },
    {
      icon: 'palette',
      label: 'Farbe',
      menu: () =>
        FARBEN.map((f) => ({
          swatch: f,
          active: f === it.farbe,
          onClick: () => api.change(it, () => (it.farbe = f)),
        })),
    },
    {
      icon: 'shape',
      label: 'Form',
      menu: () =>
        FORM_REIHE.map((f) => ({
          content: formMini(f),
          label: FORMEN[f].name,
          active: f === it.form,
          onClick: () => api.change(it, () => (it.form = f)),
        })),
    },
    { icon: 'link', label: 'Verbinden', onClick: () => api.startLink(it) },
    { icon: 'trash', danger: true, onClick: () => api.remove(it) },
  ];
}

/** Hintergrund mit drei Ampel-Zonen. */
export function ampelHintergrund() {
  return h(
    'div',
    { class: 'vorlage-ampel' },
    AMPEL_REIHE.map((a) =>
      h(
        'div',
        { class: 'ampel-zone ' + a, style: { '--z': AMPEL[a].farbe } },
        h('div', { class: 'az-kopf' }, h('i'), h('b', null, AMPEL[a].name), h('small', null, AMPEL[a].text)),
      ),
    ),
  );
}

/** Karte in eine Zone gelegt: Ampel passend setzen. */
export function ampelZone(state, it) {
  if (state.vorlage !== 'ampel' || it.type !== 'karte') return false;
  const neu = it.x < 1 / 3 ? 'gruen' : it.x < 2 / 3 ? 'gelb' : 'rot';
  if (it.ampel === neu) return false;
  it.ampel = neu;
  return true;
}

/** Seitenleisten-Inhalt: neue Karten, Farbe und (optional) Hintergrund. */
export function kartenTray(board, { vorlage } = {}) {
  let farbe = FARBEN[2];
  const el = h('div', { class: 'tray-content' });
  function zeichnen() {
    fuellen(
      el,
      h('h3', null, 'Neue Karte'),
      h('p', { class: 'tray-hint' }, 'Tippe oder ziehe eine Karte auf die Fläche.'),
      h(
        'div',
        { class: 'tray-grid cards' },
        FORM_REIHE.map((form) =>
          trayItem(
            h('div', { class: 'card-preview ' + form }, karteElement(form, farbe), h('span', null, FORMEN[form].name)),
            (e) => board.addItem({ type: 'karte', form, farbe, text: '', rot: 0, scale: 1 }, e),
          ),
        ),
      ),
      h('h3', null, 'Farbe'),
      h(
        'div',
        { class: 'swatches' },
        FARBEN.map((f) =>
          h('button', {
            class: 'swatch' + (f === farbe ? ' active' : ''),
            style: { background: f },
            'aria-label': 'Farbe wählen',
            onClick: () => {
              farbe = f;
              zeichnen();
            },
          }),
        ),
      ),
      vorlage
        ? [
            h('h3', null, 'Hintergrund'),
            segmented(
              [
                { value: 'frei', label: 'Frei' },
                { value: 'ampel', label: 'Ampel' },
              ],
              vorlage.get(),
              (v) => vorlage.set(v),
            ),
            h('p', { class: 'tray-hint' }, 'Bei „Ampel“ bekommt eine Karte die Farbe der Zone, in die du sie legst.'),
          ]
        : null,
      h(
        'div',
        { class: 'tray-tipp' },
        h('b', null, 'Tipp: '),
        'Mit dem Stift direkt auf eine Karte schreiben – oder zweimal tippen für das große Schreibfeld.',
      ),
    );
  }
  zeichnen();
  return el;
}


