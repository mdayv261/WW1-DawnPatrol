// The points of an aircraft that crash it if they touch a tree or a building:
// the propeller hub and tips, every wing tip (front and rear) and each wing's
// centre leading edge, the tailplane tips, tail end and fin top, the wheels and
// tailskid, and the top of the fuselage. Body axes: +X nose, +Y up, +Z right
// wing, origin at the centre of gravity. Worked out from the aircraft's own
// data (the same figures the 3D model is built from), so the crash shape and
// the picture agree. About 25 points a type.

import { Vector3 } from 'three';
import { gearGeometry } from './ground.js';
import { wingLevels } from './wingLevels.js';

const cache = new WeakMap();

export function hitPoints(ac, common) {
  let byCommon = cache.get(ac);
  if (!byCommon) {
    byCommon = new WeakMap();
    cache.set(ac, byCommon);
  }
  let pts = byCommon.get(common);
  if (pts) return pts;

  const v = ac.visual;
  const L = ac.geometry.length;
  const D = ac.propeller.diameter;
  const g = gearGeometry(ac, common);
  const propX = 0.36 * L + 0.05;
  pts = [
    new Vector3(0.36 * L + 0.1, 0, 0), // propeller hub
    new Vector3(propX, D / 2, 0), new Vector3(propX, -D / 2, 0), // propeller tips, up and down
    new Vector3(propX, 0, D / 2), new Vector3(propX, 0, -D / 2), // and to each side
    new Vector3(0.2 * L, 0.5, 0), new Vector3(0, 0.55, 0), // top of the fuselage
  ];

  // Wings, top first.
  for (const w of wingLevels(ac, common)) {
    for (const side of [-1, 1]) {
      pts.push(new Vector3(w.x + w.chord / 2, w.tip, (side * w.span) / 2), new Vector3(w.x - w.chord / 2, w.tip, (side * w.span) / 2));
    }
    pts.push(new Vector3(w.x + w.chord / 2, w.root, 0)); // the wing's centre leading edge
  }

  // Tail.
  for (const side of [-1, 1]) pts.push(new Vector3(-0.55 * L, 0.05, (side * v.tailSpan) / 2));
  pts.push(new Vector3(-0.65 * L, 0.1, 0), new Vector3(-0.6 * L, v.finHeight + 0.05, 0));

  // Wheels and tailskid (the ground model handles the ground; these catch trees and buildings).
  for (const c of g.contacts) pts.push(c.p.clone());

  byCommon.set(common, pts);
  return pts;
}
