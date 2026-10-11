// Wing aerodynamics: lift and drag from angle of attack (with post-stall
// behaviour) and the stability/control moments.
//
// Inside this file we use the usual aeroplane axes (x forward, y right,
// z down) for angles and coefficients: alpha is positive with the nose above
// the wind, beta is positive when the wind comes from the right, roll is
// positive right-wing-down, yaw is positive nose-right. flightModel.js
// converts to the game's body axes.

import { FLAT_PLATE_CD, SECTION_LIFT_SLOPE } from '../core/constants.js';

const cache = new WeakMap();

// Quantities worked out once per aircraft from its data.
export function wingConstants(ac) {
  let c = cache.get(ac);
  if (c) return c;
  const { wingArea: S, wingspan: b } = ac.geometry;
  const aspectRatio = (b * b) / S;
  const { oswald, clMax } = ac.aero;
  // Prandtl finite-wing lift slope, per radian.
  const clAlpha = SECTION_LIFT_SLOPE / (1 + SECTION_LIFT_SLOPE / (Math.PI * oswald * aspectRatio));
  c = {
    S,
    b,
    chord: S / b,
    aspectRatio,
    clAlpha,
    inducedK: 1 / (Math.PI * oswald * aspectRatio),
    stallAngle: clMax / clAlpha, // measured from the zero-lift angle
  };
  cache.set(ac, c);
  return c;
}

// 0 = flying normally, 1 = fully stalled. A smooth step at the stall angle.
export function stallFraction(ac, common, alpha) {
  const { stallAngle } = wingConstants(ac);
  const x = (Math.abs(alpha - common.alphaZeroLift) - stallAngle) / common.stallWidth;
  return 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, x))));
}

// Lift and drag coefficients at angle of attack alpha (radians).
// Returns { cl, cd, stall }.
export function liftDrag(ac, common, alpha) {
  const w = wingConstants(ac);
  const f = stallFraction(ac, common, alpha);
  const clAttached = w.clAlpha * (alpha - common.alphaZeroLift);
  const sin = Math.sin(alpha);
  const clStalled = 2 * sin * Math.cos(alpha); // flat plate
  const cl = (1 - f) * clAttached + f * clStalled;
  const cd =
    ac.aero.cd0 + (1 - f) * w.inducedK * clAttached * clAttached + f * FLAT_PLATE_CD * sin * sin;
  return { cl, cd, stall: f };
}

// Side-force coefficient from sideslip.
export function sideForce(common, beta) {
  return common.cyBeta * beta;
}

// Moment coefficients about the centre of mass.
//   rates: roll p, pitch q, yaw r (aeroplane axes, rad/s)
//   defl:  pull, roll, yaw deflections (rad)
// Returns { roll, pitch, yaw } coefficients (the roll and yaw ones use the
// span, the pitch one the mean chord).
export function momentCoefficients(ac, common, { alpha, beta, speed, rates, defl, stall }) {
  const w = wingConstants(ac);
  const v2 = 2 * Math.max(speed, 1);
  const p = (rates.p * w.b) / v2;
  const q = (rates.q * w.chord) / v2;
  const r = (rates.r * w.b) / v2;

  // Stalled wings stop damping roll and drive it instead (autorotation).
  // The driving term fades at high roll rate so the spin settles to a
  // steady rate instead of growing without limit.
  const pm = common.autorotationRate;
  const rollDamping = common.clP * p;
  const autorotation = stall * (1 + common.autorotationGain) * -common.clP * (p - (p * p * p) / (pm * pm));
  const clBeta = common.clBeta * (1 - common.stallDihedralFlip * stall);
  const cnR = common.cnR * (1 - common.stallYawDampingLoss * stall);

  const cmAlpha = -wingConstants(ac).clAlpha * ac.aero.staticMargin;
  return {
    roll: clBeta * beta + rollDamping + autorotation + common.stallWingDropBias * stall + common.clR * r + common.clDeltaRoll * defl.roll,
    pitch:
      (cmAlpha - common.stallNoseDown * stall) * Math.sin(alpha) +
      common.cmQ * q +
      common.cmDeltaPull * (1 - common.stallElevatorLoss * stall) * defl.pull,
    yaw: ac.aero.cnBeta * beta + cnR * r + common.stallRollYaw * stall * p + common.cnDeltaYaw * defl.yaw + common.cnDeltaRoll * defl.roll,
  };
}
