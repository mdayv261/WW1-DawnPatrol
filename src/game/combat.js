// The fight: the player's guns, every other aircraft's guns, the bullets in the air, and
// the agents (target drones and AI pilots). Stepped once per physics step (120 Hz) after
// the player's own step, so bullets, agents and the player all move on the same clock.
// No drawing in here; the renderer reads `bullets`, `agents` and `events`.

import { Quaternion, Vector3 } from 'three';
import { GunBank } from '../weapons/guns.js';
import { makeBullet, stepBullet, bulletSpeed, flyBullet } from '../weapons/ballistics.js';
import { findImpact } from '../weapons/hits.js';
import { BULLETS, SIGHT, TARGETS } from '../aircraft/weapons.js';
import { Agent, enemiesOf } from './agents.js';
import { pilotDead, applyHit, destroyedReason } from '../physics/damage.js';
import { DAMAGE } from '../aircraft/damageModel.js';
import { attitude } from '../dev/flightScenarios.js';

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
    this.agents = [];
    this.events = []; // for the renderer: { kind: 'hit' | 'ground' | 'solid' | 'down' | 'smoke' | 'spray', x, y, z }
    this.kills = 0; // agents the player shot down
    this.shotsFired = 0;
    this.hitsOnTargets = 0;
    this.hitsOnPlayer = 0;
    this.messages = []; // short texts for the screen: "SHOT DOWN: Fokker Dr.I"
    this.time = 0;
    this.spawned = 0;
    this.fxTimer = 0;
    this.skill = 'drone'; // the skill new agents get
    this.practice = false; // true: enemy fire cannot hurt the player
    this.playerVictim = null; // the player as something bullets can hit
    this.playerDown = false;
  }

  // A new flight in `aircraft`: full belts, no bullets, no agents.
  reset(aircraft) {
    this.aircraft = aircraft;
    this.gunBank = new GunBank(aircraft, this.rng);
    this.bullets.length = 0;
    this.agents.length = 0;
    this.events.length = 0;
    this.messages.length = 0;
    this.kills = 0;
    this.shotsFired = 0;
    this.hitsOnTargets = 0;
    this.hitsOnPlayer = 0;
    this.time = 0;
    this.spawned = 0;
    this.fxTimer = 0;
    this.playerVictim = null;
    this.playerDown = false;
  }

  clearJam() {
    this.gunBank?.clearJam();
  }

  // Put a new agent in the fight (up to TARGETS.maxAlive) at `skill` (default: the current one).
  // A Drone appears ahead of the player; an AI pilot on a patrol circuit round where the player is.
  // Returns it, or null.
  spawnAgent(player, skill = this.skill) {
    if (this.agents.length >= TARGETS.maxAlive) return null;
    const types = enemiesOf(player.aircraft);
    const n = this.spawned++;
    const aircraft = types[n % types.length];
    const agent = new Agent(aircraft, skill, { pattern: TARGETS.patterns[n % TARGETS.patterns.length], solidAt: this.solidAt, rng: this.rng });
    if (skill === 'drone') {
      agent.place(player.state, [0, -90, 90, 0][this.agents.length % 4]);
    } else {
      // On the circuit, in the direction the player is facing, spread round it.
      const heading = attitude(player.state).heading;
      const ahead = Math.atan2(-Math.cos(heading), Math.sin(heading));
      const spread = [0, -0.7, 0.7, 1.4][this.agents.length % 4];
      agent.placeOnCircuit({ x: player.state.position.x, z: player.state.position.z }, ahead + spread);
    }
    this.agents.push(agent);
    return agent;
  }

  // Everything bullets can hit: the player and the agents still flying.
  victims(player) {
    if (!this.playerVictim) this.playerVictim = { id: 'player', isPlayer: true, aircraft: player.aircraft, state: player.state, previous: player.previous, sim: player };
    this.playerVictim.aircraft = player.aircraft;
    return [this.playerVictim, ...this.agents.filter((a) => !a.crashed)];
  }

  // Advance dt seconds. player: the player's Simulation; trigger: is the fire control held.
  step(dt, player, trigger) {
    if (!this.gunBank || !player.aircraft) return;
    this.time += dt;
    const victims = this.victims(player);
    const others = victims.map((v) => (v.isPlayer ? { id: 'player', side: player.aircraft.side, state: player.state } : v));
    for (const a of this.agents) a.step(dt, others.filter((o) => o.id !== a.id), this.solidAt);

    // The player's guns, then every agent's.
    const rpm = player.diag ? player.diag.rpm : 0;
    const shots = this.gunBank.update(dt, trigger && !player.crashed && !pilotDead(player.damage), rpm);
    this.shotsFired += shots.length;
    for (const shot of shots) this.spawn(player, shot, victims, this.playerVictim);
    for (const a of this.agents) {
      if (a.crashed) continue;
      for (const shot of a.gunBank.update(dt, a.fire, a.sim.diag ? a.sim.diag.rpm : 0)) this.spawn(a.sim, shot, victims, a);
    }
    this.moveBullets(dt, victims);
    this.tidyAgents(player);
    this.fxTimer += dt;
    if (this.fxTimer >= 0.05) {
      this.fxTimer -= 0.05;
      this.damageEffects(player);
      for (const a of this.agents) if (!a.crashed) this.damageEffects(a.sim);
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

  // A round leaves a gun of `sim` (the player's or an agent's), fired by `owner`.
  spawn(sim, shot, victims, owner) {
    const s = sim.state;
    _p.set(shot.muzzle.x, shot.muzzle.y, shot.muzzle.z).applyQuaternion(s.quaternion).add(s.position);
    _d.set(1, 0, 0).applyQuaternion(s.quaternion);
    _v.copy(s.velocity).addScaledVector(_d, shot.cartridge.muzzleVelocity);
    const b = makeBullet(shot.cartridge, _p, _v, { tracer: shot.tracer, owner });
    // It left the muzzle `shot.age` seconds before the end of this step: carry it on that far.
    this.advance(b, shot.age, victims);
    if (b.alive !== false) this.bullets.push(b);
  }

  // Move a bullet by dt and deal with whatever it hits. Sets b.alive = false when it is done.
  advance(b, dt, victims) {
    const x0 = b.x;
    const y0 = b.y;
    const z0 = b.z;
    stepBullet(b, dt);
    const hit = findImpact(x0, y0, z0, b.x, b.y, b.z, victims, this.solidAt, b.owner);
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
    const victim = hit.target;
    const byPlayer = b.owner === this.playerVictim;
    // The bullet's energy as the victim feels it (their speeds subtract).
    const vx = b.vx - victim.state.velocity.x;
    const vy = b.vy - victim.state.velocity.y;
    const vz = b.vz - victim.state.velocity.z;
    let energy = 0.5 * b.cartridge.mass * (vx * vx + vy * vy + vz * vz);
    if (victim.isPlayer) {
      this.hitsOnPlayer++;
      if (this.practice) return;
      // It goes through each part in turn, losing some energy in each, until one stops it.
      for (const part of hit.zones) {
        applyHit(victim.sim.damage, part.zone, energy, this.rng, victim.sim.surfaces);
        energy *= PASS_LOSS;
      }
      const reason = destroyedReason(victim.sim.damage);
      if (reason && !this.playerDown) {
        this.playerDown = true;
        this.messages.push(`YOU WERE SHOT DOWN BY ${b.owner.aircraft.name} (${reason})`);
      }
      return;
    }
    if (byPlayer) this.hitsOnTargets++;
    victim.hits++;
    for (const part of hit.zones) {
      if (victim.takeHit(part.zone, energy, this.rng)) {
        if (byPlayer) {
          this.kills++;
          this.messages.push(`SHOT DOWN: ${victim.aircraft.name} (${victim.reason})`);
        }
        this.events.push({ kind: 'down', x: b.x, y: b.y, z: b.z });
      }
      energy *= PASS_LOSS;
    }
  }

  moveBullets(dt, victims) {
    let keep = 0;
    for (const b of this.bullets) {
      this.advance(b, dt, victims);
      if (b.alive !== false) this.bullets[keep++] = b;
    }
    this.bullets.length = Math.min(keep, BULLETS.maxAlive);
    if (this.events.length > 200) this.events.splice(0, this.events.length - 200);
  }

  // Take away agents that crashed a few seconds ago or flew far off.
  tidyAgents(player) {
    this.agents = this.agents.filter((t) => {
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

