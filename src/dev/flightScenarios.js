// TEMPORARY flight-test scenarios for the F4 test panel (development builds
// only; see docs/DECISIONS.md D31). Each scenario sets a starting state and
// may run a short "scripted pilot" that moves the same stick, rudder and
// throttle inputs as the keyboard. It never touches the physics. Pressing any
// flight key cancels the script and gives control back to the player.

import { Vector3 } from 'three';
import { common } from '../aircraft/index.js';
import { topSpeed } from '../physics/performance.js';

export const SCENARIOS = [
  { id: 'level', label: 'Level 1000 m' },
  { id: 'full', label: 'Full throttle' },
  { id: 'stall', label: 'Stall' },
  { id: 'turnLeft', label: 'Turn left' },
  { id: 'turnRight', label: 'Turn right' },
  { id: 'spin', label: 'Spin' },
];

const clamp = (v, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, v));
const _f = new Vector3();
const _r = new Vector3();

// Pitch, bank (right wing down positive) and heading in radians.
export function attitude(state) {
  _f.set(1, 0, 0).applyQuaternion(state.quaternion);
  _r.set(0, 0, 1).applyQuaternion(state.quaternion);
  return { pitch: Math.asin(clamp(_f.y)), bank: Math.asin(clamp(-_r.y)), heading: Math.atan2(_f.x, -_f.z) };
}

// Rate of change of heading in rad/s (+ = turning right), straight from the
// aircraft's rotation: the world-vertical part of its angular velocity.
export function turnRate(state) {
  _f.copy(state.angularVelocity).applyQuaternion(state.quaternion);
  return -_f.y;
}

// Starting conditions: altitude (m), speed (m/s; trimmed level flight there)
// and the throttle the player's controls start at.
function startConditions(aircraft, id) {
  const cruise = 0.8 * aircraft.documented.maxSpeed;
  switch (id) {
    case 'full':
      return { altitude: 1000, speed: 0.995 * topSpeed(aircraft, common, 1000), throttle: 1 };
    case 'stall':
      return { altitude: 1500, speed: cruise, throttle: 0 };
    case 'turnLeft':
    case 'turnRight':
      return { altitude: 1500, speed: cruise, throttle: 1 };
    case 'spin':
      return { altitude: 2500, speed: cruise, throttle: 0 };
    default:
      return { altitude: 1000, speed: cruise, throttle: null }; // null: keep the trimmed throttle
  }
}

// Starts the scenario on a Simulation. Returns the player's starting input
// (throttle and trim) and a runner whose apply() is called before every
// physics step.
export function startScenario(sim, aircraft, id) {
  const c = startConditions(aircraft, id);
  const input = { ...sim.start(aircraft, c.altitude, c.speed) };
  if (c.throttle !== null) input.throttle = c.throttle;
  return { input, runner: new ScenarioRunner(id, sim, c.altitude) };
}

export class ScenarioRunner {
  constructor(id, sim, altitude) {
    this.id = id;
    this.sim = sim;
    this.altitude = altitude;
    this.t = 0;
    this.active = id !== 'level';
    this.cancelled = false;
    this.phase = this.active ? 'scripted pilot flying' : 'you have control';
    this.stalledFor = 0;
    this.integral = 0;
  }

  // The player pressed a flight key: hand back control at once.
  cancel() {
    if (!this.active) return;
    this.active = false;
    this.cancelled = true;
    this.phase = 'you have control (you took over)';
  }

  finish(input) {
    this.active = false;
    input.pull = 0;
    input.roll = 0;
    input.yaw = 0;
    this.phase = 'you have control';
  }

  // Overwrite the stick and rudder (never the physics) for this step.
  apply(input, dt) {
    if (!this.active) return;
    this.t += dt;
    const sim = this.sim;
    const a = attitude(sim.state);
    const p = sim.state.angularVelocity.x;
    const holdBank = (target) => clamp(2.5 * (target - a.bank) - 0.8 * p);

    switch (this.id) {
      case 'full': {
        // Wings level and height held, so the top speed can be read.
        const vy = sim.state.velocity.y;
        this.integral = clamp(this.integral - 0.02 * vy * dt, -0.3, 0.3);
        input.roll = holdBank(0);
        input.pull = clamp(this.integral - 0.03 * vy - 0.002 * (sim.state.position.y - this.altitude), -0.3, 0.3);
        input.yaw = 0;
        if (this.t > 60) this.finish(input);
        break;
      }
      case 'stall': {
        input.pull = this.t > 0.5 ? 1 : 0;
        input.roll = 0;
        input.yaw = 0;
        if (sim.diag && sim.diag.stall > 0.9) this.stalledFor += dt;
        if (this.stalledFor >= 1 || this.t > 8) this.finish(input);
        break;
      }
      case 'turnLeft':
      case 'turnRight': {
        const side = this.id === 'turnRight' ? 1 : -1;
        input.roll = holdBank((side * 60 * Math.PI) / 180);
        input.pull = 0.2;
        input.yaw = clamp(3 * (sim.diag ? sim.diag.beta : 0));
        if (this.t > 30) this.finish(input);
        break;
      }
      case 'spin': {
        input.pull = this.t > 0.5 ? 1 : 0;
        input.yaw = this.t > 3 ? -1 : 0;
        input.roll = 0;
        if (this.t > 11) this.finish(input);
        break;
      }
      default:
        this.finish(input);
    }
  }
}
