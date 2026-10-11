// Engine and propeller: power vs throttle and altitude, thrust vs airspeed,
// and the rotating-engine effects (reaction torque and angular momentum).

import { ISA, ENGINE_LAPSE, PROPELLER_EFFICIENCY } from '../core/constants.js';

// Fraction of sea-level power an unsupercharged engine gives at a given air
// density (Virginia Tech AOE 3104 notes, eq. 2: A*sigma - B).
export function altitudePowerFactor(density) {
  const sigma = density / ISA.RHO0;
  return Math.max(0, ENGINE_LAPSE.A * sigma - ENGINE_LAPSE.B);
}

// Power produced (W) at a throttle setting and air density.
export function enginePower(ac, common, throttle, density) {
  const t = Math.min(1, Math.max(0, throttle));
  const fraction = common.idlePowerFraction + (1 - common.idlePowerFraction) * t;
  return ac.engine.ratedPower * fraction * altitudePowerFactor(density);
}

// Crankshaft speed in rad/s.
export function engineOmega(ac, common, throttle) {
  const t = Math.min(1, Math.max(0, throttle));
  const fraction = common.idleRpmFraction + (1 - common.idleRpmFraction) * t;
  return ((ac.engine.ratedRpm * fraction) / 60) * 2 * Math.PI;
}

// Look up the measured efficiency curve (Durand and Lesley, NACA Report 30)
// at advance ratio j. Below the table it falls linearly to zero at j = 0;
// above it, it continues along the last measured slope (never below zero).
function curveEfficiency(j) {
  const { J, ETA } = PROPELLER_EFFICIENCY;
  if (j <= J[0]) return Math.max(0, (ETA[0] * j) / J[0]);
  const last = J.length - 1;
  if (j >= J[last]) {
    const slope = (ETA[last] - ETA[last - 1]) / (J[last] - J[last - 1]);
    return Math.max(0, ETA[last] + slope * (j - J[last]));
  }
  let i = 1;
  while (J[i] < j) i++;
  const f = (j - J[i - 1]) / (J[i] - J[i - 1]);
  return ETA[i - 1] + f * (ETA[i] - ETA[i - 1]);
}

// Propeller revolutions per second at a throttle setting.
export function propellerRevs(ac, common, throttle) {
  return (engineOmega(ac, common, throttle) / (2 * Math.PI)) * ac.propeller.gearRatio;
}

// Propeller efficiency at an airspeed and throttle. The aircraft's
// fixed-pitch propeller is assumed to have the measured curve's shape, with
// its best efficiency at propDesignSpeedFraction of the documented top speed
// (at rated rpm), so the advance ratio is scaled onto the curve.
export function propellerEfficiency(ac, common, speed, throttle = 1) {
  const D = ac.propeller.diameter;
  const j = Math.max(0, speed) / (propellerRevs(ac, common, throttle) * D);
  const designJ = (common.propDesignSpeedFraction * ac.documented.maxSpeed) / (propellerRevs(ac, common, 1) * D);
  return curveEfficiency((j * PROPELLER_EFFICIENCY.PEAK_J) / designJ);
}

// Propeller thrust (N) from shaft power and airspeed. At speed it is
// efficiency x power / speed; at low speed it is limited by the static
// (momentum theory) value. The two limits are joined smoothly.
export function propellerThrust(ac, common, power, speed, density, throttle = 1) {
  if (power <= 0) return 0;
  // Efficiency tends to zero with speed, but efficiency / speed stays finite,
  // so both are taken at a small minimum speed; the static limit takes over.
  const v = Math.max(speed, 0.5);
  const efficiency = propellerEfficiency(ac, common, v, throttle);
  const dynamicLimit = (efficiency * power) / v;
  if (dynamicLimit <= 0) return 0;

  const area = (Math.PI * ac.propeller.diameter * ac.propeller.diameter) / 4;
  const staticLimit =
    Math.cbrt(2 * density * area) * Math.pow(common.propStaticMerit * power, 2 / 3);

  const n = 4; // smooth minimum of the two limits
  return Math.pow(Math.pow(dynamicLimit, -n) + Math.pow(staticLimit, -n), -1 / n);
}

// Spinning-engine effects, body axes (+X = nose). Only rotary engines have a
// large rotating mass; inline engines return zeros (Phase 1 simplification,
// see docs/DECISIONS.md).
//   momentum: angular momentum of the spinning engine (kg m^2/s)
//   torque:   reaction torque on the airframe about the nose axis (N m).
//             Positive X torque rolls the right wing down.
export function rotaryEffects(ac, common, throttle, power) {
  if (ac.engine.kind !== 'rotary') return { momentum: 0, torque: 0 };
  const omega = engineOmega(ac, common, throttle);
  const sign = ac.engine.rotationSign;
  return {
    momentum: sign * ac.engine.rotatingInertia * omega,
    torque: -sign * (power / omega),
  };
}

// Constant roll moment from the way the airframe is rigged (wing settings
// chosen to cancel most of the engine torque at cruise power). It opposes the
// reaction torque. Zero for inline engines.
export function torqueRigging(ac, common) {
  if (ac.engine.kind !== 'rotary') return 0;
  const throttle = 0.6;
  const power = enginePower(ac, common, throttle, ISA.RHO0);
  const omega = engineOmega(ac, common, throttle);
  return common.torqueRigging * ac.engine.rotationSign * (power / omega);
}

// Yaw moment (N m, nose right positive) from the fin's rigged offset. An
// offset fin is a small wing, so its moment grows with the dynamic pressure
// at the tail (free stream plus propwash). It is sized to cancel the same
// fraction (common.torqueRigging) of the slipstream swirl at 60% throttle
// and cruise speed (80% of top speed, sea level) as torqueRigging cancels of
// the engine torque. tailPressure: dynamic pressure at the tail now (Pa).
const finCache = new WeakMap();
export function finRigging(ac, common, tailPressure) {
  let ref = finCache.get(ac);
  if (!ref) {
    const throttle = 0.6;
    const speed = 0.8 * ac.documented.maxSpeed;
    const power = enginePower(ac, common, throttle, ISA.RHO0);
    const omegaProp = engineOmega(ac, common, throttle) * ac.propeller.gearRatio;
    const thrust = propellerThrust(ac, common, power, speed, ISA.RHO0, throttle);
    const area = (Math.PI * ac.propeller.diameter * ac.propeller.diameter) / 4;
    const pressure = 0.5 * ISA.RHO0 * speed * speed + (common.tailWashFraction * thrust) / area;
    const moment = common.torqueRigging * ac.engine.rotationSign * common.swirlYaw * (power / omegaProp);
    ref = { pressure, moment };
    finCache.set(ac, ref);
  }
  return (ref.moment * tailPressure) / ref.pressure;
}
