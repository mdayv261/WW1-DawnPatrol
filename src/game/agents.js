// Agents: the other aircraft in the fight. Each is a full Simulation, so it obeys the
// same flight model, control inputs, structural limits and damage as the player, plus a
// brain that moves its controls: a Drone flies a scripted path and never fights (gunnery
// practice); an AI pilot (src/ai/brain.js) flies, looks and decides at a skill level.
// Hits damage an agent like they would the player (physics/damage.js); when its pilot
// is killed, a wing or the tail breaks off, or its engine seizes, it is shot down: the
// brain lets go and it falls.

import { Quaternion, Vector3 } from 'three';
import { Simulation } from '../core/simulation.js';
import { AIRCRAFT_LIST } from '../aircraft/index.js';
import { TARGETS } from '../aircraft/weapons.js';
import { SKILLS, PATROL } from '../aircraft/aiData.js';
import { attitude } from '../dev/flightScenarios.js';
import { applyHit, destroyedReason } from '../physics/damage.js';
import { GunBank } from '../weapons/guns.js';
import { AiBrain } from '../ai/brain.js';

const clamp = (v, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, v));
const _yaw = new Quaternion();
const UP = new Vector3(0, 1, 0);

let nextId = 1;

// The scripted pilot of a Drone: a bank angle to hold by pattern, and the stick to hold its height.
export class DroneBrain {
  constructor(pattern) {
    this.pattern = pattern;
    this.integral = 0;
    this.time = 0;
    this.altitude = 0;
    this.speed = 0;
    this.throttle = 1;
    this.state = 'drone';
    this.manoeuvre = null;
  }

  bankTarget() {
    switch (this.pattern) {
      case 'circle':
        return TARGETS.circleBank;
      case 'weave':
        return Math.sin((this.time / TARGETS.weavePeriod) * 2 * Math.PI) * TARGETS.weaveBank;
      default:
        return 0;
    }
  }

  think(dt, self) {
    const sim = self.sim;
    this.time += dt;
    const input = { ...sim.startInput };
    const a = attitude(sim.state);
    const p = sim.state.angularVelocity.x;
    const vy = sim.state.velocity.y;
    const speed = sim.diag ? sim.diag.speed : this.speed;
    const nearStall = sim.diag ? sim.diag.stall > 0.02 : false;
    this.integral = clamp(this.integral - 0.02 * vy * dt, -0.4, 0.4);
    input.roll = clamp(2.5 * (this.bankTarget() - a.bank) - 0.8 * p);
    input.pull = clamp(this.integral - 0.03 * vy - 0.002 * (sim.state.position.y - this.altitude), -0.5, 0.5);
    if (nearStall) input.pull = Math.min(input.pull, -0.2); // never pull into a stall: let the nose drop and keep flying
    input.yaw = clamp(3 * (sim.diag ? sim.diag.beta : 0));
    input.throttle = clamp(this.throttle + 0.15 * (this.speed - speed), 0, 1); // hold its speed through turns
    return input;
  }

  describe() {
    return `Drone ${this.pattern}`;
  }
}

export class Agent {
  // skill: a key of SKILLS ('drone', 'novice', 'regular', 'ace'). pattern: a Drone's path.
  constructor(aircraft, skill, { pattern = 'straight', solidAt = null, rng = Math.random } = {}) {
    this.id = nextId++;
    this.aircraft = aircraft;
    this.skill = skill;
    this.pattern = pattern;
    this.sim = new Simulation();
    this.sim.solidAt = solidAt;
    this.sim.deadPilotFreezes = false; // a shot-down agent tumbles (below) instead of flying on with frozen controls
    this.brain = null; // made in place()
    this.gunBank = new GunBank(aircraft, rng);
    this.fire = false; // is its trigger down
    this.rng = rng;
    this.hitTimer = 0; // s left in which it knows it has just been hit
    this.hits = 0;
    this.down = false; // shot down: the pilot has let go
    this.reason = null; // why ("Pilot killed", "Wing failed", ...)
    this.removeAt = null; // game time when a crashed agent is taken away
    this.time = 0;
  }

  get side() {
    return this.aircraft.side;
  }

  get state() {
    return this.sim.state;
  }

  get previous() {
    return this.sim.previous;
  }

  get crashed() {
    return this.sim.crashed;
  }

  get isDrone() {
    return this.skill === 'drone';
  }

  // Start a Drone in front of (and above) the player, flying the same way.
  place(playerState, lateral = 0) {
    const heading = attitude(playerState).heading;
    const ahead = new Vector3(Math.sin(heading), 0, -Math.cos(heading)); // the player's horizontal direction
    const altitude = Math.max(300, playerState.position.y + TARGETS.startAbove);
    const speed = TARGETS.speedFraction * this.aircraft.documented.maxSpeed;
    this.sim.start(this.aircraft, altitude, speed);
    const s = this.sim.state;
    _yaw.setFromAxisAngle(UP, -heading); // the trimmed start faces north (-Z)
    s.quaternion.premultiply(_yaw);
    s.velocity.applyQuaternion(_yaw);
    const range = TARGETS.startRange;
    s.position.set(
      playerState.position.x + ahead.x * range + Math.cos(heading) * lateral,
      altitude,
      playerState.position.z + ahead.z * range + Math.sin(heading) * lateral,
    );
    this.sim.previous.position.copy(s.position);
    this.sim.previous.quaternion.copy(s.quaternion);
    this.brain = new DroneBrain(this.pattern);
    Object.assign(this.brain, { altitude, speed, throttle: this.sim.startInput.throttle });
  }

  // Start an AI pilot on its patrol circuit around `centre` ({ x, z }), `angle` radians round it,
  // flying round the circuit at its patrol height and speed.
  placeOnCircuit(centre, angle) {
    const skill = SKILLS[this.skill];
    const speed = skill.patrolSpeed * this.aircraft.documented.maxSpeed;
    const altitude = skill.patrolAltitude;
    this.sim.start(this.aircraft, altitude, speed);
    const s = this.sim.state;
    // The circuit is flown with increasing angle, so the aircraft heads along (-sin a, +cos a) in (x, z).
    const dx = -Math.sin(angle);
    const dz = Math.cos(angle);
    const heading = Math.atan2(dx, -dz);
    _yaw.setFromAxisAngle(UP, -heading);
    s.quaternion.premultiply(_yaw);
    s.velocity.applyQuaternion(_yaw);
    s.position.set(centre.x + PATROL.radius * Math.cos(angle), altitude, centre.z + PATROL.radius * Math.sin(angle));
    this.sim.previous.position.copy(s.position);
    this.sim.previous.quaternion.copy(s.quaternion);
    this.brain = new AiBrain(this.aircraft, this.skill, centre, this.rng);
  }

  // Move the controls for one step and advance the aircraft. others: [{ id, side, state }] the
  // aircraft it could see (the player and the other agents).
  step(dt, others = [], solidAt = null) {
    this.time += dt;
    this.hitTimer = Math.max(0, this.hitTimer - dt);
    let input;
    if (this.down) {
      input = { ...this.sim.startInput, throttle: 0, pull: 1, yaw: 1, fire: false };
    } else {
      input = this.brain.think(dt, this, others, solidAt);
    }
    this.fire = Boolean(input.fire) && !this.down;
    this.sim.step(dt, input);
    // Damage that finishes it in flight (a wing shot through and then overstressed, an engine seizing) brings it down too.
    if (!this.down) {
      const reason = destroyedReason(this.sim.damage);
      if (reason) {
        this.down = true;
        this.reason = reason;
      }
    }
  }

  // A hit in a zone with `energy` joules. Returns true if this hit shot the agent down.
  takeHit(zone, energy, rng = Math.random) {
    const damage = this.sim.damage;
    applyHit(damage, zone, energy, rng, this.sim.surfaces);
    damage.events.length = 0; // the screen reports the player's damage, not the agents'
    const reason = destroyedReason(damage);
    if (this.down || !reason) return false;
    this.down = true;
    this.reason = reason;
    return true;
  }

  // One line for the F3 panel.
  describe() {
    const d = this.sim.diag;
    const flying = d ? `${Math.round(d.speed)} m/s, ${Math.round(this.state.position.y)} m` : '';
    return `${this.aircraft.name}: ${this.down ? `DOWN (${this.reason})` : this.brain ? this.brain.describe() : ''} ${flying}`;
  }
}

// The aircraft types the player fights: the other side's.
export function enemiesOf(playerAircraft) {
  return AIRCRAFT_LIST.filter((a) => a.side !== playerAircraft.side);
}
