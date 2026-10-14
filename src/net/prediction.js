// Your own aircraft in a match, flown at once in your browser ("prediction") and kept true to
// the server. Each tick the controls used and the state after the step are recorded. When the
// server's state for a tick arrives, it is compared with the record for that tick; if they
// differ (a control that arrived late, a hit, a tiny maths difference between browsers), the
// aircraft is put back to the server's state and the controls since then are replayed. What
// you see does not jump: the difference is faded out over about 0.15 s (unless it is a respawn).

import { Quaternion, Vector3 } from 'three';
import { captureState, restoreState, FULL_LENGTH } from '../mp/binary.js';
import { TICK_HZ, HISTORY_TICKS, CORRECT, SMOOTH_S, SNAP_DISTANCE } from '../mp/netConfig.js';

const DT = 1 / TICK_HZ;
const _q = new Quaternion();
const _id = new Quaternion();

// Do two captured states differ by more than the correction limits?
export function differs(a, b) {
  for (let k = 0; k < 3; k++) if (Math.abs(a[k] - b[k]) > CORRECT.position) return true;
  for (let k = 3; k < 6; k++) if (Math.abs(a[k] - b[k]) > CORRECT.velocity) return true;
  const dot = Math.abs(a[6] * b[6] + a[7] * b[7] + a[8] * b[8] + a[9] * b[9]);
  if (2 * Math.acos(Math.min(1, dot)) > CORRECT.angle) return true;
  for (let k = 10; k < 13; k++) if (Math.abs(a[k] - b[k]) > CORRECT.rate) return true;
  for (let k = 13; k < FULL_LENGTH; k++) {
    if (Number.isNaN(a[k]) !== Number.isNaN(b[k])) return true;
    if (!Number.isNaN(a[k]) && Math.abs(a[k] - b[k]) > CORRECT.other) return true;
  }
  return false;
}

export class Prediction {
  constructor(sim) {
    this.sim = sim;
    this.history = new Map(); // tick -> { input, state }
    this.offset = new Vector3(); // shown position minus true position, fading to nothing
    this.turn = new Quaternion(); // the same for the orientation
    this.corrections = 0; // count, for the F3 numbers
    this.lastError = 0; // m, the size of the last correction
    this.largest = 0; // m, the largest correction faded so far
  }

  // After stepping tick `tick` with `input`.
  record(tick, input) {
    this.history.set(tick, { input, state: captureState(this.sim) });
    this.history.delete(tick - HISTORY_TICKS);
  }

  // The server's state for `tick`; `now`: the last tick flown here. hard: a respawn or a
  // restart, so no comparing and no fading. Returns true if a correction was made.
  onServerState(tick, state, now, hard = false, crashReason = undefined) {
    const mine = this.history.get(tick);
    if (!hard && mine && !differs(mine.state, state)) return false;
    const before = this.sim.state.position.clone();
    const beforeQ = this.sim.state.quaternion.clone();
    restoreState(this.sim, state, crashReason);
    this.history.set(tick, { input: mine?.input ?? null, state: Float64Array.from(state) });
    this.replay(tick, now);
    const jump = before.distanceTo(this.sim.state.position);
    this.lastError = jump;
    if (hard || !mine || jump > SNAP_DISTANCE || this.offset.length() + jump > SNAP_DISTANCE) {
      this.offset.set(0, 0, 0);
      this.turn.identity();
    } else {
      this.offset.add(before.sub(this.sim.state.position));
      this.turn.premultiply(_q.copy(beforeQ).multiply(this.sim.state.quaternion.clone().invert()));
      this.corrections += 1;
      this.largest = Math.max(this.largest, jump);
    }
    return true;
  }

  // Fly again from `from` to `now` with the recorded controls (a tick never recorded repeats the
  // one before, as the server does).
  replay(from, now) {
    let input = this.history.get(from)?.input ?? null;
    for (let t = from + 1; t <= now; t++) {
      const h = this.history.get(t);
      input = h?.input ?? input;
      if (!input) break;
      this.sim.step(DT, input);
      this.history.set(t, { input, state: captureState(this.sim) });
    }
  }

  // Fade the shown difference (once a frame).
  fade(realDt) {
    const k = Math.exp(-realDt / SMOOTH_S);
    this.offset.multiplyScalar(k);
    this.turn.slerp(_id, 1 - k);
  }

  // Where to draw the aircraft: its true pose plus what is left of the difference.
  shown(position, quaternion) {
    position.add(this.offset);
    quaternion.premultiply(this.turn);
  }

  clear() {
    this.history.clear();
    this.offset.set(0, 0, 0);
    this.turn.identity();
  }
}
