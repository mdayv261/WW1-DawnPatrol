// What an AI pilot knows about the other aircraft. A pilot does not see the world as it
// is this instant: he sees what the eye and brain took in a moment ago. So each other
// aircraft's position and velocity are recorded a few times a second, and the brain is
// given the record from one reaction time ago (the skill level's reaction time), and
// only for aircraft within its sight range. Its own aircraft it reads directly (its
// instruments and feel).

import { Vector3 } from 'three';

const SAMPLE_INTERVAL = 1 / 30; // s between records

export class Observer {
  constructor(skill) {
    this.skill = skill;
    this.records = new Map(); // aircraft id -> [{ t, position, velocity, quaternion }] oldest first
    this.nextSample = 0;
  }

  // Record what every other aircraft is doing now. others: [{ id, state: { position, velocity, quaternion } }].
  record(time, others) {
    if (time < this.nextSample) return;
    this.nextSample = time + SAMPLE_INTERVAL;
    const keep = this.skill.reactionTime + 3 * SAMPLE_INTERVAL;
    for (const o of others) {
      let list = this.records.get(o.id);
      if (!list) this.records.set(o.id, (list = []));
      list.push({ t: time, position: o.state.position.clone(), velocity: o.state.velocity.clone(), quaternion: o.state.quaternion.clone() });
      while (list.length > 2 && list[1].t < time - keep) list.shift();
    }
  }

  // What the pilot knows of one aircraft at `time`: the latest record at least a reaction
  // time old (or the oldest there is, early in a fight). null if nothing is known.
  view(id, time) {
    const list = this.records.get(id);
    if (!list || !list.length) return null;
    const cutoff = time - this.skill.reactionTime;
    let found = list[0];
    for (const r of list) {
      if (r.t <= cutoff) found = r;
      else break;
    }
    return found;
  }

  // How one aircraft's velocity was changing at its latest known record: from that record and one
  // about `span` seconds older (its turn, as a pilot judges it). Zero if there is not enough history.
  acceleration(id, seen, span = 0.25, out = new Vector3()) {
    out.set(0, 0, 0);
    const list = this.records.get(id);
    if (!list) return out;
    let older = null;
    for (const r of list) if (r.t <= seen.t - span) older = r;
    if (!older) return out;
    return out.copy(seen.velocity).sub(older.velocity).divideScalar(seen.t - older.t);
  }

  forget(id) {
    this.records.delete(id);
  }
}

const _los = new Vector3();
const _nose = new Vector3();
const _enemyNose = new Vector3();
const _rel = new Vector3();

// The geometry of one aircraft as seen from another: where it is, how fast it is closing,
// and who is pointing at whom. self: { position, velocity, quaternion }; seen: a record.
export function geometry(self, seen) {
  _los.copy(seen.position).sub(self.position);
  const range = _los.length();
  _los.divideScalar(Math.max(range, 1e-6));
  _nose.set(1, 0, 0).applyQuaternion(self.quaternion);
  _enemyNose.set(1, 0, 0).applyQuaternion(seen.quaternion);
  _rel.copy(seen.velocity).sub(self.velocity);
  const clamp = (v) => Math.min(1, Math.max(-1, v));
  return {
    range,
    direction: _los.clone(), // from me to it
    closing: -_rel.dot(_los), // m/s, positive when the range is shrinking
    offNose: Math.acos(clamp(_nose.dot(_los))), // rad: how far it is from straight ahead of me (0 = dead ahead)
    offTail: Math.acos(clamp(-_nose.dot(_los))), // rad: how far it is from straight behind me (0 = on my tail)
    pointingAtMe: Math.acos(clamp(-_enemyNose.dot(_los))), // rad: how far its nose is from pointing at me (0 = aimed at me)
    behindIt: Math.acos(clamp(_enemyNose.dot(_los))), // rad: how far I am from its tail (0 = I am dead astern of it)
  };
}

