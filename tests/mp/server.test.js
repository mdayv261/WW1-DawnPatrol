import { describe, it, expect } from 'vitest';
import { Room } from '../../server/room.js';
import { handle, originAllowed } from '../../server/worker.js';
import { PROTOCOL_VERSION, MAX_BAD_MESSAGES, SILENT_DROP_S } from '../../src/mp/netConfig.js';
import { FakeSocket } from './fakes.js';
import { decodeSnapshot, encodeInputs, quantiseInput } from '../../src/mp/binary.js';

const hello = (name) => ({ type: 'hello', v: PROTOCOL_VERSION, name, token: `token-${name}-xyz` });

function roomWithClock() {
  const clock = { t: 1_000_000 };
  const room = new Room(null, {}, () => clock.t);
  return { room, clock };
}

describe('room server: connections', () => {
  it('two players join a claimed room and both see the lobby', () => {
    const { room } = roomWithClock();
    expect(room.claim('K7QPM2').status).toBe(200);
    const a = new FakeSocket();
    const b = new FakeSocket();
    room.attach(a);
    room.attach(b);
    a.receive(hello('Max'));
    expect(a.take().map((m) => m.type)).toEqual(['welcome', 'lobby']);
    b.receive(hello('Albert'));
    const toA = a.take();
    expect(toA.map((m) => m.type)).toEqual(['notice', 'lobby']);
    expect(toA[1].players.map((p) => p.name)).toEqual(['Max', 'Albert']);
    expect(b.take()[0]).toMatchObject({ type: 'welcome', code: 'K7QPM2' });
    expect(room.claim('K7QPM2').status).toBe(409); // in use: a new host cannot take it over
  });

  it('a room nobody created refuses a player, and messages before hello are refused', () => {
    const { room } = roomWithClock();
    const s = new FakeSocket();
    room.attach(s);
    s.receive({ type: 'setReady', ready: true });
    expect(s.take()[0]).toMatchObject({ type: 'error', code: 'badMessage' });
    s.receive(hello('Max'));
    expect(s.take()[0]).toMatchObject({ type: 'error', code: 'noRoom' });
    expect(s.closed).toBeTruthy();
  });

  it('when the host drops, the other player becomes host and sees them reconnecting; a reload takes the place back', () => {
    const { room, clock } = roomWithClock();
    room.claim('K7QPM2');
    const a = new FakeSocket();
    const b = new FakeSocket();
    room.attach(a);
    room.attach(b);
    a.receive(hello('Max'));
    b.receive(hello('Albert'));
    b.take();
    a.close(1006);
    const seen = b.take();
    const lobby = seen.filter((m) => m.type === 'lobby').at(-1);
    expect(lobby.hostId).toBe('p2');
    expect(lobby.players[0]).toMatchObject({ name: 'Max', connected: false });
    expect(seen.some((m) => m.text === 'Max lost the connection')).toBe(true);
    clock.t += 10_000;
    const again = new FakeSocket();
    room.attach(again);
    again.receive(hello('Max'));
    expect(again.take()[0]).toMatchObject({ type: 'welcome', you: 'p1' });
    expect(b.take().filter((m) => m.type === 'lobby').at(-1).players[0].connected).toBe(true);
    clearTimeout(room.timer);
  });

  it('only the newest lobby view is sent when one event changes it several times', () => {
    const { room } = roomWithClock();
    room.claim('K7QPM2');
    const a = new FakeSocket();
    const b = new FakeSocket();
    room.attach(a);
    room.attach(b);
    a.receive(hello('Max'));
    b.receive(hello('Albert'));
    a.take();
    b.take();
    a.receive({ type: 'leave' }); // removes Max and hands over the host: two lobby changes
    expect(b.take().filter((m) => m.type === 'lobby')).toHaveLength(1);
    expect(a.closed).toBeTruthy();
  });

  it('the last player leaving forgets the room', () => {
    const { room } = roomWithClock();
    room.claim('K7QPM2');
    const a = new FakeSocket();
    room.attach(a);
    a.receive(hello('Max'));
    a.receive({ type: 'leave' });
    expect(room.core).toBe(null);
  });

  it('a connection silent for too long counts as dropped, even if it never reports closing', () => {
    const { room, clock } = roomWithClock();
    room.claim('K7QPM2');
    const a = new FakeSocket();
    const b = new FakeSocket();
    a.close = function close(code) { this.closed = { code }; }; // a dead line: no close event comes back
    room.attach(a);
    room.attach(b);
    a.receive(hello('Max'));
    b.receive(hello('Albert'));
    b.take();
    clock.t += (SILENT_DROP_S - 1) * 1000;
    b.receive({ type: 'ping', t: 1 }); // Albert keeps pinging; Max has gone quiet
    room.checkSilent();
    expect(a.closed).toBe(null);
    clock.t += 1000;
    room.checkSilent();
    expect(a.closed).toEqual({ code: 4001 });
    expect(b.closed).toBe(null);
    const lobby = b.take().filter((m) => m.type === 'lobby').at(-1);
    expect(lobby.players[0]).toMatchObject({ name: 'Max', connected: false });
    expect(lobby.hostId).toBe('p2');
    clearInterval(room.watch);
    clearTimeout(room.timer);
  });

  it('a socket sending too many bad messages is closed', () => {
    const { room } = roomWithClock();
    room.claim('K7QPM2');
    const s = new FakeSocket();
    room.attach(s);
    for (let i = 0; i <= MAX_BAD_MESSAGES; i++) s.receive('rubbish');
    expect(s.closed).toMatchObject({ code: 1008 });
  });
});

describe('room server: a match', () => {
  it('starts with the host, flies everyone, takes their controls and stops back in the lobby', () => {
    const { room, clock } = roomWithClock();
    room.claim('K7QPM2');
    const a = new FakeSocket();
    const b = new FakeSocket();
    room.attach(a);
    room.attach(b);
    expect(a.binaryType).toBe('arraybuffer'); // controls arrive as bytes, not as Blobs
    a.receive(hello('Max'));
    b.receive(hello('Albert'));
    for (const s of [a, b]) s.receive({ type: 'setReady', ready: true }); // Max Allied, Albert Central
    a.receive({ type: 'start' });
    expect(room.match).toBeTruthy();
    expect(room.match.players.size).toBe(2);
    clearInterval(room.ticker); // the test drives the timer itself
    a.take();
    b.take();
    clock.t += 100;
    room.tickMatch();
    const bytes = b.sent.filter((m) => m instanceof ArrayBuffer);
    expect(bytes.length).toBe(3); // 100 ms: ticks 4, 8 and 12
    const snap = decodeSnapshot(bytes.at(-1));
    expect(snap.you.slot).toBe(2);
    expect(snap.others.map((o) => o.slot)).toEqual([1]);
    // Albert's controls are taken (bytes); rubbish bytes are not.
    const input = quantiseInput({ pull: 0.5, roll: 0, yaw: 0, throttle: 1, trim: 0 });
    b.emit('message', { data: encodeInputs(room.match.tick + 3, 0, [input]) });
    expect(room.match.players.get('p2').inputs.size).toBe(1);
    b.emit('message', { data: new ArrayBuffer(4) });
    expect(room.match.players.get('p2').inputs.size).toBe(1);
    // Albert drops out: his aircraft leaves the sky; he comes back: it returns.
    b.close(1006);
    expect(room.match.players.has('p2')).toBe(false);
    const b2 = new FakeSocket();
    room.attach(b2);
    b2.receive(hello('Albert'));
    expect(room.match.players.has('p2')).toBe(true);
    // The host ends the match: back in the lobby, no match.
    a.receive({ type: 'toLobby' });
    expect(room.match).toBe(null);
    clearInterval(room.watch);
    clearTimeout(room.timer);
  });
});

describe('room server: the front door', () => {
  const ORIGINS = 'https://mdayv261.github.io,http://localhost,http://127.0.0.1';
  // Rooms stand-in: answers claims (the first `busy` codes are refused, as if in use).
  function rooms(busy = 0) {
    const claimed = [];
    return {
      claimed,
      idFromName: (code) => code,
      get: (code) => ({
        fetch: async (url) => {
          if (!String(url).includes('/claim')) return new Response('ws', { status: 200 });
          if (busy-- > 0) return new Response('In use', { status: 409 });
          claimed.push(code);
          return new Response('OK', { status: 200 });
        },
      }),
    };
  }
  const env = (r = rooms()) => ({ ROOMS: r, ALLOWED_ORIGINS: ORIGINS });
  const req = (path, init = {}, origin = 'http://localhost:5173') => new Request(`https://mp.example${path}`, { ...init, headers: { ...(origin ? { Origin: origin } : {}), ...init.headers } });

  it('allows only the game\'s own pages', () => {
    expect(originAllowed('https://mdayv261.github.io', ORIGINS)).toBe(true);
    expect(originAllowed('http://localhost:5173', ORIGINS)).toBe(true);
    expect(originAllowed('http://127.0.0.1:4173', ORIGINS)).toBe(true);
    expect(originAllowed('https://evil.example', ORIGINS)).toBe(false);
    expect(originAllowed('http://mdayv261.github.io', ORIGINS)).toBe(false); // http, not https
    expect(originAllowed(null, ORIGINS)).toBe(true); // not a web page (a test tool)
  });

  it('creates a room with a fresh code, trying again if a code is in use', async () => {
    const r = rooms(2);
    const answer = await handle(req('/rooms', { method: 'POST' }), env(r));
    expect(answer.status).toBe(200);
    expect(answer.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    const { code } = await answer.json();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(r.claimed).toEqual([code]);
  });

  it('refuses other web sites, unknown paths and bad codes', async () => {
    expect((await handle(req('/rooms', { method: 'POST' }, 'https://evil.example'), env())).status).toBe(403);
    expect((await handle(req('/nothing'), env())).status).toBe(404);
    expect((await handle(req('/rooms/ABC', { headers: { Upgrade: 'websocket' } }), env())).status).toBe(404);
    const health = await handle(req('/health', {}, 'https://evil.example'), env());
    expect(await health.json()).toEqual({ ok: true, version: PROTOCOL_VERSION });
  });
});
