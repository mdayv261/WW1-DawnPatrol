import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { AIRCRAFT, common } from '../../src/aircraft/index.js';
import { VALIDATION_CASES } from '../../src/aircraft/validationCases.js';
import { runValidation, validationReport } from '../../src/physics/validation.js';

// The Early War add-on must not change the four Late War aircraft. Their validation tables,
// printed exactly as `npm run validate` prints them, must equal the copy saved before the
// add-on began (tests/fixtures/validation-baseline-late-war.md), to the last character.

const baseline = readFileSync(new URL('../fixtures/validation-baseline-late-war.md', import.meta.url), 'utf8');
const LATE = new Set(['camel', 'spad13', 'dr1', 'albatros']);

describe('Late War aircraft are unchanged by the Early War add-on', () => {
  it('their validation tables match the saved baseline exactly', () => {
    const cases = VALIDATION_CASES.filter((c) => LATE.has(c.aircraft));
    const report = validationReport(runValidation(AIRCRAFT, common, cases), AIRCRAFT);
    expect(report).toBe(baseline.replace(/\n$/, ''));
  });
});
