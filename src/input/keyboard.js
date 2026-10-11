// Browser wiring for the keyboard: key events go to the InputMapper, and a
// few one-shot keys (select aircraft, restart, pause, debug) call back.

import { InputMapper } from './inputMapper.js';

const CONTROL_CODES = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyQ', 'KeyE', 'KeyW', 'KeyS', 'KeyT', 'KeyG',
]);

// handlers: { onSelect(index), onRestart(), onPause(), onDebug(), onHelp() }
export function attachKeyboard(handlers) {
  const mapper = new InputMapper();

  window.addEventListener('keydown', (e) => {
    if (e.repeat) {
      if (CONTROL_CODES.has(e.code)) e.preventDefault();
      return;
    }
    if (CONTROL_CODES.has(e.code)) {
      e.preventDefault(); // stop arrow keys scrolling the page
      mapper.press(e.code);
      return;
    }
    if (e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 9) handlers.onSelect(n - 1);
    } else if (e.code === 'KeyR') handlers.onRestart();
    else if (e.code === 'KeyP') handlers.onPause();
    else if (e.code === 'F3') {
      e.preventDefault();
      handlers.onDebug();
    } else if (e.code === 'KeyH') handlers.onHelp();
    else if (e.code === 'KeyI') mapper.invertPitch = !mapper.invertPitch;
  });

  window.addEventListener('keyup', (e) => mapper.release(e.code));
  // If the window loses focus, don't leave keys stuck down.
  window.addEventListener('blur', () => mapper.releaseAll());
  return mapper;
}
