// Start der App: Bilder laden, Bildschirme wechseln, Offline-Modus aktivieren.
import { h } from './util.js';
import { store } from './store.js';
import { loadAssets } from './assets.js';
import { renderHome } from './screens/home.js';
import { renderSession } from './screens/session.js';
import { toast } from './ui.js';

const app = document.getElementById('app');
let aktuell = null;

function wechseln(bauen) {
  const alt = aktuell;
  if (alt) {
    alt.destroy?.();
    alt.el.classList.add('screen-leave');
    setTimeout(() => alt.el.remove(), 350);
  }
  aktuell = bauen();
  aktuell.el.classList.add('screen-enter');
}

const nav = {
  home() {
    wechseln(() => renderHome(app, nav));
  },
  session(id, opts) {
    if (!store.session(id)) return nav.home();
    wechseln(() => renderSession(app, id, nav, opts));
  },
};

// iPad: Safari-Zoom und Kontextmenüs verhindern, :active-Zustände aktivieren.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('touchstart', () => {}, { passive: true });
document.addEventListener('contextmenu', (e) => {
  if (!e.target.closest('input, textarea')) e.preventDefault();
});
document.addEventListener(
  'touchmove',
  (e) => {
    if (!e.target.closest('.home, .sheet-body, .drawer, .tray, textarea')) e.preventDefault();
  },
  { passive: false },
);

store.onSaveError(() => toast('Speichern nicht möglich – der Speicher ist voll.'));

async function start() {
  try {
    await loadAssets();
  } catch (err) {
    app.append(
      h(
        'div',
        { class: 'fatal glass' },
        h('h2', null, 'Die App konnte nicht starten'),
        h('p', null, 'Bitte die App über einen Webserver öffnen (nicht als Datei). Details stehen in der README.'),
        h('code', null, String(err.message || err)),
      ),
    );
    return;
  }
  navigator.storage?.persist?.().catch(() => {});
  nav.home();
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

start();
