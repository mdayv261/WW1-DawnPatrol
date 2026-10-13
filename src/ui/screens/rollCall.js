// The Pilot Roll Call screen: the player's named pilots with their rank and record, which one is
// flying, and enlisting, renaming and retiring pilots. The rules are in src/game/pilots.js; this
// only shows the roster and passes the player's choices on. Retiring asks on the page (the
// game's frame shows no browser pop-ups).

import { makeScreen, heading, buttons, el } from './style.js';
import { rankFor, SERVICE, ACE_VICTORIES } from '../../game/career.js';
import { NAME_MAX } from '../../game/pilots.js';

const SIDE_NAMES = { allied: 'Allied', german: 'German' };

const button = (text, cls, onClick) => {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', () => {
    b.blur();
    onClick();
  });
  return b;
};

const nameBox = (value = '') => {
  const input = el('input', 'dp-name');
  input.type = 'text';
  input.maxLength = NAME_MAX;
  input.value = value;
  input.placeholder = 'Name';
  input.autocomplete = 'off';
  input.spellcheck = false;
  return input;
};

// getRoster(): the roster now; actions: { onEnlist(name, side), onRename(id, name), onRetire(id),
// onSelect(id) }, each returning an error text or null; onBack().
export function createRollCall({ getRoster, actions, onBack }) {
  const s = makeScreen();
  s.card.classList.add('dp-wide', 'dp-wider');
  heading(s.card, 'Pilot Roll Call', 'Your squadron');
  const status = el('p', 'dp-msg');
  const table = el('table', 'dp-keys dp-roster');
  s.card.append(status, table);

  // Enlisting.
  const enlistBox = el('div', 'dp-enlist');
  const newName = nameBox();
  const side = el('select');
  for (const [v, t] of Object.entries(SIDE_NAMES)) {
    const o = el('option', null, `${t} (${SERVICE[v]})`);
    o.value = v;
    side.appendChild(o);
  }
  const enlist = () => {
    const error = actions.onEnlist(newName.value, side.value);
    if (error) return say(error);
    say(`${newName.value.trim()} has joined the squadron and is flying now`);
    newName.value = '';
    render();
  };
  newName.addEventListener('keydown', (e) => { if (e.key === 'Enter') enlist(); });
  enlistBox.append(el('label', null, 'Enlist a new pilot'), newName, side, button('Enlist', null, enlist));
  s.card.appendChild(enlistBox);
  buttons(s.card, [['Back', onBack]]);

  let editing = null; // { id, kind: 'rename' | 'retire' }
  const say = (text) => { status.textContent = text; };

  function row(p, active) {
    const tr = el('tr', active ? 'dp-active' : null);
    const rank = p.needsName ? '' : rankFor(p.side, p.victories);
    const record = `${p.victories}${p.drones ? ` (+${p.drones} drones)` : ''}${p.victories >= ACE_VICTORIES ? ', Ace' : ''}`;
    const nameCell = el('td');
    const actionsCell = el('td');
    if (editing?.id === p.id && editing.kind === 'rename') {
      const box = nameBox(p.name);
      const done = () => {
        const error = actions.onRename(p.id, box.value);
        if (error) return say(error);
        editing = null;
        say(`Renamed ${box.value.trim()}`);
        render();
      };
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') done();
        if (e.key === 'Escape') { editing = null; render(); }
      });
      nameCell.appendChild(box);
      actionsCell.append(button('Save', null, done), ' ', button('Cancel', 'dp-x', () => { editing = null; render(); }));
      queueMicrotask(() => box.focus());
    } else if (editing?.id === p.id && editing.kind === 'retire') {
      nameCell.textContent = `Retire ${p.name}? The record will be removed.`;
      actionsCell.append(button('Yes, retire', null, () => {
        actions.onRetire(p.id);
        editing = null;
        say(`${p.name} has retired`);
        render();
      }), ' ', button('No', 'dp-x', () => { editing = null; render(); }));
    } else {
      nameCell.textContent = p.needsName ? `(your earlier ${SIDE_NAMES[p.side]} record: give it a name)` : `${active ? '> ' : ''}${rank} ${p.name}`;
      if (p.needsName) actionsCell.append(button('Name', null, () => { editing = { id: p.id, kind: 'rename' }; render(); }));
      else {
        if (!active) actionsCell.append(button('Fly as', null, () => { say(actions.onSelect(p.id) ?? `Flying as ${rank} ${p.name}`); render(); }), ' ');
        actionsCell.append(button('Rename', 'dp-x', () => { editing = { id: p.id, kind: 'rename' }; render(); }), ' ');
      }
      actionsCell.append(button('Retire', 'dp-x', () => { editing = { id: p.id, kind: 'retire' }; render(); }));
    }
    tr.append(nameCell, el('td', null, SIDE_NAMES[p.side]), el('td', null, record), el('td', null, `${p.missions}${p.losses ? ` (${p.losses} lost)` : ''}`), el('td', null, String(p.score)), actionsCell);
    return tr;
  }

  function render() {
    const roster = getRoster();
    const head = el('tr');
    for (const t of ['Pilot', 'Side', 'Victories', 'Missions', 'Score', '']) head.appendChild(el('th', null, t));
    const rows = roster.pilots.map((p) => row(p, p.id === roster.active));
    table.replaceChildren(head, ...rows);
    if (!roster.pilots.length) {
      const tr = el('tr');
      const td = el('td', null, 'No pilots yet: enlist one below.');
      td.colSpan = 6;
      tr.appendChild(td);
      table.appendChild(tr);
    }
  }

  const show = s.show;
  return {
    ...s,
    // message: a line to show at the top (e.g. "Enlist a pilot first").
    show(message = '') {
      editing = null;
      const waiting = getRoster().pilots.find((p) => p.needsName);
      say(message || (waiting ? `Name the pilot of your earlier ${SIDE_NAMES[waiting.side]} record (Name), or retire it` : 'Choose who flies, or enlist a new pilot'));
      render();
      show();
      if (!getRoster().pilots.length) newName.focus();
    },
  };
}
