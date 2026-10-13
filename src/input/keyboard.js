// Browser wiring for the keyboard: key events go to the InputMapper, and the one-shot keys
// (camera, pause, clear jam...) call back. Which key does what comes from the bindings
// (src/input/bindings.js), which the player can change on the Controls screen. A few keys
// are fixed: Esc, F2-F4 and the development quick starts.

import { InputMapper } from './inputMapper.js';
import { HELD, actionForKey, defaultBindings } from './bindings.js';

// Navigation keys are identified by name, not position: on a Mac, fn+Up sends
// "PageUp" from the Up-arrow key's position, and must trim, not push the stick.
// Some Macs instead send the plain arrow with only the Fn flag set, so an
// arrow with Fn held is read as PageUp or PageDown too (and fn+Backspace as Delete).
const BY_NAME = new Set(['Insert', 'Delete', 'PageUp', 'PageDown']);
const WITH_FN = { ArrowUp: 'PageUp', ArrowDown: 'PageDown', Backspace: 'Delete' };
export function keyId(e) {
  if (BY_NAME.has(e.key)) return e.key;
  if (WITH_FN[e.code] && e.getModifierState?.('Fn')) return WITH_FN[e.code];
  return e.code;
}

// What each one-shot action calls. Shared with the joystick's buttons (main.js), so a
// command does the same from either.
const PRESS = {
  restart: (h) => h.onRestart?.(),
  recentre: (h) => h.onRecentre?.(),
  sensitivityDown: (h) => h.onSensitivity?.(-1),
  sensitivityUp: (h) => h.onSensitivity?.(1),
  camera: (h) => h.onCamera?.(),
  look: (h) => h.onLook?.(),
  readout: (h) => h.onReadout?.(),
  quality: (h) => h.onQuality?.(),
  clearJam: (h) => h.onClearJam?.(),
  practice: (h) => h.onPractice?.(),
  mute: (h) => h.onMute?.(),
  hud: (h) => h.onHud?.(),
  pause: (h) => h.onPause?.(),
  help: (h) => h.onHelp?.(),
  invertPitch: (h, mapper) => {
    mapper.invertPitch = !mapper.invertPitch;
    h.onInvert?.(mapper.invertPitch);
  },
};

// Do a one-shot action. Returns false for an action that is not one (held keys).
export function pressAction(action, handlers, mapper) {
  const f = PRESS[action];
  if (!f) return false;
  f(handlers, mapper);
  return true;
}

// handlers: { onSelect(index, airStart), onRestart(), onPause(), onDebug(), onHelp(), onTestPanel(),
//   onJoystickPanel(), onCamera(), onLook(), onReadout(), onQuality(), onRecentre(), onSensitivity(step),
//   onClearJam(), onTarget(), onSkill(step), onPractice(), onEscape(), onHud(), onMute(), onInvert(on) }
// Returns the InputMapper, with captureNext(callback) added: the next key press goes to
// callback(keyId) and nothing else (the Controls screen, waiting for a new key).
export function attachKeyboard(handlers, bindings = defaultBindings()) {
  const mapper = new InputMapper(bindings);
  const heldAs = new Map(); // physical key -> id it was pressed as
  let capture = null;
  mapper.captureNext = (callback) => {
    capture = callback;
  };

  window.addEventListener('keydown', (e) => {
    const id = keyId(e);
    mapper.lastKey = `${e.key} (${e.code}${e.getModifierState?.('Fn') ? ', Fn' : ''}) -> ${id}`; // shown on the F3 screen
    if (capture) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      const f = capture;
      capture = null;
      f(id);
      return;
    }
    const action = actionForKey(mapper.bindings, id);
    if (e.repeat) {
      if (action) e.preventDefault();
      return;
    }
    if (action && HELD.has(action)) {
      e.preventDefault(); // stop arrow keys scrolling the page
      heldAs.set(e.code, id);
      mapper.press(id);
      return;
    }
    if (action) {
      e.preventDefault();
      pressAction(action, handlers, mapper);
      return;
    }
    // Fixed keys.
    if (e.code === 'Escape') handlers.onEscape?.();
    else if (e.code === 'F3') {
      e.preventDefault();
      handlers.onDebug?.();
    } else if (e.code === 'F2') {
      e.preventDefault();
      handlers.onJoystickPanel?.();
    } else if (e.code === 'F4') {
      e.preventDefault();
      handlers.onTestPanel?.();
    } else if (e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 9) handlers.onSelect?.(n - 1, e.shiftKey);
    } else if (e.code === 'KeyN') handlers.onTarget?.();
    else if (e.code === 'BracketLeft') handlers.onSkill?.(-1);
    else if (e.code === 'BracketRight') handlers.onSkill?.(1);
  });

  window.addEventListener('keyup', (e) => {
    // Release whatever this physical key was pressed as (fn may be let go first).
    mapper.release(heldAs.get(e.code) ?? keyId(e));
    heldAs.delete(e.code);
  });
  // If the window loses focus, don't leave keys stuck down.
  window.addEventListener('blur', () => {
    mapper.releaseAll();
    heldAs.clear();
  });
  return mapper;
}
