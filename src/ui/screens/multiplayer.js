// The Multiplayer screen: your name, Create a room, Join with a code, and the test-network
// settings (the network simulator, for trying the game as if on a slow line). It only gathers
// the choices and calls back; src/net/mpClient.js does the connecting.

import { makeScreen, heading, buttons, paragraph, el } from './style.js';
import { NAME_MAX } from '../../game/pilots.js';
import { CODE_LENGTH } from '../../mp/netConfig.js';
import { NETSIM_LIMITS, cleanNetsim } from '../../net/netSim.js';

const input = (cls, type = 'text') => {
  const i = el('input', cls);
  i.type = type;
  i.autocomplete = 'off';
  i.spellcheck = false;
  return i;
};

// getName(): the name to offer (the Roll Call pilot's); getNetsim(): the test-network settings;
// onCreate(name), onJoin(code, name), onNetsim(settings), onBack().
export function createMultiplayerScreen({ getName, getNetsim, onCreate, onJoin, onNetsim, onBack }) {
  const s = makeScreen();
  heading(s.card, 'Multiplayer', 'A private room for family and friends');
  const status = paragraph(s.card, '', 'dp-msg');

  const name = input('dp-name');
  name.maxLength = NAME_MAX;
  name.placeholder = 'Your name';
  const nameRow = el('div', 'dp-inline');
  nameRow.append(el('label', null, 'Your name'), name);
  s.card.appendChild(nameRow);

  const say = (text) => { status.textContent = text; };
  const create = () => onCreate(name.value);
  const join = () => onJoin(code.value, name.value);

  buttons(s.card, [['Create a room', create]]);

  const code = input('dp-name dp-codebox');
  code.maxLength = CODE_LENGTH + 3; // room for a dash or spaces
  code.placeholder = 'Code';
  code.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
  const joinRow = el('div', 'dp-inline');
  const joinButton = el('button', null, 'Join');
  joinButton.type = 'button';
  joinButton.addEventListener('click', join);
  joinRow.append(el('label', null, 'Or join a room:'), code, joinButton);
  s.card.appendChild(joinRow);

  // The network simulator: these settings apply to this window only.
  const box = el('div', 'dp-section');
  box.appendChild(el('h3', null, 'Test network (this window only)'));
  const fields = {};
  const row = el('div', 'dp-inline');
  for (const [key, label] of [['ping', 'extra ping, ms'], ['jitter', 'jitter, ms'], ['loss', 'loss, %']]) {
    const f = input(null, 'number');
    f.min = '0';
    f.max = String(NETSIM_LIMITS[key]);
    f.step = key === 'loss' ? '0.5' : '10';
    f.addEventListener('change', () => onNetsim(cleanNetsim({ ping: Number(fields.ping.value), jitter: Number(fields.jitter.value), loss: Number(fields.loss.value) })));
    fields[key] = f;
    row.append(f, el('span', null, label));
  }
  box.appendChild(row);
  paragraph(box, 'Leave at 0 for normal play. For testing, for example 150 ms ping, 20 ms jitter and 2% loss.', 'dp-small');
  s.card.appendChild(box);

  buttons(s.card, [['Back', onBack]]);

  const show = s.show;
  return {
    ...s,
    say,
    // message: a line to show at the top (an error from the room, for example).
    show(message = '') {
      if (!name.value) name.value = getName() ?? '';
      const n = getNetsim();
      for (const key of Object.keys(fields)) fields[key].value = String(n[key]);
      say(message);
      show();
      (name.value ? code : name).focus();
    },
  };
}
