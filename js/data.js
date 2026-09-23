// Inhalte der App: Phasen, Werkzeuge, Leitfragen, Farben.
// Texte können hier bequem angepasst werden.

export const PHASEN = [
  {
    id: 'ankommen',
    name: 'Ankommen',
    icon: 'bilder/app/ankommen.svg',
    frage: 'Schön, dass du da bist! Wie geht es dir?',
    werkzeuge: ['gefuehle', 'skala'],
    skalaFrage: 'Wie geht es dir heute?',
    leitfragen: [
      'Wie geht es dir heute?',
      'Was hast du heute schon erlebt?',
      'Worüber möchtest du heute sprechen?',
      'Was müsste heute passieren, damit du sagst: Das hat sich gelohnt?',
    ],
  },
  {
    id: 'ziel',
    name: 'Ziel',
    icon: 'bilder/app/ziel.svg',
    frage: 'Was wünschst du dir? Wo möchtest du hin?',
    werkzeuge: ['skala', 'aktionsbrett', 'karten'],
    skalaFrage: 'Wo stehst du gerade – und wo möchtest du hin?',
    leitfragen: [
      'Was wünschst du dir stattdessen?',
      'Woran würdest du merken, dass es besser ist?',
      'Wer würde es als Erstes bemerken?',
      'Wo stehst du heute auf der Skala – und wo möchtest du hinkommen?',
      'Stell dir vor, über Nacht passiert ein Wunder … Was ist am nächsten Morgen anders?',
    ],
  },
  {
    id: 'kraftquellen',
    name: 'Kraftquellen',
    icon: 'bilder/app/kraftquellen.svg',
    frage: 'Was gibt dir Kraft? Wer hilft dir?',
    werkzeuge: ['karten', 'aktionsbrett'],
    skalaFrage: 'Wie viel Kraft hast du gerade?',
    leitfragen: [
      'Was kannst du richtig gut?',
      'Wann hast du schon mal etwas Schwieriges geschafft? Wie hast du das gemacht?',
      'Wer hilft dir, wenn es schwierig wird?',
      'Was macht dir Freude und gibt dir Energie?',
      'Was würde deine beste Freundin / dein bester Freund über deine Stärken sagen?',
    ],
  },
  {
    id: 'plan',
    name: 'Plan',
    icon: 'bilder/app/plan.svg',
    frage: 'Was ist dein nächster Schritt?',
    werkzeuge: ['karten', 'skala'],
    skalaFrage: 'Wie sicher bist du, dass du deinen ersten Schritt schaffst?',
    leitfragen: [
      'Was ist ein kleiner erster Schritt?',
      'Wann genau fängst du damit an?',
      'Wer oder was kann dich dabei unterstützen?',
      'Wie sicher bist du, dass du es schaffst – von 0 bis 10?',
      'Was machst du, wenn etwas dazwischenkommt?',
    ],
  },
];

export const phaseById = (id) => PHASEN.find((p) => p.id === id) || PHASEN[0];
export const phaseIndex = (id) => Math.max(0, PHASEN.findIndex((p) => p.id === id));

export const WERKZEUGE = {
  gefuehle: {
    id: 'gefuehle',
    name: 'Gefühle',
    icon: 'bilder/app/gefuehle.svg',
    info: 'Gefühlskarten auswählen, legen und einschätzen',
  },
  skala: {
    id: 'skala',
    name: 'Skala',
    icon: 'bilder/app/skala.svg',
    info: 'Skalen auf die Fläche ziehen und Punkte setzen',
  },
  aktionsbrett: {
    id: 'aktionsbrett',
    name: 'Aktionsbrett',
    icon: 'bilder/app/aktionsbrett.svg',
    info: 'Figuren und Symbole aufstellen',
  },
  karten: {
    id: 'karten',
    name: 'Karten',
    icon: 'bilder/app/karten.svg',
    info: 'Methodenkarten beschriften, legen und verbinden',
  },
};

export const WERKZEUG_REIHENFOLGE = ['gefuehle', 'skala', 'aktionsbrett', 'karten'];

export const FARBEN = [
  '#ff6b6b', // rot
  '#ffa94d', // orange
  '#ffd43b', // gelb
  '#69db7c', // grün
  '#3bc9db', // türkis
  '#4c6ef5', // blau
  '#9775fa', // lila
  '#f783ac', // pink
  '#c08457', // holz
  '#868e96', // grau
];

export const MOMENT_VORSCHLAEGE = [
  'So ist es jetzt',
  'So soll es sein',
  'Meine Gefühle',
  'Meine Kraftquellen',
  'Mein Plan',
];
