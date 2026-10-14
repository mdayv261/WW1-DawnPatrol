import { describe, it, expect } from 'vitest';
import { RoomCore, aircraftOfTeam } from '../../src/mp/roomCore.js';
import { PROTOCOL_VERSION, REJOIN_GRACE_S, MAX_PLAYERS } from '../../src/mp/netConfig.js';

const hello = (name, n = name, team = undefined) => ({ type: 'hello', v: PROTOCOL_VERSION, name, token: `token-${n}-xyz`, team });
const T0 = 1_000_000;

// A room with players already in it: returns { room, ids }.
function roomWith(...names) {
  const room = new RoomCore('K7QPM2');
  const ids = names.map((n) => room.join(hello(n), T0).id);
  room.outbox.length = 0;
  return { room, ids };
}
const sent = (room, type) => room.outbox.filter((o) => o.msg.type === type);
const lastLobby = (room) => sent(room, 'lobby').at(-1).msg;

describe('room lobby: joining', () => {
  it('the first player is host; each joiner is welcomed and everyone gets the lobby', () => {
    const room = new RoomCore('K7QPM2');
    const a = room.join(hello('Max'), T0);
    expect(a.id).toBeTruthy();
    expect(room.hostId).toBe(a.id);
    expect(sent(room, 'welcome')[0]).toEqual({ to: a.id, msg: { type: 'welcome', you: a.id, code: 'K7QPM2', token: 'token-Max-xyz' } });
    const b = room.join(hello('Albert'), T0);
    expect(room.hostId).toBe(a.id);
    expect(room.outbox.some((o) => o.to === a.id && o.msg.text === 'Albert joined')).toBe(true);
    const view = lastLobby(room);
    expect(view.players.map((p) => p.name)).toEqual(['Max', 'Albert']);
    expect(view.players[1].id).toBe(b.id);
    expect(view.players[0]).not.toHaveProperty('token'); // nobody sees another player's token
  });

  it('refuses an old page, a bad name and a fifth player', () => {
    const room = new RoomCore('K7QPM2');
    expect(room.join({ ...hello('Max'), v: PROTOCOL_VERSION + 1 }, T0).error.code).toBe('version');
    expect(room.join(hello(''), T0).error).toEqual({ type: 'error', code: 'badName', text: 'Enter a name' });
    expect(room.join(hello('<script>'), T0).error.code).toBe('badName');
    for (let i = 0; i < MAX_PLAYERS; i++) expect(room.join(hello(`P${i}`), T0).id).toBeTruthy();
    expect(room.join(hello('Late'), T0).error.code).toBe('full');
  });

  it('a name already in the room gets a number', () => {
    const room = new RoomCore('K7QPM2');
    ['Max', 'max', 'Max'].forEach((n, i) => room.join(hello(n, `${n}${i}`), T0)); // three people, three tokens
    expect(room.playerList().map((p) => p.name)).toEqual(['Max', 'max 2', 'Max 3']);
  });

  it('new players fill the smaller team, unless they ask (their Roll Call side)', () => {
    const room = new RoomCore('K7QPM2');
    const team = (r) => room.players.get(r.id).team;
    expect(team(room.join(hello('A'), T0))).toBe('allied');
    expect(team(room.join(hello('B'), T0))).toBe('central');
    expect(team(room.join(hello('C', 'C', 'central'), T0))).toBe('central');
    expect(team(room.join(hello('D'), T0))).toBe('allied');
  });
});

describe('room lobby: teams, aircraft and ready', () => {
  it('only the team side\'s aircraft can be chosen', () => {
    const { room, ids: [a] } = roomWith('Max');
    expect(aircraftOfTeam('allied').map((x) => x.id).sort()).toEqual(['camel', 'spad13']);
    expect(aircraftOfTeam('central').map((x) => x.id).sort()).toEqual(['albatros', 'dr1']);
    room.handle(a, { type: 'setAircraft', aircraft: 'spad13' }, T0);
    expect(room.players.get(a).aircraft).toBe('spad13');
    room.handle(a, { type: 'setAircraft', aircraft: 'dr1' }, T0);
    expect(room.players.get(a).aircraft).toBe('spad13');
    expect(sent(room, 'error').at(-1).msg.text).toMatch(/other side/);
  });

  it('changing team picks that team\'s first aircraft and clears ready; so does changing aircraft', () => {
    const { room, ids: [a] } = roomWith('Max');
    room.handle(a, { type: 'setReady', ready: true }, T0);
    expect(room.players.get(a).ready).toBe(true);
    room.handle(a, { type: 'setTeam', team: 'central' }, T0);
    const p = room.players.get(a);
    expect(p.team).toBe('central');
    expect(aircraftOfTeam('central')[0].id).toBe(p.aircraft);
    expect(p.ready).toBe(false);
    room.handle(a, { type: 'setReady', ready: true }, T0);
    room.handle(a, { type: 'setAircraft', aircraft: aircraftOfTeam('central')[1].id }, T0);
    expect(room.players.get(a).ready).toBe(false);
  });

  it('only the host changes the settings, and only to allowed values', () => {
    const { room, ids: [host, guest] } = roomWith('Max', 'Albert');
    room.handle(guest, { type: 'setSettings', settings: { scoreLimit: 20 } }, T0);
    expect(room.settings.scoreLimit).toBe(5);
    expect(sent(room, 'error').at(-1)).toEqual({ to: guest, msg: expect.objectContaining({ code: 'notHost' }) });
    room.handle(host, { type: 'setSettings', settings: { scoreLimit: 20, timeLimit: 99, timeOfDay: 'dusk' } }, T0);
    expect(room.settings).toMatchObject({ scoreLimit: 20, timeLimit: 10, timeOfDay: 'dusk' });
    expect(lastLobby(room).settings.scoreLimit).toBe(20);
  });
});

describe('room lobby: starting', () => {
  const ready = (room, ids) => ids.forEach((id) => room.handle(id, { type: 'setReady', ready: true }, T0));

  it('needs two players, one on each team, all ready; then everyone gets the match', () => {
    const { room, ids: [a] } = roomWith('Max');
    expect(room.canStart()).toEqual({ ok: false, reason: 'Waiting for at least 2 players' });
    const b = room.join(hello('Albert'), T0).id; // joins Central (the smaller team)
    room.handle(b, { type: 'setTeam', team: 'allied' }, T0);
    ready(room, [a, b]);
    expect(room.canStart().reason).toBe('Each team needs at least one pilot');
    room.handle(b, { type: 'setTeam', team: 'central' }, T0);
    expect(room.canStart().reason).toBe('Waiting for Albert to be ready');
    room.handle(b, { type: 'start' }, T0);
    expect(sent(room, 'error').at(-1).msg.code).toBe('notHost');
    room.handle(a, { type: 'start' }, T0);
    expect(sent(room, 'error').at(-1).msg).toEqual({ type: 'error', code: 'cannotStart', text: 'Waiting for Albert to be ready' });
    ready(room, [b]);
    expect(room.canStart().ok).toBe(true);
    room.outbox.length = 0;
    room.handle(a, { type: 'start' }, T0);
    expect(room.phase).toBe('match');
    const start = sent(room, 'matchStart')[0];
    expect(start.to).toBe('all');
    expect(start.msg.players.map((p) => p.name)).toEqual(['Max', 'Albert']);
    expect(start.msg.settings).toEqual(room.settings);
  });

  it('uneven teams (1 v 2) may start', () => {
    const { room, ids } = roomWith('A', 'B', 'C'); // allied, central, allied
    ready(room, ids);
    expect(room.canStart().ok).toBe(true);
  });

  it('in a match the lobby choices are locked; the host ending it asks for the results; results go back to the lobby, not ready', () => {
    const { room, ids: [a, b] } = roomWith('Max', 'Albert');
    ready(room, [a, b]);
    room.handle(a, { type: 'start' }, T0);
    room.handle(b, { type: 'setTeam', team: 'allied' }, T0);
    expect(room.players.get(b).team).toBe('central');
    expect(sent(room, 'error').at(-1).msg.code).toBe('notInLobby');
    room.handle(a, { type: 'toLobby' }, T0);
    expect(room.endRequested).toBe(true); // the room server ends the match and makes the results
    expect(room.phase).toBe('match');
    const result = { winner: 'draw', reason: 'host', teams: { allied: 0, central: 0 }, players: [] };
    room.outbox.length = 0;
    room.endMatch(result);
    expect(room.phase).toBe('results');
    expect(room.endRequested).toBe(false);
    expect(sent(room, 'matchEnd')[0]).toEqual({ to: 'all', msg: { type: 'matchEnd', result } });
    expect(room.canStart().ok).toBe(false);
    const c = room.join(hello('Late'), T0).id; // arriving now: shown the results
    expect(room.outbox.some((o) => o.to === c && o.msg.type === 'matchEnd')).toBe(true);
    room.handle(a, { type: 'toLobby' }, T0); // the host: back now
    expect(room.phase).toBe('lobby');
    expect(room.result).toBe(null);
    expect([...room.players.values()].every((p) => !p.ready)).toBe(true);
    expect(sent(room, 'notice').at(-1).msg.text).toMatch(/Back in the lobby/);
  });

  it('a player arriving during a match is told about it', () => {
    const { room, ids: [a, b] } = roomWith('Max', 'Albert');
    ready(room, [a, b]);
    room.handle(a, { type: 'start' }, T0);
    room.outbox.length = 0;
    const c = room.join(hello('Late'), T0).id;
    expect(room.outbox.some((o) => o.to === c && o.msg.type === 'matchStart')).toBe(true);
  });
});

describe('room lobby: leaving, dropping and coming back', () => {
  it('when the host leaves, the earliest joined player still connected takes over', () => {
    const { room, ids: [a, b, c] } = roomWith('Max', 'Albert', 'Werner');
    room.disconnect(b, T0); // Albert dropped (still in the room, reconnecting)
    room.handle(a, { type: 'leave' }, T0);
    expect(room.players.has(a)).toBe(false);
    expect(room.hostId).toBe(c); // Albert is not connected, so Werner
    expect(room.outbox.some((o) => o.msg.text === 'Werner is now the host')).toBe(true);
    room.join(hello('Albert'), T0 + 1000); // Albert back with his token
    expect(room.hostId).toBe(c); // a connected host keeps the role
  });

  it('a dropped player keeps their place, team and aircraft for the grace time', () => {
    const { room, ids: [a, b] } = roomWith('Max', 'Albert');
    room.handle(b, { type: 'setAircraft', aircraft: aircraftOfTeam('central')[1].id }, T0);
    room.disconnect(b, T0);
    expect(lastLobby(room).players[1]).toMatchObject({ name: 'Albert', connected: false, ready: false });
    expect(room.expire(T0 + (REJOIN_GRACE_S - 1) * 1000)).toBe(false);
    const back = room.join(hello('Someone else', 'Albert'), T0 + 30_000); // same token, any name
    expect(back.id).toBe(b);
    const p = room.players.get(b);
    expect(p).toMatchObject({ name: 'Albert', connected: true, aircraft: aircraftOfTeam('central')[1].id });
    expect(room.outbox.some((o) => o.to === a && o.msg.text === 'Albert is back')).toBe(true);
  });

  it('a dropped player who does not come back in time is removed; an empty room says so', () => {
    const { room, ids: [a, b] } = roomWith('Max', 'Albert');
    room.disconnect(b, T0);
    expect(room.expire(T0 + REJOIN_GRACE_S * 1000)).toBe(false);
    expect(room.players.has(b)).toBe(false);
    expect(room.outbox.some((o) => o.msg.text === 'Albert did not come back')).toBe(true);
    room.disconnect(a, T0 + 61_000);
    expect(room.hostId).toBe(a); // nobody connected to hand over to
    expect(room.expire(T0 + 200_000)).toBe(true);
  });

  it('pings are answered to the sender only', () => {
    const { room, ids: [a] } = roomWith('Max', 'Albert');
    room.handle(a, { type: 'ping', t: 42 }, T0);
    expect(room.outbox).toEqual([{ to: a, msg: { type: 'pong', t: 42 } }]);
  });
});
