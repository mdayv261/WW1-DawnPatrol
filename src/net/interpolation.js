// The other aircraft in a match, drawn smoothly from the snapshots the server sends 30 times a
// second. Each is drawn a little in the past (about 100 ms, more on a jittery line), between two
// snapshots already here: its path follows a curve that matches each snapshot's velocity, and
// its orientation is blended smoothly. If snapshots stop for a moment it carries on along its
// last motion for up to 0.5 s, then waits; when they come back, the difference is faded out
// rather than jumped. A respawn moves it at once.

import { Quaternion, Vector3 } from 'three';
import { TICK_HZ, EXTRAPOLATE_MAX_S, SMOOTH_S, SNAP_DISTANCE, CATCH_UP_SPEED } from '../mp/netConfig.js';

const KEEP_TICKS = 2 * TICK_HZ; // samples older than this behind the newest are dropped
const EXTRAPOLATE_TICKS = EXTRAPOLATE_MAX_S * TICK_HZ;
const _a = new Vector3();
const _b = new Vector3();
const _w = new Quaternion();
const _axis = new Vector3();
const _id = new Quaternion();

// A snapshot's compact aircraft as a sample: Vector3 / Quaternion for the maths.
export function toSample(tick, c) {
  return {
    tick, spawn: c.spawn, crashed: c.crashed, down: c.down,
    position: new Vector3(...c.position), quaternion: new Quaternion(...c.quaternion),
    velocity: new Vector3(...c.velocity), rates: new Vector3(...c.rates),
    surfaces: c.surfaces, rpm: c.rpm, damage: c.damage,
  };
}

// The pose `seconds` after sample s, carried on with its velocity and rotation rate.
function carryOn(s, seconds, position, quaternion) {
  position.copy(s.position).addScaledVector(s.velocity, seconds);
  quaternion.copy(s.quaternion);
  const rate = s.rates.length();
  if (rate > 1e-6) quaternion.multiply(_w.setFromAxisAngle(_axis.copy(s.rates).divideScalar(rate), rate * seconds)); // body-axis rates
}

export class RemoteTrack {
  constructor() {
    this.samples = [];
    this.offset = new Vector3(); // shown minus computed position, fading
    this.turn = new Quaternion();
    this.position = new Vector3(); // where it is drawn now
    this.quaternion = new Quaternion();
    this.latest = null;
    this.renderTick = 0;
  }

  // A new sample. A new spawn counter clears the old path (a respawn is never smoothed).
  // drawing: false when this window has not been drawing (a hidden tab): then nothing is faded,
  // the aircraft is simply shown where it is when drawing starts again.
  push(sample, drawing = true) {
    const respawned = this.latest && sample.spawn !== this.latest.spawn;
    if (this.latest && !respawned && sample.tick <= this.latest.tick) return; // old news
    const hadPose = drawing && this.samples.length > 0;
    const before = hadPose ? this.poseAt(this.renderTick, _a.clone(), new Quaternion()) : null;
    if (respawned) this.samples.length = 0;
    this.samples.push(sample);
    this.latest = sample;
    while (this.samples.length > 2 && this.samples[1].tick < sample.tick - KEEP_TICKS) this.samples.shift();
    if (before && !respawned) {
      // Whatever this sample changes about the pose being drawn right now is faded, not jumped.
      const after = this.poseAt(this.renderTick, _b.clone(), new Quaternion());
      const jump = before.position.clone().sub(after.position);
      this.offset.add(jump);
      this.turn.premultiply(before.quaternion.multiply(after.quaternion.invert()));
      if (this.offset.length() > SNAP_DISTANCE) { // too far to glide: show it where it is
        this.offset.set(0, 0, 0);
        this.turn.identity();
      }
    } else {
      this.offset.set(0, 0, 0);
      this.turn.identity();
    }
  }

  // The computed pose at `tick` (between samples, or carried on past the newest).
  poseAt(tick, position = new Vector3(), quaternion = new Quaternion()) {
    const s = this.samples;
    if (!s.length) return { position, quaternion };
    if (tick <= s[0].tick) {
      position.copy(s[0].position);
      quaternion.copy(s[0].quaternion);
      return { position, quaternion };
    }
    const last = s[s.length - 1];
    if (tick >= last.tick) {
      carryOn(last, Math.min(tick - last.tick, EXTRAPOLATE_TICKS) / TICK_HZ, position, quaternion);
      return { position, quaternion };
    }
    let i = s.length - 2;
    while (i > 0 && s[i].tick > tick) i--;
    const a = s[i];
    const b = s[i + 1];
    const span = (b.tick - a.tick) / TICK_HZ;
    const u = (tick - a.tick) / (b.tick - a.tick);
    // Cubic Hermite curve through both positions with both velocities.
    const u2 = u * u;
    const u3 = u2 * u;
    position.copy(a.position).multiplyScalar(2 * u3 - 3 * u2 + 1)
      .addScaledVector(a.velocity, (u3 - 2 * u2 + u) * span)
      .addScaledVector(b.position, -2 * u3 + 3 * u2)
      .addScaledVector(b.velocity, (u3 - u2) * span);
    quaternion.slerpQuaternions(a.quaternion, b.quaternion, u);
    return { position, quaternion };
  }

  // Once a frame: where to draw it at `tick` (fractional), fading what is left of a jump.
  update(tick, realDt) {
    this.renderTick = tick;
    const k = Math.exp(-realDt / SMOOTH_S);
    // Fade the gap, but never close it faster than CATCH_UP_SPEED (a big gap would lurch).
    const gap = this.offset.length();
    const keep = gap > 0 ? Math.max(k, 1 - (CATCH_UP_SPEED * realDt) / gap) : k;
    this.offset.multiplyScalar(keep);
    this.turn.slerp(_id, 1 - k);
    this.poseAt(tick, this.position, this.quaternion);
    this.position.add(this.offset);
    this.quaternion.premultiply(this.turn);
  }
}

// The time the other aircraft are drawn at, from when snapshots arrive: the server's tick as it
// arrives here (smoothed), less the delay that keeps a sample or two in hand. The drawing clock
// itself never jumps: it runs at most 10% fast or slow to follow that target, so a late packet
// or a change of delay can never make the other aircraft skip or slide back.
const DEV_CAP_MS = 60; // one very late packet (a lost one sent again) counts no more than this
const DRIFT = 0.1; // the drawing clock's largest speed-up or slow-down
const SNAP_TICKS = TICK_HZ; // further off than this (the start), it jumps

export class RenderClock {
  constructor({ delayMs, maxDelayMs }) {
    this.minDelay = delayMs;
    this.maxDelay = maxDelayMs;
    this.offset = null; // server tick minus local time in ticks
    this.jitter = 0; // ms, how much arrivals wander
    this.delayMs = delayMs;
    this.current = null; // the tick being drawn now
  }

  // A snapshot for `tick` arrived at local time `nowMs`.
  arrived(tick, nowMs) {
    const sample = tick - (nowMs / 1000) * TICK_HZ;
    if (this.offset === null) this.offset = sample;
    const devMs = Math.max(-DEV_CAP_MS, Math.min(DEV_CAP_MS, ((sample - this.offset) / TICK_HZ) * 1000));
    this.jitter += 0.05 * (Math.abs(devMs) - this.jitter);
    this.offset += 0.05 * (devMs / 1000) * TICK_HZ;
    this.delayMs = Math.min(this.maxDelay, Math.max(this.minDelay, 2.5 * this.jitter + 40));
  }

  // Where the drawing clock is heading at local time `nowMs`.
  target(nowMs) {
    return (nowMs / 1000) * TICK_HZ + this.offset - (this.delayMs / 1000) * TICK_HZ;
  }

  // Once a frame: move the drawing clock on by `realDt` seconds, steering toward the target.
  advance(realDt, nowMs) {
    if (this.offset === null) return;
    const goal = this.target(nowMs);
    if (this.current === null || Math.abs(goal - this.current) > SNAP_TICKS) {
      this.current = goal;
      return;
    }
    const rate = 1 + Math.max(-DRIFT, Math.min(DRIFT, (goal - this.current) / (0.5 * TICK_HZ)));
    this.current += realDt * TICK_HZ * rate;
  }

  // The (fractional) tick the other aircraft are drawn at.
  tickAt() {
    return this.current ?? 0;
  }
}
