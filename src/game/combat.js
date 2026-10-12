// The fight: the player's guns, the bullets in the air, and the target aircraft.
// Stepped once per physics step (120 Hz) after the player's own step, so bullets,
// targets and the player all move on the same clock. No drawing in here; the
// renderer reads `bullets`, `targets` and `events`.

import { Quaternion, Vector3 } from 'three';
import { GunBank } from '../weapons/guns.js';
import { makeBullet, stepBullet, bulletSpeed, flyBullet } from '../weapons/ballistics.js';
import { findImpact } from '../weapons/hits.js';
import { BULLETS, SIGHT, TARGETS } from '../aircraft/weapons.js';
import { Target, enemiesOf } from './targets.js';
import { pilotDead } from '../physics/damage.js';
import { DAMAGE } from '../aircraft/damageModel.js';

const PASS_LOSS = DAMAGE.passLoss;
const _p = new Vector3();
const _v = new Vector3();
const _d = new Vector3();
const _q = new Quaternion();

export class Combat {
  // solidAt(x, y, z) -> label | null: what stops bullets (trees, buildings). rng: random numbers.
  constructor({ solidAt = null, rng = Math.random } = {}) {
    this.solidAt = solidAt;
    this.rng = rng;
    this.aircraft = null;
    this.gunBank = null;
    this.bullets = [];
    this.targets = [];
    this.events = []; // for the renderer: { kind: 'hit' | 'ground' | 'solid' | 'down', x, y, z }
    this.kills = 0;
    this.shotsFired = 0;
    this.hitsOnTargets = 0;
    this.messages = []; // short texts for the screen: "SHOT DOWN: Fokker Dr.I"
    this.time = 0;
    this.spawned = 0;
    this.fxTimer = 0;
  }

  // A new flight in `aircraft`: full belts, no bullets, no targets.
  reset(aircraft) {
    this.aircraft = aircraft;
    this.gunBank = new GunBank(aircraft, this.rng);
    this.bullets.length = 0;
    this.targets.length = 0;
    this.events.length = 0;
    this.messages.length = 0;
    this.kills = 0;
    this.shotsFired = 0;
    this.hitsOnTargets = 0;
    this.time = 0;
    this.spawned = 0;
    this.fxTimer = 0;
  }

  clearJam() {
    this.gunBank?.clearJam();
  }

  // Put a new target ahead of the player (up to TARGETS.maxAlive). Returns it, or null.
  spawnTarget(player) {
    if (this.targets.length >= TARGETS.maxAlive) return null;
    const types = enemiesOf(player.aircraft);
    const n = this.spawned++;
    const target = new Target(types[n % types.length], TARGETS.patterns[n % TARGETS.patterns.length], { solidAt: this.solidAt });
    const lateral = [0, -90, 90][this.targets.length % 3];
    target.place(player.state, lateral);
    this.targets.push(target);
    return target;
  }

  // Advance dt seconds. player: the player's Simulation; trigger: is the fire control held.
  step(dt, player, trigger) {
    if (!this.gunBank || !player.aircraft) return;
    this.time += dt;
    for (const t of this.targets) t.step(dt);

    const live = this.targets.filter((t) => !t.crashed);
    const rpm = player.diag ? player.diag.rpm : 0;
    const shots = this.gunBank.update(dt, trigger && !player.crashed && !pilotDead(player.damage), rpm);
    this.shotsFired += shots.length;
    for (const shot of shots) this.spawn(player, shot, live, dt);
    this.moveBullets(dt, live);
    this.tidyTargets(player);
    this.fxTimer += dt;
    if (this.fxTimer >= 0.05) {
      this.fxTimer -= 0.05;
      this.damageEffects(player);
      for (const t of live) this.damageEffects(t.sim);
    }
  }

  // Smoke from a hurt engine and spray from a holed fuel tank, as events for the renderer.
  damageEffects(sim) {
    const d = sim.damage;
    const smoking = d.engine > 0.25;
    const leaking = d.tank > 0 && d.fuel > 0;
    if (!smoking && !leaking) return;
    const s = sim.state;
    _p.set(0.2 * sim.aircraft.geometry.length, 0, 0).applyQuaternion(s.quaternion).add(s.position);
    if (smoking) this.events.push({ kind: 'smoke', x: _p.x, y: _p.y, z: _p.z });
    if (leaking) this.events.push({ kind: 'spray', x: _p.x, y: _p.y - 0.4, z: _p.z });
  }

  spawn(player, shot, live) {
    const s = player.state;
    _p.set(shot.muzzle.x, shot.muzzle.y, shot.muzzle.z).applyQuaternion(s.quaternion).add(s.position);
    _d.set(1, 0, 0).applyQuaternion(s.quaternion);
    _v.copy(s.velocity).addScaledVector(_d, shot.cartridge.muzzleVelocity);
    const b = makeBullet(shot.cartridge, _p, _v, { tracer: shot.tracer });
    // It left the muzzle `shot.age` seconds before the end of this step: carry it on that far.
    this.advance(b, shot.age, live);
    if (b.alive !== false) this.bullets.push(b);
  }

  // Move a bullet by dt and deal with whatever it hits. Sets b.alive = false when it is done.
  advance(b, dt, live) {
    const x0 = b.x;
    const y0 = b.y;
    const z0 = b.z;
    stepBullet(b, dt);
    const hit = findImpact(x0, y0, z0, b.x, b.y, b.z, live, this.solidAt);
    if (hit) {
      const x = x0 + (b.x - x0) * hit.t;
      const y = y0 + (b.y - y0) * hit.t;
      const z = z0 + (b.z - z0) * hit.t;
      this.events.push({ kind: hit.kind === 'aircraft' ? 'hit' : hit.kind, x, y, z });
      if (hit.kind === 'aircraft') this.registerHit(hit, b);
      b.alive = false;
    } else if (b.age > BULLETS.maxLife || bulletSpeed(b) < BULLETS.minSpeed) b.alive = false;
  }

  registerHit(hit, b) {
    this.hitsOnTargets++;
    const target = hit.target;
    target.hits++;
    // The bullet's energy as the target feels it (their speeds subtract).
    const vx = b.vx - target.state.velocity.x;
    const vy = b.vy - target.state.velocity.y;
    const vz = b.vz - target.state.velocity.z;
    let energy = 0.5 * b.cartridge.mass * (vx * vx + vy * vy + vz * vz);
    // It goes through each part in turn, losing some energy in each, until one stops it.
    for (const part of hit.zones) {
      if (target.takeHit(part.zone, energy, this.rng)) {
        this.kills++;
        this.messages.push(`SHOT DOWN: ${target.aircraft.name} (${target.reason})`);
        this.events.push({ kind: 'down', x: b.x, y: b.y, z: b.z });
      }
      energy *= PASS_LOSS;
    }
  }

  moveBullets(dt, live) {
    let keep = 0;
    for (const b of this.bullets) {
      this.advance(b, dt, live);
      if (b.alive !== false) this.bullets[keep++] = b;
    }
    this.bullets.length = Math.min(keep, BULLETS.maxAlive);
    if (this.events.length > 200) this.events.splice(0, this.events.length - 200);
  }

  // Take away targets that crashed a few seconds ago or flew far off.
  tidyTargets(player) {
    this.targets = this.targets.filter((t) => {
      if (t.crashed) {
        t.removeAt ??= this.time + 4;
        return this.time < t.removeAt;
      }
      return t.state.position.distanceTo(player.state.position) < TARGETS.dropRange;
    });
  }

  // Where the gun sight mark is: the point a bullet from between the guns reaches
  // at SIGHT.range, allowing for the drop, the drag and the aircraft's own speed.
  sightPoint(player, out = new Vector3()) {
    const s = player.state;
    const g = player.aircraft.guns;
    _q.copy(s.quaternion);
    _p.set(g.muzzleX, g.muzzleY, 0).applyQuaternion(_q).add(s.position);
    _d.set(1, 0, 0).applyQuaternion(_q);
    _v.copy(s.velocity).addScaledVector(_d, this.gunBank.cartridge.muzzleVelocity);
    const b = flyBullet(this.gunBank.cartridge, _p, _v, SIGHT.range);
    return out.set(b.x, b.y, b.z);
  }
}
