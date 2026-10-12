// Aiming and firing for an AI pilot. The aim point is the lead a real shot needs: where
// the target will be when the bullet gets there, with the bullet's drop added. It uses the
// same bullet physics as the game (src/weapons/ballistics.js) through a table of flight
// time and drop against range. Then the pilot is not perfect: the skill's aim error is
// added as a slow random wander (an Ornstein-Uhlenbeck process), and the trigger is pulled
// in bursts only when the nose is close enough to the aim point and the range is short.

import { Vector3 } from 'three';
import { trajectoryAt, makeBullet, stepBullet } from '../weapons/ballistics.js';
import { COMBAT } from '../aircraft/aiData.js';

const TABLE_STEP = 25; // m
const TABLE_MAX = 1200; // m
const tables = new Map();

// Flight time and drop of a bullet against range (straight-line distance), computed once per cartridge.
function table(cartridge) {
  let t = tables.get(cartridge);
  if (t) return t;
  t = { time: [0], drop: [0] };
  for (let r = TABLE_STEP; r <= TABLE_MAX; r += TABLE_STEP) {
    const flight = trajectoryAt(cartridge, r, { y0: 1000, step: 1 / 600 });
    t.time.push(flight.time);
    t.drop.push(flight.drop);
  }
  tables.set(cartridge, t);
  return t;
}

function lookup(values, range) {
  const x = Math.min(Math.max(range, 0), TABLE_MAX) / TABLE_STEP;
  const i = Math.min(Math.floor(x), values.length - 2);
  return values[i] + (values[i + 1] - values[i]) * (x - i);
}

export const flightTime = (cartridge, range) => lookup(table(cartridge).time, range);
export const bulletDrop = (cartridge, range) => lookup(table(cartridge).drop, range);

const _r0 = new Vector3();
const _vrel = new Vector3();
const _fly = new Vector3();
const _miss = new Vector3();
const _bullet = new Vector3();

// Where to point the guns to hit a target flying straight on at constant speed. All in world axes.
// muzzle: the gun's position; selfVelocity: the shooter's velocity (the bullet inherits it).
// Returns { dir (unit vector to aim along), time (s), range (m) } into `out`.
export function aimSolution(cartridge, muzzle, selfVelocity, targetPosition, targetVelocity, out = {}) {
  _r0.copy(targetPosition).sub(muzzle);
  _vrel.copy(targetVelocity).sub(selfVelocity); // the target's motion as the shooter sees it
  let t = _r0.length() / cartridge.muzzleVelocity;
  const aim = out.dir ?? new Vector3();
  let range = 0;
  for (let k = 0; k < 4; k++) {
    aim.copy(_r0).addScaledVector(_vrel, t);
    range = Math.min(aim.length(), COMBAT.leadClamp);
    t = flightTime(cartridge, range);
  }
  aim.copy(_r0).addScaledVector(_vrel, t);
  aim.y += bulletDrop(cartridge, aim.length()); // aim high by the drop
  out.range = aim.length();
  const reach = out.range;
  aim.normalize();
  // The table ignores that drag acts against the air, not against the shooter's frame, which matters
  // for a crossing shot. So fly the shot with the real bullet physics and correct the aim by the miss.
  for (let k = 0; k < 2; k++) {
    _fly.copy(selfVelocity).addScaledVector(aim, cartridge.muzzleVelocity);
    const b = makeBullet(cartridge, muzzle, _fly);
    const steps = Math.max(1, Math.round(t * 120));
    for (let i = 0; i < steps; i++) stepBullet(b, t / steps);
    _miss.copy(targetPosition).addScaledVector(targetVelocity, t).sub(_bullet.set(b.x, b.y, b.z));
    aim.multiplyScalar(reach).add(_miss).normalize();
  }
  out.dir = aim;
  out.time = t;
  return out;
}

// A standard normal random number from a uniform generator (Box-Muller).
export function gaussian(rng) {
  const u = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

const _a = new Vector3();
const _b = new Vector3();
const _up = new Vector3(0, 1, 0);

// The pilot's aim error: a slow random wander in two directions across the line of sight.
export class AimError {
  constructor(skill, rng = Math.random) {
    this.sigma = skill.aimError;
    this.memory = skill.aimMemory;
    this.rng = rng;
    this.x = 0;
    this.y = 0;
  }

  // Move the wander on by dt (stationary, with standard deviation sigma and correlation time memory).
  update(dt) {
    const k = Math.exp(-dt / this.memory);
    const s = this.sigma * Math.sqrt(1 - k * k);
    this.x = this.x * k + s * gaussian(this.rng);
    this.y = this.y * k + s * gaussian(this.rng);
  }

  // The aim direction with the error added (a new unit vector in `out`).
  apply(dir, out = new Vector3()) {
    _a.crossVectors(dir, _up);
    if (_a.lengthSq() < 1e-8) _a.set(1, 0, 0);
    _a.normalize(); // across the line of sight, level
    _b.crossVectors(_a, dir).normalize(); // across it, up
    return out.copy(dir).addScaledVector(_a, this.x).addScaledVector(_b, this.y).normalize();
  }
}

// Bursts: fire for a while, pause, fire again. `want` is whether the nose is on the aim point and the
// range is right; the trigger is down only while a burst is on and `want` is true.
export class Trigger {
  constructor(skill, rng = Math.random) {
    this.skill = skill;
    this.rng = rng;
    this.bursting = false;
    this.timer = 0;
  }

  between([lo, hi]) {
    return lo + (hi - lo) * this.rng();
  }

  update(dt, want) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.bursting = !this.bursting;
      this.timer = this.between(this.bursting ? this.skill.burst : this.skill.pause);
    }
    return this.bursting && want;
  }

  // Start the next burst at once (when a good shot appears after a pause).
  ready() {
    if (!this.bursting && this.timer > 0.25) this.timer = 0.25;
  }
}
