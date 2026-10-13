// The warnings box (stall, G, overspeed): top centre, below the modern HUD's heading tape, in
// every view, whether or not the modern HUD is on. Red for danger, amber for caution. The lines
// come from warningLines in src/game/warnings.js. Plain DOM.

const STYLE = `
  position: fixed; top: 64px; left: 50%; transform: translateX(-50%); z-index: 11; display: none;
  pointer-events: none; text-align: center; font: bold 18px/1.35 ui-monospace, Menlo, Consolas, monospace;
  letter-spacing: 0.08em;
`;
const LINE = {
  danger: 'color: #fff; background: rgba(170, 20, 10, 0.85); border: 2px solid #ffb0a0;',
  caution: 'color: #1b1200; background: rgba(240, 170, 20, 0.88); border: 2px solid #fff0b0;',
};

export function createWarningBox() {
  const root = document.createElement('div');
  root.style.cssText = STYLE;
  document.body.appendChild(root);
  let shown = '';
  return {
    // lines: [{ text, level }]; an empty list hides the box.
    set(lines) {
      const key = lines.map((l) => `${l.level}:${l.text}`).join('|');
      if (key === shown) return;
      shown = key;
      root.replaceChildren(...lines.map((l) => {
        const d = document.createElement('div');
        d.style.cssText = `${LINE[l.level]} margin: 0 0 4px; padding: 3px 14px; border-radius: 4px;`;
        d.textContent = l.text;
        return d;
      }));
      root.style.display = lines.length ? 'block' : 'none';
    },
  };
}
