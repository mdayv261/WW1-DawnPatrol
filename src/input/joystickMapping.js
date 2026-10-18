// Default joystick mapping for the Logitech Extreme 3D Pro, and the rules for
// merging a saved (learned) mapping over it. Control settings, not physics.
//
// Axis and button numbers are the Gamepad API's raw numbers (0-based). The
// numbering this stick gets differs between browsers and operating systems.
// The throttle slider (axis 6) and the twist handle (axis 5) were checked on
// the product owner's stick; the F2 joystick screen shows the real numbers
// and "Learn" changes any of them.

export const STORE_KEY = 'dawnPatrol.joystick';

// Bumped when a default changes, so a saved copy of the old default is replaced.
// 2: the throttle slider is on axis 6 on the product owner's Extreme 3D Pro (was 3).
// 3: the twist handle (rudder) is on axis 5 (was 2).
// 4: any command can go on a button, a button can be unassigned (null), and "centre" is now
//    "recentre" (the keyboard's name for it). Phase 7.
export const MAPPING_VERSION = 4;

export const DEFAULT_MAPPING = {
  axes: {
    roll: { index: 0, invert: false, deadzone: 0.05 }, // stick left-right
    pitch: { index: 1, invert: false, deadzone: 0.05 }, // stick forward-back (raw +1 = stick back = pull)
    yaw: { index: 5, invert: false, deadzone: 0.12 }, // twist handle (axis 5 on the real stick); wider dead zone, it is noisy
    throttle: { index: 6, invert: true }, // slider (axis 6 on the real stick); raw -1 with the slider pushed forward = full throttle
  },
  expo: 0.3, // 0 = straight response, 1 = very gentle near the centre
  // How the 8-way hat is reported: 'axis' (one axis with 8 values), 'axes2'
  // (an x axis and a y axis) or 'buttons' (four buttons).
  hat: { type: 'axis', index: 9 },
  // Buttons are 0-based here; the stick prints them 1-based (trigger = 1). null = no button.
  // fire, trimDown and trimUp work while held; the rest are the keyboard's one-shot commands
  // (src/input/bindings.js) and do the same thing.
  buttons: {
    fire: 0, // trigger (held)
    camera: 1, // thumb button
    trimDown: 2, // top buttons (held)
    trimUp: 3,
    readout: 4,
    recentre: 5,
    pause: 6,
    restart: 7,
    clearJam: 8, // button 9 on the stick
    changeDrum: 9, // button 10 on the stick
    look: null,
    hud: null,
    mute: null,
    practice: null,
    invertPitch: null,
    quality: null,
    help: null,
  },
};

// Buttons that work while held (the others act once per press).
export const HELD_BUTTONS = new Set(['fire', 'trimDown', 'trimUp']);

export const BUTTON_LABELS = {
  fire: 'Fire',
  camera: 'Cycle camera',
  trimDown: 'Trim nose down',
  trimUp: 'Trim nose up',
  readout: 'Instrument readout',
  recentre: 'Centre mouse stick',
  pause: 'Pause',
  restart: 'Restart',
  clearJam: 'Clear gun jam',
  changeDrum: 'Change drum',
  look: 'Look around',
  hud: 'Modern HUD',
  mute: 'Sound on / off',
  practice: 'Practice mode',
  invertPitch: 'Invert pitch',
  quality: 'Graphics quality',
  help: 'Show the keys',
};

const num = (v, fallback, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);
const index = (v, fallback) => (Number.isInteger(v) && v >= 0 && v < 64 ? v : fallback);

// Give button `i` (or null) to `action`. A button does one thing only, so it is taken from
// wherever it was. Returns the action that lost it, or null. Changes the mapping in place.
export function assignButton(mapping, action, i) {
  let moved = null;
  if (i !== null) {
    for (const [name, b] of Object.entries(mapping.buttons)) {
      if (b === i && name !== action) {
        mapping.buttons[name] = null;
        moved = name;
      }
    }
  }
  mapping.buttons[action] = i;
  return moved;
}

// Merge a saved mapping over the defaults, ignoring anything malformed so a
// corrupt saved value can never break the controls.
export function mergeMapping(saved) {
  const d = DEFAULT_MAPPING;
  let s = saved && typeof saved === 'object' ? saved : {};
  // A copy saved before a default was corrected still has the old value
  // (throttle on axis 3 before version 2, rudder on axis 2 before version 3);
  // drop just that value so the corrected default applies. Anything the player
  // chose with Learn is kept.
  const version = s.version ?? 1;
  for (const [name, fixedIn, oldIndex] of [['throttle', 2, 3], ['yaw', 3, 2]]) {
    if (version < fixedIn && s.axes?.[name]?.index === oldIndex) {
      s = { ...s, axes: { ...s.axes, [name]: { ...s.axes[name], index: undefined } } };
    }
  }
  const axes = {};
  for (const name of Object.keys(d.axes)) {
    const a = s.axes?.[name] ?? {};
    axes[name] = {
      index: index(a.index, d.axes[name].index),
      invert: typeof a.invert === 'boolean' ? a.invert : d.axes[name].invert,
    };
    if ('deadzone' in d.axes[name]) axes[name].deadzone = num(a.deadzone, d.axes[name].deadzone, 0, 0.5);
  }
  // Buttons. The player's own choices first (null = deliberately unassigned), then the
  // defaults for the rest where the button is still free: a button does one thing only.
  // "centre" was renamed "recentre".
  const mine = { ...(s.buttons && typeof s.buttons === 'object' && !Array.isArray(s.buttons) ? s.buttons : {}) };
  if (!('recentre' in mine) && 'centre' in mine) mine.recentre = mine.centre;
  const buttons = {};
  const used = new Set();
  for (const name of Object.keys(d.buttons)) {
    if (mine[name] === null) buttons[name] = null;
    else if (index(mine[name], null) !== null && !used.has(mine[name])) {
      buttons[name] = mine[name];
      used.add(mine[name]);
    }
  }
  for (const name of Object.keys(d.buttons)) {
    if (name in buttons) continue;
    const v = d.buttons[name];
    buttons[name] = v !== null && !used.has(v) ? v : null;
    if (buttons[name] !== null) used.add(v);
  }
  const ordered = Object.fromEntries(Object.keys(d.buttons).map((name) => [name, buttons[name]]));
  return { version: MAPPING_VERSION, axes, expo: num(s.expo, d.expo, 0, 1), hat: mergeHat(s.hat), buttons: ordered };
}

function mergeHat(h) {
  const d = DEFAULT_MAPPING.hat;
  if (h?.type === 'axis') return { type: 'axis', index: index(h.index, d.index) };
  if (h?.type === 'axes2') return { type: 'axes2', x: index(h.x, 4), y: index(h.y, 5) };
  if (h?.type === 'buttons') return { type: 'buttons', up: index(h.up, 12), down: index(h.down, 13), left: index(h.left, 14), right: index(h.right, 15) };
  return { ...d };
}
