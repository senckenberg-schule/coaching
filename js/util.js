// Kleine Helfer für DOM, IDs und Zahlen.

const SVG_NS = 'http://www.w3.org/2000/svg';

function applyProps(el, props, isSvg) {
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    } else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'html') el.innerHTML = v;
    else if (!isSvg && (k === 'value' || k === 'checked' || k === 'disabled')) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
}

function appendChildren(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** HTML-Element erzeugen: h('div', {class: 'x', onClick}, kinder…) */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  applyProps(el, props, false);
  appendChildren(el, children);
  return el;
}

/** SVG-Element erzeugen */
export function s(tag, props, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  applyProps(el, props, true);
  appendChildren(el, children);
  return el;
}

export const uid = () =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const deepClone = (o) => JSON.parse(JSON.stringify(o));

export function debounce(fn, ms) {
  let t;
  const d = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  d.flush = () => {
    clearTimeout(t);
    fn();
  };
  return d;
}

export function img(src, cls = '') {
  return h('img', { src, class: cls, draggable: 'false', alt: '' });
}

const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export function formatDate(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${WOCHENTAGE[d.getDay()]}, ${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Wartet, bis eine CSS-Animation/Transition vorbei ist (mit Sicherheits-Timeout). */
export function afterAnimation(el, ms = 600) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    el.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, ms);
  });
}

export function removeAnimated(el, cls = 'leaving', ms = 400) {
  el.classList.add(cls);
  afterAnimation(el, ms).then(() => el.remove());
}
