// Flight model: adds up every force and moment on one aircraft.
// The player and (later) AI aircraft both go through advance(), so they
// obey exactly the same physics.

import { Vector3 } from 'three';
import { G, ISA } from '../core/constants.js';
import { atmosphere } from './atmosphere.js';
import { liftDrag, sideForce, momentCoefficients, wingConstants } from './aero.js';
import { enginePower, engineOmega, propellerThrust, rotaryEffects, torqueRigging } from './engine.js';
import { deflections, updateSurfaces } from './controls.js';
import { stepRigidBody, worldToBody } from './rigidBody.js';

const _vBody = new Vector3();

// Work out forces and moments for the current state. Does not change the state.
// Returns { force (world, N), moment (body, N m), momentum (body, kg m^2/s),
//           inertia, mass, diag (numbers for the debug overlay) }.
export function evaluate(ac, common, state, surfaces) {
  const altitude = state.position.y;
  const air = atmosphere(altitude);
  const w = wingConstants(ac);
  const mass = ac.mass.loaded;

  const vBody = worldToBody(state, state.velocity, _vBody);
  const speed = vBody.length();
  const omega = state.angularVelocity;

  // Aeroplane axes: x forward, y right, z down (body Z is right, Y is up).
  const u = vBody.x;
  const v = vBody.z;
  const wz = -vBody.y;
  const alpha = speed > 0.1 ? Math.atan2(wz, u) : 0;
  const beta = speed > 0.1 ? Math.asin(Math.max(-1, Math.min(1, v / speed))) : 0;
  const q = 0.5 * air.density * speed * speed;
  const defl = deflections(common, surfaces);

  const { cl, cd, stall } = liftDrag(ac, common, alpha);
  const lift = q * w.S * cl;
  const drag = q * w.S * cd;
  const side = q * w.S * sideForce(common, beta);

  const power = enginePower(ac, common, surfaces.throttle, air.density);
  const thrust = propellerThrust(ac, common, power, speed, air.density);
  const rotary = rotaryEffects(ac, common, surfaces.throttle, power);

  // Aero force in aeroplane axes, then converted to body axes.
  const sa = Math.sin(alpha);
  const ca = Math.cos(alpha);
  const sb = Math.sin(beta);
  const cb = Math.cos(beta);
  const fx = -drag * ca * cb - side * ca * sb + lift * sa;
  const fy = -drag * sb + side * cb;
  const fz = -drag * sa * cb - side * sa * sb - lift * ca;
  const forceBody = new Vector3(fx + thrust, -fz, fy);
  const loadFactor = -fz / (mass * G);

  const force = forceBody.clone().applyQuaternion(state.quaternion);
  force.y -= mass * G;

  // Moments: coefficients are in aeroplane axes (roll p, pitch q, yaw r).
  const c = momentCoefficients(ac, common, {
    alpha,
    beta,
    speed,
    rates: { p: omega.x, q: omega.z, r: -omega.y },
    defl,
    stall,
  });
  const moment = new Vector3(
    q * w.S * w.b * c.roll + rotary.torque + torqueRigging(ac, common), // roll about the nose
    -q * w.S * w.b * c.yaw, // yaw (nose-right is -Y)
    q * w.S * w.chord * c.pitch, // pitch (nose-up is +Z)
  );

  return {
    force,
    moment,
    momentum: new Vector3(rotary.momentum, 0, 0),
    inertia: { x: ac.mass.ixx, y: ac.mass.iyy, z: ac.mass.izz },
    mass,
    diag: {
      altitude,
      speed,
      alpha,
      beta,
      dynamicPressure: q,
      lift,
      drag,
      thrust,
      power,
      loadFactor,
      stall,
      cl,
      cd,
      rpm: ((engineOmega(ac, common, surfaces.throttle) / (2 * Math.PI)) * 60) * ac.propeller.gearRatio,
      density: air.density / ISA.RHO0,
    },
  };
}

// Move the controls toward the input, then advance the aircraft by dt.
export function advance(ac, common, state, surfaces, input, dt) {
  updateSurfaces(surfaces, input, common, dt);
  const e = evaluate(ac, common, state, surfaces);
  stepRigidBody(state, e, dt);
  return e.diag;
}
