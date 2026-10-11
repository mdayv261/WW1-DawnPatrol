// Works out each aircraft's zero-lift drag coefficient (CD0) from its
// calibration speed: the one sourced top speed marked `calibration: true` in
// src/aircraft/validationCases.js, flown at that source's mass, power and
// altitude. Prints the values to copy into the aircraft data files.
// Usage: npm run calibrate

import { AIRCRAFT, common } from '../src/aircraft/index.js';
import { VALIDATION_CASES } from '../src/aircraft/validationCases.js';
import { topSpeed, withConditions } from '../src/physics/performance.js';

for (const c of VALIDATION_CASES) {
  const check = c.checks.find((k) => k.calibration);
  if (!check) continue;
  const ac = withConditions(structuredClone(AIRCRAFT[c.aircraft]), c.conditions);
  let lo = 0.01;
  let hi = 0.12;
  for (let i = 0; i < 40; i++) {
    const mid = 0.5 * (lo + hi);
    ac.aero = { ...ac.aero, cd0: mid }; // new object so cached values are not reused
    const v = topSpeed(structuredClone(ac), common, check.altitude);
    if (v > check.value) lo = mid;
    else hi = mid;
  }
  const cd0 = 0.5 * (lo + hi);
  console.log(`${c.aircraft.padEnd(9)} CD0 = ${cd0.toFixed(4)}  (${c.id}: ${check.value.toFixed(2)} m/s at ${check.altitude.toFixed(0)} m)`);
}
