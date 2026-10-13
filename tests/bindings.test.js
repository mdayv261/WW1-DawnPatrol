import { describe, it, expect } from 'vitest';
import {
  ACTIONS, HELD, RESERVED, defaultBindings, mergeBindings, rebind, actionForKey, keyLabel, keysText, helpText,
  loadBindings, saveBindings, KEYS_STORE,
} from '../src/input/bindings.js';
import { InputMapper } from '../src/input/inputMapper.js';
import { pressAction } from '../src/input/keyboard.js';
import { DEFAULT_MAPPING, BUTTON_LABELS, HELD_BUTTONS, mergeMapping, assignButton } from '../src/input/joystickMapping.js';
import { ButtonLearner, createMemory, readJoystick } from '../src/input/joystickMath.js';
import { Flow } from '../src/game/flow.js';

// Phase 7, checkpoint 1: keys and joystick buttons the player can change (Options > Controls).

const memoryStorage = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), data };
};

describe('the default keys', () => {
  it('are the keys the game always had', () => {
    const k = defaultBindings().keys;
    expect(k.pullBack).toEqual(['ArrowDown', null]);
    expect(k.pushForward).toEqual(['ArrowUp', null]);
    expect(k.throttleUp).toEqual(['Insert', 'KeyW']);
    expect(k.throttleDown).toEqual(['Delete', 'KeyS']);
    expect(k.trimNoseUp).toEqual(['PageUp', 'KeyT']);
    expect(k.trimNoseDown).toEqual(['PageDown', 'KeyG']);
    expect(k.fire).toEqual(['Space', null]);
    expect(k.clearJam[0]).toBe('KeyB');
    expect(k.camera[0]).toBe('KeyC');
    expect(k.pause[0]).toBe('KeyP');
    expect(k.mute[0]).toBe('KeyM');
    expect(k.hud[0]).toBe('KeyU');
  });

  it('use each key once, and none of the reserved keys', () => {
    const all = Object.values(defaultBindings().keys).flat().filter(Boolean);
    expect(new Set(all).size).toBe(all.length);
    for (const k of all) expect(RESERVED.has(k)).toBe(false);
  });

  it('the stick, rudder, throttle, trim and guns are held; the rest act once per press', () => {
    expect([...HELD].sort()).toEqual(['fire', 'pullBack', 'pushForward', 'rollLeft', 'rollRight', 'rudderLeft', 'rudderRight', 'throttleDown', 'throttleUp', 'trimNoseDown', 'trimNoseUp']);
    const handlers = {};
    for (const a of ACTIONS.filter((x) => !x.held)) expect(pressAction(a.id, handlers, new InputMapper()), a.id).toBe(true);
    expect(pressAction('fire', handlers, new InputMapper())).toBe(false);
  });
});

describe('changing a key', () => {
  it('gives the key to the new action and takes it from the old one, saying which', () => {
    const r = rebind(defaultBindings(), 'rudderLeft', 1, 'KeyA');
    expect(r.bindings.keys.rudderLeft).toEqual(['KeyQ', 'KeyA']);
    expect(r.moved).toBeNull();
    const s = rebind(r.bindings, 'fire', 1, 'KeyQ'); // Q was rudder left
    expect(s.moved).toBe('rudderLeft');
    expect(s.bindings.keys.fire).toEqual(['Space', 'KeyQ']);
    expect(s.bindings.keys.rudderLeft).toEqual([null, 'KeyA']);
    expect(actionForKey(s.bindings, 'KeyQ')).toBe('fire');
  });

  it('does not change the bindings it was given', () => {
    const b = defaultBindings();
    rebind(b, 'fire', 0, 'KeyF');
    expect(b.keys.fire[0]).toBe('Space');
  });

  it('a key moved within the same action does not count as taken', () => {
    const r = rebind(defaultBindings(), 'throttleUp', 0, 'KeyW'); // W from slot 2 to slot 1
    expect(r.moved).toBeNull();
    expect(r.bindings.keys.throttleUp).toEqual(['KeyW', null]);
  });

  it('clears a slot', () => {
    const r = rebind(defaultBindings(), 'throttleUp', 1, null);
    expect(r.bindings.keys.throttleUp).toEqual(['Insert', null]);
    expect(actionForKey(r.bindings, 'KeyW')).toBeNull();
  });

  it('refuses Esc, Tab and the F keys', () => {
    for (const k of ['Escape', 'Tab', 'F2', 'F3', 'F4', 'F5']) {
      const r = rebind(defaultBindings(), 'fire', 0, k);
      expect(r.refused, k).toBe(true);
      expect(r.bindings.keys.fire[0]).toBe('Space');
    }
  });
});

describe('the saved keys', () => {
  it('are remembered, and junk falls back to the defaults', () => {
    const store = memoryStorage();
    const b = rebind(defaultBindings(), 'fire', 0, 'KeyF').bindings;
    saveBindings(store, b);
    expect(loadBindings(store).keys.fire[0]).toBe('KeyF');
    for (const junk of ['nonsense', '5', '[]', '{"keys":7}']) {
      store.setItem(KEYS_STORE, junk);
      expect(loadBindings(store)).toEqual(defaultBindings());
    }
    expect(loadBindings(null)).toEqual(defaultBindings());
  });

  it('bad keys are dropped, a key used twice keeps its first use, and a new action gets its default if free', () => {
    const saved = { keys: { fire: ['KeyQ', 42], rudderLeft: ['KeyQ', 'Escape'], camera: ['KeyB'] } };
    const m = mergeBindings(saved);
    expect(m.keys.rudderLeft).toEqual(['KeyQ', null]); // listed before fire, so it keeps Q; Esc is reserved
    expect(m.keys.fire).toEqual([null, null]); // Q taken, 42 is not a key
    expect(m.keys.camera).toEqual(['KeyB', null]);
    expect(m.keys.clearJam).toEqual([null, null]); // its default B is taken by the camera
    expect(m.keys.pause).toEqual(['KeyP', null]); // not saved: its default
  });
});

describe('flying with changed keys', () => {
  it('the new key moves the controls and the old one no longer does', () => {
    const b = rebind(defaultBindings(), 'rudderLeft', 0, 'KeyA').bindings;
    const m = new InputMapper(b);
    m.press('KeyQ');
    expect(m.update(0.5).yaw).toBe(0);
    m.release('KeyQ');
    m.press('KeyA');
    expect(m.update(0.5).yaw).toBeLessThan(0);
  });

  it('new bindings take effect at once and let go of held keys', () => {
    const m = new InputMapper();
    m.press('ArrowDown');
    expect(m.isDown('pullBack')).toBe(true);
    m.setBindings(rebind(defaultBindings(), 'pullBack', 0, 'KeyK').bindings);
    expect(m.isDown('pullBack')).toBe(false);
    m.press('KeyK');
    expect(m.isDown('pullBack')).toBe(true);
  });

  it('a one-shot key calls its handler; invert pitch flips the mapper itself', () => {
    const called = [];
    const h = { onCamera: () => called.push('camera'), onSensitivity: (s) => called.push(`sens${s}`), onInvert: (on) => called.push(`invert ${on}`) };
    const m = new InputMapper();
    const b = rebind(defaultBindings(), 'camera', 0, 'KeyZ').bindings;
    pressAction(actionForKey(b, 'KeyZ'), h, m);
    pressAction('sensitivityDown', h, m);
    pressAction('invertPitch', h, m);
    expect(called).toEqual(['camera', 'sens-1', 'invert true']);
    expect(m.invertPitch).toBe(true);
  });
});

describe('names on the screen and in the help', () => {
  it('names keys as printed on them', () => {
    expect(keyLabel('KeyQ')).toBe('Q');
    expect(keyLabel('Digit7')).toBe('7');
    expect(keyLabel('PageUp')).toBe('PgUp');
    expect(keyLabel('ArrowDown')).toBe('Down');
    expect(keyLabel('Numpad8')).toBe('Num 8');
    expect(keyLabel('Comma')).toBe(',');
    expect(keyLabel('ShiftLeft')).toBe('Left Shift');
    expect(keyLabel(null)).toBe('-');
    expect(keysText(defaultBindings(), 'throttleUp')).toBe('Insert or W');
  });

  it('the help lists the player\'s own keys and joystick buttons', () => {
    const b = rebind(defaultBindings(), 'rudderLeft', 0, 'KeyA').bindings;
    const text = helpText(b, mergeMapping(null), BUTTON_LABELS);
    expect(text).toContain('A / E');
    expect(text).not.toContain('Q / E');
    expect(text).toContain('1 fire');
    expect(text).toContain('9 clear gun jam');
    expect(helpText(b)).not.toContain('Joystick buttons');
  });
});

// ---- the joystick ------------------------------------------------------------------------------

const pad = (down = []) => ({ id: 'Logitech Extreme 3D Pro', axes: [0, 0, 0, 0, 0, 0, 0], buttons: Array.from({ length: 12 }, (_, i) => ({ pressed: down.includes(i) })) });

describe('joystick buttons', () => {
  it('keep the buttons they always had, with the new commands unassigned', () => {
    const m = mergeMapping(null);
    expect(m.buttons).toMatchObject({ fire: 0, camera: 1, trimDown: 2, trimUp: 3, readout: 4, recentre: 5, pause: 6, restart: 7, clearJam: 8 });
    for (const a of ['look', 'hud', 'mute', 'practice', 'invertPitch', 'quality', 'help']) expect(m.buttons[a], a).toBeNull();
    for (const a of Object.keys(DEFAULT_MAPPING.buttons)) expect(BUTTON_LABELS[a], a).toBeTruthy();
    expect([...HELD_BUTTONS].sort()).toEqual(['fire', 'trimDown', 'trimUp']);
  });

  it('a command given a button takes it from the old one; a cleared one does nothing', () => {
    const m = mergeMapping(null);
    expect(assignButton(m, 'mute', 1)).toBe('camera'); // button 2 was the camera
    expect(m.buttons.mute).toBe(1);
    expect(m.buttons.camera).toBeNull();
    const joy = readJoystick(pad([1]), m, createMemory());
    expect(joy.pressedNow).toEqual(['mute']);
    assignButton(m, 'mute', null);
    expect(readJoystick(pad([1]), m, createMemory()).pressedNow).toEqual([]);
  });

  it('a saved mapping keeps the player\'s choices (and the old name "centre"); a button is used once', () => {
    const old = { version: 3, buttons: { fire: 0, centre: 10, camera: 1, pause: 6 } };
    const m = mergeMapping(old);
    expect(m.version).toBe(4);
    expect(m.buttons.recentre).toBe(10);
    const mine = mergeMapping({ version: 4, buttons: { hud: 4, readout: null, camera: null } });
    expect(mine.buttons.hud).toBe(4);
    expect(mine.buttons.readout).toBeNull(); // the default 4 went to the HUD
    expect(mine.buttons.camera).toBeNull(); // cleared on purpose
    const twice = mergeMapping({ buttons: { fire: 3, mute: 3 } });
    expect(twice.buttons.fire).toBe(3);
    expect(twice.buttons.mute).toBeNull();
    expect(twice.buttons.trimUp).toBeNull(); // its default 3 is the trigger's now
  });

  it('learns the first button newly pressed, not one already held', () => {
    const learner = new ButtonLearner(pad([2]));
    expect(learner.feed(pad([2]))).toBeNull(); // still held from before
    expect(learner.feed(pad([2, 7]))).toBe(7);
    const again = new ButtonLearner(pad([2]));
    again.feed(pad([])); // let go
    expect(again.feed(pad([2]))).toBe(2); // pressed again
  });
});

describe('the Controls screen in the flow', () => {
  it('opens from Options and goes back to it, and Options still returns where it was opened', () => {
    const f = new Flow();
    f.go('setup');
    f.go('flying');
    f.go('paused');
    f.go('options');
    f.go('controls');
    expect(f.can('flying')).toBe(false);
    f.go('options');
    expect(f.back()).toBe('paused');
    const g = new Flow();
    g.go('options');
    g.go('controls');
    g.go('options');
    expect(g.back()).toBe('menu');
  });
});

describe('the keyboard in the browser (window events, faked)', () => {
  const fakeWindow = () => {
    const listeners = {};
    globalThis.window = { addEventListener: (type, f) => { (listeners[type] ??= []).push(f); } };
    const send = (type, code, key = code) => {
      const e = { type, code, key, repeat: false, shiftKey: false, getModifierState: () => false, preventDefault() {}, stopImmediatePropagation() {} };
      for (const f of listeners[type] ?? []) f(e);
    };
    return { down: (c, k) => send('keydown', c, k), up: (c, k) => send('keyup', c, k) };
  };

  it('held keys fly, one-shot keys call back, and changed keys work at once', async () => {
    const { attachKeyboard } = await import('../src/input/keyboard.js');
    const w = fakeWindow();
    const called = [];
    const mapper = attachKeyboard({ onCamera: () => called.push('camera'), onEscape: () => called.push('escape') });
    w.down('ArrowDown', 'ArrowDown');
    expect(mapper.isDown('pullBack')).toBe(true);
    w.up('ArrowDown', 'ArrowDown');
    w.down('KeyC', 'c');
    w.down('Escape', 'Escape');
    expect(called).toEqual(['camera', 'escape']);
    mapper.setBindings(rebind(defaultBindings(), 'rudderLeft', 0, 'KeyE').bindings);
    w.down('KeyE', 'e');
    expect(mapper.isDown('rudderLeft')).toBe(true);
    delete globalThis.window;
  });

  it('while the Controls screen waits for a key, the key goes to it and nothing else', async () => {
    const { attachKeyboard } = await import('../src/input/keyboard.js');
    const w = fakeWindow();
    const called = [];
    const mapper = attachKeyboard({ onCamera: () => called.push('camera') });
    let got = null;
    mapper.captureNext((k) => { got = k; });
    w.down('KeyC', 'c');
    expect(got).toBe('KeyC');
    expect(called).toEqual([]);
    w.down('KeyC', 'c'); // the next press works normally again
    expect(called).toEqual(['camera']);
    delete globalThis.window;
  });
});
