// Multitouch-Gesten: ein Finger verschiebt, zwei Finger drehen und skalieren.
// Jedes Element verwaltet seine eigenen Finger – so können mehrere Dinge
// gleichzeitig bewegt werden.

const TAP_WEG = 8; // px, ab dieser Strecke gilt es als Ziehen
const TAP_ZEIT = 450; // ms

const mitte = (p) => ({
  x: p.reduce((s, q) => s + q.x, 0) / p.length,
  y: p.reduce((s, q) => s + q.y, 0) / p.length,
});
const abstand = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const winkel = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
const normWinkel = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

/**
 * @param {HTMLElement} el
 * @param {{onStart?, onMove?, onEnd?, onTap?}} handler
 *   onMove erhält {dx, dy, dr, ds, count, x, y}: Verschiebung (px), Drehung (Grad),
 *   Skalierungsfaktor seit dem letzten Ereignis, Anzahl Finger, Fingerposition.
 */
export function attachGesture(el, handler) {
  const finger = new Map();
  let letzte = null;
  let start = null;
  let bewegt = false;
  let t0 = 0;
  let typ = '';

  function basis() {
    const p = [...finger.values()];
    letzte = {
      c: mitte(p),
      a: p.length > 1 ? winkel(p[0], p[1]) : 0,
      d: p.length > 1 ? abstand(p[0], p[1]) : 1,
    };
  }

  function begin(e) {
    if (finger.has(e.pointerId)) return;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* Zeiger bereits beendet */
    }
    const erster = finger.size === 0;
    finger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    basis();
    if (erster) {
      typ = e.pointerType;
      bewegt = false;
      t0 = performance.now();
      start = letzte.c;
      handler.onStart?.(e);
    }
  }

  function move(e) {
    if (!finger.has(e.pointerId)) return;
    finger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = [...finger.values()];
    const c = mitte(p);
    if (!bewegt) {
      if (p.length < 2 && abstand(c, start) < TAP_WEG) return;
      bewegt = true;
    }
    const a = p.length > 1 ? winkel(p[0], p[1]) : 0;
    const d = p.length > 1 ? abstand(p[0], p[1]) : 1;
    handler.onMove?.({
      dx: c.x - letzte.c.x,
      dy: c.y - letzte.c.y,
      dr: p.length > 1 ? normWinkel(a - letzte.a) : 0,
      ds: p.length > 1 && letzte.d > 0 ? d / letzte.d : 1,
      count: p.length,
      x: e.clientX,
      y: e.clientY,
    });
    letzte = { c, a, d };
  }

  function up(e) {
    if (!finger.has(e.pointerId)) return;
    finger.delete(e.pointerId);
    if (finger.size === 0) {
      const tap = !bewegt && performance.now() - t0 < TAP_ZEIT;
      handler.onEnd?.({ moved: bewegt, tap });
      if (tap) handler.onTap?.(e);
    } else {
      basis();
    }
  }

  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.stopPropagation();
    e.preventDefault();
    begin(e);
  });
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);

  return {
    begin,
    get count() {
      return finger.size;
    },
    /** Art des ersten Zeigers ('touch', 'mouse' …). */
    get typ() {
      return typ;
    },
    /** Geste stillschweigend beenden (z. B. Handballen, sobald der Stift aufsetzt). Liefert, ob schon bewegt wurde. */
    abbrechen() {
      const ids = [...finger.keys()];
      finger.clear();
      for (const id of ids) {
        try {
          el.releasePointerCapture(id);
        } catch {
          /* schon freigegeben */
        }
      }
      return bewegt;
    },
  };
}

/** Langes Drücken (z. B. für den Coach-Bereich). */
export function attachLongPress(el, ms, { onStart, onCancel, onDone }) {
  let timer = null;
  let aktiv = false;
  const abbrechen = () => {
    if (!aktiv) return;
    aktiv = false;
    clearTimeout(timer);
    onCancel?.();
  };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    aktiv = true;
    onStart?.();
    timer = setTimeout(() => {
      aktiv = false;
      onDone();
    }, ms);
  });
  el.addEventListener('pointerup', abbrechen);
  el.addEventListener('pointerleave', abbrechen);
  el.addEventListener('pointercancel', abbrechen);
}
