// Adds the farms, windmills and the war's leftovers (sandbags, dugouts, wire
// posts, gun pits, supply dumps, crater rims, rubble) to a tile's batch.

import { Batch } from './batch.js';

const SAND = [0x8d7d58, 0x7f7050, 0x9a8a62];
const WOOD_TONES = [0x7a5a36, 0x8a6a40, 0x6b4d2e];
const RUBBLE = [0x6e665a, 0x7a7266, 0x5c564c];
const STRAW = 0xc9b25e;

const pick = (list, t) => list[Math.min(list.length - 1, Math.floor(t * list.length))];

// farms: from world/farms.js; windmills likewise. (Houses and barns go through addBuildings.)
export function addFarmExtras(batch, farms, windmills) {
  for (const f of farms) for (const s of f.haystacks) batch.spire(s.x, s.z, 0, s.r * 2, s.h, 0, STRAW);
  for (const m of windmills) {
    batch.wall(m.x, m.z, 4.2, 7.5, 4.2, m.rot, 0x6a4d32); // the mill body
    batch.roof(m.x, m.z, 7.5, 4.6, 2.6, 4.6, m.rot, 0x4a3a2c);
    // The four sails as a cross on the face toward the wind, hub at 8.8 m.
    const [sx, sz] = Batch.around(m.x, m.z, m.rot, 0, 2.6);
    batch.wall(sx, sz, 0.35, 14, 0.14, m.rot, 0xd8d0b8, 1.8);
    batch.wall(sx, sz, 14, 0.35, 0.14, m.rot, 0xd8d0b8, 8.6);
  }
}

export function addWarWorks(batch, ww, rubbleList = []) {
  for (const s of ww.sandbags) batch.wall(s.x, s.z, 2.8, 0.75, 1.0, s.rot, pick(SAND, s.tone));
  for (const d of ww.dugouts) {
    batch.wall(d.x, d.z, 2.6, 1.9, 3.2, d.rot, 0x3a2e20);
    batch.wall(d.x, d.z, 3.0, 0.35, 0.5, d.rot, 0x6b4d2e, 1.9); // timber lintel
  }
  for (const p of ww.posts) batch.wall(p.x, p.z, 0.12, 1.3, 0.12, 0, 0x2a2118);
  for (const g of ww.gunPits) {
    const { around } = Batch;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      // Skip the sandbag at the rear so the crew can get in.
      const behind = Math.cos(a) * Math.sin(g.rot) + Math.sin(a) * Math.cos(g.rot);
      if (behind < -0.9) continue;
      batch.wall(g.x + Math.cos(a) * 3.2, g.z + Math.sin(a) * 3.2, 2.6, 0.9, 1.0, -a + Math.PI / 2, SAND[k % 3]);
    }
    const [bx, bz] = around(g.x, g.z, g.rot, 0, 1.4);
    batch.wall(bx, bz, 0.4, 0.5, 3.4, g.rot, 0x2a2d30, 0.7); // the gun barrel
    batch.wall(g.x, g.z, 1.2, 0.9, 1.2, g.rot, 0x3a3d40, 0.2); // the carriage
  }
  for (const d of ww.dumps) {
    const { around } = Batch;
    for (let k = 0; k < 6; k++) {
      const [cx, cz] = around(d.x, d.z, d.rot, (k % 3) * 1.4 - 1.4, Math.floor(k / 3) * 1.4);
      batch.wall(cx, cz, 1.3, 1.0, 1.3, d.rot, pick(WOOD_TONES, (d.tone + k * 0.37) % 1));
    }
    const [tx, tz] = around(d.x, d.z, d.rot, 0, 0.7);
    batch.wall(tx, tz, 1.3, 0.9, 1.3, d.rot, pick(WOOD_TONES, d.tone), 1.0); // one stacked on top
  }
  for (const r of ww.rims) batch.rim(r.x, r.z, r.r * 1.2, 0x8a7a58);
  for (const r of rubbleList) {
    for (const p of r.piles) batch.wall(p.x, p.z, p.w, p.h, p.d, p.rot, pick(RUBBLE, p.tone));
    for (const s of r.stumps) batch.wall(s.x, s.z, s.w, s.h, s.d, s.rot, 0xbfae8c);
  }
}
