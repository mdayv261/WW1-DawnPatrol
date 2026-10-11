import { describe, it, expect } from 'vitest';
import { InputMapper } from '../src/input/inputMapper.js';

const DT = 1 / 60;

function hold(mapper, code, seconds) {
  mapper.press(code);
  for (let i = 0; i < seconds / DT; i++) mapper.update(DT);
  mapper.release(code);
}

describe('InputMapper', () => {
  it('starts with a neutral stick and full throttle', () => {
    const m = new InputMapper();
    const i = m.update(DT);
    expect(i.pull).toBe(0);
    expect(i.roll).toBe(0);
    expect(i.yaw).toBe(0);
    expect(i.throttle).toBe(1);
  });

  it('Down pulls back (positive pull), Up pushes forward', () => {
    const m = new InputMapper();
    hold(m, 'ArrowDown', 0.3);
    expect(m.input.pull).toBeGreaterThan(0);
    const n = new InputMapper();
    hold(n, 'ArrowUp', 0.3);
    expect(n.input.pull).toBeLessThan(0);
  });

  it('Left and Right roll, Q and E give rudder', () => {
    const m = new InputMapper();
    hold(m, 'ArrowRight', 0.3);
    expect(m.input.roll).toBeGreaterThan(0);
    hold(m, 'ArrowLeft', 1);
    expect(m.input.roll).toBeLessThan(0);
    hold(m, 'KeyE', 0.3);
    expect(m.input.yaw).toBeGreaterThan(0);
  });

  it('a held key ramps up gradually rather than jumping to full', () => {
    const m = new InputMapper();
    m.press('ArrowDown');
    m.update(DT);
    expect(m.input.pull).toBeGreaterThan(0);
    expect(m.input.pull).toBeLessThan(0.1);
  });

  it('reaches full deflection after about a second and stops there', () => {
    const m = new InputMapper();
    m.press('ArrowDown');
    for (let i = 0; i < 180; i++) m.update(DT);
    expect(m.input.pull).toBe(1);
  });

  it('returns to centre after release', () => {
    const m = new InputMapper();
    hold(m, 'ArrowDown', 1);
    for (let i = 0; i < 120; i++) m.update(DT);
    expect(m.input.pull).toBe(0);
  });

  it('opposite keys cancel', () => {
    const m = new InputMapper();
    m.press('ArrowLeft');
    m.press('ArrowRight');
    for (let i = 0; i < 60; i++) m.update(DT);
    expect(m.input.roll).toBe(0);
  });

  it('inverting pitch swaps the pitch keys', () => {
    const m = new InputMapper();
    m.invertPitch = true;
    hold(m, 'ArrowDown', 0.3);
    expect(m.input.pull).toBeLessThan(0);
  });

  it('W and S change the throttle within 0 to 1', () => {
    const m = new InputMapper();
    hold(m, 'KeyS', 1);
    expect(m.input.throttle).toBeCloseTo(0.5, 1);
    hold(m, 'KeyS', 5);
    expect(m.input.throttle).toBe(0);
    hold(m, 'KeyW', 5);
    expect(m.input.throttle).toBe(1);
  });

  it('T and G adjust the trim within -1 to 1', () => {
    const m = new InputMapper();
    hold(m, 'KeyT', 10);
    expect(m.input.trim).toBe(1);
    hold(m, 'KeyG', 10);
    expect(m.input.trim).toBe(-1);
  });

  it('releaseAll lets go of every key (for example when the window loses focus)', () => {
    const m = new InputMapper();
    m.press('ArrowDown');
    m.releaseAll();
    for (let i = 0; i < 30; i++) m.update(DT);
    expect(m.input.pull).toBe(0);
  });

  it('reset sets the starting throttle and trim', () => {
    const m = new InputMapper();
    m.reset({ throttle: 0.6, trim: 0.1 });
    expect(m.input.throttle).toBe(0.6);
    expect(m.input.trim).toBe(0.1);
    expect(m.input.pull).toBe(0);
  });
});
