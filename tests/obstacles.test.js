import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/world/layout.js';
import { buildingObstacles, tileTrees, clearOfBuildings } from '../src/world/obstacles.js';
import { toLocal, facilities } from '../src/world/airfields.js';
import { trees } from '../src/world/features.js';

// Trees stay out of buildings and well away from the hangars.

const world = createWorld(1917);
const tile = (x, z) => [Math.floor(x / 1000) * 1000, Math.floor(z / 1000) * 1000];

describe('trees and buildings', () => {
  const spots = [
    [world.village(0, 0).x, world.village(0, 0).z], // a village
    [-2579, -1578], // a farm
    [0, 0], // the start airfield and its hangars
    ...world.airfieldsNear(0, 0, 12000).filter((a) => !a.start).slice(0, 4).map((a) => [a.x, a.z]),
  ];

  it('never lets a tree stand inside a building', () => {
    let checked = 0;
    for (const [sx, sz] of spots) {
      const [x0, z0] = tile(sx, sz);
      const list = tileTrees(world, x0, z0, x0 + 1000, z0 + 1000, 14);
      const obstacles = buildingObstacles(world, x0 - 100, z0 - 100, x0 + 1100, z0 + 1100);
      for (const t of list) {
        for (const o of obstacles) {
          expect(Math.hypot(t.x - o.x, t.z - o.z), `tree at ${t.x | 0},${t.z | 0} near building at ${o.x | 0},${o.z | 0}`).toBeGreaterThan(o.r + t.r * 0.7);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('removes trees that would be in buildings but keeps the rest', () => {
    const [x0, z0] = tile(world.village(0, 0).x, world.village(0, 0).z);
    const raw = trees(world, x0, z0, x0 + 1000, z0 + 1000, 14);
    const kept = tileTrees(world, x0, z0, x0 + 1000, z0 + 1000, 14).filter((t) => t.kind !== 'poplar');
    expect(kept.length).toBeGreaterThan(0.6 * raw.length);
    const house = { x: raw[0].x + 1, z: raw[0].z, r: 6 };
    expect(clearOfBuildings(world, [raw[0]], [house])).toHaveLength(0);
    expect(clearOfBuildings(world, [raw[0]], [{ x: raw[0].x + 200, z: raw[0].z, r: 6 }])).toHaveLength(1);
  });

  it('has no trees round the hangars: none within the airfield grounds, 260 m behind the landing ground', () => {
    for (const af of [world.airfield, ...world.airfieldsNear(0, 0, 12000).filter((a) => !a.start).slice(0, 5)]) {
      const r = af.halfLength + 500;
      for (const [x0, z0] of [[af.x - r, af.z - r], [af.x, af.z - r], [af.x - r, af.z], [af.x, af.z]].map(([x, z]) => tile(x, z))) {
        for (const t of tileTrees(world, x0, z0, x0 + 1000, z0 + 1000, 14)) {
          const [u, v] = toLocal(af, t.x, t.z);
          const inside = u > -af.halfLength - 260 && u < af.halfLength + 80 && Math.abs(v) < af.halfWidth + 130;
          expect(inside, `${af.key}: tree at ${t.x | 0},${t.z | 0}`).toBe(false);
        }
      }
      // And the hangars themselves are inside that zone.
      for (const h of facilities(world, af).hangars) expect(world.inAirfieldGrounds(h.x, h.z)).toBe(true);
    }
  });

  it('keeps every landing ground and the strip behind it free of woods', () => {
    const af = world.airfield;
    for (let u = -af.halfLength - 250; u < af.halfLength + 70; u += 70) {
      for (let v = -af.halfWidth - 120; v < af.halfWidth + 120; v += 60) {
        expect(world.inAirfieldGrounds(af.x + v, af.z - u)).toBe(true);
      }
    }
  });
});
