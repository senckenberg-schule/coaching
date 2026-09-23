// Dialoge, Hinweise und andere Oberflächen-Bausteine im Glas-Stil.
import { h, initials } from './util.js';
import { icon } from './icons.js';

const layer = () => document.getElementById('layer');

/** Öffnet ein Glas-Fenster. Gibt {el, close} zurück. */
export function sheet({ title, content, wide = false, cls = '', onClose, closable = true }) {
  const scrim = h('div', { class: 'scrim' });
  const panel = h('div', { class: 'sheet glass ' + (wide ? 'wide ' : '') + cls });
  const kopf = h('div', { class: 'sheet-head' }, h('h2', null, title || ''));
  if (closable) {
    kopf.append(h('button', { class: 'iconbtn glass', 'aria-label': 'Schließen', onClick: () => close() }, icon('x')));
  }
  const body = h('div', { class: 'sheet-body' });
  if (content) body.append(content);
  panel.append(kopf, body);
  scrim.append(panel);
  layer().append(scrim);
  requestAnimationFrame(() => scrim.classList.add('open'));

  let offen = true;
  function close() {
    if (!offen) return;
    offen = false;
    scrim.classList.remove('open');
    scrim.classList.add('closing');
    setTimeout(() => scrim.remove(), 320);
    onClose?.();
  }
  if (closable) {
    scrim.addEventListener('pointerdown', (e) => {
      if (e.target === scrim) close();
    });
  }
  return { el: panel, body, close };
}

/** Texteingabe. Liefert den Text oder null bei Abbruch. */
export function ask({ title, value = '', placeholder = '', multiline = false, suggestions = [], okText = 'Fertig' }) {
  return new Promise((resolve) => {
    let fertig = false;
    const feld = multiline
      ? h('textarea', { class: 'field', rows: '3', placeholder, value })
      : h('input', { class: 'field', type: 'text', placeholder, value, enterkeyhint: 'done', autocomplete: 'off' });
    const ok = () => {
      fertig = true;
      s.close();
      resolve(feld.value.trim());
    };
    feld.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (!multiline || !e.shiftKey)) {
        e.preventDefault();
        ok();
      }
    });
    const chips = suggestions.length
      ? h(
          'div',
          { class: 'chips' },
          suggestions.map((t) =>
            h('button', { class: 'chip glass', onClick: () => ((feld.value = t), feld.focus()) }, t),
          ),
        )
      : null;
    const inhalt = h(
      'div',
      { class: 'ask' },
      feld,
      chips,
      h('div', { class: 'actions' }, h('button', { class: 'gbtn primary', onClick: ok }, icon('check'), okText)),
    );
    const s = sheet({
      title,
      content: inhalt,
      cls: 'sheet-ask',
      onClose: () => {
        if (!fertig) resolve(null);
      },
    });
    // Sofort fokussieren: iOS öffnet die Tastatur nur direkt nach einer Berührung.
    const fokus = () => {
      feld.focus({ preventScroll: true });
      if (feld.setSelectionRange) feld.setSelectionRange(feld.value.length, feld.value.length);
    };
    fokus();
    setTimeout(fokus, 80);
  });
}

/** Sicherheitsabfrage. */
export function confirmDialog({ title, text = '', okText = 'Ja', cancelText = 'Abbrechen', danger = false }) {
  return new Promise((resolve) => {
    let antwort = false;
    const inhalt = h(
      'div',
      { class: 'confirm' },
      text ? h('p', null, text) : null,
      h(
        'div',
        { class: 'actions' },
        h('button', { class: 'gbtn glass', onClick: () => s.close() }, cancelText),
        h(
          'button',
          {
            class: 'gbtn ' + (danger ? 'danger' : 'primary'),
            onClick: () => {
              antwort = true;
              s.close();
            },
          },
          okText,
        ),
      ),
    );
    const s = sheet({ title, content: inhalt, cls: 'sheet-confirm', onClose: () => resolve(antwort) });
  });
}

/** Kurzer Hinweis am unteren Rand. */
export function toast(text, bild) {
  const t = h(
    'div',
    { class: 'toast glass' },
    bild ? h('img', { src: bild, alt: '', draggable: 'false' }) : null,
    h('span', null, text),
  );
  layer().append(t);
  setTimeout(() => t.classList.add('out'), 2200);
  setTimeout(() => t.remove(), 2700);
}

/** Weißer Blitz wie beim Fotografieren. */
export function flash() {
  const f = h('div', { class: 'flash' });
  layer().append(f);
  setTimeout(() => f.remove(), 700);
}

/** Segment-Schalter (z. B. „Figuren | Symbole“). */
export function segmented(options, value, onChange) {
  const wrap = h('div', { class: 'seg' });
  const knopf = h('div', { class: 'seg-thumb' });
  wrap.append(knopf);
  const buttons = options.map((o, i) => {
    const b = h('button', { class: 'seg-btn' }, o.icon || null, h('span', null, o.label));
    b.addEventListener('click', () => setzen(o.value, true));
    b.dataset.i = i;
    wrap.append(b);
    return b;
  });
  function setzen(v, melden) {
    const i = Math.max(0, options.findIndex((o) => o.value === v));
    buttons.forEach((b, j) => b.classList.toggle('active', j === i));
    knopf.style.width = `calc((100% - 8px) / ${options.length})`;
    knopf.style.transform = `translateX(${i * 100}%)`;
    if (melden) onChange(options[i].value);
  }
  setzen(value, false);
  return wrap;
}

export function avatar(student, size = '') {
  return h(
    'div',
    { class: 'avatar ' + size, style: { '--c': student.farbe || '#9775fa' } },
    h('span', null, initials(student.name)),
  );
}
