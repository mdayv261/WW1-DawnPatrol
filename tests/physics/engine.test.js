import { describe, it, expect } from 'vitest';
import { enginePower, engineOmega, propellerThrust, rotaryEffects, torqueRigging } from '../../src/physics/engine.js';
import { createSurfaces, updateSurfaces, deflections, createInput } from '../../src/physics/controls.js';
import { AIRCRAFT_LIST, AIRCRAFT, common } from '../../src/aircraft/index.js';
import { ISA, G } from '../../src/core/constants.js';

const RHO0 = ISA.RHO0;

describe('engine power', () => {
  it('gives rated power at full throttle at sea level', () => {
    for (const ac of AIRCRAFT_LIST) expect(enginePower(ac, common, 1, RHO0)).toBeCloseTo(ac.engine.ratedPower, 3);
  });

  it('falls in proportion to air density', () => {
    for (const ac of AIRCRAFT_LIST) {
      expect(enginePower(ac, common, 1, RHO0 / 2) / enginePower(ac, common, 1, RHO0)).toBeCloseTo(0.5, 6);
    }
  });

  it('idles at the idle fraction and rises with throttle', () => {
    const ac = AIRCRAFT.camel;
    expect(enginePower(ac, common, 0, RHO0) / ac.engine.ratedPower).toBeCloseTo(common.idlePowerFraction, 6);
    expect(enginePower(ac, common, 0.5, RHO0)).toBeGreaterThan(enginePower(ac, common, 0.2, RHO0));
  });

  it('turns at the rated rpm at full throttle', () => {
    for (const ac of AIRCRAFT_LIST) {
      expect((engineOmega(ac, common, 1) * 60) / (2 * Math.PI)).toBeCloseTo(ac.engine.ratedRpm, 3);
    }
  });
});

describe('propeller thrust', () => {
  it('never creates more power than the engine supplies', () => {
    for (const ac of AIRCRAFT_LIST) {
      const p = ac.engine.ratedPower;
      for (let v = 5; v <= 1.2 * ac.documented.maxSpeed; v += 5) {
        const t = propellerThrust(ac, common, p, v, RHO0);
        expect(t * v).toBeLessThanOrEqual(common.propEfficiencyPeak * p * 1.001);
      }
    }
  });

  it('has a sensible static thrust (about 35% to 85% of weight)', () => {
    for (const ac of AIRCRAFT_LIST) {
      const t = propellerThrust(ac, common, ac.engine.ratedPower, 0, RHO0);
      const weight = ac.mass.loaded * G;
      expect(t / weight).toBeGreaterThan(0.35);
      expect(t / weight).toBeLessThan(0.85);
    }
  });

  it('thrust falls with airspeed above the design speed', () => {
    const ac = AIRCRAFT.spad13;
    const p = ac.engine.ratedPower;
    expect(propellerThrust(ac, common, p, 60, RHO0)).toBeLessThan(propellerThrust(ac, common, p, 40, RHO0));
  });

  it('is zero with no power and falls with thinner air', () => {
    const ac = AIRCRAFT.camel;
    expect(propellerThrust(ac, common, 0, 30, RHO0)).toBe(0);
    const p = ac.engine.ratedPower;
    expect(propellerThrust(ac, common, p, 0, RHO0 / 2)).toBeLessThan(propellerThrust(ac, common, p, 0, RHO0));
  });
});

describe('rotary engine effects', () => {
  it('rotary aircraft carry angular momentum forward and a reaction torque that rolls left', () => {
    for (const ac of [AIRCRAFT.camel, AIRCRAFT.dr1]) {
      const e = rotaryEffects(ac, common, 1, enginePower(ac, common, 1, RHO0));
      expect(e.momentum).toBeGreaterThan(0); // clockwise from the cockpit
      expect(e.torque).toBeLessThan(0); // left wing down
    }
  });

  it('camel angular momentum matches inertia x rated speed', () => {
    const ac = AIRCRAFT.camel;
    const e = rotaryEffects(ac, common, 1, 0);
    expect(e.momentum).toBeCloseTo(ac.engine.rotatingInertia * ((1250 * 2 * Math.PI) / 60), 3);
  });

  it('inline-engine aircraft have no torque, gyro or rigging terms', () => {
    for (const ac of [AIRCRAFT.spad13, AIRCRAFT.albatros]) {
      const e = rotaryEffects(ac, common, 1, enginePower(ac, common, 1, RHO0));
      expect(e.momentum).toBe(0);
      expect(e.torque).toBe(0);
      expect(torqueRigging(ac, common)).toBe(0);
    }
  });

  it('the rigging cancels most, but not all, of the torque at cruise power', () => {
    const ac = AIRCRAFT.camel;
    const p = enginePower(ac, common, 0.6, RHO0);
    const torque = rotaryEffects(ac, common, 0.6, p).torque;
    const net = torque + torqueRigging(ac, common);
    expect(Math.abs(net)).toBeLessThan(0.25 * Math.abs(torque));
    expect(Math.abs(net)).toBeGreaterThan(0);
  });
});

describe('controls', () => {
  it('moves surfaces no faster than the travel rate', () => {
    const s = createSurfaces();
    const input = createInput();
    input.pull = 1;
    updateSurfaces(s, input, common, 0.1);
    expect(s.pull).toBeCloseTo(common.surfaceRate * 0.1, 6);
  });

  it('reaches the commanded position and stops there', () => {
    const s = createSurfaces();
    const input = createInput();
    input.roll = -0.5;
    for (let i = 0; i < 120; i++) updateSurfaces(s, input, common, 1 / 120);
    expect(s.roll).toBe(-0.5);
  });

  it('clamps out-of-range input', () => {
    const s = createSurfaces();
    const input = createInput();
    input.pull = 5;
    input.throttle = 3;
    input.trim = -4;
    for (let i = 0; i < 240; i++) updateSurfaces(s, input, common, 1 / 120);
    expect(s.pull).toBe(1);
    expect(s.throttle).toBe(1);
    expect(s.trim).toBe(-1);
  });

  it('trim adds to the elevator, within travel limits', () => {
    const s = createSurfaces();
    s.trim = 0.5;
    expect(deflections(common, s).pull).toBeCloseTo(0.5 * common.trimAuthority * common.maxPull, 6);
    s.pull = 1;
    s.trim = 1;
    expect(deflections(common, s).pull).toBeCloseTo(common.maxPull, 6);
  });
});
