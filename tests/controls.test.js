import { describe, it, expect } from 'vitest';
import { InputMapper } from '../src/input/inputMapper.js';
import { keyId } from '../src/input/keyboard.js';
import { MouseStick, mixStick, wheelThrottle, SENSITIVITY_STEPS } from '../src/input/mouse.js';

// Phase 2 controls: the product owner's keys, Mac fallbacks and mouse flying.

const DT = 1 / 60;
function hold(m, id, seconds) {
  m.press(id);
  for (let i = 0; i < seconds / DT; i++) m.update(DT);
  m.release(id);
}

describe('keyboard: throttle and trim keys', () => {
  it('Insert / Delete move the throttle up / down', () => {
    const m = new InputMapper();
    hold(m, 'Delete', 1);
    expect(m.input.throttle).toBeCloseTo(0.5, 1);
    hold(m, 'Insert', 0.5);
    expect(m.input.throttle).toBeCloseTo(0.75, 1);
  });

  it('Page Up / Page Down trim nose up / down', () => {
    const m = new InputMapper();
    hold(m, 'PageUp', 1);
    expect(m.input.trim).toBeGreaterThan(0);
    hold(m, 'PageDown', 3);
    expect(m.input.trim).toBeLessThan(0);
  });

  it('W/S and T/G still work (a Mac has no Insert key)', () => {
    const m = new InputMapper();
    hold(m, 'KeyS', 1);
    expect(m.input.throttle).toBeLessThan(1);
    hold(m, 'KeyT', 1);
    expect(m.input.trim).toBeGreaterThan(0);
  });

  it('the arrows keep their meaning: Up = nose down, Down = nose up', () => {
    const m = new InputMapper();
    hold(m, 'ArrowUp', 0.3);
    expect(m.input.pull).toBeLessThan(0);
  });
});

describe('Mac fn-key handling', () => {
  it('fn+Up / fn+Down (keys "PageUp" / "PageDown" from the arrow positions) trim instead of moving the stick', () => {
    expect(keyId({ key: 'PageUp', code: 'ArrowUp' })).toBe('PageUp');
    expect(keyId({ key: 'PageDown', code: 'ArrowDown' })).toBe('PageDown');
    expect(keyId({ key: 'PageUp', code: 'PageUp' })).toBe('PageUp'); // a full-size keyboard's own key
    // Some Macs send the plain arrow with only the Fn flag set: still Page Up and Page Down (and Delete).
    const fn = (key, code) => ({ key, code, getModifierState: (m) => m === 'Fn' });
    expect(keyId(fn('ArrowUp', 'ArrowUp'))).toBe('PageUp');
    expect(keyId(fn('ArrowDown', 'ArrowDown'))).toBe('PageDown');
    expect(keyId(fn('Backspace', 'Backspace'))).toBe('Delete');
    // Without Fn the arrows still move the stick.
    expect(keyId({ key: 'ArrowUp', code: 'ArrowUp', getModifierState: () => false })).toBe('ArrowUp');
  });

  it('fn+Backspace sends Delete (throttle down); plain keys use their position', () => {
    expect(keyId({ key: 'Delete', code: 'Backspace' })).toBe('Delete');
    expect(keyId({ key: 'ArrowLeft', code: 'ArrowLeft' })).toBe('ArrowLeft');
    expect(keyId({ key: 'w', code: 'KeyW' })).toBe('KeyW');
  });
});

describe('mouse stick', () => {
  it('moving the mouse toward you pulls the stick back; right rolls right', () => {
    const s = new MouseStick();
    s.move(30, 60);
    expect(s.pull).toBeGreaterThan(0);
    expect(s.roll).toBeGreaterThan(0);
  });

  it('stays where you leave it, and X (centre) returns it to neutral', () => {
    const s = new MouseStick();
    s.move(0, 90);
    const held = s.pull;
    expect(s.pull).toBe(held);
    s.centre();
    expect(s.pull).toBe(0);
    expect(s.roll).toBe(0);
  });

  it('never goes past full travel', () => {
    const s = new MouseStick();
    s.move(10000, -10000);
    expect(s.roll).toBe(1);
    expect(s.pull).toBe(-1);
  });

  it('sensitivity changes how far the stick moves, within the available steps', () => {
    const slow = new MouseStick(0);
    const fast = new MouseStick(SENSITIVITY_STEPS.length - 1);
    slow.move(0, 30);
    fast.move(0, 30);
    expect(fast.pull).toBeGreaterThan(slow.pull * 10);
    const s = new MouseStick();
    for (let i = 0; i < 20; i++) s.adjust(1);
    expect(s.sensitivity).toBe(SENSITIVITY_STEPS[SENSITIVITY_STEPS.length - 1]);
    for (let i = 0; i < 20; i++) s.adjust(-1);
    expect(s.sensitivity).toBe(SENSITIVITY_STEPS[0]);
  });

  it('inverting pitch reverses the mouse pitch too', () => {
    const s = new MouseStick();
    s.move(0, 60, true);
    expect(s.pull).toBeLessThan(0);
  });

  it('the wheel moves the throttle: away from you opens it, by 5% a notch', () => {
    expect(wheelThrottle(-100)).toBeCloseTo(0.05, 6);
    expect(wheelThrottle(100)).toBeCloseTo(-0.05, 6);
    const m = new InputMapper();
    m.reset({ throttle: 0.5 });
    m.nudgeThrottle(wheelThrottle(-100));
    expect(m.input.throttle).toBeCloseTo(0.55, 6);
    m.nudgeThrottle(10);
    expect(m.input.throttle).toBe(1);
  });

  it('a held key wins on its own axis; otherwise the mouse adds in', () => {
    const stick = { pull: 0.4, roll: -0.3 };
    expect(mixStick({ pull: -0.2, roll: 0 }, stick, true, false)).toEqual({ pull: -0.2, roll: -0.3 });
    expect(mixStick({ pull: 0, roll: 0.5 }, stick, false, true)).toEqual({ pull: 0.4, roll: 0.5 });
    expect(mixStick({ pull: 0.9, roll: 0 }, stick, false, false).pull).toBe(1);
  });
});

describe('key holding helpers', () => {
  it('reports which stick axes the keyboard holds', () => {
    const m = new InputMapper();
    m.press('ArrowLeft');
    expect(m.rollKeyHeld()).toBe(true);
    expect(m.pitchKeyHeld()).toBe(false);
  });
});
