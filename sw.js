// Offline-Modus: Dateien werden auf dem Gerät zwischengespeichert.
// Strategie: sofort aus dem Speicher liefern und im Hintergrund aktualisieren.
// So erscheinen neue Versionen (z. B. ausgetauschte Bilder) beim nächsten Start.

const CACHE = 'coaching-v1';

const KERN = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/main.js',
  'js/util.js',
  'js/icons.js',
  'js/data.js',
  'js/store.js',
  'js/assets.js',
  'js/ui.js',
  'js/gestures.js',
  'js/history.js',
  'js/board.js',
  'js/tools/index.js',
  'js/tools/aktionsbrett.js',
  'js/tools/skala.js',
  'js/tools/karten.js',
  'js/tools/gefuehle.js',
  'js/screens/home.js',
  'js/screens/session.js',
  'js/screens/coach.js',
  'js/screens/moments.js',
  'js/screens/finish.js',
  'icons/logo.svg',
  'icons/icon-192.png',
  'icons/apple-touch-icon.png',
  'bilder/gefuehle/gefuehle.json',
  'bilder/symbole/symbole.json',
  ...[
    'ankommen', 'ziel', 'kraftquellen', 'plan', 'aktionsbrett', 'skala', 'karten', 'gefuehle',
    'coach', 'moment', 'feier', 'glanz', 'heute', 'flagge', 'schritt', 'eigene', 'schueler',
    'skala-0', 'skala-1', 'skala-2', 'skala-3', 'skala-4',
  ].map((n) => `bilder/app/${n}.svg`),
];

async function bilderAusListen(cache) {
  const listen = [
    ['bilder/gefuehle/gefuehle.json', 'karten', 'bilder/gefuehle/'],
    ['bilder/symbole/symbole.json', 'symbole', 'bilder/symbole/'],
  ];
  for (const [url, feld, ordner] of listen) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      const daten = await res.json();
      await cache.addAll(daten[feld].map((k) => ordner + k.bild));
    } catch {
      /* offline oder Liste fehlerhaft – wird beim nächsten Mal versucht */
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(KERN);
      await bilderAusListen(cache);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const namen = await caches.keys();
      await Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const gespeichert = await cache.match(req, { ignoreSearch: true });
      const netz = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      if (gespeichert) {
        event.waitUntil(netz);
        return gespeichert;
      }
      return (await netz) || new Response('Offline', { status: 503 });
    })(),
  );
});
