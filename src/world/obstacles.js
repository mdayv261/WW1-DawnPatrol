// Keeps trees out of buildings: the footprints of everything built (village
// houses and churches, farms, haystacks, windmills, airfield hangars, tents,
// vehicles, the tower and wind sock), and the one function that decides which
// trees a tile gets: woods, roadside poplars and farm windbreaks, minus any
// that would stand in a building or in an airfield's grounds.

import { houses, trees, roadTrees } from './features.js';
import { farms, windmills } from './farms.js';
import { facilities } from './airfields.js';

// Circles { x, z, r } covering buildings in a rectangle (with the buildings of
// neighbouring tiles that reach into it).
export function buildingObstacles(world, x0, z0, x1, z1, margin = 80) {
  const [ax, az, bx, bz] = [x0 - margin, z0 - margin, x1 + margin, z1 + margin];
  const out = [];
  for (const v of world.villages(ax - 300, az - 300, bx + 300, bz + 300)) {
    for (const b of houses(world, v)) out.push({ x: b.x, z: b.z, r: b.type === 'church' ? 15 : Math.hypot(b.w, b.d) / 2 + 2 });
  }
  for (const f of farms(world, ax, az, bx, bz)) {
    for (const b of f.buildings) out.push({ x: b.x, z: b.z, r: Math.hypot(b.w, b.d) / 2 + 2 });
    for (const s of f.haystacks) out.push({ x: s.x, z: s.z, r: s.r + 2 });
  }
  for (const m of windmills(world, ax, az, bx, bz)) out.push({ x: m.x, z: m.z, r: 11 });
  for (const af of world.airfieldsIn(ax, az, bx, bz)) {
    const f = facilities(world, af);
    for (const h of f.hangars) out.push({ x: h.x, z: h.z, r: Math.hypot(h.w, h.d) / 2 + 3 });
    for (const t of f.tents) out.push({ x: t.x, z: t.z, r: 5 });
    for (const v of f.vehicles) out.push({ x: v.x, z: v.z, r: 4 });
    out.push({ x: f.tower.x, z: f.tower.z, r: 7 }, { x: f.windsock.x, z: f.windsock.z, r: 3 });
  }
  return out;
}

// Trees not standing inside a building (the tree's own spread counts) and not in an airfield's grounds.
export function clearOfBuildings(world, list, obstacles) {
  return list.filter((t) => {
    if (world.inAirfieldGrounds(t.x, t.z)) return false;
    const reach = t.r * 0.7 + 1;
    for (const o of obstacles) {
      if (Math.abs(t.x - o.x) < o.r + reach && Math.abs(t.z - o.z) < o.r + reach && Math.hypot(t.x - o.x, t.z - o.z) < o.r + reach) return false;
    }
    return true;
  });
}

// Every tree of a tile: woods, roadside poplars and farm windbreaks, none in a building or in an airfield's grounds.
export function tileTrees(world, x0, z0, x1, z1, spacing = 14) {
  const farmTrees = farms(world, x0, z0, x1, z1).flatMap((f) => f.trees);
  const all = [...trees(world, x0, z0, x1, z1, spacing), ...roadTrees(world, x0, z0, x1, z1), ...farmTrees];
  return clearOfBuildings(world, all, buildingObstacles(world, x0, z0, x1, z1));
}
