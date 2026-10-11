import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { createState, stepRigidBody } from '../../src/physics/rigidBody.js';
import { G } from '../../src/core/constants.js';

const DT = 1 / 120;
const ZERO = new Vector3();
const I = { x: 3000, y: 2000, z: 5000 };

function step(state, extra = {}) {
  stepRigidBody(
    state,
    { force: ZERO, moment: ZERO, momentum: ZERO, mass: 600, inertia: I, ...extra },
    DT,
  );
}

// Angular momentum in the world frame: R (I w).
function worldMomentum(state) {
  const w = state.angularVelocity;
  return new Vector3(I.x * w.x, I.y * w.y, I.z * w.z).applyQuaternion(state.quaternion);
}

describe('rigid body', () => {
  it('free fall matches 1/2 g t^2', () => {
    const s = createState();
    const gravity = new Vector3(0, -600 * G, 0);
    for (let i = 0; i < 240; i++) step(s, { force: gravity });
    expect(s.position.y / (-0.5 * G * 4)).toBeCloseTo(1, 2);
  });

  it('keeps the orientation a unit quaternion over 60 s of tumbling', () => {
    const s = createState();
    s.angularVelocity.set(1.2, 0.7, -0.9);
    for (let i = 0; i < 60 * 120; i++) step(s);
    expect(s.quaternion.length()).toBeCloseTo(1, 9);
  });

  it('turns by w x t when spinning about one axis', () => {
    const s = createState();
    s.angularVelocity.set(1.5, 0, 0);
    for (let i = 0; i < 120; i++) step(s); // 1 second
    // Rotation angle of the quaternion: 2 acos(w).
    expect(2 * Math.acos(s.quaternion.w)).toBeCloseTo(1.5, 2);
  });

  it('conserves angular momentum with no torque', () => {
    const s = createState();
    s.angularVelocity.set(0.8, 0.5, 0.3);
    const before = worldMomentum(s);
    for (let i = 0; i < 10 * 120; i++) step(s);
    const after = worldMomentum(s);
    expect(after.distanceTo(before) / before.length()).toBeLessThan(0.02);
  });

  it('a constant torque spins the body up at M / I', () => {
    const s = createState();
    const moment = new Vector3(0, 0, 1000);
    for (let i = 0; i < 120; i++) step(s, { moment });
    expect(s.angularVelocity.z).toBeCloseTo(1000 / I.z, 3);
  });

  it('gyroscopic effect: a spinning engine pitches the nose down in a right yaw', () => {
    // Engine angular momentum forward (+X). Yawing right is rotation about -Y.
    const s = createState();
    s.angularVelocity.set(0, -0.3, 0);
    const momentum = new Vector3(2900, 0, 0);
    step(s, { momentum });
    // Nose-up is +Z rotation, so a nose-down response is negative.
    expect(s.angularVelocity.z).toBeLessThan(0);
  });

  it('gyroscopic effect: the same engine pitches the nose up in a left yaw', () => {
    const s = createState();
    s.angularVelocity.set(0, 0.3, 0);
    step(s, { momentum: new Vector3(2900, 0, 0) });
    expect(s.angularVelocity.z).toBeGreaterThan(0);
  });

  it('a stationary body with no forces stays put', () => {
    const s = createState();
    for (let i = 0; i < 1000; i++) step(s);
    expect(s.position.length()).toBe(0);
  });
});
