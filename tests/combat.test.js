import { describe, it, expect } from 'vitest';
import { Vector3, Quaternion } from 'three';
import { Simulation } from '../src/core/simulation.js';
import { AIRCRAFT, AIRCRAFT_LIST } from '../src/aircraft/index.js';
import { TARGETS, BULLETS, SIGHT, CARTRIDGES } from '../src/aircraft/weapons.js';
import { Combat } from '../src/game/combat.js';
import { Agent, enemiesOf } from '../src/game/agents.js';
import { seededRandom } from '../src/weapons/guns.js';
import { DAMAGE } from '../src/aircraft/damageModel.js';
import { attitude } from '../src/dev/flightScenarios.js';

// The fight: the player's guns, bullets, targets, hits and shooting down.

const DT = 1 / 120;

// A player parked in the air (never stepped), so the geometry is exact.
function player(ac = AIRCRAFT.camel, altitude = 1000) {
  const sim = new Simulation();
  sim.start(ac, altitude);
  sim.diag = { rpm: 1100 };
  return sim;
}

function setup(ac = AIRCRAFT.camel, opts = {}) {
  const sim = player(ac, opts.altitude ?? 1000);
  const combat = new Combat({ rng: seededRandom(11), ...opts.combat });
  combat.reset(ac);
  return { sim, combat };
}

// Run steps with the player held where it is.
function run(combat, sim, seconds, trigger = true) {
  const pos = sim.state.position.clone();
  const log = {};
  for (let i = 0; i < seconds / DT; i++) {
    sim.state.position.copy(pos);
    sim.previous.position.copy(pos);
    combat.step(DT, sim, trigger);
    for (const e of combat.events) log[e.kind] = (log[e.kind] ?? 0) + 1;
    combat.events.length = 0;
  }
  return log;
}

const onSightPoint = (combat, sim, target, offset = new Vector3()) => {
  const p = combat.sightPoint(sim).add(offset);
  target.state.position.copy(p);
  target.sim.previous.position.copy(p);
};

describe('a new flight', () => {
  it('has full belts, nothing in the air and no targets', () => {
    for (const ac of AIRCRAFT_LIST) {
      const c = new Combat();
      c.reset(ac);
      expect(c.gunBank.roundsLeft).toEqual([ac.guns.rounds, ac.guns.rounds]);
      expect(c.bullets.length).toBe(0);
      expect(c.agents.length).toBe(0);
      expect(c.kills).toBe(0);
    }
  });

  it('reset forgets the last flight', () => {
    const { sim, combat } = setup();
    combat.spawnAgent(sim);
    run(combat, sim, 1);
    combat.reset(AIRCRAFT.spad13);
    expect(combat.agents.length).toBe(0);
    expect(combat.bullets.length).toBe(0);
    expect(combat.shotsFired).toBe(0);
    expect(combat.gunBank.roundsLeft).toEqual([400, 400]);
  });
});

describe('target aircraft', () => {
  it('are the other side\'s aircraft, ahead of the player and flying the same way', () => {
    for (const ac of AIRCRAFT_LIST) {
      const { sim, combat } = setup(ac);
      const t = combat.spawnAgent(sim);
      expect(t.aircraft.side).not.toBe(ac.side);
      expect(enemiesOf(ac).every((e) => e.side !== ac.side)).toBe(true);
      const d = t.state.position.clone().sub(sim.state.position);
      expect(Math.hypot(d.x, d.z)).toBeCloseTo(TARGETS.startRange, 3);
      expect(d.y).toBeCloseTo(TARGETS.startAbove, 3);
      const fwd = new Vector3(0, 0, -1); // the player faces north
      expect(Math.atan2(d.x, -d.z)).toBeCloseTo(attitude(sim.state).heading, 3);
      expect(fwd.dot(d.clone().setY(0).normalize())).toBeGreaterThan(0.999);
      expect(attitude(t.state).heading).toBeCloseTo(attitude(sim.state).heading, 2);
      expect(t.state.velocity.length()).toBeCloseTo(TARGETS.speedFraction * t.aircraft.documented.maxSpeed, 0);
    }
  });

  it('are placed ahead whichever way the player is facing', () => {
    const { sim, combat } = setup();
    // Turn the player to face east (heading 90 degrees).
    sim.state.quaternion.premultiply(new Quaternion(0, Math.sin(-Math.PI / 4), 0, Math.cos(-Math.PI / 4)));
    const t = combat.spawnAgent(sim);
    const d = t.state.position.clone().sub(sim.state.position);
    expect(d.x).toBeGreaterThan(400);
    expect(Math.abs(d.z)).toBeLessThan(1);
    expect(attitude(t.state).heading).toBeCloseTo(Math.PI / 2, 2);
  });

  it('are limited to four: three side by side, the fourth back in the middle', () => {
    const { sim, combat } = setup();
    const ts = [combat.spawnAgent(sim), combat.spawnAgent(sim), combat.spawnAgent(sim), combat.spawnAgent(sim)];
    expect(combat.spawnAgent(sim)).toBeNull();
    expect(ts.every(Boolean)).toBe(true);
    const laterals = ts.map((t) => t.state.position.x);
    expect(new Set(laterals.map((x) => Math.round(x))).size).toBe(3);
    expect(new Set(ts.map((t) => t.pattern)).size).toBe(3);
  });

  for (const player of [AIRCRAFT.camel, AIRCRAFT.dr1]) {
    for (const pattern of TARGETS.patterns) {
      it(`flying the ${pattern} pattern against a ${player.name}: they keep their height and speed for 40 s without crashing`, () => {
        for (const ac of enemiesOf(player)) {
          const t = new Agent(ac, 'drone', { pattern });
          const start = new Simulation();
          start.start(player, 1000);
          t.place(start.state);
          let worst = 0;
          let slowest = Infinity;
          let fastest = 0;
          let turned = 0;
          let last = attitude(t.state).heading;
          for (let i = 0; i < 40 / DT; i++) {
            t.step(DT);
            worst = Math.max(worst, Math.abs(t.state.position.y - t.brain.altitude));
            const speed = t.state.velocity.length();
            slowest = Math.min(slowest, speed);
            fastest = Math.max(fastest, speed);
            const h = attitude(t.state).heading;
            turned += ((h - last + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            last = h;
          }
          expect(t.crashed, `${ac.name} ${pattern}`).toBe(false);
          expect(worst, `${ac.name} ${pattern} height`).toBeLessThan(40);
          expect(slowest).toBeGreaterThan(0.8 * t.brain.speed);
          expect(fastest).toBeLessThan(1.25 * t.brain.speed);
          if (pattern === 'circle') expect(Math.abs(turned)).toBeGreaterThan(2);
          if (pattern === 'straight') expect(Math.abs(turned)).toBeLessThan(0.35);
          if (pattern === 'weave') expect(Math.abs(turned)).toBeLessThan(1.5);
        }
      });
    }
  }
});

describe('firing', () => {
  it('bullets leave the muzzles at the muzzle velocity plus the aircraft\'s own speed', () => {
    const { sim, combat } = setup();
    run(combat, sim, 0.12);
    expect(combat.bullets.length).toBeGreaterThan(0);
    const b = combat.bullets[combat.bullets.length - 1]; // the newest has hardly lost any speed
    const speed = Math.hypot(b.vx, b.vy, b.vz);
    expect(speed).toBeGreaterThan(CARTRIDGES.mk7.muzzleVelocity); // 731 + 42 m/s of aircraft, less a little drag
    expect(speed).toBeLessThan(CARTRIDGES.mk7.muzzleVelocity + sim.state.velocity.length());
    expect(b.vz).toBeLessThan(0); // north is -Z
  });

  it('the stream is two guns about 0.3 m apart, left and right', () => {
    const { sim, combat } = setup();
    run(combat, sim, 0.05);
    const xs = combat.bullets.map((b) => b.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.2);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.6);
  });

  it('nothing fires without the trigger, or when the player has crashed', () => {
    const { sim, combat } = setup();
    run(combat, sim, 1, false);
    expect(combat.shotsFired).toBe(0);
    sim.crashed = true;
    run(combat, sim, 1, true);
    expect(combat.shotsFired).toBe(0);
  });

  it('runs out of ammunition and then stops', () => {
    const { sim, combat } = setup();
    combat.gunBank.type = { ...combat.gunBank.type, jamPerRound: 0 };
    run(combat, sim, 70);
    expect(combat.gunBank.roundsLeft).toEqual([0, 0]);
    expect(combat.shotsFired).toBe(500);
    run(combat, sim, 2);
    expect(combat.shotsFired).toBe(500);
  });

  it('bullets that hit the ground are removed and make a dust event', () => {
    const { sim, combat } = setup(AIRCRAFT.camel, { altitude: 60 });
    // Point the nose steeply down: the bullets reach the ground within a second.
    sim.state.quaternion.multiply(new Quaternion(0, 0, Math.sin(-0.15), Math.cos(0.15))); // 0.3 rad about the pitch axis, nose down
    sim.state.velocity.set(0, 0, 0);
    const log = run(combat, sim, 1.2);
    expect(log.ground).toBeGreaterThan(5);
    expect(combat.bullets.every((b) => b.y > 0)).toBe(true);
  });

  it('bullets are dropped after their time limit or when too slow, and the number in flight is capped', () => {
    const { sim, combat } = setup(AIRCRAFT.camel, { altitude: 5000 });
    combat.gunBank.type = { ...combat.gunBank.type, jamPerRound: 0 };
    run(combat, sim, 10);
    expect(combat.bullets.every((b) => b.age <= BULLETS.maxLife + DT)).toBe(true);
    expect(combat.bullets.length).toBeLessThanOrEqual(BULLETS.maxAlive);
  });

  it('a tree or building stops bullets before they reach a target behind it', () => {
    const wall = (x, y, z) => (z < sim.state.position.z - 100 && y < 40 ? 'Hit a tree' : null);
    const { sim, combat } = setup(AIRCRAFT.camel, { altitude: 25, combat: { solidAt: wall } });
    const t = combat.spawnAgent(sim);
    onSightPoint(combat, sim, t);
    const log = run(combat, sim, 0.5);
    expect(log.solid).toBeGreaterThan(3);
    expect(combat.hitsOnTargets).toBe(0);
  });
});

describe('hitting and shooting down', () => {
  it('shots on the sight point hit a target there; the hit is counted and a spark event made', () => {
    const { sim, combat } = setup();
    const t = combat.spawnAgent(sim);
    onSightPoint(combat, sim, t);
    const log = run(combat, sim, 0.3);
    expect(combat.hitsOnTargets).toBeGreaterThan(0);
    expect(log.hit).toBe(combat.hitsOnTargets);
    expect(t.hits).toBe(combat.hitsOnTargets);
    const d = t.sim.damage; // bullets from astern go through the fuselage: something is hurt
    expect(d.pilot + d.engine + d.tank + d.tailplane + d.fin + d.wing.L + d.wing.R + Object.values(d.cables).filter((c) => c !== null).length).toBeGreaterThan(0);
  });

  it('shots well to the side miss', () => {
    const { sim, combat } = setup();
    const t = combat.spawnAgent(sim);
    onSightPoint(combat, sim, t, new Vector3(40, 0, 0));
    run(combat, sim, 0.5);
    expect(combat.hitsOnTargets).toBe(0);
  });

  it('a burst from astern kills the pilot: one message and one kill, the burst effect, and the target tumbles out of the sky', () => {
    const { sim, combat } = setup();
    const t = combat.spawnAgent(sim);
    onSightPoint(combat, sim, t);
    for (let i = 0; i < 4 / DT && !t.down; i++) {
      run(combat, sim, DT);
      onSightPoint(combat, sim, t); // keep it on the sight
    }
    expect(t.down).toBe(true);
    expect(t.reason).toBe('Pilot killed');
    expect(combat.kills).toBe(1);
    expect(combat.messages).toEqual([`SHOT DOWN: ${t.aircraft.name} (Pilot killed)`]);
    // More hits do not count another kill.
    run(combat, sim, 0.3);
    expect(combat.kills).toBe(1);
    expect(combat.messages.length).toBe(1);
    // Left alone it falls.
    t.state.position.y = 600;
    const y0 = t.state.position.y;
    run(combat, sim, 25, false);
    expect(t.state.position.y).toBeLessThan(y0 - 50);
  });

  it('hits take effect by part: an engine hit hurts the engine, a wing hit the wing, and a bullet goes through a wing to what is behind it', () => {
    const t = new Agent(AIRCRAFT.albatros, 'drone', { pattern: 'straight' });
    t.takeHit('engine', 1800 * 3);
    expect(t.sim.damage.engine).toBeCloseTo(3 / 15, 9);
    t.takeHit('wingR', 1800 * 2);
    expect(t.sim.damage.wing.R).toBeCloseTo(2 / 20, 9);
    expect(t.down).toBe(false);
  });

  it('a hit from the side on a wing passes through both wings of a biplane before it stops', () => {
    const { sim, combat } = setup();
    const t = combat.spawnAgent(sim);
    // Fire straight down at the right wing from above: through the upper wing and the lower one.
    const ac = t.aircraft;
    const half = ac.wingStack[0].span / 2;
    t.state.position.set(0, 500, 0);
    t.sim.previous.position.copy(t.state.position);
    t.sim.previous.quaternion.copy(t.state.quaternion);
    const before = t.sim.damage.wing.R;
    // A point above the right wing (body +Z), in world axes: the target faces north, its right is east.
    const above = new Vector3(0.3, 4, half * 0.6).applyQuaternion(t.state.quaternion).add(t.state.position);
    const b = { x: above.x, y: above.y, z: above.z, vx: 0, vy: -700, vz: 0, age: 0, cartridge: CARTRIDGES.smk, tracer: false };
    combat.advance(b, 0.01, [t]); // a 7 m step straight down through the wing
    // Every wing of the target was hit, each a share (0.75) of the energy of the one before: the Dr.I has three.
    const rel = new Vector3(b.vx, b.vy, b.vz).sub(t.state.velocity);
    const first = (0.5 * CARTRIDGES.smk.mass * rel.lengthSq()) / DAMAGE.energyRef / DAMAGE.hitsToDestroy.wing;
    let expected = 0;
    for (let i = 0; i < ac.wings; i++) expected += first * DAMAGE.passLoss ** i;
    expect(ac.wings).toBe(3);
    expect(t.sim.damage.wing.R - before).toBeCloseTo(expected, 6);
    expect(t.sim.damage.wing.L).toBe(0);
    expect(b.alive).toBe(false);
  });

  it('a crashed target is taken away a few seconds later', () => {
    const { sim, combat } = setup();
    const t = combat.spawnAgent(sim);
    t.sim.crashed = true;
    run(combat, sim, 1, false);
    expect(combat.agents.length).toBe(1);
    run(combat, sim, 5, false);
    expect(combat.agents.length).toBe(0);
  });

  it('a target far away is dropped', () => {
    const { sim, combat } = setup();
    const t = combat.spawnAgent(sim);
    t.state.position.x += TARGETS.dropRange + 100;
    run(combat, sim, 0.1, false);
    expect(combat.agents.length).toBe(0);
  });

});

describe('the gun sight', () => {
  it('is about 200 m ahead of the guns, a little below the line of the barrels (drop) and inherits the aircraft\'s speed', () => {
    const { sim, combat } = setup();
    const p = combat.sightPoint(sim);
    const g = sim.aircraft.guns;
    const muzzle = new Vector3(g.muzzleX, g.muzzleY, 0).applyQuaternion(sim.state.quaternion).add(sim.state.position);
    expect(p.distanceTo(muzzle)).toBeCloseTo(SIGHT.range, 6);
    // Along the barrels, with the drop (about 0.4 m at 200 m) below the line.
    const dir = new Vector3(1, 0, 0).applyQuaternion(sim.state.quaternion);
    const line = muzzle.clone().addScaledVector(dir, SIGHT.range);
    expect(p.y).toBeLessThan(line.y);
    expect(line.distanceTo(p)).toBeGreaterThan(0.2);
    expect(line.distanceTo(p)).toBeLessThan(0.8);
  });

  it('moves with the aircraft', () => {
    const { sim, combat } = setup();
    const a = combat.sightPoint(sim);
    sim.state.position.x += 100;
    expect(combat.sightPoint(sim).x - a.x).toBeCloseTo(100, 6);
  });
});
