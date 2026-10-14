// The room screens: the lobby (the code, the players, your team, aircraft and ready, the host's
// match settings and Start) and, until flying together arrives in M2, a placeholder for the
// match. They draw what the server last sent (mpClient.state) and pass choices on.

import { makeScreen, heading, buttons, choice, setChoices, paragraph, el } from './style.js';
import { STARTS, TIMES } from '../../game/flow.js';
import { AIRCRAFT_LIST } from '../../aircraft/index.js';
import { TEAM_IDS, TEAM_LABELS, SETTING_CHOICES } from '../../mp/netConfig.js';
import { aircraftOfTeam } from '../../mp/roomCore.js';

const aircraftName = (id) => AIRCRAFT_LIST.find((a) => a.id === id)?.name ?? id;

// The host's settings as drop-downs: [key, label, [[value, text], ...]].
const SETTING_ROWS = [
  ['start', 'Starting point', STARTS.map((s) => [s.id, s.label])],
  ['timeOfDay', 'Daylight', TIMES.map((t) => [t.id, t.label])],
  ['scoreLimit', 'Score to win', SETTING_CHOICES.scoreLimit.map((n) => [n, `${n} victories`])],
  ['timeLimit', 'Time limit', SETTING_CHOICES.timeLimit.map((n) => [n, `${n} minutes`])],
  ['friendlyFire', 'Friendly fire', [[false, 'Off'], [true, 'On (you can hit your own side)']]],
  ['structuralDamage', 'Structural damage', [[true, 'On (too much g or speed breaks the wings)'], [false, 'Off']]],
];

// A drop-down's text value back to the setting's own type (number, true / false, text).
const settingValue = (key, text) => SETTING_CHOICES[key].find((v) => String(v) === text);

// One line for each setting, for the match screen.
export function settingsText(settings) {
  return SETTING_ROWS.map(([key, label, options]) => `${label}: ${options.find(([v]) => v === settings[key])?.[1] ?? settings[key]}`);
}

// client: the mpClient; onLeave(): leave the room; netsimNote(): the test network in words ('' when off).
export function createLobby({ client, onLeave, netsimNote = () => '' }) {
  const s = makeScreen();
  s.card.classList.add('dp-wide');
  heading(s.card, 'Room');
  const code = paragraph(s.card, '', 'dp-code');
  const copyRow = el('div', 'dp-inline');
  const copy = el('button', null, 'Copy code');
  copy.type = 'button';
  copy.addEventListener('click', () => {
    navigator.clipboard?.writeText(client.state.code ?? '').then(() => say('Code copied: send it to the others'), () => say('Could not copy: read the code out instead'));
  });
  copyRow.append(el('span', null, 'Give this code to the others.'), copy);
  s.card.appendChild(copyRow);
  const status = paragraph(s.card, '', 'dp-msg');
  const table = el('table', 'dp-keys dp-roster');
  s.card.appendChild(table);

  // Your choices.
  const mine = el('div', 'dp-section');
  mine.appendChild(el('h3', null, 'Your aircraft'));
  const team = choice(mine, 'Team', TEAM_IDS.map((t) => [t, TEAM_LABELS[t]]), 'allied', (v) => client.setTeam(v));
  const aircraft = choice(mine, 'Aircraft', [], '', (v) => client.setAircraft(v));
  const readyRow = buttons(mine, [['Ready', () => client.setReady(!client.me?.ready)]], true);
  const readyButton = readyRow.firstChild;
  s.card.appendChild(mine);

  // The host's settings (everyone sees them; only the host can change them).
  const match = el('div', 'dp-section');
  const matchTitle = el('h3', null, 'Match settings');
  match.appendChild(matchTitle);
  const selects = {};
  for (const [key, label, options] of SETTING_ROWS) {
    selects[key] = choice(match, label, options, options[0][0], (v) => client.setSettings({ [key]: settingValue(key, v) }));
  }
  s.card.appendChild(match);

  const reason = paragraph(s.card, '', 'dp-small');
  const actions = buttons(s.card, [['Start the match', () => client.startMatch()], ['Leave the room', onLeave]], true);
  const startButton = actions.firstChild;
  const pingLine = paragraph(s.card, '', 'dp-small');

  const say = (text) => { status.textContent = text; };

  function playersTable(lobby) {
    const head = el('tr');
    for (const t of ['Pilot', 'Team', 'Aircraft', '']) head.appendChild(el('th', null, t));
    const rows = lobby.players.map((p) => {
      const tr = el('tr', p.id === client.state.you ? 'dp-active' : null);
      const who = `${p.name}${p.id === lobby.hostId ? ' (host)' : ''}${p.id === client.state.you ? ' (you)' : ''}`;
      const state = !p.connected ? 'reconnecting...' : p.ready ? 'READY' : 'not ready';
      tr.append(el('td', null, who), el('td', null, TEAM_LABELS[p.team]), el('td', null, aircraftName(p.aircraft)), el('td', null, state));
      return tr;
    });
    table.replaceChildren(head, ...rows);
  }

  return {
    ...s,
    // Draw the latest lobby (call whenever the client's state changes). note: the room's latest notice.
    render(note = '') {
      const { lobby, message, status: st } = client.state;
      if (!lobby) return;
      code.textContent = lobby.code;
      playersTable(lobby);
      const me = client.me;
      const host = client.isHost;
      if (me) {
        team.value = me.team;
        setChoices(aircraft, aircraftOfTeam(me.team).map((a) => [a.id, a.name]), me.aircraft);
        readyButton.textContent = me.ready ? 'Not ready after all' : 'I am ready';
      }
      for (const [key] of SETTING_ROWS) {
        selects[key].value = String(lobby.settings[key]);
        selects[key].disabled = !host;
      }
      matchTitle.textContent = host ? 'Match settings (you are the host)' : 'Match settings (set by the host)';
      startButton.hidden = !host;
      startButton.disabled = !lobby.canStart.ok;
      reason.textContent = lobby.canStart.ok ? (host ? 'Everyone is ready: start when you like.' : 'Everyone is ready: waiting for the host to start.') : lobby.canStart.reason;
      say(st === 'reconnecting' ? 'Connection lost: reconnecting...' : message || note);
      this.update();
    },
    // The ping line (it changes without a message from the room).
    update() {
      const ping = client.ping;
      const sim = netsimNote();
      pingLine.textContent = `${ping === null ? 'Ping: measuring...' : `Ping ${Math.round(ping)} ms`}${sim ? ` (test network: ${sim})` : ''}`;
    },
  };
}

// The placeholder match screen (flying together comes in M2). onLobby(): the host's way back.
export function createMpMatch({ client, onLobby, onLeave }) {
  const s = makeScreen();
  heading(s.card, 'Match started', 'A test match: flying together comes in the next stage (M2)');
  paragraph(s.card, 'For now this screen is as far as a match goes: there is nothing to fly yet. The host presses "Back to the lobby" to end the test match; everyone then presses "I am ready" again for the next one.', 'dp-small');
  const status = paragraph(s.card, '', 'dp-msg');
  const list = el('table', 'dp-table');
  const settings = el('p', 'dp-small');
  s.card.append(list, settings);
  const actions = buttons(s.card, [['Back to the lobby', onLobby], ['Leave the room', onLeave]], true);
  const lobbyButton = actions.firstChild;
  return {
    ...s,
    render(note = '') {
      const m = client.state.match;
      if (!m) return;
      status.textContent = client.state.status === 'reconnecting' ? 'Connection lost: reconnecting...' : client.state.message || note;
      list.replaceChildren(...m.players.map((p) => {
        const tr = el('tr');
        tr.append(el('td', null, `${p.name} (${TEAM_LABELS[p.team]})`), el('td', null, aircraftName(p.aircraft)));
        return tr;
      }));
      settings.textContent = settingsText(m.settings).join('   ');
      lobbyButton.hidden = !client.isHost;
    },
  };
}
