// Trim solver: finds the throttle, angle of attack and elevator trim that
// hold steady level flight at a given speed and altitude. Used to start a
// flight in balance and by the tests.

import { Vector3, Quaternion } from 'three';
import { createState } from './rigidBody.js';
import { createSurfaces } from './controls.js';
import { evaluate } from './flightModel.js';
import { wingConstants } from './aero.js';

const UP = new Vector3(0, 1, 0);
const RIGHT = new Vector3(0, 0, 1);

// Level flight heading north (-Z), pitched nose-up by alpha.
export function levelState(altitude, speed, alpha) {
  const state = createState();
  state.position.set(0, altitude, 0);
  state.velocity.set(0, 0, -speed);
  // Yaw +90 degrees about world Y turns the nose (+X) toward -Z (north)...
  const heading = new Quaternion().setFromAxisAngle(UP, Math.PI / 2);
  // ...then pitch up about the body's right-hand axis.
  const pitch = new Quaternion().setFromAxisAngle(RIGHT, alpha);
  state.quaternion.copy(heading).multiply(pitch);
  return state;
}

function bisect(f, lo, hi, iterations = 40) {
  let flo = f(lo);
  for (let i = 0; i < iterations; i++) {
    const mid = 0.5 * (lo + hi);
    const fm = f(mid);
    if ((fm > 0) === (flo > 0)) {
      lo = mid;
      flo = fm;
    } else {
      hi = mid;
    }
  }
  return 0.5 * (lo + hi);
}

// Returns { state, surfaces, alpha, feasible }. surfaces.trim holds the
// elevator trim. feasible is false if the speed cannot be held (above top
// speed, below stall) or needs more trim than the lever offers.
export function trimLevel(ac, common, altitude, speed) {
  const w = wingConstants(ac);
  const alphaLow = common.alphaZeroLift + 0.01;
  const alphaHigh = common.alphaZeroLift + 0.95 * w.stallAngle;
  const horizontal = new Vector3(0, 0, -1);

  // Throttle that balances thrust and drag along the flight path at this alpha.
  const throttleFor = (alpha) => {
    const state = levelState(altitude, speed, alpha);
    const along = (t) => {
      const surf = createSurfaces();
      surf.throttle = t;
      return evaluate(ac, common, state, surf).force.dot(horizontal);
    };
    if (along(1) < 0) return 1;
    if (along(0) > 0) return 0;
    return bisect(along, 0, 1);
  };

  // Angle of attack where vertical force balances weight.
  const vertical = (alpha) => {
    const t = throttleFor(alpha);
    const state = levelState(altitude, speed, alpha);
    const surf = createSurfaces();
    surf.throttle = t;
    return evaluate(ac, common, state, surf).force.y;
  };
  const feasibleAlpha = vertical(alphaHigh) > 0 && vertical(alphaLow) < 0;
  const alpha = feasibleAlpha ? bisect(vertical, alphaLow, alphaHigh) : alphaHigh;
  const throttle = throttleFor(alpha);

  // Elevator (stick-back fraction) that zeroes the pitching moment.
  const state = levelState(altitude, speed, alpha);
  const pitchMoment = (pull) => {
    const surf = createSurfaces();
    surf.throttle = throttle;
    surf.pull = pull;
    return evaluate(ac, common, state, surf).moment.z;
  };
  const m0 = pitchMoment(0);
  const slope = pitchMoment(0.1) - m0;
  const pullNeeded = -m0 / (slope / 0.1);
  const trim = pullNeeded / common.trimAuthority;

  const surfaces = createSurfaces();
  surfaces.throttle = throttle;
  surfaces.trim = Math.max(-1, Math.min(1, trim));

  const feasible = feasibleAlpha && Math.abs(trim) <= 1 && throttle < 1;
  return { state, surfaces, alpha, feasible };
}
