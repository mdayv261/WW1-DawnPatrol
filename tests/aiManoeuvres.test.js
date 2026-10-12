import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { Simulation } from '../src/core/simulation.js';
import { AIRCRAFT_LIST } from '../src/aircraft/index.js';
import { MANOEUVRES, REPERTOIRE, SKILLS } from '../src/aircraft/aiData.js';
import { Pilot } from '../src/ai/steering.js';
import { Immelmann, SplitS, ClimbingTurn, BoomAndZoom } from '../src/ai/manoeuvres.js';
import { chooseManoeuvre, chooseEscape, energyHeight, knows, stallSpeedAt } from '../src/ai/tactics.js';
import { attitude } from '../src/dev/flightScenarios.js';

// The manoeuvres flown on their own, and how the brain chooses them.

const DT = 1 / 120;
const DEG = 180 / Math.PI;
const angleDiff = (a, b) => ((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

// Fly a manoeuvre with the pilot's hands from level flight at a fraction of top speed.
function fly(ac, make, speedFraction, extra = () => ({}), altitude = 1500, gShare = 0.92) {
  const sim = new Simulation();
  sim.start(ac, altitude, speedFraction * ac.documented.maxSpeed);
  sim.step(DT, sim.startInput);
  const pilot = new Pilot(ac);
  const m = make(sim.state.velocity.clone());
  const h0 = attitude(sim.state).heading;
  const y0 = sim.state.position.y;
  let t = 0;
  let maxStall = 0;
  let maxEas = 0;
  let minY = Infinity;
  while (!m.done && t < 25 && !sim.crashed) {
    const out = m.update(DT, {
      velocity: sim.state.velocity, speed: sim.diag.speed, topSpeed: ac.documented.maxSpeed,
      up: new Vector3(0, 1, 0).applyQuaternion(sim.state.quaternion), ...extra(sim),
    });
    sim.step(DT, pilot.steer(sim, { ...out, gShare: Math.min(out.gShare, gShare) }, DT));
    t += DT;
    maxStall = Math.max(maxStall, sim.diag.stall);
    maxEas = Math.max(maxEas, sim.diag.speed * Math.sqrt(sim.diag.density));
    minY = Math.min(minY, sim.state.position.y);
  }
  return { sim, m, t, turned: Math.abs(angleDiff(attitude(sim.state).heading, h0)) * DEG, climbed: sim.state.position.y - y0, maxStall, maxEas, minY };
}

for (const ac of AIRCRAFT_LIST) {
  describe(ac.name, () => {
    it('split-S: rolls inverted and pulls through, coming out the other way, lower and faster, inside its limits', () => {
      const r = fly(ac, (v) => new SplitS(v), 0.65); // a split-S is the reversal it uses when it is not fast
      expect(r.m.done).toBe(true);
      expect(r.turned).toBeGreaterThan(150);
      expect(r.climbed).toBeLessThan(-100);
      expect(r.sim.diag.speed).toBeGreaterThan(0.7 * ac.documented.maxSpeed);
      expect(r.maxEas).toBeLessThan(ac.structure.neverExceedSpeed);
      expect(r.sim.damage.wing.L + r.sim.damage.wing.R).toBeLessThan(0.01); // at most a brush with its limits
      expect(r.sim.crashed).toBe(false);
    });

    it('Immelmann: pulls up and over from speed, comes out higher and slower, rolling upright, without stalling (not tried by the Albatros)', () => {
      const canLoop = 0.95 * ac.documented.maxSpeed > MANOEUVRES.immelmannMargin * stallSpeedAt(ac, 1500);
      expect(canLoop).toBe(ac.id !== 'albatros');
      if (!canLoop) return;
      const r = fly(ac, (v) => new Immelmann(v), 0.95);
      expect(r.m.done).toBe(true);
      expect(r.climbed).toBeGreaterThan(50);
      expect(r.sim.diag.speed).toBeLessThan(0.8 * ac.documented.maxSpeed);
      expect(r.maxStall).toBeLessThan(0.3);
      expect(r.sim.crashed).toBe(false);
      expect(r.turned).toBeGreaterThan(130);
    });

    it('climbing turn: turns toward an enemy above (east) and stops when it points at him', () => {
      const r = fly(ac, () => new ClimbingTurn(), 0.75, () => ({ toEnemy: new Vector3(1, 0.3, 0), enemyAbove: 400 }));
      expect(r.m.done).toBe(true);
      expect(Math.abs(angleDiff(attitude(r.sim.state).heading, Math.PI / 2)) * DEG).toBeLessThan(25);
      expect(r.sim.crashed).toBe(false);
    });

    it('boom-and-zoom: dives on an enemy below, then zooms up with the speed', () => {
      // The enemy: 600 m ahead (north) and 400 m below, crossing slowly.
      const r = fly(ac, () => new BoomAndZoom(), 0.8, (sim) => {
        const s = sim.state;
        const enemy = new Vector3(0, 1100, -600 + 30 * sim.time); // it does not move much
        const to = enemy.clone().sub(s.position);
        const nose = new Vector3(1, 0, 0).applyQuaternion(s.quaternion);
        return { aimDir: to.clone().normalize(), range: to.length(), offNose: Math.acos(Math.min(1, nose.dot(to.clone().normalize()))) };
      });
      expect(r.m.done).toBe(true);
      expect(r.minY).toBeLessThan(1350); // it dived
      expect(r.sim.state.velocity.y).toBeGreaterThan(-5); // and came out of the dive climbing or level
      expect(r.maxEas).toBeLessThan(ac.structure.neverExceedSpeed);
      expect(r.sim.crashed).toBe(false);
    });
  });
}

describe('choosing a manoeuvre', () => {
  const vmax = 52;
  const me = (y, speed) => ({ y, speed, velocity: new Vector3(0, 0, -speed), vmax });

  it('energy height is height plus speed squared over 2g', () => {
    expect(energyHeight(1000, 0)).toBe(1000);
    expect(energyHeight(1000, 44.29)).toBeCloseTo(1100, 0);
  });

  it('an Ace well above with energy to spare dives on the enemy (boom-and-zoom); a Regular does not know it', () => {
    const enemy = { y: 1000, speed: 40, range: 900, offNose: 0.5 };
    expect(chooseManoeuvre('ace', me(1500, 45), enemy)).toBeInstanceOf(BoomAndZoom);
    expect(chooseManoeuvre('regular', me(1500, 45), enemy)).toBeNull();
    // Not if the enemy is behind it, or not far enough below.
    expect(chooseManoeuvre('ace', me(1500, 45), { ...enemy, offNose: 2 })).toBeNull();
    expect(chooseManoeuvre('ace', me(1100, 45), enemy)).toBeNull();
  });

  it('an enemy well above is approached in a climbing turn, at any skill', () => {
    for (const s of ['novice', 'regular', 'ace']) {
      expect(chooseManoeuvre(s, me(1000, 40), { y: 1300, speed: 40, range: 1200, offNose: 1 })).toBeInstanceOf(ClimbingTurn);
    }
  });

  it('after a head-on pass, with speed it reverses with an Immelmann, without speed but with height a split-S; a Novice does neither', () => {
    const passed = { y: 1000, speed: 40, range: 400, offNose: 2.6, closing: -40, pointingAtMe: 2.8 };
    expect(chooseManoeuvre('regular', me(1000, 0.9 * vmax), passed)).toBeInstanceOf(Immelmann);
    expect(chooseManoeuvre('regular', me(1500, 0.6 * vmax), passed)).toBeInstanceOf(SplitS);
    expect(chooseManoeuvre('regular', me(600, 0.6 * vmax), passed)).toBeNull(); // too slow and too low: it turns
    expect(chooseManoeuvre('novice', me(1500, 0.9 * vmax), passed)).toBeNull();
  });

  it('no reversal in a turning fight, where the enemy behind is turning after it', () => {
    const chasing = { y: 1000, speed: 40, range: 300, offNose: 2.6, closing: 5, pointingAtMe: 0.3 };
    expect(chooseManoeuvre('ace', me(1000, 0.9 * vmax), chasing)).toBeNull();
  });

  it('an enemy on its tail: a pilot who knows the split-S and has height sometimes uses it to escape', () => {
    let splits = 0;
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 1000; i++) if (chooseEscape('ace', { y: 1800, velocity: new Vector3(0, 0, -40) }, rng)) splits++;
    expect(splits / 1000).toBeCloseTo(MANOEUVRES.splitSEscape, 1);
    expect(chooseEscape('ace', { y: 500, velocity: new Vector3(0, 0, -40) }, () => 0)).toBeNull();
    expect(chooseEscape('novice', { y: 1800, velocity: new Vector3(0, 0, -40) }, () => 0)).toBeNull();
  });

  it('the skills know more manoeuvres the better they are, and every manoeuvre of the spec is known to someone', () => {
    expect(REPERTOIRE.novice.length).toBeLessThan(REPERTOIRE.regular.length);
    expect(REPERTOIRE.regular.length).toBeLessThan(REPERTOIRE.ace.length);
    for (const m of ['turning fight', 'climbing turn', 'Immelmann', 'split-S', 'boom-and-zoom', 'defensive break']) expect(knows('ace', m)).toBe(true);
    expect(knows('novice', 'Immelmann')).toBe(false);
    expect(Object.keys(REPERTOIRE).sort()).toEqual(Object.keys(SKILLS).filter((k) => k !== 'drone').sort());
  });
});
