import { describe, it, expect } from 'vitest';
import { measure, weave } from './netMeasure.js';
import { Combat } from '../../src/game/combat.js';
import { TICK_HZ } from '../../src/mp/netConfig.js';

// Phase E5: a 2 v 2 Early War match, two Nieuport 11s against two Fokker E.IVs (one with
// Immelmann's three guns), for a minute on a 150 ms line with jitter and loss. Everyone flies
// smoothly, the Nieuports change drums through the server, and every window's guns agree.

const burst = (offset) => (t) => (t + offset) % 6 < 2; // 2 s of fire every 6 s
// A pilot who also changes the drum when it is empty, as key F does (main.js changeDrum).
const changes = new Map(); // player id -> drum changes asked for
// Every pilot also clears a jam (key B): the room server's jams are random, so without this
// a run could fire only a few rounds.
const withDrums = (fly) => (t, sim, c) => {
  if (c.combat?.gunBank.guns.some((g) => g.jammed)) {
    c.combat.clearJam();
    c.flight.clearJam();
  }
  if (c.combat?.gunBank.guns.some((g) => g.state === 'drumEmpty')) {
    c.combat.changeDrum();
    c.flight.changeDrum();
    changes.set(c.id, (changes.get(c.id) ?? 0) + 1);
  }
  return fly(t, sim);
};
const EARLY = [
  { id: 'p1', slot: 1, name: 'Max', team: 'central', aircraft: 'e4', loadout: 'immelmann', pilot: withDrums(weave(0, burst(0))) },
  { id: 'p2', slot: 2, name: 'Jean', team: 'allied', aircraft: 'n11', pilot: withDrums(weave(1.5, burst(1.5))) },
  { id: 'p3', slot: 3, name: 'Oswald', team: 'central', aircraft: 'e4', pilot: withDrums(weave(3, burst(3))) },
  { id: 'p4', slot: 4, name: 'Charles', team: 'allied', aircraft: 'n11', pilot: withDrums(weave(4.5, burst(4.5))) },
];

describe('a 2 v 2 Early War match (150 ms ping, 20 ms jitter, 2% loss)', () => {
  it('everyone flies and fires smoothly, the Nieuports change drums, and every window agrees with the server', () => {
    const r = measure({ ping: 150, jitter: 20, loss: 2 }, { seconds: 60, players: EARLY, combat: { Combat } });
    const { h } = r;
    for (const c of h.clients) {
      const server = h.server.players.get(c.id);
      expect(c.flight.ready).toBe(true);
      expect(c.flight.tracks.size).toBe(3); // sees the other three
      const ahead = (c.flight.clock.tick - h.server.tick) / TICK_HZ;
      expect(c.sim.state.position.distanceTo(server.sim.state.position)).toBeLessThan(5 + 80 * Math.max(0, ahead));
      expect(server.tally.shots, `${c.name} fired`).toBeGreaterThan(20);
      expect(c.combat.gunBank.guns).toHaveLength(server.guns.guns.length); // one, two or three guns
      expect(Math.abs(c.combat.gunBank.guns[0].rounds - server.guns.guns[0].rounds)).toBeLessThanOrEqual(25);
    }
    // The three-gun E.IV has its three guns on the server and in its window.
    expect(h.server.players.get('p1').guns.guns).toHaveLength(3);
    // The Nieuports changed drums, and their windows know how many spares the server says are left.
    // (A Nieuport shot down comes back with fresh drums, so the server's count may be full again.)
    for (const id of ['p2', 'p4']) {
      const server = h.server.players.get(id).guns.guns[0];
      const window = h.clients.find((c) => c.id === id).combat.gunBank.guns[0];
      expect(changes.get(id), `${id} changed a drum`).toBeGreaterThan(0);
      expect(window.spares).toBe(server.spares);
    }
    expect(r.worst.remoteError).toBeLessThan(1);
    expect(r.largest).toBeLessThan(0.5); // own corrections stay small (the lower wing is in the state)
  });
});

describe('a Nieuport changes drums through the room server', () => {
  it('the change asked for in the window happens on the server, and both agree on the spares left', () => {
    changes.clear();
    const players = [
      { id: 'p1', slot: 1, name: 'Max', team: 'central', aircraft: 'e4', pilot: weave(0) }, // not firing
      { id: 'p2', slot: 2, name: 'Jean', team: 'allied', aircraft: 'n11', pilot: withDrums(weave(1.5, burst(1.5))) },
    ];
    const r = measure({ ping: 150, jitter: 20, loss: 2 }, { seconds: 60, players, combat: { Combat } });
    const server = r.h.server.players.get('p2');
    const window = r.h.clients.find((c) => c.id === 'p2').combat.gunBank.guns[0];
    expect(changes.get('p2')).toBeGreaterThan(0);
    expect(server.spawn, 'not shot down (still its first life)').toBe(1);
    expect(server.guns.guns[0].spares).toBeLessThan(3); // the server changed it
    expect(window.spares).toBe(server.guns.guns[0].spares);
    expect(server.tally.shots).toBeGreaterThan(97); // it fired more than one drum
  });
});

