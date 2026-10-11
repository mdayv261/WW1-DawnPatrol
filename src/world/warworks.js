// What the war left on the ground: sandbags on the parapets, dugout entrances
// on the support lines, posts for the barbed wire, gun pits and supply dumps
// behind the lines, raised rims on the big craters, and rubble in the ruined
// villages. Pure functions of the world and a rectangle of ground.
// Metres; +X east, -Z north. `rot` is a yaw as in the models: a box's local
// +Z points along (sin rot, cos rot).

import { hash } from './noise.js';
import { trenches, wire, craters, houses } from './features.js';

const inRect = (x, z, x0, z0, x1, z1) => x >= x0 && x < x1 && z >= z0 && z < z1;
export const MAX_RIMS = 160; // per tile

// Everything along the front in the rectangle:
// { sandbags [{x,z,rot,tone}], dugouts [{x,z,rot}], posts [{x,z}], gunPits [{x,z,rot}], dumps [{x,z,rot,tone}], rims [{x,z,r}] }.
export function warworks(world, x0, z0, x1, z1) {
  const out = { sandbags: [], dugouts: [], posts: [], gunPits: [], dumps: [], rims: [] };
  const lines = trenches(world, x0 - 12, z0 - 12, x1 + 12, z1 + 12);
  if (!lines.length) return out;

  // Sandbags along the enemy-facing lip of the front and support trenches; dugouts on the rear side of the support lines.
  for (const t of lines) {
    if (t.kind !== 'front' && t.kind !== 'support') continue;
    const everyOther = t.kind === 'front' ? 1 : 4;
    const enemySide = t.d < 0 ? -1 : 1; // multiply the left-hand normal by this to face the enemy
    for (let k = 0; k < t.pts.length - 1; k += 1) {
      const [ax, az] = t.pts[k];
      const [bx, bz] = t.pts[k + 1];
      const tx = bx - ax;
      const tz = bz - az;
      const len = Math.hypot(tx, tz) || 1;
      const nx = (-tz / len) * enemySide;
      const nz = (tx / len) * enemySide;
      const mx = (ax + bx) / 2;
      const mz = (az + bz) / 2;
      const rot = Math.atan2(-tz, tx); // the box's local +X along the trench
      if (k % everyOther === 0) {
        const x = mx + nx * 1.9;
        const z = mz + nz * 1.9;
        if (inRect(x, z, x0, z0, x1, z1)) out.sandbags.push({ x, z, rot, tone: hash(world.seed + 400, Math.round(x), Math.round(z)) });
      }
      if (t.kind === 'support' && k % 14 === Math.floor(hash(world.seed + 401, Math.round(mz / 84)) * 14)) {
        const x = mx - nx * 2.6;
        const z = mz - nz * 2.6;
        if (inRect(x, z, x0, z0, x1, z1)) out.dugouts.push({ x, z, rot });
      }
    }
  }

  // Posts for the wire.
  for (const wl of wire(world, x0 - 5, z0 - 5, x1 + 5, z1 + 5)) {
    for (const [x, z] of wl.pts) if (inRect(x, z, x0, z0, x1, z1)) out.posts.push({ x, z });
  }

  // Gun pits and supply dumps behind each side's lines.
  for (const side of [-1, 1]) { // -1 Allied (west of the front), 1 German
    const toward = -side; // the direction of the enemy along x
    for (let k = Math.floor(z0 / 300) - 1; k <= Math.ceil(z1 / 300) + 1; k++) {
      const z = (k + hash(world.seed + 410, k, side)) * 300;
      const x = world.frontX(z) + side * (450 + hash(world.seed + 411, k, side) * 200);
      if (inRect(x, z, x0, z0, x1, z1) && world.riverDistance(x, z) > 60 && !world.inAirfield(x, z, 60)) out.gunPits.push({ x, z, rot: Math.atan2(toward, 0) });
      const dz = (k + hash(world.seed + 412, k, side)) * 250;
      const dx = world.frontX(dz) + side * (600 + hash(world.seed + 413, k, side) * 60);
      if (inRect(dx, dz, x0, z0, x1, z1) && world.riverDistance(dx, dz) > 60) out.dumps.push({ x: dx, z: dz, rot: (hash(world.seed + 414, k, side) - 0.5) * 0.6, tone: hash(world.seed + 415, k, side) });
    }
  }

  // Raised rims on the larger craters (the biggest first, up to a cap).
  out.rims = craters(world, x0 - 10, z0 - 10, x1 + 10, z1 + 10)
    .filter((c) => c.r >= 4 && inRect(c.x, c.z, x0, z0, x1, z1))
    .sort((a, b) => b.r - a.r)
    .slice(0, MAX_RIMS)
    .map((c) => ({ x: c.x, z: c.z, r: c.r }));
  return out;
}

// Rubble piles and broken wall stumps round the ruined houses of a village:
// { piles [{x,z,w,h,d,rot,tone}], stumps [{x,z,h,w,d,rot,wall}] }. Empty for an intact village.
export function rubble(world, village) {
  const out = { piles: [], stumps: [] };
  if (!village.ruined) return out;
  houses(world, village).forEach((b, n) => {
    if (!b.ruined) return;
    const h = (k) => hash(world.seed + 420, village.seed % 100000, n, k);
    for (let k = 0; k < 3; k++) {
      const a = h(k) * Math.PI * 2;
      const r = Math.max(b.w, b.d) * 0.45 + h(10 + k) * 2;
      out.piles.push({ x: b.x + Math.cos(a) * r, z: b.z + Math.sin(a) * r, w: 1.6 + h(20 + k) * 1.8, h: 0.5 + h(30 + k) * 0.7, d: 1.6 + h(40 + k) * 1.8, rot: h(50 + k) * 3, tone: h(60 + k) });
    }
    for (let k = 0; k < 2; k++) {
      out.stumps.push({ x: b.x + (k ? 1 : -1) * b.w * 0.4 * Math.cos(b.rot), z: b.z - (k ? 1 : -1) * b.w * 0.4 * Math.sin(b.rot), h: b.h * (1.1 + h(70 + k) * 0.6), w: 0.5, d: 2.2, rot: b.rot, wall: b.wall });
    }
  });
  return out;
}
