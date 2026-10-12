// Target aircraft: enemy aircraft that fly a simple path and do not shoot back
// (the dogfighting AI comes in a later phase). Each is a full Simulation, so it
// obeys the same flight model as the player, and a scripted pilot moves its
// controls like a person would: a bank angle to hold, and the stick to hold its
// height. When hit enough it is shot down: its pilot lets go and it falls.

import { Quaternion, Vector3 } from 'three';
import { Simulation } from '../core/simulation.js';
import { AIRCRAFT_LIST } from '../aircraft/index.js';
import { TARGETS } from '../aircraft/weapons.js';
import { attitude } from '../dev/flightScenarios.js';

const clamp = (v, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, v));
const _yaw = new Quaternion();
const UP = new Vector3(0, 1, 0);

// How much one hit in a zone counts toward shooting the target down.
const HIT_WEIGHT = { pilot: 4, engine: 4, fuel: 3, wingL: 1, wingR: 1, tailplane: 1, fin: 1, fuselage: 0.5 };

let nextId = 1;

export class Target {
  constructor(aircraft, pattern, hooks = {}) {
    this.id = nextId++;
    this.aircraft = aircraft;
    this.pattern = pattern;
    this.sim = new Simulation();
    this.sim.solidAt = hooks.solidAt ?? null;
    this.integral = 0;
    this.time = 0;
    this.altitude = 0;
    this.speed = 0;
    this.score = 0; // weighted hits taken
    this.hits = 0;
    this.down = false; // shot down: the pilot has let go
    this.removeAt = null; // game time when a crashed target is taken away
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

  // Place the target in front of (and above) the player, flying the same way.
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
    this.altitude = altitude;
    this.speed = speed;
    this.throttle = this.sim.startInput.throttle;
  }

  // The bank angle the scripted pilot is flying for, by pattern.
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

  // Move the controls for one step.
  fly(dt) {
    const sim = this.sim;
    const input = { ...sim.startInput };
    if (this.down) {
      input.throttle = 0;
      input.pull = 1;
      input.yaw = 1;
      return input;
    }
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

  step(dt) {
    this.time += dt;
    this.sim.step(dt, this.fly(dt));
  }

  // A hit in a zone. Returns true if this hit shot the target down.
  takeHit(zone) {
    this.hits++;
    if (this.down) return false;
    this.score += HIT_WEIGHT[zone] ?? 1;
    if (this.score >= TARGETS.shotDownHits) {
      this.down = true;
      return true;
    }
    return false;
  }
}

// The aircraft types the player fights: the other side's.
export function enemiesOf(playerAircraft) {
  return AIRCRAFT_LIST.filter((a) => a.side !== playerAircraft.side);
}
