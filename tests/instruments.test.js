import { describe, it, expect } from 'vitest';
import { AIRCRAFT } from '../src/aircraft/index.js';
import { airspeedReading, altimeterReading, tachometerReading, slipBall, compassHeading } from '../src/ui/instrumentMath.js';

describe('cockpit instruments', () => {
  it('British Camel reads mph and feet; French and German aircraft read km/h and metres', () => {
    expect(airspeedReading(AIRCRAFT.camel, 44.704).value).toBeCloseTo(100, 3);
    expect(airspeedReading(AIRCRAFT.camel, 44.704).unit).toBe('mph');
    expect(airspeedReading(AIRCRAFT.spad13, 50).value).toBeCloseTo(180, 6);
    expect(airspeedReading(AIRCRAFT.dr1, 50).unit).toBe('kmh');
    expect(altimeterReading(AIRCRAFT.camel, 1000).value).toBeCloseTo(3280.84, 1);
    expect(altimeterReading(AIRCRAFT.albatros, 1000).value).toBe(1000);
  });

  it('the airspeed needle starts at zero and stops at full scale', () => {
    expect(airspeedReading(AIRCRAFT.camel, 0).angle).toBe(0);
    const full = airspeedReading(AIRCRAFT.camel, 500).angle;
    expect(full).toBeCloseTo((300 * Math.PI) / 180, 9);
  });

  it('the altimeter long hand turns once per 1,000 units', () => {
    const a = altimeterReading(AIRCRAFT.albatros, 1250);
    expect(a.longHand).toBeCloseTo(0.25 * 2 * Math.PI, 9);
    expect(a.shortHand).toBeCloseTo(0.125 * 2 * Math.PI, 9);
  });

  it('the tachometer reads engine rpm with a dial above the rated speed', () => {
    const t = tachometerReading(AIRCRAFT.camel, 1250);
    expect(t.full).toBeGreaterThan(1250);
    expect(t.angle).toBeGreaterThan(0);
  });

  it('the slip ball moves away from the wind and stops at the ends', () => {
    expect(slipBall(0.1)).toBeLessThan(0);
    expect(slipBall(-0.1)).toBeGreaterThan(0);
    expect(slipBall(5)).toBe(-1);
  });

  it('the compass reads 0-360 degrees, north at 0, east at 90', () => {
    expect(compassHeading(0)).toBe(0);
    expect(compassHeading(Math.PI / 2)).toBeCloseTo(90, 9);
    expect(compassHeading(-Math.PI / 2)).toBeCloseTo(270, 9);
  });
});
