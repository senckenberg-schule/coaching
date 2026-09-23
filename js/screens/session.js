// Sitzung: Phasenleiste oben, Arbeitsfläche für die Schülerin / den Schüler.
import { h, img, deepClone, uid } from '../util.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { PHASEN, WERKZEUGE, phaseById, phaseIndex } from '../data.js';
import { TOOL_IMPL, istFlaeche } from '../tools/index.js';
import { flaecheZusammenfuehren } from '../tools/flaeche.js';
import { avatar, toast, flash, confirmDialog } from '../ui.js';
import { openCoach } from './coach.js';
import { showFinish } from './finish.js';
import { vorherigesCommitment, zeigeRueckblick } from './rueckblick.js';

export function renderSession(root, sessionId, nav, { intro = false } = {}) {
  const ses = store.session(sessionId);
  const schueler = store.student(ses.studentId);
  ses.tools ||= {};
  ses.boards ||= {};
  ses.moments ||= [];

  const el = h('div', { class: 'screen session' });
  const phasenleiste = h('div', { class: 'phasebar glass' });
  const undoBtn = h('button', { class: 'iconbtn glass undo', 'aria-label': 'Rückgängig' }, icon('undo'));
  const coachBtn = h(
    'button',
    { class: 'coach-btn glass', 'aria-label': 'Coach-Bereich öffnen' },
    img('bilder/app/coach.svg'),
  );
  const buehne = h('main', { class: 'stage' });

  el.append(
    h(
      'header',
      { class: 'topbar' },
      h('div', { class: 'tb-left' }, coachBtn, h('div', { class: 'who glass' }, avatar(schueler, 'sm'), h('span', null, schueler.name))),
      phasenleiste,
      h('div', { class: 'tb-right' }, undoBtn),
    ),
    buehne,
  );
  root.append(el);

  let werkzeug = null; // laufendes Werkzeug
  const speichern = () => store.touch(ses);

  // Im Modus „durchgehend“ teilen sich alle Phasen dieselbe Arbeitsfläche.
  const bereich = () => (ses.durchgehend ? 'alle' : ses.phase);
  const aktuellesWerkzeug = () => ses.tools[bereich()] || null;
  // Alle Werkzeuge außer dem Commitment nutzen dieselbe Fläche („flaeche“).
  const art = (toolId) => (istFlaeche(toolId) ? 'flaeche' : toolId);
  const flaechenKey = (toolId, b = bereich()) => `${b}:${art(toolId)}`;

  /** Zustand einer Fläche holen – ältere Einzelflächen werden dabei zusammengeführt. */
  function flaecheHolen(toolId, b = bereich()) {
    const key = flaechenKey(toolId, b);
    if (!ses.boards[key]) {
      ses.boards[key] = istFlaeche(toolId) ? flaecheZusammenfuehren(ses.boards, b) : TOOL_IMPL[toolId].create(ses.phase);
    }
    return ses.boards[key];
  }

  // ---------- Phasen ----------
  function themaSetzen() {
    document.body.className = 'theme-' + ses.phase;
  }

  function phasenleisteZeichnen() {
    const aktiv = phaseIndex(ses.phase);
    phasenleiste.replaceChildren(
      ...PHASEN.map((p, i) =>
        h(
          'div',
          {
            class:
              'phase-pill' +
              (i === aktiv ? ' active' : '') +
              (i < aktiv || i <= (ses.maxPhase ?? 0) ? ' done' : ''),
            role: 'button',
            'aria-label': `Zur Phase ${p.name}`,
            onClick: () => phaseWechseln(p.id),
          },
          h('span', { class: 'pp-icon' }, img(p.icon)),
          h('span', { class: 'pp-text' }, h('small', null, `Phase ${i + 1}`), h('b', null, p.name)),
        ),
      ),
    );
  }

  /**
   * Einblendung der Phase: kurze Animation, dann „Tippe, um loszulegen“.
   * Erst nach dem Tipp erscheint die Arbeitsfläche.
   */
  let introOffen = null;
  function phaseIntro(p, danach = () => {}) {
    introOffen?.(true);
    const i = phaseIndex(p.id);
    const ov = h(
      'div',
      { class: 'phase-intro' },
      h(
        'div',
        { class: 'pi-card' },
        h('div', { class: 'pi-icon' }, img(p.icon)),
        h('div', { class: 'pi-nr' }, `Phase ${i + 1} von ${PHASEN.length}`),
        h('h1', null, p.name),
        h('p', null, p.frage),
        h('div', { class: 'pi-los' }, icon('hand'), 'Tippe, um loszulegen'),
      ),
    );
    buehne.classList.add('wartet');
    const t0 = performance.now();
    const weg = (sofort = false) => {
      if (introOffen !== weg) return;
      introOffen = null;
      ov.classList.add('out');
      setTimeout(() => ov.remove(), 450);
      buehne.classList.remove('wartet');
      if (!sofort) {
        buehne.classList.add('auftauchen');
        setTimeout(() => buehne.classList.remove('auftauchen'), 700);
        danach();
      }
    };
    introOffen = weg;
    // Sehr frühe Tipps (z. B. der Tipp auf die Phase selbst) nicht mitzählen
    ov.addEventListener('pointerup', () => {
      if (performance.now() - t0 > 350) weg();
    });
    document.getElementById('layer').append(ov);
  }

  function phaseWechseln(id) {
    if (id === ses.phase) return;
    ses.phase = id;
    ses.maxPhase = Math.max(ses.maxPhase || 0, phaseIndex(id));
    speichern();
    themaSetzen();
    phasenleisteZeichnen();
    phaseIntro(phaseById(id));
    // Durchgehende Arbeitsfläche bleibt einfach stehen – nur die Farben wechseln.
    if (!ses.durchgehend || !werkzeug) buehneZeichnen();
  }

  // ---------- Bühne ----------
  function phasenStart(p) {
    const i = phaseIndex(p.id);
    return h(
      'div',
      { class: 'phase-home' },
      h(
        'div',
        { class: 'phase-card glass' },
        h('div', { class: 'pc-icon' }, img(p.icon)),
        h('div', { class: 'pc-nr' }, `Phase ${i + 1} von ${PHASEN.length}`),
        h('h1', null, p.name),
        h('p', null, p.frage),
      ),
    );
  }

  function buehneZeichnen({ neu = false } = {}) {
    // Noch nichts gewählt: mit dem ersten passenden Werkzeug der Phase loslegen
    if (ses.tools[bereich()] === undefined) ses.tools[bereich()] = phaseById(ses.phase).werkzeuge[0] || null;
    const toolId = aktuellesWerkzeug();
    // Wechsel zwischen zwei Werkzeugen der Arbeitsfläche: nur die Seitenleiste tauschen
    if (!neu && werkzeug?.flaeche && istFlaeche(toolId) && werkzeug.key === flaechenKey(toolId)) {
      werkzeug.werkzeugSetzen(toolId, ses.phase);
      undoAktualisieren();
      return;
    }
    const alt = [...buehne.children];
    alt.forEach((c) => {
      c.classList.add('stage-leave');
      setTimeout(() => c.remove(), 260);
    });
    werkzeug?.destroy();
    werkzeug = null;

    const p = phaseById(ses.phase);
    const platz = h('div', { class: 'stage-inner stage-enter' });
    buehne.append(platz);

    if (!toolId || !TOOL_IMPL[toolId]) {
      platz.append(phasenStart(p));
    } else {
      werkzeug = TOOL_IMPL[toolId].mount(platz, {
        state: flaecheHolen(toolId),
        phase: ses.phase,
        schueler,
        onChange: speichern,
        onHistory: undoAktualisieren,
      });
      werkzeug.key = flaechenKey(toolId);
      speichern();
    }
    undoAktualisieren();
  }

  function undoAktualisieren() {
    const kann = !!werkzeug?.canUndo();
    undoBtn.classList.toggle('disabled', !kann);
    undoBtn.classList.toggle('gone', !werkzeug);
  }
  undoBtn.addEventListener('click', () => {
    if (!werkzeug?.canUndo()) return;
    werkzeug.undo();
    undoBtn.classList.add('spin');
    setTimeout(() => undoBtn.classList.remove('spin'), 450);
    undoAktualisieren();
  });

  // ---------- Coach-Bereich ----------
  coachBtn.addEventListener('click', coach);

  function coach() {
    openCoach({
      ses,
      schueler,
      aktuellesWerkzeug,
      phaseWechseln,
      durchgehend: () => !!ses.durchgehend,
      durchgehendSetzen,
      werkzeugWaehlen(id) {
        ses.tools[bereich()] = id;
        speichern();
        buehneZeichnen();
      },
      momentFesthalten,
      async werkzeugLeeren() {
        const id = aktuellesWerkzeug();
        if (!id) return;
        const ok = await confirmDialog({
          title: istFlaeche(id) ? 'Arbeitsfläche leeren?' : `${WERKZEUGE[id].name} leeren?`,
          text: 'Alles auf dieser Fläche wird entfernt. Gespeicherte Momente bleiben erhalten.',
          okText: 'Leeren',
          danger: true,
        });
        if (!ok) return;
        ses.boards[flaechenKey(id)] = TOOL_IMPL[id].create(ses.phase);
        speichern();
        buehneZeichnen({ neu: true });
      },
      beenden() {
        ses.finished = true;
        ses.maxPhase = Math.max(ses.maxPhase || 0, phaseIndex(ses.phase));
        speichern();
        store.saveNow();
        showFinish(schueler, ses, () => nav.home());
      },
      verlassen() {
        store.saveNow();
        nav.home();
      },
      notizGeaendert: speichern,
      rueckblick: vorherCm ? () => zeigeRueckblick({ vorher: vorherCm, ses, schueler, onChange: speichern }) : null,
      rueckblickErgebnis: () => vorherCm?.state.ergebnis || null,
    });
  }

  /** Modus wechseln, ohne dass sich die sichtbare Fläche ändert. */
  function durchgehendSetzen(an) {
    if (an === !!ses.durchgehend) return;
    // Ältere Einzelflächen vorher zusammenführen
    for (const b of ['alle', ...PHASEN.map((p) => p.id)]) {
      if (!ses.boards[`${b}:flaeche`] && Object.keys(ses.boards).some((k) => k.startsWith(b + ':') && istFlaeche(k.split(':')[1]))) {
        ses.boards[`${b}:flaeche`] = flaecheZusammenfuehren(ses.boards, b);
      }
    }
    if (an) {
      const tool = ses.tools[ses.phase] || null;
      for (const kind of ['flaeche', 'commitment']) {
        // Was gerade zu sehen ist, zuerst – sonst die späteste Phase mit Inhalt
        const reihe = [ses.phase, ...PHASEN.map((p) => p.id).reverse()];
        const quelle = reihe.map((ph) => ses.boards[`${ph}:${kind}`]).find(Boolean);
        const sichtbar = tool && art(tool) === kind;
        if (quelle && (sichtbar || !ses.boards[`alle:${kind}`])) ses.boards[`alle:${kind}`] = deepClone(quelle);
      }
      if (tool) ses.tools.alle = tool;
    } else {
      const tool = ses.tools.alle || null;
      if (tool && ses.boards[flaechenKey(tool, 'alle')]) {
        ses.boards[flaechenKey(tool, ses.phase)] = deepClone(ses.boards[flaechenKey(tool, 'alle')]);
      }
      if (tool) ses.tools[ses.phase] = tool;
    }
    ses.durchgehend = an;
    store.setSetting('durchgehend', an);
    speichern();
    buehneZeichnen({ neu: true });
    toast(an ? 'Die Arbeitsfläche bleibt jetzt in allen Phasen gleich' : 'Jede Phase hat jetzt wieder ihre eigene Fläche');
  }

  function momentFesthalten(titel) {
    const id = aktuellesWerkzeug();
    if (!id) return false;
    const key = flaechenKey(id);
    if (!ses.boards[key]) return false;
    ses.moments.push({
      id: uid(),
      createdAt: Date.now(),
      phase: ses.phase,
      tool: id,
      titel: titel || WERKZEUGE[id].name,
      state: deepClone(ses.boards[key]),
    });
    speichern();
    flash();
    toast('Moment festgehalten', 'bilder/app/moment.svg');
    return true;
  }

  // ---------- Start ----------
  themaSetzen();
  phasenleisteZeichnen();
  buehneZeichnen();
  // Neue Sitzung: nach der Einblendung an das Commitment von letztem Mal erinnern
  const vorherCm = vorherigesCommitment(ses);
  if (intro) {
    phaseIntro(phaseById(ses.phase), () => {
      if (vorherCm) setTimeout(() => zeigeRueckblick({ vorher: vorherCm, ses, schueler, onChange: speichern }), 500);
    });
  }

  return {
    el,
    destroy() {
      introOffen?.(true);
      werkzeug?.destroy();
      store.saveNow();
    },
  };
}
