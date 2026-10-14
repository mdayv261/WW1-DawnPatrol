import { describe, it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { MatchSim } from '../../src/mp/matchSim.js';
import { PoseHistory } from '../../src/mp/history.js';
import { placeAt } from '../../src/mp/spawn.js';
import { controlsFor, FALLING } from '../../src/mp/pilotRules.js';
import { quantiseInput } from '../../src/mp/binary.js';
import { createWorld } from '../../src/world/layout.js';
import { seededRandom } from '../../src/weapons/guns.js';
import { createDamage } from '../../src/physics/damage.js';
import { DEFAULT_SETTINGS, TICK_HZ, RESPAWN_S, MAX_REWIND_TICKS } from '../../src/mp/netConfig.js';

const world = createWorld();
const SHOOTER = { id: 'a', slot: 1, name: 'Albert', team: 'allied', aircraft: 'spad13' };
const TARGET = { id: 'b', slot: 2, name: 'Max', team: 'central', aircraft: 'albatros' };
const MATE = { id: 'c', slot: 3, name: 'Georges', team: 'allied', aircraft: 'spad13' };

// Put a pilot in level flight at (x, y, z) heading `heading` (radians from north).
function place(m, id, x, z, heading, y = 2000) {
  const p = m.players.get(id);
  p.sim.start(p.ac, y);
  placeAt(p.sim, x, z, heading);
  p.last = quantiseInput(p.sim.startInput);
  p.history.clear();
  return p;
}

// The point `distance` m along a pilot's line of fire (in level flight the nose, and so the guns,
// point a little up: a target at the same height would be missed above, as in real life).
function onGunLine(p, distance) {
  const s = p.sim.state;
  const dir = new Vector3(1, 0, 0).applyQuaternion(s.quaternion);
  return s.position.clone().addScaledVector(dir, distance).add(new Vector3(0, p.ac.guns.muzzleY, 0));
}

// A match with the shooter (and others) placed; rng fixed so jams repeat.
function match(players = [SHOOTER, TARGET], options = {}) {
  const m = new MatchSim({ settings: { ...DEFAULT_SETTINGS, ...options.settings }, world, now: 0, combat: { rng: seededRandom(3), ...options.combat } });
  for (const p of players) m.addPlayer(p);
  return m;
}

// Hold the trigger from tick `from` for `ticks`, with the shooter's screen `viewOffset` ticks behind.
function burst(m, id, from, ticks, viewOffset = 0) {
  const p = m.players.get(id);
  const fire = { ...p.last, fire: true };
  for (let t = from; t < from + ticks; t++) p.inputs.set(t, { input: fire, view: t - viewOffset });
}

const run = (m, ticks) => { for (let i = 0; i < ticks; i++) m.step(); };

describe('pose history (for lag compensation)', () => {
  it('keeps the last poses, tick by tick, and falls back to the nearest it has', () => {
    const h = new PoseHistory(10);
    expect(h.at(5)).toBe(null);
    const state = { position: new Vector3(), quaternion: new Quaternion() };
    for (let t = 1; t <= 15; t++) h.record(t, { ...state, position: new Vector3(t, 0, 0) });
    expect(h.at(12).position.x).toBe(12);
    expect(h.at(3).position.x).toBe(6); // older than kept: the oldest (ticks 6 to 15 are kept)
    expect(h.at(99).position.x).toBe(15); // newer than kept: the newest
    h.clear();
    expect(h.at(12)).toBe(null);
  });
});

describe('the server\'s guns and hits', () => {
  it('a burst from close behind hits, uses rounds, and shoots the target down; the kill is the shooter\'s', () => {
    const m = match();
    const a = place(m, 'a', 0, 0, 0);
    const aim = onGunLine(a, 60);
    const b = place(m, 'b', aim.x, aim.z, 0, aim.y); // 60 m ahead on the gun line, flying the same way
    burst(m, 'a', 1, 3 * TICK_HZ);
    const notices = [];
    for (let i = 0; i < 3 * TICK_HZ; i++) {
      m.step();
      notices.push(...m.combat.notices.splice(0));
    }
    expect(a.tally.shots).toBeGreaterThan(20);
    expect(a.guns.guns[0].rounds).toBeLessThan(a.ac.guns.rounds);
    expect(a.tally.hits).toBeGreaterThan(3);
    expect(b.down).toBe(true);
    expect(a.tally.kills).toBe(1);
    expect(b.tally.deaths).toBe(1);
    expect(m.combat.teams).toEqual({ allied: 1, central: 0 });
    expect(notices.find((n) => n.to === 'b' && n.text.startsWith('You were shot down by Albert'))).toBeTruthy();
    expect(notices.find((n) => n.to === 'all' && n.text.startsWith('Albert shot down Max'))).toBeTruthy();
    expect(m.combat.fx.some((f) => f[0] === 'hit' && f[4] === 2)).toBe(true);
  });

  it('a shot-down aircraft falls (the falling controls), and is back in the air 10 s later with full belts', () => {
    const m = match();
    const a = place(m, 'a', 0, 0, 0);
    const aim = onGunLine(a, 60);
    const b = place(m, 'b', aim.x, aim.z, 0, aim.y);
    burst(m, 'a', 1, 3 * TICK_HZ);
    let t = 0;
    while (!b.down && t++ < 3 * TICK_HZ) m.step();
    expect(b.down).toBe(true);
    expect(controlsFor(b.sim, { pull: 0, roll: 0, yaw: 0, throttle: 1, trim: 0.2 })).toMatchObject({ ...FALLING, trim: 0.2 });
    const spawn = b.spawn;
    run(m, RESPAWN_S * TICK_HZ + 2);
    expect(b.spawn).toBe(spawn + 1);
    expect(b.down).toBe(false);
    expect(b.sim.state.position.y).toBeGreaterThan(1500);
    expect(b.guns.guns[0].rounds).toBe(b.ac.guns.rounds);
  });

  it('friendly fire off: rounds pass through a team-mate; on: they hit, but no kill counts', () => {
    for (const friendlyFire of [false, true]) {
      const m = match([SHOOTER, MATE], { settings: { friendlyFire } });
      const a = place(m, 'a', 0, 0, 0);
      const aim = onGunLine(a, 60);
      const c = place(m, 'c', aim.x, aim.z, 0, aim.y);
      burst(m, 'a', 1, 3 * TICK_HZ);
      run(m, 3 * TICK_HZ);
      if (!friendlyFire) {
        expect(a.tally.hits).toBe(0);
        expect(c.down).toBe(false);
      } else {
        expect(a.tally.hits).toBeGreaterThan(0);
        expect(a.tally.kills).toBe(0);
        expect(m.combat.teams).toEqual({ allied: 0, central: 0 });
      }
    }
  });

  it('a crash soon after an enemy\'s hit is their kill; a crash long after is nobody\'s', () => {
    for (const [wait, credited] of [[5, true], [20, false]]) {
      const m = match();
      const a = place(m, 'a', 0, 0, 0);
      const b = place(m, 'b', 0, -60, 0);
      b.lastHit = { by: a, tick: m.tick };
      run(m, wait * TICK_HZ);
      b.sim.state.position.y = 1; // into the ground
      b.sim.state.velocity.set(0, -40, 0);
      run(m, 10);
      expect(b.down).toBe(true);
      expect(a.tally.kills).toBe(credited ? 1 : 0);
    }
  });
});

describe('the score message', () => {
  it('goes out at once after a kill, and with rounds and hits at most once a second', () => {
    const m = match();
    const a = place(m, 'a', 0, 0, 0);
    const aim = onGunLine(a, 60);
    place(m, 'b', aim.x, aim.z, 0, aim.y);
    expect(m.advanceTo(10).score.teams).toEqual({ allied: 0, central: 0 }); // the first one (players joined)
    burst(m, 'a', m.tick + 1, 2 * TICK_HZ);
    const scores = [];
    for (let t = 16; t <= 2000; t += 16) {
      const { score } = m.advanceTo(t);
      if (score) scores.push(score);
    }
    expect(scores.length).toBeGreaterThanOrEqual(1);
    expect(scores.length).toBeLessThanOrEqual(4); // about once a second, plus a kill
    expect(scores.at(-1).players.find((p) => p.id === 'a').shots).toBeGreaterThan(10);
  });
});

describe('lag compensation: you hit what was on your screen', () => {
  // The shooter flies north; the target crosses from left to right 200 m ahead. Every run starts
  // the same, so the only difference is when the shooter fires and what they saw.
  function crossing(fireTick, viewOffset, maxRewind) {
    const m = match([SHOOTER, TARGET], { combat: { maxRewind } });
    const a = place(m, 'a', 0, 0, 0);
    // The target crosses the shooter's gun line 200 m ahead of where the shooter will be in 1 s.
    const cross = onGunLine(a, 200).addScaledVector(a.sim.state.velocity, 1);
    const b = place(m, 'b', cross.x, cross.z, Math.PI / 2, cross.y);
    b.sim.state.position.addScaledVector(b.sim.state.velocity, -1); // so it gets there in 1 s
    b.sim.previous.position.copy(b.sim.state.position);
    burst(m, 'a', fireTick, 24); // a 0.2 s burst
    run(m, fireTick + 24 + 60);
    return m.players.get('a').tally.hits;
  }

  // The best moment to fire, and the hits it gets, for a shooter whose screen is `viewOffset`
  // ticks behind (their own aircraft is never behind: it is flown at once in their browser).
  function bestBurst(viewOffset, maxRewind) {
    let best = { tick: 0, hits: 0 };
    for (let t = 40; t <= 200; t += 2) {
      const hits = crossing(t, viewOffset, maxRewind);
      if (hits > best.hits) best = { tick: t, hits };
    }
    return best;
  }

  it('a shooter who sees the world 0.3 s late hits as well as one with no delay, by firing at what they see', () => {
    const lag = Math.round(0.3 * TICK_HZ);
    const prompt = bestBurst(0, 0); // no delay at all
    const late = bestBurst(lag, MAX_REWIND_TICKS); // 0.3 s late, compensated: the moment their screen says "now"
    const uncompensated = crossing(late.tick, lag, 0); // the same moment, if the server did not look back
    console.info(`[lag compensation] crossing target at 200 m: best burst ${prompt.hits} hits with no delay; ${late.hits} with a 0.3 s delay, compensated; ${uncompensated} without compensation`);
    expect(prompt.hits).toBeGreaterThan(0);
    expect(late.hits).toBeGreaterThanOrEqual(Math.ceil(prompt.hits * 0.7));
    expect(uncompensated).toBeLessThan(late.hits);
  });

  it('no more than 0.4 s is ever taken back', () => {
    const lag = Math.round(0.8 * TICK_HZ); // a claimed 0.8 s
    const late = bestBurst(Math.round(0.4 * TICK_HZ), MAX_REWIND_TICKS); // what 0.4 s allows
    // Claiming 0.8 s at that moment gains nothing: only 0.4 s is taken back.
    expect(crossing(late.tick, lag, MAX_REWIND_TICKS)).toBe(late.hits);
  });
});

describe('the falling rule', () => {
  it('only a destroyed aircraft gets the falling controls', () => {
    const sim = { damage: createDamage() };
    const hands = { pull: 0.3, roll: -0.2, yaw: 0, throttle: 0.8, trim: 0.1, fire: true, clearJam: false };
    expect(controlsFor(sim, hands)).toBe(hands);
    sim.damage.pilot = 1;
    expect(controlsFor(sim, hands)).toEqual({ ...hands, ...FALLING });
  });
});
