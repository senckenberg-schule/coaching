# Coaching-App

Interaktive Coaching-App für Schülerinnen und Schüler, gemacht für das **iPad mit Multitouch**.
Der Coach wählt die Werkzeuge aus, die Schülerin oder der Schüler arbeitet direkt auf der Fläche.

Das Coaching folgt dem **4-Phasen-Modell**:

| Phase | Frage für die Schüler | Passende Werkzeuge |
|---|---|---|
| 1 · Ankommen | Schön, dass du da bist! Wie geht es dir? | Gefühle, Skala |
| 2 · Ziel | Was wünschst du dir? Wo möchtest du hin? | Skala, Aktionsbrett, Karten |
| 3 · Kraftquellen | Was gibt dir Kraft? Wer hilft dir? | Karten, Aktionsbrett |
| 4 · Plan | Was ist dein nächster Schritt? | Karten, Skala |

## Werkzeuge

- **Gefühle** – 20 Gefühlskarten (nach Grundgefühl sortiert) aufs Brett legen, die Stärke einschätzen (ein bisschen / mittel / sehr).
- **Skala** – eine Treppe von 0 bis 10. Punkte wie „Heute“, „Ziel“, „Nächster Schritt“ oder eigene Punkte darauf ziehen. Wahlweise mit Zahlen oder Gesichtern.
- **Aktionsbrett** – Figuren (rund/eckig, groß/klein, 10 Farben) mit Augen für die Blickrichtung, dazu Symbole (Zuhause, Schule, Stein, Stern …). Figuren lassen sich benennen und drehen.
- **Karten** – Methodenkarten in rechteckig, rund oder oval, **mit dem Apple Pencil (oder Finger) beschriftet**, mit Linien verbindbar.

## Bedienung

- **Ein Finger** verschiebt, **zwei Finger** drehen (und bei Karten und Symbolen: vergrößern). Mehrere Dinge lassen sich gleichzeitig bewegen.
- **Apple Pencil:** Der Stift zeichnet auf der Arbeitsfläche (Aktionsbrett, Gefühle, Karten), die Finger verschieben weiterhin. Die Stiftleiste unten links bietet Farben, dünn/dick, Radierer, Zeichnung löschen und den Modus **„Finger malt“** (falls kein Stift da ist).
- **Karten beschriften:** Beim Anlegen einer Karte öffnet sich ein großes Schreibfeld in Form der Karte. Man kann auch mit dem Stift direkt auf eine Karte auf der Fläche schreiben. Zweimal tippen öffnet das Schreibfeld erneut.
- Kurz mit dem Stift auf eine Figur oder ein Gefühl tippen wählt es aus.
- Antippen zeigt eine kleine Leiste zum Benennen, Umfärben, Drehen und Löschen.
- Oben rechts: **Rückgängig**.
- **Coach-Bereich:** Das Coach-Symbol oben links **gedrückt halten**. Dort: Phase wechseln, Werkzeug wählen, Leitfragen, Momente festhalten und vergleichen, Notizen, Sitzung beenden.
- **Momente** sind Zwischenstände, z. B. „So ist es jetzt“ und „So soll es sein“. Zwei Momente lassen sich nebeneinander vergleichen.

## Datenschutz und Speicherung

- Alle Daten bleiben **nur auf dem Gerät** (im Browser-Speicher). Es gibt keinen Server und keine Cloud.
- Pro Person werden Sitzungen gespeichert und lassen sich später fortsetzen.
- Sicherung: Startseite → Einstellungen (Regler-Symbol) → **Sicherung speichern** / **Sicherung laden**. Tipp: regelmäßig in „Dateien“ sichern.
- Wichtig: Die App auf dem Home-Bildschirm hat einen **eigenen Speicher**, getrennt von Safari. Also immer dieselbe Variante verwenden.

## Auf das iPad bringen

Die App ist eine Web-App ohne Build-Schritt: Es sind nur HTML-, CSS- und JavaScript-Dateien. Sie muss einmal über **https** erreichbar sein.

1. Dateien auf einen Webserver legen, z. B. mit **GitHub Pages**: im Repository *Settings → Pages → Source: „Deploy from a branch“ → Branch `main`, Ordner `/ (root)`*.
   Alternativ geht jeder einfache Webspace oder z. B. Netlify (Ordner hineinziehen).
2. Die Adresse auf dem iPad in **Safari** öffnen.
3. Teilen-Symbol → **„Zum Home-Bildschirm“**. Die App startet danach im Vollbild und funktioniert auch **offline**.

### Zum Testen auf dem Computer

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen. Ein Doppelklick auf `index.html` funktioniert nicht, weil der Browser dann keine Dateien nachladen darf.

## Eigene Bilder verwenden

Alle Bilder liegen im Ordner `bilder/`:

```
bilder/
  gefuehle/   Gefühlskarten + gefuehle.json (Liste mit Name, Datei, Gruppe)
  symbole/    Symbole fürs Aktionsbrett + symbole.json
  app/        Bilder der Oberfläche (Phasen, Werkzeuge, Skala-Gesichter)
```

- **Bild austauschen:** Neue Datei mit **genau demselben Namen** in den Ordner legen (z. B. `bilder/gefuehle/traurig.svg`).
  Andere Formate (z. B. `.png`) gehen auch; dann in der JSON-Liste den Dateinamen anpassen.
- **Gefühl hinzufügen:** Bild in `bilder/gefuehle/` legen und in `gefuehle.json` einen Eintrag ergänzen:
  ```json
  { "id": "erleichtert", "name": "erleichtert", "bild": "erleichtert.png", "gruppe": "freude" }
  ```
  Gruppen: `freude`, `ueberraschung`, `trauer`, `wut`, `angst`, `scham` (Farben stehen oben in der Datei).
- **Symbol hinzufügen:** genauso in `bilder/symbole/symbole.json`.
- Empfehlung: quadratische Bilder, etwa 512 × 512 Pixel, gern mit transparentem Hintergrund.

Texte wie Leitfragen, Phasenfragen und Farben stehen in `js/data.js`.

## Aufbau des Codes

```
index.html            Einstieg
css/app.css           Gestaltung (Glas-Optik, Animationen, Farbwelten der Phasen)
js/main.js            Start, Bildschirmwechsel, iPad-Einstellungen
js/data.js            Phasen, Leitfragen, Werkzeuge, Farben
js/store.js           Speicherung auf dem Gerät, Sicherung
js/board.js           Gemeinsame Multitouch-Fläche (Aktionsbrett, Karten, Gefühle)
js/gestures.js        Gesten: ziehen, drehen, skalieren, lange drücken
js/tools/             Die vier Werkzeuge
js/screens/           Startseite, Sitzung, Coach-Bereich, Momente, Abschluss
sw.js                 Offline-Modus
```

## Ideen für später

- Eigene Fotos direkt in der App aufnehmen oder aus „Fotos“ hinzufügen
- Verlauf der Skala über mehrere Sitzungen
- Sitzungsprotokoll als PDF
- Bedürfniskarten als Ergänzung zu den Gefühlskarten

## Verwendete Bibliothek

Weiche, druckempfindliche Stiftstriche: [perfect-freehand](https://github.com/steveruizok/perfect-freehand) (MIT-Lizenz), liegt in `js/vendor/`.

## Bildnachweis

Die Platzhalter-Bilder stammen von **[OpenMoji](https://openmoji.org)**, dem Open-Source-Emoji- und Icon-Projekt.
Lizenz: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
