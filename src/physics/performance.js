// Steady-state performance of an aircraft from the flight model: top speed,
// stall speed, climb rate, time to climb and ceilings. Used by the
// validation tests and report, and later by the AI and UI.
//
// Method (classic excess-power): at each speed, find the angle of attack
// that holds level flight at full throttle; the spare thrust times speed,
// divided by weight, is the steady climb rate. No pilot, no acceleration.

import { levelState } from './trim.js';
import { evaluate } from './flightModel.js';
import { createSurfaces } from './controls.js';
import { atmosphere } from './atmosphere.js';
import { liftDrag, wingConstants } from './aero.js';
import { G } from '../core/constants.js';

export const SERVICE_CEILING_RATE = 0.508; // m/s, 100 ft/min

// Copy of an aircraft at other conditions: { mass (kg), power (W) }.
// Inertia scales with mass so handling stays comparable.
export function withConditions(ac, { mass, power } = {}) {
  if (mass === undefined && power === undefined) return ac;
  const v = structuredClone(ac);
  if (mass !== undefined) {
    const k = mass / ac.mass.loaded;
    v.mass = { ...ac.mass, loaded: mass, ixx: ac.mass.ixx * k, iyy: ac.mass.iyy * k, izz: ac.mass.izz * k };
  }
  if (power !== undefined) v.engine.ratedPower = power;
  return v;
}

// Full-throttle level flight at a speed: the angle of attack that balances
// weight, and the spare force along the flight path. null if the wing cannot
// carry the weight at this speed.
function levelAtFullThrottle(ac, cm, altitude, speed) {
  const w = wingConstants(ac, cm);
  const surfaces = createSurfaces();
  surfaces.throttle = 1;
  const vertical = (alpha) => evaluate(ac, cm, levelState(altitude, speed, alpha), surfaces).force.y;
  let lo = cm.alphaZeroLift;
  let hi = cm.alphaZeroLift + w.stallAngle;
  if (vertical(hi) < 0 || vertical(lo) > 0) return null;
  for (let i = 0; i < 40; i++) {
    const mid = 0.5 * (lo + hi);
    if (vertical(mid) > 0) hi = mid;
    else lo = mid;
  }
  const alpha = 0.5 * (lo + hi);
  // Forward is -Z in levelState, so spare forward force is -force.z.
  const spare = -evaluate(ac, cm, levelState(altitude, speed, alpha), surfaces).force.z;
  return { alpha, spare };
}

// Steady climb rate (m/s) at a speed and altitude; -Infinity if level
// flight cannot be held there.
export function climbRateAt(ac, cm, altitude, speed) {
  const r = levelAtFullThrottle(ac, cm, altitude, speed);
  return r ? (r.spare * speed) / (ac.mass.loaded * G) : -Infinity;
}

// 1 g stall speed (m/s): the speed at which the wing's peak lift equals weight.
export function stallSpeed(ac, cm, altitude = 0) {
  let clPeak = 0;
  for (let a = -0.2; a < 0.8; a += 0.0005) clPeak = Math.max(clPeak, liftDrag(ac, cm, a).cl);
  const rho = atmosphere(altitude).density;
  return Math.sqrt((2 * ac.mass.loaded * G) / (rho * ac.geometry.wingArea * clPeak));
}

// Best climb rate at an altitude (golden-section search over speed).
export function bestClimb(ac, cm, altitude) {
  let a = 1.02 * stallSpeed(ac, cm, altitude);
  let b = Math.max(a + 1, 1.3 * ac.documented.maxSpeed);
  const k = (Math.sqrt(5) - 1) / 2;
  let c = b - k * (b - a);
  let d = a + k * (b - a);
  let fc = climbRateAt(ac, cm, altitude, c);
  let fd = climbRateAt(ac, cm, altitude, d);
  for (let i = 0; i < 30; i++) {
    if (fc > fd) {
      b = d; d = c; fd = fc;
      c = b - k * (b - a); fc = climbRateAt(ac, cm, altitude, c);
    } else {
      a = c; c = d; fc = fd;
      d = a + k * (b - a); fd = climbRateAt(ac, cm, altitude, d);
    }
  }
  return fc > fd ? { rate: fc, speed: c } : { rate: fd, speed: d };
}

// Level top speed (m/s) at full throttle: the fast side where spare thrust
// reaches zero. NaN if the aircraft cannot hold level flight at all.
export function topSpeed(ac, cm, altitude) {
  const best = bestClimb(ac, cm, altitude);
  if (!(best.rate > 0)) return NaN;
  let lo = best.speed;
  let hi = 2 * ac.documented.maxSpeed;
  for (let i = 0; i < 40; i++) {
    const mid = 0.5 * (lo + hi);
    if (climbRateAt(ac, cm, altitude, mid) > 0) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

// Best climb rate at each altitude from sea level until it stops climbing.
export function climbProfile(ac, cm, { step = 250, maxAltitude = 9000 } = {}) {
  const rows = [];
  for (let h = 0; h <= maxAltitude; h += step) {
    const r = bestClimb(ac, cm, h).rate;
    rows.push([h, Number.isFinite(r) ? r : -1]);
    if (r <= 0) break;
  }
  return rows;
}

// Altitude where the climb rate falls to `rate` (linear interpolation).
export function ceilingFrom(profile, rate) {
  for (let i = 1; i < profile.length; i++) {
    const [h0, r0] = profile[i - 1];
    const [h1, r1] = profile[i];
    if (r0 >= rate && r1 < rate) return h0 + ((r0 - rate) / (r0 - r1)) * (h1 - h0);
  }
  return NaN;
}

// Seconds to climb from sea level to `altitude` (integral of dh / rate).
export function timeToClimb(profile, altitude) {
  let t = 0;
  for (let i = 1; i < profile.length; i++) {
    const [h0, r0] = profile[i - 1];
    const [h1, r1] = profile[i];
    if (h0 >= altitude) break;
    const top = Math.min(h1, altitude);
    const rTop = r0 + ((r1 - r0) * (top - h0)) / (h1 - h0);
    if (r0 <= 0 || rTop <= 0) return Infinity;
    t += ((top - h0) * (1 / r0 + 1 / rTop)) / 2;
  }
  const last = profile[profile.length - 1][0];
  return last >= altitude ? t : Infinity;
}
