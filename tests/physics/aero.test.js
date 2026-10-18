import { describe, it, expect } from 'vitest';
import { liftDrag, stallFraction, wingConstants, momentCoefficients, sideForce } from '../../src/physics/aero.js';
import { ALL_AIRCRAFT as AIRCRAFT_LIST, AIRCRAFT, common } from '../../src/aircraft/index.js'; // every aircraft with a flight model
import { FLAT_PLATE_CD } from '../../src/core/constants.js';

const camel = AIRCRAFT.camel;
const rest = { alpha: 0, beta: 0, speed: 40, rates: { p: 0, q: 0, r: 0 }, defl: { pull: 0, roll: 0, yaw: 0 }, stall: 0 };

describe('lift and drag', () => {
  it('has zero lift at the zero-lift angle', () => {
    for (const ac of AIRCRAFT_LIST) {
      expect(liftDrag(ac, common, common.alphaZeroLift).cl).toBeCloseTo(0, 6);
    }
  });

  it('lift grows linearly below the stall at the finite-wing slope', () => {
    for (const ac of AIRCRAFT_LIST) {
      const w = wingConstants(ac);
      const a1 = common.alphaZeroLift + 0.05;
      const a2 = common.alphaZeroLift + 0.1;
      const slope = (liftDrag(ac, common, a2).cl - liftDrag(ac, common, a1).cl) / 0.05;
      expect(slope / w.clAlpha).toBeCloseTo(1, 2);
    }
  });

  it('the lift slope is below the thin-airfoil value (finite wing)', () => {
    for (const ac of AIRCRAFT_LIST) expect(wingConstants(ac).clAlpha).toBeLessThan(2 * Math.PI);
  });

  it('reaches close to CLmax just before the stall, and loses lift after it', () => {
    for (const ac of AIRCRAFT_LIST) {
      const w = wingConstants(ac);
      const before = liftDrag(ac, common, common.alphaZeroLift + w.stallAngle - 0.05).cl;
      const after = liftDrag(ac, common, common.alphaZeroLift + w.stallAngle + 0.15).cl;
      expect(before).toBeGreaterThan(0.8 * ac.aero.clMax);
      expect(before).toBeLessThanOrEqual(ac.aero.clMax);
      expect(after).toBeLessThan(0.7 * ac.aero.clMax);
    }
  });

  it('the stall switches on around the stall angle', () => {
    const w = wingConstants(camel);
    const a0 = common.alphaZeroLift;
    expect(stallFraction(camel, common, a0 + w.stallAngle - 0.1)).toBeLessThan(0.05);
    expect(stallFraction(camel, common, a0 + w.stallAngle + 0.1)).toBeGreaterThan(0.95);
  });

  it('also stalls at large negative angles (inverted flight)', () => {
    const w = wingConstants(camel);
    expect(stallFraction(camel, common, common.alphaZeroLift - w.stallAngle - 0.1)).toBeGreaterThan(0.95);
  });

  it('a wing broadside to the wind behaves like a flat plate', () => {
    const r = liftDrag(camel, common, Math.PI / 2);
    expect(Math.abs(r.cl)).toBeLessThan(0.02);
    expect(r.cd).toBeCloseTo(camel.aero.cd0 + FLAT_PLATE_CD, 2);
  });

  it('drag at zero lift equals the parasitic drag coefficient', () => {
    for (const ac of AIRCRAFT_LIST) {
      expect(liftDrag(ac, common, common.alphaZeroLift).cd).toBeCloseTo(ac.aero.cd0, 6);
    }
  });

  it('induced drag follows CL^2 / (pi e AR) below the stall', () => {
    for (const ac of AIRCRAFT_LIST) {
      const w = wingConstants(ac);
      const r = liftDrag(ac, common, common.alphaZeroLift + 0.12);
      expect(r.cd - ac.aero.cd0).toBeCloseTo(w.inducedK * r.cl * r.cl, 5);
    }
  });
});

describe('side force and moments', () => {
  it('sideslip produces a restoring (opposing) side force', () => {
    expect(sideForce(common, 0.1)).toBeLessThan(0);
    expect(sideForce(common, -0.1)).toBeGreaterThan(0);
  });

  it('is statically stable in pitch: more nose-up angle gives a nose-down moment', () => {
    for (const ac of AIRCRAFT_LIST) {
      const m = momentCoefficients(ac, common, { ...rest, alpha: 0.1 });
      expect(m.pitch).toBeLessThan(0);
    }
  });

  it('pulling the stick back gives a nose-up moment', () => {
    const m = momentCoefficients(camel, common, { ...rest, defl: { pull: 0.1, roll: 0, yaw: 0 } });
    expect(m.pitch).toBeGreaterThan(0);
  });

  it('stick right rolls right wing down; right rudder yaws the nose right', () => {
    expect(momentCoefficients(camel, common, { ...rest, defl: { pull: 0, roll: 0.1, yaw: 0 } }).roll).toBeGreaterThan(0);
    expect(momentCoefficients(camel, common, { ...rest, defl: { pull: 0, roll: 0, yaw: 0.1 } }).yaw).toBeGreaterThan(0);
  });

  it('weathercock stability: sideslip from the right yaws the nose right (into the wind)', () => {
    for (const ac of AIRCRAFT_LIST) {
      expect(momentCoefficients(ac, common, { ...rest, beta: 0.1 }).yaw).toBeGreaterThan(0);
    }
  });

  it('damps roll and yaw rates in normal flight', () => {
    expect(momentCoefficients(camel, common, { ...rest, rates: { p: 1, q: 0, r: 0 } }).roll).toBeLessThan(0);
    expect(momentCoefficients(camel, common, { ...rest, rates: { p: 0, q: 0, r: 1 } }).yaw).toBeLessThan(0);
    expect(momentCoefficients(camel, common, { ...rest, rates: { p: 0, q: 1, r: 0 } }).pitch).toBeLessThan(0);
  });

  it('a stalled wing drives roll (autorotation) instead of damping it', () => {
    const m = momentCoefficients(camel, common, { ...rest, stall: 1, rates: { p: 0.3, q: 0, r: 0 } });
    // Remove the fixed rigging bias so we test only the rate-driven part.
    expect(m.roll - common.stallWingDropBias).toBeGreaterThan(0);
  });

  it('autorotation levels off at high roll rate instead of growing without limit', () => {
    const rate = (p) => momentCoefficients(camel, common, { ...rest, stall: 1, rates: { p, q: 0, r: 0 } }).roll;
    expect(rate(3)).toBeLessThan(rate(0.3));
    expect(rate(10)).toBeLessThan(0); // eventually damped
  });

  it('control moments scale with the control deflection', () => {
    const a = momentCoefficients(camel, common, { ...rest, defl: { pull: 0.1, roll: 0, yaw: 0 } }).pitch;
    const b = momentCoefficients(camel, common, { ...rest, defl: { pull: 0.2, roll: 0, yaw: 0 } }).pitch;
    expect(b / a).toBeCloseTo(2, 5);
  });
});
