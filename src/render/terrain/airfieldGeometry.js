// The 3D parts of an airfield, added to a tile's batch (see batch.js): white
// triangular boundary markers lying on the ground, a striped wind sock on a
// tall pole, a wooden watch tower, canvas hangars, tents, lorries and fuel
// drums.

import { Batch } from './batch.js';

export const MARKER_LENGTH = 14; // m: the white triangles are big enough to see from altitude
export const MARKER_WIDTH = 8;

const WOOD = 0x8a6b45;
const CANVAS = 0xd8d2bd;

// items: { markers, windsock, tower, hangars, tents, vehicles } (any may be empty or null).
export function addAirfield(batch, items) {
  const { around } = Batch;
  for (const m of items.markers ?? []) batch.marker(m.x, m.z, m.rot, MARKER_WIDTH, MARKER_LENGTH);

  for (const hg of items.hangars ?? []) {
    batch.wall(hg.x, hg.z, hg.w, hg.h * 0.6, hg.d, hg.rot, CANVAS);
    batch.roof(hg.x, hg.z, hg.h * 0.6, hg.w * 1.04, hg.h * 0.45, hg.d * 1.04, hg.rot, 0xc9c3ad);
    const [dx, dz] = around(hg.x, hg.z, hg.rot, 0, hg.d / 2 + 0.05); // the open door at the end facing the field
    batch.wall(dx, dz, hg.w * 0.78, hg.h * 0.5, 0.4, hg.rot, 0x2b2b2b);
  }
  for (const t of items.tents ?? []) {
    batch.wall(t.x, t.z, t.w, t.h * 0.5, t.d, t.rot, 0xe6e0c8);
    batch.roof(t.x, t.z, t.h * 0.5, t.w * 1.05, t.h * 0.7, t.d * 1.05, t.rot, 0xe6e0c8);
  }
  for (const v of items.vehicles ?? []) {
    if (v.type === 'lorry') {
      batch.wall(v.x, v.z, v.w, v.h * 0.7, v.d, v.rot, 0x4b5233, 0.5);
      const [cx, cz] = around(v.x, v.z, v.rot, 0, v.d * 0.32);
      batch.wall(cx, cz, v.w * 0.96, v.h * 0.4, v.d * 0.28, v.rot, 0x3e4429, 0.5 + v.h * 0.7);
    } else {
      batch.wall(v.x, v.z, v.w, v.h, v.d, v.rot, 0x7a2f1f);
    }
  }

  if (items.tower) {
    const { x, z, height: H, rot } = items.tower;
    const s = H / 14; // the tower is drawn for 14 m and scaled with its height
    const part = (ox, oz, w, h, d, colour, y = 0) => { const [px, pz] = around(x, z, rot, ox * s, oz * s); batch.wall(px, pz, w * s, h, d * s, rot, colour, y); };
    const legH = H * 0.75;
    for (const ox of [-1.7, 1.7]) for (const oz of [-1.7, 1.7]) part(ox, oz, 0.5, legH, 0.5, WOOD);
    for (const y of [3.2 * s, 6.2 * s]) { // cross bars
      for (const oz of [-1.7, 1.7]) part(0, oz, 3.7, 0.3 * s, 0.3, WOOD, y);
      for (const ox of [-1.7, 1.7]) part(ox, 0, 0.3, 0.3 * s, 3.7, WOOD, y);
    }
    part(0, 0, 4.8, 0.4 * s, 4.8, WOOD, legH); // floor of the cabin
    part(0, 0, 4.6, 2.5 * s, 4.6, 0xb9a77d, legH + 0.4 * s); // cabin walls
    part(0, 0, 4.75, 1.1 * s, 4.75, 0x35434d, legH + 1.05 * s); // band of windows all round
    for (const ox of [-2.35, 2.35]) for (const oz of [-2.35, 2.35]) part(ox, oz, 0.3, 1.3 * s, 0.3, WOOD, legH + 0.95 * s);
    const roofY = legH + 2.9 * s;
    batch.roof(x, z, roofY, 5.8 * s, 1.5 * s, 5.8 * s, rot, 0x6a5a52);
    part(0, 0, 0.14, 3.5 * s, 0.14, 0xdddddd, roofY + 1.4 * s); // flag pole
    part(0, 0.8, 0.05, 0.9 * s, 1.5, 0xc4281c, roofY + 3.9 * s); // flag
  }

  if (items.windsock) {
    const w = items.windsock;
    const s = w.height / 14; // drawn for a 14 m pole and scaled with its height
    batch.wall(w.x, w.z, 0.3 * s, w.height, 0.3 * s, 0, 0xdddddd); // pole
    const yaw = Math.atan2(w.dirX, w.dirZ);
    const droop = 0.22;
    const dir = [Math.sin(yaw) * Math.cos(droop), -Math.sin(droop), Math.cos(yaw) * Math.cos(droop)];
    const segments = 5;
    const seg = w.length / segments;
    for (let k = 0; k < segments; k++) {
      const r = (0.75 - 0.1 * k) * s;
      batch.sock({
        x: w.x + dir[0] * seg * k, y: w.height + dir[1] * seg * k, z: w.z + dir[2] * seg * k,
        sx: r, sy: r, sz: seg, rot: yaw, pitch: droop, colour: k % 2 === 0 ? 0xe8601c : 0xf4f4f0,
      });
    }
  }
}
