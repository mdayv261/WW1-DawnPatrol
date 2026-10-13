// Joystick logic with no browser code, so it can be tested with fake devices.
// A "pad" here is the object the browser's Gamepad API gives us:
// { id, axes: [numbers], buttons: [{ pressed }] }. The wiring is in joystick.js.

const clamp = (v, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, v));

// One stick axis: flip if asked, cut out the dead zone (rescaled so the output
// starts from zero at its edge, not with a jump), then an exponential curve
// that makes small movements gentler. Returns exactly 0 inside the dead zone.
export function shapeAxis(raw, { deadzone = 0.05, expo = 0.3, invert = false } = {}) {
  const v = clamp(Number.isFinite(raw) ? raw : 0) * (invert ? -1 : 1);
  const a = Math.abs(v);
  if (a <= deadzone) return 0;
  const s = (a - deadzone) / (1 - deadzone);
  return Math.sign(v) * ((1 - expo) * s + expo * s * s * s);
}

// The throttle slider as 0 to 1.
export function sliderToThrottle(raw, invert) {
  return clamp(((invert ? -1 : 1) * clamp(Number.isFinite(raw) ? raw : 0) + 1) / 2, 0, 1);
}

// The eight directions of a hat reported as one axis, clockwise from up, in
// the order browsers commonly give them, and the value a centred hat gives.
// Directions are { x: +1 right, y: +1 up }.
const HAT_AXIS_VALUES = [-1, -5 / 7, -3 / 7, -1 / 7, 1 / 7, 3 / 7, 5 / 7, 1];
const HAT_DIRECTIONS = [
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 0 },
  { x: 1, y: -1 },
  { x: 0, y: -1 },
  { x: -1, y: -1 },
  { x: -1, y: 0 },
  { x: -1, y: 1 },
];
const HAT_TOLERANCE = 0.1; // spacing is 0.286, so anything this near is that direction

const pressed = (pad, i) => Boolean(pad.buttons?.[i]?.pressed);

// Which way the hat is pushed, as { x, y } with each in -1, 0 or 1.
export function decodeHat(pad, hat) {
  const centre = { x: 0, y: 0 };
  if (!pad || !hat) return centre;
  if (hat.type === 'buttons') {
    return {
      x: (pressed(pad, hat.right) ? 1 : 0) - (pressed(pad, hat.left) ? 1 : 0),
      y: (pressed(pad, hat.up) ? 1 : 0) - (pressed(pad, hat.down) ? 1 : 0),
    };
  }
  if (hat.type === 'axes2') {
    const t = 0.5; // raw y is -1 for up
    const x = pad.axes?.[hat.x] ?? 0;
    const y = pad.axes?.[hat.y] ?? 0;
    return { x: x > t ? 1 : x < -t ? -1 : 0, y: y < -t ? 1 : y > t ? -1 : 0 };
  }
  const v = pad.axes?.[hat.index];
  if (typeof v !== 'number' || Math.abs(v) > 1.1) return centre; // centred hats read about 1.29
  let best = -1;
  let bestDistance = HAT_TOLERANCE;
  HAT_AXIS_VALUES.forEach((value, i) => {
    const d = Math.abs(v - value);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best < 0 ? centre : { ...HAT_DIRECTIONS[best] };
}

// Pick the joystick out of the connected devices: by name first, otherwise the
// first device with at least four axes. Returns the pad or null.
export function choosePad(pads) {
  const list = Array.from(pads ?? []).filter((p) => p && p.connected !== false);
  return list.find((p) => /extreme 3d|logitech|joystick/i.test(p.id ?? '')) ?? list.find((p) => (p.axes?.length ?? 0) >= 4) ?? null;
}

// A plain-English line about the devices the browser is showing the page,
// for the on-screen hint and the console when no stick is found.
export function describePads(pads) {
  const list = Array.from(pads ?? []).filter(Boolean);
  if (!list.length) return 'The browser is showing this page no game controllers. Chrome only lists a stick after a button is pressed while this window has focus.';
  return `The browser shows ${list.length} game controller(s): ${list.map((p) => `"${p.id}" (${p.axes?.length ?? 0} axes, ${p.buttons?.length ?? 0} buttons)`).join('; ')}.`;
}

// What readJoystick remembers between frames.
export function createMemory() {
  return { lastSlider: null, held: new Set() };
}

const SLIDER_STEP = 0.03; // the slider only takes over the throttle after moving this far

// Read the stick for one frame. Returns
// { pull, roll, yaw, throttle (0-1 or null), fire, hat: {x, y}, held, pressedNow }
// where `held` lists the mapped actions whose button is down and `pressedNow`
// those that went down this frame (a press counts once).
export function readJoystick(pad, mapping, memory) {
  const ax = (name) => pad.axes?.[mapping.axes[name].index] ?? 0;
  const shape = (name) => shapeAxis(ax(name), { ...mapping.axes[name], expo: mapping.expo });

  // The slider is an absolute position, but the keyboard and wheel also move the
  // throttle. So it only reports when it has actually moved, and a slider left
  // anywhere at the start does not slam the throttle to that setting.
  const slider = sliderToThrottle(ax('throttle'), mapping.axes.throttle.invert);
  let throttle = null;
  if (memory.lastSlider === null) memory.lastSlider = slider;
  else if (Math.abs(slider - memory.lastSlider) > SLIDER_STEP) {
    throttle = slider;
    memory.lastSlider = slider;
  }

  const held = new Set();
  const pressedNow = [];
  for (const [action, i] of Object.entries(mapping.buttons)) {
    if (i === null || !pressed(pad, i)) continue; // null: no button for this action
    held.add(action);
    if (!memory.held.has(action)) pressedNow.push(action);
  }
  memory.held = held;

  return {
    pull: shape('pitch'),
    roll: shape('roll'),
    yaw: shape('yaw'),
    throttle,
    fire: held.has('fire'),
    hat: decodeHat(pad, mapping.hat),
    held,
    pressedNow,
  };
}

// --- Learning: "move the control you want to assign" ------------------------

const MOVE = 0.5; // an axis must move this far from where it started
const HAT_MOVE = 0.25; // the hat's steps are small

// Finds the axis that moves most. Used to assign roll, pitch, rudder and throttle.
export class AxisLearner {
  constructor(pad) {
    this.start = Array.from(pad?.axes ?? []);
  }

  feed(pad, threshold = MOVE) {
    let best = -1;
    let bestMove = threshold;
    Array.from(pad?.axes ?? []).forEach((v, i) => {
      const move = Math.abs(v - (this.start[i] ?? 0));
      if (move > bestMove) {
        best = i;
        bestMove = move;
      }
    });
    return best < 0 ? null : best;
  }
}

// Finds the button pressed for a command: the first one pressed that was not already down
// when learning began (a button held from before must be let go and pressed again).
export class ButtonLearner {
  constructor(pad) {
    this.down = Array.from(pad?.buttons ?? []).map((b) => Boolean(b.pressed));
  }

  feed(pad) {
    const list = Array.from(pad?.buttons ?? []);
    let found = null;
    list.forEach((b, i) => {
      if (!b.pressed) this.down[i] = false;
      else if (!this.down[i] && found === null) found = i;
    });
    return found;
  }
}

// Learns the hat from two or four pushes. Push up, then right:
// - the same axis moved both times: one axis with 8 values;
// - two different axes: an x axis and a y axis;
// - a button each time: it asks for down and left too.
// feed(pad) returns { prompt, hat } where hat is the finished mapping or null.
export class HatLearner {
  constructor(pad) {
    this.axes = new AxisLearner(pad);
    this.buttonsAtStart = Array.from(pad?.buttons ?? []).map((b) => Boolean(b.pressed));
    this.steps = [];
    this.wasIdle = true; // wait for the previous push to be let go before the next
  }

  static NAMES = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

  get prompt() {
    return `Push the hat ${HatLearner.NAMES[this.steps.length] ?? ''} and hold it`;
  }

  feed(pad) {
    const button = Array.from(pad?.buttons ?? []).findIndex((b, i) => b.pressed && !this.buttonsAtStart[i]);
    const axis = this.axes.feed(pad, HAT_MOVE);
    const active = button >= 0 || axis !== null;
    if (!active) {
      this.wasIdle = true;
      return { prompt: this.prompt, hat: null };
    }
    if (!this.wasIdle) return { prompt: this.prompt, hat: null };
    this.wasIdle = false;
    this.steps.push(button >= 0 ? { button } : { axis });
    return { prompt: this.prompt, hat: this.finish() };
  }

  finish() {
    if (this.steps.length < 2) return null;
    const [up, right, down, left] = this.steps;
    const upIsAxis = 'axis' in up;
    if (upIsAxis !== 'axis' in right) {
      this.steps = []; // one push was a button and the other an axis: start over
      return null;
    }
    if (upIsAxis) return up.axis === right.axis ? { type: 'axis', index: up.axis } : { type: 'axes2', x: right.axis, y: up.axis };
    if (this.steps.length < 4) return null; // buttons: also needs down and left
    return { type: 'buttons', up: up.button, right: right.button, down: down.button, left: left.button };
  }
}
