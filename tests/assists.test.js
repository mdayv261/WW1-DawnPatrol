import { describe, it, expect } from 'vitest';
import { Simulation } from '../src/core/simulation.js';
import { AIRCRAFT, AIRCRAFT_LIST, common } from '../src/aircraft/index.js';
import { attitude } from '../src/dev/flightScenarios.js';
import { createAutoRudder } from '../src/physics/assists.js';
import { warnings, warningLines, warningSound, limitLoad } from '../src/game/warnings.js';
import { wingConstants } from '../src/physics/aero.js';
import { createDamage, stepDamage } from '../src/physics/damage.js';
import { WARNINGS, AUTO_RUDDER } from '../src/aircraft/assists.js';
import { WARNING_SOUND } from '../src/aircraft/sounds.js';
import { cleanOptions, DEFAULT_OPTIONS } from '../src/game/options.js';

// Phase 7, checkpoint 2: auto-rudder, the stall / G / overspeed warnings and the structural
// damage switch (all on the Options screen).

const DEG = 180 / Math.PI;
const DT = 1 / 120;
const clamp = (v) => Math.max(-1, Math.min(1, v));
const motionOf = (state) => {
  const a = attitude(state);
  return { yawRate: -state.angularVelocity.y, rollRate: state.angularVelocity.x, bank: a.bank, pitch: a.pitch };
};

// A scripted pilot holds a 30-degree bank and the height, hands off the rudder (unless the
// auto-rudder works it). Returns the mean sideslip (degrees) from 4 s to 12 s.
function bankedTurn(ac, side, auto, speed = 0.8 * ac.documented.maxSpeed) {
  const sim = new Simulation();
  const input = { ...sim.start(ac, 1000, speed), fire: false, throttle: 1 };
  const ar = createAutoRudder();
  let sum = 0;
  let n = 0;
  for (let i = 0; i < 12 * 120; i++) {
    const t = i * DT;
    const a = attitude(sim.state);
    input.roll = clamp(2.5 * ((t < 1 ? 0 : (side * 30) / DEG) - a.bank) - 0.3 * sim.state.angularVelocity.x);
    input.pull = clamp(0.03 * -sim.state.velocity.y + 0.1);
    sim.step(DT, auto ? ar.apply(input, sim.diag, DT, motionOf(sim.state)) : input);
    if (t > 4) {
      sum += Math.abs(sim.diag.beta);
      n++;
    }
  }
  return (sum / n) * DEG;
}

// Full throttle from the airfield, tail up then lift off, hands off the rudder.
function takeOff(ac, auto) {
  const sim = new Simulation();
  const input = { ...sim.startOnGround(ac), fire: false, throttle: 1 };
  const ar = createAutoRudder();
  const h0 = attitude(sim.state).heading;
  let swing = 0;
  for (let i = 0; i < 25 * 120; i++) {
    const a = attitude(sim.state);
    const pitch = (sim.diag?.speed ?? 0) < 20 ? 0 : 6 / DEG;
    input.pull = clamp(3 * (pitch - a.pitch) - 0.5 * sim.state.angularVelocity.z);
    input.roll = clamp(-2 * a.bank);
    sim.step(DT, auto ? ar.apply(input, sim.diag, DT, motionOf(sim.state)) : input);
    if (sim.crashed) return { crashed: sim.crashReason, swing };
    const d = a.heading - h0;
    swing = Math.max(swing, Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) * DEG);
  }
  return { crashed: null, swing, height: sim.state.position.y };
}

describe('auto-rudder', () => {
  it('keeps the slip ball centred in a 30-degree turn, both ways, in every aircraft', () => {
    for (const ac of AIRCRAFT_LIST) {
      for (const side of [1, -1]) {
        const off = bankedTurn(ac, side, false);
        const on = bankedTurn(ac, side, true);
        expect(on, `${ac.id} ${side}`).toBeLessThan(0.4);
        expect(on, `${ac.id} ${side}`).toBeLessThan(off * 0.5);
      }
    }
  });

  it('stays steady when slow and when fast (no rudder hunting)', () => {
    for (const ac of AIRCRAFT_LIST) {
      for (const speed of [30, 0.95 * ac.structure.neverExceedSpeed]) {
        expect(bankedTurn(ac, 1, true, speed), `${ac.id} ${speed}`).toBeLessThan(0.5);
      }
    }
  });

  it('keeps every aircraft straight on the take-off run (without it, a hands-off take-off ground-loops)', () => {
    for (const ac of AIRCRAFT_LIST) {
      const on = takeOff(ac, true);
      expect(on.crashed, ac.id).toBeNull();
      expect(on.swing, ac.id).toBeLessThan(20);
      expect(on.height, ac.id).toBeGreaterThan(15);
      expect(takeOff(ac, false).crashed, ac.id).not.toBeNull();
    }
  });

  it('gives way to the pilot\'s own rudder at once', () => {
    const ar = createAutoRudder();
    const diag = { beta: 0.1, speed: 40, onGround: false };
    expect(ar.apply({ yaw: 0 }, diag, DT).yaw).not.toBe(0);
    const mine = { yaw: -0.5 };
    expect(ar.apply(mine, diag, DT)).toBe(mine);
    expect(ar.apply({ yaw: 0 }, null, DT).yaw).toBe(0); // no flight yet
  });

  it('is firmer slow than fast (the rudder bites with the square of the speed)', () => {
    const slow = createAutoRudder().apply({ yaw: 0 }, { beta: 0.02, speed: 25, onGround: false }, DT).yaw;
    const fast = createAutoRudder().apply({ yaw: 0 }, { beta: 0.02, speed: 70, onGround: false }, DT).yaw;
    expect(slow).toBeGreaterThan(fast * 3);
    expect(AUTO_RUDDER.override).toBeLessThan(0.05);
  });
});

describe('warnings', () => {
  const ac = AIRCRAFT.camel;
  const stallAlpha = common.alphaZeroLift + wingConstants(ac, common).stallAngle;
  const flying = (over) => ({ alpha: 0.05, speed: 40, density: 1, loadFactor: 1, onGround: false, ...over });
  const all = { stall: true, g: true };

  it('warns of the stall a little before it, not in normal flight, on the ground or slow', () => {
    expect(warnings(ac, common, flying({ alpha: stallAlpha - 1 / DEG }), all).stall).toBe(true);
    expect(warnings(ac, common, flying({ alpha: stallAlpha - 3 / DEG }), all).stall).toBe(false);
    expect(warnings(ac, common, flying({ alpha: -stallAlpha + 2 * common.alphaZeroLift }), all).stall).toBe(true); // pushed into a negative stall
    expect(warnings(ac, common, flying({ alpha: stallAlpha, onGround: true }), all).stall).toBe(false);
    expect(warnings(ac, common, flying({ alpha: stallAlpha, speed: WARNINGS.minSpeed - 1 }), all).stall).toBe(false);
    expect(warnings(ac, common, flying({ alpha: stallAlpha }), { stall: false, g: true }).stall).toBe(false);
  });

  it('warns of g from 85% of the load where damage starts, and loudly beyond it, each aircraft\'s own limit', () => {
    for (const a of AIRCRAFT_LIST) {
      const limit = limitLoad(a);
      expect(limit).toBeCloseTo(a.structure.ultimateLoad / 1.8, 9);
      expect(warnings(a, common, flying({ loadFactor: 0.8 * limit }), all).load).toBeNull();
      expect(warnings(a, common, flying({ loadFactor: 0.9 * limit }), all).load).toBe('caution');
      expect(warnings(a, common, flying({ loadFactor: 1.05 * limit }), all).load).toBe('over');
      expect(warnings(a, common, flying({ loadFactor: -1.05 * limit }), all).load).toBe('over'); // pushing too
      expect(warnings(a, common, flying({ loadFactor: 1.05 * limit }), { stall: true, g: false }).load).toBeNull();
    }
  });

  it('warns of overspeed near the never-exceed speed, by the speed the structure feels (less in thin air)', () => {
    const vne = ac.structure.neverExceedSpeed;
    expect(warnings(ac, common, flying({ speed: 0.9 * vne }), all).speed).toBeNull();
    expect(warnings(ac, common, flying({ speed: 0.97 * vne }), all).speed).toBe('caution');
    expect(warnings(ac, common, flying({ speed: 1.02 * vne }), all).speed).toBe('over');
    expect(warnings(ac, common, flying({ speed: 1.02 * vne, density: 0.7 }), all).speed).toBeNull(); // high up
  });

  it('shows the most urgent first, says when the airframe is being damaged, and sounds only the dangers', () => {
    const w = { stall: true, load: 'over', speed: 'caution', structure: true };
    expect(warningLines(w)).toEqual([
      { text: 'OVER G: AIRFRAME DAMAGE', level: 'danger' },
      { text: 'STALL', level: 'danger' },
      { text: 'HIGH SPEED', level: 'caution' },
    ]);
    expect(warningLines({ ...w, structure: false })[0].text).toBe('OVER G'); // damage switched off
    expect(warningSound(w)).toBe('damage');
    expect(warningSound({ stall: true, load: 'caution', speed: null })).toBe('stall');
    expect(warningSound({ stall: false, load: 'caution', speed: 'caution' })).toBeNull();
    expect(warningLines({ stall: false, load: null, speed: null })).toEqual([]);
    expect(WARNING_SOUND.stall.pitch).toBeGreaterThan(WARNING_SOUND.damage.pitch);
  });
});

describe('structural damage switch', () => {
  const ac = AIRCRAFT.camel;
  const pull = { speed: 50, density: 1, loadFactor: 9, power: 0 };

  it('on: a 9 g pull breaks a wing; off: the wings are untouched (fuel still burns)', () => {
    const on = createDamage();
    stepDamage(ac, on, pull, 0.5);
    expect(on.failed.L || on.failed.R).toBe(true);
    const off = createDamage();
    for (let i = 0; i < 120; i++) stepDamage(ac, off, { ...pull, power: 80000 }, DT, false);
    expect(off.wing).toEqual({ L: 0, R: 0 });
    expect(off.failed.L || off.failed.R).toBe(false);
    expect(off.fuel).toBeLessThan(1);
  });

  it('the simulation passes the switch on (a hard pull at speed in flight)', () => {
    const run = (structure) => {
      const sim = new Simulation();
      sim.structuralDamage = structure;
      const input = { ...sim.start(ac, 1500, 0.95 * ac.structure.neverExceedSpeed), fire: false, pull: 1 };
      for (let i = 0; i < 240; i++) sim.step(DT, input);
      return sim.damage.wing.L + sim.damage.wing.R;
    };
    expect(run(true)).toBeGreaterThan(0);
    expect(run(false)).toBe(0);
  });
});

describe('the options', () => {
  it('the assists start off and structural damage on; they are cleaned like the others', () => {
    expect(DEFAULT_OPTIONS).toMatchObject({ autoRudder: false, stallWarning: false, gWarning: false, structuralDamage: true });
    expect(cleanOptions({ autoRudder: true, stallWarning: 'yes', structuralDamage: false })).toMatchObject({ autoRudder: true, stallWarning: false, structuralDamage: false });
  });
});

describe('auto-rudder in hard manoeuvring (product owner: the first version set up yaw oscillations)', () => {
  // Hard reversals: full aileron toward a 60-degree bank one way, then the other every 3 s,
  // with the stick held back, for 24 s. Counts the sideslip's swings from side to side
  // (each beyond 3 degrees) and the physics steps spent stalled.
  function reversals(ac, auto, pull, cfg) {
    const sim = new Simulation();
    const input = { ...sim.start(ac, 1500, 0.9 * ac.documented.maxSpeed), fire: false, throttle: 1 };
    const ar = createAutoRudder(cfg);
    let swings = 0;
    let side = 0;
    let peak = 0;
    let stalled = 0;
    for (let i = 0; i < 24 * 120; i++) {
      const t = i * DT;
      const a = attitude(sim.state);
      const err = ((Math.floor(t / 3) % 2 ? -1 : 1) * 60) / DEG - a.bank;
      input.roll = Math.abs(err) > 0.3 ? Math.sign(err) : clamp(1.5 * err - 0.2 * sim.state.angularVelocity.x);
      input.pull = pull;
      sim.step(DT, auto ? ar.apply(input, sim.diag, DT, motionOf(sim.state)) : input);
      if (t < 1) continue;
      const b = sim.diag.beta * DEG;
      peak = Math.max(peak, Math.abs(b));
      if (Math.abs(b) > 0.5 && Math.sign(b) !== side) {
        if (peak > 3) swings++;
        side = Math.sign(b);
        peak = 0;
      }
      if (sim.diag.stall > 0.5) stalled++;
    }
    return { swings, stalled };
  }

  it('does not add yaw swings in hard reversals (no more than flying without it), in every aircraft', () => {
    let off = 0;
    let on = 0;
    let oldOn = 0;
    let stalledOff = 0;
    let stalledOn = 0;
    const old = { ...AUTO_RUDDER, slipGain: 6, yawDamping: 0, rollLead: 0, smoothing: 1e-6, authority: 1, rollRateHold: 1e9 };
    for (const ac of AIRCRAFT_LIST) {
      for (const pull of [0.4, 0.7]) {
        const without = reversals(ac, false, pull);
        const withIt = reversals(ac, true, pull);
        off += without.swings;
        on += withIt.swings;
        oldOn += reversals(ac, true, pull, old).swings;
        expect(withIt.swings, `${ac.id} ${pull}`).toBeLessThanOrEqual(without.swings + 2);
        stalledOff += without.stalled;
        stalledOn += withIt.stalled;
      }
    }
    expect(on).toBeLessThanOrEqual(off);
    expect(stalledOn).toBeLessThanOrEqual(stalledOff); // in all, no more time stalled either
    expect(oldOn).toBeGreaterThan(off * 1.4); // the first version did oscillate
  });

  it('lets go of the rudder in a stall, and never uses more than its share in the air', () => {
    const ar = createAutoRudder();
    const big = { beta: 0.3, speed: 30, onGround: false, stall: 0 };
    expect(Math.abs(ar.apply({ yaw: 0 }, big, DT).yaw)).toBeLessThanOrEqual(AUTO_RUDDER.authority + 1e-9);
    expect(createAutoRudder().apply({ yaw: 0 }, { ...big, stall: 1 }, DT).yaw).toBeCloseTo(0, 9);
  });
});
