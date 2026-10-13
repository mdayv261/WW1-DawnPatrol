// The Controls screen's keyboard tab: every action with its two key slots. Click a slot,
// then press the new key (Esc cancels); x clears a slot. A key does one thing only, so it
// is taken from wherever it was, and the line at the top says so. The rules are in
// src/input/bindings.js; this only shows them and passes the player's choices on.

import { el } from './style.js';
import { ACTIONS, GROUPS, SLOTS, actionLabel, keyLabel, rebind } from '../../input/bindings.js';

const HINT = 'Click a key to change it, then press the new key (Esc cancels). x clears it.';

// getBindings(): the bindings now; onBindings(bindings): use and save new ones;
// captureNext(callback or null): the keyboard hands its next key press to callback.
export function createKeysTab({ getBindings, onBindings, captureNext, onReset }) {
  const root = el('div');
  const status = el('p', 'dp-msg', HINT);
  const table = el('table', 'dp-keys');
  root.append(status, table);
  const slots = {}; // action -> [slot buttons]
  let listening = null; // { action, slot }

  const say = (text) => { status.textContent = text; };

  function refresh() {
    const b = getBindings();
    for (const [action, list] of Object.entries(slots)) {
      list.forEach((button, i) => {
        const waiting = listening && listening.action === action && listening.slot === i;
        button.textContent = waiting ? 'press a key...' : keyLabel(b.keys[action][i]);
        button.classList.toggle('listening', Boolean(waiting));
      });
    }
  }

  function stop() {
    listening = null;
    captureNext(null);
    refresh();
  }

  function apply(action, slot, key) {
    const label = actionLabel(action);
    const r = rebind(getBindings(), action, slot, key);
    if (r.refused) return say(`${keyLabel(key)} is kept for the game (Esc, Tab and the F keys cannot be used)`);
    onBindings(r.bindings);
    if (key === null) say(`${label}: key cleared`);
    else if (r.moved) say(`${label}: ${keyLabel(key)}. ${keyLabel(key)} was ${actionLabel(r.moved).toLowerCase()}: now unassigned there`);
    else say(`${label}: ${keyLabel(key)}`);
  }

  function listen(action, slot) {
    listening = { action, slot };
    say(`Press the new key for ${actionLabel(action).toLowerCase()} (Esc cancels)`);
    captureNext((key) => {
      const was = listening;
      listening = null;
      if (key === 'Escape' || !was) say(HINT);
      else apply(was.action, was.slot, key);
      refresh();
    });
    refresh();
  }

  const button = (text, cls, onClick) => {
    const b = el('button', cls, text);
    b.type = 'button';
    b.addEventListener('click', () => {
      b.blur(); // the next key goes to the game's keyboard handler, not to this button
      onClick();
    });
    return b;
  };

  for (const group of GROUPS) {
    const head = el('tr');
    const th = el('th', null, group);
    th.colSpan = 1 + SLOTS * 2;
    head.appendChild(th);
    table.appendChild(head);
    for (const a of ACTIONS.filter((x) => x.group === group)) {
      const tr = el('tr');
      tr.appendChild(el('td', null, a.label));
      slots[a.id] = [];
      for (let i = 0; i < SLOTS; i++) {
        const slot = button('', null, () => listen(a.id, i));
        const clear = button('x', 'dp-x', () => {
          stop();
          apply(a.id, i, null);
          refresh();
        });
        clear.title = 'Clear this key';
        slots[a.id].push(slot);
        const td = el('td');
        td.append(slot, ' ', clear);
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
  }
  const reset = button('Reset keyboard to the defaults', null, () => {
    stop();
    onReset();
    say('Keyboard back to the defaults');
    refresh();
  });
  const foot = el('div', 'dp-buttons row');
  foot.appendChild(reset);
  root.appendChild(foot);

  return {
    root,
    show() {
      say(HINT);
      refresh();
    },
    cancel: stop,
  };
}
