// Scripted "pilots" for the physics tests. Every run is deterministic: the
// same inputs always give the same result.

import { Vector3 } from 'three';
import { advance, evaluate } from '../../src/physics/flightModel.js';
import { trimLevel } from '../../src/physics/trim.js';
import { createInput } from '../../src/physics/controls.js';
import { common } from '../../src/aircraft/index.js';

export const DT = 1 / 120;
export const DEG = 180 / Math.PI;

// Pitch, bank (right wing down positive) and heading of the aircraft, radians.
export function attitude(state) {
  const forward = new Vector3(1, 0, 0).applyQuaternion(state.quaternion);
  const right = new Vector3(0, 0, 1).applyQuaternion(state.quaternion);
  return {
    pitch: Math.asin(forward.y),
    bank: Math.asin(-right.y),
    heading: Math.atan2(forward.x, -forward.z),
  };
}

// Start in trimmed level flight at a given fraction of the documented top speed.
export function startTrimmed(ac, altitude, speedFraction = 0.8) {
  const trim = trimLevel(ac, common, altitude, speedFraction * ac.documented.maxSpeed);
  const input = createInput();
  input.trim = trim.surfaces.trim;
  input.throttle = trim.surfaces.throttle;
  return { state: trim.state, surfaces: trim.surfaces, input, trim };
}

// Fly with the same bank angle and the same stick-back amount for `seconds`.
// side = +1 right turn, -1 left. Rudder is either held at zero or coordinated.
export function holdBankTurn(ac, { side, pull, seconds = 6, bank = 60, altitude = 2000, coordinate = true }) {
  const { state, surfaces, input } = startTrimmed(ac, altitude, 0.85);
  input.throttle = 1;
  input.pull = pull;
  const target = (side * bank) / DEG;
  let previous = attitude(state).heading;
  let turned = 0;
  let turnedLastTwo = 0;
  let diag;
  for (let i = 0; i < seconds / DT; i++) {
    const a = attitude(state);
    input.roll = Math.max(-1, Math.min(1, 2.5 * (target - a.bank) - 0.8 * state.angularVelocity.x));
    if (coordinate) {
      const beta = evaluate(ac, common, state, surfaces).diag.beta;
      input.yaw = Math.max(-1, Math.min(1, 3 * beta));
    }
    diag = advance(ac, common, state, surfaces, input, DT);
    let d = attitude(state).heading - previous;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    previous = attitude(state).heading;
    turned += d;
    if (i >= (seconds - 2) / DT) turnedLastTwo += d;
  }
  return {
    turnRate: (turnedLastTwo / 2) * DEG * side, // deg/s, positive in the commanded direction
    turned: turned * DEG * side,
    pitch: attitude(state).pitch * DEG,
    speed: diag.speed,
    loadFactor: diag.loadFactor,
  };
}

// Idle, full back stick from 1 s, optional rudder from 2.5 s (rudder: +1 right,
// -1 left). If recoverAt is set, from then on: opposite rudder and the stick
// moved forward by `forward`, and optionally the throttle opened and the
// wings levelled. Returns the state at the end.
export function stallAndSpin(
  ac,
  { rudder = 0, recoverAt = Infinity, forward = 0.3, seconds = 16, recoverThrottle = 0, levelWings = false, windowFrom = Infinity, rudderHold = Infinity, easeOff = false },
) {
  const { state, surfaces, input } = startTrimmed(ac, 3500, 0.8);
  const trimPull = input.pull;
  let flying = false; // easeOff: once the wing flies again, the stick goes back to the trimmed position
  input.throttle = 0;
  // minYaw / maxYaw / minStall are tracked from `windowFrom` seconds on, to
  // tell a steady spin from a passing one.
  const log = { maxBank: 0, firstStall: null, bankAtMax: 0, minYaw: Infinity, maxYaw: 0, minStall: 1 };
  let diag;
  for (let i = 0; i < seconds / DT; i++) {
    const t = i * DT;
    if (t < recoverAt) {
      input.pull = t < 1 ? 0 : 1;
      input.yaw = t > 2.5 ? rudder : 0;
    } else {
      if (easeOff && diag.stall < 0.2) flying = true;
      input.pull = flying ? trimPull : -forward;
      // Opposite rudder for `rudderHold` seconds, then centred (Infinity =
      // held throughout). The 1918 RAE trials (S33) recovered in about 3 s
      // and found that rudder left across could start a spin the other way.
      input.yaw = t - recoverAt < rudderHold ? -rudder : 0;
      input.throttle = recoverThrottle;
      if (levelWings) {
        const bank = attitude(state).bank;
        input.roll = Math.max(-1, Math.min(1, -2 * bank - 0.5 * state.angularVelocity.x));
      }
    }
    diag = advance(ac, common, state, surfaces, input, DT);
    const bank = attitude(state).bank;
    if (Math.abs(bank) > log.maxBank) {
      log.maxBank = Math.abs(bank);
      log.bankAtMax = bank;
    }
    if (log.firstStall === null && diag.stall > 0.9) log.firstStall = t;
    if (t >= windowFrom) {
      const yaw = Math.abs(state.angularVelocity.y);
      log.minYaw = Math.min(log.minYaw, yaw);
      log.maxYaw = Math.max(log.maxYaw, yaw);
      log.minStall = Math.min(log.minStall, diag.stall);
    }
  }
  return {
    ...log,
    yawRate: -state.angularVelocity.y, // positive = nose turning right
    stall: diag.stall,
    speed: diag.speed,
    state,
  };
}
