// Joystick test and set-up screen (F2). Shows what the stick reports (every
// axis as a bar, every button lit while pressed, the hat direction) and lets
// the player reassign controls without changing code: click "Learn", then move
// the control. Also invert, dead zone and curve. Everything is saved.

import { BUTTON_LABELS } from '../input/joystickMapping.js';

const STYLE = `
  position: fixed; top: 52px; left: 10px; z-index: 12; display: none; max-width: 440px;
  padding: 10px 12px; border-radius: 6px; background: rgba(10, 16, 10, 0.86);
  color: #e8f0e0; font: 12px/1.4 ui-monospace, Menlo, Consolas, monospace;
`;
const BUTTON = `
  margin: 2px; padding: 4px 6px; font: 11px ui-monospace, Menlo, Consolas, monospace;
  background: #2f3d2a; color: #e8f0e0; border: 1px solid #6b7a4a; border-radius: 4px; cursor: pointer;
`;
const AXIS_FUNCTIONS = [
  ['roll', 'Roll (stick left-right)'],
  ['pitch', 'Pitch (stick forward-back)'],
  ['yaw', 'Rudder (twist)'],
  ['throttle', 'Throttle (slider)'],
];

function element(tag, css, text) {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  if (text !== undefined) e.textContent = text;
  return e;
}

// joystick: the object returned by attachJoystick.
export function createJoystickPanel(joystick) {
  const root = element('div', STYLE);
  root.appendChild(element('div', 'margin-bottom: 6px;', 'JOYSTICK (F2 to hide)'));
  const device = root.appendChild(element('div', 'margin-bottom: 6px; color: #b9d08a;'));
  const axesBox = root.appendChild(element('pre', 'margin: 0 0 6px; white-space: pre;'));
  const buttonsBox = root.appendChild(element('div', 'display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 6px;'));
  const hatLine = root.appendChild(element('div', 'margin-bottom: 6px;'));
  const learnLine = root.appendChild(element('div', 'min-height: 1.4em; margin-bottom: 4px; color: #ffd36b;'));
  const settings = root.appendChild(element('pre', 'margin: 6px 0 0; white-space: pre;'));

  const buttonRow = root.insertBefore(element('div'), settings);
  const addButton = (label, onClick) => {
    const b = buttonRow.appendChild(element('button', BUTTON, label));
    b.addEventListener('click', () => {
      b.blur(); // keep keyboard input going to the game
      onClick();
    });
  };
  for (const [name, label] of AXIS_FUNCTIONS) addButton(`Learn ${label.split(' ')[0]}`, () => joystick.startLearn(name));
  addButton('Learn hat', () => joystick.startLearn('hat'));
  addButton('Cancel', () => joystick.cancelLearn());
  const tuning = root.insertBefore(element('div'), settings);
  const addTuning = (label, onClick) => {
    const b = tuning.appendChild(element('button', BUTTON, label));
    b.addEventListener('click', () => {
      b.blur();
      onClick();
    });
  };
  for (const [name, label] of AXIS_FUNCTIONS) addTuning(`Flip ${label.split(' ')[0]}`, () => joystick.toggleInvert(name));
  addTuning('Stick dead zone -', () => { joystick.adjust('roll', -0.01); joystick.adjust('pitch', -0.01); });
  addTuning('+', () => { joystick.adjust('roll', 0.01); joystick.adjust('pitch', 0.01); });
  addTuning('Twist dead zone -', () => joystick.adjust('yaw', -0.02));
  addTuning('+', () => joystick.adjust('yaw', 0.02));
  addTuning('Curve -', () => joystick.adjust('expo', -0.1));
  addTuning('+', () => joystick.adjust('expo', 0.1));
  addTuning('Reset all', () => joystick.reset());
  document.body.appendChild(root);

  const bar = (v) => {
    const n = Math.round(((Math.max(-1, Math.min(1, v)) + 1) / 2) * 20);
    return `[${'#'.repeat(n)}${'.'.repeat(20 - n)}]`;
  };

  return {
    toggle() {
      root.style.display = root.style.display === 'none' ? 'block' : 'none';
    },
    get visible() {
      return root.style.display !== 'none';
    },
    // Refresh (call about ten times a second).
    update() {
      const pad = joystick.pad;
      const m = joystick.mapping;
      if (!pad) {
        device.textContent = 'No joystick found. Plug it in and press the trigger once.';
        axesBox.textContent = '';
        buttonsBox.replaceChildren();
        hatLine.textContent = '';
      } else {
        device.textContent = `${pad.id}`;
        const used = {};
        for (const [name, label] of AXIS_FUNCTIONS) used[m.axes[name].index] = label.split(' ')[0];
        if (m.hat.type === 'axis') used[m.hat.index] = 'Hat';
        if (m.hat.type === 'axes2') {
          used[m.hat.x] = 'Hat x';
          used[m.hat.y] = 'Hat y';
        }
        axesBox.textContent = Array.from(pad.axes)
          .map((v, i) => `Axis ${String(i).padStart(2)} ${bar(v)} ${v.toFixed(2).padStart(5)}  ${used[i] ?? ''}`)
          .join('\n');
        const names = {};
        for (const [action, i] of Object.entries(m.buttons)) names[i] = BUTTON_LABELS[action];
        buttonsBox.replaceChildren(
          ...Array.from(pad.buttons).map((b, i) => {
            const cell = element(
              'span',
              `padding: 1px 5px; border: 1px solid #6b7a4a; border-radius: 3px; background: ${b.pressed ? '#c9d86a' : '#1b241a'}; color: ${b.pressed ? '#101810' : '#e8f0e0'};`,
              String(i + 1),
            );
            cell.title = names[i] ?? 'unassigned';
            return cell;
          }),
        );
        const h = joystick.hat();
        const dir = `${h.y > 0 ? 'up' : h.y < 0 ? 'down' : ''}${h.x > 0 ? ' right' : h.x < 0 ? ' left' : ''}`.trim();
        hatLine.textContent = `Hat: ${dir || 'centred'}   (${m.hat.type === 'buttons' ? 'four buttons' : m.hat.type === 'axes2' ? 'two axes' : 'one axis'})`;
      }
      learnLine.textContent = joystick.learning;
      settings.textContent = [
        `Stick dead zone ${m.axes.roll.deadzone.toFixed(2)}   twist dead zone ${m.axes.yaw.deadzone.toFixed(2)}   curve ${m.expo.toFixed(1)}`,
        `Flipped: ${AXIS_FUNCTIONS.filter(([n]) => m.axes[n].invert).map(([, l]) => l.split(' ')[0]).join(', ') || 'none'}`,
        'Buttons: 1 fire, 2 camera, 3/4 trim down/up, 5 readout, 6 centre mouse stick, 7 pause, 8 restart',
      ].join('\n');
    },
  };
}
