// Mouse flying. With the pointer captured (click the game; Esc releases),
// mouse movement moves a virtual stick that stays where you leave it, like a
// real stick; X recentres it. The wheel works the throttle. Sensitivity is
// adjusted with , and . and remembered in this browser.
// MouseStick is plain logic (tested); attachMouse is the browser wiring.

export const SENSITIVITY_STEPS = [0.25, 0.35, 0.5, 0.7, 1, 1.4, 2, 2.8, 4];
const PIXELS_FOR_FULL_TRAVEL = 300; // at sensitivity 1
const THROTTLE_PER_WHEEL_NOTCH = 0.05; // one notch (about 100 wheel units)
const STORE_KEY = 'dawnPatrol.mouseSensitivity';

const clamp = (v, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, v));

export class MouseStick {
  constructor(sensitivityIndex = 4) {
    this.pull = 0;
    this.roll = 0;
    this.sensitivityIndex = sensitivityIndex;
  }

  get sensitivity() {
    return SENSITIVITY_STEPS[this.sensitivityIndex];
  }

  // Mouse moved by (dx, dy) pixels. Moving the mouse toward you (down the
  // screen) pulls the stick back, like a real stick.
  move(dx, dy, invertPitch = false) {
    const k = this.sensitivity / PIXELS_FOR_FULL_TRAVEL;
    this.roll = clamp(this.roll + dx * k);
    this.pull = clamp(this.pull + (invertPitch ? -dy : dy) * k);
  }

  centre() {
    this.pull = 0;
    this.roll = 0;
  }

  // Step the sensitivity up (+1) or down (-1); returns the new value.
  adjust(step) {
    this.sensitivityIndex = Math.max(0, Math.min(SENSITIVITY_STEPS.length - 1, this.sensitivityIndex + step));
    return this.sensitivity;
  }
}

// Throttle change for a wheel event's deltaY (wheel away = more throttle).
export function wheelThrottle(deltaY) {
  return (-deltaY / 100) * THROTTLE_PER_WHEEL_NOTCH;
}

// Combine keyboard and mouse stick. A held pitch or roll key takes priority
// on that axis; otherwise the mouse stick adds to the (centring) key value.
export function mixStick(keyInput, stick, pitchKeyHeld, rollKeyHeld) {
  return {
    pull: pitchKeyHeld ? keyInput.pull : clamp(keyInput.pull + stick.pull),
    roll: rollKeyHeld ? keyInput.roll : clamp(keyInput.roll + stick.roll),
  };
}

// Keyboard, mouse stick and joystick together. Per axis, a held key wins;
// otherwise the joystick adds to the mouse stick (and the keys' centring
// value), all clamped. The twist handle gives rudder unless Q or E is held.
// `joy` is null when no joystick is connected.
export function mixJoystick(keyInput, stick, joy, held) {
  const mixed = mixStick(keyInput, stick, held.pitch, held.roll);
  if (!joy) return { ...mixed, yaw: keyInput.yaw };
  return {
    pull: held.pitch ? mixed.pull : clamp(mixed.pull + joy.pull),
    roll: held.roll ? mixed.roll : clamp(mixed.roll + joy.roll),
    yaw: held.yaw ? keyInput.yaw : clamp(keyInput.yaw + joy.yaw),
  };
}

function loadSensitivityIndex() {
  try {
    const v = Number(localStorage.getItem(STORE_KEY));
    return Number.isInteger(v) && v >= 0 && v < SENSITIVITY_STEPS.length ? v : 4;
  } catch {
    return 4;
  }
}

function saveSensitivityIndex(i) {
  try {
    localStorage.setItem(STORE_KEY, String(i));
  } catch {
    // storage unavailable (private window): keep it for this visit only
  }
}

// handlers: { onMove(dx, dy) -> true if the camera used it, onWheel(throttleChange),
//   onLookButton(down), onCapture(captured) }
export function attachMouse(canvas, handlers) {
  const stick = new MouseStick(loadSensitivityIndex());
  let captured = false;

  canvas.addEventListener('click', () => {
    if (!captured) canvas.requestPointerLock?.();
  });
  document.addEventListener('pointerlockchange', () => {
    captured = document.pointerLockElement === canvas;
    handlers.onCapture?.(captured);
  });
  let lookButton = false;
  document.addEventListener('mousemove', (e) => {
    // Looking around with the right button works even without capture.
    if (!captured && !lookButton) return;
    if (handlers.onMove?.(e.movementX, e.movementY)) return; // camera looking around
    if (captured) stick.move(e.movementX, e.movementY, handlers.invertPitch?.());
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    handlers.onWheel?.(wheelThrottle(e.deltaY));
  }, { passive: false });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      lookButton = true;
      handlers.onLookButton?.(true);
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 2) {
      lookButton = false;
      handlers.onLookButton?.(false);
    }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    stick,
    get captured() {
      return captured;
    },
    adjust(step) {
      const s = stick.adjust(step);
      saveSensitivityIndex(stick.sensitivityIndex);
      return s;
    },
  };
}
