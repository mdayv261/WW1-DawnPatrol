import { describe, it, expect } from 'vitest';
import { shapeAxis, sliderToThrottle, decodeHat, choosePad, describePads, createMemory, readJoystick, AxisLearner, HatLearner } from '../src/input/joystickMath.js';
import { DEFAULT_MAPPING, mergeMapping } from '../src/input/joystickMapping.js';
import { mixJoystick, MouseStick } from '../src/input/mouse.js';
import { InputMapper } from '../src/input/inputMapper.js';

// Joystick (Phase 2, checkpoint 3). Fake devices stand in for the Logitech
// Extreme 3D Pro: the real stick is checked by the product owner in the browser.

const NEUTRAL_HAT = 1.28571;
function fakePad({ axes = [0, 0, 0, 0], buttons = [], id = 'Logitech Extreme 3D Pro (STANDARD GAMEPAD Vendor: 046d)' } = {}) {
  const axisList = [...axes];
  while (axisList.length < 10) axisList.push(axisList.length === 9 ? NEUTRAL_HAT : 0);
  const buttonList = Array.from({ length: 12 }, (_, i) => ({ pressed: buttons.includes(i) }));
  return { id, connected: true, axes: axisList, buttons: buttonList };
}
const withAxis = (pad, i, v) => ({ ...pad, axes: pad.axes.map((a, j) => (j === i ? v : a)) });
const withButtons = (pad, down) => ({ ...pad, buttons: pad.buttons.map((b, i) => ({ pressed: down.includes(i) })) });
const M = mergeMapping(null);
const T = M.axes.throttle.index; // the throttle slider axis (6 on the product owner's stick)
const Y = M.axes.yaw.index; // the twist handle axis (5 on the product owner's stick)

describe('shapeAxis', () => {
  it('is exactly zero inside the dead zone, so a resting stick never drifts', () => {
    for (const v of [0, 0.01, -0.04, 0.05, -0.05]) expect(shapeAxis(v, { deadzone: 0.05 })).toBe(0);
  });
  it('starts from zero at the dead-zone edge and reaches full travel at the ends', () => {
    expect(shapeAxis(0.0501, { deadzone: 0.05 })).toBeLessThan(0.001);
    expect(shapeAxis(1, { deadzone: 0.05 })).toBeCloseTo(1, 10);
    expect(shapeAxis(-1, { deadzone: 0.05 })).toBeCloseTo(-1, 10);
  });
  it('the curve makes small movements gentler, and is symmetric', () => {
    const straight = shapeAxis(0.5, { deadzone: 0, expo: 0 });
    const curved = shapeAxis(0.5, { deadzone: 0, expo: 0.5 });
    expect(straight).toBeCloseTo(0.5);
    expect(curved).toBeLessThan(straight);
    expect(shapeAxis(-0.5, { deadzone: 0, expo: 0.5 })).toBeCloseTo(-curved);
  });
  it('can be flipped, and ignores nonsense readings', () => {
    expect(shapeAxis(0.6, { deadzone: 0, expo: 0, invert: true })).toBeCloseTo(-0.6);
    expect(shapeAxis(NaN)).toBe(0);
    expect(shapeAxis(7, { deadzone: 0, expo: 0 })).toBe(1);
  });
});

describe('throttle slider', () => {
  it('forward (raw -1) is full throttle with the default flip, back is idle', () => {
    expect(sliderToThrottle(-1, true)).toBe(1);
    expect(sliderToThrottle(1, true)).toBe(0);
    expect(sliderToThrottle(0, true)).toBeCloseTo(0.5);
    expect(sliderToThrottle(-1, false)).toBe(0);
  });
});

describe('hat', () => {
  const axisHat = { type: 'axis', index: 9 };
  const cases = [
    [-1, 0, 1], [-5 / 7, 1, 1], [-3 / 7, 1, 0], [-1 / 7, 1, -1],
    [1 / 7, 0, -1], [3 / 7, -1, -1], [5 / 7, -1, 0], [1, -1, 1],
  ];
  it('reads all eight directions from a one-axis hat, and centred', () => {
    for (const [value, x, y] of cases) {
      expect(decodeHat(fakePad({ axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, value] }), axisHat), `value ${value}`).toEqual({ x, y });
    }
    expect(decodeHat(fakePad(), axisHat)).toEqual({ x: 0, y: 0 });
  });
  it('still reads the direction when the value is a little off', () => {
    expect(decodeHat(fakePad({ axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, -0.43] }), axisHat)).toEqual({ x: 1, y: 0 });
    expect(decodeHat(fakePad({ axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.0001] }), axisHat)).toEqual({ x: -1, y: 1 });
  });
  it('treats a reading that is no direction as centred, not a wrong direction', () => {
    expect(decodeHat(fakePad({ axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }), axisHat)).toEqual({ x: 0, y: 0 });
    expect(decodeHat(fakePad({ axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 3.2857] }), axisHat)).toEqual({ x: 0, y: 0 });
  });
  it('reads a hat made of four buttons, with diagonals', () => {
    const hat = { type: 'buttons', up: 8, down: 9, left: 10, right: 11 };
    const p = (down) => withButtons(fakePad(), down);
    expect(decodeHat(p([8]), hat)).toEqual({ x: 0, y: 1 });
    expect(decodeHat(p([9, 10]), hat)).toEqual({ x: -1, y: -1 });
    expect(decodeHat(p([8, 11]), hat)).toEqual({ x: 1, y: 1 });
    expect(decodeHat(p([]), hat)).toEqual({ x: 0, y: 0 });
  });
  it('reads a hat made of an x axis and a y axis (raw y -1 is up)', () => {
    const hat = { type: 'axes2', x: 4, y: 5 };
    expect(decodeHat(fakePad({ axes: [0, 0, 0, 0, 1, -1] }), hat)).toEqual({ x: 1, y: 1 });
    expect(decodeHat(fakePad({ axes: [0, 0, 0, 0, -1, 1] }), hat)).toEqual({ x: -1, y: -1 });
  });
});

describe('choosePad', () => {
  it('prefers the Logitech stick by name, then any device with four or more axes', () => {
    const other = { id: 'Some Mouse', connected: true, axes: [0, 0], buttons: [] };
    const stick = fakePad();
    const generic = { id: 'USB Device 1234', connected: true, axes: [0, 0, 0, 0], buttons: [] };
    expect(choosePad([null, other, stick])).toBe(stick);
    expect(choosePad([other, generic])).toBe(generic);
    expect(choosePad([other])).toBeNull();
    expect(choosePad([])).toBeNull();
  });
});

describe('readJoystick', () => {
  it('maps the stick to roll, pitch and rudder, stick back being pull', () => {
    const joy = readJoystick(withAxis(fakePad({ axes: [1, 1] }), Y, -1), M, createMemory());
    expect(joy.roll).toBeCloseTo(1); // right
    expect(joy.pull).toBeCloseTo(1); // back
    expect(joy.yaw).toBeCloseTo(-1); // twist left
  });
  it('a centred stick gives exactly zero on every axis', () => {
    const joy = readJoystick(fakePad(), M, createMemory());
    expect([joy.roll, joy.pull, joy.yaw]).toEqual([0, 0, 0]);
  });
  it('the slider does not take over the throttle at the start, wherever it sits', () => {
    const mem = createMemory();
    expect(readJoystick(withAxis(fakePad(), T, -1), M, mem).throttle).toBeNull(); // sitting at full
    expect(readJoystick(withAxis(fakePad(), T, -1), M, mem).throttle).toBeNull();
  });
  it('the slider takes over once moved, reports steps of 3% or more, and leaves the keyboard alone otherwise', () => {
    const mem = createMemory();
    readJoystick(withAxis(fakePad(), T, 1), M, mem); // idle position
    expect(readJoystick(withAxis(fakePad(), T, 0.99), M, mem).throttle).toBeNull(); // jitter
    const moved = readJoystick(withAxis(fakePad(), T, 0), M, mem);
    expect(moved.throttle).toBeCloseTo(0.5);
    expect(readJoystick(withAxis(fakePad(), T, 0), M, mem).throttle).toBeNull(); // held still
    expect(readJoystick(withAxis(fakePad(), T, -1), M, mem).throttle).toBe(1);
  });
  it('the trigger fires while held; other buttons count once per press', () => {
    const mem = createMemory();
    const a = readJoystick(fakePad({ buttons: [0, 1] }), M, mem);
    expect(a.fire).toBe(true);
    expect(a.pressedNow.sort()).toEqual(['camera', 'fire']);
    const b = readJoystick(fakePad({ buttons: [0, 1] }), M, mem);
    expect(b.pressedNow).toEqual([]); // still held: not a new press
    expect(b.held.has('camera')).toBe(true);
    const c = readJoystick(fakePad(), M, mem);
    expect(c.fire).toBe(false);
    expect(readJoystick(fakePad({ buttons: [1] }), M, mem).pressedNow).toEqual(['camera']); // pressed again
  });
  it('the trim buttons (3 and 4) are held actions', () => {
    const joy = readJoystick(fakePad({ buttons: [2] }), M, createMemory());
    expect(joy.held.has('trimDown')).toBe(true);
    expect(readJoystick(fakePad({ buttons: [3] }), M, createMemory()).held.has('trimUp')).toBe(true);
  });
  it('copes with a device that has fewer axes than the mapping expects', () => {
    const joy = readJoystick({ id: 'x', axes: [0.5], buttons: [] }, M, createMemory());
    expect(joy.pull).toBe(0);
    expect(joy.hat).toEqual({ x: 0, y: 0 });
  });
});

describe('saved mapping', () => {
  it('the twist handle defaults to axis 5, and an old saved default (axis 2) is replaced but a deliberate choice is kept', () => {
    expect(M.axes.yaw.index).toBe(5);
    const old = { version: 2, axes: { yaw: { index: 2, invert: true, deadzone: 0.2 }, throttle: { index: 6, invert: true } } };
    expect(mergeMapping(old).axes.yaw).toMatchObject({ index: 5, invert: true, deadzone: 0.2 });
    expect(mergeMapping(old).axes.throttle.index).toBe(6);
    expect(mergeMapping({ version: 3, axes: { yaw: { index: 2 } } }).axes.yaw.index).toBe(2); // learned on purpose
    const veryOld = { axes: { yaw: { index: 2 }, throttle: { index: 3 } } }; // saved before either fix
    expect(mergeMapping(veryOld).axes.yaw.index).toBe(5);
    expect(mergeMapping(veryOld).axes.throttle.index).toBe(6);
    expect(mergeMapping(null).version).toBe(3);
  });

  it('the throttle slider defaults to axis 6, and an old saved default (axis 3) is replaced but a deliberate choice is kept', () => {
    expect(M.axes.throttle.index).toBe(6);
    const old = { axes: { roll: { index: 0, invert: false }, throttle: { index: 3, invert: true } } }; // saved before version 2
    expect(mergeMapping(old).axes.throttle.index).toBe(6);
    expect(mergeMapping(old).axes.throttle.invert).toBe(true);
    expect(mergeMapping({ version: 2, axes: { throttle: { index: 3, invert: false } } }).axes.throttle.index).toBe(3); // learned on purpose
    expect(mergeMapping({ axes: { throttle: { index: 4 } } }).axes.throttle.index).toBe(4);
  });
  it('fills in defaults, keeps good values and ignores bad ones', () => {
    const m = mergeMapping({ axes: { roll: { index: 4, invert: true }, pitch: { index: 'x' } }, expo: 9, buttons: { fire: 5, camera: -2 }, hat: { type: 'buttons', up: 1, down: 2, left: 3, right: 4 } });
    expect(m.axes.roll).toMatchObject({ index: 4, invert: true, deadzone: DEFAULT_MAPPING.axes.roll.deadzone });
    expect(m.axes.pitch.index).toBe(DEFAULT_MAPPING.axes.pitch.index);
    expect(m.expo).toBe(1);
    expect(m.buttons.fire).toBe(5);
    expect(m.buttons.camera).toBe(DEFAULT_MAPPING.buttons.camera);
    expect(m.hat).toEqual({ type: 'buttons', up: 1, down: 2, left: 3, right: 4 });
  });
  it('survives junk', () => {
    for (const junk of [null, undefined, 5, 'x', [], { axes: 7, hat: 'no' }]) expect(mergeMapping(junk)).toEqual(mergeMapping(null));
  });
});

describe('learning', () => {
  it('assigns the axis that moves furthest', () => {
    const rest = fakePad();
    const learner = new AxisLearner(rest);
    expect(learner.feed(withAxis(rest, 2, 0.3))).toBeNull(); // too small
    expect(learner.feed(withAxis(withAxis(rest, 1, 0.6), 5, -0.9))).toBe(5);
  });
  it('learns a one-axis hat from up then right', () => {
    const rest = fakePad();
    const hat = new HatLearner(rest);
    expect(hat.feed(rest).hat).toBeNull();
    expect(hat.feed(withAxis(rest, 9, -1)).hat).toBeNull(); // up
    expect(hat.feed(withAxis(rest, 9, -1)).hat).toBeNull(); // still held: not a second push
    expect(hat.feed(rest).hat).toBeNull(); // let go
    expect(hat.feed(withAxis(rest, 9, -3 / 7)).hat).toEqual({ type: 'axis', index: 9 }); // right
  });
  it('learns a hat on two axes', () => {
    const rest = fakePad();
    const hat = new HatLearner(rest);
    hat.feed(withAxis(rest, 5, -1)); // up
    hat.feed(rest);
    expect(hat.feed(withAxis(rest, 4, 1)).hat).toEqual({ type: 'axes2', x: 4, y: 5 });
  });
  it('learns a hat of four buttons from four pushes', () => {
    const rest = fakePad();
    const hat = new HatLearner(rest);
    const results = [];
    for (const b of [8, 11, 9, 10]) {
      results.push(hat.feed(withButtons(rest, [b])).hat);
      hat.feed(rest);
    }
    expect(results.slice(0, 3)).toEqual([null, null, null]);
    expect(results[3]).toEqual({ type: 'buttons', up: 8, right: 11, down: 9, left: 10 });
  });
});

describe('mixing with the keyboard and mouse', () => {
  const keys = (o = {}) => ({ pull: 0, roll: 0, yaw: 0, throttle: 1, trim: 0, ...o });
  const joy = (o = {}) => ({ pull: 0, roll: 0, yaw: 0, ...o });
  const none = { pitch: false, roll: false, yaw: false };

  it('the joystick flies on its own', () => {
    const out = mixJoystick(keys(), new MouseStick(), joy({ pull: 0.4, roll: -0.7, yaw: 0.2 }), none);
    expect(out).toEqual({ pull: 0.4, roll: -0.7, yaw: 0.2 });
  });
  it('a held key wins on its own axis only', () => {
    const out = mixJoystick(keys({ roll: 1, yaw: -1 }), new MouseStick(), joy({ pull: 0.5, roll: -1, yaw: 1 }), { pitch: false, roll: true, yaw: true });
    expect(out).toEqual({ pull: 0.5, roll: 1, yaw: -1 });
  });
  it('adds to the mouse stick and clamps', () => {
    const stick = new MouseStick();
    stick.roll = 0.8;
    expect(mixJoystick(keys(), stick, joy({ roll: 0.8 }), none).roll).toBe(1);
  });
  it('with no joystick it behaves as before', () => {
    const stick = new MouseStick();
    stick.pull = 0.3;
    expect(mixJoystick(keys({ yaw: 0.5 }), stick, null, none)).toEqual({ pull: 0.3, roll: 0, yaw: 0.5 });
  });
});

describe('throttle and trim from the joystick', () => {
  it('setThrottle is limited to 0-1, and the trim moves at the key rate and stops at the ends', () => {
    const m = new InputMapper();
    m.setThrottle(1.5);
    expect(m.input.throttle).toBe(1);
    m.setThrottle(-1);
    expect(m.input.throttle).toBe(0);
    m.nudgeTrim(1, 1);
    expect(m.input.trim).toBeCloseTo(0.4);
    m.nudgeTrim(-1, 10);
    expect(m.input.trim).toBe(-1);
  });
  it('rudderKeyHeld sees Q and E', () => {
    const m = new InputMapper();
    expect(m.rudderKeyHeld()).toBe(false);
    m.press('KeyE');
    expect(m.rudderKeyHeld()).toBe(true);
  });
});

describe('describePads', () => {
  it('says plainly when the browser shows no controllers, and lists them when it does', () => {
    expect(describePads([])).toMatch(/no game controllers/);
    expect(describePads([null, undefined])).toMatch(/no game controllers/);
    const text = describePads([fakePad()]);
    expect(text).toContain('Extreme 3D Pro');
    expect(text).toContain('10 axes');
    expect(text).toContain('12 buttons');
  });
});
