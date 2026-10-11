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
  '  1-4            Camel, SPAD, Dr.I, Albatros',
  '  Insert/Delete or W/S   throttle up / down (mouse wheel too)',
  '  Home/End or T/G        trim nose up / down',
  '  1-4 airfield start      Shift+1-4 air start at 1,000 m',
  '  Mouse: click to fly with the mouse, Esc to release, X centre stick,',
  '         , and . sensitivity',
  '  Joystick: stick = pitch/roll, twist = rudder, slider = throttle, hat = look',
  '            trigger fire, 2 camera, 3/4 trim, 5 readout, 7 pause, 8 restart',
  '            F2 joystick screen (test, learn, flip); press the trigger once if it is not found',
  '  C camera (cockpit / chase / free)   V or right mouse: look around',
  '  J instruments readout   L graphics quality   R restart   P pause   F3 debug   I invert pitch',
  '  H hide this   F4 flight test panel (development builds only)',
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
