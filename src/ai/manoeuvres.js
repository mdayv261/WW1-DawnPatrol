// Manoeuvres: short scripts the brain runs on top of the pilot's hands. Each one is
// asked every step what to fly (`want`: a direction, a speed and a load share, as
// steering.js takes them) and says when it is finished: the defensive break, the
// break-away that avoids a collision, the Immelmann, the split-S, the climbing turn and
// boom-and-zoom. Numbers are in COMBAT and MANOEUVRES (src/aircraft/aiData.js).

import { Vector3 } from 'three';
import { COMBAT, MANOEUVRES } from '../aircraft/aiData.js';

const UP = new Vector3(0, 1, 0);
const _side = new Vector3();
const _h = new Vector3();

// Defensive break: an enemy has got on my tail. Turn hard across his line of sight so he
// has to overshoot or break off. If after a while he is still there, reverse the turn.
export class DefensiveBreak {
  constructor(rng = Math.random) {
    this.name = 'defensive break';
    this.rng = rng;
    this.time = 0;
    this.side = 0; // +1 or -1: which way the turn goes (chosen at the first step)
    this.lastFlip = 0;
    this.flips = 0;
    this.done = false;
  }

  // los: unit vector from me to the attacker; vhat: my velocity direction; threat: is the attacker
  // still on my tail (as far as I can see); clear: is he clearly off my tail now.
  update(dt, { los, vhat, threat, clear, topSpeed }) {
    this.time += dt;
    // A line across his line of sight, level: turning along it takes me out of his sights.
    _side.crossVectors(UP, los);
    if (_side.lengthSq() < 1e-8) _side.set(1, 0, 0);
    _side.normalize();
    if (this.side === 0) {
      const along = _side.dot(_h.copy(vhat).setY(0));
      this.side = Math.abs(along) > 0.05 ? Math.sign(along) : this.rng() < 0.5 ? -1 : 1;
    } else if (threat && this.time - this.lastFlip > COMBAT.evadeReverse) {
      this.side = -this.side; // he stayed with me: break the other way
      this.lastFlip = this.time;
      this.flips++;
    }
    if (this.time > COMBAT.evadeMax || (this.time > COMBAT.evadeMin && clear)) this.done = true;
    // Across his line, and a little down, so the turn is hard and gains speed.
    const dir = new Vector3().copy(_side).multiplyScalar(this.side).addScaledVector(UP, -0.25).normalize();
    return { dir, speed: 0.95 * topSpeed, gShare: 1 };
  }
}

// Break away: too close, closing fast, about to collide. Pull up and sideways for a moment.
export class BreakAway {
  constructor(rng = Math.random) {
    this.name = 'break away';
    this.time = 0;
    this.side = rng() < 0.5 ? -1 : 1;
    this.done = false;
  }

  update(dt, { los, topSpeed }) {
    this.time += dt;
    if (this.time > COMBAT.breakOffTime) this.done = true;
    _side.crossVectors(UP, los).normalize();
    const dir = new Vector3().copy(UP).addScaledVector(_side, 0.6 * this.side).addScaledVector(los, -0.2).normalize();
    return { dir, speed: 0.95 * topSpeed, gShare: 1 };
  }
}

const _fwd = new Vector3();

// The horizontal heading of a velocity, as a unit vector (or the given fallback).
function headingOf(v, out = new Vector3()) {
  out.set(v.x, 0, v.z);
  if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
  return out.normalize();
}

// Immelmann: a half loop up, then a half roll at the top: the aircraft comes out going the other
// way, higher and slower. It needs speed to start. Phase 1 pulls up and over; phase 2 rolls upright.
export class Immelmann {
  constructor(velocity) {
    this.name = 'Immelmann';
    this.back = headingOf(velocity).negate(); // the way out
    this.phase = 'up';
    this.time = 0;
    this.done = false;
  }

  update(dt, { velocity, up, topSpeed, speed }) {
    this.time += dt;
    if (this.phase === 'up') {
      // Over the top: steep up, leaning back the way out, so the loop goes over and not round.
      if (headingOf(velocity, _fwd).dot(this.back) > 0.6 && velocity.y < 0.4 * speed) this.phase = 'roll';
      if (speed < MANOEUVRES.abortSpeed * topSpeed) this.phase = 'roll'; // too slow to finish the loop: roll out where it is
    } else if (up.y > 0.85 || this.time > MANOEUVRES.maxTime) this.done = true;
    if (this.time > MANOEUVRES.maxTime) this.done = true;
    const dir = this.phase === 'up'
      ? new Vector3().copy(this.back).multiplyScalar(MANOEUVRES.loopLean).add(UP).normalize()
      : new Vector3(this.back.x, MANOEUVRES.rollOutSlope, this.back.z).normalize();
    return { dir, speed: topSpeed, gShare: 1 };
  }
}

// Split-S: a half roll to inverted, then a half loop down: out the other way, lower and faster.
// It needs height. The pilot's hands do the roll (the wanted direction is behind and below).
export class SplitS {
  constructor(velocity) {
    this.name = 'split-S';
    this.back = headingOf(velocity).negate();
    this.time = 0;
    this.done = false;
  }

  update(dt, { velocity, speed, topSpeed }) {
    this.time += dt;
    const reversed = headingOf(velocity, _fwd).dot(this.back) > 0.7;
    if ((reversed && velocity.y > -0.2 * speed) || this.time > MANOEUVRES.maxTime) this.done = true;
    const dir = reversed ? new Vector3(this.back.x, 0, this.back.z) : new Vector3().copy(this.back).multiplyScalar(MANOEUVRES.loopLean).sub(UP);
    // Throttle back through the dive (a low wanted speed), so it does not overspeed coming out.
    return { dir: dir.normalize(), speed: (reversed ? 0.85 : MANOEUVRES.splitSThrottleSpeed) * topSpeed, gShare: 1 };
  }
}

// Climbing turn: turn toward an enemy who is above (or level and far), climbing at the same time,
// to trade the turn for height rather than lose it. Finished when it points at him.
export class ClimbingTurn {
  constructor() {
    this.name = 'climbing turn';
    this.time = 0;
    this.done = false;
  }

  update(dt, { toEnemy, velocity, topSpeed, enemyAbove = Infinity }) {
    this.time += dt;
    const h = headingOf(toEnemy);
    const pointing = headingOf(velocity, _fwd).dot(h) > 0.95;
    if (pointing || enemyAbove < MANOEUVRES.climbAbove / 2 || this.time > MANOEUVRES.maxTime) this.done = true;
    return { dir: new Vector3(h.x, MANOEUVRES.climbSlope, h.z).normalize(), speed: MANOEUVRES.climbSpeed * topSpeed, gShare: 0.8 };
  }
}

// Boom-and-zoom: dive on an enemy from above at high speed, fire on the way through, then
// zoom-climb away with the speed, never staying to turn with him. The brain aims and fires
// during the dive; this script says where to fly and when the zoom begins and ends.
export class BoomAndZoom {
  constructor() {
    this.name = 'boom-and-zoom';
    this.phase = 'dive';
    this.time = 0;
    this.done = false;
  }

  // aimDir: the aim solution on the enemy; range, offNose: from the geometry.
  update(dt, { aimDir, range, offNose, velocity, speed, topSpeed }) {
    this.time += dt;
    if (this.phase === 'dive' && (range < MANOEUVRES.zoomRange || offNose > 1.2)) this.phase = 'zoom';
    if (this.phase === 'zoom' && speed < MANOEUVRES.zoomEndSpeed * topSpeed) this.done = true;
    if (this.time > MANOEUVRES.maxTime * 1.5) this.done = true;
    if (this.phase === 'dive') return { dir: aimDir.clone(), speed: topSpeed, gShare: 0.9, aim: true };
    const h = headingOf(velocity, new Vector3());
    return { dir: new Vector3(h.x, MANOEUVRES.zoomSlope, h.z).normalize(), speed: topSpeed, gShare: 0.9 };
  }
}
