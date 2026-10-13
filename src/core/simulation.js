// The running simulation: one aircraft's physical state, stepped at a fixed
// rate. Keeps the previous state so the renderer can blend between steps.

import { Quaternion, Vector3 } from 'three';
import { common } from '../aircraft/index.js';
import { advance } from '../physics/flightModel.js';
import { trimLevel, levelState } from '../physics/trim.js';
import { restingPose } from '../physics/ground.js';
import { createState, copyState } from '../physics/rigidBody.js';
import { createInput, createSurfaces } from '../physics/controls.js';
import { hitPoints } from '../physics/hitpoints.js';
import { createDamage, resetDamage, filterInput, stepDamage } from '../physics/damage.js';

export const START_ALTITUDE = 1000; // m
export const START_SPEED_FRACTION = 0.8; // of the documented top speed
const FUSELAGE_FLOOR = 0.3; // m; the centre of gravity this low means the aircraft is on its belly

const _w = new Vector3();
const _pMid = new Vector3();
const _qMid = new Quaternion();

export class Simulation {
  constructor() {
    this.aircraft = null;
    this.state = createState();
    this.previous = createState();
    this.surfaces = null;
    this.diag = null;
    this.damage = createDamage(); // wings, engine, fuel, pilot, tail and cables (physics/damage.js)
    this.structuralDamage = true; // g and overspeed damage the wings (the player can switch it off in Options)
    this.deadPilotFreezes = true; // a killed pilot leaves the controls where they were (a scripted target sets this false and tumbles)
    this.crashed = false;
    this.crashReason = null;
    this.time = 0;
    // Optional: solidAt(x, y, z) returns a label such as "Hit a tree" if that point is inside a
    // tree or building (set by the game; with none set, nothing but the ground can be hit).
    this.solidAt = null;
    // The neutral controls the flight starts with (throttle and trim from the trim solver).
    this.startInput = createInput();
  }

  // Begin a new flight in trimmed level flight (by default at 1,000 m and 80%
  // of the documented top speed).
  start(aircraft, altitude = START_ALTITUDE, speed = START_SPEED_FRACTION * aircraft.documented.maxSpeed) {
    const trim = trimLevel(aircraft, common, altitude, speed);
    this.aircraft = aircraft;
    copyState(this.state, trim.state);
    copyState(this.previous, trim.state);
    this.surfaces = trim.surfaces;
    resetDamage(this.damage);
    this.startInput = createInput();
    this.startInput.throttle = trim.surfaces.throttle;
    this.startInput.trim = trim.surfaces.trim;
    this.crashed = false;
    this.crashReason = null;
    this.time = 0;
    this.diag = null;
    return this.startInput;
  }

  // Begin a flight parked on the airfield: three-point attitude, engine at
  // idle, chocks in front of the wheels (pulled away when the throttle is
  // opened past common.chockReleaseThrottle). Facing north.
  startOnGround(aircraft) {
    const pose = restingPose(aircraft, common);
    const state = levelState(pose.height, 0, pose.pitch);
    state.chocked = true;
    this.aircraft = aircraft;
    copyState(this.state, state);
    this.state.chocked = true;
    resetDamage(this.damage);
    this.surfaces = createSurfaces();
    this.surfaces.throttle = 0;
    this.startInput = createInput();
    this.startInput.throttle = 0;
    this.crashed = false;
    this.crashReason = null;
    this.diag = null;
    // Let the springs settle before the player takes over.
    for (let i = 0; i < 240; i++) this.step(1 / 120, this.startInput);
    copyState(this.previous, this.state);
    this.time = 0;
    return this.startInput;
  }

  // Advance by one fixed physics step.
  step(dt, input) {
    if (!this.aircraft || this.crashed) return;
    copyState(this.previous, this.state);
    if (this.state.chocked && input.throttle > common.chockReleaseThrottle) this.state.chocked = false;
    const hands = !this.deadPilotFreezes && this.damage.pilot >= 1 ? input : filterInput(this.damage, input, this.surfaces); // what a hurt pilot can still do
    this.diag = advance(this.aircraft, common, this.state, this.surfaces, hands, dt, this.damage);
    stepDamage(this.aircraft, this.damage, this.diag, dt, this.structuralDamage);
    this.time += dt;
    if (this.diag.crash) this.crash(this.diag.crash);
    else if (this.state.position.y < FUSELAGE_FLOOR) this.crash('Hit the ground');
    else if (this.solidAt) this.checkSolids();
  }

  // Test the aircraft's hit points, now and halfway back to the last step (so a thin
  // pole cannot be slipped past between two steps), against trees and buildings.
  checkSolids() {
    const points = hitPoints(this.aircraft, common);
    const q = this.state.quaternion;
    _qMid.slerpQuaternions(this.previous.quaternion, q, 0.5);
    _pMid.lerpVectors(this.previous.position, this.state.position, 0.5);
    for (const p of points) {
      for (const [rotation, origin] of [[_qMid, _pMid], [q, this.state.position]]) {
        _w.copy(p).applyQuaternion(rotation).add(origin);
        const label = this.solidAt(_w.x, _w.y, _w.z);
        if (label) return this.crash(label);
      }
    }
  }

  crash(reason) {
    this.crashed = true;
    this.crashReason = reason;
  }

  // Blend previous and current state for drawing. alpha is 0..1.
  interpolate(alpha, position = new Vector3(), quaternion = new Quaternion()) {
    position.lerpVectors(this.previous.position, this.state.position, alpha);
    quaternion.slerpQuaternions(this.previous.quaternion, this.state.quaternion, alpha);
    return { position, quaternion };
  }
}
