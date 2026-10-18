// One multiplayer room's lobby, as a pure state machine (no sockets, no clock of its own), so
// every rule can be tested in Node and the same code runs on the room server.
//
// Players join with a name and a private token (kept by their browser tab, so a reload can
// take back the same place). The first player is the host; when the host goes, the player who
// joined earliest and is still connected takes over. Each player picks a team and an aircraft
// of that team's side, and says when they are ready; the host sets the match and starts it.
//
// Every call puts the messages to send in `outbox` ([{ to: playerId | 'all', msg }]); the
// server empties it and sends them.

import { ALL_AIRCRAFT, AIRCRAFT } from '../aircraft/index.js';
import { aircraftOfEra } from '../aircraft/eras.js';
import { checkName, tidyName, NAME_MAX } from '../game/pilots.js';
import { PROTOCOL_VERSION, MIN_PLAYERS, MAX_PLAYERS, REJOIN_GRACE_S, TEAMS, TEAM_IDS, DEFAULT_SETTINGS, cleanSettings } from './netConfig.js';
import { welcome, lobbyMessage, matchStart, matchEnd, notice, pong, errorMessage } from './protocol.js';

// The aircraft a team may fly: its side's (the `side` in each aircraft's data), of the era the
// host chose, or of both eras with mixed eras on. With no settings, the default (Late War).
export const aircraftOfTeam = (team, settings = DEFAULT_SETTINGS) =>
  (settings.mixedEras ? ALL_AIRCRAFT : aircraftOfEra(settings.era ?? DEFAULT_SETTINGS.era)).filter((a) => a.side === TEAMS[team]);

// Can this aircraft fly with this loadout? ('standard' always; the others from its own data.)
export const loadoutAllowed = (aircraftId, loadout) => loadout === 'standard' || Boolean(AIRCRAFT[aircraftId]?.loadouts?.[loadout]);

export class RoomCore {
  constructor(code) {
    this.code = code;
    this.players = new Map(); // id -> { id, token, name, team, aircraft, ready, connected, order, leftAt }
    this.hostId = null;
    this.phase = 'lobby'; // 'lobby' | 'match' | 'results'
    this.result = null; // the last match's result while it is shown
    this.endRequested = false; // the host asked to end the match (the room server then ends it)
    this.settings = { ...DEFAULT_SETTINGS };
    this.outbox = [];
    this.nextOrder = 1;
  }

  send(to, msg) {
    this.outbox.push({ to, msg });
  }

  get connected() {
    return [...this.players.values()].filter((p) => p.connected);
  }

  // A player joins (or rejoins with their token). Returns { id } or { error } (an error message
  // for the socket that asked: it has no player id to address).
  join(hello, now) {
    if (hello.v !== PROTOCOL_VERSION) return { error: errorMessage('version') };
    const back = [...this.players.values()].find((p) => p.token === hello.token);
    if (back) {
      back.connected = true;
      back.leftAt = null;
      this.electHost();
      this.send(back.id, welcome(back.id, this.code, back.token));
      this.catchUp(back.id);
      this.broadcastExcept(back.id, notice(`${back.name} is back`));
      this.sendLobby();
      return { id: back.id };
    }
    if (this.players.size >= MAX_PLAYERS) return { error: errorMessage('full') };
    const why = checkName({ pilots: [] }, hello.name);
    if (why) return { error: errorMessage('badName', why) };
    const team = TEAM_IDS.includes(hello.team) ? hello.team : this.smallerTeam();
    const order = this.nextOrder++;
    const p = {
      id: `p${order}`, token: hello.token, name: this.uniqueName(tidyName(hello.name)), team,
      aircraft: aircraftOfTeam(team, this.settings)[0].id, loadout: 'standard', ready: false, connected: true, order, leftAt: null,
    };
    this.players.set(p.id, p);
    this.electHost();
    this.send(p.id, welcome(p.id, this.code, p.token));
    this.catchUp(p.id);
    this.broadcastExcept(p.id, notice(`${p.name} joined`));
    this.sendLobby();
    return { id: p.id };
  }

  // A message from a joined player (already checked by protocol.parseClientMessage).
  handle(id, msg, now) {
    const p = this.players.get(id);
    if (!p) return;
    const hostOnly = ['setSettings', 'start', 'toLobby'];
    if (hostOnly.includes(msg.type) && id !== this.hostId) return this.send(id, errorMessage('notHost'));
    const lobbyOnly = ['setTeam', 'setAircraft', 'setReady', 'setSettings', 'start'];
    if (lobbyOnly.includes(msg.type) && this.phase !== 'lobby') return this.send(id, errorMessage('notInLobby'));
    switch (msg.type) {
      case 'setTeam':
        if (p.team !== msg.team) Object.assign(p, { team: msg.team, aircraft: aircraftOfTeam(msg.team, this.settings)[0].id, loadout: 'standard', ready: false });
        break;
      case 'setAircraft':
        if (!aircraftOfTeam(p.team, this.settings).some((a) => a.id === msg.aircraft)) return this.send(id, errorMessage('badMessage', 'That aircraft belongs to the other side, or is not on offer in this era.'));
        const loadout = msg.loadout ?? 'standard';
        if (!loadoutAllowed(msg.aircraft, loadout)) return this.send(id, errorMessage('badMessage', 'That aircraft cannot carry those guns.'));
        if (p.aircraft !== msg.aircraft || p.loadout !== loadout) Object.assign(p, { aircraft: msg.aircraft, loadout, ready: false });
        break;
      case 'setReady':
        p.ready = msg.ready;
        break;
      case 'setSettings':
        this.settings = cleanSettings(msg.settings, this.settings);
        this.fitAircraft();
        break;
      case 'start': {
        const can = this.canStart();
        if (!can.ok) return this.send(id, errorMessage('cannotStart', can.reason));
        this.phase = 'match';
        this.send('all', matchStart(this.settings, this.playerList()));
        break;
      }
      case 'toLobby':
        // In a match: end it (the room server makes the results). Showing results: back now.
        if (this.phase === 'match') this.endRequested = true;
        else if (this.phase === 'results') return this.backToLobby();
        break;
      case 'ping':
        return this.send(id, pong(msg.t));
      case 'leave':
        return this.remove(id, `${p.name} left`);
      default:
        return;
    }
    this.sendLobby();
  }

  // A player arriving while a match is on (or its results are shown) is told about it.
  catchUp(id) {
    if (this.phase === 'match') this.send(id, matchStart(this.settings, this.playerList()));
    if (this.phase === 'results' && this.result) this.send(id, matchEnd(this.result));
  }

  // The match is over: everyone sees the result (the room server goes back to the lobby later).
  endMatch(result) {
    this.phase = 'results';
    this.result = result;
    this.endRequested = false;
    this.send('all', matchEnd(result));
    this.sendLobby();
  }

  // From the results back to the lobby: everyone not ready, for the next match.
  backToLobby() {
    if (this.phase !== 'results') return;
    this.phase = 'lobby';
    this.result = null;
    for (const q of this.players.values()) q.ready = false;
    this.send('all', notice('Back in the lobby: press "I am ready" for the next match'));
    this.sendLobby();
  }

  // The player's connection dropped: their place is kept for REJOIN_GRACE_S.
  disconnect(id, now) {
    const p = this.players.get(id);
    if (!p || !p.connected) return;
    p.connected = false;
    p.ready = false;
    p.leftAt = now;
    this.electHost();
    this.send('all', notice(`${p.name} lost the connection`));
    this.sendLobby();
  }

  // Take away players who dropped more than REJOIN_GRACE_S ago. Returns true when the room
  // has nobody left (the server then forgets it).
  expire(now) {
    for (const p of [...this.players.values()]) {
      if (!p.connected && now - p.leftAt >= REJOIN_GRACE_S * 1000) this.remove(p.id, `${p.name} did not come back`);
    }
    return this.players.size === 0;
  }

  remove(id, text) {
    if (!this.players.delete(id)) return;
    this.electHost();
    this.send('all', notice(text));
    this.sendLobby();
  }

  // Keep a connected host: if the host has gone, the earliest joined player still connected.
  electHost() {
    if (this.players.get(this.hostId)?.connected) return;
    const next = this.connected.sort((a, b) => a.order - b.order)[0];
    if (!next || next.id === this.hostId) return;
    const hadHost = this.hostId !== null;
    this.hostId = next.id;
    if (hadHost) this.send('all', notice(`${next.name} is now the host`));
  }

  // After the host changes the era: anyone whose aircraft is no longer on offer is moved to
  // their team's first one, with the standard guns, and must say they are ready again.
  fitAircraft() {
    for (const q of this.players.values()) {
      if (aircraftOfTeam(q.team, this.settings).some((a) => a.id === q.aircraft)) continue;
      Object.assign(q, { aircraft: aircraftOfTeam(q.team, this.settings)[0].id, loadout: 'standard', ready: false });
      this.send(q.id, notice(`The host changed the era: you now fly the ${AIRCRAFT[q.aircraft].name}`));
    }
  }

  // Can the host start? { ok, reason }.
  canStart() {
    if (this.phase === 'results') return { ok: false, reason: 'Showing the last match\'s results' };
    if (this.phase !== 'lobby') return { ok: false, reason: 'The match has already started' };
    const here = this.connected;
    if (here.length < MIN_PLAYERS) return { ok: false, reason: `Waiting for at least ${MIN_PLAYERS} players` };
    if (!TEAM_IDS.every((t) => here.some((p) => p.team === t))) return { ok: false, reason: 'Each team needs at least one pilot' };
    const wrong = here.find((p) => !aircraftOfTeam(p.team, this.settings).some((a) => a.id === p.aircraft));
    if (wrong) return { ok: false, reason: `${wrong.name}'s aircraft is not on offer in this era` };
    const waiting = here.filter((p) => !p.ready);
    if (waiting.length) return { ok: false, reason: `Waiting for ${waiting.map((p) => p.name).join(', ')} to be ready` };
    return { ok: true, reason: '' };
  }

  // The team with fewer players (Allied on a tie).
  smallerTeam() {
    const count = (t) => [...this.players.values()].filter((p) => p.team === t).length;
    return count('central') < count('allied') ? 'central' : 'allied';
  }

  // "Max", or "Max 2" if a Max is already here (cut to fit the name length).
  uniqueName(name) {
    const taken = (n) => [...this.players.values()].some((p) => p.name.toLowerCase() === n.toLowerCase());
    if (!taken(name)) return name;
    for (let i = 2; ; i++) {
      const suffix = ` ${i}`;
      const n = name.slice(0, NAME_MAX - suffix.length) + suffix;
      if (!taken(n)) return n;
    }
  }

  playerList() {
    return [...this.players.values()].sort((a, b) => a.order - b.order)
      .map(({ id, name, team, aircraft, loadout, ready, connected }) => ({ id, name, team, aircraft, loadout, ready, connected }));
  }

  // What everyone sees in the lobby.
  view() {
    return { code: this.code, phase: this.phase, hostId: this.hostId, players: this.playerList(), settings: { ...this.settings }, canStart: this.canStart() };
  }

  sendLobby() {
    this.send('all', lobbyMessage(this.view()));
  }

  broadcastExcept(id, msg) {
    for (const p of this.players.values()) if (p.id !== id && p.connected) this.send(p.id, msg);
  }
}
