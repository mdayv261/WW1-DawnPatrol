// Browser wiring for the keyboard: key events go to the InputMapper, and a
// few one-shot keys (select aircraft, restart, pause, cameras, debug) call
// back.

import { InputMapper, KEYS } from './inputMapper.js';

const CONTROL_KEYS = new Set(Object.values(KEYS).flat());

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

// handlers: { onSelect(index, airStart), onRestart(), onPause(), onDebug(),
//   onHelp(), onTestPanel(), onJoystickPanel(), onCamera(), onLook(), onReadout(), onQuality(),
//   onRecentre(), onSensitivity(step), onClearJam(), onTarget(), onSkill(step), onPractice(), onEscape(), onHud(), onMute() }
export function attachKeyboard(handlers) {
  const mapper = new InputMapper();
  const heldAs = new Map(); // physical key -> id it was pressed as

  window.addEventListener('keydown', (e) => {
    const id = keyId(e);
    mapper.lastKey = `${e.key} (${e.code}${e.getModifierState?.('Fn') ? ', Fn' : ''}) -> ${id}`; // shown on the F3 screen
    if (e.repeat) {
      if (CONTROL_KEYS.has(id)) e.preventDefault();
      return;
    }
    if (CONTROL_KEYS.has(id)) {
      e.preventDefault(); // stop arrow keys scrolling the page
      heldAs.set(e.code, id);
      mapper.press(id);
      return;
    }
    if (e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 9) handlers.onSelect(n - 1, e.shiftKey);
    } else if (e.code === 'KeyR') handlers.onRestart();
    else if (e.code === 'Escape') handlers.onEscape?.();
    else if (e.code === 'KeyU') handlers.onHud?.();
    else if (e.code === 'KeyM') handlers.onMute?.();
    else if (e.code === 'KeyP') handlers.onPause();
    else if (e.code === 'F3') {
      e.preventDefault();
      handlers.onDebug();
    } else if (e.code === 'F2') {
      e.preventDefault();
      handlers.onJoystickPanel?.();
    } else if (e.code === 'F4') {
      e.preventDefault();
      handlers.onTestPanel?.();
    } else if (e.code === 'KeyH') handlers.onHelp();
    else if (e.code === 'KeyI') mapper.invertPitch = !mapper.invertPitch;
    else if (e.code === 'KeyC') handlers.onCamera?.();
    else if (e.code === 'KeyV') handlers.onLook?.();
    else if (e.code === 'KeyJ') handlers.onReadout?.();
    else if (e.code === 'KeyL') handlers.onQuality?.();
    else if (e.code === 'KeyX') handlers.onRecentre?.();
    else if (e.code === 'KeyB') handlers.onClearJam?.();
    else if (e.code === 'KeyN') handlers.onTarget?.();
    else if (e.code === 'BracketLeft') handlers.onSkill?.(-1);
    else if (e.code === 'BracketRight') handlers.onSkill?.(1);
    else if (e.code === 'KeyY') handlers.onPractice?.();
    else if (e.code === 'Comma') handlers.onSensitivity?.(-1);
    else if (e.code === 'Period') handlers.onSensitivity?.(1);
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
