// The results of a multiplayer match: who won and why, the team scores, and every pilot's record
// (shot down, times down, hits from rounds, accuracy). Then back to the lobby (by itself after
// RESULTS_S, or the host's button). Multiplayer results never touch the Roll Call.

import { makeScreen, heading, buttons, paragraph, el } from './style.js';
import { AIRCRAFT_LIST } from '../../aircraft/index.js';
import { TEAM_LABELS } from '../../mp/netConfig.js';

const aircraftName = (id) => AIRCRAFT_LIST.find((a) => a.id === id)?.name ?? id;
const TEAM_NAME = { allied: 'Allied', central: 'Central' };

// { title, detail } for a result.
export function resultHeadline(r) {
  const title = r.winner === 'draw' ? 'A draw' : `${TEAM_NAME[r.winner]} victory`;
  const detail = {
    score: `First to ${r.scoreLimit} ${r.scoreLimit === 1 ? 'victory' : 'victories'}`,
    time: 'Time is up',
    left: `The ${TEAM_NAME[r.leftTeam] ?? ''} team left`,
    host: 'Ended by the host',
  }[r.reason] ?? '';
  return { title, detail };
}

// The table's rows: the winning team first, then by victories. you: your player id.
export function resultRows(r, you) {
  const order = (t) => (t === r.winner ? 0 : 1);
  return [...r.players]
    .sort((a, b) => order(a.team) - order(b.team) || b.kills - a.kills || a.deaths - b.deaths)
    .map((p) => ({
      you: p.id === you,
      name: p.name,
      team: TEAM_LABELS[p.team],
      aircraft: aircraftName(p.aircraft),
      kills: p.kills,
      deaths: p.deaths,
      hits: `${p.hits} / ${p.shots}`,
      accuracy: p.shots ? `${Math.round((100 * p.hits) / p.shots)}%` : '-',
    }));
}

// client: the mpClient; onLobby(): the host's "back to the lobby now"; onLeave(): leave the room.
export function createMpResults({ client, onLobby, onLeave }) {
  const s = makeScreen();
  s.card.classList.add('dp-wide');
  const title = el('h1');
  const sub = el('h2');
  s.card.append(title, sub);
  const score = paragraph(s.card, '', 'dp-code');
  score.style.fontSize = '1.8rem';
  const table = el('table', 'dp-keys dp-roster');
  s.card.appendChild(table);
  const countdown = paragraph(s.card, '', 'dp-small');
  const actions = buttons(s.card, [['Back to the lobby now', onLobby], ['Leave the room', onLeave]], true);
  const lobbyButton = actions.firstChild;

  return {
    ...s,
    // secondsLeft: until everyone is back in the lobby.
    render(secondsLeft = 0) {
      const r = client.state.result;
      if (!r) return;
      const h = resultHeadline(r);
      title.textContent = h.title;
      sub.textContent = h.detail;
      score.textContent = `Allied ${r.teams.allied} - ${r.teams.central} Central`;
      const head = el('tr');
      for (const t of ['Pilot', 'Team', 'Aircraft', 'Shot down', 'Times down', 'Hits / rounds', 'Accuracy']) head.appendChild(el('th', null, t));
      table.replaceChildren(head, ...resultRows(r, client.state.you).map((row) => {
        const tr = el('tr', row.you ? 'dp-active' : null);
        for (const v of [`${row.name}${row.you ? ' (you)' : ''}`, row.team, row.aircraft, row.kills, row.deaths, row.hits, row.accuracy]) tr.appendChild(el('td', null, String(v)));
        return tr;
      }));
      countdown.textContent = `Back to the lobby in ${Math.max(0, Math.ceil(secondsLeft))} s${client.isHost ? '' : ' (or when the host chooses)'}`;
      lobbyButton.hidden = !client.isHost;
    },
  };
}
