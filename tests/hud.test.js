import { describe, it, expect } from 'vitest';
import { hudReadouts, headingTape, markerFor, enemyLabel, trimReadout } from '../src/ui/hudMath.js';
import { AIRCRAFT } from '../src/aircraft/index.js';
import { createDamage } from '../src/physics/damage.js';

// The modern HUD (Phase 6): its words and numbers, the heading tape and the enemy markers.

const diag = { speed: 40, altitude: 1000, rpm: 1180, loadFactor: 2.04 };

describe('HUD readouts', () => {
  it("in the aircraft's own units", () => {
    const camel = hudReadouts({ aircraft: AIRCRAFT.camel, diag, velocityY: 5, heading: Math.PI / 2, throttle: 0.75, damage: createDamage(), gunText: 'GUNS 500 | 500' });
    expect(camel).toMatchObject({ speed: '89 MPH', altitude: '3,281 FT', climb: '+980 FT/MIN', g: '2.0 G', heading: '090', throttle: 'THR 75%', fuel: 'FUEL 100%', guns: 'GUNS 500 | 500', warnings: 'NONE' });
    const dr1 = hudReadouts({ aircraft: AIRCRAFT.dr1, diag, velocityY: -3.26, heading: -Math.PI / 2 });
    expect(dr1).toMatchObject({ speed: '144 KM/H', altitude: '1,000 M', climb: '-3.3 M/S', heading: '270' });
  });

  it('shows the damage', () => {
    const d = createDamage();
    d.engine = 0.4;
    d.fuel = 0.5;
    const r = hudReadouts({ aircraft: AIRCRAFT.spad13, diag, damage: d });
    expect(r.warnings).toBe('ENGINE 40%');
    expect(r.fuel).toBe('FUEL 50%');
  });

  it('before the first physics step', () => {
    const r = hudReadouts({ aircraft: AIRCRAFT.albatros, diag: null });
    expect(r.speed).toBe('0 KM/H');
    expect(r.g).toBe('1.0 G');
  });
});

describe('heading tape', () => {
  it('ticks every ten degrees, with the cardinal points as letters', () => {
    const t = headingTape(355, 45);
    expect(t).toHaveLength(10); // 310 to 400 (040)
    expect(t.find((x) => x.label === 'N').offset).toBeCloseTo(5 / 45);
    expect(t.find((x) => x.label === '330').offset).toBeCloseTo(-25 / 45);
    expect(t.find((x) => x.label === '030').offset).toBeCloseTo(35 / 45);
    for (const x of t) expect(Math.abs(x.offset)).toBeLessThanOrEqual(1);
  });

  it('labels E, S and W', () => {
    expect(headingTape(90).find((x) => x.offset === 0).label).toBe('E');
    expect(headingTape(180).find((x) => x.offset === 0).label).toBe('S');
    expect(headingTape(270).find((x) => x.offset === 0).label).toBe('W');
  });
});

describe('enemy markers', () => {
  it('on screen: a box at the point', () => {
    expect(markerFor({ x: 0, y: 0, z: 0.9 })).toEqual({ onScreen: true, x: 0.5, y: 0.5, angle: 0 });
    const m = markerFor({ x: 0.5, y: 0.5, z: 0.9 });
    expect(m.x).toBeCloseTo(0.75);
    expect(m.y).toBeCloseTo(0.25); // up the screen
  });

  it('off to the right: an arrow at the right edge pointing right', () => {
    const m = markerFor({ x: 3, y: 0, z: 0.9 }, 0.05);
    expect(m.onScreen).toBe(false);
    expect(m.x).toBeCloseTo(0.95);
    expect(m.y).toBeCloseTo(0.5);
    expect(m.angle).toBeCloseTo(Math.PI / 2);
  });

  it('behind: the arrow is on the opposite side (an enemy behind and right shows right)', () => {
    // Behind the camera the projection flips, so a point behind and to the right projects to the left.
    const m = markerFor({ x: -0.3, y: 0.1, z: 1.2 });
    expect(m.onScreen).toBe(false);
    expect(m.x).toBeGreaterThan(0.9);
    expect(m.angle).toBeGreaterThan(0);
  });

  it('labels the type and the distance', () => {
    expect(enemyLabel('Fokker Dr.I', 456)).toBe('Fokker Dr.I  460 m');
    expect(enemyLabel('Albatros D.V', 2345)).toBe('Albatros D.V  2.3 km');
  });
});

describe('elevator trim indicator', () => {
  it('says how much trim, nose up or down, or neutral', () => {
    expect(trimReadout(0).text).toBe('TRIM NEUTRAL');
    expect(trimReadout(0.25).text).toBe('TRIM 25% UP');
    expect(trimReadout(-0.4).text).toBe('TRIM 40% DOWN');
    expect(trimReadout(0.004).text).toBe('TRIM NEUTRAL'); // rounds to 0%
    expect(trimReadout(5).text).toBe('TRIM 100% UP'); // kept within the trim's range
    expect(trimReadout().text).toBe('TRIM NEUTRAL');
  });

  it('the marker is at the top for full nose up, in the middle at neutral, at the bottom for full nose down', () => {
    expect(trimReadout(1).marker).toBe(0);
    expect(trimReadout(0).marker).toBe(0.5);
    expect(trimReadout(-1).marker).toBe(1);
    expect(trimReadout(0.5).marker).toBeCloseTo(0.25, 9);
  });
});

