// Follow camera: sits behind and above the aircraft, smoothed so it trails a
// little in manoeuvres, and keeps the horizon level (it does not roll).

import { Vector3 } from 'three';

const DISTANCE = 11; // m behind
const HEIGHT = 3.5; // m above
const LOOK_AHEAD = 12; // m in front of the aircraft
const FOLLOW_RATE = 6; // higher = tighter follow

const _forward = new Vector3();
const _desired = new Vector3();
const _look = new Vector3();

export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;
    this.snap = true;
  }

  // Jump straight to the aircraft on the next update (new flight).
  reset() {
    this.snap = true;
  }

  update(position, quaternion, dt) {
    _forward.set(1, 0, 0).applyQuaternion(quaternion);
    _desired.copy(position).addScaledVector(_forward, -DISTANCE);
    _desired.y += HEIGHT;
    _look.copy(position).addScaledVector(_forward, LOOK_AHEAD);

    if (this.snap) {
      this.camera.position.copy(_desired);
      this.snap = false;
    } else {
      const k = 1 - Math.exp(-FOLLOW_RATE * dt);
      this.camera.position.lerp(_desired, k);
    }
    // Never let the camera go below the ground.
    this.camera.position.y = Math.max(this.camera.position.y, 2);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(_look);
  }
}
