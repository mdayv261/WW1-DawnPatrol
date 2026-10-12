// Hit boxes of an aircraft for bullets: the engine, fuel tank, pilot, fuselage,
// the wings (left and right, every level), tailplane and fin. Axis-aligned boxes
// in the aircraft's own body axes (+X nose, +Y up, +Z right wing, origin at the
// centre of gravity), worked out from the same documented dimensions as the 3D
// model and the crash points, with the proportions in ZONE_LAYOUT
// (src/aircraft/weapons.js). Vital zones come first, so where boxes overlap the
// vital one is reported.

import { common as defaultCommon } from '../aircraft/common.js';
import { ZONE_LAYOUT as Z } from '../aircraft/weapons.js';
import { wingLevels } from '../physics/wingLevels.js';

const cache = new WeakMap();

const box = (name, cx, cy, cz, hx, hy, hz, extra = {}) => ({ name, cx, cy, cz, hx, hy, hz, ...extra });

// Zones named: engine, fuel, pilot, fuselage, wingL, wingR, tailplane, fin.
export function hitZones(ac, common = defaultCommon) {
  let byCommon = cache.get(ac);
  if (!byCommon) {
    byCommon = new WeakMap();
    cache.set(ac, byCommon);
  }
  let zones = byCommon.get(common);
  if (zones) return zones;

  const L = ac.geometry.length;
  const v = ac.visual;
  const cowl = v.cowlingDiameter / 2;
  zones = [
    box('engine', Z.engineX * L, 0, 0, (Z.engineLength * L) / 2, cowl, cowl),
    box('fuel', Z.fuelX * L, 0, 0, (Z.fuelLength * L) / 2, Z.fuelSize / 2, Z.fuelSize / 2),
    box('pilot', -ac.cockpit.eyeBehind - 0.1, 0.2, 0, Z.pilotSize[0] / 2, Z.pilotSize[1] / 2, Z.pilotSize[2] / 2),
  ];
  // The fuselage from the tail to the front of the cockpit area.
  const front = 0.2 * L;
  const back = -0.65 * L;
  zones.push(box('fuselage', (front + back) / 2, 0, 0, (front - back) / 2, v.fuselageDepth / 2, v.fuselageWidth / 2));

  wingLevels(ac, common).forEach((w, level) => {
    const half = w.span / 2;
    const inner = 0.15 * half; // the part by the fuselage belongs to the fuselage
    const cy = (w.root + w.tip) / 2;
    const hy = Z.wingThickness + Math.abs(w.tip - w.root) / 2;
    for (const side of [-1, 1]) {
      zones.push(box(side < 0 ? 'wingL' : 'wingR', w.x, cy, (side * (half + inner)) / 2, w.chord / 2, hy, (half - inner) / 2, { level }));
    }
  });

  zones.push(box('tailplane', Z.tailX * L, 0.05, 0, v.tailChord / 2, Z.tailThickness, v.tailSpan / 2));
  zones.push(box('fin', Z.tailX * L, v.finHeight / 2, 0, v.tailChord / 2, v.finHeight / 2, 0.06));
  byCommon.set(common, zones);
  return zones;
}

// Where a line from a to b (points in body axes) first enters the box, as a
// fraction t of the way from a to b (0 to 1), or -1 if it misses. A line that
// starts inside gives 0.
export function segmentBoxEntry(ax, ay, az, bx, by, bz, z) {
  let t0 = 0;
  let t1 = 1;
  const slabs = [
    [ax - z.cx, bx - ax, z.hx],
    [ay - z.cy, by - ay, z.hy],
    [az - z.cz, bz - az, z.hz],
  ];
  for (const [p, d, h] of slabs) {
    if (Math.abs(d) < 1e-12) {
      if (Math.abs(p) > h) return -1;
      continue;
    }
    let ta = (-h - p) / d;
    let tb = (h - p) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return -1;
  }
  return t0;
}
