import { describe, it, expect } from 'vitest';
import { G } from '../src/core/constants.js';
import { G1 } from '../src/aircraft/g1Table.js';
import { CARTRIDGES } from '../src/aircraft/weapons.js';
import { atmosphere } from '../src/physics/atmosphere.js';
import { g1Cd, dragConstant, makeBullet, stepBullet, bulletSpeed, trajectoryAt, flyBullet } from '../src/weapons/ballistics.js';

// Phase 4 acceptance: bullet drop and travel time.

const noDrag = { ...CARTRIDGES.mk7, formFactor: 0 };

describe('the G1 drag table', () => {
  it('has 79 points, rising Mach numbers, and the published values at known points', () => {
    expect(G1.mach.length).toBe(79);
    expect(G1.cd.length).toBe(79);
    for (let i = 1; i < G1.mach.length; i++) expect(G1.mach[i]).toBeGreaterThan(G1.mach[i - 1]);
    expect(g1Cd(0)).toBeCloseTo(0.2629, 4);
    expect(g1Cd(1)).toBeCloseTo(0.4805, 4);
    expect(g1Cd(1.4)).toBeCloseTo(0.6625, 4);
    expect(g1Cd(5)).toBeCloseTo(0.4988, 4);
  });

  it('is interpolated between points and held flat beyond the ends', () => {
    expect(g1Cd(0.525)).toBeCloseTo((0.2032 + 0.2020) / 2, 4);
    expect(g1Cd(-1)).toBe(0.2629);
    expect(g1Cd(9)).toBe(0.4988);
  });

  it('peaks near Mach 1.4 (the transonic drag rise), like a real bullet', () => {
    expect(g1Cd(1.4)).toBeGreaterThan(g1Cd(0.5) * 3);
    expect(g1Cd(1.4)).toBeGreaterThan(g1Cd(3));
  });
});

describe('a bullet with no drag follows the closed-form path', () => {
  it('level shot: distance = v t and drop = g t^2 / 2', () => {
    const v = noDrag.muzzleVelocity;
    for (const range of [100, 300, 600]) {
      const r = trajectoryAt(noDrag, range, { step: 1 / 2400 });
      expect(r.time).toBeCloseTo(range / v, 3);
      expect(r.drop).toBeCloseTo(0.5 * G * (range / v) ** 2, 2);
      expect(r.speed).toBeCloseTo(Math.hypot(v, G * r.time), 1);
    }
  });

  it('a bullet fired up goes up and comes down on a parabola', () => {
    const v = 700;
    const b = makeBullet(noDrag, { x: 0, y: 1000, z: 0 }, { x: 0, y: v, z: 0 });
    let top = 0;
    for (let i = 0; i < 2400 * 160; i++) {
      stepBullet(b, 1 / 2400);
      top = Math.max(top, b.y);
      if (b.y < 1000) break;
    }
    expect(top - 1000).toBeCloseTo((v * v) / (2 * G), 0);
    expect(b.age).toBeCloseTo((2 * v) / G, 1);
  });
});

describe('with air, the bullet drops more and arrives later than in a vacuum', () => {
  for (const [key, cart] of Object.entries(CARTRIDGES)) {
    it(`${cart.name}: drop and time of flight at 100, 200, 300 and 400 m`, () => {
      let lastDrop = 0;
      let lastTime = 0;
      for (const range of [100, 200, 300, 400]) {
        const air = trajectoryAt(cart, range, { y0: 0 + 1000 });
        const vac = trajectoryAt({ ...cart, formFactor: 0 }, range, { y0: 1000 });
        expect(air.time, `${key} ${range}`).toBeGreaterThan(vac.time);
        expect(air.drop).toBeGreaterThan(vac.drop);
        expect(air.speed).toBeLessThan(cart.muzzleVelocity);
        expect(air.drop).toBeGreaterThan(lastDrop);
        expect(air.time).toBeGreaterThan(lastTime);
        lastDrop = air.drop;
        lastTime = air.time;
      }
    });
  }

  it('.303 Mk VII numbers (regression: they depend on the estimated form factor)', () => {
    const at = (r) => trajectoryAt(CARTRIDGES.mk7, r, { y0: 1000 });
    // Sea-level-ish air (1,000 m) shortens the drag a little. Time of flight and drop, to within 3%.
    expect(at(100).time).toBeCloseTo(0.143, 2);
    expect(at(200).time).toBeGreaterThan(0.29);
    expect(at(200).time).toBeLessThan(0.305);
    expect(at(200).drop).toBeGreaterThan(0.39);
    expect(at(200).drop).toBeLessThan(0.43);
    expect(at(400).time).toBeGreaterThan(0.62);
    expect(at(400).time).toBeLessThan(0.67);
    expect(at(400).drop).toBeGreaterThan(1.75);
    expect(at(400).drop).toBeLessThan(1.92);
    expect(at(400).speed).toBeGreaterThan(510);
    expect(at(400).speed).toBeLessThan(545);
  });

  it('thinner air at height means less drag: the bullet loses less speed at 5,000 m', () => {
    const low = trajectoryAt(CARTRIDGES.mk7, 400, { y0: 0 });
    const high = trajectoryAt(CARTRIDGES.mk7, 400, { y0: 5000 });
    expect(atmosphere(5000).density).toBeLessThan(0.7 * atmosphere(0).density);
    expect(high.speed).toBeGreaterThan(low.speed + 10);
    expect(high.time).toBeLessThan(low.time);
  });

  it('a fast platform adds its speed: the bullet arrives sooner and drops less', () => {
    const still = trajectoryAt(CARTRIDGES.mk7, 300, { y0: 1000 });
    const moving = trajectoryAt(CARTRIDGES.mk7, 300, { y0: 1000, inherited: 45 });
    expect(moving.time).toBeLessThan(still.time);
    expect(moving.drop).toBeLessThan(still.drop);
  });

  it('the lighter, faster 7.92 mm bullet arrives sooner than the .303 over 400 m', () => {
    expect(trajectoryAt(CARTRIDGES.smk, 400).time).toBeLessThan(trajectoryAt(CARTRIDGES.mk7, 400).time);
  });

  it('speed only ever falls (drag) while the bullet flies level', () => {
    const b = makeBullet(CARTRIDGES.mk7, { x: 0, y: 1000, z: 0 }, { x: CARTRIDGES.mk7.muzzleVelocity, y: 0, z: 0 });
    let last = bulletSpeed(b);
    for (let i = 0; i < 120; i++) {
      stepBullet(b, 1 / 120);
      if (b.vy > -0.5) expect(bulletSpeed(b)).toBeLessThan(last);
      last = bulletSpeed(b);
    }
  });
});

describe('accuracy of the step', () => {
  it('after 0.6 s the 120 Hz step agrees with a 20 times finer step to within 3 cm and 0.1 m/s', () => {
    const run = (step) => {
      const v = CARTRIDGES.mk7.muzzleVelocity;
      const b = makeBullet(CARTRIDGES.mk7, { x: 0, y: 1000, z: 0 }, { x: v, y: 0, z: 0 });
      for (let i = 0; i < Math.round(0.6 / step); i++) stepBullet(b, step);
      return b;
    };
    const coarse = run(1 / 120);
    const fine = run(1 / 2400);
    expect(Math.abs(coarse.x - fine.x)).toBeLessThan(0.03);
    expect(Math.abs(coarse.y - fine.y)).toBeLessThan(0.03);
    expect(Math.abs(bulletSpeed(coarse) - bulletSpeed(fine))).toBeLessThan(0.1);
  });

  it('dragConstant is zero for no drag and grows with the form factor', () => {
    expect(dragConstant(noDrag)).toBe(0);
    expect(dragConstant({ ...CARTRIDGES.mk7, formFactor: 1.12 })).toBeCloseTo(2 * dragConstant(CARTRIDGES.mk7), 6);
  });
});

describe('flyBullet (used for the gun sight)', () => {
  it('stops after the range, with the drop of the same shot', () => {
    const v = CARTRIDGES.mk7.muzzleVelocity;
    const b = flyBullet(CARTRIDGES.mk7, { x: 0, y: 1000, z: 0 }, { x: v, y: 0, z: 0 }, 200);
    expect(Math.hypot(b.x, b.y - 1000)).toBeCloseTo(200, 6); // exactly the range: the last step is trimmed
    expect(1000 - b.y).toBeGreaterThan(0.38);
    expect(1000 - b.y).toBeLessThan(0.45);
  });
});
