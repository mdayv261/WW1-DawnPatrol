// One match as this browser sees it: your own aircraft flown at once and kept true to the
// server (prediction.js), the tick clock (clock.js), and the other players' aircraft drawn
// smoothly (interpolation.js). The game's session (src/game/session.js) hands it each physics
// step and asks it where to draw things; it sends your controls 30 times a second.

import { NetClock } from './clock.js';
import { Prediction } from './prediction.js';
import { RemoteTrack, RenderClock, toSample } from './interpolation.js';
import { NetCombat } from './netCombat.js';
import { controlsFor } from '../mp/pilotRules.js';
import { destroyedReason } from '../physics/damage.js';
import { quantiseInput, encodeInputs, decodeSnapshot, restoreState, damageFromSummary } from '../mp/binary.js';
import { INPUTS_PER_MESSAGE, INTERP_DELAY_MS, INTERP_DELAY_MAX_MS, TICK_HZ, LEAD_TARGET_TICKS } from '../mp/netConfig.js';

const DT = 1 / TICK_HZ;

// The controls a freshly spawned aircraft starts with (as the server repeats them until yours
// arrive): hands off, its own throttle and trim.
const startInputOf = (sim) => quantiseInput({ pull: 0, roll: 0, yaw: 0, throttle: sim.surfaces.throttle, trim: sim.surfaces.trim });

export class NetFlight {
  // send(ArrayBuffer); settings: the match settings; lookup(slot): { name, team, aircraft } or
  // null; solidAt: the shared trees and buildings; ping() / jitter(): ms; now(): ms;
  // onReady(startInput) and onRespawn(startInput): your aircraft has (re)appeared;
  // notice(text): the message line ("You are hit!").
  constructor({ send, settings, lookup, solidAt = null, ping = () => 0, jitter = () => 0, now = () => performance.now(), onReady = () => {}, onRespawn = () => {}, notice = () => {} }) {
    Object.assign(this, { send, settings, lookup, solidAt, ping, jitter, now, onReady, onRespawn, notice });
    this.fight = null; // NetCombat: the guns, tracers and sparks as shown here
    this.mySlot = 0;
    this.changeDrumNext = false; // a drum change to send with the next controls
    this.clearJamNext = false;
    this.clock = new NetClock();
    this.render = new RenderClock({ delayMs: INTERP_DELAY_MS, maxDelayMs: INTERP_DELAY_MAX_MS });
    this.tracks = new Map(); // slot -> { track, view }
    this.sim = null;
    this.prediction = null;
    this.ready = false;
    this.spawn = null;
    this.pending = []; // controls not yet sent
    this.pendingFrom = 0; // the tick of the first of them
    this.serverTick = 0;
    this.lastFrame = -Infinity; // ms, when this window last drew a frame
    this.stats = { inBytes: 0, outBytes: 0, since: 0, inRate: 0, outRate: 0, corrections: 0, perMinute: 0, lastCount: 0 };
  }

  get timeScale() {
    return this.clock.timeScale;
  }

  // The player's own Simulation (the session's), set up with their aircraft; the first snapshot
  // then puts it where the server has it. combat: the session's Combat (for the guns and effects).
  attach(sim, aircraft, combat = null) {
    if (aircraft) sim.start(aircraft);
    this.sim = sim;
    sim.solidAt = this.solidAt;
    sim.structuralDamage = this.settings.structuralDamage;
    this.prediction = new Prediction(sim);
    if (combat) this.fight = new NetCombat({ combat, sim, solidAt: this.solidAt, notice: this.notice, now: this.now });
  }

  // Can your guns fire (not crashed, not shot down)?
  get canFire() {
    return Boolean(this.sim) && !this.sim.crashed && !destroyedReason(this.sim.damage);
  }

  // B: the next controls ask the server to clear the jam.
  // The drum change goes to the server with the next controls, as a clear-jam does.
  changeDrum() {
    this.changeDrumNext = true;
  }

  clearJam() {
    this.clearJamNext = true;
  }

  // The others' rounds as drawn here (for the tracer drawing).
  get tracers() {
    return this.fight ? this.fight.tracers : [];
  }

  // Impacts the server reports (sparks; the thud if it was you).
  onFx(list) {
    this.fight?.impacts(list, this.mySlot);
  }

  // A snapshot from the server.
  receive(buffer) {
    const snap = decodeSnapshot(buffer);
    if (!snap || !this.sim) return;
    const now = this.now();
    this.stats.inBytes += buffer.byteLength;
    this.serverTick = snap.tick;
    this.render.arrived(snap.tick, now);
    const drawing = now - this.lastFrame < 250; // a hidden tab draws nothing: nothing to fade then
    const seen = new Set();
    for (const c of snap.others) {
      seen.add(c.slot);
      let entry = this.tracks.get(c.slot);
      if (!entry) this.tracks.set(c.slot, (entry = { slot: c.slot, track: new RemoteTrack(), view: null }));
      entry.track.push(toSample(snap.tick, c), drawing);
      if (c.shots && this.fight) {
        const view = this.viewOf(entry);
        if (view) this.fight.shots(view, c.shots);
      }
    }
    for (const slot of this.tracks.keys()) if (!seen.has(slot)) this.tracks.delete(slot); // gone from the match
    if (snap.you) this.ownState(snap);
  }

  ownState(snap) {
    const { tick } = snap;
    const { state, spawn } = snap.you;
    this.mySlot = snap.you.slot;
    this.fight?.syncGuns(snap.you.guns);
    if (!this.ready) {
      // The first sight of our aircraft: take the server's state and run on to our own clock.
      this.clock.start(tick, this.ping());
      this.spawn = spawn;
      restoreState(this.sim, state);
      this.prediction.history.set(tick, { input: startInputOf(this.sim), state: Float64Array.from(state) });
      this.prediction.replay(tick, this.clock.tick);
      this.pendingFrom = this.clock.tick + 1;
      this.ready = true;
      this.onReady(startInputOf(this.sim));
      return;
    }
    const jump = this.clock.onLead(snap.lead, this.jitter());
    if (jump) this.jumpClock(jump);
    const respawned = spawn !== this.spawn;
    this.spawn = spawn;
    if (tick > this.clock.tick) this.jumpClock(tick + LEAD_TARGET_TICKS - this.clock.tick); // we fell behind the server
    if (respawned) {
      // Replay what was already sent onto the new aircraft, then give the pilot fresh controls.
      this.prediction.history.set(tick, { input: startInputOf({ surfaces: { throttle: state[16], trim: state[17] } }), state: Float64Array.from(state) });
      this.prediction.onServerState(tick, state, this.clock.tick, true);
      this.onRespawn(startInputOf(this.sim));
      return;
    }
    this.prediction.onServerState(tick, state, this.clock.tick, Boolean(jump));
  }

  // Move our clock by `ticks` (rare: the connection changed a lot). Unsent controls go first.
  jumpClock(ticks) {
    this.flush();
    this.clock.tick += ticks;
    this.pendingFrom = this.clock.tick + 1;
  }

  // One physics step of our own aircraft with the pilot's controls (after any auto-rudder).
  step(dt, hands) {
    if (!this.ready) return;
    // A shot-down aircraft falls (the same rule as the server's); B asks for the jam to be cleared.
    const input = quantiseInput(controlsFor(this.sim, { ...hands, clearJam: this.clearJamNext, changeDrum: this.changeDrumNext }));
    this.clearJamNext = false;
    this.changeDrumNext = false;
    const t = this.clock.tick + 1;
    this.sim.step(DT, input);
    this.prediction.record(t, input);
    this.clock.tick = t;
    if (!this.pending.length) this.pendingFrom = t;
    this.pending.push(input);
    if (this.pending.length >= INPUTS_PER_MESSAGE) this.flush();
  }

  flush() {
    if (!this.pending.length) return;
    const buffer = encodeInputs(this.pendingFrom, Math.max(0, Math.round(this.render.tickAt())), this.pending);
    this.stats.outBytes += buffer.byteLength;
    this.send(buffer);
    this.pending = [];
  }

  // Once a frame: fade corrections, move the other aircraft to where they are drawn now.
  frame(realDt) {
    if (this.prediction) this.prediction.fade(realDt);
    const now = this.now();
    this.lastFrame = now;
    this.render.advance(realDt, now);
    const tick = this.render.tickAt();
    for (const e of this.tracks.values()) e.track.update(tick, realDt);
    if (this.fight) this.fight.frame(realDt, this.views());
    const s = this.stats;
    if (now - s.since >= 1000) {
      const seconds = (now - s.since) / 1000 || 1;
      s.inRate = s.inBytes / seconds;
      s.outRate = s.outBytes / seconds;
      const c = this.prediction?.corrections ?? 0;
      s.perMinute = ((c - s.lastCount) / seconds) * 60;
      s.lastCount = c;
      s.inBytes = 0;
      s.outBytes = 0;
      s.since = now;
    }
  }

  // Our aircraft as drawn: its pose plus the fading correction.
  smoothOwn(position, quaternion) {
    this.prediction?.shown(position, quaternion);
  }

  // The other players' aircraft in the shape the drawing code (TargetViews) expects.
  views() {
    const out = [];
    for (const e of this.tracks.values()) {
      const view = this.viewOf(e);
      if (view) out.push(view);
    }
    return out;
  }

  // One other aircraft's view, brought up to date (null until its player is known).
  viewOf(e) {
    const who = this.lookup(e.slot);
    const s = e.track.latest;
    if (!who || !s) return null;
    if (!e.view || e.view.aircraft !== who.aircraft) {
      const track = e.track;
      e.view = {
        id: `mp${e.slot}`, aircraft: who.aircraft, name: who.name, team: who.team,
        sim: { interpolate: () => ({ position: track.position, quaternion: track.quaternion }), surfaces: { trim: 0 }, damage: damageFromSummary(s.damage), diag: { rpm: 0 } },
      };
    }
    const v = e.view;
    Object.assign(v.sim.surfaces, s.surfaces);
    damageFromSummary(s.damage, v.sim.damage);
    v.sim.diag.rpm = s.rpm;
    v.crashed = s.crashed;
    v.down = s.down;
    v.position = e.track.position;
    v.quaternion = e.track.quaternion;
    v.velocity = s.velocity;
    return v;
  }

  // Numbers for the F3 panel.
  debugLines() {
    const s = this.stats;
    const ping = this.ping();
    return [
      `net  ping ${ping === null ? '-' : Math.round(ping)} ms  jitter ${Math.round(this.jitter() ?? 0)} ms  lead ${this.clock.lead.toFixed(1)} (target ${this.clock.target})  clock x${this.clock.timeScale.toFixed(2)}`,
      `net  corrections ${this.prediction?.corrections ?? 0} (${Math.round(s.perMinute)}/min, last ${(this.prediction?.lastError ?? 0).toFixed(2)} m)  others drawn ${Math.round(this.render.delayMs)} ms behind`,
      `net  tick ${this.clock.tick} (server ${this.serverTick})  down ${(s.inRate / 1024).toFixed(1)} KB/s  up ${(s.outRate / 1024).toFixed(1)} KB/s`,
    ];
  }
}

export { startInputOf };
