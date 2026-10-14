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

import { AIRCRAFT_LIST } from '../aircraft/index.js';
import { checkName, tidyName, NAME_MAX } from '../game/pilots.js';
import { PROTOCOL_VERSION, MIN_PLAYERS, MAX_PLAYERS, REJOIN_GRACE_S, TEAMS, TEAM_IDS, DEFAULT_SETTINGS, cleanSettings } from './netConfig.js';
import { welcome, lobbyMessage, matchStart, notice, pong, errorMessage } from './protocol.js';

// The aircraft a team may fly (by the `side` in each aircraft's data).
export const aircraftOfTeam = (team) => AIRCRAFT_LIST.filter((a) => a.side === TEAMS[team]);

export class RoomCore {
  constructor(code) {
    this.code = code;
    this.players = new Map(); // id -> { id, token, name, team, aircraft, ready, connected, order, leftAt }
    this.hostId = null;
    this.phase = 'lobby'; // 'lobby' | 'match'
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
      aircraft: aircraftOfTeam(team)[0].id, ready: false, connected: true, order, leftAt: null,
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
        if (p.team !== msg.team) Object.assign(p, { team: msg.team, aircraft: aircraftOfTeam(msg.team)[0].id, ready: false });
        break;
      case 'setAircraft':
        if (!aircraftOfTeam(p.team).some((a) => a.id === msg.aircraft)) return this.send(id, errorMessage('badMessage', 'That aircraft belongs to the other side.'));
        if (p.aircraft !== msg.aircraft) Object.assign(p, { aircraft: msg.aircraft, ready: false });
        break;
      case 'setReady':
        p.ready = msg.ready;
        break;
      case 'setSettings':
        this.settings = cleanSettings(msg.settings, this.settings);
        break;
      case 'start': {
        const can = this.canStart();
        if (!can.ok) return this.send(id, errorMessage('cannotStart', can.reason));
        this.phase = 'match';
        this.send('all', matchStart(this.settings, this.playerList()));
        break;
      }
      case 'toLobby':
        this.phase = 'lobby';
        for (const q of this.players.values()) q.ready = false;
        this.send('all', notice('The host ended the match. Press "I am ready" for the next one.'));
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

  // A player arriving while a match is on is told about it.
  catchUp(id) {
    if (this.phase === 'match') this.send(id, matchStart(this.settings, this.playerList()));
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

  // Can the host start? { ok, reason }.
  canStart() {
    if (this.phase !== 'lobby') return { ok: false, reason: 'The match has already started' };
    const here = this.connected;
    if (here.length < MIN_PLAYERS) return { ok: false, reason: `Waiting for at least ${MIN_PLAYERS} players` };
    if (!TEAM_IDS.every((t) => here.some((p) => p.team === t))) return { ok: false, reason: 'Each team needs at least one pilot' };
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
      .map(({ id, name, team, aircraft, ready, connected }) => ({ id, name, team, aircraft, ready, connected }));
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
