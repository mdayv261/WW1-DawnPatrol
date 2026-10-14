// The room screens: the lobby (the code, the players, your team, aircraft and ready, the host's
// match settings and Start) and the match's Esc menu. They draw what the server last sent
// (mpClient.state) and pass choices on.

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
  paragraph(s.card, 'Send the code to the others. Everyone picks a team and presses I am ready; then the host starts the match.', 'dp-small');

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

// The match's Esc menu. The match never pauses: your aircraft flies on underneath. The host can
// end the match for everyone (back to the lobby).
export function createMpEsc({ client, onResume, onOptions, onEnd, onLeave }) {
  const s = makeScreen();
  heading(s.card, 'Match', 'The match goes on while this menu is open');
  const score = paragraph(s.card, '', 'dp-code');
  score.style.fontSize = '1.6rem';
  const tally = paragraph(s.card, '', 'dp-small');
  const status = paragraph(s.card, '', 'dp-msg');
  const actions = buttons(s.card, [['Resume', onResume], ['Options', onOptions], ['End the match for everyone', onEnd], ['Leave the room', onLeave]]);
  const endButton = actions.children[2];
  return {
    ...s,
    render(note = '') {
      endButton.hidden = !client.isHost;
      const sc = client.state.score;
      score.textContent = `Allied ${sc?.teams.allied ?? 0} - ${sc?.teams.central ?? 0} Central`;
      const me = sc?.players.find((p) => p.id === client.state.you);
      tally.textContent = me ? `You: ${me.kills} shot down, ${me.deaths} times down, ${me.hits} hits from ${me.shots} rounds` : '';
      status.textContent = client.state.status === 'reconnecting' ? 'Connection lost: reconnecting...' : client.state.message || note;
    },
  };
}
