// What players would see in a headless match on a given connection: used by the network tests
// and by `npm run mp:netreport`. Three (or more) scripted pilots weave from bank to bank while
// holding their height, through the network simulator; after a warm-up, every frame of every
// window is measured:
//   remoteError  how far a drawn other aircraft is from where the server had it at that moment (m)
//   frameJump    movement of a drawn other aircraft between frames beyond what its speed explains (m)
//   ownJump      the same for your own aircraft as drawn (m; includes the fixed-step rhythm)
//   largest      the largest correction of your own aircraft (m)
//   corrections  corrections of your own aircraft per minute (mostly tiny; a lost packet causes a few)
//   lead         the smoothed lead the server reports (ticks): how early controls arrive

import { Quaternion } from 'three';
import { createHarness } from './netHarness.js';
import { attitude } from '../../src/dev/flightScenarios.js';

const clamp = (v) => Math.max(-1, Math.min(1, v));

// A pilot weaving from one 45-degree bank to the other, holding 2,000 m (a simple autopilot).
export const weave = (phase, fire = null) => (t, sim) => {
  const a = attitude(sim.state);
  const bank = 0.8 * Math.sin(t / 4 + phase);
  return {
    roll: clamp(2.5 * (bank - a.bank) - 0.8 * sim.state.angularVelocity.x),
    pull: clamp(0.15 * Math.abs(a.bank) + 0.004 * (2000 - sim.state.position.y) - 0.05 * sim.state.velocity.y),
    yaw: 0, throttle: 1, trim: 0,
    fire: fire ? fire(t) : false,
  };
};

export const THREE_PLAYERS = [
  { id: 'p1', slot: 1, name: 'Max', team: 'central', aircraft: 'dr1', pilot: weave(0) },
  { id: 'p2', slot: 2, name: 'Albert', team: 'allied', aircraft: 'camel', pilot: weave(1.5) },
  { id: 'p3', slot: 3, name: 'Werner', team: 'central', aircraft: 'albatros', pilot: weave(3) },
];

// Fly a match for `seconds` and measure it after `warm` seconds. Returns { h, worst, corrections,
// largest, lead }.
export function measure(net, { seconds = 40, warm = 3, players = THREE_PLAYERS, combat = null } = {}) {
  const h = createHarness({ players, net, combat });
  const worst = { remoteError: 0, frameJump: 0, ownJump: 0 };
  const last = new Map();
  h.run(seconds, (clients, now) => {
    if (now < warm * 1000) return;
    for (const c of clients) {
      if (!c.flight.ready) continue;
      for (const e of c.flight.tracks.values()) {
        const truth = h.truthAt(e.slot, e.track.renderTick, e.track.latest.spawn);
        if (truth) worst.remoteError = Math.max(worst.remoteError, truth.distanceTo(e.track.position));
        const key = `${c.id}:${e.slot}`;
        const prev = last.get(key);
        const speed = e.track.latest.velocity.length();
        if (prev && e.track.latest.spawn === prev.spawn) worst.frameJump = Math.max(worst.frameJump, Math.abs(prev.p.distanceTo(e.track.position) - speed / 60));
        last.set(key, { p: e.track.position.clone(), spawn: e.track.latest.spawn });
      }
      const own = c.sim.state.position.clone();
      c.flight.smoothOwn(own, new Quaternion());
      const ownKey = `${c.id}:own`;
      const prevOwn = last.get(ownKey);
      if (prevOwn && prevOwn.spawn === c.flight.spawn) worst.ownJump = Math.max(worst.ownJump, Math.abs(prevOwn.p.distanceTo(own) - c.sim.state.velocity.length() / 60));
      last.set(ownKey, { p: own, spawn: c.flight.spawn });
    }
  });
  const minutes = seconds / 60;
  return {
    h,
    worst,
    corrections: Math.max(...h.clients.map((c) => c.flight.prediction.corrections / minutes)),
    largest: Math.max(...h.clients.map((c) => c.flight.prediction.largest)),
    lead: Math.min(...h.clients.map((c) => c.flight.clock.lead)),
  };
}
