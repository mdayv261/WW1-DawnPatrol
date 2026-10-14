import { describe, it, expect } from 'vitest';
import { Simulation } from '../../src/core/simulation.js';
import { AIRCRAFT } from '../../src/aircraft/index.js';
import { quantiseInput, encodeInputs, decodeInputs, captureState, restoreState, compactOf, encodeSnapshot, decodeSnapshot, FULL_LENGTH, damageFromSummary } from '../../src/mp/binary.js';
import { applyHit } from '../../src/physics/damage.js';

const flying = () => {
  const sim = new Simulation();
  sim.start(AIRCRAFT.camel, 2000);
  for (let i = 0; i < 60; i++) sim.step(1 / 120, { ...sim.startInput, pull: 0.3, roll: -0.4, yaw: 0.1 });
  return sim;
};

describe('controls on the wire', () => {
  it('are rounded the same way on both ends, and rounding twice changes nothing', () => {
    const raw = { pull: 0.123456789, roll: -0.987654321, yaw: 0.5, throttle: 0.333333, trim: -0.25, fire: 1, clearJam: 0 };
    const q = quantiseInput(raw);
    expect(quantiseInput(q)).toEqual(q);
    expect(Math.abs(q.pull - raw.pull)).toBeLessThan(2e-5);
    const msg = decodeInputs(encodeInputs(1000, 990, [q, q]));
    expect(msg.firstTick).toBe(1000);
    expect(msg.viewTick).toBe(990);
    expect(msg.inputs[0]).toEqual(q); // exactly what the browser flew with
    expect(msg.inputs[1].fire).toBe(true);
  });

  it('out-of-range values are clamped, and malformed bytes refused', () => {
    const q = quantiseInput({ pull: 7, roll: -9, yaw: NaN, throttle: 2, trim: -3 });
    expect(q).toMatchObject({ pull: 1, roll: -1, yaw: 0, throttle: 1, trim: -1 });
    expect(decodeInputs(new ArrayBuffer(3))).toBe(null);
    const good = encodeInputs(5, 0, [q]);
    expect(decodeInputs(good.slice(0, good.byteLength - 1))).toBe(null);
    expect(decodeInputs('text')).toBe(null);
  });
});

describe('full state', () => {
  it('captures and restores everything the next step depends on, exactly', () => {
    const a = flying();
    applyHit(a.damage, 'wingL', 3000, () => 0, a.surfaces); // some damage, a cut cable
    const state = captureState(a);
    expect(state).toHaveLength(FULL_LENGTH);
    const b = new Simulation();
    b.start(AIRCRAFT.camel, 500);
    restoreState(b, state);
    expect(Array.from(captureState(b))).toEqual(Array.from(state));
    // ...so both fly on identically.
    const input = quantiseInput({ pull: 0.2, roll: 0.1, yaw: 0, throttle: 0.8, trim: 0 });
    for (let i = 0; i < 240; i++) {
      a.step(1 / 120, input);
      b.step(1 / 120, input);
    }
    expect(Array.from(captureState(b))).toEqual(Array.from(captureState(a)));
  });
});

describe('snapshots', () => {
  it('carry your aircraft exactly and the others closely', () => {
    const me = flying();
    const other = flying();
    other.state.position.set(-18000, 1500, 15000); // far out: rounding is largest there
    const snap = decodeSnapshot(encodeSnapshot({ tick: 12345, lead: -3, you: { slot: 2, spawn: 3, state: captureState(me) }, others: [compactOf(1, 4, other)] }));
    expect(snap.tick).toBe(12345);
    expect(snap.lead).toBe(-3);
    expect(snap.you.slot).toBe(2);
    expect(snap.you.spawn).toBe(3);
    expect(Array.from(snap.you.state)).toEqual(Array.from(captureState(me)));
    const c = snap.others[0];
    expect(c.slot).toBe(1);
    expect(c.spawn).toBe(4);
    const p = other.state.position;
    expect(Math.hypot(c.position[0] - p.x, c.position[1] - p.y, c.position[2] - p.z)).toBeLessThan(0.01);
    const q = other.state.quaternion;
    const dot = Math.abs(c.quaternion[0] * q.x + c.quaternion[1] * q.y + c.quaternion[2] * q.z + c.quaternion[3] * q.w);
    expect(2 * Math.acos(Math.min(1, dot)) * (180 / Math.PI)).toBeLessThan(0.01);
    expect(Math.abs(c.velocity[0] - other.state.velocity.x)).toBeLessThanOrEqual(0.005);
    expect(c.rpm).toBe(Math.round(other.diag.rpm));
  });

  it('a damage summary becomes a damage record the drawing code can use', () => {
    const d = damageFromSummary({ wingL: 0.5, wingR: 0, engine: 1, tank: 0, tailplane: 0, fin: 0.2, failedL: true, failedR: false, failedTail: false });
    expect(d.wing.L).toBe(0.5);
    expect(d.failed.L).toBe(true);
    expect(d.cables).toEqual({ aileron: null, elevator: null, rudder: null });
  });

  it('a snapshot of four aircraft is small (about 430 bytes)', () => {
    const sims = [flying(), flying(), flying(), flying()];
    const buf = encodeSnapshot({ tick: 1, lead: 2, you: { slot: 1, spawn: 1, state: captureState(sims[0]) }, others: sims.slice(1).map((s, i) => compactOf(i + 2, 1, s)) });
    expect(buf.byteLength).toBeLessThan(450);
    expect(decodeSnapshot(buf.slice(0, 20))).toBe(null);
  });
});
