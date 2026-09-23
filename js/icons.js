// Einfache Linien-Symbole für Schaltflächen (24×24, Strichstärke über CSS).
import { h } from './util.js';

const PATHS = {
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  palette:
    '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.7-1 1.2-1.9-.6-1.1 0-2.4 1.3-2.4H17a4 4 0 0 0 4-4c0-5.2-4-9.7-9-9.7z"/><circle cx="7.5" cy="11.5" r="1.3" class="f"/><circle cx="10.5" cy="7.3" r="1.3" class="f"/><circle cx="15.2" cy="8" r="1.3" class="f"/>',
  trash: '<path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7l1 13h9l1-13"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  rotate: '<path d="M19.5 12.5a7.5 7.5 0 1 1-2.2-5.8"/><path d="M19.5 4v5h-5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  camera: '<path d="M4 8.5h3.2L9 5.5h6l1.8 3H20V19H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  chevronLeft: '<path d="M15 5l-7 7 7 7"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6.5 9.5V20h11V9.5"/>',
  sliders: '<path d="M4 7h9M19 7h1M4 17h3M13 17h7"/><circle cx="16" cy="7" r="2.5"/><circle cx="10" cy="17" r="2.5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  upload: '<path d="M12 16V5M7 10l5-5 5 5"/><path d="M5 20h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.6v.2"/>',
  shape: '<rect x="3.5" y="3.5" width="8" height="8" rx="2"/><circle cx="16.5" cy="16.5" r="4"/>',
  compare: '<rect x="3" y="4" width="7.5" height="16" rx="2"/><rect x="13.5" y="4" width="7.5" height="16" rx="2"/>',
  play: '<path d="M8 5l11 7-11 7z" class="f"/>',
  note: '<path d="M6 3.5h9l3.5 3.5v13.5H6z"/><path d="M9 10h6M9 13.5h6M9 17h3.5"/>',
  eraser: '<path d="M15 4l5 5-9.5 9.5H6.5L3.5 15.5z"/><path d="M10 20h10"/><path d="M9.5 9.5l5 5"/>',
  resize: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
  flag: '<path d="M6 21V4"/><path d="M6 4h11l-2 4 2 4H6"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  exit: '<path d="M14 4h5v16h-5"/><path d="M10 8l-4 4 4 4M6 12h9"/>',
  user: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  hand: '<path d="M9 12V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M12 10.5V9a1.5 1.5 0 0 1 3 0v2"/><path d="M15 11a1.5 1.5 0 0 1 3 0v4a6 6 0 0 1-6 6h-.8a6 6 0 0 1-4.9-2.6l-2.4-3.5a1.5 1.5 0 0 1 2.4-1.8L9 15"/>',
  dot: '<circle cx="12" cy="12" r="4" class="f"/>',
};

export function icon(name, cls = '') {
  const span = h('span', { class: 'ico ' + cls, 'aria-hidden': 'true' });
  span.innerHTML = `<svg viewBox="0 0 24 24">${PATHS[name] || ''}</svg>`;
  return span;
}
