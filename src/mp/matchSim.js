// A match on the room server: it flies every player's aircraft with the same Simulation (the
// validated flight model, unchanged) at 120 steps a second, from the controls each browser
// sends, and every 4th step makes each player a snapshot. No sockets and no timers of its own:
// the room calls advanceTo(now) from its timer, so the whole match can run in a test.
//
// Controls: a browser sends each tick's controls ahead of time. The control for tick T is used
// for the step that makes tick T. Late controls (for a tick already flown) and controls more
// than a second ahead are dropped; a tick with none repeats the last one received (after half a
// second with none, a hidden tab or a stalled line, with stick and rudder centred). The server
// tells each player how early their controls arrive ("lead") so the browser can keep them just
// in time.

import { Simulation } from '../core/simulation.js';
import { AIRCRAFT_LIST } from '../aircraft/index.js';
import { quantiseInput, captureState, compactOf, encodeSnapshot } from './binary.js';
import { spawnPoint, spawnAircraft } from './spawn.js';
import { TICK_HZ, TICK_MS, SNAPSHOT_EVERY, MAX_TICKS_PER_CALLBACK, INPUT_AHEAD_MAX, RESPAWN_S, HANDS_OFF_TICKS } from './netConfig.js';

const DT = 1 / TICK_HZ;
const aircraftById = (id) => AIRCRAFT_LIST.find((a) => a.id === id) ?? AIRCRAFT_LIST[0];

export class MatchSim {
  // settings: the host's match settings; world: createWorld(); solidAt(x, y, z): trees and
  // buildings (WorldSolids.hit) or null; now: ms, when the match starts.
  constructor({ settings, world, solidAt = null, now = 0 }) {
    this.settings = settings;
    this.world = world;
    this.solidAt = solidAt;
    this.startMs = now;
    this.tick = 0; // ticks flown so far: the state everyone is at
    this.players = new Map(); // player id -> pilot
    this.events = [];
  }

  // A player takes part (at the start, or joining or rejoining mid-match): spawns at once.
  // p: { id, slot, name, team, aircraft (an id) }.
  addPlayer(p) {
    if (this.players.has(p.id)) return;
    const sim = new Simulation();
    sim.solidAt = this.solidAt;
    const pilot = { ...p, ac: aircraftById(p.aircraft), sim, inputs: new Map(), last: null, heard: 0, spawn: 0, respawnAt: null, lead: 0, reported: false };
    this.players.set(p.id, pilot);
    this.spawn(pilot);
  }

  removePlayer(id) {
    this.players.delete(id);
  }

  // Into the air (or onto the airfield) at the team's start area.
  spawn(p) {
    const team = [...this.players.values()].filter((q) => q.team === p.team).sort((a, b) => a.slot - b.slot);
    const point = spawnPoint(this.world, this.settings, p.team, team.indexOf(p));
    p.last = quantiseInput(spawnAircraft(p.sim, p.ac, point));
    p.sim.structuralDamage = this.settings.structuralDamage;
    p.spawn += 1;
    p.heard = this.tick; // a fresh aircraft holds its starting controls for the first half second
    p.respawnAt = null;
    p.reported = false;
  }

  // Controls from a player's browser (inputs.decodeInputs's result).
  receiveInputs(id, msg) {
    const p = this.players.get(id);
    if (!p || !msg) return;
    p.lead = msg.firstTick - this.tick - 1; // how many ticks before it is needed the first one came
    msg.inputs.forEach((input, k) => {
      const tick = msg.firstTick + k;
      if (tick > this.tick && tick <= this.tick + INPUT_AHEAD_MAX) p.inputs.set(tick, quantiseInput(input));
    });
  }

  // Fly the ticks due by `now` (ms). Returns { snapshots: [{ id, buffer }], events: [...] }:
  // events are { kind: 'crash', id, name, reason } and { kind: 'spawn', id, name }.
  advanceTo(now) {
    const due = Math.floor((now - this.startMs) / TICK_MS);
    let n = due - this.tick;
    if (n > MAX_TICKS_PER_CALLBACK) {
      // The server stalled: drop the backlog rather than race to catch up.
      this.startMs += (n - MAX_TICKS_PER_CALLBACK) * TICK_MS;
      n = MAX_TICKS_PER_CALLBACK;
    }
    const snapshots = [];
    for (let k = 0; k < n; k++) {
      this.step();
      if (this.tick % SNAPSHOT_EVERY === 0) snapshots.push(...this.snapshots());
    }
    return { snapshots, events: this.events.splice(0) };
  }

  // One tick for everyone.
  step() {
    this.tick += 1;
    const t = this.tick;
    for (const p of this.players.values()) {
      let input = p.inputs.get(t);
      if (input) p.heard = t;
      else if (t - p.heard > HANDS_OFF_TICKS) input = { ...p.last, pull: 0, roll: 0, yaw: 0, fire: false };
      else input = p.last;
      p.inputs.delete(t);
      p.last = input;
      if (p.sim.crashed) {
        if (!p.reported) {
          p.reported = true;
          p.respawnAt = t + RESPAWN_S * TICK_HZ;
          this.events.push({ kind: 'crash', id: p.id, name: p.name, reason: p.sim.crashReason });
        } else if (t >= p.respawnAt) {
          this.spawn(p);
          this.events.push({ kind: 'spawn', id: p.id, name: p.name });
        }
        continue;
      }
      p.sim.step(DT, input);
    }
  }

  // A snapshot for each player: their own aircraft in full, the others compactly.
  snapshots() {
    const all = [...this.players.values()];
    const compact = all.map((p) => compactOf(p.slot, p.spawn, p.sim));
    return all.map((p, i) => ({
      id: p.id,
      buffer: encodeSnapshot({
        tick: this.tick,
        lead: p.lead,
        you: { slot: p.slot, spawn: p.spawn, state: captureState(p.sim) },
        others: compact.filter((_, k) => k !== i),
      }),
    }));
  }
}
