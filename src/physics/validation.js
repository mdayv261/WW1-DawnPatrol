// Runs the sourced validation cases (src/aircraft/validationCases.js)
// through the performance model. Shared by the test and the report script.

import { VALIDATION_CASES, TOLERANCE } from '../aircraft/validationCases.js';
import { withConditions, topSpeed, climbProfile, bestClimb, ceilingFrom, timeToClimb, SERVICE_CEILING_RATE } from './performance.js';

// Unique key for one check, e.g. "climbTime@3048".
export const checkKey = (check) => `${check.type}${check.altitude !== undefined ? `@${Math.round(check.altitude)}` : ''}`;

export const CHECK_LABEL = (check) => {
  const alt = check.altitude !== undefined ? ` at ${Math.round(check.altitude)} m` : '';
  return {
    topSpeed: `Top speed${alt}`,
    climbTime: `Climb to ${Math.round(check.altitude)} m`,
    climbRate: `Climb rate${alt}`,
    serviceCeiling: 'Service ceiling',
    absoluteCeiling: 'Absolute ceiling',
  }[check.type];
};

export function formatValue(type, v) {
  if (!Number.isFinite(v)) return 'n/a';
  if (type === 'topSpeed') return `${v.toFixed(1)} m/s (${(v * 2.236936).toFixed(0)} mph)`;
  if (type === 'climbTime') {
    const s = Math.round(v);
    return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
  }
  if (type === 'climbRate') return `${v.toFixed(2)} m/s`;
  return `${v.toFixed(0)} m`;
}

export function simulateCheck(ac, cm, check, profile) {
  switch (check.type) {
    case 'topSpeed':
      return topSpeed(ac, cm, check.altitude);
    case 'climbRate':
      return bestClimb(ac, cm, check.altitude).rate;
    case 'climbTime':
      return timeToClimb(profile(), check.altitude);
    case 'serviceCeiling':
      return ceilingFrom(profile(), SERVICE_CEILING_RATE);
    case 'absoluteCeiling':
      return ceilingFrom(profile(), 0);
    default:
      throw new Error(`unknown check ${check.type}`);
  }
}

// Returns one result per check: { case, check, key, simulated, diff, tolerance, pass }.
export function runValidation(aircraftById, cm, cases = VALIDATION_CASES) {
  const results = [];
  for (const c of cases) {
    const ac = withConditions(aircraftById[c.aircraft], c.conditions);
    let cached = null;
    const profile = () => (cached ??= climbProfile(ac, cm));
    for (const check of c.checks) {
      const simulated = simulateCheck(ac, cm, check, profile);
      const diff = simulated / check.value - 1;
      const tolerance = TOLERANCE[check.type];
      results.push({ case: c, check, key: checkKey(check), simulated, diff, tolerance, pass: Math.abs(diff) <= tolerance });
    }
  }
  return results;
}

// The results as the Markdown tables `npm run validate` prints: one table per aircraft, one
// row per check. aircraftById: for the aircraft names. Starts with a blank line.
export function validationReport(results, aircraftById) {
  const lines = [];
  let current = null;
  for (const r of results) {
    if (r.case.aircraft !== current) {
      current = r.case.aircraft;
      lines.push(`\n## ${aircraftById[current].name}\n`);
      lines.push('| Case (source) | Quantity | Sourced | Simulated | Diff | Tolerance | Result |');
      lines.push('|---|---|---|---|---|---|---|');
    }
    const diff = Number.isFinite(r.diff) ? `${r.diff >= 0 ? '+' : ''}${(r.diff * 100).toFixed(1)}%` : 'n/a';
    const result = r.check.calibration ? 'calibration' : r.pass ? 'pass' : r.case.deviations?.[r.key] ? 'KNOWN DEVIATION' : 'FAIL';
    lines.push(
      `| ${r.case.id} (${r.case.source}) | ${CHECK_LABEL(r.check)} | ${formatValue(r.check.type, r.check.value)} | ${formatValue(r.check.type, r.simulated)} | ${diff} | ±${(r.tolerance * 100).toFixed(0)}% | ${result} |`,
    );
  }
  return lines.join('\n');
}
