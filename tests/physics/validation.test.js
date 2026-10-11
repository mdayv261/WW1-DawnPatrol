import { describe, it, expect } from 'vitest';
import { AIRCRAFT, common } from '../../src/aircraft/index.js';
import { VALIDATION_CASES, TOLERANCE } from '../../src/aircraft/validationCases.js';
import { runValidation, CHECK_LABEL } from '../../src/physics/validation.js';

// The flight model against sourced performance figures.
// Tolerances (set by the product owner): top speed 5%, climb and ceiling 15%.
// Each aircraft's drag is fitted to ONE sourced top speed (calibration);
// every other figure is an independent check.
// Known deviations are explicit expected failures (it.fails): each has a
// written reason, and if one starts passing the test fails so the docs get
// updated.

const results = runValidation(AIRCRAFT, common);

describe('flight model validation against sourced figures', () => {
  it('runs every check of every case', () => {
    const total = VALIDATION_CASES.reduce((n, c) => n + c.checks.length, 0);
    expect(results.length).toBe(total);
    for (const r of results) expect(Number.isFinite(r.simulated), `${r.case.id} ${r.key}`).toBe(true);
  });

  it('each aircraft has exactly one calibration figure', () => {
    for (const id of Object.keys(AIRCRAFT)) {
      const n = results.filter((r) => r.case.aircraft === id && r.check.calibration).length;
      expect(n, id).toBe(1);
    }
  });

  it('every known deviation names a real check and gives a reason', () => {
    for (const c of VALIDATION_CASES) {
      for (const [key, reason] of Object.entries(c.deviations ?? {})) {
        expect(results.some((r) => r.case === c && r.key === key), `${c.id} ${key}`).toBe(true);
        expect(reason.length).toBeGreaterThan(20);
      }
    }
  });

  for (const r of results) {
    const name = `${r.case.id} (${r.case.source}): ${CHECK_LABEL(r.check)}`;
    if (r.check.calibration) {
      it(`${name} matches (calibration point)`, () => {
        expect(Math.abs(r.diff)).toBeLessThan(0.005);
      });
    } else if (r.case.deviations?.[r.key]) {
      it.fails(`${name} is a KNOWN DEVIATION: ${r.case.deviations[r.key]}`, () => {
        expect(Math.abs(r.diff)).toBeLessThanOrEqual(TOLERANCE[r.check.type]);
      });
    } else {
      it(`${name} within ${TOLERANCE[r.check.type] * 100}%`, () => {
        expect(Math.abs(r.diff), `simulated ${r.simulated} vs sourced ${r.check.value}`).toBeLessThanOrEqual(TOLERANCE[r.check.type]);
      });
    }
  }
});
