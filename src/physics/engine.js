// Engine and propeller: power vs throttle and altitude, thrust vs airspeed,
// and the rotating-engine effects (reaction torque and angular momentum).

import { ISA } from '../core/constants.js';

// Power produced (W). Falls with air density (an estimate, see
// docs/AIRCRAFT_DATA.md "Common flight-model parameters").
export function enginePower(ac, common, throttle, density) {
  const t = Math.min(1, Math.max(0, throttle));
  const fraction = common.idlePowerFraction + (1 - common.idlePowerFraction) * t;
  return ac.engine.ratedPower * fraction * (density / ISA.RHO0);
}

// Crankshaft speed in rad/s.
export function engineOmega(ac, common, throttle) {
  const t = Math.min(1, Math.max(0, throttle));
  const fraction = common.idleRpmFraction + (1 - common.idleRpmFraction) * t;
  return ((ac.engine.ratedRpm * fraction) / 60) * 2 * Math.PI;
}

// Propeller thrust (N) from shaft power and airspeed. Efficiency peaks near
// the design speed; at low speed thrust is limited by the static (momentum
// theory) value. The two limits are joined smoothly.
export function propellerThrust(ac, common, power, speed, density) {
  if (power <= 0) return 0;
  const designSpeed = common.propDesignSpeedFraction * ac.documented.maxSpeed;
  const x = (speed - designSpeed) / (1.1 * designSpeed);
  const efficiency = Math.max(0.05, common.propEfficiencyPeak * (1 - x * x));
  const dynamicLimit = (efficiency * power) / Math.max(speed, 0.5);

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
