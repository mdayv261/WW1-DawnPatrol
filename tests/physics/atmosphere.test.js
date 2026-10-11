import { describe, it, expect } from 'vitest';
import { atmosphere, densityRatio } from '../../src/physics/atmosphere.js';

// Reference values from the International Standard Atmosphere table.
const TABLE = [
  { h: 0, T: 288.15, P: 101325, rho: 1.225 },
  { h: 1000, T: 281.65, P: 89874.6, rho: 1.1117 },
  { h: 5000, T: 255.65, P: 54019.9, rho: 0.7364 },
  { h: 11000, T: 216.65, P: 22632.1, rho: 0.3639 },
  { h: 20000, T: 216.65, P: 5474.89, rho: 0.08803 },
];

describe('atmosphere (ISA)', () => {
  for (const row of TABLE) {
    it(`matches the standard table at ${row.h} m`, () => {
      const a = atmosphere(row.h);
      expect(a.temperature).toBeCloseTo(row.T, 1);
      expect(a.pressure / row.P).toBeCloseTo(1, 3);
      expect(a.density / row.rho).toBeCloseTo(1, 3);
    });
  }

  it('speed of sound at sea level is about 340.3 m/s', () => {
    expect(atmosphere(0).soundSpeed).toBeCloseTo(340.29, 1);
  });

  it('density falls steadily with altitude', () => {
    let last = Infinity;
    for (let h = 0; h <= 20000; h += 500) {
      const d = atmosphere(h).density;
      expect(d).toBeLessThan(last);
      last = d;
    }
  });

  it('density ratio is 1 at sea level', () => {
    expect(densityRatio(0)).toBeCloseTo(1, 6);
  });

  it('stays finite outside the supported range', () => {
    expect(Number.isFinite(atmosphere(-5000).density)).toBe(true);
    expect(Number.isFinite(atmosphere(80000).density)).toBe(true);
  });
});
