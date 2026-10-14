// A quick check of the real room server (`npm run mp:server` must be running): three scripted
// players create a room, join it, pick teams, get ready and start; then the host leaves and the
// role passes on. Prints what happened and exits with an error if anything is wrong.
//   npm run mp:smoke                      (the local server on port 8787)
//   npm run mp:smoke -- https://server    (another server)

import { PROTOCOL_VERSION } from '../src/mp/netConfig.js';
import { decodeSnapshot, encodeInputs, quantiseInput } from '../src/mp/binary.js';

const base = (process.argv[2] ?? 'http://localhost:8787').replace(/\/+$/, '');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function player(code, name, team) {
  const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/rooms/${code}`);
  ws.binaryType = 'arraybuffer';
  const p = { name, ws, got: [], lobby: null, id: null, snapshots: [] };
  ws.addEventListener('message', (e) => {
    if (typeof e.data !== 'string') return p.snapshots.push(decodeSnapshot(e.data));
    const m = JSON.parse(e.data);
    p.got.push(m);
    if (m.type === 'welcome') p.id = m.you;
    if (m.type === 'lobby') p.lobby = m;
  });
  p.send = (m) => ws.send(JSON.stringify(m));
  p.opened = new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      p.send({ type: 'hello', v: PROTOCOL_VERSION, name, token: `smoke-${name}-${Date.now()}`, team });
      resolve();
    });
    ws.addEventListener('error', () => reject(new Error(`${name} could not connect to ${base}`)));
  });
  return p;
}

function check(ok, text) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${text}`);
  if (!ok) process.exitCode = 1;
}

const health = await fetch(`${base}/health`).then((r) => r.json()).catch(() => null);
if (!health) {
  console.error(`No server at ${base}. Start it with: npm run mp:server`);
  process.exit(1);
}
check(health.version === PROTOCOL_VERSION, `server is up and speaks message version ${health.version}`);

const { code } = await fetch(`${base}/rooms`, { method: 'POST' }).then((r) => r.json());
check(/^[A-HJ-NP-Z2-9]{6}$/.test(code), `room created: ${code}`);

const max = player(code, 'Max', 'central');
await max.opened;
await wait(200);
const albert = player(code, 'Albert', 'allied');
const werner = player(code, 'Werner', 'central');
await Promise.all([albert.opened, werner.opened]);
await wait(300);
check(max.lobby?.players.length === 3, `all three are in the lobby (${max.lobby?.players.map((p) => p.name).join(', ')})`);
check(max.lobby?.hostId === max.id, 'Max, who created it, is the host');

for (const p of [max, albert, werner]) p.send({ type: 'setReady', ready: true });
max.send({ type: 'setSettings', settings: { scoreLimit: 10, timeOfDay: 'dusk' } });
await wait(300);
check(max.lobby?.canStart.ok === true, 'everyone is ready, so the host may start');
check(werner.lobby?.settings.scoreLimit === 10, 'the others see the host\'s settings');
max.send({ type: 'start' });
await wait(300);
check([max, albert, werner].every((p) => p.got.some((m) => m.type === 'matchStart')), 'everyone was told the match started');

// Flying: each player gets about 30 snapshots a second with their own aircraft and the others.
for (const p of [max, albert, werner]) p.snapshots.length = 0;
const climb = quantiseInput({ pull: 0.3, roll: 0, yaw: 0, throttle: 1, trim: 0 });
const t0 = Date.now();
while (Date.now() - t0 < 2000) {
  const tick = albert.snapshots.at(-1)?.tick ?? 0;
  albert.ws.send(encodeInputs(tick + 10, tick, [climb, climb, climb, climb])); // Albert pulls up
  await wait(33);
}
for (const p of [max, albert, werner]) {
  const rate = p.snapshots.length / 2;
  const last = p.snapshots.at(-1);
  check(rate > 25 && rate < 35, `${p.name} gets ${rate} snapshots a second`);
  check(last?.you && last.others.length === 2, `${p.name}'s snapshot has their own aircraft and the 2 others`);
}
const a0 = albert.snapshots[0].you.state;
const a1 = albert.snapshots.at(-1).you.state;
check(a1[1] > a0[1] + 5, `Albert's controls reach the server: he climbed ${(a1[1] - a0[1]).toFixed(0)} m`);
const m0 = max.snapshots[0].you.state;
const m1 = max.snapshots.at(-1).you.state;
check(Math.hypot(m1[0] - m0[0], m1[2] - m0[2]) > 60, `Max's aircraft flies on by itself (${Math.hypot(m1[0] - m0[0], m1[2] - m0[2]).toFixed(0)} m in 2 s)`);

max.send({ type: 'leave' });
await wait(300);
check(albert.lobby?.hostId === albert.id, 'when Max leaves, Albert (the next to join) becomes host');
check(albert.lobby?.players.length === 2, 'two players are left');

for (const p of [albert, werner]) p.ws.close();
await wait(100);
console.log(process.exitCode ? 'Something is wrong (see FAIL above).' : 'All good.');
