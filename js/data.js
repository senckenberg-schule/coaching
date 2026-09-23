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
    werkzeuge: ['skala', 'zeitlinie', 'aktionsbrett', 'karten'],
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
    werkzeuge: ['landkarte', 'karten', 'aktionsbrett', 'zeitlinie'],
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
    werkzeuge: ['karten', 'commitment', 'skala'],
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
    leitfragen: [
      'Wo stehst du heute?',
      'Was ist schon da, dass es nicht weiter unten ist?',
      'Woran würdest du merken, dass du einen Punkt weiter oben bist?',
      'Welcher Wert wäre für dich gut genug?',
    ],
  },
  aktionsbrett: {
    id: 'aktionsbrett',
    name: 'Aktionsbrett',
    icon: 'bilder/app/aktionsbrett.svg',
    info: 'Figuren und Symbole aufstellen',
    leitfragen: [
      'Wer gehört alles dazu?',
      'Wer steht wem nahe – wer ist weiter weg?',
      'Wohin schaut die Figur?',
      'Was müsste sich verändern, damit es sich besser anfühlt?',
      'Stell es einmal so auf, wie du es dir wünschst.',
    ],
  },
  karten: {
    id: 'karten',
    name: 'Karten',
    icon: 'bilder/app/karten.svg',
    info: 'Beschriften, verbinden, mit der Ampel ordnen',
    leitfragen: [
      'Was fällt dir alles dazu ein? Schreib jede Idee auf eine Karte.',
      'Was gehört zusammen?',
      'Ampel: Was packst du jetzt an (grün)? Was kommt bald (gelb)? Was kann warten (rot)?',
      'Welche grüne Karte ist dein erster Schritt?',
    ],
  },
  zeitlinie: {
    id: 'zeitlinie',
    name: 'Zeitlinie',
    icon: 'bilder/app/zeitlinie.svg',
    info: 'Vergangenheit, Heute, Zukunft – mit der Ich-Figur',
    leitfragen: [
      'Stell die Ich-Figur auf „Heute“. Wie ist es gerade?',
      'Geh in die Vergangenheit: Wann war es schon einmal gut?',
      'Was konntest du damals, das dir heute helfen kann? (als Pfeil mitnehmen)',
      'Geh in die Zukunft: Wie ist es, wenn dein Ziel erreicht ist?',
      'Was sagt dein Zukunfts-Ich zu dir heute?',
    ],
  },
  landkarte: {
    id: 'landkarte',
    name: 'Ressourcen-Landkarte',
    icon: 'bilder/app/landkarte.svg',
    info: 'Menschen, Stärken, Orte, Hobbys, Erfolge',
    leitfragen: [
      'Wer ist für dich da, wenn es schwierig wird?',
      'Was kannst du richtig gut?',
      'Wo fühlst du dich wohl?',
      'Was machst du gern – was gibt dir Energie?',
      'Was hast du schon geschafft, worauf du stolz bist?',
      'Je näher an dir, desto wichtiger: Wo gehört es hin?',
    ],
  },
  commitment: {
    id: 'commitment',
    name: 'Commitment',
    icon: 'bilder/app/commitment.svg',
    info: 'Das nehme ich mir vor – mit Unterschrift',
    leitfragen: [
      'Was genau nimmst du dir vor?',
      'Bis wann willst du das schaffen?',
      'Wer oder was kann dir dabei helfen?',
      'Wie sicher bist du? Was bräuchtest du für einen Punkt mehr?',
      'Wollen wir beide unterschreiben?',
    ],
  },
};

export const WERKZEUG_REIHENFOLGE = ['gefuehle', 'skala', 'aktionsbrett', 'karten', 'zeitlinie', 'landkarte', 'commitment'];

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
