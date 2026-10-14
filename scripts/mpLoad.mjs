// A load test of a running room server: four scripted players in a match, all turning and
// firing, for a while; prints for each the snapshots a second, the gaps between them, and the
// ping. `npm run mp:load` (the local server) or `npm run mp:load -- https://server 120`.

import { PROTOCOL_VERSION } from '../src/mp/netConfig.js';
import { decodeSnapshot, encodeInputs, quantiseInput } from '../src/mp/binary.js';

const base = (process.argv[2] ?? 'http://localhost:8787').replace(/\/+$/, '');
const seconds = Number(process.argv[3] ?? 60);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const health = await fetch(`${base}/health`).then((r) => r.json()).catch(() => null);
if (!health) {
  console.error(`No server at ${base}. Start it with: npm run mp:server`);
  process.exit(1);
}
const { code } = await fetch(`${base}/rooms`, { method: 'POST' }).then((r) => r.json());

function player(name, team) {
  const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/rooms/${code}`);
  ws.binaryType = 'arraybuffer';
  const p = { name, ws, gaps: [], last: 0, count: 0, pings: [], tick: 0 };
  ws.addEventListener('message', (e) => {
    if (typeof e.data !== 'string') {
      const t = performance.now();
      if (p.last) p.gaps.push(t - p.last);
      p.last = t;
      p.count += 1;
      p.tick = decodeSnapshot(e.data)?.tick ?? p.tick;
      return;
    }
    const m = JSON.parse(e.data);
    if (m.type === 'pong') p.pings.push(performance.now() - m.t);
  });
  p.send = (m) => ws.send(JSON.stringify(m));
  p.opened = new Promise((resolve) => ws.addEventListener('open', () => {
    p.send({ type: 'hello', v: PROTOCOL_VERSION, name, token: `load-${name}-${Date.now()}`, team });
    resolve();
  }));
  return p;
}

const players = [player('A', 'allied')];
await players[0].opened;
await wait(300);
players.push(player('B', 'central'), player('C', 'allied'), player('D', 'central'));
await Promise.all(players.map((p) => p.opened));
await wait(500);
for (const p of players) p.send({ type: 'setReady', ready: true });
await wait(500);
players[0].send({ type: 'start' });
await wait(1000);

console.log(`Room ${code} on ${base}: 4 players turning and firing for ${seconds} s...`);
const controls = { ...quantiseInput({ pull: 0.2, roll: 0.3, yaw: 0, throttle: 1, trim: 0 }), fire: true };
const t0 = Date.now();
for (let k = 0; Date.now() - t0 < seconds * 1000; k++) {
  for (const p of players) p.ws.send(encodeInputs(p.tick + 20, p.tick, [controls, controls, controls, controls]));
  if (k % 60 === 0) for (const p of players) p.send({ type: 'ping', t: performance.now() });
  await wait(33);
}
for (const p of players) {
  const g = p.gaps.slice(30).sort((a, b) => a - b);
  const at = (q) => g[Math.floor(q * (g.length - 1))].toFixed(0);
  const pings = p.pings.sort((a, b) => a - b);
  console.log(`${p.name}: ${(p.count / seconds).toFixed(1)} snapshots a second; gaps median ${at(0.5)} ms, 99% within ${at(0.99)} ms, worst ${g.at(-1).toFixed(0)} ms; ping median ${pings[Math.floor(pings.length / 2)].toFixed(0)} ms, worst ${pings.at(-1).toFixed(0)} ms`);
}
players[0].send({ type: 'toLobby' });
await wait(300);
for (const p of players) p.ws.close();
