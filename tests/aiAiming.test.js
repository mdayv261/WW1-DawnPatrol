import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { CARTRIDGES } from '../src/aircraft/weapons.js';
import { SKILLS } from '../src/aircraft/aiData.js';
import { makeBullet, stepBullet, trajectoryAt } from '../src/weapons/ballistics.js';
import { aimSolution, flightTime, bulletDrop, AimError, Trigger, gaussian } from '../src/ai/aiming.js';
import { seededRandom } from '../src/weapons/guns.js';

// AI gunnery: the lead solution, the pilot's aim error, and bursts.

// Fire along the solution with the real bullet physics and find how close the bullet passes the target.
function miss(cart, muzzle, selfV, targetP, targetV) {
  const sol = aimSolution(cart, muzzle, selfV, targetP, targetV);
  const b = makeBullet(cart, muzzle, selfV.clone().addScaledVector(sol.dir, cart.muzzleVelocity));
  let best = Infinity;
  for (let t = 0; t < 2; t += 1 / 1200) {
    stepBullet(b, 1 / 1200);
    const p = targetP.clone().addScaledVector(targetV, t + 1 / 1200);
    best = Math.min(best, Math.hypot(b.x - p.x, b.y - p.y, b.z - p.z));
  }
  return { best, sol };
}

describe('the lead solution', () => {
  const muzzle = new Vector3(0, 1000, 0);
  const cases = [
    ['dead astern at 200 m, same speed', [0, 1000, -200], [0, 0, -40], [0, 0, -40]],
    ['astern at 400 m, closing', [0, 1000, -400], [0, 0, -35], [0, 0, -45]],
    ['crossing at 300 m', [-300, 1000, -200], [40, 0, 0], [0, 0, -45]],
    ['climbing away at 250 m', [20, 1060, -250], [0, 8, -38], [0, 0, -45]],
    ['head on at 350 m', [0, 1000, -350], [0, 0, 45], [0, 0, -45]],
  ];
  for (const cart of Object.values(CARTRIDGES)) {
    for (const [name, p, v, s] of cases) {
      it(`${cart.name}, ${name}: a bullet fired along it passes within 0.5 m of a target flying straight on`, () => {
        const r = miss(cart, muzzle, new Vector3(...s), new Vector3(...p), new Vector3(...v));
        expect(r.best).toBeLessThan(0.5);
        expect(r.sol.dir.length()).toBeCloseTo(1, 9);
      });
    }
  }

  it('aims high by the drop, and leads a crossing target ahead of where it is', () => {
    const cart = CARTRIDGES.mk7;
    const still = aimSolution(cart, muzzle, new Vector3(), new Vector3(0, 1000, -300), new Vector3());
    expect(still.dir.y).toBeGreaterThan(0); // above the line to the target
    expect(still.dir.y * 300).toBeCloseTo(bulletDrop(cart, 300), 0);
    const crossing = aimSolution(cart, muzzle, new Vector3(), new Vector3(0, 1000, -300), new Vector3(40, 0, 0));
    expect(crossing.dir.x).toBeGreaterThan(0.04); // ahead of it, in its direction of travel
  });

  it('the flight-time and drop tables agree with the ballistics', () => {
    for (const cart of Object.values(CARTRIDGES)) {
      for (const r of [100, 250, 400, 700]) {
        const t = trajectoryAt(cart, r, { y0: 1000, step: 1 / 2400 });
        expect(flightTime(cart, r)).toBeCloseTo(t.time, 2);
        expect(Math.abs(bulletDrop(cart, r) - t.drop)).toBeLessThan(0.02 * t.drop + 0.01);
      }
    }
  });
});

describe('the pilot\'s aim error', () => {
  const spread = (skill, seed = 1) => {
    const e = new AimError(skill, seededRandom(seed));
    let sum = 0;
    let n = 0;
    for (let i = 0; i < 120 * 300; i++) {
      e.update(1 / 120);
      if (i > 120 * 5) {
        sum += e.x * e.x + e.y * e.y;
        n++;
      }
    }
    return Math.sqrt(sum / n / 2);
  };

  for (const name of ['novice', 'regular', 'ace']) {
    it(`${SKILLS[name].name}: wanders with the standard deviation the skill gives (${SKILLS[name].aimError} rad)`, () => {
      const s = spread(SKILLS[name]);
      expect(s).toBeGreaterThan(0.75 * SKILLS[name].aimError);
      expect(s).toBeLessThan(1.25 * SKILLS[name].aimError);
    });
  }

  it('an Ace aims better than a Regular, who aims better than a Novice', () => {
    expect(spread(SKILLS.ace)).toBeLessThan(spread(SKILLS.regular));
    expect(spread(SKILLS.regular)).toBeLessThan(spread(SKILLS.novice));
  });

  it('changes slowly: one step later the error is almost the same (it wanders, it does not jitter)', () => {
    const e = new AimError(SKILLS.novice, seededRandom(4));
    for (let i = 0; i < 600; i++) e.update(1 / 120);
    const x = e.x;
    e.update(1 / 120);
    expect(Math.abs(e.x - x)).toBeLessThan(0.15 * SKILLS.novice.aimError);
  });

  it('apply tilts the aim by the error and keeps it a unit vector', () => {
    const e = new AimError(SKILLS.novice);
    e.x = 0.05;
    e.y = 0;
    const dir = new Vector3(0, 0, -1);
    const out = e.apply(dir);
    expect(out.length()).toBeCloseTo(1, 9);
    expect(Math.acos(out.dot(dir))).toBeCloseTo(Math.atan(0.05), 6);
  });

  it('gaussian numbers have mean 0 and standard deviation 1', () => {
    const rng = seededRandom(9);
    let s = 0;
    let s2 = 0;
    for (let i = 0; i < 20000; i++) {
      const g = gaussian(rng);
      s += g;
      s2 += g * g;
    }
    expect(Math.abs(s / 20000)).toBeLessThan(0.03);
    expect(Math.sqrt(s2 / 20000)).toBeCloseTo(1, 1);
  });
});

describe('the trigger', () => {
  it('fires only in bursts of the skill\'s length with pauses between, and only when the shot is on', () => {
    for (const name of ['novice', 'regular', 'ace']) {
      const skill = SKILLS[name];
      const t = new Trigger(skill, seededRandom(2));
      const bursts = [];
      let run = 0;
      for (let i = 0; i < 120 * 60; i++) {
        const on = t.update(1 / 120, true);
        if (on) run += 1 / 120;
        else if (run > 0) {
          bursts.push(run);
          run = 0;
        }
      }
      expect(bursts.length).toBeGreaterThan(10);
      for (const b of bursts) {
        expect(b).toBeGreaterThanOrEqual(skill.burst[0] - 0.02);
        expect(b).toBeLessThanOrEqual(skill.burst[1] + 0.02);
      }
      const off = new Trigger(skill, seededRandom(2));
      for (let i = 0; i < 600; i++) expect(off.update(1 / 120, false)).toBe(false);
    }
  });
});
