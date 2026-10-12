// The AI pilot's hands: turns a wanted direction of flight (and a wanted speed) into the
// same ControlInput a person gives: stick, rudder and throttle. Nothing here can do more
// than a person at the controls, because the input goes through Simulation.step like the
// player's. It banks the lift toward the wanted direction, pulls to the load factor that
// turn needs, keeps the turn coordinated, holds a speed, and has two safety nets a careful
// pilot would have: never pull into a stall, and never fly into the ground or a tree.

import { Vector3, Quaternion } from 'three';
import { STEERING as S } from '../aircraft/aiData.js';
import { DAMAGE } from '../aircraft/damageModel.js';
import { common } from '../aircraft/common.js';
import { wingConstants } from '../physics/aero.js';
import { G } from '../core/constants.js';

const clamp = (v, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, v));

const _v = new Vector3();
const _nose = new Vector3();
const _up = new Vector3();
const _e = new Vector3();
const _f = new Vector3();
const _l = new Vector3();
const _x = new Vector3();
const _probe = new Vector3();
const _w = new Vector3();
const _qi = new Quaternion();
const _b = new Vector3();
const _dv = new Vector3();

export class Pilot {
  constructor(aircraft) {
    this.aircraft = aircraft;
    this.iPull = 0; // the stick's integral term (g error)
    this.iThrottle = 0;
    this.started = false;
    this.debug = { roll: 0, nCmd: 0, nTarget: 0, nMax: 0, recovering: false, avoiding: false };
  }

  // The most load factor the pilot will ask for now: the aircraft's structural limit
  // (times the skill's share), and a share of what the wing can lift at this speed.
  maxLoad(sim, share) {
    const ac = this.aircraft;
    const limitLoad = ac.structure.ultimateLoad / DAMAGE.safetyFactor;
    const q = sim.diag ? sim.diag.dynamicPressure : 0;
    const lift = (S.stallMargin * q * wingConstants(ac, common).S * ac.aero.clMax) / (ac.mass.loaded * G);
    return Math.max(1, Math.min(share * limitLoad, lift));
  }

  // The direction to fly after the safety nets: away from the ground or a tree if it is
  // heading for one. Returns { dir, urgent }.
  safeDirection(sim, dir, solidAt) {
    const s = sim.state;
    const alt = s.position.y;
    const vy = s.velocity.y;
    const dive = alt + vy * S.floorLookahead;
    let danger = dive < S.floor || (alt < S.floor && vy < 0);
    this.debug.avoiding = false;
    if (!danger && solidAt && alt < S.obstacleCeiling) {
      const speed = s.velocity.length();
      const steps = Math.ceil((speed * S.obstacleLookahead) / 15);
      for (let i = 1; i <= steps && !danger; i++) {
        _probe.copy(s.velocity).multiplyScalar((S.obstacleLookahead * i) / steps).add(s.position);
        if (solidAt(_probe.x, _probe.y, _probe.z)) {
          danger = true;
          this.debug.avoiding = true;
        }
      }
    }
    this.debug.recovering = danger;
    if (!danger) return { dir, urgent: false };
    // Climb away along the present heading (or the nose if it is going nearly straight down).
    _e.set(s.velocity.x, 0, s.velocity.z);
    if (_e.length() < 5) _e.set(1, 0, 0).applyQuaternion(s.quaternion).setY(0);
    if (_e.lengthSq() < 1e-6) _e.set(0, 0, -1);
    _e.normalize();
    return { dir: new Vector3(_e.x, S.recoverClimb, _e.z).normalize(), urgent: true };
  }

  // want: { dir (unit world vector), speed (m/s), gShare (share of the limit load), gain (optional: turn gain, 1/s) }.
  // Returns a ControlInput. solidAt(x, y, z) tells about trees and buildings (optional).
  steer(sim, want, dt, solidAt = null) {
    const ac = this.aircraft;
    const s = sim.state;
    const input = { ...sim.startInput, fire: false };
    const diag = sim.diag;
    if (!diag) return input;
    if (!this.started) {
      this.started = true;
      this.iPull = 0;
      this.iThrottle = 0;
    }
    const speed = s.velocity.length();
    const vhat = _v.copy(s.velocity).divideScalar(Math.max(speed, 1e-6));
    const nose = _nose.set(1, 0, 0).applyQuaternion(s.quaternion);
    const upBody = _up.set(0, 1, 0).applyQuaternion(s.quaternion);

    // Speed before height: when the engine cannot hold the wanted speed in a climb, the nose comes down.
    let wanted = want.dir;
    if (wanted.y > 0.01 && diag.speed < want.speed) {
      const ease = clamp(1 - (want.speed - diag.speed) / (S.climbSpeedMargin * want.speed), 0, 1);
      wanted = _probe.copy(wanted).setY(wanted.y * ease).normalize().clone();
    }
    // And it never dives faster than its wings are safe: the dive flattens as it nears the never-exceed speed.
    if (wanted.y < -0.01) {
      const vne = ac.structure.neverExceedSpeed;
      const eas = diag.speed * Math.sqrt(diag.density);
      const ease = clamp((S.diveSpeedFraction * vne - eas) / (S.diveEaseBand * vne), 0, 1);
      if (ease < 1) wanted = _probe.copy(wanted).setY(wanted.y * ease).normalize().clone();
    }
    let safe = this.safeDirection(sim, wanted, solidAt);
    // Diving too fast whatever it wanted (a manoeuvre gone steep): pull out now, as hard as is safe.
    const easNow = diag.speed * Math.sqrt(diag.density);
    if (!safe.urgent && s.velocity.y < 0 && easNow > S.overspeedPullOut * ac.structure.neverExceedSpeed) {
      _e.set(s.velocity.x, 0, s.velocity.z);
      if (_e.lengthSq() < 1) _e.set(1, 0, 0).applyQuaternion(s.quaternion).setY(0);
      _e.normalize();
      safe = { dir: new Vector3(_e.x, S.recoverClimb * 0.5, _e.z).normalize(), urgent: true };
      this.debug.recovering = true;
    }
    const dir = safe.dir;
    const nMax = this.maxLoad(sim, safe.urgent ? S.urgentShare : want.gShare);
    this.debug.nMax = nMax;

    // The turn wanted: toward `dir`, in the plane of the two directions.
    const cosA = clamp(vhat.dot(dir), -1, 1);
    const angle = Math.acos(cosA);
    _e.copy(dir).addScaledVector(vhat, -cosA); // the part of the wanted direction across the flight path
    if (_e.lengthSq() < 1e-8) _e.set(0, 1, 0).addScaledVector(vhat, -vhat.y); // straight on or straight back: turn up
    if (_e.lengthSq() < 1e-8) _e.set(1, 0, 0);
    _e.normalize();
    // The turn rate it already has toward the wanted direction damps the demand (so it does not overshoot).
    _w.copy(s.angularVelocity).applyQuaternion(s.quaternion);
    _dv.crossVectors(_w, vhat);
    const rateToward = _dv.dot(_e);
    const lateral = clamp((want.gain ?? S.turnGain) * angle * Math.max(speed, 10) - (want.damping ?? S.turnDamping) * Math.max(speed, 10) * rateToward, 0, nMax * G * 0.999); // m/s^2 across the path

    // The force the wing must give: the turn, plus holding the aircraft up (gravity), across the path.
    _f.copy(_e).multiplyScalar(lateral).y += G;
    _f.addScaledVector(vhat, -_f.dot(vhat));
    const fMag = Math.max(_f.length(), 1e-6);
    const nCmd = Math.min(fMag / G, nMax);
    _l.copy(_f).divideScalar(fMag); // the direction the lift should point

    // Roll the lift toward that direction (about the nose).
    _x.crossVectors(upBody, _l);
    const phi = Math.atan2(_x.dot(nose), upBody.dot(_l));
    const p = s.angularVelocity.x;
    input.roll = clamp(S.rollGain * phi - S.rollDamping * p);

    // Pull to the load factor wanted, once the lift is on its way round.
    const aligned = clamp(Math.cos(phi), 0, 1);
    const nTarget = Math.max(0.3, nCmd * aligned);
    const qRef = 0.5 * 1.225 * (S.referenceSpeed * ac.documented.maxSpeed) ** 2;
    const scale = clamp(qRef / Math.max(diag.dynamicPressure, 1), 0.5, S.maxGainScale);
    const err = nTarget - diag.loadFactor;
    this.iPull = clamp(this.iPull + S.loadIntegral * err * dt * scale, -S.loadIntegralLimit, S.loadIntegralLimit);
    input.pull = clamp(S.loadGain * scale * err + this.iPull - S.pitchDamping * scale * s.angularVelocity.z, -1, 1);
    // A hard stop at the load it allows itself: an overshoot is taken off at once.
    const over = diag.loadFactor - nMax;
    if (over > 0) {
      input.pull = Math.max(-1, input.pull - 4 * S.loadGain * scale * over);
      this.iPull = Math.max(-S.loadIntegralLimit, this.iPull - 4 * S.loadIntegral * scale * over * dt);
    }
    // A pilot near a stall lets the nose drop.
    if (diag.stall > S.stallStall) {
      input.pull = Math.min(input.pull, S.unloadPull);
      this.iPull = Math.min(this.iPull, 0);
    }

    input.yaw = clamp(S.sideslipGain * diag.beta);

    input.throttle = this.throttle(want.speed, diag.speed, dt);

    this.debug.roll = phi;
    this.debug.nCmd = nCmd;
    this.debug.nTarget = nTarget;
    return input;
  }
}

// The throttle that holds a speed.
Pilot.prototype.throttle = function throttle(wanted, speed, dt) {
  const sErr = wanted - speed;
  this.iThrottle = clamp(this.iThrottle + S.throttleIntegral * sErr * dt, -0.5, 0.5);
  return clamp(0.5 + S.throttleGain * sErr + this.iThrottle, 0, 1);
};

// Fine aiming: once the nose is within a few degrees of the aim point, a pilot stops banking
// and steering the whole aircraft and nudges the nose on with rudder and elevator (and a little
// bank). aimDir: unit world vector the guns should point along; speed: the speed wanted.
Pilot.prototype.aimNose = function aimNose(sim, aimDir, speed, dt, gShare = 1) {
  const s = sim.state;
  const diag = sim.diag;
  const input = { ...sim.startInput, fire: false };
  if (!diag) return input;
  _b.copy(aimDir).applyQuaternion(_qi.copy(s.quaternion).invert()); // in the aircraft's own axes
  const yawErr = Math.atan2(_b.z, _b.x); // + = aim point to the right
  const pitchErr = Math.atan2(_b.y, Math.hypot(_b.x, _b.z)); // + = above the nose
  const w = s.angularVelocity; // body axes: x roll (+ right wing down), y yaw (+ nose left), z pitch (+ nose up)
  const ac = this.aircraft;
  const qRef = 0.5 * 1.225 * (S.referenceSpeed * ac.documented.maxSpeed) ** 2;
  const scale = clamp(qRef / Math.max(diag.dynamicPressure, 1), 0.5, S.maxGainScale);
  input.yaw = clamp(S.aimYaw * scale * yawErr + S.aimYawDamping * scale * w.y + S.sideslipGain * 0.3 * diag.beta);
  input.roll = clamp(S.aimRoll * yawErr - S.rollDamping * w.x);
  this.iPull = clamp(this.iPull + S.aimPitchIntegral * scale * pitchErr * dt, -S.loadIntegralLimit, S.loadIntegralLimit);
  input.pull = clamp(S.aimPitch * scale * pitchErr + this.iPull - S.pitchDamping * scale * w.z);
  // Never more than the load it allows itself (the same limit as in steer()).
  const over = diag.loadFactor - this.maxLoad(sim, gShare);
  if (over > 0) {
    input.pull = Math.max(-1, input.pull - S.loadGain * scale * 4 * over);
    this.iPull = Math.max(-S.loadIntegralLimit, this.iPull - S.loadIntegral * scale * over * dt * 4);
  }
  if (diag.stall > S.stallStall) {
    input.pull = Math.min(input.pull, S.unloadPull);
    this.iPull = Math.min(this.iPull, 0);
  }
  input.throttle = this.throttle(speed, diag.speed, dt);
  this.debug.yawErr = yawErr;
  this.debug.pitchErr = pitchErr;
  return input;
};

// A direction from a heading (radians, 0 = north, east positive) and a slope (rise over run).
export function directionFrom(heading, slope, out = new Vector3()) {
  return out.set(Math.sin(heading), slope, -Math.cos(heading)).normalize();
}
