// Wing aerodynamics: lift and drag from angle of attack (with post-stall
// behaviour) and the stability/control moments.
//
// Inside this file we use the usual aeroplane axes (x forward, y right,
// z down) for angles and coefficients: alpha is positive with the nose above
// the wind, beta is positive when the wind comes from the right, roll is
// positive right-wing-down, yaw is positive nose-right. flightModel.js
// converts to the game's body axes.

import { FLAT_PLATE_CD, SECTION_LIFT_SLOPE } from '../core/constants.js';
import { common as defaultCommon } from '../aircraft/common.js';
import { multiplaneKappa } from './multiplane.js';

// Cache per aircraft, then per set of common parameters.
const cache = new WeakMap();

// Lift curve before the stall is blended in: attached-flow line, then the
// flat-plate curve, mixed by a smooth step centred stallCentre past the
// zero-lift angle. Returns the highest lift coefficient the blend reaches.
function peakLift(clAlpha, stallCentre, cm) {
  let best = 0;
  const a0 = cm.alphaZeroLift;
  for (let a = a0; a <= a0 + stallCentre + 0.3; a += 0.0005) {
    const x = Math.max(-40, Math.min(40, (a - a0 - stallCentre) / cm.stallWidth));
    const f = 1 / (1 + Math.exp(-x));
    best = Math.max(best, (1 - f) * clAlpha * (a - a0) + f * 2 * Math.sin(a) * Math.cos(a));
  }
  return best;
}

// The smooth stall starts cutting lift a little before its centre, so the
// centre is placed (by bisection) where the curve's PEAK equals CLmax.
function calibratedStallCentre(clAlpha, clMax, cm) {
  let lo = clMax / clAlpha;
  let hi = lo + 0.3;
  for (let i = 0; i < 40; i++) {
    const mid = 0.5 * (lo + hi);
    if (peakLift(clAlpha, mid, cm) < clMax) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

// Quantities worked out once per aircraft from its data.
export function wingConstants(ac, cm = defaultCommon) {
  let byCommon = cache.get(ac);
  if (!byCommon) {
    byCommon = new WeakMap();
    cache.set(ac, byCommon);
  }
  let c = byCommon.get(cm);
  if (c) return c;
  const { wingArea: S, wingspan: b } = ac.geometry;
  const aspectRatio = (b * b) / S;
  const { oswald, clMax } = ac.aero;
  // Stacked wings interfere less than one wing of the upper span (Prandtl,
  // NACA TN-182): kappa < 1 scales induced effects down. Applied to both the
  // induced drag and the lift slope so the two stay consistent.
  const kappa = ac.wingStack ? multiplaneKappa(ac.wingStack) : 1;
  const spanEfficiency = oswald / kappa;
  // Prandtl finite-wing lift slope, per radian.
  const clAlpha = SECTION_LIFT_SLOPE / (1 + SECTION_LIFT_SLOPE / (Math.PI * spanEfficiency * aspectRatio));
  c = {
    S,
    b,
    chord: S / b,
    aspectRatio,
    kappa,
    clAlpha,
    inducedK: 1 / (Math.PI * spanEfficiency * aspectRatio),
    stallAngle: calibratedStallCentre(clAlpha, clMax, cm), // from the zero-lift angle
  };
  byCommon.set(cm, c);
  return c;
}

// 0 = flying normally, 1 = fully stalled. A smooth step at the stall angle.
export function stallFraction(ac, common, alpha) {
  const { stallAngle } = wingConstants(ac, common);
  const x = (Math.abs(alpha - common.alphaZeroLift) - stallAngle) / common.stallWidth;
  return 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, x))));
}

// Lift and drag coefficients at angle of attack alpha (radians).
// Returns { cl, cd, stall }.
export function liftDrag(ac, common, alpha) {
  const w = wingConstants(ac, common);
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
  const w = wingConstants(ac, common);
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

  const cmAlpha = -w.clAlpha * ac.aero.staticMargin;
  return {
    roll: clBeta * beta + rollDamping + autorotation + common.stallWingDropBias * stall + common.clR * r + common.clDeltaRoll * defl.roll,
    pitch:
      (cmAlpha - common.stallNoseDown * stall) * Math.sin(alpha) +
      common.cmQ * q +
      common.cmDeltaPull * (1 - common.stallElevatorLoss * stall) * defl.pull,
    yaw: ac.aero.cnBeta * beta + cnR * r + common.stallRollYaw * stall * p + common.cnDeltaYaw * defl.yaw + common.cnDeltaRoll * defl.roll,
  };
}
