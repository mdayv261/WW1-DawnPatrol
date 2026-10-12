import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { Simulation } from '../src/core/simulation.js';
import { AIRCRAFT_LIST, common } from '../src/aircraft/index.js';
import { DAMAGE } from '../src/aircraft/damageModel.js';
import { evaluate } from '../src/physics/flightModel.js';
import { createState } from '../src/physics/rigidBody.js';
import { createSurfaces } from '../src/physics/controls.js';
import { createDamage } from '../src/physics/damage.js';
import { trimLevel } from '../src/physics/trim.js';
import { attitude } from '../src/dev/flightScenarios.js';

// Damage changes the flight (Phase 4 acceptance: a damaged wing causes a measurable roll).

const DT = 1 / 120;
const DEG = 180 / Math.PI;

function fly(ac, { seconds, damage = {}, input = (i) => i, altitude = 1500, speed } = {}) {
  const sim = new Simulation();
  const start = sim.start(ac, altitude, speed);
  Object.assign(sim.damage, damage);
  if (damage.wing) sim.damage.wing = { L: 0, R: 0, ...damage.wing };
  let peakRoll = 0;
  let peakPitch = 0;
  let peakLoad = 0;
  for (let i = 0; i < seconds / DT; i++) {
    sim.step(DT, input({ ...start }, sim, i * DT));
    peakRoll = Math.max(peakRoll, Math.abs(sim.state.angularVelocity.x));
    peakPitch = Math.max(peakPitch, Math.abs(sim.state.angularVelocity.z));
    peakLoad = Math.max(peakLoad, sim.diag.loadFactor);
  }
  return { sim, peakRoll, peakPitch, peakLoad, bank: attitude(sim.state).bank * DEG, input: start };
}

// Hold the wings level with the ailerons; returns the mean roll command over the last seconds.
function aileronToHoldLevel(ac, damage) {
  const sim = new Simulation();
  const start = sim.start(ac, 1500);
  Object.assign(sim.damage, damage);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < 6 / DT; i++) {
    const a = attitude(sim.state);
    const input = { ...start, roll: Math.max(-1, Math.min(1, -2.5 * a.bank - 0.8 * sim.state.angularVelocity.x)) };
    sim.step(DT, input);
    if (i > 3 / DT) { sum += input.roll; n++; }
  }
  return sum / n;
}

describe('an undamaged aircraft is exactly as before', () => {
  for (const ac of AIRCRAFT_LIST) {
    it(`${ac.name}: forces, moments and readings are identical with no damage state and with a fresh one`, () => {
      const trim = trimLevel(ac, common, 1000, 0.7 * ac.documented.maxSpeed);
      for (const throttle of [0, 0.5, 1]) {
        for (const yawRate of [0, 0.3]) {
          const state = createState();
          state.position.copy(trim.state.position);
          state.velocity.copy(trim.state.velocity);
          state.quaternion.copy(trim.state.quaternion);
          state.angularVelocity.set(0.1, yawRate, -0.05);
          const surfaces = { ...createSurfaces(), throttle, pull: 0.2, roll: -0.3, yaw: 0.1 };
          const a = evaluate(ac, common, state, surfaces);
          const b = evaluate(ac, common, state, surfaces, createDamage());
          expect(b.force.toArray()).toEqual(a.force.toArray());
          expect(b.moment.toArray()).toEqual(a.moment.toArray());
          expect(b.momentum.toArray()).toEqual(a.momentum.toArray());
          expect(b.diag).toEqual(a.diag);
        }
      }
    });
  }
});

describe('a damaged wing rolls the aircraft toward it (Phase 4 acceptance test)', () => {
  for (const ac of AIRCRAFT_LIST) {
    describe(ac.name, () => {
      it('hands off, a half-damaged right wing rolls the right wing down: 10+ degrees a second at the peak and 15+ degrees of bank in two seconds', () => {
        const undamaged = fly(ac, { seconds: 2 });
        const hurt = fly(ac, { seconds: 2, damage: { wing: { R: 0.5 } } });
        expect(undamaged.peakRoll * DEG).toBeLessThan(3);
        expect(Math.abs(undamaged.bank)).toBeLessThan(3);
        expect(hurt.peakRoll * DEG).toBeGreaterThan(10);
        expect(hurt.bank).toBeGreaterThan(15); // bank positive = right wing down
      });

      it('and a damaged left wing rolls it the other way by the same amount', () => {
        const right = fly(ac, { seconds: 2, damage: { wing: { R: 0.5 } } });
        const left = fly(ac, { seconds: 2, damage: { wing: { L: 0.5 } } });
        expect(left.bank).toBeLessThan(-15);
        expect(Math.abs(left.bank + right.bank)).toBeLessThan(0.25 * Math.abs(right.bank)); // mirror images, apart from engine torque
      });

      it('the roll grows with the damage: 25%, 50%, 100%', () => {
        const banks = [0.25, 0.5, 1].map((r) => fly(ac, { seconds: 2, damage: { wing: { R: r } } }).bank);
        expect(banks[0]).toBeGreaterThan(5);
        expect(banks[1]).toBeGreaterThan(banks[0] + 5);
        expect(banks[2]).toBeGreaterThan(banks[1] + 5);
      });

      it('the pilot can hold it level with opposite aileron: about a fifth of the stick at 50%, and more at 100%', () => {
        const none = aileronToHoldLevel(ac, {});
        const half = aileronToHoldLevel(ac, { wing: { L: 0, R: 0.5 } });
        const full = aileronToHoldLevel(ac, { wing: { L: 0, R: 1 } });
        expect(Math.abs(none)).toBeLessThan(0.05);
        expect(half).toBeLessThan(-0.1); // stick left to oppose a right-wing-down roll
        expect(half).toBeGreaterThan(-0.6);
        expect(full).toBeLessThan(half - 0.1);
      });

      it('a failed wing is violent: more than 30 degrees a second of roll in the first second, and it loses lift', () => {
        const failed = fly(ac, { seconds: 1, damage: { wing: { R: 1 }, failed: { L: false, R: true, tailplane: false } } });
        expect(failed.peakRoll * DEG).toBeGreaterThan(30);
        const lifted = fly(ac, { seconds: 1 });
        expect(failed.sim.state.velocity.y).toBeLessThan(lifted.sim.state.velocity.y - 1);
      });
    });
  }

  it('damage to both wings loses lift without rolling: the aircraft sinks', () => {
    const ac = AIRCRAFT_LIST[0];
    const hurt = fly(ac, { seconds: 3, damage: { wing: { L: 1, R: 1 } } });
    expect(Math.abs(hurt.bank)).toBeLessThan(8);
    expect(hurt.sim.state.velocity.y).toBeLessThan(-1.5);
  });

  it('a damaged wing also makes more drag: the aircraft slows', () => {
    const ac = AIRCRAFT_LIST[1];
    const trim = trimLevel(ac, common, 1500, 0.8 * ac.documented.maxSpeed);
    const a = evaluate(ac, common, trim.state, trim.surfaces).diag.drag;
    const d = createDamage();
    d.wing.R = 1;
    const b = evaluate(ac, common, trim.state, trim.surfaces, d).diag.drag;
    expect(b).toBeGreaterThan(a * (1 + 0.5 * DAMAGE.wingDragGain * 0.9));
  });
});

describe('the engine', () => {
  for (const ac of AIRCRAFT_LIST) {
    const trim = trimLevel(ac, common, 1000, 0.8 * ac.documented.maxSpeed);
    const read = (d) => evaluate(ac, common, trim.state, { ...trim.surfaces, throttle: 1 }, d);

    it(`${ac.name}: half engine damage cuts the thrust to about 57%; a seized engine gives none and drags`, () => {
      const base = read(createDamage()).diag;
      const hurt = createDamage();
      hurt.engine = 0.5;
      const half = read(hurt).diag;
      expect(half.thrust / base.thrust).toBeGreaterThan(0.5);
      expect(half.thrust / base.thrust).toBeLessThan(0.62);
      expect(half.power).toBeCloseTo(base.power * (1 - 0.5 * DAMAGE.enginePowerLoss), 3);
      const seized = createDamage();
      seized.engine = 1;
      const dead = read(seized).diag;
      expect(dead.thrust).toBe(0);
      expect(dead.power).toBe(0);
      expect(dead.rpm).toBe(0);
      const area = (Math.PI * ac.propeller.diameter ** 2) / 4;
      expect(dead.drag - base.drag).toBeCloseTo(dead.dynamicPressure * area * DAMAGE.seizedPropDrag, 3);
      if (ac.engine.kind === 'rotary') expect(read(seized).momentum.x).toBe(0); // no spinning engine, no gyroscopic effect
    });
  }

  it('a seized engine slows the aircraft down: it cannot hold height at the speed it was flying', () => {
    const ac = AIRCRAFT_LIST[0];
    const a = fly(ac, { seconds: 10 }).sim;
    const b = fly(ac, { seconds: 10, damage: { engine: 1 } }).sim;
    expect(b.diag.speed).toBeLessThan(a.diag.speed - 3);
    expect(b.state.position.y).toBeLessThan(a.state.position.y - 20);
  });

  it('a fuel leak stops the engine at about the predicted time, then the propeller windmills and the aircraft starts to come down', () => {
    const ac = AIRCRAFT_LIST[2];
    const sim = new Simulation();
    const input = sim.start(ac, 3000);
    sim.damage.tank = 1;
    let outAt = null;
    for (let i = 0; i < 70 / DT; i++) {
      sim.step(DT, input);
      if (outAt === null && sim.damage.fuel === 0) {
        outAt = sim.time;
      }
    }
    expect(outAt).toBeGreaterThan(38);
    expect(outAt).toBeLessThan(46);
    expect(sim.diag.power).toBe(0);
    expect(sim.diag.thrust).toBe(0);
    expect(sim.diag.rpm).toBeGreaterThan(0); // windmilling
    expect(sim.diag.rpm).toBeLessThan(ac.engine.ratedRpm);
    expect(sim.state.velocity.y).toBeLessThan(-2); // no power, no height held: it descends
  });
});

describe('control cables', () => {
  for (const ac of AIRCRAFT_LIST) {
    it(`${ac.name}: a cut aileron cable stops the roll control; the intact one rolls at 20+ degrees a second`, () => {
      const stick = (i) => ({ ...i, roll: 1 });
      const intact = fly(ac, { seconds: 1, input: stick });
      const cut = fly(ac, { seconds: 1, input: stick, damage: { cables: { aileron: 0, elevator: null, rudder: null } } });
      expect(intact.peakRoll * DEG).toBeGreaterThan(20);
      expect(cut.peakRoll * DEG).toBeLessThan(5);
    });
  }

  it('a cable cut with the stick over holds the surface there: it keeps rolling that way', () => {
    const ac = AIRCRAFT_LIST[0];
    const stuck = fly(ac, { seconds: 2, damage: { cables: { aileron: 0.6, elevator: null, rudder: null } }, input: (i) => ({ ...i, roll: -1 }) });
    expect(stuck.bank).toBeGreaterThan(30); // aileron stuck right, whatever the pilot does
  });

  it('a cut elevator cable stops the pitch control; a cut rudder cable stops the rudder', () => {
    const ac = AIRCRAFT_LIST[1];
    const pull = (i) => ({ ...i, pull: 0.6 });
    const intact = fly(ac, { seconds: 0.6, input: pull });
    const cut = fly(ac, { seconds: 0.6, input: pull, damage: { cables: { aileron: null, elevator: 0, rudder: null } } });
    expect(intact.peakPitch).toBeGreaterThan(0.1);
    expect(cut.peakPitch).toBeLessThan(0.3 * intact.peakPitch);
    const kick = (i) => ({ ...i, yaw: 1 });
    const yawRate = (damage) => Math.abs(fly(ac, { seconds: 0.8, input: kick, damage }).sim.state.angularVelocity.y);
    expect(yawRate({ cables: { aileron: null, elevator: null, rudder: 0 } })).toBeLessThan(0.3 * yawRate({}));
  });
});

describe('the tail', () => {
  for (const ac of AIRCRAFT_LIST) {
    it(`${ac.name}: a destroyed tailplane leaves a fifth of the elevator's effect; a destroyed fin a fifth of the rudder's`, () => {
      const pull = (i) => ({ ...i, pull: 0.6 });
      const base = fly(ac, { seconds: 0.5, input: pull }).peakPitch;
      const hurt = fly(ac, { seconds: 0.5, input: pull, damage: { tailplane: 1 } }).peakPitch;
      expect(hurt / base).toBeLessThan(0.45);
      expect(hurt / base).toBeGreaterThan(0.1);
      const kick = (i) => ({ ...i, yaw: 1 });
      const yaw = (d) => Math.abs(fly(ac, { seconds: 0.6, input: kick, damage: d }).sim.state.angularVelocity.y);
      expect(yaw({ fin: 1 }) / yaw({})).toBeLessThan(0.5);
    });
  }

  it('a damaged tailplane also halves the pitch stability: the nose rises further after a gust', () => {
    const ac = AIRCRAFT_LIST[3];
    const gust = (damage) => {
      const sim = new Simulation();
      const input = sim.start(ac, 1500);
      Object.assign(sim.damage, damage);
      sim.state.angularVelocity.z = 0.4; // a nose-up pitch kick
      let peak = 0;
      for (let i = 0; i < 1.2 / DT; i++) {
        sim.step(DT, input);
        peak = Math.max(peak, attitude(sim.state).pitch);
      }
      return peak;
    };
    expect(gust({ tailplane: 1 })).toBeGreaterThan(gust({}));
  });
});

describe('the pilot', () => {
  const ac = AIRCRAFT_LIST[0];

  it('a wounded pilot rolls slower with the same stick, and a dead one cannot steer at all', () => {
    const stick = (i) => ({ ...i, roll: 1 });
    const well = fly(ac, { seconds: 0.6, input: stick });
    const hurt = fly(ac, { seconds: 0.6, input: stick, damage: { pilot: 0.9 } });
    expect(hurt.peakRoll).toBeLessThan(0.8 * well.peakRoll);
    expect(hurt.peakRoll).toBeGreaterThan(0.2 * well.peakRoll);
    const dead = fly(ac, { seconds: 0.6, input: stick, damage: { pilot: 1 } });
    expect(dead.peakRoll * DEG).toBeLessThan(5);
    expect(dead.sim.surfaces.roll).toBe(0);
  });

  it('a dead pilot leaves the throttle where it was and cannot fire', () => {
    const sim = new Simulation();
    const input = sim.start(ac, 1500);
    sim.damage.pilot = 1;
    const t = sim.surfaces.throttle;
    sim.step(DT, { ...input, throttle: 0, fire: true });
    expect(sim.surfaces.throttle).toBe(t);
  });
});

describe('the structure in flight', () => {
  for (const ac of AIRCRAFT_LIST) {
    const limit = ac.structure.ultimateLoad / DAMAGE.safetyFactor;

    it(`${ac.name}: ordinary flying (a minute of 45-degree turns) never damages the wings`, () => {
      const turn = (i, sim, t) => {
        const a = attitude(sim.state);
        return { ...i, roll: Math.max(-1, Math.min(1, 2.5 * (0.78 - a.bank) - 0.8 * sim.state.angularVelocity.x)), pull: 0.2, throttle: 1 };
      };
      const r = fly(ac, { seconds: 60, input: turn, altitude: 3000 });
      expect(r.peakLoad).toBeLessThan(limit);
      expect(r.sim.damage.wing).toEqual({ L: 0, R: 0 });
    });

    it(`${ac.name}: a hard pull-up at speed goes past the limit load and damages the wings`, () => {
      const r = fly(ac, { seconds: 2.5, speed: 0.95 * ac.documented.maxSpeed, altitude: 800, input: (i, sim, t) => ({ ...i, pull: t < 2 ? 1 : 0, throttle: 1 }) });
      expect(r.peakLoad).toBeGreaterThan(limit);
      expect(r.sim.damage.overload).toBeGreaterThan(limit);
      const damaged = r.sim.damage.wing.L > 0 || r.sim.damage.failed.L || r.sim.damage.failed.R;
      expect(damaged).toBe(true);
    });
  }

  it('past the never-exceed speed in a dive the wings are damaged, and well past it a wing breaks off', () => {
    const ac = AIRCRAFT_LIST[0];
    const sim = new Simulation();
    const input = sim.start(ac, 1000);
    const dir = new Vector3(0, 0, -1).applyQuaternion(sim.state.quaternion).setY(-0.2).normalize();
    sim.state.velocity.copy(dir.multiplyScalar(ac.structure.neverExceedSpeed * 1.1));
    for (let i = 0; i < 40; i++) sim.step(DT, input);
    expect(sim.damage.wing.L + sim.damage.wing.R).toBeGreaterThan(0);
    sim.state.velocity.setLength(ac.structure.neverExceedSpeed * 1.3);
    sim.step(DT, input);
    expect(sim.damage.failed.L || sim.damage.failed.R).toBe(true);
  });
});
