// Turns held keys into a smooth ControlInput. No browser code in here, so it
// can be tested directly. The browser wiring is in keyboard.js.

import { createInput } from '../physics/controls.js';
import { defaultBindings, HELD } from './bindings.js';

const RAMP_UP = 1.6; // stick travel per second while a key is held (a tap gives a gentle input)
const RAMP_DOWN = 5; // stick return per second after release
const THROTTLE_RATE = 0.5; // per second
const TRIM_RATE = 0.4; // per second

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function moveToward(value, target, rate, dt) {
  const d = target - value;
  const step = rate * dt;
  return Math.abs(d) <= step ? target : value + Math.sign(d) * step;
}

// The keys come from the bindings (src/input/bindings.js): the defaults, or the player's own
// from the Controls screen.
export class InputMapper {
  constructor(bindings = defaultBindings()) {
    this.bindings = bindings;
    this.keys = bindings.keys; // action -> its keys
    this.held = new Set();
    this.input = createInput();
    this.invertPitch = false;
    this.lastKey = ''; // the last key pressed, as the browser reported it (the F3 screen shows it)
  }

  // Use new bindings at once (the Controls screen). Keys held now are let go.
  setBindings(bindings) {
    this.bindings = bindings;
    this.keys = bindings.keys;
    this.held.clear();
  }

  press(code) {
    this.held.add(code);
  }

  release(code) {
    this.held.delete(code);
  }

  releaseAll() {
    this.held.clear();
  }

  isDown(action) {
    return (this.keys[action] ?? []).some((c) => c !== null && this.held.has(c));
  }

  // Which stick axes the keyboard is holding (keys win over the mouse).
  pitchKeyHeld() {
    return this.isDown('pullBack') || this.isDown('pushForward');
  }

  rollKeyHeld() {
    return this.isDown('rollLeft') || this.isDown('rollRight');
  }

  // Change the throttle directly (mouse wheel), kept within 0 to 1.
  nudgeThrottle(amount) {
    this.input.throttle = clamp(this.input.throttle + amount, 0, 1);
  }

  rudderKeyHeld() {
    return this.isDown('rudderLeft') || this.isDown('rudderRight');
  }

  // Set the throttle directly (the joystick slider), kept within 0 to 1.
  setThrottle(value) {
    this.input.throttle = clamp(value, 0, 1);
  }

  // Move the trim for dt seconds at the keys' rate; direction is +1 (nose up) or -1.
  nudgeTrim(direction, dt) {
    this.input.trim = clamp(this.input.trim + direction * TRIM_RATE * dt, -1, 1);
  }

  // True while the player holds any flight key (used to cancel a scripted
  // test pilot so the player can take over).
  pilotActive() {
    return [...HELD].some((action) => action !== 'fire' && this.isDown(action));
  }

  // Set the throttle and trim (used at the start of each flight).
  reset(input) {
    this.input = { ...createInput(), ...input };
  }

  // Axis in [-1, 1] from a pair of keys.
  axis(negative, positive) {
    return (this.isDown(positive) ? 1 : 0) - (this.isDown(negative) ? 1 : 0);
  }

  // Advance the smoothing by dt seconds and return the current ControlInput.
  update(dt) {
    const i = this.input;
    const ramp = (value, target) => moveToward(value, target, target === 0 ? RAMP_DOWN : RAMP_UP, dt);

    // Stick back (pull) is positive. With the default mapping, Down = pull back.
    const pitch = this.axis('pushForward', 'pullBack') * (this.invertPitch ? -1 : 1);
    i.pull = ramp(i.pull, pitch);
    i.roll = ramp(i.roll, this.axis('rollLeft', 'rollRight'));
    i.yaw = ramp(i.yaw, this.axis('rudderLeft', 'rudderRight'));

    i.throttle = clamp(i.throttle + this.axis('throttleDown', 'throttleUp') * THROTTLE_RATE * dt, 0, 1);
    i.trim = clamp(i.trim + this.axis('trimNoseDown', 'trimNoseUp') * TRIM_RATE * dt, -1, 1);
    return i;
  }
}
