// Lädt die Bilderlisten aus dem Ordner „bilder“.
// Eigene Bilder: Datei in den Ordner legen und in der JSON-Liste eintragen.

let gefuehle = null;
let symbole = null;
let personen = [];

async function json(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url} konnte nicht geladen werden`);
  return res.json();
}

function vorladen(urls) {
  for (const u of urls) {
    const i = new Image();
    i.src = u;
  }
}

export async function loadAssets() {
  const [g, s, p] = await Promise.all([
    json('bilder/gefuehle/gefuehle.json'),
    json('bilder/symbole/symbole.json'),
    json('bilder/personen/personen.json').catch(() => ({ personen: [] })),
  ]);
  gefuehle = {
    gruppen: g.gruppen,
    karten: g.karten.map((k) => ({ ...k, bild: 'bilder/gefuehle/' + k.bild })),
  };
  symbole = s.symbole.map((k) => ({ ...k, bild: 'bilder/symbole/' + k.bild }));
  personen = p.personen.map((k) => ({ ...k, bild: 'bilder/personen/' + k.bild }));
  vorladen([...gefuehle.karten, ...symbole, ...personen].map((k) => k.bild));
}

export const getGefuehle = () => gefuehle;
export const getSymbole = () => symbole;
export const getPersonen = () => personen;

export function gefuehlById(id) {
  return gefuehle.karten.find((k) => k.id === id);
}

export function gruppeById(id) {
  return gefuehle.gruppen.find((g) => g.id === id) || { farbe: '#adb5bd', name: '' };
}
