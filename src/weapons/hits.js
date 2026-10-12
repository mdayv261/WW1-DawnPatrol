// Where a bullet's path of one physics step ends: in an aircraft (and which
// part), in the ground, or in a tree or building. The path is a straight line
// from the bullet's last position to its new one, so a fast bullet cannot pass
// through a thin wing between two steps. Aircraft are tested in their own body
// axes, using the aircraft's pose at the start and the end of the step, so a
// target moving across the path is handled too.

import { Vector3, Quaternion } from 'three';
import { common } from '../aircraft/common.js';
import { hitZones, segmentBoxEntry } from './zones.js';

const _a = new Vector3();
const _b = new Vector3();
const _q = new Quaternion();
const REACH = 12; // m, farther than this from an aircraft's centre cannot touch it (the widest span is 9 m)
const SOLID_SAMPLE = 1; // m between the points tested against trees and buildings

// Distance from point p to the segment a-b (all {x,y,z}-like numbers).
function distanceToSegment(px, py, pz, ax, ay, az, bx, by, bz) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len2 = dx * dx + dy * dy + dz * dz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / len2)) : 0;
  return Math.hypot(ax + t * dx - px, ay + t * dy - py, az + t * dz - pz);
}

// The parts that stop a bullet (it ends in the first of these along its path). Fabric, wood
// and wire (wings, tail, fuselage) are passed through, each taking a hit on the way.
const STOPS = new Set(['engine', 'fuel', 'pilot']);
const MAX_PARTS = 4; // a bullet that meets no stopping part ends after this many

// Earliest entry into any hit box of one aircraft: { t, zone, level, zones } or null. t, zone
// and level are the first part met; `zones` lists every part the bullet goes through, in
// order, up to the first part that stops it: [{ zone, level, t }].
// `ac` is the aircraft's data; `now` and `before` are its states at the end and
// `ac` is the aircraft's data; `now` and `before` are its states at the end and
// the start of the step ({ position, quaternion }).
export function aircraftImpact(ac, now, before, x0, y0, z0, x1, y1, z1) {
  const c = now.position;
  if (distanceToSegment(c.x, c.y, c.z, x0, y0, z0, x1, y1, z1) > REACH + before.position.distanceTo(c)) return null;

  // The bullet in the aircraft's axes at the start and the end of the step.
  _q.copy(before.quaternion).invert();
  _a.set(x0 - before.position.x, y0 - before.position.y, z0 - before.position.z).applyQuaternion(_q);
  _q.copy(now.quaternion).invert();
  _b.set(x1 - c.x, y1 - c.y, z1 - c.z).applyQuaternion(_q);

  const entries = [];
  for (const zone of hitZones(ac, common)) {
    const t = segmentBoxEntry(_a.x, _a.y, _a.z, _b.x, _b.y, _b.z, zone);
    if (t >= 0) entries.push({ zone: zone.name, level: zone.level, t });
  }
  if (!entries.length) return null;
  entries.sort((p, q) => p.t - q.t);
  const zones = [];
  for (const e of entries) {
    zones.push(e);
    if (STOPS.has(e.zone) || zones.length >= MAX_PARTS) break;
  }
  return { t: zones[0].t, zone: zones[0].zone, level: zones[0].level, zones };
}

// The first thing the bullet's step from (x0,y0,z0) to (x1,y1,z1) runs into.
//   targets: [{ id, aircraft, state, previous }]    solidAt(x, y, z) -> label | null (optional)
// Returns { kind: 'aircraft' | 'ground' | 'solid', t (0 to 1 along the step), target?, zone?, label? } or null.
export function findImpact(x0, y0, z0, x1, y1, z1, targets, solidAt = null) {
  let best = null;
  const consider = (hit) => {
    if (hit && (best === null || hit.t < best.t)) best = hit;
  };

  if (y1 <= 0 && y0 > 0) consider({ kind: 'ground', t: y0 / (y0 - y1) });
  else if (y0 <= 0) consider({ kind: 'ground', t: 0 });

  if (solidAt && Math.min(y0, y1) < 40) {
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    const n = Math.max(1, Math.ceil(len / SOLID_SAMPLE));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (best && t >= best.t) break;
      const label = solidAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t);
      if (label) {
        consider({ kind: 'solid', t, label });
        break;
      }
    }
  }

  for (const target of targets) {
    const hit = aircraftImpact(target.aircraft, target.state, target.previous, x0, y0, z0, x1, y1, z1);
    if (hit) consider({ kind: 'aircraft', t: hit.t, target, zone: hit.zone, level: hit.level, zones: hit.zones });
  }
  return best;
}
