// Flies every sourced validation case through the flight model and prints
// sourced vs simulated tables (Markdown) with the percentage difference.
// Usage: npm run validate

import { AIRCRAFT, common } from '../src/aircraft/index.js';
import { runValidation, CHECK_LABEL, formatValue } from '../src/physics/validation.js';

const results = runValidation(AIRCRAFT, common);
let current = null;
for (const r of results) {
  if (r.case.aircraft !== current) {
    current = r.case.aircraft;
    console.log(`\n## ${AIRCRAFT[current].name}\n`);
    console.log('| Case (source) | Quantity | Sourced | Simulated | Diff | Tolerance | Result |');
    console.log('|---|---|---|---|---|---|---|');
  }
  const diff = Number.isFinite(r.diff) ? `${r.diff >= 0 ? '+' : ''}${(r.diff * 100).toFixed(1)}%` : 'n/a';
  const result = r.check.calibration ? 'calibration' : r.pass ? 'pass' : r.case.deviations?.[r.key] ? 'KNOWN DEVIATION' : 'FAIL';
  console.log(
    `| ${r.case.id} (${r.case.source}) | ${CHECK_LABEL(r.check)} | ${formatValue(r.check.type, r.check.value)} | ${formatValue(r.check.type, r.simulated)} | ${diff} | ±${(r.tolerance * 100).toFixed(0)}% | ${result} |`,
  );
}
