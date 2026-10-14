import { describe, it, expect } from 'vitest';
import { measure, weave } from './netMeasure.js';
import { MatchSim } from '../../src/mp/matchSim.js';
import { NetFlight } from '../../src/net/netFlight.js';
import { Combat } from '../../src/game/combat.js';
import { createWorld } from '../../src/world/layout.js';
import { placeAt } from '../../src/mp/spawn.js';
import { quantiseInput } from '../../src/mp/binary.js';
import { DEFAULT_SETTINGS, TICK_HZ } from '../../src/mp/netConfig.js';

// How much work multiplayer adds. Drawing is not measured here (three other aircraft cost the
// same as three AI enemies in single-player, measured in Phases 3-5); this is the computing.

describe('performance', () => {
  it('the server: four aircraft all firing at each other take a tiny share of one processor', () => {
    const m = new MatchSim({ settings: DEFAULT_SETTINGS, world: createWorld(), now: 0 });
    const players = [['a', 'allied', 'camel'], ['b', 'central', 'dr1'], ['c', 'allied', 'spad13'], ['d', 'central', 'albatros']];
    players.forEach(([id, team, aircraft], i) => m.addPlayer({ id, slot: i + 1, name: id, team, aircraft }));
    // Close together in a line, so every burst passes near (and hits) the others.
    [...m.players.values()].forEach((p, i) => {
      p.sim.start(p.ac, 2000);
      placeAt(p.sim, i * 3, -i * 80, 0);
      p.last = { ...quantiseInput(p.sim.startInput), fire: true };
      p.heard = Infinity; // keep firing without new controls
      p.history.clear();
    });
    const seconds = 30;
    const t0 = performance.now();
    for (let i = 0; i < seconds * TICK_HZ; i++) {
      m.step();
      if (m.tick % 4 === 0) m.snapshots();
    }
    const msPerSecond = (performance.now() - t0) / seconds;
    const shots = [...m.players.values()].reduce((n, p) => n + p.tally.shots, 0);
    console.info(`[performance] server, 4 aircraft all firing: ${msPerSecond.toFixed(2)} ms of computing per second of match (${(msPerSecond / 10).toFixed(2)}% of one processor); ${shots} rounds fired`);
    expect(shots).toBeGreaterThan(400);
    expect(msPerSecond).toBeLessThan(50); // under 5% of one processor even with every other test running alongside (alone: about 9 ms)
  });

  it('a browser in a 4-player match: its own step, three others smoothed and their effects, well under a millisecond a frame', () => {
    // Time NetFlight's work and the effects Combat does for it, inside a real (headless) match.
    let spent = 0;
    let frames = 0;
    const wrap = (proto, name, count = false) => {
      const original = proto[name];
      proto[name] = function timed(...args) {
        const t = performance.now();
        const out = original.apply(this, args);
        spent += performance.now() - t;
        if (count) frames += 1;
        return out;
      };
      return () => { proto[name] = original; };
    };
    const undo = [wrap(NetFlight.prototype, 'frame', true), wrap(NetFlight.prototype, 'step'), wrap(NetFlight.prototype, 'receive'), wrap(Combat.prototype, 'step')];
    try {
      const fire = (offset) => (t) => (t + offset) % 4 < 2;
      measure({ ping: 150, jitter: 20, loss: 2 }, {
        seconds: 30,
        combat: { Combat },
        players: [
          { id: 'p1', slot: 1, name: 'A', team: 'central', aircraft: 'dr1', pilot: weave(0, fire(0)) },
          { id: 'p2', slot: 2, name: 'B', team: 'allied', aircraft: 'camel', pilot: weave(1, fire(1)) },
          { id: 'p3', slot: 3, name: 'C', team: 'central', aircraft: 'albatros', pilot: weave(2, fire(2)) },
          { id: 'p4', slot: 4, name: 'D', team: 'allied', aircraft: 'spad13', pilot: weave(3, fire(3)) },
        ],
      });
    } finally {
      undo.forEach((f) => f());
    }
    const perFrame = spent / frames;
    console.info(`[performance] browser in a 4-player match: ${perFrame.toFixed(3)} ms of multiplayer work per frame (a 60 fps frame has 16.7 ms)`);
    expect(perFrame).toBeLessThan(1);
  });
});
