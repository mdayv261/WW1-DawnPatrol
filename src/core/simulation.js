// The running simulation: one aircraft's physical state, stepped at a fixed
// rate. Keeps the previous state so the renderer can blend between steps.

import { Quaternion, Vector3 } from 'three';
import { common } from '../aircraft/index.js';
import { advance } from '../physics/flightModel.js';
import { trimLevel } from '../physics/trim.js';
import { createState, copyState } from '../physics/rigidBody.js';
import { createInput } from '../physics/controls.js';

export const START_ALTITUDE = 1000; // m
export const START_SPEED_FRACTION = 0.8; // of the documented top speed
const GROUND_CLEARANCE = 1.0; // m; below this the aircraft has hit the ground

export class Simulation {
  constructor() {
    this.aircraft = null;
    this.state = createState();
    this.previous = createState();
    this.surfaces = null;
    this.diag = null;
    this.crashed = false;
    this.time = 0;
    // The neutral controls the flight starts with (throttle and trim from the trim solver).
    this.startInput = createInput();
  }

  // Begin a new flight in trimmed level flight.
  start(aircraft, altitude = START_ALTITUDE) {
    const trim = trimLevel(aircraft, common, altitude, START_SPEED_FRACTION * aircraft.documented.maxSpeed);
    this.aircraft = aircraft;
    copyState(this.state, trim.state);
    copyState(this.previous, trim.state);
    this.surfaces = trim.surfaces;
    this.startInput = createInput();
    this.startInput.throttle = trim.surfaces.throttle;
    this.startInput.trim = trim.surfaces.trim;
    this.crashed = false;
    this.time = 0;
    this.diag = null;
    return this.startInput;
  }

  // Advance by one fixed physics step.
  step(dt, input) {
    if (!this.aircraft || this.crashed) return;
    copyState(this.previous, this.state);
    this.diag = advance(this.aircraft, common, this.state, this.surfaces, input, dt);
    this.time += dt;
    if (this.state.position.y < GROUND_CLEARANCE) this.crashed = true;
  }

  // Blend previous and current state for drawing. alpha is 0..1.
  interpolate(alpha, position = new Vector3(), quaternion = new Quaternion()) {
    position.lerpVectors(this.previous.position, this.state.position, alpha);
    quaternion.slerpQuaternions(this.previous.quaternion, this.state.quaternion, alpha);
    return { position, quaternion };
  }
}
