// On-screen text: the F3 debug panel and the controls help. Plain DOM, kept
// separate from the physics.

const PANEL_STYLE = `
  position: fixed; margin: 0; padding: 8px 12px; z-index: 10;
  font: 13px/1.45 ui-monospace, Menlo, Consolas, monospace;
  color: #e8f0e0; background: rgba(10, 16, 10, 0.62); border-radius: 6px;
  white-space: pre; pointer-events: none;
`;

function panel(extra) {
  const el = document.createElement('pre');
  el.style.cssText = PANEL_STYLE + extra;
  document.body.appendChild(el);
  return el;
}

export function createDebugOverlay() {
  const el = panel('top: 10px; left: 10px; display: none;');
  return {
    toggle() {
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    },
    get visible() {
      return el.style.display !== 'none';
    },
    set(lines) {
      el.textContent = lines.join('\n');
    },
  };
}

const HELP = [
  'DAWN PATROL - controls',
  '  Down / Up      pull back (nose up) / push forward',
  '  Left / Right   roll',
  '  Q / E          rudder left / right',
  '  W / S          throttle up / down',
  '  T / G          trim nose up / down',
  '  1-4            Camel, SPAD, Dr.I, Albatros',
  '  R restart   P pause   F3 debug   I invert pitch   H hide this',
].join('\n');

export function createHelp() {
  const el = panel('bottom: 10px; left: 10px;');
  el.textContent = HELP;
  return { toggle() { el.style.display = el.style.display === 'none' ? 'block' : 'none'; } };
}

// Short status line top-right: aircraft name and a crash notice.
export function createBanner() {
  const el = panel('top: 10px; right: 10px; text-align: right;');
  return {
    set(text) {
      el.textContent = text;
      el.style.display = text ? 'block' : 'none';
    },
  };
}
