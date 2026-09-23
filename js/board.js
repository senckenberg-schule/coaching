// Gemeinsame Arbeitsfläche für Aktionsbrett, Karten und Gefühle.
// Positionen werden relativ (0…1) gespeichert, Größen in „Einheiten“
// (1 u = 1 % der kürzeren Seite). So passt alles auf jede Bildschirmgröße.
import { h, s, uid, clamp } from './util.js';
import { icon } from './icons.js';
import { attachGesture } from './gestures.js';
import { createHistory } from './history.js';
import { confirmDialog } from './ui.js';
import { stift, zeichnetZeiger, strichD, ereignisPunkte, druckVon, stiftleiste, kartenStiftGroesse } from './ink.js';

export function createBoard(container, cfg) {
  const {
    state,
    types,
    readOnly = false,
    links: mitVerbindungen = false,
    onChange = () => {},
    onHistory = () => {},
    toolbar = () => [],
    onPlaced = () => {},
    onDoubleTap = () => {},
    emptyHint = '',
    hintergrund = null, // (state) => Element: Vorlage im Hintergrund
    onMoved = () => false, // (item) => true, wenn sich das Element dadurch verändert hat
    pfeile = false, // neue Verbindungen als Pfeile zeichnen (Wert oder Funktion)
  } = cfg;
  state.items ||= [];
  state.links ||= [];
  state.ink ||= [];

  const root = h('div', { class: 'board' + (readOnly ? ' readonly' : '') });
  const svg = s('svg', { class: 'board-links' });
  const ebene = h('div', { class: 'board-items' });
  const inkSvg = s('svg', { class: 'board-ink' });
  const oben = h('div', { class: 'board-over' });
  const hinweis = h('div', { class: 'board-empty' }, emptyHint);
  const hintergrundEbene = h('div', { class: 'board-bg' });
  root.append(hintergrundEbene, hinweis, svg, ebene, inkSvg, oben);
  function hintergrundZeichnen() {
    const el = hintergrund?.(state);
    hintergrundEbene.replaceChildren(...(el ? [el] : []));
    root.classList.toggle('mit-vorlage', !!el);
  }
  hintergrundZeichnen();
  container.append(root);

  let W = 1;
  let H = 1;
  let U = 1;
  const els = new Map(); // id -> {el, body, inner, label, gesture}
  const linkEls = new Map();
  let auswahl = null; // {kind: 'item'|'link', id}
  let verbindeVon = null;
  let letzterTap = { id: null, t: 0 };
  const aktiveGesten = new Set();
  let zZaehler = 10; // Elemente „unten“ (Zeitstrahl, Landkarte) liegen auf Ebene 1

  const hist = createHistory(
    () => ({ items: state.items, links: state.links, ink: state.ink }),
    (s) => {
      state.items = s.items;
      state.links = s.links;
      state.ink = s.ink || [];
      allesZeichnen();
      onChange();
    },
    onHistory,
  );

  // ---------- Maße ----------
  function messen() {
    W = root.clientWidth || 1;
    H = root.clientHeight || 1;
    U = Math.min(W, H) / 100;
    root.style.setProperty('--u', U + 'px');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    inkSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }
  const ro = new ResizeObserver(() => {
    messen();
    state.items.forEach(positionieren);
    verbindungenZeichnen();
    inkZeichnen();
    toolbarZeichnen();
  });
  ro.observe(root);
  messen();

  const typ = (item) => types[item.type];
  const groesse = (item) => typ(item).size(item);
  const skalierung = (item) => {
    const t = typ(item);
    if (t.fixedScale) return t.fixedScale(item);
    return t.scale ? item.scale || 1 : 1;
  };

  // ---------- Elemente ----------
  function elementBauen(item, { pop = false } = {}) {
    const t = typ(item);
    const el = h('div', { class: `bitem bitem-${item.type}` + (pop ? ' pop' : '') });
    const body = h('div', { class: 'bitem-body' });
    const inner = h('div', { class: 'bitem-inner' });
    const label = h('div', { class: 'bitem-label' });
    body.append(inner);
    el.append(body, label);
    el.dataset.id = item.id;
    const eintrag = { el, body, inner, label, gesture: null };
    els.set(item.id, eintrag);
    inhaltZeichnen(item);
    if (!readOnly) eintrag.gesture = gestenAnbinden(item, eintrag);
    el.style.zIndex = t.unten ? 1 : ++zZaehler;
    ebene.append(el);
    positionieren(item);
    if (pop) setTimeout(() => el.classList.remove('pop'), 700);
    if (t.onMount) t.onMount(item, eintrag);
    return eintrag;
  }

  function inhaltZeichnen(item) {
    const e = els.get(item.id);
    if (!e) return;
    const t = typ(item);
    e.inner.replaceChildren();
    t.render(item, e.inner, { api, readOnly });
    e.el.style.setProperty('--sel-radius', t.radius ? t.radius(item) : '20%');
    const text = t.label ? t.label(item) : '';
    e.label.textContent = text || '';
    e.label.classList.toggle('leer', !text);
  }

  function positionieren(item) {
    const e = els.get(item.id);
    if (!e) return;
    const [w, hh] = groesse(item);
    e.el.style.width = w * U + 'px';
    e.el.style.height = hh * U + 'px';
    e.el.style.transform = `translate(${item.x * W}px, ${item.y * H}px) translate(-50%, -50%)`;
    e.body.style.transform = `rotate(${item.rot || 0}deg) scale(${skalierung(item)})`;
  }

  function allesZeichnen() {
    ebene.replaceChildren();
    els.clear();
    state.items.forEach((it) => elementBauen(it));
    verbindungenZeichnen();
    inkZeichnen();
    auswahlSetzen(null);
    hinweisAktualisieren();
  }

  function hinweisAktualisieren() {
    hinweis.classList.toggle('show', !!hinweis.textContent && state.items.length === 0 && state.ink.length === 0 && !readOnly);
  }

  // Nach vorne holen über z-index – das Element im DOM zu verschieben
  // würde den Finger „verlieren“ (Pointer-Capture).
  function nachVorne(item) {
    if (typ(item).unten) return;
    const i = state.items.indexOf(item);
    if (i > -1 && i < state.items.length - 1) {
      state.items.splice(i, 1);
      state.items.push(item);
    }
    const e = els.get(item.id);
    if (e) e.el.style.zIndex = ++zZaehler;
  }

  function ausdehnung(item) {
    const [w, hh] = groesse(item);
    const sc = skalierung(item);
    return { hw: (w * U * sc) / 2 / W, hh: (hh * U * sc) / 2 / H };
  }

  function festhalten(item, locker = false) {
    if (locker) {
      item.x = clamp(item.x, -0.1, 1.25);
      item.y = clamp(item.y, -0.1, 1.25);
      return;
    }
    const a = ausdehnung(item);
    item.x = clamp(item.x, Math.min(0.5, a.hw * 0.6), Math.max(0.5, 1 - a.hw * 0.6));
    item.y = clamp(item.y, Math.min(0.5, a.hh * 0.6), Math.max(0.5, 1 - a.hh * 0.6));
  }

  function sanftSetzen(item) {
    const e = els.get(item.id);
    if (!e) return;
    e.el.classList.add('settle');
    positionieren(item);
    verbindungenZeichnen(true);
    setTimeout(() => {
      e.el.classList.remove('settle');
      verbindungenZeichnen();
    }, 560);
  }

  /** Sucht einen freien Platz, möglichst weit weg von allem anderen. */
  function freierPlatz() {
    let best = { x: 0.5, y: 0.5, d: -1 };
    for (let gx = 0; gx < 7; gx++) {
      for (let gy = 0; gy < 5; gy++) {
        const x = 0.14 + (gx / 6) * 0.72 + (Math.random() - 0.5) * 0.04;
        const y = 0.18 + (gy / 4) * 0.64 + (Math.random() - 0.5) * 0.04;
        let d = Infinity;
        for (const it of state.items) {
          if (it._neu || typ(it).unten) continue;
          d = Math.min(d, Math.hypot((it.x - x) * W, (it.y - y) * H));
        }
        const zentrum = Math.hypot((x - 0.5) * W, (y - 0.5) * H) * 0.15;
        const score = (d === Infinity ? 10000 : d) - zentrum;
        if (score > best.d) best = { x, y, d: score };
      }
    }
    return best;
  }

  /** Was auf einem „tragenden“ Element liegt, wandert beim Verschieben mit. */
  function passagiereSammeln(item) {
    const r = els.get(item.id).el.getBoundingClientRect();
    const drin = (x, y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    const items = state.items.filter((o) => {
      if (o === item || typ(o).unten) return false;
      const or = els.get(o.id)?.el.getBoundingClientRect();
      return or && drin(or.left + or.width / 2, or.top + or.height / 2);
    });
    const b = root.getBoundingClientRect();
    const ink = state.ink.filter((st) => st.p.every(([x, y]) => drin(b.left + x * W, b.top + y * H)));
    return { items, ink };
  }

  // ---------- Gesten ----------
  function gestenAnbinden(item, eintrag) {
    const t = typ(item);
    let vorher = null;
    let kuerzlichNeu = false;
    let passagiere = null;
    const g = attachGesture(eintrag.el, {
      onStart() {
        vorher = hist.capture();
        kuerzlichNeu = !!item._neu;
        passagiere = t.traegt && !item.fest && !kuerzlichNeu ? passagiereSammeln(item) : null;
        nachVorne(item);
        eintrag.el.classList.add('dragging');
        aktiveGesten.add(g);
        oben.classList.add('hidden');
      },
      onMove({ dx, dy, dr, ds, count }) {
        if (item.fest) return; // festgemacht
        item.x += dx / W;
        item.y += dy / H;
        if (passagiere) {
          for (const p of passagiere.items) {
            p.x += dx / W;
            p.y += dy / H;
            positionieren(p);
          }
          for (const st of passagiere.ink) for (const pt of st.p) (pt[0] += dx / W), (pt[1] += dy / H);
          if (passagiere.ink.length) inkZeichnen();
        }
        if (count > 1 && t.rotate) item.rot = ((item.rot || 0) + dr) % 360;
        if (count > 1 && t.scale) item.scale = clamp((item.scale || 1) * ds, 0.55, 2.6);
        festhalten(item, true);
        positionieren(item);
        verbindungenZeichnen();
      },
      onEnd({ moved }) {
        eintrag.el.classList.remove('dragging');
        aktiveGesten.delete(g);
        oben.classList.remove('hidden');
        if (kuerzlichNeu) {
          delete item._neu;
          if (!moved) {
            const p = t.unten ? { x: 0.5, y: 0.5 } : freierPlatz();
            item.x = p.x;
            item.y = p.y;
          }
          festhalten(item);
          sanftSetzen(item);
          if (onMoved(item)) inhaltZeichnen(item);
          hinweisAktualisieren();
          onChange();
          onPlaced(item);
          return;
        }
        if (moved) {
          hist.push(vorher);
          festhalten(item);
          sanftSetzen(item);
          if (onMoved(item)) inhaltZeichnen(item);
          onChange();
        }
        toolbarZeichnen();
      },
      onTap() {
        if (kuerzlichNeu) return;
        if (verbindeVon && verbindeVon !== item.id) {
          verbinden(verbindeVon, item.id);
          return;
        }
        const jetzt = performance.now();
        if (letzterTap.id === item.id && jetzt - letzterTap.t < 350) {
          letzterTap = { id: null, t: 0 };
          onDoubleTap(item, api);
          return;
        }
        letzterTap = { id: item.id, t: jetzt };
        if (auswahl?.id === item.id) auswahlSetzen(null);
        else auswahlSetzen({ kind: 'item', id: item.id });
      },
    });
    return g;
  }

  // Zweiter Finger auf der freien Fläche dreht das gerade gezogene Element.
  root.addEventListener('pointerdown', (e) => {
    if (readOnly) return;
    if (aktiveGesten.size === 1) {
      const g = [...aktiveGesten][0];
      if (g.count === 1) {
        g.begin(e);
        return;
      }
    }
    if (e.target === root || e.target === ebene || e.target === svg || e.target === hinweis) {
      if (verbindeVon) verbindenAbbrechen();
      auswahlSetzen(null);
    }
  });

  // ---------- Verbindungen ----------
  function verbinden(a, b) {
    verbindenAbbrechen();
    const gibt = state.links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
    if (!gibt) {
      hist.push();
      state.links.push({ id: uid(), a, b, pfeil: typeof pfeile === 'function' ? pfeile() : !!pfeile });
      verbindungenZeichnen();
      const neu = linkEls.get(state.links[state.links.length - 1].id);
      neu?.line.classList.add('draw');
      onChange();
    }
    auswahlSetzen(null);
  }

  function verbindenAbbrechen() {
    verbindeVon = null;
    root.classList.remove('linking');
    oben.querySelector('.link-hint')?.remove();
    els.forEach((e) => e.el.classList.remove('link-source'));
  }

  function linkPfad(l) {
    const a = state.items.find((i) => i.id === l.a);
    const b = state.items.find((i) => i.id === l.b);
    if (!a || !b) return null;
    const ax = a.x * W;
    const ay = a.y * H;
    const bx = b.x * W;
    const by = b.y * H;
    const cx = (ax + bx) / 2 - (by - ay) * 0.12;
    const cy = (ay + by) / 2 + (bx - ax) * 0.12;
    if (!l.pfeil) return { d: `M${ax},${ay} Q${cx},${cy} ${bx},${by}` };
    // Pfeil: Linie am Rand des Ziels enden lassen und eine Spitze anhängen
    const [bw, bh] = groesse(b);
    let tx = bx - cx;
    let ty = by - cy;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    // Abstand von der Mitte bis zum Rand des Ziels in Pfeilrichtung
    const hw = (bw * U * skalierung(b)) / 2;
    const hh = (bh * U * skalierung(b)) / 2;
    const rand = Math.min(hw / Math.max(Math.abs(tx), 1e-3), hh / Math.max(Math.abs(ty), 1e-3)) + 6;
    const ex = bx - tx * rand;
    const ey = by - ty * rand;
    const L = Math.max(14, U * 2.4);
    const px = ex - tx * L;
    const py = ey - ty * L;
    const spitze = `M${ex},${ey} L${px - ty * L * 0.6},${py + tx * L * 0.6} L${px + ty * L * 0.6},${py - tx * L * 0.6} Z`;
    return { d: `M${ax},${ay} Q${cx},${cy} ${px},${py}`, spitze };
  }

  function verbindungenZeichnen() {
    if (!mitVerbindungen) return;
    const ids = new Set(state.links.map((l) => l.id));
    for (const [id, e] of linkEls) {
      if (!ids.has(id)) {
        e.g.remove();
        linkEls.delete(id);
      }
    }
    for (const l of state.links) {
      let e = linkEls.get(l.id);
      if (!e) {
        const g = s('g', { class: 'link' });
        const unter = s('path', { class: 'link-under' });
        const line = s('path', { class: 'link-line' });
        const hit = s('path', { class: 'link-hit' });
        const pfeil = s('path', { class: 'link-pfeil' });
        g.append(unter, line, pfeil, hit);
        svg.append(g);
        e = { g, unter, line, hit, pfeil };
        linkEls.set(l.id, e);
        if (!readOnly) {
          hit.addEventListener('pointerdown', (ev) => {
            ev.stopPropagation();
            auswahlSetzen({ kind: 'link', id: l.id });
          });
        }
      }
      const pfad = linkPfad(l);
      if (!pfad) continue;
      e.unter.setAttribute('d', pfad.d);
      e.line.setAttribute('d', pfad.d);
      e.hit.setAttribute('d', pfad.d);
      if (pfad.spitze) e.pfeil.setAttribute('d', pfad.spitze);
      else e.pfeil.removeAttribute('d');
      e.g.classList.toggle('selected', auswahl?.kind === 'link' && auswahl.id === l.id);
    }
    svg.style.setProperty('--lw', Math.max(3, U * 0.55) + 'px');
  }

  // ---------- Auswahl & Werkzeugleiste ----------
  function auswahlSetzen(a) {
    auswahl = a;
    menue = null;
    els.forEach((e, id) => e.el.classList.toggle('selected', a?.kind === 'item' && a.id === id));
    verbindungenZeichnen();
    toolbarZeichnen();
  }

  const api = {
    /** Zustand vor einer Änderung merken (für Rückgängig). */
    capture: () => hist.capture(),
    /** Änderung abschließen, die ein Element selbst vorgenommen hat. */
    commit(item, vorher) {
      hist.push(vorher);
      inhaltZeichnen(item);
      toolbarZeichnen();
      onChange();
    },
    change(item, fn) {
      hist.push();
      fn();
      inhaltZeichnen(item);
      festhalten(item);
      const e = els.get(item.id);
      e?.el.classList.add('changed');
      setTimeout(() => e?.el.classList.remove('changed'), 450);
      positionieren(item);
      verbindungenZeichnen();
      toolbarZeichnen();
      onChange();
    },
    remove(item) {
      hist.push();
      state.items = state.items.filter((i) => i !== item);
      state.links = state.links.filter((l) => l.a !== item.id && l.b !== item.id);
      const e = els.get(item.id);
      els.delete(item.id);
      if (e) {
        e.el.classList.add('vanish');
        setTimeout(() => e.el.remove(), 320);
      }
      auswahlSetzen(null);
      verbindungenZeichnen();
      hinweisAktualisieren();
      onChange();
    },
    startLink(item) {
      verbindeVon = item.id;
      root.classList.add('linking');
      els.get(item.id)?.el.classList.add('link-source');
      auswahl = null;
      els.forEach((e) => e.el.classList.remove('selected'));
      oben.replaceChildren(h('div', { class: 'link-hint glass' }, icon('link'), 'Tippe auf eine zweite Karte'));
    },
  };

  let menue = null;

  function toolbarZeichnen() {
    if (verbindeVon) return;
    oben.replaceChildren();
    if (!auswahl || readOnly) {
      menue = null;
      return;
    }
    let eintraege;
    let ankerX;
    let ankerOben;
    let ankerUnten;
    if (auswahl.kind === 'link') {
      const l = state.links.find((x) => x.id === auswahl.id);
      if (!l) return;
      const a = state.items.find((i) => i.id === l.a);
      const b = state.items.find((i) => i.id === l.b);
      if (!a || !b) return;
      ankerX = ((a.x + b.x) / 2) * W;
      ankerOben = ((a.y + b.y) / 2) * H - 10;
      ankerUnten = ankerOben + 20;
      eintraege = [
        {
          icon: 'arrowRight',
          label: l.pfeil ? 'Ohne Pfeil' : 'Pfeil',
          active: !!l.pfeil,
          onClick: () => {
            hist.push();
            l.pfeil = !l.pfeil;
            verbindungenZeichnen();
            toolbarZeichnen();
            onChange();
          },
        },
        {
          icon: 'trash',
          label: 'Linie löschen',
          danger: true,
          onClick: () => {
            hist.push();
            state.links = state.links.filter((x) => x.id !== l.id);
            auswahlSetzen(null);
            onChange();
          },
        },
      ];
    } else {
      const item = state.items.find((i) => i.id === auswahl.id);
      if (!item) return;
      const [w, hh] = groesse(item);
      const sc = skalierung(item);
      ankerX = item.x * W;
      ankerOben = item.y * H - (hh * U * sc) / 2;
      ankerUnten = item.y * H + (hh * U * sc) / 2 + (typ(item).label?.(item) ? 30 : 0);
      eintraege = menue ? menue.eintraege : toolbar(item, api);
      if (typ(item).rotate) drehknopf(item, w * U * sc, hh * U * sc);
    }

    const leiste = h('div', { class: 'btoolbar glass' });
    if (menue) {
      leiste.append(
        h('button', { class: 'tbtn', onClick: () => ((menue = null), toolbarZeichnen()) }, icon('chevronLeft')),
      );
    }
    for (const eintrag of eintraege) {
      if (eintrag.swatch) {
        leiste.append(
          h('button', {
            class: 'swatch' + (eintrag.active ? ' active' : ''),
            style: { background: eintrag.swatch },
            'aria-label': 'Farbe',
            onClick: () => {
              eintrag.onClick();
              menue = null;
              toolbarZeichnen();
            },
          }),
        );
        continue;
      }
      const btn = h(
        'button',
        {
          class: 'tbtn' + (eintrag.active ? ' active' : '') + (eintrag.danger ? ' danger' : ''),
          onClick: () => {
            if (eintrag.menu) {
              menue = { eintraege: eintrag.menu() };
              toolbarZeichnen();
            } else {
              menue = null;
              eintrag.onClick();
            }
          },
        },
        eintrag.icon ? icon(eintrag.icon) : null,
        eintrag.content || null,
        eintrag.label ? h('span', { class: 'tlabel' }, eintrag.label) : null,
      );
      leiste.append(btn);
    }
    oben.append(leiste);
    // Leiste über (oder unter) dem Element platzieren.
    const bw = leiste.offsetWidth;
    const bh = leiste.offsetHeight;
    let top = ankerOben - bh - 16;
    if (top < 8) top = ankerUnten + 12;
    // Große Elemente: Leiste innen oben anzeigen, wenn außen kein Platz ist
    if (top + bh > H - 76) top = clamp(ankerOben + 14, 8, H - bh - 76);
    leiste.style.left = clamp(ankerX - bw / 2, 8, Math.max(8, W - bw - 8)) + 'px';
    leiste.style.top = top + 'px';
  }

  function drehknopf(item, w, hh) {
    // Der Knopf sitzt rechts neben dem Element und wandert beim Drehen mit.
    const r = Math.max(w, hh) / 2 + 30;
    const knopf = h('div', { class: 'rotknob glass' }, icon('rotate'));
    const cx = item.x * W;
    const cy = item.y * H;
    const setzen = () => {
      const rad = ((item.rot || 0) * Math.PI) / 180;
      knopf.style.left = cx + Math.cos(rad) * r + 'px';
      knopf.style.top = cy + Math.sin(rad) * r + 'px';
    };
    setzen();
    let vorher = null;
    let startWinkel = 0;
    let startRot = 0;
    const winkelZu = (e) => {
      const rect = root.getBoundingClientRect();
      return (Math.atan2(e.clientY - rect.top - cy, e.clientX - rect.left - cx) * 180) / Math.PI;
    };
    knopf.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      knopf.setPointerCapture(e.pointerId);
      vorher = hist.capture();
      startWinkel = winkelZu(e);
      startRot = item.rot || 0;
      oben.querySelector('.btoolbar')?.classList.add('hidden');
    });
    knopf.addEventListener('pointermove', (e) => {
      if (vorher == null) return;
      let r2 = startRot + winkelZu(e) - startWinkel;
      // Bei 0/90/180/270 Grad leicht einrasten
      const n = Math.round(r2 / 90) * 90;
      if (Math.abs(r2 - n) < 6) r2 = n;
      item.rot = r2;
      positionieren(item);
      setzen();
    });
    const ende = () => {
      if (vorher == null) return;
      hist.push(vorher);
      vorher = null;
      onChange();
      toolbarZeichnen();
    };
    knopf.addEventListener('pointerup', ende);
    knopf.addEventListener('pointercancel', ende);
    oben.append(knopf);
  }

  // ---------- Zeichnen mit dem Stift ----------
  // Der Pencil zeichnet, Finger verschieben. Beginnt ein Strich auf einer
  // Karte, wird direkt auf die Karte geschrieben.
  function inkZeichnen() {
    inkSvg.replaceChildren(...state.ink.map((st) => s('path', { fill: st.farbe, d: brettD(st, true) })));
  }
  const brettD = (st, fertig) => strichD(st.p.map(([x, y, d]) => [x * W, y * H, d]), st.g * U, st.druck, fertig);

  const r4 = (n) => Math.round(n * 10000) / 10000;
  const r1 = (n) => Math.round(n * 10) / 10;

  function brettPunkt(e) {
    const r = root.getBoundingClientRect();
    return [r4((e.clientX - r.left) / W), r4((e.clientY - r.top) / H)];
  }

  // Bereich eines Elements, in den man schreiben kann (Anteile: x, y, Breite, Höhe).
  const schreibBereich = (item) => typ(item).inkBereich?.(item) || [0, 0, 1, 1];
  function neueHandschrift(item) {
    const seiten = typ(item).inkSeiten?.(item);
    if (seiten) return { vw: seiten[0], vh: seiten[1], striche: [] };
    const [w, hh] = groesse(item);
    const [, , bw, bh] = schreibBereich(item);
    return { vw: 1000, vh: Math.round((1000 * hh * bh) / (w * bw)), striche: [] };
  }

  /** Fingerposition im Koordinatensystem der Handschrift eines Elements (mit Drehung). */
  function kartenPunkt(item, e) {
    const [w, hh] = groesse(item);
    const [bx, by, bw, bh] = schreibBereich(item);
    const wpx = w * U * bw;
    const hpx = hh * U * bh;
    const sc = skalierung(item);
    const r = root.getBoundingClientRect();
    const dx = e.clientX - r.left - item.x * W;
    const dy = e.clientY - r.top - item.y * H;
    const a = ((item.rot || 0) * Math.PI) / 180;
    const lx = (dx * Math.cos(a) + dy * Math.sin(a)) / sc + (w * U) / 2 - bx * w * U;
    const ly = (-dx * Math.sin(a) + dy * Math.cos(a)) / sc + (hh * U) / 2 - by * hh * U;
    const ink = item.ink || neueHandschrift(item);
    const f = Math.min(wpx / ink.vw, hpx / ink.vh);
    const ox = (wpx - ink.vw * f) / 2;
    const oy = (hpx - ink.vh * f) / 2;
    return { x: r1((lx - ox) / f), y: r1((ly - oy) / f), drin: lx >= 0 && lx <= wpx && ly >= 0 && ly <= hpx, f: f * sc };
  }

  let zeichnung = null;
  let letzterStift = 0;

  function radieren(e) {
    const r = root.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const radius = Math.max(14, U * 2.2);
    const vorher = state.ink.length;
    state.ink = state.ink.filter((st) => !st.p.some(([x, y]) => Math.hypot(x * W - px, y * H - py) < radius + (st.g * U) / 2));
    if (state.ink.length !== vorher) {
      zeichnung.geaendert = true;
      inkZeichnen();
    }
    for (const item of state.items) {
      if (!typ(item).schreibbar || !item.ink?.striche?.length) continue;
      const k = kartenPunkt(item, e);
      if (!k.drin) continue;
      const n = item.ink.striche.length;
      const ru = radius / k.f;
      item.ink.striche = item.ink.striche.filter((st) => !st.p.some(([x, y]) => Math.hypot(x - k.x, y - k.y) < ru + st.g / 2));
      if (item.ink.striche.length !== n) {
        zeichnung.geaendert = true;
        inhaltZeichnen(item);
      }
    }
  }

  root.addEventListener(
    'pointerdown',
    (e) => {
      if (readOnly || e.target.closest('.btoolbar, .rotknob, .inkbar, .link-hint')) return;
      if (!zeichnetZeiger(e)) {
        // Handballen beim Schreiben ignorieren
        if (e.pointerType === 'touch' && (zeichnung || performance.now() - letzterStift < 350)) {
          e.stopPropagation();
          e.preventDefault();
        }
        return;
      }
      e.stopPropagation();
      e.preventDefault();
      if (zeichnung) return;
      try {
        root.setPointerCapture(e.pointerId);
      } catch {
        /* Zeiger bereits beendet */
      }
      const itemEl = e.target.closest('.bitem');
      const item = itemEl ? state.items.find((i) => i.id === itemEl.dataset.id) : null;
      const basis = { id: e.pointerId, item, vorher: hist.capture(), t0: performance.now(), start: [e.clientX, e.clientY], weg: 0 };
      if (stift.radierer) {
        zeichnung = { ...basis, art: 'radierer', geaendert: false };
        radieren(e);
        return;
      }
      const druck = e.pointerType === 'pen';
      if (item && typ(item).schreibbar && kartenPunkt(item, e).drin) {
        item.ink ||= neueHandschrift(item);
        let flaeche = els.get(item.id).inner.querySelector('.karte-ink');
        if (!flaeche) {
          inhaltZeichnen(item);
          flaeche = els.get(item.id).inner.querySelector('.karte-ink');
        }
        const k = kartenPunkt(item, e);
        const strich = { id: uid(), farbe: stift.farbe, g: kartenStiftGroesse(), druck, p: [[k.x, k.y, druckVon(e)]] };
        const pfad = s('path', { fill: strich.farbe });
        flaeche.append(pfad);
        zeichnung = { ...basis, art: 'karte', strich, pfad };
      } else {
        if (!item) auswahlSetzen(null);
        const strich = { id: uid(), farbe: stift.farbe, g: stift.dick ? 1.6 : 0.75, druck, p: [[...brettPunkt(e), druckVon(e)]] };
        const pfad = s('path', { fill: strich.farbe });
        inkSvg.append(pfad);
        zeichnung = { ...basis, art: 'brett', strich, pfad };
      }
      oben.classList.add('hidden');
    },
    { capture: true },
  );

  root.addEventListener('pointermove', (e) => {
    if (!zeichnung || e.pointerId !== zeichnung.id) return;
    if (zeichnung.art === 'radierer') {
      radieren(e);
      return;
    }
    const z = zeichnung;
    z.weg = Math.max(z.weg, Math.hypot(e.clientX - z.start[0], e.clientY - z.start[1]));
    for (const pe of ereignisPunkte(e)) {
      if (z.art === 'karte') {
        const k = kartenPunkt(z.item, pe);
        z.strich.p.push([k.x, k.y, druckVon(pe)]);
      } else {
        z.strich.p.push([...brettPunkt(pe), druckVon(pe)]);
      }
    }
    const st = z.strich;
    z.pfad.setAttribute('d', z.art === 'karte' ? strichD(st.p, st.g, st.druck, false) : brettD(st, false));
  });

  function zeichnenEnde(e) {
    if (!zeichnung || e.pointerId !== zeichnung.id) return;
    const z = zeichnung;
    zeichnung = null;
    if (e.pointerType === 'pen') letzterStift = performance.now();
    oben.classList.remove('hidden');
    if (z.art === 'radierer') {
      if (z.geaendert) {
        hist.push(z.vorher);
        hinweisAktualisieren();
        onChange();
      }
      return;
    }
    const tipp = z.weg < 6 && performance.now() - z.t0 < 300;
    if (tipp && z.item && (verbindeVon || z.art === 'brett')) {
      // Kurzes Antippen mit dem Stift wählt aus (bzw. verbindet), statt einen Punkt zu malen.
      z.pfad.remove();
      if (verbindeVon && verbindeVon !== z.item.id) verbinden(verbindeVon, z.item.id);
      else auswahlSetzen(auswahl?.id === z.item.id ? null : { kind: 'item', id: z.item.id });
      return;
    }
    if (z.art === 'karte') {
      z.item.ink.striche.push(z.strich);
      inhaltZeichnen(z.item);
    } else {
      state.ink.push(z.strich);
      z.pfad.setAttribute('d', brettD(z.strich, true));
    }
    hist.push(z.vorher);
    hinweisAktualisieren();
    onChange();
  }
  root.addEventListener('pointerup', zeichnenEnde);
  root.addEventListener('pointercancel', zeichnenEnde);

  if (!readOnly) {
    const leiste = stiftleiste({
      onChange: () => root.classList.toggle('fingermode', stift.finger),
      onClear: async () => {
        if (!state.ink.length) return;
        const ok = await confirmDialog({
          title: 'Zeichnung löschen?',
          text: 'Alle Striche auf dieser Fläche werden entfernt. Die Schrift auf den Karten bleibt.',
          okText: 'Löschen',
          danger: true,
        });
        if (!ok) return;
        hist.push();
        state.ink = [];
        inkZeichnen();
        hinweisAktualisieren();
        onChange();
      },
    });
    root.append(leiste.el);
    root.classList.toggle('fingermode', stift.finger);
  }

  // ---------- Öffentliche Schnittstelle ----------
  allesZeichnen();

  return {
    root,
    items: () => state.items,
    get auswahlId() {
      return auswahl?.kind === 'item' ? auswahl.id : null;
    },
    elementVon: (id) => els.get(id)?.el,
    /** Vorlage im Hintergrund neu zeichnen (z. B. nach dem Umschalten). */
    hintergrundNeu: hintergrundZeichnen,
    /** Hinweis auf der leeren Fläche ändern. */
    setHinweis(text) {
      hinweis.textContent = text || '';
      hinweisAktualisieren();
    },
    /** Alle Elemente neu zeichnen (z. B. nach einer Änderung von außen). */
    neuZeichnen: () => allesZeichnen(),
    /** Neues Element hinzufügen – optional direkt mit dem Finger weiterziehen. */
    addItem(item, e) {
      hist.push();
      item.id ||= uid();
      if (e) {
        const rect = root.getBoundingClientRect();
        item.x = (e.clientX - rect.left) / W;
        item.y = (e.clientY - rect.top) / H;
        item._neu = true;
      } else {
        const p = types[item.type].unten ? { x: 0.5, y: 0.5 } : freierPlatz();
        item.x ??= p.x;
        item.y ??= p.y;
      }
      // Elemente „unten“ kommen an den Anfang der Liste (liegen unter allem anderen)
      if (types[item.type].unten) state.items.unshift(item);
      else state.items.push(item);
      const eintrag = elementBauen(item, { pop: true });
      if (e) eintrag.gesture.begin(e);
      else onPlaced(item);
      auswahlSetzen(null);
      hinweisAktualisieren();
      onChange();
      return item;
    },
    api,
    refresh(item) {
      inhaltZeichnen(item);
      positionieren(item);
    },
    undo() {
      hist.undo();
    },
    canUndo: () => hist.canUndo,
    destroy() {
      ro.disconnect();
      root.remove();
    },
  };
}

/** Kleine Kachel in der Seitenleiste, aus der man Elemente aufs Brett zieht. */
export function trayItem(inhalt, onGrab, cls = '') {
  const el = h('button', { class: 'tray-item ' + cls }, inhalt);
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    el.classList.add('grab');
    setTimeout(() => el.classList.remove('grab'), 300);
    onGrab(e);
  });
  return el;
}
