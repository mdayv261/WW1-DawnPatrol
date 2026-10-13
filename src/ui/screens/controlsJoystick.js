// The Controls screen's joystick tab: the four axes (live bar, Learn, Flip), the hat, the
// dead zones and curve, and every command with its button (Set, then press the button; x
// takes it off). The work is done by the joystick object (src/input/joystick.js); this
// shows it. update() is called about ten times a second while the screen is up.

import { el } from './style.js';
import { BUTTON_LABELS } from '../../input/joystickMapping.js';

const AXES = [
  ['roll', 'Roll (stick left-right)'],
  ['pitch', 'Pitch (stick forward-back)'],
  ['yaw', 'Rudder (twist)'],
  ['throttle', 'Throttle (slider)'],
];
const SLIDERS = [
  ['pitch', 'Stick dead zone', 0.5], // the stick's two axes share one dead zone
  ['yaw', 'Twist dead zone', 0.5],
  ['expo', 'Curve (gentler near the centre)', 1],
];

const button = (text, cls, onClick) => {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', () => {
    b.blur();
    onClick();
  });
  return b;
};

const row = (table, cells) => {
  const tr = el('tr');
  for (const c of cells) {
    const td = el('td');
    if (c !== null) td.append(c);
    tr.appendChild(td);
  }
  table.appendChild(tr);
  return tr;
};

const heading = (table, text) => {
  const tr = el('tr');
  const th = el('th', null, text);
  th.colSpan = 5;
  tr.appendChild(th);
  table.appendChild(tr);
};

export function createJoystickTab(joystick) {
  const root = el('div');
  const device = el('p', 'dp-small');
  const status = el('p', 'dp-msg');
  const table = el('table', 'dp-keys');
  root.append(device, status, table);
  const live = []; // functions refreshing one part each

  heading(table, 'Axes');
  for (const [name, label] of AXES) {
    const number = el('span');
    const bar = el('div', 'dp-bar');
    const mark = el('span');
    bar.appendChild(mark);
    const flip = button('', null, () => joystick.toggleInvert(name));
    row(table, [label, number, bar, button('Learn', null, () => joystick.startLearn(name)), flip]);
    live.push((pad, m) => {
      const i = m.axes[name].index;
      number.textContent = `axis ${i}`;
      const v = pad?.axes?.[i] ?? 0;
      mark.style.left = `${((Math.max(-1, Math.min(1, v)) + 1) / 2) * 100}%`;
      flip.textContent = m.axes[name].invert ? 'Flipped' : 'Flip';
    });
  }
  const hatType = el('span');
  const hatDir = el('span');
  row(table, ['Hat (look around)', hatType, hatDir, button('Learn', null, () => joystick.startLearn('hat')), null]);
  live.push((pad, m) => {
    hatType.textContent = m.hat.type === 'buttons' ? 'four buttons' : m.hat.type === 'axes2' ? 'two axes' : `axis ${m.hat.index}`;
    const h = joystick.hat();
    hatDir.textContent = `${h.y > 0 ? 'up' : h.y < 0 ? 'down' : ''}${h.x > 0 ? ' right' : h.x < 0 ? ' left' : ''}`.trim() || 'centred';
  });

  heading(table, 'Response');
  const sliders = SLIDERS.map(([setting, label, max]) => {
    const input = el('input');
    input.type = 'range';
    input.min = '0';
    input.max = String(max * 100);
    const value = el('span');
    input.addEventListener('input', () => {
      const v = Number(input.value) / 100;
      joystick.set(setting, v);
      if (setting === 'pitch') joystick.set('roll', v);
      value.textContent = v.toFixed(2);
    });
    row(table, [label, value, input, null, null]);
    return { setting, input, value };
  });
  const showSliders = () => {
    const m = joystick.mapping;
    for (const s of sliders) {
      const v = s.setting === 'expo' ? m.expo : m.axes[s.setting].deadzone;
      s.input.value = String(Math.round(v * 100));
      s.value.textContent = v.toFixed(2);
    }
  };

  heading(table, 'Buttons');
  for (const [action, label] of Object.entries(BUTTON_LABELS)) {
    const number = el('span');
    const lit = el('span', 'dp-lit');
    const set = button('Set', null, () => joystick.startLearn(`button:${action}`));
    const clear = button('x', 'dp-x', () => joystick.clearButton(action));
    clear.title = 'No button for this';
    row(table, [label, number, lit, set, clear]);
    live.push((pad, m) => {
      const i = m.buttons[action];
      number.textContent = i === null ? '-' : `button ${i + 1}`;
      lit.classList.toggle('on', i !== null && Boolean(pad?.buttons?.[i]?.pressed));
      const waiting = joystick.learningKind === `button:${action}`;
      set.textContent = waiting ? 'press it...' : 'Set';
      set.classList.toggle('listening', waiting);
    });
  }

  const foot = el('div', 'dp-buttons row');
  foot.append(
    button('Cancel learning', null, () => joystick.cancelLearn()),
    button('Reset joystick to the defaults', null, () => {
      joystick.reset();
      showSliders();
    }),
  );
  root.appendChild(foot);

  return {
    root,
    show() {
      showSliders();
      this.update();
    },
    cancel: () => joystick.cancelLearn(),
    update() {
      const pad = joystick.pad;
      const m = joystick.mapping;
      device.textContent = pad ? pad.id : 'No joystick found. Plug it in and press the trigger once.';
      status.textContent = joystick.learning || joystick.message || 'Learn: move the control. Set: press the button. Settings are saved at once.';
      for (const f of live) f(pad, m);
    },
  };
}
