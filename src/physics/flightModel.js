// Flight model: adds up every force and moment on one aircraft.
// The player and (later) AI aircraft both go through advance(), so they
// obey exactly the same physics.

import { Vector3 } from 'three';
import { G, ISA } from '../core/constants.js';
import { atmosphere } from './atmosphere.js';
import { liftDrag, sideForce, momentCoefficients, wingConstants } from './aero.js';
import { enginePower, engineOmega, propellerThrust, rotaryEffects, torqueRigging, finRigging } from './engine.js';
import { deflections, updateSurfaces } from './controls.js';
import { stepRigidBody, worldToBody } from './rigidBody.js';
import { groundContact } from './ground.js';
import { propellerMoments, slipstreamPressure } from './propEffects.js';
import { wingLoss, lowerWingLoss, powerFactor, stoppedPropDrag, stoppedPropRpm, damagedDeflections, engineSeized, fuelOut, controlSpeed } from './damage.js';
import { DAMAGE as DMG } from '../aircraft/damageModel.js';
import { commonFor, warpAuthority } from './aircraftCommon.js';

const _vBody = new Vector3();

// Work out forces and moments for the current state. Does not change the state.
// Returns { force (world, N), moment (body, N m), momentum (body, kg m^2/s),
//           inertia, mass, diag (numbers for the debug overlay) }.
// damage (optional, physics/damage.js): wings, engine, tail and cables that are hurt. With none
// (or a fresh one) the result is exactly the undamaged aircraft's.
export function evaluate(ac, sharedCommon, state, surfaces, damage = null) {
  const common = commonFor(ac, sharedCommon); // the aircraft's own control values, if it has any
  const altitude = state.position.y;
  const air = atmosphere(altitude);
  const w = wingConstants(ac, common);
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
  const pilotDefl = deflections(common, surfaces);
  pilotDefl.roll *= warpAuthority(common, q, ISA.RHO0); // a warping wing gets too heavy to twist fully at speed
  const defl = damage ? damagedDeflections(damage, pilotDefl, common) : pilotDefl;

  const { cl, cd, stall } = liftDrag(ac, common, alpha);
  const lift0 = q * w.S * cl;
  // A warped wing is twisted out of its best shape and makes extra drag (wing warping only).
  const drag0 = common.cdWarp ? q * w.S * (cd + common.cdWarp * Math.abs(defl.roll)) : q * w.S * cd;
  const side = q * w.S * sideForce(common, beta);

  // Hurt wings: each loses part of its lift and makes more drag.
  let lossL = damage ? wingLoss(damage, 'L') : 0;
  let lossR = damage ? wingLoss(damage, 'R') : 0;
  let hurtL = damage ? Math.max(damage.wing.L, damage.failed.L ? 1 : 0) : 0;
  let hurtR = damage ? Math.max(damage.wing.R, damage.failed.R ? 1 : 0) : 0;
  // A weak lower wing (Nieuport 11) that is damaged or gone takes its share of that side's lift.
  const lowerL = damage ? lowerWingLoss(ac, damage, 'L') : 0;
  const lowerR = damage ? lowerWingLoss(ac, damage, 'R') : 0;
  if (lowerL) [lossL, hurtL] = [1 - (1 - lossL) * (1 - lowerL), Math.min(1, hurtL + lowerL)];
  if (lowerR) [lossR, hurtR] = [1 - (1 - lossR) * (1 - lowerR), Math.min(1, hurtR + lowerR)];
  const lift = lift0 * (1 - (lossL + lossR) / 2);
  const dragL = 0.5 * drag0 * DMG.wingDragGain * hurtL; // extra drag of each wing
  const dragR = 0.5 * drag0 * DMG.wingDragGain * hurtR;
  const stoppedDrag = damage ? stoppedPropDrag(ac, damage, q) : 0;
  const drag = drag0 + dragL + dragR + stoppedDrag;

  // Engine: damage cuts the power; a seized engine or an empty tank gives none.
  const factor = damage ? powerFactor(damage) : 1;
  const power = enginePower(ac, common, surfaces.throttle, air.density) * factor;
  const thrust = propellerThrust(ac, common, power, speed, air.density, surfaces.throttle);
  const rotary = damage && engineSeized(damage) ? { momentum: 0, torque: 0 } : rotaryEffects(ac, common, surfaces.throttle, power);

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
  if (damage) {
    // Tail damage weakens the pitch and yaw stability as well as the controls.
    const tailHurt = damage.failed.tailplane ? 1 : damage.tailplane;
    c.pitch += DMG.tailStabilityLoss * tailHurt * w.clAlpha * ac.aero.staticMargin * Math.sin(alpha);
    c.yaw -= DMG.tailStabilityLoss * damage.fin * ac.aero.cnBeta * beta;
    c.roll += stall * DMG.wingStallBias * (hurtR - hurtL); // a hurt wing drops first at the stall
  }
  // Slipstream over the tail, swirl on the fin and P-factor.
  const omegaProp = engineOmega(ac, common, surfaces.throttle) * ac.propeller.gearRatio;
  const prop = propellerMoments(ac, common, { thrust, shaftTorque: power / omegaProp, alpha, defl, w });
  const arm = DMG.liftArm * (w.b / 2); // where a half wing's lift acts
  const moment = new Vector3(
    q * w.S * w.b * c.roll + rotary.torque + torqueRigging(ac, common) + 0.5 * lift0 * (lossR - lossL) * arm, // roll about the nose (a wing that has lost lift drops)
    -(q * w.S * w.b * c.yaw + prop.yaw + finRigging(ac, common, q + common.tailWashFraction * slipstreamPressure(ac, thrust)) + (dragR - dragL) * arm), // yaw (nose-right is -Y; the draggier wing pulls the nose its way)
    q * w.S * w.chord * c.pitch + prop.pitch, // pitch (nose-up is +Z)
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
      rpm: damage && (engineSeized(damage) || fuelOut(damage))
        ? stoppedPropRpm(ac, damage, speed)
        : ((engineOmega(ac, common, surfaces.throttle) / (2 * Math.PI)) * 60) * ac.propeller.gearRatio,
      density: air.density / ISA.RHO0,
    },
  };
}

// Move the controls toward the input, then advance the aircraft by dt.
// This is the only place the ground acts: evaluate() is the free-air model
// used by the trim solver and performance calculations at any altitude.
export function advance(ac, sharedCommon, state, surfaces, input, dt, damage = null) {
  const common = commonFor(ac, sharedCommon);
  updateSurfaces(surfaces, input, common, damage ? dt * controlSpeed(damage) : dt); // a wounded pilot moves the controls slowly
  const e = evaluate(ac, common, state, surfaces, damage);
  const ground = groundContact(ac, common, state); // zero when clear of the ground
  e.force.add(ground.force);
  e.moment.add(ground.moment);
  stepRigidBody(state, e, dt);
  e.diag.onGround = ground.onGround;
  e.diag.crash = ground.crash;
  return e.diag;
}
