// Manoeuvres: short scripts the brain runs on top of the pilot's hands. Each one is
// asked every step what to fly (`want`: a direction, a speed and a load share, as
// steering.js takes them) and says when it is finished. This checkpoint has the
// defensive break (turn hard into an attacker on the tail, reversing the turn if he
// stays there) and the break-away that avoids a collision. Numbers are in COMBAT
// (src/aircraft/aiData.js).

import { Vector3 } from 'three';
import { COMBAT } from '../aircraft/aiData.js';

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
