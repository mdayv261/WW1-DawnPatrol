// A second of one aircraft's poses on the server, tick by tick, for lag compensation: a round is
// tested against a target where the shooter saw it, which was a few hundred milliseconds ago.
// Poses are kept in a ring of preallocated objects, so looking one up makes no garbage.

import { Quaternion, Vector3 } from 'three';
import { POSE_HISTORY_TICKS } from './netConfig.js';

export class PoseHistory {
  constructor(size = POSE_HISTORY_TICKS) {
    this.size = size;
    this.ticks = new Array(size).fill(-1);
    this.poses = Array.from({ length: size }, () => ({ position: new Vector3(), quaternion: new Quaternion() }));
    this.newest = -1;
    this.oldest = -1;
  }

  // The pose after tick `tick`.
  record(tick, state) {
    const k = tick % this.size;
    this.ticks[k] = tick;
    this.poses[k].position.copy(state.position);
    this.poses[k].quaternion.copy(state.quaternion);
    this.newest = tick;
    this.oldest = this.oldest < 0 ? tick : Math.max(this.oldest, tick - this.size + 1);
  }

  // The pose at `tick`: the nearest kept one if that exact tick is not here (before the oldest,
  // e.g. just after a respawn: the oldest; after the newest: the newest). null if nothing is kept.
  at(tick) {
    if (this.newest < 0) return null;
    const t = Math.max(this.oldest, Math.min(this.newest, tick));
    for (let back = 0; back < this.size; back++) {
      const k = (t - back) % this.size;
      if (k >= 0 && this.ticks[k] === t - back) return this.poses[k];
    }
    return this.poses[this.newest % this.size];
  }

  // Forget everything (a respawn: the old poses are somewhere else entirely).
  clear() {
    this.ticks.fill(-1);
    this.newest = -1;
    this.oldest = -1;
  }
}
