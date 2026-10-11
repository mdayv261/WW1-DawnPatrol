import { describe, it, expect } from 'vitest';
import { toKnots, toMph, toKmh, toFeet, toDegrees } from '../src/ui/units.js';
import { debugLines } from '../src/ui/debugText.js';
import { AIRCRAFT } from '../src/aircraft/index.js';

describe('display units', () => {
  it('converts metres per second', () => {
    expect(toMph(10)).toBeCloseTo(22.37, 2);
    expect(toKmh(10)).toBeCloseTo(36, 6);
    expect(toKnots(10)).toBeCloseTo(19.44, 2);
  });
  it('converts metres to feet and radians to degrees', () => {
    expect(toFeet(1000)).toBeCloseTo(3280.84, 1);
    expect(toDegrees(Math.PI)).toBeCloseTo(180, 9);
  });
});

describe('debug overlay text', () => {
  const diag = {
    speed: 40, altitude: 1000, alpha: 0.05, beta: -0.01, loadFactor: 1, thrust: 960,
    lift: 6400, drag: 950, rpm: 1034, power: 56000, stall: 0,
  };

  it('shows every value the spec asks for', () => {
    const text = debugLines(AIRCRAFT.camel, diag).join('\n');
    for (const word of ['airspeed', 'altitude', 'AoA', 'sideslip', 'g-load', 'thrust', 'lift', 'drag']) {
      expect(text).toContain(word);
    }
  });

  it('converts to familiar units for display', () => {
    const text = debugLines(AIRCRAFT.camel, diag).join('\n');
    expect(text).toContain('89 mph');
    expect(text).toContain('144 km/h');
    expect(text).toContain('3281 ft');
    expect(text).toContain('2.9 deg');
  });

  it('flags a stall and a crash', () => {
    expect(debugLines(AIRCRAFT.camel, { ...diag, stall: 1 }).join('\n')).toContain('STALLED');
    expect(debugLines(AIRCRAFT.camel, diag, { crashed: true }).join('\n')).toContain('CRASHED');
  });

  it('does not fail before the first physics step', () => {
    expect(debugLines(AIRCRAFT.camel, null)).toEqual(['Sopwith Camel F.1']);
  });
});
