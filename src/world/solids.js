// What an aircraft can hit: trees and buildings, as simple solid shapes that
// match what is drawn. A solid is { label, x, z, reach, parts }; `reach` is a
// radius round (x, z) that contains it, and `parts` are shapes in world
// coordinates (metres; +X east, -Z north, y up):
//   cone   apex up: { type, x, z, y0, y1, r }        (r = radius at y0)
//   cyl    upright cylinder: { type, x, z, y0, y1, r }
//   ball   squashed sphere:  { type, x, z, cy, ry, r }
//   box    { type, x, z, rot, hw, hd, y0, y1 }       (rot is a model's yaw: its +Z is (sin rot, cos rot))
//   gable  roof prism, ridge along the box's Z: { type, x, z, rot, hw, hd, y0, rise }
//   pyr    four-sided pyramid: { type, x, z, rot, hw, y0, h }
// Not solid: sandbags, wire posts, rubble, bridges, crater rims, the sock cloth.
// SolidIndex answers "is this point inside anything?" from a grid of cells.

import { houses } from './features.js';
import { farms, windmills } from './farms.js';
import { facilities } from './airfields.js';

// ---- Shape tests --------------------------------------------------------------

function insideBox(p, x, y, z) {
  if (y < p.y0 || y > p.y1) return false;
  const dx = x - p.x;
  const dz = z - p.z;
  const c = Math.cos(p.rot);
  const s = Math.sin(p.rot);
  return Math.abs(dx * c - dz * s) <= p.hw && Math.abs(dx * s + dz * c) <= p.hd;
}

function insidePart(p, x, y, z) {
  switch (p.type) {
    case 'cone': {
      if (y < p.y0 || y > p.y1) return false;
      return Math.hypot(x - p.x, z - p.z) <= p.r * (1 - (y - p.y0) / (p.y1 - p.y0));
    }
    case 'cyl':
      return y >= p.y0 && y <= p.y1 && Math.hypot(x - p.x, z - p.z) <= p.r;
    case 'ball': {
      const t = (y - p.cy) / p.ry;
      return Math.abs(t) <= 1 && Math.hypot(x - p.x, z - p.z) <= p.r * Math.sqrt(1 - t * t);
    }
    case 'box':
      return insideBox(p, x, y, z);
    case 'gable': {
      if (y < p.y0 || y > p.y0 + p.rise) return false;
      const dx = x - p.x;
      const dz = z - p.z;
      const c = Math.cos(p.rot);
      const s = Math.sin(p.rot);
      return Math.abs(dx * c - dz * s) <= p.hw * (1 - (y - p.y0) / p.rise) && Math.abs(dx * s + dz * c) <= p.hd;
    }
    case 'pyr': {
      if (y < p.y0 || y > p.y0 + p.h) return false;
      const dx = x - p.x;
      const dz = z - p.z;
      const c = Math.cos(p.rot);
      const s = Math.sin(p.rot);
      return Math.max(Math.abs(dx * c - dz * s), Math.abs(dx * s + dz * c)) <= p.hw * (1 - (y - p.y0) / p.h);
    }
    default:
      return false;
  }
}

// Is (x, y, z) inside the solid?
export function insideSolid(s, x, y, z) {
  if (Math.hypot(x - s.x, z - s.z) > s.reach) return false;
  return s.parts.some((p) => insidePart(p, x, y, z));
}

// ---- Building the solids from the lists the terrain draws ------------------------

// Where a model's local offset (ox, oz) lands for a model at (x, z) yawed by rot.
const at = (x, z, rot, ox, oz) => [x + ox * Math.cos(rot) + oz * Math.sin(rot), z - ox * Math.sin(rot) + oz * Math.cos(rot)];

// A tree from features.trees() / roadTrees() / farms(): { x, z, h, r, kind }.
export function treeSolid(t) {
  const base = { x: t.x, z: t.z };
  let label = 'Hit a tree';
  let parts;
  if (t.kind === 'broadleaf') {
    // A short trunk under a rounded canopy (drawn as an octahedron: use 85% of a sphere).
    parts = [
      { type: 'cyl', ...base, y0: 0, y1: 0.4 * t.h, r: 0.16 * t.r },
      { type: 'ball', ...base, cy: 0.62 * t.h, ry: 0.38 * t.h, r: 0.85 * t.r },
    ];
  } else if (t.kind === 'stump' || t.kind === 'dead') {
    parts = [{ type: 'cyl', ...base, y0: 0, y1: t.h, r: 1.1 * t.r }];
    label = t.kind === 'dead' ? 'Hit a burnt tree' : 'Hit a tree stump';
  } else {
    // conifer and poplar: a cone on a trunk
    parts = [
      { type: 'cyl', ...base, y0: 0, y1: 0.25 * t.h, r: 0.16 * t.r },
      { type: 'cone', ...base, y0: 0.15 * t.h, y1: t.h, r: t.r },
    ];
  }
  return { label, x: t.x, z: t.z, reach: Math.max(t.r, 0.5) * 1.2, parts };
}

// A house, farmhouse, barn or church from features.houses() / farms().
export function buildingSolid(b) {
  const box = { type: 'box', x: b.x, z: b.z, rot: b.rot, hw: b.w / 2, hd: b.d / 2, y0: 0, y1: b.h };
  const parts = [box];
  let reach = Math.hypot(b.w, b.d) / 2 * 1.1 + 1;
  if (!b.ruined) parts.push({ type: 'gable', x: b.x, z: b.z, rot: b.rot, hw: (b.w * 1.1) / 2, hd: (b.d * 1.08) / 2, y0: b.h, rise: b.w * 0.45 });
  let label = b.type === 'barn' ? 'Hit a barn' : b.type === 'farmhouse' ? 'Hit a farmhouse' : 'Hit a house';
  if (b.type === 'church') {
    label = 'Hit the church';
    const [tx, tz] = at(b.x, b.z, b.rot, 0, b.d / 2 + 2.5);
    const th = b.ruined ? b.tower * 0.55 : b.tower;
    parts.push({ type: 'box', x: tx, z: tz, rot: b.rot, hw: 2.5, hd: 2.5, y0: 0, y1: th });
    if (!b.ruined) parts.push({ type: 'pyr', x: tx, z: tz, rot: b.rot, hw: 2.7, y0: th, h: 9 });
    reach += 7;
  }
  return { label, x: b.x, z: b.z, reach, parts };
}

export function haystackSolid(s) {
  return { label: 'Hit a haystack', x: s.x, z: s.z, reach: s.r + 1, parts: [{ type: 'pyr', x: s.x, z: s.z, rot: 0, hw: s.r * 0.8, y0: 0, h: s.h }] };
}

// A post windmill: the mill body and roof, and the cross of sails on the face toward the wind.
export function windmillSolid(m) {
  const [sx, sz] = at(m.x, m.z, m.rot, 0, 2.6);
  return {
    label: 'Hit a windmill', x: m.x, z: m.z, reach: 10,
    parts: [
      { type: 'box', x: m.x, z: m.z, rot: m.rot, hw: 2.1, hd: 2.1, y0: 0, y1: 7.5 },
      { type: 'gable', x: m.x, z: m.z, rot: m.rot, hw: 2.3, hd: 2.3, y0: 7.5, rise: 2.6 },
      { type: 'box', x: sx, z: sz, rot: m.rot, hw: 0.25, hd: 0.15, y0: 1.8, y1: 15.8 },
      { type: 'box', x: sx, z: sz, rot: m.rot, hw: 7, hd: 0.15, y0: 8.6, y1: 8.95 },
    ],
  };
}

// The things on an airfield (facilities() records): hangars, tents, lorries, the tower and the sock pole.
export function hangarSolid(h) {
  return {
    label: 'Hit a hangar', x: h.x, z: h.z, reach: Math.hypot(h.w, h.d) / 2 * 1.1 + 1,
    parts: [
      { type: 'box', x: h.x, z: h.z, rot: h.rot, hw: h.w / 2, hd: h.d / 2, y0: 0, y1: h.h * 0.6 },
      { type: 'gable', x: h.x, z: h.z, rot: h.rot, hw: (h.w * 1.04) / 2, hd: (h.d * 1.04) / 2, y0: h.h * 0.6, rise: h.h * 0.45 },
    ],
  };
}

export function tentSolid(t) {
  return {
    label: 'Hit a tent', x: t.x, z: t.z, reach: Math.hypot(t.w, t.d) / 2 * 1.1 + 1,
    parts: [
      { type: 'box', x: t.x, z: t.z, rot: t.rot, hw: t.w / 2, hd: t.d / 2, y0: 0, y1: t.h * 0.5 },
      { type: 'gable', x: t.x, z: t.z, rot: t.rot, hw: (t.w * 1.05) / 2, hd: (t.d * 1.05) / 2, y0: t.h * 0.5, rise: t.h * 0.7 },
    ],
  };
}

export function lorrySolid(v) {
  return { label: 'Hit a lorry', x: v.x, z: v.z, reach: Math.hypot(v.w, v.d) / 2 + 1, parts: [{ type: 'box', x: v.x, z: v.z, rot: v.rot, hw: v.w / 2, hd: v.d / 2, y0: 0.4, y1: 0.5 + v.h * 1.1 }] };
}

// The timber control tower: four legs, then the cabin and roof as one block. Drawn for 14 m and scaled with its height.
export function towerSolid(tw) {
  const s = tw.height / 14;
  const legH = tw.height * 0.75;
  const parts = [];
  for (const ox of [-1.7, 1.7]) {
    for (const oz of [-1.7, 1.7]) {
      const [px, pz] = at(tw.x, tw.z, tw.rot, ox * s, oz * s);
      parts.push({ type: 'box', x: px, z: pz, rot: tw.rot, hw: 0.3 * s, hd: 0.3 * s, y0: 0, y1: legH });
    }
  }
  parts.push({ type: 'box', x: tw.x, z: tw.z, rot: tw.rot, hw: 2.4 * s, hd: 2.4 * s, y0: legH, y1: legH + 2.9 * s });
  parts.push({ type: 'gable', x: tw.x, z: tw.z, rot: tw.rot, hw: 2.9 * s, hd: 2.9 * s, y0: legH + 2.9 * s, rise: 1.5 * s });
  return { label: 'Hit the control tower', x: tw.x, z: tw.z, reach: 6 * s, parts };
}

// The wind sock pole, drawn 0.3 m thick; thickened a little so a fast aircraft cannot slip past it between steps.
export function windsockSolid(w) {
  return { label: 'Hit the wind sock pole', x: w.x, z: w.z, reach: 1, parts: [{ type: 'cyl', x: w.x, z: w.z, y0: 0, y1: w.height, r: 0.45 }] };
}

// ---- Everything standing in a tile ----------------------------------------------

// The structures in a tile, as the terrain draws them: village houses, farms,
// windmills and the parts of any airfield that stand in the tile (each object
// belongs to the tile its centre is in).
export function structureLists(world, x0, z0, x1, z1) {
  const inTile = (o) => o && o.x >= x0 && o.x < x1 && o.z >= z0 && o.z < z1;
  const villages = world.villages(x0, z0, x1, z1);
  const out = {
    villages,
    houses: villages.flatMap((v) => houses(world, v)),
    farms: farms(world, x0, z0, x1, z1),
    windmills: windmills(world, x0, z0, x1, z1),
    airfields: [],
  };
  for (const af of world.airfieldsIn(x0, z0, x1, z1)) {
    const f = facilities(world, af);
    out.airfields.push({
      markers: f.markers.filter(inTile), hangars: f.hangars.filter(inTile), tents: f.tents.filter(inTile),
      vehicles: f.vehicles.filter(inTile), windsock: inTile(f.windsock) ? f.windsock : null, tower: inTile(f.tower) ? f.tower : null,
    });
  }
  return out;
}

// All the solids of a structureLists() result.
export function solidsFromStructures(lists) {
  const out = [];
  for (const b of lists.houses) out.push(buildingSolid(b));
  for (const f of lists.farms) {
    for (const b of f.buildings) out.push(buildingSolid(b));
    for (const s of f.haystacks) out.push(haystackSolid(s));
  }
  for (const m of lists.windmills) out.push(windmillSolid(m));
  for (const a of lists.airfields) {
    for (const h of a.hangars) out.push(hangarSolid(h));
    for (const t of a.tents) out.push(tentSolid(t));
    for (const v of a.vehicles) if (v.type === 'lorry') out.push(lorrySolid(v));
    if (a.tower) out.push(towerSolid(a.tower));
    if (a.windsock) out.push(windsockSolid(a.windsock));
  }
  return out;
}

// ---- The index ----------------------------------------------------------------------

export class SolidIndex {
  constructor(cell = 40) {
    this.cell = cell;
    this.cells = new Map(); // "i,j" -> solids touching that square
    this.owners = new Map(); // owner key (a tile and stage) -> its solids
  }

  get size() {
    let n = 0;
    for (const list of this.owners.values()) n += list.length;
    return n;
  }

  add(owner, solid) {
    const c = this.cell;
    solid.cellKeys = [];
    for (let i = Math.floor((solid.x - solid.reach) / c); i <= Math.floor((solid.x + solid.reach) / c); i++) {
      for (let j = Math.floor((solid.z - solid.reach) / c); j <= Math.floor((solid.z + solid.reach) / c); j++) {
        const key = `${i},${j}`;
        let list = this.cells.get(key);
        if (!list) this.cells.set(key, (list = []));
        list.push(solid);
        solid.cellKeys.push(key);
      }
    }
    let mine = this.owners.get(owner);
    if (!mine) this.owners.set(owner, (mine = []));
    mine.push(solid);
  }

  // Forget every solid added under this owner.
  remove(owner) {
    for (const solid of this.owners.get(owner) ?? []) {
      for (const key of solid.cellKeys) {
        const list = this.cells.get(key);
        if (!list) continue;
        const k = list.indexOf(solid);
        if (k >= 0) list.splice(k, 1);
        if (!list.length) this.cells.delete(key);
      }
    }
    this.owners.delete(owner);
  }

  // The label of the solid at (x, y, z), or null.
  hit(x, y, z) {
    const list = this.cells.get(`${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`);
    if (!list) return null;
    for (const s of list) if (insideSolid(s, x, y, z)) return s.label;
    return null;
  }
}
