import { describe, it, expect } from 'vitest';
import { Vector3, Quaternion } from 'three';
import { SKILLS } from '../src/aircraft/aiData.js';
import { Observer, geometry } from '../src/ai/perception.js';

// What the AI pilot knows: other aircraft as they were a reaction time ago, within sight range.

const state = (x, y, z, vx = 0, vy = 0, vz = 0, q = new Quaternion()) => ({
  position: new Vector3(x, y, z), velocity: new Vector3(vx, vy, vz), quaternion: q.clone(),
});

// An aircraft flying east at 50 m/s from the origin, recorded for `seconds`.
function watch(skill, seconds) {
  const obs = new Observer(skill);
  for (let i = 0; i <= seconds * 120; i++) {
    const t = i / 120;
    obs.record(t, [{ id: 'a', state: state(50 * t, 1000, 0, 50, 0, 0) }]);
  }
  return obs;
}

describe('the observer', () => {
  for (const name of ['novice', 'regular', 'ace']) {
    const skill = SKILLS[name];
    it(`${skill.name}: sees an aircraft where it was about ${skill.reactionTime} s ago`, () => {
      const t = 5;
      const obs = watch(skill, t);
      const seen = obs.view('a', t);
      const age = t - seen.t;
      expect(age).toBeGreaterThanOrEqual(skill.reactionTime - 1e-9);
      expect(age).toBeLessThan(skill.reactionTime + 1 / 30 + 1e-9); // plus at most one sampling interval
      expect(seen.position.x).toBeCloseTo(50 * seen.t, 6);
      // So the picture is behind the real position by speed x age: 30 m for a Novice, about 7 m for an Ace.
      expect(50 * t - seen.position.x).toBeCloseTo(50 * age, 6);
    });
  }

  it('a slower reaction means an older picture', () => {
    const age = (name) => 5 - watch(SKILLS[name], 5).view('a', 5).t;
    expect(age('novice')).toBeGreaterThan(age('regular'));
    expect(age('regular')).toBeGreaterThan(age('ace'));
  });

  it('early in a fight it knows the oldest it has rather than nothing, and knows nothing of an unseen aircraft', () => {
    const obs = new Observer(SKILLS.novice);
    expect(obs.view('a', 0)).toBeNull();
    obs.record(0, [{ id: 'a', state: state(0, 0, 0) }]);
    obs.record(1 / 30, [{ id: 'a', state: state(1, 0, 0) }]);
    expect(obs.view('a', 0.1).t).toBe(0);
    expect(obs.view('b', 0.1)).toBeNull();
  });

  it('keeps only a short history, and records are copies (a later move does not change them)', () => {
    const obs = watch(SKILLS.ace, 60);
    expect(obs.records.get('a').length).toBeLessThan(12);
    const o = { id: 'x', state: state(0, 0, 0) };
    const fresh = new Observer(SKILLS.ace);
    fresh.record(0, [o]);
    o.state.position.x = 999;
    expect(fresh.view('x', 1).position.x).toBe(0);
  });

  it('forget drops an aircraft', () => {
    const obs = watch(SKILLS.ace, 1);
    obs.forget('a');
    expect(obs.view('a', 1)).toBeNull();
  });
});

describe('geometry: who is where', () => {
  // The viewer flies north (nose along -Z in the world: the identity quaternion points +X, so turn it).
  const north = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2); // +X nose -> -Z
  const me = state(0, 1000, 0, 0, 0, -45, north);

  it('an aircraft dead ahead: range, zero off the nose, closing when it comes toward me', () => {
    const them = { ...state(0, 1000, -300, 0, 0, 45, new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2)) }; // heading south, at me
    const g = geometry(me, them);
    expect(g.range).toBeCloseTo(300, 6);
    expect(g.offNose).toBeCloseTo(0, 6);
    expect(g.offTail).toBeCloseTo(Math.PI, 6);
    expect(g.closing).toBeCloseTo(90, 6);
    expect(g.pointingAtMe).toBeCloseTo(0, 6); // its nose is at me
    expect(g.behindIt).toBeCloseTo(Math.PI, 6); // I am in front of it, not behind
  });

  it('an aircraft on my tail: behind me, pointing at me, and I am not on its tail', () => {
    const them = state(0, 1000, 200, 0, 0, -50, north); // 200 m behind (south), flying north too
    const g = geometry(me, them);
    expect(g.offTail).toBeCloseTo(0, 6);
    expect(g.offNose).toBeCloseTo(Math.PI, 6);
    expect(g.pointingAtMe).toBeCloseTo(0, 6);
    expect(g.closing).toBeCloseTo(5, 6); // 50 against 45
  });

  it('an aircraft I am chasing: ahead, with me dead astern of it', () => {
    const them = state(0, 1000, -250, 0, 0, -40, north);
    const g = geometry(me, them);
    expect(g.offNose).toBeCloseTo(0, 6);
    expect(g.behindIt).toBeCloseTo(0, 6);
    expect(g.pointingAtMe).toBeCloseTo(Math.PI, 6); // it is flying away from me
    expect(g.closing).toBeCloseTo(5, 6); // I am the faster (45 against 40) and am catching it
  });

  it('an aircraft off to the right is 90 degrees off the nose', () => {
    const g = geometry(me, state(400, 1000, 0, 0, 0, -45, north));
    expect(g.offNose).toBeCloseTo(Math.PI / 2, 6);
    expect(g.direction.x).toBeCloseTo(1, 6);
  });

  it('directions are unit vectors and the range is the straight-line distance', () => {
    const g = geometry(me, state(300, 1400, -400));
    expect(g.direction.length()).toBeCloseTo(1, 9);
    expect(g.range).toBeCloseTo(Math.hypot(300, 400, 400), 6);
  });
});
