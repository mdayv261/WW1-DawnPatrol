// A whole match without a browser, in simulated time: the server's MatchSim and several
// browsers' NetFlights, joined through the network simulator (delay, jitter, loss, in both
// directions). Each browser flies a scripted pilot through a real 120 Hz FixedStepLoop at
// 60 frames a second. Used by the tests to measure what players would see.

import { MatchSim } from '../../src/mp/matchSim.js';
import { NetFlight } from '../../src/net/netFlight.js';
import { createNetSim } from '../../src/net/netSim.js';
import { Simulation } from '../../src/core/simulation.js';
import { FixedStepLoop } from '../../src/core/fixedStepLoop.js';
import { AIRCRAFT_LIST } from '../../src/aircraft/index.js';
import { createWorld } from '../../src/world/layout.js';
import { DEFAULT_SETTINGS, SERVER_INTERVAL_MS, TICK_HZ } from '../../src/mp/netConfig.js';

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const world = createWorld();

// players: [{ id, slot, name, team, aircraft, pilot(timeSeconds, sim) -> input }];
// net: { ping, jitter, loss } for every browser.
export function createHarness({ players, net = { ping: 0, jitter: 0, loss: 0 }, settings = DEFAULT_SETTINGS, seed = 5 }) {
  let now = 0; // ms of simulated time
  const server = new MatchSim({ settings, world, now: 0 });
  const truth = new Map(); // slot -> Map(tick -> position) on the server
  const rng = seeded(seed);
  const clients = players.map((p) => {
    const up = createNetSim(net, rng);
    const down = createNetSim(net, rng);
    const sim = new Simulation();
    const c = { ...p, sim, up, down, toServer: [], toClient: [], loop: new FixedStepLoop(), frames: 0 };
    const lookup = (slot) => {
      const q = players.find((x) => x.slot === slot);
      return q ? { name: q.name, team: q.team, aircraft: AIRCRAFT_LIST.find((a) => a.id === q.aircraft) } : null;
    };
    c.flight = new NetFlight({
      send: (buffer) => c.toServer.push({ at: up.schedule(now), buffer }),
      settings, lookup, ping: () => net.ping, jitter: () => net.jitter / 2, now: () => now,
    });
    c.flight.attach(sim, AIRCRAFT_LIST.find((a) => a.id === p.aircraft));
    return c;
  });
  for (const p of players) server.addPlayer(p);

  const deliver = (queue, f) => {
    while (queue.length && queue[0].at <= now) f(queue.shift().buffer);
  };

  // Run `seconds` more of simulated time; onFrame(clients, now) after each browser frame.
  function run(seconds, onFrame = () => {}) {
    const end = now + seconds * 1000;
    let nextServer = Math.ceil(now / SERVER_INTERVAL_MS) * SERVER_INTERVAL_MS;
    let nextFrame = now;
    const frame = 1000 / 60;
    while (now < end) {
      now = Math.min(nextServer, nextFrame);
      for (const c of clients) deliver(c.toServer, (b) => server.receiveInputs(c.id, decode(b)));
      if (now >= nextServer) {
        const { snapshots } = server.advanceTo(now);
        for (const p of server.players.values()) {
          let m = truth.get(p.slot);
          if (!m) truth.set(p.slot, (m = new Map()));
          m.set(server.tick, p.sim.state.position.clone());
        }
        for (const s of snapshots) {
          const c = clients.find((x) => x.id === s.id);
          c.toClient.push({ at: c.down.schedule(now), buffer: s.buffer });
        }
        nextServer += SERVER_INTERVAL_MS;
      }
      if (now >= nextFrame) {
        for (const c of clients) {
          deliver(c.toClient, (b) => c.flight.receive(b)); // messages arrive even in a hidden tab
          if (c.hidden) continue; // a hidden browser tab: no frames, so no steps and no controls sent
          c.loop.advance((frame / 1000) * c.flight.timeScale, (dt) => c.flight.step(dt, c.pilot(now / 1000, c.sim)));
          c.flight.frame(frame / 1000);
          c.frames += 1;
        }
        onFrame(clients, now);
        nextFrame += frame;
      }
    }
  }

  // Where the server had `slot` at a (fractional) tick (positions are recorded after each server
  // callback, every two ticks or so: this blends the nearest two either side).
  function truthAt(slot, tick) {
    const m = truth.get(slot);
    if (!m) return null;
    let lo = Math.floor(tick);
    let hi = lo + 1;
    while (lo > tick - 6 && !m.has(lo)) lo--;
    while (hi < tick + 6 && !m.has(hi)) hi++;
    const a = m.get(lo);
    const b = m.get(hi);
    if (!a || !b) return null;
    return a.clone().lerp(b, (tick - lo) / (hi - lo));
  }

  return { server, clients, run, truthAt, get now() { return now; }, TICK_HZ };
}

let decodeInputs;
function decode(b) {
  return decodeInputs(b);
}
({ decodeInputs } = await import('../../src/mp/binary.js'));
