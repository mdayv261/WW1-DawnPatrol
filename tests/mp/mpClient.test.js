import { describe, it, expect } from 'vitest';
import { createMpClient, TOKEN_KEY, ROOM_KEY } from '../../src/net/mpClient.js';
import { openConnection } from '../../src/net/connection.js';
import { serverBase, roomSocketUrl } from '../../src/net/serverUrl.js';
import { PROTOCOL_VERSION } from '../../src/mp/netConfig.js';
import { FakeSocket, fakeTimers } from './fakes.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

// A client wired to fake sockets, timers and fetch. Returns { client, sockets, timers, storage, notices }.
function setup({ base = 'http://localhost:8787', fetchCode = 'K7QPM2' } = {}) {
  const sockets = [];
  const timers = fakeTimers();
  const storage = memoryStorage();
  const notices = [];
  const client = createMpClient({
    base, storage, timers, netsim: null,
    makeSocket: (url) => {
      const s = new FakeSocket(url);
      sockets.push(s);
      return s;
    },
    fetchFn: async (url, init) => {
      expect(url).toBe(`${base}/rooms`);
      expect(init.method).toBe('POST');
      return { ok: true, json: async () => ({ code: fetchCode }) };
    },
    onNotice: (t) => notices.push(t),
    now: () => 0,
  });
  return { client, sockets, timers, storage, notices };
}

const LOBBY = { type: 'lobby', code: 'K7QPM2', phase: 'lobby', hostId: 'p1', players: [{ id: 'p1', name: 'Max', team: 'allied', aircraft: 'camel', ready: false, connected: true }], settings: {}, canStart: { ok: false, reason: 'Waiting for at least 2 players' } };

describe('multiplayer client', () => {
  it('creates a room, says hello with its token and follows the lobby', async () => {
    const { client, sockets, storage } = setup();
    await client.createRoom('Max', 'allied');
    expect(client.state.status).toBe('connecting');
    const s = sockets[0];
    expect(s.url).toBe('ws://localhost:8787/rooms/K7QPM2');
    s.emit('open');
    const hello = s.take().find((m) => m.type === 'hello');
    expect(hello).toEqual({ type: 'hello', v: PROTOCOL_VERSION, name: 'Max', token: storage.getItem(TOKEN_KEY), team: 'allied' });
    s.receive({ type: 'welcome', you: 'p1', code: 'K7QPM2', token: hello.token });
    s.receive(LOBBY);
    expect(client.state.status).toBe('inRoom');
    expect(client.isHost).toBe(true);
    expect(client.me.name).toBe('Max');
    expect(storage.getItem(ROOM_KEY)).toBe('K7QPM2'); // so a reload goes back in
    client.setReady(true);
    expect(s.take()).toEqual([{ type: 'setReady', ready: true }]);
  });

  it('a typed code is tidied; a wrong one is explained without connecting', () => {
    const { client, sockets } = setup();
    client.joinRoom('k7q pm2', 'Albert');
    expect(sockets[0].url).toBe('ws://localhost:8787/rooms/K7QPM2');
    const other = setup();
    other.client.joinRoom('K7QPM0', 'Albert');
    expect(other.sockets).toHaveLength(0);
    expect(other.client.state).toMatchObject({ status: 'error', message: expect.stringContaining('six letters and numbers') });
  });

  it('reconnects by itself with the same token after the connection drops', () => {
    const { client, sockets, timers } = setup();
    client.joinRoom('K7QPM2', 'Albert');
    sockets[0].emit('open');
    const token = sockets[0].take().find((m) => m.type === 'hello').token;
    sockets[0].receive({ type: 'welcome', you: 'p2', code: 'K7QPM2', token });
    sockets[0].receive(LOBBY);
    sockets[0].close(1006);
    expect(client.state.status).toBe('reconnecting');
    timers.runAll();
    expect(sockets).toHaveLength(2);
    sockets[1].emit('open');
    expect(sockets[1].take().find((m) => m.type === 'hello').token).toBe(token);
    sockets[1].receive({ type: 'welcome', you: 'p2', code: 'K7QPM2', token });
    expect(client.state.status).toBe('inRoom');
  });

  it('gives up after three tries and says the connection is lost', () => {
    const { client, sockets, timers } = setup();
    client.joinRoom('K7QPM2', 'Albert');
    for (let i = 0; i < 4; i++) {
      sockets.at(-1).close(1006);
      timers.runAll();
    }
    expect(sockets).toHaveLength(4);
    expect(client.state).toMatchObject({ status: 'lost', message: 'Lost the connection to the room.' });
  });

  it('a refusal from the room is shown and not retried', () => {
    const { client, sockets, timers, storage } = setup();
    storage.setItem(ROOM_KEY, 'K7QPM2');
    client.joinRoom('K7QPM2', 'Albert');
    sockets[0].emit('open');
    sockets[0].receive({ type: 'error', code: 'noRoom', text: 'No room with that code.' });
    sockets[0].close(1000);
    timers.runAll();
    expect(sockets).toHaveLength(1);
    expect(client.state).toMatchObject({ status: 'error', message: 'No room with that code.' });
    expect(storage.getItem(ROOM_KEY)).toBe(null);
  });

  it('leaving on purpose tells the room and forgets it', () => {
    const { client, sockets, storage } = setup();
    client.joinRoom('K7QPM2', 'Albert');
    sockets[0].emit('open');
    sockets[0].receive({ type: 'welcome', you: 'p2', code: 'K7QPM2', token: 'x' });
    sockets[0].take();
    client.leave();
    expect(sockets[0].take()).toEqual([{ type: 'leave' }]);
    expect(storage.getItem(ROOM_KEY)).toBe(null);
    sockets[0].close(1000);
    expect(client.state.status).toBe('idle');
  });

  it('leaving the page closes the connection but keeps the place for a reload', () => {
    const { client, sockets, timers, storage } = setup();
    client.joinRoom('K7QPM2', 'Albert');
    sockets[0].emit('open');
    sockets[0].receive({ type: 'welcome', you: 'p2', code: 'K7QPM2', token: 'x' });
    sockets[0].take();
    client.drop();
    expect(sockets[0].closed).toBeTruthy();
    expect(sockets[0].sent).toEqual([]); // no "leave": the room keeps the place
    expect(storage.getItem(ROOM_KEY)).toBe('K7QPM2');
    timers.runAll();
    expect(sockets).toHaveLength(1); // and it does not reconnect from a page being left
  });

  it('room notices reach the screen; without a server it says multiplayer is not available', async () => {
    const { client, sockets, notices } = setup();
    client.joinRoom('K7QPM2', 'Albert');
    sockets[0].receive({ type: 'notice', text: 'Max joined' });
    expect(notices).toEqual(['Max joined']);
    const none = setup({ base: null });
    await none.client.createRoom('Max');
    expect(none.client.state.message).toMatch(/not available/);
  });
});

describe('connection', () => {
  it('measures the ping from the pong', () => {
    let t = 0;
    const s = new FakeSocket();
    const conn = openConnection('ws://x', {}, { makeSocket: () => s, now: () => t, timers: fakeTimers() });
    s.emit('open');
    const ping = s.take().find((m) => m.type === 'ping');
    t = 120;
    s.receive({ type: 'pong', t: ping.t });
    expect(conn.ping).toBe(120);
  });

  it('with the test network on, messages wait for the simulator and keep their order', () => {
    const timers = fakeTimers();
    const s = new FakeSocket();
    const got = [];
    openConnection('ws://x', { onMessage: (m) => got.push(m.n) }, { makeSocket: () => s, now: () => 0, timers, netsim: { ping: 200, jitter: 50, loss: 10 } });
    s.emit('open');
    for (let n = 0; n < 20; n++) s.receive({ type: 'x', n });
    expect(got).toEqual([]); // still "on the wire"
    timers.due.sort((a, b) => a.ms - b.ms); // the fake runs them by delay, as a browser would
    timers.runAll();
    expect(got).toEqual([...Array(20).keys()]);
  });
});

describe('server address', () => {
  it('?server= first, then the build setting, then this computer while developing', () => {
    expect(serverBase({ search: '?server=https://mp.example/', env: { VITE_MP_SERVER: 'https://other' } })).toBe('https://mp.example');
    expect(serverBase({ env: { VITE_MP_SERVER: 'https://dawn.workers.dev' } })).toBe('https://dawn.workers.dev');
    expect(serverBase({ dev: true, location: { protocol: 'http:', hostname: 'localhost' } })).toBe('http://localhost:8787');
    expect(serverBase({ dev: false, location: { protocol: 'https:', hostname: 'mdayv261.github.io' } })).toBe(null);
    expect(roomSocketUrl('https://dawn.workers.dev', 'K7QPM2')).toBe('wss://dawn.workers.dev/rooms/K7QPM2');
    // The test copy, served by the room server itself, uses the address it was loaded from.
    expect(serverBase({ env: { VITE_MP_SERVER: 'same-origin' }, location: { protocol: 'https:', host: 'dawn.workers.dev', hostname: 'dawn.workers.dev' } })).toBe('https://dawn.workers.dev');
  });
});
