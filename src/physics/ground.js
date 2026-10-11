// Ground handling: two main wheels and a tailskid touching a flat field
// (y = 0), plus "crash points" (propeller tip, lower wingtips) that end the
// flight if they touch. No brakes and no steerable tailwheel, as in WWI:
// the rudder and the dragging tailskid are the only steering.
//
// Each contact is a spring and damper (the tyres and rubber-cord bungees),
// with friction along and across the direction the aircraft points.
// All tuning numbers are estimates in src/aircraft/common.js and the
// undercarriage layout is in each aircraft's `gear` block.

import { Vector3 } from 'three';
import { G } from '../core/constants.js';

const cache = new WeakMap();

// Body-axis positions of the contacts and their spring constants, worked out
// once per aircraft. Main wheel contact height comes from the propeller
// clearance; the tailskid height from the three-point attitude.
export function gearGeometry(ac, common) {
  let byCommon = cache.get(ac);
  if (!byCommon) {
    byCommon = new WeakMap();
    cache.set(ac, byCommon);
  }
  let g = byCommon.get(common);
  if (g) return g;

  const L = ac.geometry.length;
  const D = ac.propeller.diameter;
  const { track, mainAhead, tailAt, groundAngle: theta } = ac.gear;
  const contactY = -(D / 2 + common.propClearance);
  const mainX = mainAhead * L;
  const tailX = -tailAt * L;
  // In the three-point attitude the wheels and the skid touch together.
  const tailY = contactY + (mainX - tailX) * Math.tan(theta);

  // Share of the weight on the tailskid in the three-point attitude, from
  // the horizontal distances of the contacts ahead of and behind the CG.
  const ahead = mainX * Math.cos(theta) - contactY * Math.sin(theta);
  const behind = tailX * Math.cos(theta) - tailY * Math.sin(theta);
  const tailShare = ahead / (ahead - behind);

  const weight = ac.mass.loaded * G;
  const kMain = ((1 - tailShare) * weight) / 2 / common.gearStaticDeflection;
  const kTail = (tailShare * weight) / common.skidStaticDeflection;
  const damping = (k, share) => 2 * common.gearDampingRatio * Math.sqrt(k * ac.mass.loaded * share);

  const lowerSpan = ac.wingStack ? ac.wingStack[ac.wingStack.length - 1].span : ac.geometry.wingspan;
  g = {
    contactY,
    mainX,
    tailX,
    tailY,
    tailShare,
    contacts: [
      { name: 'left wheel', kind: 'wheel', p: new Vector3(mainX, contactY, -track / 2), k: kMain, c: damping(kMain, (1 - tailShare) / 2) },
      { name: 'right wheel', kind: 'wheel', p: new Vector3(mainX, contactY, track / 2), k: kMain, c: damping(kMain, (1 - tailShare) / 2) },
      { name: 'tailskid', kind: 'skid', p: new Vector3(tailX, tailY, 0), k: kTail, c: damping(kTail, tailShare) },
    ],
    // Touching the ground with any of these ends the flight.
    crashPoints: [
      { name: 'Propeller strike', p: new Vector3(0.36 * L + 0.05, -D / 2, 0) },
      { name: 'Left wingtip struck the ground', p: new Vector3(0.1, -0.3, -lowerSpan / 2) },
      { name: 'Right wingtip struck the ground', p: new Vector3(0.1, -0.3, lowerSpan / 2) },
    ],
  };
  byCommon.set(common, g);
  return g;
}

const _w = new Vector3();
const _v = new Vector3();
const _f = new Vector3();
const _fwd = new Vector3();
const _lat = new Vector3();
const _inv = new Vector3();

// Ground forces on the aircraft this step.
// Returns { force (world, N), moment (body, N m), onGround, crash (reason or null) }.
// state.chocked (optional): chocks in front of the wheels stop it rolling.
export function groundContact(ac, common, state) {
  const g = gearGeometry(ac, common);
  const force = new Vector3();
  const moment = new Vector3();
  let onGround = false;
  let crash = null;

  // Horizontal directions along and across the aircraft, for friction.
  _fwd.set(1, 0, 0).applyQuaternion(state.quaternion);
  _fwd.y = 0;
  if (_fwd.lengthSq() < 1e-9) _fwd.set(0, 0, -1);
  _fwd.normalize();
  _lat.set(-_fwd.z, 0, _fwd.x);

  for (const c of g.contacts) {
    _w.copy(c.p).applyQuaternion(state.quaternion).add(state.position);
    const penetration = -_w.y;
    if (penetration <= 0) continue;
    onGround = true;

    // Velocity of the contact point: v + R (w x p).
    _v.copy(state.angularVelocity).cross(c.p).applyQuaternion(state.quaternion).add(state.velocity);
    if (_v.y < -common.crashSinkRate) crash = 'Heavy landing: the undercarriage collapsed';

    const normal = Math.max(0, c.k * penetration - c.c * _v.y);
    const along = _v.dot(_fwd);
    const across = _v.dot(_lat);
    _f.set(0, normal, 0);
    if (c.kind === 'wheel') {
      const rolling = state.chocked ? 2.0 : common.wheelRollingFriction;
      _f.addScaledVector(_fwd, -rolling * normal * Math.tanh(along / (state.chocked ? 0.02 : 0.3)));
      _f.addScaledVector(_lat, -common.wheelSideFriction * normal * Math.tanh(across / 0.3));
    } else {
      const slide = Math.hypot(along, across);
      if (slide > 1e-6) {
        const k = (-common.skidFriction * normal * Math.tanh(slide / 0.2)) / slide;
        _f.addScaledVector(_fwd, k * along).addScaledVector(_lat, k * across);
      }
    }
    force.add(_f);
    // Moment about the centre of gravity, in body axes: p x F_body.
    _inv.copy(_f).applyQuaternion(state.quaternion.clone().invert());
    moment.add(c.p.clone().cross(_inv));
  }

  for (const p of g.crashPoints) {
    _w.copy(p.p).applyQuaternion(state.quaternion).add(state.position);
    if (_w.y < 0) {
      crash = p.name;
      break;
    }
  }
  return { force, moment, onGround, crash };
}

// Height of the centre of gravity and pitch for resting on the ground in the
// three-point attitude with the springs compressed under the weight.
export function restingPose(ac, common) {
  const g = gearGeometry(ac, common);
  const theta = ac.gear.groundAngle;
  const height = -common.gearStaticDeflection - (g.mainX * Math.sin(theta) + g.contactY * Math.cos(theta));
  return { height, pitch: theta };
}
