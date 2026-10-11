// Six-degrees-of-freedom rigid body.
//
// State: position and velocity in the world frame, orientation as a unit
// quaternion (body -> world), and angular velocity in the body frame.
// World frame: +Y up, -Z north, +X east. Body frame: +X nose, +Y up,
// +Z right wing (see docs/DECISIONS.md, D5).

import { Vector3, Quaternion } from 'three';

const _axis = new Vector3();
const _dq = new Quaternion();

export function createState() {
  return {
    position: new Vector3(),
    velocity: new Vector3(),
    quaternion: new Quaternion(),
    angularVelocity: new Vector3(),
  };
}

export function copyState(to, from) {
  to.position.copy(from.position);
  to.velocity.copy(from.velocity);
  to.quaternion.copy(from.quaternion);
  to.angularVelocity.copy(from.angularVelocity);
  return to;
}

export function bodyToWorld(state, v, out = new Vector3()) {
  return out.copy(v).applyQuaternion(state.quaternion);
}

export function worldToBody(state, v, out = new Vector3()) {
  const inverse = _dq.copy(state.quaternion).invert();
  return out.copy(v).applyQuaternion(inverse);
}

// Advance the body by dt seconds.
//   force   - total force, world frame (N)
//   moment  - total moment about the centre of mass, body frame (N m)
//   momentum- internal angular momentum of spinning parts (engine), body frame (kg m^2/s)
//   mass, inertia {x,y,z} - principal inertia about the body axes (kg m^2)
// Rotation obeys Euler's equation:  I dw/dt = M - w x (I w + H)
export function stepRigidBody(state, { force, moment, momentum, mass, inertia }, dt) {
  // Linear motion (semi-implicit: new velocity moves the position).
  state.velocity.addScaledVector(force, dt / mass);
  state.position.addScaledVector(state.velocity, dt);

  // Angular motion in the body frame.
  const w = state.angularVelocity;
  const hx = inertia.x * w.x + momentum.x;
  const hy = inertia.y * w.y + momentum.y;
  const hz = inertia.z * w.z + momentum.z;
  const gx = w.y * hz - w.z * hy; // w x h
  const gy = w.z * hx - w.x * hz;
  const gz = w.x * hy - w.y * hx;
  w.x += ((moment.x - gx) / inertia.x) * dt;
  w.y += ((moment.y - gy) / inertia.y) * dt;
  w.z += ((moment.z - gz) / inertia.z) * dt;

  // Orientation: rotate by the angle turned this step about the body axis.
  const angle = w.length() * dt;
  if (angle > 1e-12) {
    _axis.copy(w).normalize();
    _dq.setFromAxisAngle(_axis, angle);
    state.quaternion.multiply(_dq).normalize();
  }
  return state;
}
