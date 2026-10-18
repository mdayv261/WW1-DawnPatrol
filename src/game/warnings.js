// The optional warnings (Options screen): stall, G and overspeed. Worked out from the flight
// model's diagnostics against each aircraft's own limits: the wing's stall angle (aero.js) and
// the structure's limit load and never-exceed speed (the same figures the structural damage
// uses, physics/damage.js). Pure (tested); session.js shows and sounds them.

import { WARNINGS as W } from '../aircraft/assists.js';
import { DAMAGE } from '../aircraft/damageModel.js';
import { wingConstants } from '../physics/aero.js';
import { structureLimits } from '../physics/damage.js';

// The load factor at which the wings start to be damaged (the ultimate load over the safety factor).
export const limitLoad = (ac) => structureLimits(ac).ultimateLoad / DAMAGE.safetyFactor;

// Which warnings are on now. diag: the flight model's diagnostics; on: { stall, g } (the
// options); structure: structural damage switched on. Returns
// { stall: boolean, load: null | 'caution' | 'over', speed: null | 'caution' | 'over' }.
export function warnings(ac, common, diag, on, structure = true) {
  const out = { stall: false, load: null, speed: null, structure };
  if (!diag) return out;
  if (on.stall && !diag.onGround && diag.speed > W.minSpeed) {
    const { stallAngle } = wingConstants(ac, common);
    out.stall = Math.abs(diag.alpha - common.alphaZeroLift) >= stallAngle - W.stallMargin;
  }
  if (on.g) {
    const load = Math.abs(diag.loadFactor);
    const limit = limitLoad(ac);
    out.load = load > limit ? 'over' : load >= W.loadCaution * limit ? 'caution' : null;
    const v = diag.speed * Math.sqrt(diag.density); // equivalent airspeed, as the structure feels it
    const vne = structureLimits(ac).neverExceedSpeed; // the weakest part's (a Nieuport's lower wing)
    out.speed = v > vne ? 'over' : v >= W.speedCaution * vne ? 'caution' : null;
  }
  return out;
}

// The lines to show, most urgent first: [{ text, level: 'danger' | 'caution' }].
export function warningLines(w) {
  const lines = [];
  const damage = w.structure ? ': AIRFRAME DAMAGE' : '';
  if (w.load === 'over') lines.push({ text: `OVER G${damage}`, level: 'danger' });
  if (w.speed === 'over') lines.push({ text: `OVERSPEED${damage}`, level: 'danger' });
  if (w.stall) lines.push({ text: 'STALL', level: 'danger' });
  if (w.load === 'caution') lines.push({ text: 'HIGH G', level: 'caution' });
  if (w.speed === 'caution') lines.push({ text: 'HIGH SPEED', level: 'caution' });
  return lines;
}

// The warning sound: 'damage' (a fast buzzer), 'stall' (a pulsing horn) or null. Cautions are
// shown but not sounded.
export function warningSound(w) {
  if (w.load === 'over' || w.speed === 'over') return 'damage';
  if (w.stall) return 'stall';
  return null;
}
