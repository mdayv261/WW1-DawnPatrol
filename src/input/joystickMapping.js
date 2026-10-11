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
export const MAPPING_VERSION = 3;

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
  // Buttons are 0-based here; the stick prints them 1-based (trigger = 1).
  buttons: {
    fire: 0, // trigger (held)
    camera: 1, // thumb button
    trimDown: 2, // top buttons (held)
    trimUp: 3,
    readout: 4,
    centre: 5,
    pause: 6,
    restart: 7,
  },
};

export const BUTTON_LABELS = {
  fire: 'Fire',
  camera: 'Cycle camera',
  trimDown: 'Trim nose down',
  trimUp: 'Trim nose up',
  readout: 'Instrument readout',
  centre: 'Centre mouse stick',
  pause: 'Pause',
  restart: 'Restart',
};

const num = (v, fallback, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);
const index = (v, fallback) => (Number.isInteger(v) && v >= 0 && v < 64 ? v : fallback);

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
  const buttons = {};
  for (const name of Object.keys(d.buttons)) buttons[name] = index(s.buttons?.[name], d.buttons[name]);
  return { version: MAPPING_VERSION, axes, expo: num(s.expo, d.expo, 0, 1), hat: mergeHat(s.hat), buttons };
}

function mergeHat(h) {
  const d = DEFAULT_MAPPING.hat;
  if (h?.type === 'axis') return { type: 'axis', index: index(h.index, d.index) };
  if (h?.type === 'axes2') return { type: 'axes2', x: index(h.x, 4), y: index(h.y, 5) };
  if (h?.type === 'buttons') return { type: 'buttons', up: index(h.up, 12), down: index(h.down, 13), left: index(h.left, 14), right: index(h.right, 15) };
  return { ...d };
}
