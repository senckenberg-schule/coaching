// Gemeinsame Arbeitsfläche für Aktionsbrett, Karten und Gefühle.
// Positionen werden relativ (0…1) gespeichert, Größen in „Einheiten“
// (1 u = 1 % der kürzeren Seite). So passt alles auf jede Bildschirmgröße.
import { h, s, uid, clamp } from './util.js';
import { icon } from './icons.js';
import { attachGesture } from './gestures.js';
import { createHistory } from './history.js';

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
  } = cfg;
  state.items ||= [];
  state.links ||= [];

  const root = h('div', { class: 'board' + (readOnly ? ' readonly' : '') });
  const svg = s('svg', { class: 'board-links' });
  const ebene = h('div', { class: 'board-items' });
  const oben = h('div', { class: 'board-over' });
  const hinweis = h('div', { class: 'board-empty' }, emptyHint);
  root.append(hinweis, svg, ebene, oben);
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
  let zZaehler = 1;

  const hist = createHistory(
    () => ({ items: state.items, links: state.links }),
    (s) => {
      state.items = s.items;
      state.links = s.links;
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
  }
  const ro = new ResizeObserver(() => {
    messen();
    state.items.forEach(positionieren);
    verbindungenZeichnen();
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
    const eintrag = { el, body, inner, label, gesture: null };
    els.set(item.id, eintrag);
    inhaltZeichnen(item);
    if (!readOnly) eintrag.gesture = gestenAnbinden(item, eintrag);
    el.style.zIndex = ++zZaehler;
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
    t.render(item, e.inner);
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
    auswahlSetzen(null);
    hinweisAktualisieren();
  }

  function hinweisAktualisieren() {
    hinweis.classList.toggle('show', !!emptyHint && state.items.length === 0 && !readOnly);
  }

  // Nach vorne holen über z-index – das Element im DOM zu verschieben
  // würde den Finger „verlieren“ (Pointer-Capture).
  function nachVorne(item) {
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
          if (it._neu) continue;
          d = Math.min(d, Math.hypot((it.x - x) * W, (it.y - y) * H));
        }
        const zentrum = Math.hypot((x - 0.5) * W, (y - 0.5) * H) * 0.15;
        const score = (d === Infinity ? 10000 : d) - zentrum;
        if (score > best.d) best = { x, y, d: score };
      }
    }
    return best;
  }

  // ---------- Gesten ----------
  function gestenAnbinden(item, eintrag) {
    const t = typ(item);
    let vorher = null;
    let kuerzlichNeu = false;
    const g = attachGesture(eintrag.el, {
      onStart() {
        vorher = hist.capture();
        kuerzlichNeu = !!item._neu;
        nachVorne(item);
        eintrag.el.classList.add('dragging');
        aktiveGesten.add(g);
        oben.classList.add('hidden');
      },
      onMove({ dx, dy, dr, ds, count }) {
        item.x += dx / W;
        item.y += dy / H;
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
            const p = freierPlatz();
            item.x = p.x;
            item.y = p.y;
          }
          festhalten(item);
          sanftSetzen(item);
          hinweisAktualisieren();
          onChange();
          onPlaced(item);
          return;
        }
        if (moved) {
          hist.push(vorher);
          festhalten(item);
          sanftSetzen(item);
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
      state.links.push({ id: uid(), a, b });
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
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const nx = -(by - ay) * 0.12;
    const ny = (bx - ax) * 0.12;
    return `M${ax},${ay} Q${mx + nx},${my + ny} ${bx},${by}`;
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
        g.append(unter, line, hit);
        svg.append(g);
        e = { g, unter, line, hit };
        linkEls.set(l.id, e);
        if (!readOnly) {
          hit.addEventListener('pointerdown', (ev) => {
            ev.stopPropagation();
            auswahlSetzen({ kind: 'link', id: l.id });
          });
        }
      }
      const d = linkPfad(l);
      if (!d) continue;
      e.unter.setAttribute('d', d);
      e.line.setAttribute('d', d);
      e.hit.setAttribute('d', d);
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
    if (top < 8) top = Math.min(ankerUnten + 12, H - bh - 8);
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

  // ---------- Öffentliche Schnittstelle ----------
  allesZeichnen();

  return {
    root,
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
        const p = freierPlatz();
        item.x = p.x;
        item.y = p.y;
      }
      state.items.push(item);
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
