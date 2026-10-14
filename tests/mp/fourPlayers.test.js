import { describe, it, expect } from 'vitest';
import { measure, weave } from './netMeasure.js';
import { Combat } from '../../src/game/combat.js';
import { TICK_HZ } from '../../src/mp/netConfig.js';

// Four players, two a side, weaving and firing in bursts, for a minute on a 150 ms line with
// jitter and loss: everyone flies smoothly, every window agrees with the server.
const burst = (offset) => (t) => (t + offset) % 6 < 1.5; // 1.5 s of fire every 6 s
const FOUR = [
  { id: 'p1', slot: 1, name: 'Max', team: 'central', aircraft: 'dr1', pilot: weave(0, burst(0)) },
  { id: 'p2', slot: 2, name: 'Albert', team: 'allied', aircraft: 'camel', pilot: weave(1.5, burst(1.5)) },
  { id: 'p3', slot: 3, name: 'Werner', team: 'central', aircraft: 'albatros', pilot: weave(3, burst(3)) },
  { id: 'p4', slot: 4, name: 'Georges', team: 'allied', aircraft: 'spad13', pilot: weave(4.5, burst(4.5)) },
];

describe('four players, two a side (150 ms ping, 20 ms jitter, 2% loss)', () => {
  it('everyone flies and fires smoothly for a minute, and every window agrees with the server', () => {
    const r = measure({ ping: 150, jitter: 20, loss: 2 }, { seconds: 60, players: FOUR, combat: { Combat } });
    const { h } = r;
    console.info(`[four players] others off their path at most ${r.worst.remoteError.toFixed(2)} m, frame jump ${r.worst.frameJump.toFixed(2)} m, own largest correction ${(r.largest * 100).toFixed(1)} cm; rounds fired ${[...h.server.players.values()].map((p) => p.tally.shots).join(', ')}`);
    for (const c of h.clients) {
      expect(c.flight.ready).toBe(true);
      expect(c.flight.tracks.size).toBe(3); // sees the other three
      const server = h.server.players.get(c.id);
      // Your own aircraft in your window is where the server has it, give or take the few ticks
      // your window runs ahead.
      const ahead = (c.flight.clock.tick - h.server.tick) / TICK_HZ;
      expect(c.sim.state.position.distanceTo(server.sim.state.position)).toBeLessThan(5 + 80 * Math.max(0, ahead));
      expect(server.tally.shots).toBeGreaterThan(50); // everyone fired
      // Your window's guns agree with the server's (within the drift allowed).
      expect(Math.abs(c.combat.gunBank.guns[0].rounds - server.guns.guns[0].rounds)).toBeLessThanOrEqual(25);
    }
    expect(r.worst.remoteError).toBeLessThan(1);
    expect(r.worst.frameJump).toBeLessThan(0.3);
    expect(r.largest).toBeLessThan(0.5);
  });
});
