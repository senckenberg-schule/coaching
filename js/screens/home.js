// Startseite: Schülerinnen und Schüler, Sitzungen, Einstellungen.
import { h, img, formatDate, formatTime } from '../util.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { FARBEN, PHASEN, phaseById, phaseIndex } from '../data.js';
import { sheet, ask, confirmDialog, toast, avatar } from '../ui.js';

export function renderHome(root, nav) {
  document.body.className = 'theme-home';
  const el = h('div', { class: 'screen home' });
  root.append(el);

  function zeichnen() {
    const schueler = store.students();
    el.replaceChildren();
    el.append(
      h(
        'header',
        { class: 'home-head' },
        h(
          'div',
          { class: 'brand' },
          h('div', { class: 'brand-icon glass' }, img('icons/logo.svg')),
          h('div', null, h('h1', null, 'Coaching'), h('p', null, 'Ankommen · Ziel · Kraftquellen · Plan')),
        ),
        h('button', { class: 'iconbtn glass', 'aria-label': 'Einstellungen', onClick: einstellungen }, icon('sliders')),
      ),
      h('h2', { class: 'section-title' }, 'Wer ist heute dran?'),
      h(
        'div',
        { class: 'student-grid' },
        schueler.map((st, i) => kachel(st, i)),
        h(
          'button',
          { class: 'student-tile add glass', style: { '--i': schueler.length }, onClick: neuerSchueler },
          h('div', { class: 'add-icon' }, icon('plus')),
          h('div', { class: 'st-name' }, 'Neu anlegen'),
        ),
      ),
      schueler.length === 0
        ? h(
            'div',
            { class: 'empty-hint' },
            img('bilder/app/ankommen.svg'),
            h('p', null, 'Lege die erste Person an – ein Vorname oder ein Kürzel reicht.'),
          )
        : '',
    );
  }

  function kachel(st, i) {
    const sitzungen = store.sessionsFor(st.id);
    const letzte = sitzungen[0];
    return h(
      'button',
      { class: 'student-tile glass', style: { '--i': i }, onClick: () => schuelerBlatt(st) },
      avatar(st, 'lg'),
      h('div', { class: 'st-name' }, st.name),
      h(
        'div',
        { class: 'st-meta' },
        sitzungen.length === 0
          ? 'Noch keine Sitzung'
          : `${sitzungen.length} ${sitzungen.length === 1 ? 'Sitzung' : 'Sitzungen'} · ${formatDate(letzte.createdAt).slice(4)}`,
      ),
    );
  }

  async function neuerSchueler() {
    const name = await ask({ title: 'Neue Person', placeholder: 'Vorname oder Kürzel' });
    if (!name) return;
    const farbe = FARBEN[store.students().length % FARBEN.length];
    const st = store.addStudent(name, farbe);
    zeichnen();
    schuelerBlatt(st);
  }

  function schuelerBlatt(st) {
    const inhalt = h('div', { class: 'student-sheet' });
    const s = sheet({ title: '', content: inhalt, wide: true, cls: 'sheet-student' });

    function blattZeichnen() {
      const sitzungen = store.sessionsFor(st.id);
      inhalt.replaceChildren(
        h(
          'div',
          { class: 'ss-head' },
          avatar(st, 'xl'),
          h(
            'div',
            { class: 'ss-title' },
            h('h2', null, st.name),
            h(
              'div',
              { class: 'ss-tools' },
              h('button', { class: 'chip glass', onClick: umbenennen }, icon('pencil', 'small'), 'Umbenennen'),
              h(
                'div',
                { class: 'mini-swatches' },
                FARBEN.map((f) =>
                  h('button', {
                    class: 'swatch sm' + (st.farbe === f ? ' active' : ''),
                    style: { background: f },
                    'aria-label': 'Farbe',
                    onClick: () => {
                      store.updateStudent(st.id, { farbe: f });
                      blattZeichnen();
                      zeichnen();
                    },
                  }),
                ),
              ),
            ),
          ),
        ),
        h(
          'button',
          {
            class: 'gbtn primary big start-btn',
            onClick: () => {
              const ses = store.newSession(st.id);
              s.close();
              nav.session(ses.id, { intro: true });
            },
          },
          icon('play'),
          'Neue Sitzung starten',
        ),
        h('h3', { class: 'section-title sm' }, sitzungen.length ? 'Bisherige Sitzungen' : ''),
        h(
          'div',
          { class: 'session-list' },
          sitzungen.map((ses) => {
            const ph = phaseById(ses.phase);
            const idx = Math.max(phaseIndex(ses.phase), ses.maxPhase || 0);
            return h(
              'div',
              { class: 'session-row glass' },
              h(
                'button',
                {
                  class: 'sr-main',
                  onClick: () => {
                    s.close();
                    nav.session(ses.id);
                  },
                },
                h(
                  'div',
                  { class: 'sr-phases' },
                  PHASEN.map((p, i) =>
                    h('span', { class: 'sr-dot' + (i <= idx ? ' done' : ''), title: p.name }, img(p.icon)),
                  ),
                ),
                h(
                  'div',
                  { class: 'sr-text' },
                  h('b', null, formatDate(ses.createdAt)),
                  h(
                    'span',
                    null,
                    `${formatTime(ses.createdAt)} Uhr · ${ses.finished ? 'abgeschlossen' : 'zuletzt: ' + ph.name}` +
                      (ses.moments?.length ? ` · ${ses.moments.length} ${ses.moments.length === 1 ? 'Moment' : 'Momente'}` : ''),
                  ),
                ),
                h('span', { class: 'sr-go' }, ses.finished ? 'Ansehen' : 'Fortsetzen', icon('chevronRight', 'small')),
              ),
              h(
                'button',
                {
                  class: 'iconbtn ghost danger',
                  'aria-label': 'Sitzung löschen',
                  onClick: async () => {
                    const ok = await confirmDialog({
                      title: 'Sitzung löschen?',
                      text: `Die Sitzung vom ${formatDate(ses.createdAt)} wird endgültig gelöscht.`,
                      okText: 'Löschen',
                      danger: true,
                    });
                    if (ok) {
                      store.deleteSession(ses.id);
                      blattZeichnen();
                      zeichnen();
                    }
                  },
                },
                icon('trash'),
              ),
            );
          }),
        ),
        h(
          'button',
          {
            class: 'gbtn ghost danger small-link',
            onClick: async () => {
              const ok = await confirmDialog({
                title: `${st.name} löschen?`,
                text: 'Alle Sitzungen dieser Person werden ebenfalls gelöscht.',
                okText: 'Endgültig löschen',
                danger: true,
              });
              if (ok) {
                store.deleteStudent(st.id);
                s.close();
                zeichnen();
              }
            },
          },
          icon('trash', 'small'),
          'Person löschen',
        ),
      );
    }

    async function umbenennen() {
      const name = await ask({ title: 'Name ändern', value: st.name });
      if (name) {
        store.updateStudent(st.id, { name });
        blattZeichnen();
        zeichnen();
      }
    }

    blattZeichnen();
  }

  function einstellungen() {
    const datei = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
    datei.addEventListener('change', async () => {
      const f = datei.files?.[0];
      if (!f) return;
      try {
        const n = store.importData(JSON.parse(await f.text()));
        toast(`Sicherung geladen (${n} neue Einträge)`);
        zeichnen();
      } catch (err) {
        toast('Die Datei konnte nicht gelesen werden.');
      }
      datei.value = '';
    });
    const inhalt = h(
      'div',
      { class: 'settings' },
      h('h3', null, 'Datensicherung'),
      h(
        'p',
        null,
        'Alle Daten bleiben nur auf diesem Gerät. Sichere sie ab und zu als Datei (z. B. in „Dateien“), damit nichts verloren geht.',
      ),
      h(
        'div',
        { class: 'actions left' },
        h('button', { class: 'gbtn glass', onClick: exportieren }, icon('download'), 'Sicherung speichern'),
        h('button', { class: 'gbtn glass', onClick: () => datei.click() }, icon('upload'), 'Sicherung laden'),
        datei,
      ),
      h('h3', null, 'Eigene Bilder'),
      h(
        'p',
        null,
        'Die Bilder liegen im Ordner „bilder“. Ersetze eine Datei durch ein eigenes Bild mit gleichem Namen, oder trage neue Bilder in die Liste (gefuehle.json bzw. symbole.json) ein.',
      ),
      h('h3', null, 'Bildnachweis'),
      h(
        'p',
        { class: 'credit' },
        'Emojis von OpenMoji – das Open-Source-Emoji- und Icon-Projekt. Lizenz: CC BY-SA 4.0 (openmoji.org).',
      ),
      h('h3', null, 'Alles löschen'),
      h(
        'div',
        { class: 'actions left' },
        h(
          'button',
          {
            class: 'gbtn danger',
            onClick: async () => {
              const ok = await confirmDialog({
                title: 'Wirklich alle Daten löschen?',
                text: 'Alle Personen und Sitzungen auf diesem Gerät werden gelöscht. Das kann nicht rückgängig gemacht werden.',
                okText: 'Alles löschen',
                danger: true,
              });
              if (ok) {
                store.wipe();
                s.close();
                zeichnen();
              }
            },
          },
          icon('trash'),
          'Alle Daten löschen',
        ),
      ),
    );
    const s = sheet({ title: 'Einstellungen', content: inhalt, wide: true });
  }

  async function exportieren() {
    const text = store.exportData();
    const d = new Date();
    const name = `coaching-sicherung-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
    const file = new File([text], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Coaching-Sicherung' });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    const url = URL.createObjectURL(file);
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  zeichnen();
  return { el, destroy() {} };
}
