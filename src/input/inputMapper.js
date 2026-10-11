// Turns held keys into a smooth ControlInput. No browser code in here, so it
// can be tested directly. The browser wiring is in keyboard.js.

import { createInput } from '../physics/controls.js';

// Default key bindings (rebinding comes in a later phase).
export const KEYS = {
  pullBack: ['ArrowDown'], // stick back, nose up
  pushForward: ['ArrowUp'], // stick forward, nose down
  rollLeft: ['ArrowLeft'],
  rollRight: ['ArrowRight'],
  rudderLeft: ['KeyQ'],
  rudderRight: ['KeyE'],
  throttleUp: ['KeyW'],
  throttleDown: ['KeyS'],
  trimNoseUp: ['KeyT'],
  trimNoseDown: ['KeyG'],
};

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

export class InputMapper {
  constructor(keys = KEYS) {
    this.keys = keys;
    this.held = new Set();
    this.input = createInput();
    this.invertPitch = false;
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
    return this.keys[action].some((c) => this.held.has(c));
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
