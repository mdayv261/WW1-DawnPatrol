// Bullet flight: gravity and air drag. The drag is the standard G1 curve (drag
// coefficient against Mach number, src/aircraft/g1Table.js) scaled by the
// bullet's ballistic coefficient BC = mass / (form factor x diameter^2):
//   deceleration = air density x speed^2 x Cd_G1(Mach) x pi / (8 BC)
// Air density and the speed of sound come from the same International Standard
// Atmosphere as the flight model. There is no wind. SI units.

import { G } from '../core/constants.js';
import { G1 } from '../aircraft/g1Table.js';
import { atmosphere } from '../physics/atmosphere.js';

// Drag coefficient of the G1 projectile at a Mach number (straight lines between table points).
export function g1Cd(mach) {
  const m = G1.mach;
  const cd = G1.cd;
  if (mach <= m[0]) return cd[0];
  const last = m.length - 1;
  if (mach >= m[last]) return cd[last];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (m[mid] <= mach) lo = mid;
    else hi = mid;
  }
  const f = (mach - m[lo]) / (m[hi] - m[lo]);
  return cd[lo] + f * (cd[hi] - cd[lo]);
}

// Drag constant of a cartridge: pi x form factor x diameter^2 / (8 x mass).
// Zero for a form factor of zero (no drag; used by the tests).
export function dragConstant(cartridge) {
  return (Math.PI * cartridge.formFactor * cartridge.diameter ** 2) / (8 * cartridge.mass);
}

// Acceleration (m/s^2) of a bullet at height y with velocity (vx, vy, vz).
const _a = [0, 0, 0];
function acceleration(k, y, vx, vy, vz) {
  const speed = Math.hypot(vx, vy, vz);
  if (speed < 1e-6) {
    _a[0] = 0;
    _a[1] = -G;
    _a[2] = 0;
    return _a;
  }
  const air = atmosphere(y);
  const drag = k * air.density * speed * g1Cd(speed / air.soundSpeed); // per unit velocity
  _a[0] = -drag * vx;
  _a[1] = -drag * vy - G;
  _a[2] = -drag * vz;
  return _a;
}

// A bullet: { x, y, z, vx, vy, vz, age, owner, cartridge, tracer }. Made at the muzzle.
export function makeBullet(cartridge, position, velocity, extra = {}) {
  return {
    x: position.x, y: position.y, z: position.z,
    vx: velocity.x, vy: velocity.y, vz: velocity.z,
    age: 0, cartridge, ...extra,
  };
}

// Advance a bullet by dt seconds (midpoint method). Changes the bullet.
export function stepBullet(b, dt) {
  const k = dragConstant(b.cartridge);
  const a1 = acceleration(k, b.y, b.vx, b.vy, b.vz);
  const [ax, ay, az] = a1;
  const hx = b.vx + 0.5 * dt * ax;
  const hy = b.vy + 0.5 * dt * ay;
  const hz = b.vz + 0.5 * dt * az;
  const a2 = acceleration(k, b.y + 0.5 * dt * b.vy, hx, hy, hz);
  b.x += dt * hx;
  b.y += dt * hy;
  b.z += dt * hz;
  b.vx += dt * a2[0];
  b.vy += dt * a2[1];
  b.vz += dt * a2[2];
  b.age += dt;
  return b;
}

export const bulletSpeed = (b) => Math.hypot(b.vx, b.vy, b.vz);

// Fire a bullet horizontally (or at `elevation` radians) from height y0 at a
// muzzle speed plus a launch-platform speed `inherited` along the same line, and
// report where it is when it has travelled `range` metres along the line of fire.
// Returns { time, drop (m below the line of fire), speed (m/s), energy (J) }.
export function trajectoryAt(cartridge, range, { y0 = 1000, elevation = 0, inherited = 0, step = 1 / 1200 } = {}) {
  const speed0 = cartridge.muzzleVelocity + inherited;
  const dx = Math.cos(elevation);
  const dy = Math.sin(elevation);
  const b = makeBullet(cartridge, { x: 0, y: y0, z: 0 }, { x: speed0 * dx, y: speed0 * dy, z: 0 });
  let travelled = 0;
  while (travelled < range && b.age < 20) {
    stepBullet(b, step);
    travelled = b.x * dx + (b.y - y0) * dy;
  }
  // Drop below the straight line of fire, measured perpendicular to it.
  const drop = -(-b.x * dy + (b.y - y0) * dx);
  const speed = bulletSpeed(b);
  return { time: b.age, drop, speed, energy: 0.5 * cartridge.mass * speed * speed };
}

// Fly a bullet from `position` with `velocity` (world axes) until it has gone `range`
// metres from where it started (or is stopped). Returns the bullet, with its x, y, z
// and age at that point. Used to place the gun sight.
export function flyBullet(cartridge, position, velocity, range, step = 1 / 240) {
  const b = makeBullet(cartridge, position, velocity);
  const dist = () => Math.hypot(b.x - position.x, b.y - position.y, b.z - position.z);
  let before = { x: b.x, y: b.y, z: b.z, age: 0, d: 0 };
  while (dist() < range && b.age < 10 && bulletSpeed(b) > 50) {
    before = { x: b.x, y: b.y, z: b.z, age: b.age, d: dist() };
    stepBullet(b, step);
  }
  // The last step overshot: slide back along it so the bullet is exactly `range` away.
  const d = dist();
  if (d > range && d > before.d) {
    const f = (range - before.d) / (d - before.d);
    b.x = before.x + (b.x - before.x) * f;
    b.y = before.y + (b.y - before.y) * f;
    b.z = before.z + (b.z - before.z) * f;
    b.age = before.age + (b.age - before.age) * f;
  }
  return b;
}
