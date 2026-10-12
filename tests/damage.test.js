import { describe, it, expect } from 'vitest';
import { AIRCRAFT_LIST, common } from '../src/aircraft/index.js';
import { DAMAGE } from '../src/aircraft/damageModel.js';
import { createSurfaces } from '../src/physics/controls.js';
import {
  createDamage, resetDamage, applyHit, destroyedReason, wingLoss, powerFactor, stoppedPropDrag, stoppedPropRpm,
  filterInput, controlSpeed, damagedDeflections, stepDamage, applyTestDamage, TEST_DAMAGE, damageLines, pilotDead,
} from '../src/physics/damage.js';

// The damage state: hits, what they do to each part, fuel, structure.

const REF = DAMAGE.energyRef;
const ac = AIRCRAFT_LIST[0];
const always = () => 0; // a random number below every chance
const never = () => 0.999;

describe('a new damage state', () => {
  it('is sound everywhere with a full tank and nothing to report', () => {
    const d = createDamage();
    expect(d.wing).toEqual({ L: 0, R: 0 });
    expect([d.engine, d.tank, d.pilot, d.tailplane, d.fin]).toEqual([0, 0, 0, 0, 0]);
    expect(d.cables).toEqual({ aileron: null, elevator: null, rudder: null });
    expect(d.fuel).toBe(1);
    expect(d.events).toEqual([]);
    expect(destroyedReason(d)).toBeNull();
    expect(wingLoss(d, 'L')).toBe(0);
    expect(powerFactor(d)).toBe(1);
    expect(stoppedPropDrag(ac, d, 1000)).toBe(0);
    expect(controlSpeed(d)).toBe(1);
  });

  it('resetDamage puts one back in place', () => {
    const d = createDamage();
    const same = d;
    applyHit(d, 'engine', REF * 5, never);
    d.fuel = 0.2;
    resetDamage(d);
    expect(d).toBe(same);
    expect(d.engine).toBe(0);
    expect(d.fuel).toBe(1);
  });
});

describe('hits', () => {
  it('hurt the part they land on, by their energy: n reference hits take n / hitsToDestroy', () => {
    const cases = [['wingL', (d) => d.wing.L, 'wing'], ['wingR', (d) => d.wing.R, 'wing'], ['engine', (d) => d.engine, 'engine'], ['fuel', (d) => d.tank, 'tank'],
      ['pilot', (d) => d.pilot, 'pilot'], ['tailplane', (d) => d.tailplane, 'tailplane'], ['fin', (d) => d.fin, 'fin']];
    for (const [zone, read, key] of cases) {
      const d = createDamage();
      applyHit(d, zone, REF * 2, never);
      expect(read(d), zone).toBeCloseTo(2 / DAMAGE.hitsToDestroy[key], 9);
      applyHit(d, zone, REF, never);
      expect(read(d), zone).toBeCloseTo(3 / DAMAGE.hitsToDestroy[key], 9);
    }
  });

  it('hits on the left and right wing are kept apart, and a fuselage hit hurts no part', () => {
    const d = createDamage();
    applyHit(d, 'wingR', REF, never);
    expect(d.wing.L).toBe(0);
    applyHit(d, 'fuselage', REF * 10, never);
    expect([d.engine, d.tank, d.pilot, d.tailplane, d.fin, d.wing.L]).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('a part cannot go beyond fully destroyed; a wing at 1 has failed and says so once', () => {
    const d = createDamage();
    const nothing = () => 5; // never cuts a cable
    applyHit(d, 'wingR', REF * 100, nothing);
    expect(d.wing.R).toBe(1);
    expect(d.failed.R).toBe(true);
    expect(d.events).toEqual(['Right wing failed']);
    applyHit(d, 'wingR', REF * 100, nothing);
    expect(d.events.length).toBe(1);
    expect(destroyedReason(d)).toBe('Wing failed');
  });

  it('a tailplane at 1 fails; the pilot at 1 is dead; the engine at 1 is seized', () => {
    const d = createDamage();
    applyHit(d, 'tailplane', REF * 100, never);
    expect(d.failed.tailplane).toBe(true);
    expect(d.events).toContain('Tailplane failed');
    const e = createDamage();
    applyHit(e, 'pilot', REF * 3, never);
    expect(pilotDead(e)).toBe(true);
    expect(destroyedReason(e)).toBe('Pilot killed');
    const f = createDamage();
    applyHit(f, 'engine', REF * 15, never);
    expect(destroyedReason(f)).toBe('Engine seized');
  });

  it('can cut a control cable: wing hits the aileron, tail and fuselage hits the elevator and rudder; the surface stays where it was', () => {
    const surfaces = { ...createSurfaces(), roll: 0.4, pull: -0.2, yaw: 0.1 };
    const d = createDamage();
    applyHit(d, 'wingL', REF, always, surfaces);
    expect(d.cables.aileron).toBe(0.4);
    expect(d.events).toContain('Aileron cable cut');
    applyHit(d, 'fuselage', REF, always, surfaces);
    expect(d.cables.elevator).toBe(-0.2);
    expect(d.cables.rudder).toBe(0.1);
    // A cable already cut stays as it was.
    applyHit(d, 'wingR', REF, always, { ...surfaces, roll: -0.9 });
    expect(d.cables.aileron).toBe(0.4);
  });

  it('a hit does not always cut a cable, and a harder hit cuts more often', () => {
    const cuts = (energy) => {
      let n = 0;
      let seed = 12345;
      const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
      for (let i = 0; i < 4000; i++) {
        const d = createDamage();
        applyHit(d, 'wingL', energy, rng);
        if (d.cables.aileron !== null) n++;
      }
      return n / 4000;
    };
    expect(cuts(REF)).toBeGreaterThan(0.02);
    expect(cuts(REF)).toBeLessThan(0.045);
    expect(cuts(REF * 3)).toBeGreaterThan(cuts(REF));
    const d = createDamage();
    applyHit(d, 'wingL', REF, never);
    expect(d.cables.aileron).toBeNull();
  });
});

describe('what damage does', () => {
  it('a damaged wing loses a share of its lift; a failed wing loses all of it', () => {
    const d = createDamage();
    d.wing.R = 0.5;
    expect(wingLoss(d, 'R')).toBeCloseTo(0.5 * DAMAGE.wingLiftLoss, 9);
    expect(wingLoss(d, 'L')).toBe(0);
    d.wing.R = 1;
    expect(wingLoss(d, 'R')).toBeCloseTo(DAMAGE.wingLiftLoss, 9);
    d.failed.R = true;
    expect(wingLoss(d, 'R')).toBe(1);
  });

  it('engine damage cuts the power; a seized engine or an empty tank gives none', () => {
    const d = createDamage();
    d.engine = 0.5;
    expect(powerFactor(d)).toBeCloseTo(1 - 0.5 * DAMAGE.enginePowerLoss, 9);
    d.engine = 1;
    expect(powerFactor(d)).toBe(0);
    const e = createDamage();
    e.fuel = 0;
    expect(powerFactor(e)).toBe(0);
  });

  it('a seized propeller drags hard, a windmilling one less, in proportion to the dynamic pressure', () => {
    const d = createDamage();
    d.engine = 1;
    const seized = stoppedPropDrag(ac, d, 1000);
    const area = (Math.PI * ac.propeller.diameter ** 2) / 4;
    expect(seized).toBeCloseTo(1000 * area * DAMAGE.seizedPropDrag, 6);
    const e = createDamage();
    e.fuel = 0;
    expect(stoppedPropDrag(ac, e, 1000)).toBeCloseTo(1000 * area * DAMAGE.windmillPropDrag, 6);
    expect(stoppedPropDrag(ac, e, 1000)).toBeLessThan(seized);
    expect(stoppedPropDrag(ac, d, 2000)).toBeCloseTo(2 * seized, 6);
  });

  it('a seized propeller does not turn; a windmilling one turns faster the faster the aircraft flies', () => {
    const d = createDamage();
    d.engine = 1;
    expect(stoppedPropRpm(ac, d, 50)).toBe(0);
    const e = createDamage();
    e.fuel = 0;
    const slow = stoppedPropRpm(ac, e, 20);
    const fast = stoppedPropRpm(ac, e, ac.documented.maxSpeed);
    expect(fast).toBeGreaterThan(slow);
    expect(fast).toBeCloseTo(DAMAGE.windmillRpmFraction * ac.engine.ratedRpm * ac.propeller.gearRatio, 6);
  });

  it('a wounded pilot moves the controls less and slower; a dead pilot leaves everything where it was', () => {
    const surfaces = { ...createSurfaces(), pull: 0.3, roll: -0.2, yaw: 0.1, throttle: 0.7, trim: 0.05 };
    const input = { pull: 1, roll: 1, yaw: 1, throttle: 0.2, trim: 0, fire: true };
    const well = createDamage();
    expect(filterInput(well, input, surfaces)).toBe(input);
    const hurt = createDamage();
    hurt.pilot = 0.6;
    const f = filterInput(hurt, input, surfaces);
    expect(f.pull).toBeCloseTo(1 - DAMAGE.pilotAuthorityLoss * 0.6, 9);
    expect(f.roll).toBeCloseTo(f.pull, 9);
    expect(f.throttle).toBe(0.2);
    expect(f.fire).toBe(true);
    expect(controlSpeed(hurt)).toBeCloseTo(1 - DAMAGE.pilotSlowing * 0.6, 9);
    const dead = createDamage();
    dead.pilot = 1;
    const g = filterInput(dead, input, surfaces);
    expect([g.pull, g.roll, g.yaw, g.throttle, g.trim, g.fire]).toEqual([0.3, -0.2, 0.1, 0.7, 0.05, false]);
  });

  it('a cut cable leaves its surface stuck; a hurt tailplane or fin gives less control; a fresh state changes nothing', () => {
    const defl = { pull: 0.2, roll: -0.1, yaw: 0.15 };
    expect(damagedDeflections(createDamage(), defl, common)).toEqual(defl);
    const d = createDamage();
    d.cables.aileron = 0.5;
    d.cables.elevator = -1;
    const out = damagedDeflections(d, defl, common);
    expect(out.roll).toBeCloseTo(0.5 * common.maxRoll, 9);
    expect(out.pull).toBeCloseTo(-common.maxPull, 9);
    expect(out.yaw).toBe(0.15);
    const e = createDamage();
    e.tailplane = 0.5;
    e.fin = 1;
    const o2 = damagedDeflections(e, defl, common);
    expect(o2.pull).toBeCloseTo(0.2 * (1 - 0.5 * DAMAGE.tailAuthorityLoss), 9);
    expect(o2.yaw).toBeCloseTo(0.15 * (1 - DAMAGE.tailAuthorityLoss), 9);
    expect(o2.roll).toBe(-0.1);
  });
});

describe('fuel', () => {
  const diag = (power) => ({ power, loadFactor: 1, speed: 40, density: 1 });

  it('burns with the power the engine gives: a full-power hour on the Camel uses about 39 kg', () => {
    const d = createDamage();
    for (let i = 0; i < 120 * 60; i++) stepDamage(ac, d, diag(ac.engine.ratedPower), 1 / 120);
    const burned = (1 - d.fuel) * ac.fuel.capacity; // one minute
    expect(burned).toBeCloseTo((ac.engine.ratedPower * DAMAGE.specificFuelConsumption * 60), 2);
    expect((ac.engine.ratedPower * DAMAGE.specificFuelConsumption * 3600)).toBeGreaterThan(38);
    expect((ac.engine.ratedPower * DAMAGE.specificFuelConsumption * 3600)).toBeLessThan(40);
  });

  it('the Camel\'s tank lasts about 2.5 hours at 80% power, the documented endurance', () => {
    const hours = ac.fuel.capacity / (0.8 * ac.engine.ratedPower * DAMAGE.specificFuelConsumption) / 3600;
    expect(hours).toBeGreaterThan(2.3);
    expect(hours).toBeLessThan(2.7);
  });

  it('a holed tank runs dry at the predicted time, with one "out of fuel" message', () => {
    const d = createDamage();
    d.tank = 1;
    let t = 0;
    while (d.fuel > 0 && t < 300) {
      stepDamage(ac, d, diag(0), 1 / 120);
      t += 1 / 120;
    }
    expect(t).toBeCloseTo(1 / DAMAGE.leakRate, 0);
    expect(d.events.filter((e) => e === 'Out of fuel').length).toBe(1);
    for (let i = 0; i < 240; i++) stepDamage(ac, d, diag(0), 1 / 120);
    expect(d.events.filter((e) => e === 'Out of fuel').length).toBe(1);
    expect(powerFactor(d)).toBe(0);
  });

  it('a half-damaged tank leaks half as fast', () => {
    const run = (tank) => {
      const d = createDamage();
      d.tank = tank;
      for (let i = 0; i < 120 * 10; i++) stepDamage(ac, d, diag(0), 1 / 120);
      return 1 - d.fuel;
    };
    expect(run(0.5)).toBeCloseTo(run(1) / 2, 6);
  });
});

describe('structure', () => {
  const at = (load, speed = 40) => ({ power: 0, loadFactor: load, speed, density: 1 });

  for (const a of AIRCRAFT_LIST) {
    describe(a.name, () => {
      const ult = a.structure.ultimateLoad;
      const limit = ult / DAMAGE.safetyFactor;

      it('nothing is damaged at or below the limit load, even for a long time', () => {
        const d = createDamage();
        for (let i = 0; i < 120 * 60; i++) stepDamage(a, d, at(limit), 1 / 120);
        expect(d.wing).toEqual({ L: 0, R: 0 });
        expect(d.overload).toBeCloseTo(limit, 9);
      });

      it('between the limit and the ultimate load both wings take damage, more the harder the pull', () => {
        const run = (n) => {
          const d = createDamage();
          for (let i = 0; i < 120 * 2; i++) stepDamage(a, d, at(n), 1 / 120);
          return d;
        };
        const mild = run(limit + 0.25 * (ult - limit));
        const hard = run(limit + 0.75 * (ult - limit));
        expect(mild.wing.L).toBeGreaterThan(0);
        expect(mild.wing.L).toBeCloseTo(mild.wing.R, 9);
        expect(hard.wing.L).toBeGreaterThan(2 * mild.wing.L);
        expect(hard.failed.L || hard.failed.R).toBe(false);
        expect(mild.wing.L).toBeCloseTo(0.25 * DAMAGE.overloadRate * 2, 3);
      });

      it('at the ultimate load a wing breaks off at once, and negative g counts the same', () => {
        for (const sign of [1, -1]) {
          const d = createDamage();
          stepDamage(a, d, at(sign * ult), 1 / 120);
          expect(d.failed.L || d.failed.R).toBe(true);
          expect(d.events.some((e) => /wing failed/.test(e))).toBe(true);
          expect(destroyedReason(d)).toBe('Wing failed');
        }
      });

      it('past the never-exceed speed the wings take damage, and 25% past it a wing fails (thin air: equivalent speed)', () => {
        const vne = a.structure.neverExceedSpeed;
        const d = createDamage();
        for (let i = 0; i < 120; i++) stepDamage(a, d, at(1, vne * 0.99), 1 / 120);
        expect(d.wing.L).toBe(0);
        const e = createDamage();
        for (let i = 0; i < 120; i++) stepDamage(a, e, at(1, vne * 1.1), 1 / 120);
        expect(e.wing.L).toBeGreaterThan(0);
        expect(e.failed.L || e.failed.R).toBe(false);
        const f = createDamage();
        stepDamage(a, f, at(1, vne * 1.26), 1 / 120);
        expect(f.failed.L || f.failed.R).toBe(true);
        // At altitude the same true speed is a lower equivalent speed: no damage.
        const g = createDamage();
        stepDamage(a, g, { power: 0, loadFactor: 1, speed: vne * 1.3, density: 0.5 }, 1 / 120);
        expect(g.wing.L).toBe(0);
      });
    });
  }

  it('the ultimate loads are in a sensible order and the Dr.I prototype figure is the ceiling', () => {
    const ult = Object.fromEntries(AIRCRAFT_LIST.map((a) => [a.id, a.structure.ultimateLoad]));
    expect(ult.albatros).toBeLessThan(ult.camel);
    expect(Math.max(...Object.values(ult))).toBeLessThanOrEqual(7.92);
  });
});

describe('the test panel\'s damage buttons', () => {
  it('each button does something and Repair puts it all back', () => {
    for (const k of TEST_DAMAGE.filter((x) => x.id !== 'repair')) {
      const d = createDamage();
      applyTestDamage(d, k.id, { ...createSurfaces(), roll: 0.1, pull: 0.1, yaw: 0.1 });
      expect(JSON.stringify(d), k.id).not.toBe(JSON.stringify(createDamage()));
      applyTestDamage(d, 'repair');
      expect(JSON.stringify(d), `${k.id} repaired`).toBe(JSON.stringify(createDamage()));
    }
  });

  it('wound and kill the pilot; the engine can be half hurt or seized; the wings can fail with two presses', () => {
    const d = createDamage();
    applyTestDamage(d, 'wound');
    expect(d.pilot).toBeGreaterThan(0);
    expect(pilotDead(d)).toBe(false);
    applyTestDamage(d, 'kill');
    expect(pilotDead(d)).toBe(true);
    applyTestDamage(d, 'engine');
    expect(d.engine).toBe(0.5);
    applyTestDamage(d, 'seize');
    expect(d.engine).toBe(1);
    applyTestDamage(d, 'wingR');
    applyTestDamage(d, 'wingR');
    expect(d.failed.R).toBe(true);
  });
});

describe('the F3 lines', () => {
  it('say "none" for a sound aircraft and name each damaged part', () => {
    const d = createDamage();
    expect(damageLines(d, ac)[0]).toContain('none');
    d.wing.L = 0.4;
    d.engine = 1;
    d.cables.rudder = 0;
    d.pilot = 0.5;
    const text = damageLines(d, ac).join('\n');
    expect(text).toContain('left wing 40%');
    expect(text).toContain('engine SEIZED');
    expect(text).toContain('rudder cable CUT');
    expect(text).toContain('pilot wounded 50%');
    expect(damageLines(d, ac)[1]).toContain(`breaks ${ac.structure.ultimateLoad}`);
  });
});
