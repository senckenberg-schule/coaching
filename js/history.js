// Rückgängig-Funktion: speichert frühere Zustände als JSON.

export function createHistory(getState, applyState, onChange = () => {}) {
  const stapel = [];
  return {
    push(snapshot) {
      stapel.push(snapshot ?? JSON.stringify(getState()));
      if (stapel.length > 80) stapel.shift();
      onChange();
    },
    capture() {
      return JSON.stringify(getState());
    },
    undo() {
      const s = stapel.pop();
      if (s) applyState(JSON.parse(s));
      onChange();
    },
    get canUndo() {
      return stapel.length > 0;
    },
  };
}
