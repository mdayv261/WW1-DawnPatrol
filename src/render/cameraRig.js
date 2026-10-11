// The three views: cockpit, chase and free-look. C cycles them. In the
// cockpit, holding the right mouse button (or toggling with V) lets the mouse
// look around; letting go eases the view back forward. Free-look orbits the
// aircraft with the mouse; the wheel zooms. Rendering only: never touches
// the physics.

import { Vector3 } from 'three';
import { ChaseCamera } from './chaseCamera.js';
import { eyePosition } from './cockpit.js';

export const MODES = ['cockpit', 'chase', 'free'];
const LOOK_RATE = 0.004; // radians per pixel of mouse movement
const NEAR = { cockpit: 0.05, chase: 1, free: 1 };

const _eye = new Vector3();
const _dir = new Vector3();
const _up = new Vector3();

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.chase = new ChaseCamera(camera);
    this.mode = 'chase';
    this.lookYaw = 0; // cockpit head turn, + = right
    this.lookPitch = 0; // + = up
    this.lookButton = false;
    this.lookToggle = false;
    this.orbitYaw = Math.PI; // free-look: start behind
    this.orbitPitch = 0.25;
    this.orbitDistance = 18;
  }

  cycle() {
    this.mode = MODES[(MODES.indexOf(this.mode) + 1) % MODES.length];
    this.chase.reset();
    return this.mode;
  }

  get looking() {
    return this.mode === 'cockpit' && (this.lookButton || this.lookToggle);
  }

  // True when mouse movement should move the view instead of the stick.
  wantsMouse() {
    return this.mode === 'free' || this.looking;
  }

  look(dx, dy) {
    if (this.mode === 'free') {
      this.orbitYaw += dx * LOOK_RATE;
      this.orbitPitch = Math.max(-1.2, Math.min(1.4, this.orbitPitch + dy * LOOK_RATE));
    } else {
      this.lookYaw = Math.max(-2.6, Math.min(2.6, this.lookYaw + dx * LOOK_RATE));
      this.lookPitch = Math.max(-0.9, Math.min(1.3, this.lookPitch - dy * LOOK_RATE));
    }
  }

  zoom(deltaY) {
    this.orbitDistance = Math.max(6, Math.min(120, this.orbitDistance * Math.exp(deltaY * 0.001)));
  }

  reset() {
    this.chase.reset();
    this.lookYaw = 0;
    this.lookPitch = 0;
  }

  update(aircraft, position, quaternion, dt) {
    const cam = this.camera;
    if (cam.near !== NEAR[this.mode]) {
      cam.near = NEAR[this.mode];
      cam.updateProjectionMatrix();
    }
    if (this.mode === 'chase') {
      this.chase.update(position, quaternion, dt);
      return;
    }
    if (this.mode === 'free') {
      const cp = Math.cos(this.orbitPitch);
      cam.position.set(
        position.x + this.orbitDistance * cp * Math.sin(this.orbitYaw),
        position.y + this.orbitDistance * Math.sin(this.orbitPitch),
        position.z - this.orbitDistance * cp * Math.cos(this.orbitYaw),
      );
      cam.position.y = Math.max(cam.position.y, 1);
      cam.up.set(0, 1, 0);
      cam.lookAt(position);
      return;
    }
    // Cockpit: at the pilot's eye, turning with the aircraft.
    if (!this.looking) {
      const k = 1 - Math.exp(-6 * dt); // ease the head back forward
      this.lookYaw -= this.lookYaw * k;
      this.lookPitch -= this.lookPitch * k;
    }
    const e = eyePosition(aircraft);
    _eye.set(e.x, e.y, e.z).applyQuaternion(quaternion).add(position);
    const cp = Math.cos(this.lookPitch);
    _dir.set(cp * Math.cos(this.lookYaw), Math.sin(this.lookPitch), cp * Math.sin(this.lookYaw)).applyQuaternion(quaternion);
    _up.set(0, 1, 0).applyQuaternion(quaternion);
    cam.position.copy(_eye);
    cam.up.copy(_up);
    cam.lookAt(_eye.add(_dir));
  }
}
