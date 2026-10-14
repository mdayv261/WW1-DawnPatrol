import { describe, it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { createHarness } from './netHarness.js';
import { attitude } from '../../src/dev/flightScenarios.js';
import { NetClock } from '../../src/net/clock.js';
import { RemoteTrack, toSample } from '../../src/net/interpolation.js';
import { Prediction } from '../../src/net/prediction.js';
import { Simulation } from '../../src/core/simulation.js';
import { AIRCRAFT } from '../../src/aircraft/index.js';
import { captureState, quantiseInput } from '../../src/mp/binary.js';
import { LEAD_TARGET_TICKS, CLOCK_RATE, TICK_HZ } from '../../src/mp/netConfig.js';

// Scripted pilots: weaving from one 45-degree bank to the other while holding their height
// (a simple autopilot, so the test measures the network, not crashes).
const clamp = (v) => Math.max(-1, Math.min(1, v));
const weave = (phase) => (t, sim) => {
  const a = attitude(sim.state);
  const bank = 0.8 * Math.sin(t / 4 + phase);
  return {
    roll: clamp(2.5 * (bank - a.bank) - 0.8 * sim.state.angularVelocity.x),
    pull: clamp(0.15 * Math.abs(a.bank) + 0.004 * (2000 - sim.state.position.y) - 0.05 * sim.state.velocity.y),
    yaw: 0, throttle: 1, trim: 0,
  };
};
const PLAYERS = [
  { id: 'p1', slot: 1, name: 'Max', team: 'central', aircraft: 'dr1', pilot: weave(0) },
  { id: 'p2', slot: 2, name: 'Albert', team: 'allied', aircraft: 'camel', pilot: weave(1.5) },
  { id: 'p3', slot: 3, name: 'Werner', team: 'central', aircraft: 'albatros', pilot: weave(3) },
];

// Fly a match and measure what each player sees after `warm` seconds.
function measure(net, seconds = 40, warm = 3) {
  const h = createHarness({ players: PLAYERS, net });
  const worst = { remoteError: 0, frameJump: 0, ownJump: 0 };
  const last = new Map();
  h.run(seconds, (clients, now) => {
    if (now < warm * 1000) return;
    for (const c of clients) {
      if (!c.flight.ready) continue;
      for (const e of c.flight.tracks.values()) {
        // How far the drawn aircraft is from where the server had it at the drawn moment.
        const truth = h.truthAt(e.slot, e.track.renderTick);
        if (truth) worst.remoteError = Math.max(worst.remoteError, truth.distanceTo(e.track.position));
        // Movement between frames beyond what its speed explains (a jump or stutter).
        const key = `${c.id}:${e.slot}`;
        const prev = last.get(key);
        const speed = e.track.latest.velocity.length();
        if (prev) worst.frameJump = Math.max(worst.frameJump, Math.abs(prev.distanceTo(e.track.position) - speed / 60));
        last.set(key, e.track.position.clone());
      }
      // The player's own aircraft as drawn: its true pose plus the fading correction.
      const own = c.sim.state.position.clone();
      c.flight.smoothOwn(own, new Quaternion());
      const ownKey = `${c.id}:own`;
      const prevOwn = last.get(ownKey);
      if (prevOwn) worst.ownJump = Math.max(worst.ownJump, Math.abs(prevOwn.distanceTo(own) - c.sim.state.velocity.length() / 60));
      last.set(ownKey, own);
    }
  });
  const minutes = seconds / 60;
  const corrections = h.clients.map((c) => c.flight.prediction.corrections / minutes);
  const largest = Math.max(...h.clients.map((c) => c.flight.prediction.largest));
  return { h, worst, corrections, largest };
}

describe('flying together: a headless match through the network simulator', () => {
  it('on a perfect connection: hardly any corrections, others drawn on the server\'s path', () => {
    const { worst, corrections, largest, h } = measure({ ping: 0, jitter: 0, loss: 0 }, 20);
    for (const c of h.clients) expect(c.flight.ready).toBe(true);
    expect(Math.max(...corrections)).toBeLessThan(10); // only while the clock settles at the start
    expect(largest).toBeLessThan(0.05);
    expect(worst.remoteError).toBeLessThan(0.5);
    expect(worst.frameJump).toBeLessThan(0.3);
  });

  it('at 150 ms ping, 20 ms jitter and 2% loss: smooth others, own aircraft corrected only invisibly', () => {
    const { worst, corrections, largest } = measure({ ping: 150, jitter: 20, loss: 2 }, 60);
    console.info(`[netFlight] 150 ms / 20 ms / 2%: corrections per minute ${corrections.map((c) => c.toFixed(0)).join(', ')} (largest ${(largest * 100).toFixed(1)} cm); worst drawn error ${worst.remoteError.toFixed(2)} m; worst frame jump ${worst.frameJump.toFixed(2)} m (others), ${worst.ownJump.toFixed(2)} m (own)`);
    // A lost message makes the server repeat an old control for a moment; the corrections that
    // follow are tiny (centimetres) and faded, so they cannot be seen.
    expect(largest).toBeLessThan(0.5);
    expect(worst.remoteError).toBeLessThan(5);
    expect(worst.frameJump).toBeLessThan(1);
    expect(worst.ownJump).toBeLessThan(1);
  });

  it('keeps each browser\'s controls arriving just in time', () => {
    const { h } = measure({ ping: 150, jitter: 20, loss: 0 }, 20);
    for (const p of h.server.players.values()) {
      expect(p.lead).toBeGreaterThanOrEqual(0); // never late...
      expect(p.lead).toBeLessThan(15); // ...and not needlessly early (15 ticks = 125 ms)
    }
  });
});

describe('a hidden tab coming back', () => {
  it('shows the others where they really are at once, not drifting in from far away', () => {
    const h = createHarness({ players: PLAYERS.slice(0, 2), net: { ping: 20, jitter: 5, loss: 0 } });
    h.run(10);
    const b = h.clients[1];
    b.hidden = true; // switched to another tab: no drawing, no controls, but messages still arrive
    h.run(5);
    b.hidden = false;
    let frames = 0;
    let worst = 0;
    let worstOwn = 0;
    h.run(1, () => {
      if (++frames < 3) return; // the first couple of frames settle the drawing clock
      const e = b.flight.tracks.get(1);
      const truth = h.truthAt(1, e.track.renderTick);
      if (truth) worst = Math.max(worst, truth.distanceTo(e.track.position));
      const own = b.sim.state.position.clone();
      b.flight.smoothOwn(own, new Quaternion());
      worstOwn = Math.max(worstOwn, own.distanceTo(h.server.players.get('p2').sim.state.position));
    });
    expect(worst).toBeLessThan(2);
    expect(worstOwn).toBeLessThan(5); // the server is a few ticks ahead of what is drawn
    expect(b.flight.tracks.get(1).track.offset.length()).toBeLessThan(0.1);
  });
});

describe('the browser\'s clock', () => {
  it('starts ahead of the server by half the round trip and a margin', () => {
    const c = new NetClock();
    c.start(1000, 150);
    expect(c.tick).toBe(1000 + 18 + 4 + LEAD_TARGET_TICKS); // the round trip, a message's ticks, the margin
  });

  it('runs faster when controls arrive late, slower when too early, and jumps when far out', () => {
    const c = new NetClock();
    c.start(0, 0);
    for (let i = 0; i < 10; i++) c.onLead(-3);
    expect(c.timeScale).toBe(1 + CLOCK_RATE);
    for (let i = 0; i < 20; i++) c.onLead(9);
    expect(c.timeScale).toBe(1 - CLOCK_RATE);
    for (let i = 0; i < 20; i++) c.onLead(LEAD_TARGET_TICKS);
    expect(c.timeScale).toBe(1);
    expect(c.onLead(-40)).toBe(0); // one late reading (a lost packet) does not move the clock
    let jump = 0;
    for (let i = 0; i < 20 && !jump; i++) jump = c.onLead(-40);
    expect(jump).toBeGreaterThan(30); // a lasting one does, at once
  });
});

describe('own aircraft corrections', () => {
  it('a control the server used differently is corrected once, and the result equals the server\'s', () => {
    const server = new Simulation();
    server.start(AIRCRAFT.spad13, 1500);
    const mine = new Simulation();
    mine.start(AIRCRAFT.spad13, 1500);
    const p = new Prediction(mine);
    const a = quantiseInput({ pull: 0.2, roll: 0.3, yaw: 0, throttle: 1, trim: 0 });
    const b = quantiseInput({ ...a, roll: -0.3 });
    for (let t = 1; t <= 60; t++) {
      mine.step(1 / 120, a);
      p.record(t, a);
      server.step(1 / 120, t === 20 ? b : a); // at tick 20 the server had another control
    }
    // The server's state for tick 40 arrives; ours is at 60.
    const s40 = new Simulation();
    s40.start(AIRCRAFT.spad13, 1500);
    for (let t = 1; t <= 40; t++) s40.step(1 / 120, t === 20 ? b : a);
    expect(p.onServerState(40, captureState(s40), 60)).toBe(true);
    expect(p.corrections).toBe(1);
    expect(Array.from(captureState(mine))).toEqual(Array.from(captureState(server)));
    // What is drawn starts where it was and fades to the truth.
    const shown = mine.state.position.clone();
    p.shown(shown, new Quaternion());
    expect(shown.distanceTo(mine.state.position)).toBeCloseTo(p.lastError, 6);
    for (let i = 0; i < 9; i++) p.fade(1 / 60);
    const later = mine.state.position.clone();
    p.shown(later, new Quaternion());
    expect(later.distanceTo(mine.state.position)).toBeLessThan(0.1 * p.lastError);
    // Agreeing states change nothing.
    expect(p.onServerState(60, captureState(server), 60)).toBe(false);
  });
});

describe('other aircraft', () => {
  const sample = (tick, x, spawn = 1) => toSample(tick, {
    spawn, crashed: false, down: false, position: [x, 1000, 0], quaternion: [0, 0, 0, 1], velocity: [60, 0, 0], rates: [0, 0, 0],
    surfaces: { pull: 0, roll: 0, yaw: 0, throttle: 1 }, rpm: 1200, damage: {},
  });

  it('carry on for at most 0.5 s past the newest snapshot, then wait', () => {
    const t = new RemoteTrack();
    t.push(sample(0, 0));
    t.push(sample(4, 2));
    expect(t.poseAt(4 + 15).position.x).toBeCloseTo(2 + 60 * (15 / TICK_HZ), 6);
    expect(t.poseAt(4 + 600).position.x).toBeCloseTo(2 + 60 * 0.5, 6);
  });

  it('a late snapshot after carrying on is faded in, not jumped; a respawn moves at once', () => {
    const t = new RemoteTrack();
    t.push(sample(0, 0));
    t.push(sample(4, 2));
    t.update(20, 1 / 60); // drawn ahead of the newest snapshot
    const before = t.position.clone();
    t.push(sample(8, 3.5)); // it had actually slowed a little
    t.update(20, 0);
    expect(t.position.distanceTo(before)).toBeLessThan(1e-6); // no jump at the moment it arrives
    t.push(sample(12, 5000, 2)); // respawned elsewhere
    t.update(12, 1 / 60);
    expect(t.position.x).toBeCloseTo(5000, 3);
    expect(new Vector3().copy(t.offset).length()).toBe(0);
  });
});
