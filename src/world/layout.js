// The shape of the world: where the front line, river, fields, villages,
// roads and the airfield are. A Western Front landscape on a flat plane
// (y = 0), made only of pure functions of a seed and world coordinates
// (metres; +X east, -Z north), so any piece can be asked for on its own and
// neighbouring pieces always join up.
//
//   - The Allied side is west of the front line, the German side east of it.
//   - The airfield (where flights start) is at the origin, about 4.5 km
//     behind the Allied front line.
//   - The front is a north-south line with trench systems either side
//     (see features.js); beyond about 2 km from it the land is farmland.

import { hash, fbm } from './noise.js';
import { addAirfields } from './airfields.js';

export const DEFAULT_SEED = 1917;

export const FRONT_BAND = 900; // m either side of the front line where the war has left its mark
export const FIELD_REGION = 1500; // m, size of a patch of farmland laid out the same way
export const VILLAGE_CELL = 2500; // m, spacing of villages
const RIVER_SPACING = 9000; // m between rivers (north-south)

// Crop colours for the parcels of farmland.
export const CROPS = [
  { name: 'wheat', colour: '#b9a95c' },
  { name: 'young crop', colour: '#6f9a45' },
  { name: 'green crop', colour: '#5f8a3a' },
  { name: 'stubble', colour: '#c7b97a' },
  { name: 'plough', colour: '#7a5c3c' },
  { name: 'pasture', colour: '#7ba24d' },
  { name: 'beet', colour: '#4f7a3a' },
];

export function createWorld(seed = DEFAULT_SEED) {
  const w = { seed };

  // ---- Front line ---------------------------------------------------------
  // x of the front line at z: a few km east of the airfield, wandering.
  w.frontX = (z) => 4500 + 1800 * (fbm(seed + 1, z / 4000, 0.5) - 0.5) + 400 * (fbm(seed + 2, z / 600, 3.3) - 0.5);
  // Distance east of the front line (negative on the Allied, west side).
  w.frontDistance = (x, z) => x - w.frontX(z);

  // ---- Rivers -------------------------------------------------------------
  // Rivers run east-west, one every RIVER_SPACING metres, meandering.
  w.riverCentre = (k, x) => k * RIVER_SPACING + 2400 + 1800 * (fbm(seed + 3 + k, x / 2500, k * 7.1) - 0.5);
  w.riverHalfWidth = (x) => 10 + 6 * fbm(seed + 4, x / 800, 1.5);
  w.riverDistance = (x, z) => {
    const k0 = Math.round((z - 2400) / RIVER_SPACING);
    let best = Infinity;
    for (let k = k0 - 1; k <= k0 + 1; k++) best = Math.min(best, Math.abs(z - w.riverCentre(k, x)));
    return best;
  };
  w.isRiver = (x, z) => w.riverDistance(x, z) < w.riverHalfWidth(x);
  // Rivers whose centre line passes within [z0, z1] somewhere in [x0, x1], as
  // polylines of [x, z].
  w.rivers = (x0, z0, x1, z1) => {
    const out = [];
    const margin = 2200;
    for (let k = Math.floor((z0 - margin - 2400) / RIVER_SPACING); k <= Math.ceil((z1 + margin - 2400) / RIVER_SPACING); k++) {
      const pts = [];
      let touches = false;
      for (let x = Math.floor((x0 - 60) / 60) * 60; x <= x1 + 60; x += 60) {
        const z = w.riverCentre(k, x);
        pts.push([x, z]);
        if (z > z0 - 60 && z < z1 + 60) touches = true;
      }
      if (touches) out.push({ k, pts });
    }
    return out;
  };

  // ---- Airfields: see airfields.js (added to the world at the end of createWorld) ----

  // ---- Farmland -----------------------------------------------------------
  // The land is cut into regions; each is laid out in strips at its own
  // slightly different angle.
  w.region = (i, j) => {
    const h = (n) => hash(seed + 10, i, j, n);
    return {
      i, j,
      x0: i * FIELD_REGION,
      z0: j * FIELD_REGION,
      angle: (h(1) - 0.5) * 0.7,
      parcelW: 70 + h(2) * 110,
      parcelL: 140 + h(3) * 260,
      shift: h(4),
    };
  };
  const cropFor = (r, iu, iv) => {
    const h = hash(seed + 11, r.i * 977 + iu, r.j * 983 + iv);
    return Math.min(CROPS.length - 1, Math.floor(h * CROPS.length));
  };
  // The parcel of farmland at (x, z).
  w.fieldAt = (x, z) => {
    const r = w.region(Math.floor(x / FIELD_REGION), Math.floor(z / FIELD_REGION));
    const [u, v] = rotate(r, x, z);
    const iu = Math.floor(u / r.parcelW);
    const iv = Math.floor(v / r.parcelL);
    return { crop: cropFor(r, iu, iv), iu, iv, region: r };
  };
  function rotate(r, x, z) {
    const cx = x - (r.x0 + FIELD_REGION / 2);
    const cz = z - (r.z0 + FIELD_REGION / 2);
    const c = Math.cos(r.angle);
    const s = Math.sin(r.angle);
    return [cx * c + cz * s + r.shift * r.parcelW, -cx * s + cz * c + r.shift * r.parcelL];
  }
  // Parcels overlapping a rectangle: { x, z (centre), w, l, angle, crop, region }.
  w.parcels = (x0, z0, x1, z1) => {
    const out = [];
    for (let i = Math.floor(x0 / FIELD_REGION); i <= Math.floor(x1 / FIELD_REGION); i++) {
      for (let j = Math.floor(z0 / FIELD_REGION); j <= Math.floor(z1 / FIELD_REGION); j++) {
        const r = w.region(i, j);
        // Range of the rotated coordinates covering the part of this region inside the rectangle.
        const bx0 = Math.max(x0, r.x0);
        const bx1 = Math.min(x1, r.x0 + FIELD_REGION);
        const bz0 = Math.max(z0, r.z0);
        const bz1 = Math.min(z1, r.z0 + FIELD_REGION);
        let uMin = Infinity;
        let uMax = -Infinity;
        let vMin = Infinity;
        let vMax = -Infinity;
        for (const [px, pz] of [[bx0, bz0], [bx1, bz0], [bx0, bz1], [bx1, bz1]]) {
          const [u, v] = rotate(r, px, pz);
          uMin = Math.min(uMin, u); uMax = Math.max(uMax, u);
          vMin = Math.min(vMin, v); vMax = Math.max(vMax, v);
        }
        for (let iu = Math.floor(uMin / r.parcelW); iu <= Math.floor(uMax / r.parcelW); iu++) {
          for (let iv = Math.floor(vMin / r.parcelL); iv <= Math.floor(vMax / r.parcelL); iv++) {
            // Centre of the parcel back in world coordinates.
            const u = (iu + 0.5) * r.parcelW - r.shift * r.parcelW;
            const v = (iv + 0.5) * r.parcelL - r.shift * r.parcelL;
            const c = Math.cos(r.angle);
            const s = Math.sin(r.angle);
            out.push({
              x: r.x0 + FIELD_REGION / 2 + u * c - v * s,
              z: r.z0 + FIELD_REGION / 2 + u * s + v * c,
              w: r.parcelW, l: r.parcelL, angle: r.angle,
              crop: cropFor(r, iu, iv), region: r,
            });
          }
        }
      }
    }
    return out;
  };

  // ---- Villages and roads -------------------------------------------------
  // One village per VILLAGE_CELL square, nudged off the river and out of the
  // fighting; the one around the airfield is left out.
  // Where a cell's village would stand (before checking the ground allows it).
  w.villageSite = (i, j) => ({
    x: (i + 0.2 + 0.6 * hash(seed + 20, i, j, 1)) * VILLAGE_CELL,
    z: (j + 0.2 + 0.6 * hash(seed + 20, i, j, 2)) * VILLAGE_CELL,
  });
  w.village = (i, j) => {
    const h = (n) => hash(seed + 20, i, j, n);
    const { x, z } = w.villageSite(i, j);
    const front = Math.abs(w.frontDistance(x, z));
    const live = front > 350 && w.riverDistance(x, z) > 150 && !w.inAirfield(x, z, 500);
    return {
      i, j, x, z, live,
      angle: (h(3) - 0.5) * 0.8,
      houses: 10 + Math.floor(h(4) * 26),
      radius: 70 + h(5) * 70,
      ruined: front < 1600,
      seed: Math.floor(h(6) * 1e9),
    };
  };
  w.villages = (x0, z0, x1, z1) => {
    const out = [];
    for (let i = Math.floor(x0 / VILLAGE_CELL); i <= Math.floor(x1 / VILLAGE_CELL); i++) {
      for (let j = Math.floor(z0 / VILLAGE_CELL); j <= Math.floor(z1 / VILLAGE_CELL); j++) {
        const v = w.village(i, j);
        if (v.live && v.x >= x0 && v.x < x1 && v.z >= z0 && v.z < z1) out.push(v);
      }
    }
    return out;
  };
  // The road from a village to its east (dir 0) or south (dir 1) neighbour, as
  // a gently winding polyline of [x, z], or null when either is missing.
  w.roadBetween = (i, j, dir) => {
    const a = w.village(i, j);
    const b = w.village(dir === 0 ? i + 1 : i, dir === 0 ? j : j + 1);
    if (!a.live || !b.live) return null;
    const bend0 = (hash(seed + 30, i, j, dir) - 0.5) * 220;
    const n = 24;
    const build = (bend) => {
      const pts = [];
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const wobble = Math.sin(t * Math.PI) * bend + 30 * Math.sin(t * 9 + i);
        const nx = dir === 0 ? 0 : 1;
        const nz = dir === 0 ? 1 : 0;
        pts.push([a.x + (b.x - a.x) * t + wobble * nx, a.z + (b.z - a.z) * t + wobble * nz]);
      }
      return pts;
    };
    // A road never runs across a landing ground: bend it round, or leave it out.
    for (const extra of [0, 450, -450, 900, -900, 1400, -1400]) {
      const pts = build(bend0 + extra);
      if (!pts.some(([x, z]) => w.inAirfield(x, z, 30))) return { from: [i, j], to: dir === 0 ? [i + 1, j] : [i, j + 1], pts };
    }
    return null;
  };
  // Roads passing through a rectangle.
  w.roads = (x0, z0, x1, z1) => {
    const out = [];
    const i0 = Math.floor((x0 - VILLAGE_CELL) / VILLAGE_CELL);
    const i1 = Math.floor((x1 + VILLAGE_CELL) / VILLAGE_CELL);
    const j0 = Math.floor((z0 - VILLAGE_CELL) / VILLAGE_CELL);
    const j1 = Math.floor((z1 + VILLAGE_CELL) / VILLAGE_CELL);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        for (const dir of [0, 1]) {
          const r = w.roadBetween(i, j, dir);
          if (r && r.pts.some(([x, z]) => x > x0 - 100 && x < x1 + 100 && z > z0 - 100 && z < z1 + 100)) out.push(r);
        }
      }
    }
    // The access roads of airfields in or near the rectangle.
    for (const af of w.airfieldsIn(x0 - 200, z0 - 200, x1 + 200, z1 + 200, 4000)) {
      const r = w.airfieldRoad(af);
      if (r && r.pts.some(([x, z]) => x > x0 - 100 && x < x1 + 100 && z > z0 - 100 && z < z1 + 100)) out.push(r);
    }
    return out;
  };
  // Distance from (x, z) to the nearest of a list of road polylines.
  w.roadDistance = (roads, x, z) => {
    let best = Infinity;
    for (const r of roads) {
      for (let k = 0; k < r.pts.length - 1; k++) best = Math.min(best, distToSegment(x, z, r.pts[k], r.pts[k + 1]));
    }
    return best;
  };
  addAirfields(w);
  return w;
}

export function distToSegment(x, z, a, b) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / len2));
  return Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz));
}
