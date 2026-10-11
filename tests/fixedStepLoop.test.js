import { describe, it, expect } from 'vitest';
import { FixedStepLoop, PHYSICS_DT, MAX_STEPS_PER_FRAME } from '../src/core/fixedStepLoop.js';

describe('FixedStepLoop', () => {
  it('runs physics at 120 Hz', () => {
    expect(PHYSICS_DT).toBeCloseTo(1 / 120, 10);
  });

  it('runs one second of real time as 120 steps', () => {
    const loop = new FixedStepLoop({ maxSteps: 1000 });
    let count = 0;
    loop.advance(1, () => { count += 1; });
    expect(count).toBe(120);
  });

  it('gives every step exactly the fixed dt', () => {
    const loop = new FixedStepLoop();
    const seen = [];
    loop.advance(0.05, (dt) => seen.push(dt));
    expect(seen.length).toBeGreaterThan(0);
    for (const dt of seen) expect(dt).toBe(PHYSICS_DT);
  });

  it('carries leftover time into the next frame', () => {
    const loop = new FixedStepLoop();
    let count = 0;
    const step = () => { count += 1; };
    // 60 fps frames are exactly two physics steps each.
    for (let i = 0; i < 60; i++) loop.advance(1 / 60, step);
    expect(count).toBeGreaterThanOrEqual(119);
    expect(count).toBeLessThanOrEqual(120);
  });

  it('runs no step when less than one step of time has passed', () => {
    const loop = new FixedStepLoop();
    let count = 0;
    const result = loop.advance(PHYSICS_DT * 0.5, () => { count += 1; });
    expect(count).toBe(0);
    expect(result.steps).toBe(0);
    expect(result.alpha).toBeCloseTo(0.5, 10);
  });

  it('caps steps and drops the backlog after a long stall', () => {
    const loop = new FixedStepLoop();
    let count = 0;
    loop.advance(10, () => { count += 1; }); // a 10 second stall
    expect(count).toBe(MAX_STEPS_PER_FRAME);
    expect(loop.accumulator).toBe(0);
    // The next normal frame must behave normally.
    count = 0;
    loop.advance(PHYSICS_DT * 2, () => { count += 1; });
    expect(count).toBe(2);
  });

  it('always returns alpha in [0, 1)', () => {
    const loop = new FixedStepLoop();
    for (const dt of [0, 0.001, 0.0083, 0.016, 0.033, 0.2, 5]) {
      const { alpha } = loop.advance(dt, () => {});
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThan(1);
    }
  });

  it('ignores negative elapsed time', () => {
    const loop = new FixedStepLoop();
    let count = 0;
    loop.advance(-1, () => { count += 1; });
    expect(count).toBe(0);
    expect(loop.accumulator).toBe(0);
  });
});
