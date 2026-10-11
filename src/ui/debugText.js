// Builds the lines of the F3 debug overlay from a physics diagnostic record.
// Kept free of the DOM so it can be tested.

import { toMph, toKmh, toFeet, toDegrees } from './units.js';

const fixed = (v, n = 0) => (Number.isFinite(v) ? v.toFixed(n) : '--');

export function debugLines(aircraft, diag, flags = {}) {
  const lines = [`${aircraft.name}`];
  if (flags.crashed) lines.push('CRASHED - press R to restart');
  if (flags.paused) lines.push('PAUSED');
  if (!diag) return lines;
  lines.push(
    `airspeed  ${fixed(toMph(diag.speed))} mph  ${fixed(toKmh(diag.speed))} km/h`,
    `altitude  ${fixed(diag.altitude)} m  ${fixed(toFeet(diag.altitude))} ft`,
    `AoA       ${fixed(toDegrees(diag.alpha), 1)} deg`,
    `sideslip  ${fixed(toDegrees(diag.beta), 1)} deg`,
    `g-load    ${fixed(diag.loadFactor, 2)} g`,
    `thrust    ${fixed(diag.thrust)} N`,
    `lift      ${fixed(diag.lift)} N`,
    `drag      ${fixed(diag.drag)} N`,
    `engine    ${fixed(diag.rpm)} rpm  ${fixed(diag.power / 1000)} kW`,
    `stall     ${fixed(diag.stall * 100)} %${diag.stall > 0.5 ? '  STALLED' : ''}`,
  );
  return lines;
}
