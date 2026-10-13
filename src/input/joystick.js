// Browser wiring for the USB joystick (Logitech Extreme 3D Pro) through the
// Gamepad API. poll() is called once per frame by main.js; it returns the
// current stick reading and calls the one-shot button handlers. The logic is in
// joystickMath.js (tested); the mapping and its saved copy are in
// joystickMapping.js.
//
// Chrome only reports a joystick after a button press or axis movement while
// the page has focus, so the connect notice asks for a trigger press.

import { BUTTON_LABELS, DEFAULT_MAPPING, HELD_BUTTONS, STORE_KEY, assignButton, mergeMapping } from './joystickMapping.js';
import { AxisLearner, ButtonLearner, HatLearner, choosePad, createMemory, decodeHat, describePads, readJoystick } from './joystickMath.js';

function load() {
  try {
    return mergeMapping(JSON.parse(localStorage.getItem(STORE_KEY)));
  } catch {
    return mergeMapping(null);
  }
}

function save(mapping) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(mapping));
  } catch {
    // storage unavailable (private window): the mapping lasts for this visit only
  }
}

const SEEN_KEY = 'dawnPatrol.joystickSeen';
function seenBefore() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // storage unavailable: no hint memory, nothing else lost
  }
}

const AXIS_NAMES = { roll: 'Roll', pitch: 'Pitch', yaw: 'Rudder', throttle: 'Throttle' };

// handlers: { onNotice(text), onAction(action) } - onAction does a one-shot command (camera,
// pause, ...: the keyboard's, see pressAction in keyboard.js) when its button is pressed.
// getPads defaults to the browser's; tests and dev automation can pass their own.
export function attachJoystick(handlers, getPads = () => navigator.getGamepads?.() ?? []) {
  let mapping = load();
  let memory = createMemory();
  let padId = null;
  let learner = null; // { kind, axes | hat | button }; kind 'button:<action>' for a button
  let prompt = '';
  let message = ''; // the result of the last change, for the Controls screen

  window.addEventListener('gamepadconnected', () => handlers.onNotice?.('Joystick found (F2 shows its controls)'));
  window.addEventListener('gamepaddisconnected', () => handlers.onNotice?.('Joystick unplugged'));

  function finishLearn(text) {
    learner = null;
    prompt = '';
    message = text;
    save(mapping);
    handlers.onNotice?.(text);
  }

  // The buttons down now count as already pressed, so the one just learned does not act.
  function holdCurrent(pad) {
    for (const [action, i] of Object.entries(mapping.buttons)) if (i !== null && pad.buttons?.[i]?.pressed) memory.held.add(action);
  }

  function feedLearner(pad) {
    if (learner.kind.startsWith('button:')) {
      const i = learner.button.feed(pad);
      if (i === null) return;
      const action = learner.kind.slice(7);
      const moved = assignButton(mapping, action, i);
      holdCurrent(pad);
      finishLearn(`${BUTTON_LABELS[action]} is now button ${i + 1}${moved ? ` (taken from ${BUTTON_LABELS[moved].toLowerCase()})` : ''}`);
      return;
    }
    if (learner.kind === 'hat') {
      const r = learner.hat.feed(pad);
      prompt = r.prompt;
      if (r.hat) {
        mapping.hat = r.hat;
        finishLearn('Hat assigned');
      }
      return;
    }
    const i = learner.axes.feed(pad);
    if (i === null) return;
    mapping.axes[learner.kind].index = i;
    finishLearn(`${AXIS_NAMES[learner.kind]} is now axis ${i}`);
  }

  return {
    // The current stick reading, or null when no joystick is reported.
    poll() {
      const pad = choosePad(getPads());
      if (!pad) {
        padId = null;
        return null;
      }
      if (pad.id !== padId) {
        padId = pad.id;
        memory = createMemory();
        markSeen();
      }
      if (learner) {
        feedLearner(pad);
        return null; // the stick does not fly the aircraft while it is being set up
      }
      const joy = readJoystick(pad, mapping, memory);
      for (const action of joy.pressedNow) if (!HELD_BUTTONS.has(action)) handlers.onAction?.(action);
      return joy;
    },

    get pad() {
      return choosePad(getPads());
    },
    // True once a stick has been seen in this browser (so a missing one is worth a hint).
    get seenBefore() {
      return seenBefore();
    },
    // What the browser is showing the page, in words.
    describe() {
      return describePads(getPads());
    },
    get mapping() {
      return mapping;
    },
    get learning() {
      return learner ? prompt || 'Move the control you want to assign' : '';
    },
    // What learning is waiting for ('roll', 'hat', 'button:fire'...), or ''.
    get learningKind() {
      return learner?.kind ?? '';
    },
    // The last change made (for the Controls screen), or ''.
    get message() {
      return message;
    },

    hat() {
      return decodeHat(choosePad(getPads()), mapping.hat);
    },

    // kind: 'roll' | 'pitch' | 'yaw' | 'throttle' | 'hat' | 'button:<action>'
    startLearn(kind) {
      const pad = choosePad(getPads());
      if (!pad) {
        message = 'No joystick found: press the trigger once';
        return handlers.onNotice?.(message);
      }
      if (kind.startsWith('button:')) {
        learner = { kind, button: new ButtonLearner(pad) };
        prompt = `Press the button for ${BUTTON_LABELS[kind.slice(7)].toLowerCase()}`;
      } else if (kind === 'hat') {
        learner = { kind, hat: new HatLearner(pad) };
        prompt = learner.hat.prompt;
      } else {
        learner = { kind, axes: new AxisLearner(pad) };
        prompt = `Move the ${AXIS_NAMES[kind].toLowerCase()} control through its full range`;
      }
    },
    cancelLearn() {
      learner = null;
      prompt = '';
    },
    // Take a command off its button.
    clearButton(action) {
      assignButton(mapping, action, null);
      message = `${BUTTON_LABELS[action]}: no button`;
      save(mapping);
    },

    // Panel settings. Each saves at once.
    toggleInvert(name) {
      mapping.axes[name].invert = !mapping.axes[name].invert;
      save(mapping);
    },
    // Set a dead zone (an axis name) or the curve ('expo') directly (the Controls screen's sliders).
    set(setting, value) {
      const v = Math.round(Math.min(setting === 'expo' ? 1 : 0.5, Math.max(0, value)) * 100) / 100;
      if (setting === 'expo') mapping.expo = v;
      else mapping.axes[setting].deadzone = v;
      save(mapping);
    },
    adjust(setting, step) {
      const clamp = (v, hi) => Math.round(Math.min(hi, Math.max(0, v)) * 100) / 100;
      if (setting === 'expo') mapping.expo = clamp(mapping.expo + step, 1);
      else mapping.axes[setting].deadzone = clamp(mapping.axes[setting].deadzone + step, 0.5);
      save(mapping);
    },
    reset() {
      mapping = mergeMapping(DEFAULT_MAPPING);
      learner = null;
      message = 'Joystick settings back to the defaults';
      save(mapping);
    },
  };
}
