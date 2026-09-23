// Speichert alle Daten lokal auf dem Gerät (localStorage).
// Es werden keine Daten an einen Server geschickt.
import { uid, debounce } from './util.js';
import { PHASEN } from './data.js';

const KEY = 'coaching-app-v1';

function leer() {
  return { version: 1, students: [], sessions: [] };
}

function laden() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return leer();
    const db = JSON.parse(raw);
    db.students ||= [];
    db.sessions ||= [];
    return db;
  } catch {
    return leer();
  }
}

let db = laden();
const listeners = new Set();
let onError = () => {};

function schreiben() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (err) {
    onError(err);
  }
}

const schreibenSpaeter = debounce(schreiben, 400);

export const store = {
  onSaveError(fn) {
    onError = fn;
  },

  save() {
    schreibenSpaeter();
    listeners.forEach((l) => l());
  },

  saveNow() {
    schreibenSpaeter.flush();
  },

  // ---- Schülerinnen und Schüler ----
  students() {
    return [...db.students].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  },

  student(id) {
    return db.students.find((s) => s.id === id);
  },

  addStudent(name, farbe) {
    const st = { id: uid(), name: name.trim(), farbe, createdAt: Date.now() };
    db.students.push(st);
    this.save();
    return st;
  },

  updateStudent(id, patch) {
    Object.assign(this.student(id), patch);
    this.save();
  },

  deleteStudent(id) {
    db.students = db.students.filter((s) => s.id !== id);
    db.sessions = db.sessions.filter((s) => s.studentId !== id);
    this.save();
  },

  // ---- Sitzungen ----
  sessionsFor(studentId) {
    return db.sessions
      .filter((s) => s.studentId === studentId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  session(id) {
    return db.sessions.find((s) => s.id === id);
  },

  newSession(studentId) {
    const ses = {
      id: uid(),
      studentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      phase: PHASEN[0].id,
      maxPhase: 0,
      tools: {},
      boards: {},
      notes: '',
      moments: [],
      finished: false,
    };
    db.sessions.push(ses);
    this.save();
    return ses;
  },

  touch(ses) {
    ses.updatedAt = Date.now();
    this.save();
  },

  deleteSession(id) {
    db.sessions = db.sessions.filter((s) => s.id !== id);
    this.save();
  },

  // ---- Datensicherung ----
  exportData() {
    return JSON.stringify({ ...db, exportedAt: Date.now(), app: 'coaching' }, null, 1);
  },

  /** Führt eine Sicherung mit den vorhandenen Daten zusammen (neuere Stände gewinnen). */
  importData(obj) {
    if (!obj || !Array.isArray(obj.students) || !Array.isArray(obj.sessions)) {
      throw new Error('Keine gültige Sicherungsdatei');
    }
    let neu = 0;
    for (const st of obj.students) {
      const vorhanden = this.student(st.id);
      if (!vorhanden) {
        db.students.push(st);
        neu++;
      }
    }
    for (const ses of obj.sessions) {
      const i = db.sessions.findIndex((s) => s.id === ses.id);
      if (i === -1) {
        db.sessions.push(ses);
        neu++;
      } else if ((ses.updatedAt || 0) > (db.sessions[i].updatedAt || 0)) {
        db.sessions[i] = ses;
      }
    }
    this.save();
    this.saveNow();
    return neu;
  },

  wipe() {
    db = leer();
    this.save();
    this.saveNow();
  },
};

// Beim Verlassen der App sofort speichern.
window.addEventListener('pagehide', () => store.saveNow());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') store.saveNow();
});
