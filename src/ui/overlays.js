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

// The keys help (H). Its text comes from the player's keys and buttons (helpText in
// src/input/bindings.js) and is replaced when they change.
export function createHelp(text = '') {
  const el = panel('bottom: 10px; left: 10px;');
  el.textContent = text;
  let wanted = true; // H turns it on and off; it is hidden anyway while a menu is up
  let allowed = true;
  const apply = () => { el.style.display = wanted && allowed ? 'block' : 'none'; };
  return {
    toggle() {
      wanted = !wanted;
      apply();
    },
    allow(yes) {
      allowed = yes;
      apply();
    },
    setText(t) {
      el.textContent = t;
    },
  };
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

// Small instrument readout for the outside views (J toggles), in the
// aircraft's own units. Hidden in the cockpit, which has real instruments.
export function createReadout() {
  const el = panel('bottom: 10px; right: 10px; text-align: right;');
  let enabled = true;
  return {
    toggle() {
      enabled = !enabled;
      return enabled;
    },
    set(text, show) {
      el.textContent = text;
      el.style.display = enabled && show ? 'block' : 'none';
    },
  };
}
