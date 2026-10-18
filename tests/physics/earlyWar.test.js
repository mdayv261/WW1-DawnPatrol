import { describe, it, expect } from 'vitest';
import { AIRCRAFT, AIRCRAFT_LIST, ALL_AIRCRAFT, common } from '../../src/aircraft/index.js';
import { Simulation } from '../../src/core/simulation.js';
import { commonFor, warpAuthority } from '../../src/physics/aircraftCommon.js';
import { evaluate } from '../../src/physics/flightModel.js';
import { levelState } from '../../src/physics/trim.js';
import { createSurfaces } from '../../src/physics/controls.js';
import { altitudePowerFactor, altitudeRpmFactor, enginePower } from '../../src/physics/engine.js';
import { atmosphere } from '../../src/physics/atmosphere.js';
import { wingLevels } from '../../src/physics/wingLevels.js';
import { gearGeometry } from '../../src/physics/ground.js';
import { createDamage, stepDamage, lowerWingLoss, damageLines } from '../../src/physics/damage.js';
import { ISA } from '../../src/core/constants.js';
import { stallAndSpin } from '../helpers/flight.js';

// The Early War aircraft's own flight-model features (phase E1): wing warping, the all-moving
// tail, the monoplane wing position, the U.III's loss of revs with height and the Nieuport's
// weak lower wing. Thresholds come from measured runs of the estimated values, so they guard
// the behaviour against accidental change.

const e4 = AIRCRAFT.e4;
const n11 = AIRCRAFT.n11;
const RAD = 180 / Math.PI;

// Peak roll and pitch rates (deg/s) in the first 2 s of a held input, from trimmed level flight.
function response(ac, speed, input) {
  const sim = new Simulation();
  const base = sim.start(ac, 1000, speed);
  let roll = 0;
  let pitch = 0;
  for (let i = 0; i < 240; i++) {
    sim.step(1 / 120, { ...base, ...input });
    roll = Math.max(roll, Math.abs(sim.state.angularVelocity.x) * RAD);
    pitch = Math.max(pitch, Math.abs(sim.state.angularVelocity.z) * RAD);
  }
  return { roll, pitch };
}

describe('registry', () => {
  it('has the Early War pair beside the Late War four, with eras', () => {
    expect(ALL_AIRCRAFT.map((a) => a.id)).toEqual(['camel', 'spad13', 'dr1', 'albatros', 'e4', 'n11']);
    for (const a of AIRCRAFT_LIST) expect(a.era).toBe('late');
    expect([e4.era, n11.era]).toEqual(['early', 'early']);
    expect([e4.side, n11.side]).toEqual(['Central', 'Allied']);
  });

  it('keeps the Early War aircraft out of the menus until era selection (phase E4)', () => {
    expect(AIRCRAFT_LIST).toHaveLength(4);
  });
});

describe('per-aircraft control values', () => {
  it('give every aircraft without a controls block the very same shared object', () => {
    for (const ac of [...AIRCRAFT_LIST, n11]) expect(commonFor(ac, common)).toBe(common);
  });

  it("give the E.IV its own values over the shared ones, and the same copy each time", () => {
    const c = commonFor(e4, common);
    expect(c).not.toBe(common);
    expect(c).toBe(commonFor(e4, common));
    expect(commonFor(e4, c)).toBe(c); // a merged copy passed back in is used as it is
    expect(c.clDeltaRoll).toBe(e4.controls.clDeltaRoll);
    expect(c.cmDeltaPull).toBe(e4.controls.cmDeltaPull);
    expect(c.surfaceRate).toBe(common.surfaceRate); // shared values it does not override
  });
});

describe('wing warping (Fokker E.IV)', () => {
  it('rolls much more slowly than the aileron aircraft at cruise', () => {
    const rate = (ac) => response(ac, 0.8 * ac.documented.maxSpeed, { roll: 1 }).roll;
    expect(rate(e4)).toBeLessThan(0.7 * rate(n11));
    expect(rate(e4)).toBeLessThan(0.7 * rate(AIRCRAFT.camel));
    expect(rate(e4)).toBeLessThan(0.7 * rate(AIRCRAFT.albatros));
    expect(rate(e4)).toBeGreaterThan(35); // but it still rolls usefully (about 46 deg/s, measured)
  });

  it('gets little quicker in a fast dive, where aileron aircraft roll much faster', () => {
    const gain = (ac) => response(ac, 1.3 * ac.documented.maxSpeed, { roll: 1 }).roll / response(ac, 0.8 * ac.documented.maxSpeed, { roll: 1 }).roll;
    expect(gain(e4)).toBeLessThan(1.25);
    expect(gain(AIRCRAFT.camel)).toBeGreaterThan(1.3);
    expect(gain(n11)).toBeGreaterThan(1.3);
  });

  it('lets the pilot hold full warp only up to the force limit speed', () => {
    const c = commonFor(e4, common);
    const q = (v) => 0.5 * ISA.RHO0 * v * v;
    expect(warpAuthority(c, q(35), ISA.RHO0)).toBe(1);
    expect(warpAuthority(c, q(e4.documented.maxSpeed), ISA.RHO0)).toBeCloseTo(0.89, 2);
    expect(warpAuthority(c, q(60), ISA.RHO0)).toBeLessThan(0.5);
    expect(warpAuthority(common, q(60), ISA.RHO0)).toBe(1); // ailerons: no limit
  });

  it('makes extra drag while the wing is warped; ailerons do not', () => {
    const drag = (ac, roll) => {
      const s = createSurfaces();
      s.roll = roll;
      return evaluate(ac, common, levelState(1000, 40, 0.05), s).diag.drag;
    };
    expect(drag(e4, 1)).toBeGreaterThan(drag(e4, 0) * 1.05);
    expect(drag(AIRCRAFT.camel, 1)).toBeCloseTo(drag(AIRCRAFT.camel, 0), 6);
  });

  it('moves the warp more slowly than the shared control speed', () => {
    const sim = new Simulation();
    const base = sim.start(e4);
    sim.step(0.1, { ...base, roll: 1, pull: 1 });
    expect(sim.surfaces.roll).toBeCloseTo(e4.controls.rollRate * 0.1, 6);
    expect(sim.surfaces.pull).toBeCloseTo(Math.min(1, base.pull + common.surfaceRate * 0.1), 6);
  });
});

describe('all-moving tail (Fokker E.IV)', () => {
  it('pitches faster for the same stick than an aircraft with a fixed tailplane', () => {
    const rate = (ac) => response(ac, 0.8 * ac.documented.maxSpeed, { pull: 0.3 }).pitch;
    expect(rate(e4)).toBeGreaterThan(1.15 * rate(AIRCRAFT.albatros));
  });

  it('bunts over into an inverted stall if the stick is held forward in a stall recovery', () => {
    const held = stallAndSpin(e4, { recoverAt: 4, forward: 0.3, seconds: 14, recoverThrottle: 1, levelWings: true });
    const eased = stallAndSpin(e4, { recoverAt: 4, forward: 0.3, seconds: 14, recoverThrottle: 1, levelWings: true, easeOff: true });
    expect(held.stall).toBeGreaterThan(0.9);
    expect(eased.stall).toBeLessThan(0.2);
  });

  it('is the least stable in pitch of all the aircraft', () => {
    for (const ac of ALL_AIRCRAFT.filter((a) => a !== e4)) expect(e4.aero.staticMargin).toBeLessThan(ac.aero.staticMargin);
  });
});

describe('monoplane and sesquiplane geometry', () => {
  it("puts the E.IV's single wing at the shoulder, below the overall height", () => {
    const levels = wingLevels(e4, common);
    expect(levels).toHaveLength(1);
    const g = gearGeometry(e4, common);
    expect(levels[0].root).toBeCloseTo(g.contactY + e4.visual.wingHeight, 6);
    expect(levels[0].root).toBeLessThan(g.contactY + e4.geometry.height - 0.5);
  });

  it("gives the Nieuport a narrow lower wing of shorter span, with dihedral", () => {
    const [upper, lower] = wingLevels(n11, common);
    expect(lower.span).toBeLessThan(upper.span);
    expect(lower.chord).toBeCloseTo(0.7, 6);
    expect(lower.tip).toBeGreaterThan(lower.root);
  });
});

describe('Oberursel U.III loss of revs with height', () => {
  const rho = (h) => atmosphere(h).density;

  it('is nothing at sea level and the sourced loss at its altitude', () => {
    expect(altitudeRpmFactor(e4, rho(0))).toBe(1);
    expect(altitudeRpmFactor(e4, rho(3000))).toBeCloseTo(1 - 45 / 1200, 9);
    expect(altitudeRpmFactor(e4, rho(4000))).toBeLessThan(altitudeRpmFactor(e4, rho(3000)));
  });

  it('cuts the power at height on top of the shared law; other engines are unchanged', () => {
    expect(enginePower(e4, common, 1, rho(3000))).toBeCloseTo(e4.engine.ratedPower * altitudePowerFactor(rho(3000)) * (1 - 45 / 1200), 3);
    for (const ac of [...AIRCRAFT_LIST, n11]) expect(altitudeRpmFactor(ac, rho(3000))).toBe(1);
  });
});

describe('weak lower wing (Nieuport 11)', () => {
  const diag = (speed, loadFactor = 1) => ({ speed, loadFactor, power: 0, density: 1 });

  it('takes damage past its own lower speed limit while the main wings are unhurt', () => {
    const d = createDamage();
    for (let i = 0; i < 120; i++) stepDamage(n11, d, diag(56), 1 / 120);
    expect(d.lower.L).toBeGreaterThan(0);
    expect(d.lower.R).toBeGreaterThan(0);
    expect(d.wing).toEqual({ L: 0, R: 0 });
  });

  it('breaks away well past its limit, and takes a third of that side\'s lift with it', () => {
    const d = createDamage();
    stepDamage(n11, d, diag(66), 1 / 120);
    expect(d.lowerFailed.L || d.lowerFailed.R).toBe(true);
    expect(d.events.some((e) => e.includes('lower wing broke away'))).toBe(true);
    const side = d.lowerFailed.L ? 'L' : 'R';
    expect(lowerWingLoss(n11, d, side)).toBeCloseTo(n11.structure.lowerWing.liftShare, 9);
    expect(damageLines(d, n11)[0]).toContain('lower wing GONE');
  });

  it('breaks under load as well as speed', () => {
    const d = createDamage();
    stepDamage(n11, d, diag(40, 5.6), 1 / 120);
    expect(d.lowerFailed.L || d.lowerFailed.R).toBe(true);
  });

  it('does not exist on any other aircraft', () => {
    for (const ac of ALL_AIRCRAFT.filter((a) => a !== n11)) {
      const d = createDamage();
      for (let i = 0; i < 120; i++) stepDamage(ac, d, diag(ac.structure.neverExceedSpeed * 0.99, 1), 1 / 120);
      expect(d.lower).toEqual({ L: 0, R: 0 });
      d.lower.L = 1;
      expect(lowerWingLoss(ac, d, 'L')).toBe(0);
    }
  });

  it('a Nieuport that has lost a lower wing rolls toward it', () => {
    const fly = (lose) => {
      const sim = new Simulation();
      const base = sim.start(n11);
      if (lose) sim.damage.lower.R = 1;
      if (lose) sim.damage.lowerFailed.R = true;
      for (let i = 0; i < 120; i++) sim.step(1 / 120, base);
      return sim.state.angularVelocity.x; // + = right wing down
    };
    expect(fly(true)).toBeGreaterThan(fly(false) + 0.05);
  });
});
