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
import { destroyedReason } from '../physics/damage.js';
import { quantiseInput, captureState, compactOf, encodeSnapshot, gunsOf } from './binary.js';
import { spawnPoint, spawnAircraft } from './spawn.js';
import { MatchCombat } from './matchCombat.js';
import { controlsFor } from './pilotRules.js';
import { TICK_HZ, TICK_MS, SNAPSHOT_EVERY, MAX_TICKS_PER_CALLBACK, INPUT_AHEAD_MAX, HANDS_OFF_TICKS } from './netConfig.js';

const DT = 1 / TICK_HZ;
const aircraftById = (id) => AIRCRAFT_LIST.find((a) => a.id === id) ?? AIRCRAFT_LIST[0];

export class MatchSim {
  // settings: the host's match settings; world: createWorld(); solidAt(x, y, z): trees and
  // buildings (WorldSolids.hit) or null; now: ms, when the match starts; combat: options for
  // MatchCombat (tests: rng, maxRewind).
  constructor({ settings, world, solidAt = null, now = 0, combat = {} }) {
    this.settings = settings;
    this.world = world;
    this.solidAt = solidAt;
    this.startMs = now;
    this.tick = 0; // ticks flown so far: the state everyone is at
    this.players = new Map(); // player id -> pilot
    this.tallies = new Map(); // player id -> kills, deaths, shots, hits (kept if they leave and come back)
    this.combat = new MatchCombat({ settings, solidAt, ...combat });
  }

  // A player takes part (at the start, or joining or rejoining mid-match): spawns at once.
  // p: { id, slot, name, team, aircraft (an id) }.
  addPlayer(p) {
    if (this.players.has(p.id)) return;
    const sim = new Simulation();
    sim.solidAt = this.solidAt;
    const pilot = { ...p, ac: aircraftById(p.aircraft), sim, inputs: new Map(), last: null, view: 0, heard: 0, spawn: 0, respawnAt: null, lead: 0 };
    this.players.set(p.id, pilot);
    this.combat.addPilot(pilot, this.tallies.get(p.id));
    this.tallies.set(p.id, pilot.tally);
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
    this.combat.armed(p);
  }

  // Controls from a player's browser (inputs.decodeInputs's result).
  receiveInputs(id, msg) {
    const p = this.players.get(id);
    if (!p || !msg) return;
    p.lead = msg.firstTick - this.tick - 1; // how many ticks before it is needed the first one came
    msg.inputs.forEach((input, k) => {
      const tick = msg.firstTick + k;
      if (tick > this.tick && tick <= this.tick + INPUT_AHEAD_MAX) p.inputs.set(tick, { input: quantiseInput(input), view: msg.viewTick });
    });
  }

  // Fly the ticks due by `now` (ms). Returns { snapshots: [{ id, buffer }], notices: [{ to, except?,
  // text }], fx: [[kind, x, y, z, victimSlot]] (impacts), score (when it changed, else null) }.
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
    const c = this.combat;
    // The score: at once after a kill (or a player joining); rounds and hits at most once a second.
    const scoreDue = c.scoreChanged || (c.talliesChanged && this.tick - (this.scoreTick ?? -Infinity) >= TICK_HZ);
    const score = scoreDue ? c.score([...this.players.values()]) : null;
    if (scoreDue) {
      c.scoreChanged = false;
      c.talliesChanged = false;
      this.scoreTick = this.tick;
    }
    return { snapshots, notices: c.notices.splice(0), fx: c.fx.splice(0), score };
  }

  // One tick for everyone.
  step() {
    this.tick += 1;
    const t = this.tick;
    const pilots = [...this.players.values()];
    const combat = this.combat;
    for (const p of pilots) {
      const got = p.inputs.get(t);
      let input;
      if (got) {
        input = got.input;
        p.view = got.view;
        p.heard = t;
      } else if (t - p.heard > HANDS_OFF_TICKS) input = { ...p.last, pull: 0, roll: 0, yaw: 0, fire: false, clearJam: false };
      else input = { ...p.last, clearJam: false };
      p.inputs.delete(t);
      p.last = input;
      if (p.down && t >= p.respawnAt) this.spawn(p); // back in the air 10 s after going down
      const sim = p.sim;
      if (sim.crashed) {
        combat.crashed(p, t, sim.crashReason); // counted once
        continue;
      }
      const hands = controlsFor(sim, input); // a shot-down aircraft falls
      sim.step(DT, hands);
      for (const text of sim.damage.events.splice(0)) combat.notices.push({ to: p.id, text }); // "Out of fuel", "Right wing failed"
      if (!p.down && !sim.crashed && destroyedReason(sim.damage)) combat.goDown(p, t, destroyedReason(sim.damage)); // broke up on its own
      if (!sim.crashed) combat.afterStep(p, t, hands, p.view);
    }
    combat.moveBullets(t, pilots);
    for (const p of pilots) for (const text of p.sim.damage.events.splice(0)) combat.notices.push({ to: p.id, text }); // from hits
  }

  // A snapshot for each player: their own aircraft in full, the others compactly.
  snapshots() {
    const all = [...this.players.values()];
    const compact = all.map((p) => {
      const c = compactOf(p.slot, p.spawn, p.sim, p.down, p.shotsSince);
      p.shotsSince = 0;
      return c;
    });
    return all.map((p, i) => ({
      id: p.id,
      buffer: encodeSnapshot({
        tick: this.tick,
        lead: p.lead,
        you: { slot: p.slot, spawn: p.spawn, state: captureState(p.sim), guns: gunsOf(p.guns) },
        others: compact.filter((_, k) => k !== i),
      }),
    }));
  }
}
