import { describe, it, expect } from 'vitest';
import { sigmaEqualSpan, sigmaPair, multiplaneKappa } from '../../src/physics/multiplane.js';

// Reference values are Prandtl's own, from NACA TN-182 (1924).

describe('Prandtl mutual-influence coefficient sigma', () => {
  it('matches the worked example: G/b = 0.1818 gives 0.509 (p.8)', () => {
    expect(sigmaEqualSpan(2 / 11)).toBeCloseTo(0.509, 3);
  });

  it('matches Table I for equal spans', () => {
    const table = { 0.1: 0.655, 0.2: 0.485, 0.3: 0.37, 0.4: 0.29, 0.5: 0.23 };
    for (const [g, sigma] of Object.entries(table)) {
      expect(Math.abs(sigmaEqualSpan(Number(g)) - sigma)).toBeLessThan(0.006);
    }
  });

  it('matches the unequal-span example: spans 12 m and 10 m, gap 2 m gives about 0.49 (p.8)', () => {
    expect(Math.abs(sigmaPair(12, 10, 2) - 0.4925)).toBeLessThan(0.005);
  });

  it('is symmetric in the two spans', () => {
    expect(sigmaPair(12, 10, 2)).toBeCloseTo(sigmaPair(10, 12, 2), 12);
  });
});

describe('multiplane induced drag factor kappa', () => {
  it('is 1 for a monoplane', () => {
    expect(multiplaneKappa([{ span: 9, height: 0 }])).toBe(1);
  });

  it('equal-span biplane equals (1 + sigma) / 2 and Table II (G/b = 0.2 gives 0.742)', () => {
    const k = multiplaneKappa([{ span: 10, height: 2 }, { span: 10, height: 0 }]);
    expect(k).toBeCloseTo((1 + sigmaEqualSpan(0.2)) / 2, 9);
    expect(Math.abs(k - 0.742)).toBeLessThan(0.003);
  });

  it('matches the unequal biplane example: 12 m and 10 m spans, 2 m gap gives 0.865 (p.13)', () => {
    const k = multiplaneKappa([{ span: 12, height: 2 }, { span: 10, height: 0 }]);
    expect(Math.abs(k - 0.865)).toBeLessThan(0.005);
  });

  it('matches the triplane example: 10 m span, 2.5 m total height gives 0.687 (p.17-18)', () => {
    const k = multiplaneKappa([
      { span: 10, height: 2.5 },
      { span: 10, height: 1.25 },
      { span: 10, height: 0 },
    ]);
    expect(Math.abs(k - 0.687)).toBeLessThan(0.005);
  });

  it('matches Table III best triplane at G/b = 0.1 (0.819)', () => {
    const k = multiplaneKappa([
      { span: 10, height: 1 },
      { span: 10, height: 0.5 },
      { span: 10, height: 0 },
    ]);
    expect(Math.abs(k - 0.819)).toBeLessThan(0.006);
  });

  it('a wider gap gives less induced drag', () => {
    const k = (gap) => multiplaneKappa([{ span: 8, height: gap }, { span: 8, height: 0 }]);
    expect(k(1.6)).toBeLessThan(k(1.0));
  });

  it('a triplane beats a biplane of the same span and total height', () => {
    const bi = multiplaneKappa([{ span: 10, height: 2.5 }, { span: 10, height: 0 }]);
    const tri = multiplaneKappa([{ span: 10, height: 2.5 }, { span: 10, height: 1.25 }, { span: 10, height: 0 }]);
    expect(tri).toBeLessThan(bi);
  });
});
