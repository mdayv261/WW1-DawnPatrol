import { describe, it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { NetCombat } from '../../src/net/netCombat.js';
import { Combat } from '../../src/game/combat.js';
import { Simulation } from '../../src/core/simulation.js';
import { AIRCRAFT } from '../../src/aircraft/index.js';
import { createDamage } from '../../src/physics/damage.js';
import { createHarness } from './netHarness.js';
import { placeAt } from '../../src/mp/spawn.js';
import { quantiseInput } from '../../src/mp/binary.js';
import { HIT_NOTICE_S } from '../../src/mp/netConfig.js';

function setup() {
  let now = 0;
  const combat = new Combat({});
  combat.reset(AIRCRAFT.camel);
  const sim = new Simulation();
  sim.start(AIRCRAFT.camel, 1000);
  const notices = [];
  const fight = new NetCombat({ combat, sim, notice: (t) => notices.push(t), now: () => now });
  return { combat, sim, fight, notices, advance: (ms) => { now += ms; } };
}

// Another aircraft as the drawing code sees it, 300 m north of the origin at 1,000 m, flying south.
function otherView() {
  const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2); // nose turned to face +Z (south)
  return {
    id: 'mp2', aircraft: AIRCRAFT.dr1, position: new Vector3(0, 1000, -300), quaternion: q,
    velocity: new Vector3(0, 0, 40), crashed: false, sim: { damage: createDamage() },
  };
}

describe('your guns in a match', () => {
  it('never jam by themselves; jams, clearing and the true count come from the server', () => {
    const { combat, fight } = setup();
    const bank = combat.gunBank;
    for (let i = 0; i < 2000; i++) bank.update(1 / 120, true, 1200); // a long burst: a real bank would jam
    expect(bank.guns.every((g) => !g.jammed)).toBe(true);
    const fired = bank.guns[0].rounds;
    fight.syncGuns([{ rounds: fired + 5, state: 'jammed' }, { rounds: fired, state: 'clearing' }]);
    expect(bank.guns[0].jammed).toBe(true);
    expect(bank.guns[0].rounds).toBe(fired); // a small difference (shots on their way) is left alone
    expect(bank.guns[1].clearing).toBeGreaterThan(0);
    fight.syncGuns([{ rounds: fired + 50, state: 'ready' }, { rounds: 0, state: 'empty' }]);
    expect(bank.guns[0]).toMatchObject({ jammed: false, rounds: fired + 50 }); // a big one is corrected
    expect(bank.guns[1].rounds).toBe(0);
  });
});

describe("the others' guns, as shown here", () => {
  it('each round reported leaves the drawn aircraft as a tracer round with its sound, and stops at the ground', () => {
    const { combat, fight, advance } = setup();
    const view = otherView();
    fight.shots(view, 6);
    fight.frame(0, [view]);
    advance(40); // the 6 rounds leave over the next 1/30 s
    fight.frame(0.04, [view]);
    expect(fight.tracers.length).toBe(6);
    expect(combat.sounds.filter((s) => s.kind === 'shot' && !s.player)).toHaveLength(6);
    expect(fight.tracers.filter((b) => b.tracer).length).toBeGreaterThan(0);
    for (let i = 0; i < 400; i++) fight.frame(1 / 60, [view]); // rounds fall away after 5 s at most
    expect(fight.tracers.length).toBe(0);
  });

  it('a round passing close to you cracks once', () => {
    const { combat, fight, sim } = setup();
    const view = otherView();
    const dir = new Vector3(1, 0, 0).applyQuaternion(view.quaternion); // its guns point along its nose
    sim.state.position.copy(view.position).addScaledVector(dir, 300); // 300 m in front of it
    fight.shots(view, 1);
    for (let i = 0; i < 60; i++) fight.frame(1 / 120, [view]);
    expect(combat.sounds.filter((s) => s.kind === 'nearMiss')).toHaveLength(1);
  });

  it('impacts become sparks; a hit on you thuds and says so, at most every 2 s', () => {
    const { combat, fight, notices, advance } = setup();
    fight.impacts([['hit', 1, 2, 3, 2], ['ground', 4, 0, 6, 0]], 1); // someone else hit, and the ground
    expect(combat.events.map((e) => e.kind)).toEqual(['hit', 'ground']);
    expect(notices).toEqual([]);
    fight.impacts([['hit', 1, 2, 3, 1], ['hit', 1, 2, 3, 1]], 1); // you, twice
    expect(combat.sounds.filter((s) => s.kind === 'hitPlayer')).toHaveLength(2);
    expect(notices).toEqual(['You are hit!']);
    advance(HIT_NOTICE_S * 1000 + 1);
    fight.impacts([['hit', 1, 2, 3, 1]], 1);
    expect(notices).toHaveLength(2);
  });
});

describe('a fight through the network (150 ms ping, 20 ms jitter, 2% loss)', () => {
  it('a burst from behind hits; the target is told, falls the same way everywhere, and respawns', () => {
    let start = null;
    const h = createHarness({
      players: [
        { id: 'a', slot: 1, name: 'Albert', team: 'allied', aircraft: 'spad13', pilot: (t) => ({ ...start.a, fire: t > 0.5 && t < 3.5 }) }, // fires while 55-70 m behind, on its gun line
        { id: 'b', slot: 2, name: 'Max', team: 'central', aircraft: 'albatros', pilot: () => start.b },
      ],
      net: { ping: 150, jitter: 20, loss: 2 },
      combat: { Combat },
      place: (server) => {
        const a = server.players.get('a');
        const b = server.players.get('b');
        a.sim.start(a.ac, 2000);
        placeAt(a.sim, 0, 0, 0);
        // Max flies 70 m ahead. Albert sees him about 0.3 s late (his own aircraft is never late),
        // so about 11 m nearer: Max is put on Albert's gun line at that apparent distance, as a
        // pilot would aim at what is on the screen.
        const s = a.sim.state;
        const nose = new Vector3(1, 0, 0).applyQuaternion(s.quaternion);
        const ahead = s.position.clone().addScaledVector(nose, 70);
        b.sim.start(b.ac, 2000);
        const seen = 70 - b.sim.state.velocity.length() * 0.3;
        const lineY = s.position.y + a.ac.guns.muzzleY + nose.y * seen;
        b.sim.start(b.ac, lineY);
        placeAt(b.sim, ahead.x, ahead.z, 0);
        for (const p of [a, b]) {
          p.last = quantiseInput(p.sim.startInput);
          p.history.clear();
        }
        start = { a: a.last, b: b.last };
      },
    });
    h.run(4);
    const [ca, cb] = h.clients;
    const a = h.server.players.get('a');
    const b = h.server.players.get('b');
    console.info(`[network fight] ${a.tally.shots} rounds, ${a.tally.hits} hits; Max's pilot ${b.sim.damage.pilot.toFixed(2)}, tail ${b.sim.damage.tailplane.toFixed(2)}`);
    expect(a.tally.hits).toBeGreaterThan(5);
    expect(cb.notices).toContain('You are hit!');
    // Max's own browser shows the same damage as the server.
    expect(cb.sim.damage.tailplane).toBeCloseTo(b.sim.damage.tailplane, 6);
    expect(cb.sim.damage.pilot).toBeCloseTo(b.sim.damage.pilot, 6);
    // Albert's guns fired at once in his browser, and his counter follows the server's.
    expect(ca.combat.gunBank.guns[0].rounds).toBeLessThan(a.ac.guns.rounds);
    expect(Math.abs(ca.combat.gunBank.guns[0].rounds - a.guns.guns[0].rounds)).toBeLessThan(25);
    // One more hit finishes him (on the server): Albert gets the kill, and Max falls the same way
    // in his own browser as on the server (the shared falling rule: no lasting corrections).
    b.sim.damage.pilot = 1;
    h.run(3);
    expect(b.tally.deaths).toBe(1);
    expect(a.tally.kills).toBe(1);
    expect(h.notices.some((n) => n.to === 'b' && n.text.startsWith('You were shot down by Albert'))).toBe(true);
    expect(cb.sim.state.position.distanceTo(b.sim.state.position)).toBeLessThan(15);
    h.run(10);
    expect(b.down).toBe(false); // back in the air
  });
});
