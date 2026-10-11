// Airfields: the start field at the origin and more across the world, Allied
// ones behind the Allied line and German ones behind the German line. Each is
// a mown landing ground (a rotated rectangle) lined up roughly into a visual
// wind, with white triangular boundary markers, a wind sock, a wooden watch
// tower, canvas hangars, tents and an access road. Pure functions of the world
// (see layout.js), so tiles agree about where everything is.
//
// Local axes of a field: "u" along the landing direction (heading), "v" across
// it (to the right of the heading). World: +X east, -Z north.

import { hash } from './noise.js';

// Airfields sit in bands behind the front line (negative bands Allied, positive
// German), one field at most per band and 5 km of front.
const ZCELL = 5000;
const BANDS = [-4, -3, -2, -1, 1, 2, 3, 4];
const bandOffset = (b) => Math.sign(b) * (2800 + (Math.abs(b) - 1) * 4500); // m behind the front line
const MIN_SPACING = 3000; // m between airfields
const MAX_WIND_ERROR = (25 * Math.PI) / 180; // landing heading within this of straight into the wind

// The wind (visual only: the physics has no wind). It blows FROM this bearing.
const WIND_FROM = (340 * Math.PI) / 180;
export const WIND = { from: WIND_FROM, toX: -Math.sin(WIND_FROM), toZ: Math.cos(WIND_FROM) };

// Local (u, v) of a field to world (x, z).
export function toWorld(af, u, v) {
  const s = Math.sin(af.heading);
  const c = Math.cos(af.heading);
  return [af.x + u * s + v * c, af.z - u * c + v * s];
}
// World (x, z) to local (u, v).
export function toLocal(af, x, z) {
  const s = Math.sin(af.heading);
  const c = Math.cos(af.heading);
  const dx = x - af.x;
  const dz = z - af.z;
  return [dx * s - dz * c, dx * c + dz * s];
}
const rotToward = (dx, dz) => Math.atan2(dx, dz); // yaw that turns a model's +Z toward (dx, dz)

export function addAirfields(w) {
  const seed = w.seed;
  const start = {
    key: 'start', x: 0, z: 0, heading: 0, halfLength: 520, halfWidth: 250,
    side: 'allied', start: true, priority: Infinity, seed: 1,
  };
  const candidates = new Map();
  const settled = new Map();

  // Where a band's airfield for a stretch of front would be, or null if the ground does not allow one.
  function candidate(band, k) {
    const key = `${band},${k}`;
    if (candidates.has(key)) return candidates.get(key);
    const h = (n) => hash(seed + 200, band, k, n);
    let af = null;
    if (h(1) < 0.8) {
      const z = (k + (h(2) - 0.5) * 0.6) * ZCELL;
      const x = w.frontX(z) + bandOffset(band) + (h(3) - 0.5) * 1400;
      const side = band < 0 ? 'allied' : 'german';
      af = {
        key, x, z, side, start: false, priority: h(7), seed: Math.floor(h(8) * 1e9),
        heading: WIND_FROM + (h(4) - 0.5) * 2 * MAX_WIND_ERROR * 0.9,
        halfLength: 350 + h(5) * 200,
        halfWidth: 150 + h(6) * 100,
      };
      // Clear of the river, the front and the start field. (A village whose site falls
      // within 500 m of a landing ground is left out by the village rule in layout.js.)
      const probes = [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => toWorld(af, a * (af.halfLength + 120), b * (af.halfWidth + 120)));
      const bad = probes.some(([px, pz]) => w.riverDistance(px, pz) < 120 || (side === 'allied' ? w.frontDistance(px, pz) > -1200 : w.frontDistance(px, pz) < 1200));
      if (bad || Math.hypot(x - start.x, z - start.z) < MIN_SPACING) af = null;
    }
    candidates.set(key, af);
    return af;
  }

  // The airfield of a band and stretch: the candidate, unless a higher-priority neighbour is too close.
  function airfieldAt(band, k) {
    const key = `${band},${k}`;
    if (settled.has(key)) return settled.get(key);
    let af = candidate(band, k);
    for (let db = -1; db <= 1 && af; db++) {
      for (let dk = -1; dk <= 1 && af; dk++) {
        const nb = band + db;
        if ((!db && !dk) || nb === 0 || Math.abs(nb) > 4) continue;
        const n = candidate(nb, k + dk);
        if (n && Math.hypot(n.x - af.x, n.z - af.z) < MIN_SPACING && n.priority > af.priority) af = null;
      }
    }
    settled.set(key, af);
    return af;
  }

  w.airfield = start; // the start field
  // Airfields whose centre is within `radius` metres of (x, z), the start field included.
  w.airfieldsNear = (x, z, radius) => {
    const out = [];
    if (Math.hypot(start.x - x, start.z - z) <= radius) out.push(start);
    for (let k = Math.floor((z - radius) / ZCELL) - 1; k <= Math.ceil((z + radius) / ZCELL) + 1; k++) {
      for (const band of BANDS) {
        const af = airfieldAt(band, k);
        if (af && Math.hypot(af.x - x, af.z - z) <= radius) out.push(af);
      }
    }
    return out;
  };
  // Airfields close enough to a rectangle that some of their landing ground or
  // buildings (up to about 800 m from the centre) may fall inside it.
  w.airfieldsIn = (x0, z0, x1, z1, margin = 0) => {
    const reach = Math.hypot(x1 - x0, z1 - z0) / 2 + 900 + margin;
    return w.airfieldsNear((x0 + x1) / 2, (z0 + z1) / 2, reach).filter((af) => {
      const dx = Math.max(x0 - af.x, 0, af.x - x1);
      const dz = Math.max(z0 - af.z, 0, af.z - z1);
      return Math.hypot(dx, dz) < 800 + margin;
    });
  };
  // Is (x, z) on any landing ground (or within `margin` metres of one)?
  w.inAirfield = (x, z, margin = 0) =>
    w.airfieldsNear(x, z, 1500).some((af) => {
      const [u, v] = toLocal(af, x, z);
      return Math.abs(v) < af.halfWidth + margin && Math.abs(u) < af.halfLength + margin;
    });
  // Is (x, z) within an airfield's grounds: the landing ground plus the strip behind its upwind
  // end where the hangars, tents and vehicles stand, and a wide margin round all of it? No
  // trees or woods are put here.
  w.inAirfieldGrounds = (x, z) =>
    w.airfieldsNear(x, z, 1800).some((af) => {
      const [u, v] = toLocal(af, x, z);
      return u > -af.halfLength - 260 && u < af.halfLength + 80 && Math.abs(v) < af.halfWidth + 130;
    });
  // The nearest airfield: { airfield, distance (m), bearing (degrees from north) } or null.
  w.nearestAirfield = (x, z, maxDistance = 30000) => {
    let best = null;
    for (const af of w.airfieldsNear(x, z, maxDistance)) {
      const d = Math.hypot(af.x - x, af.z - z);
      if (!best || d < best.distance) best = { airfield: af, distance: d };
    }
    if (!best) return null;
    const bearing = ((Math.atan2(best.airfield.x - x, -(best.airfield.z - z)) * 180) / Math.PI + 360) % 360;
    return { ...best, bearing };
  };

  const roadCache = new Map();
  // The road from an airfield's apron to the nearest village (as a roads() entry), or null.
  w.airfieldRoad = (af) => {
    if (roadCache.has(af.key)) return roadCache.get(af.key);
    const f = facilities(w, af);
    const from = f.apron.centre;
    let best = null;
    for (const v of w.villages(af.x - 5000, af.z - 5000, af.x + 5000, af.z + 5000)) {
      const d = Math.hypot(v.x - from[0], v.z - from[1]);
      if (d > 300 && (!best || d < best.d)) best = { v, d };
    }
    let road = null;
    if (best) {
      const pts = [];
      const bend = (hash(seed + 210, af.seed % 1000) - 0.5) * 120;
      const dx = best.v.x - from[0];
      const dz = best.v.z - from[1];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        const wob = Math.sin(t * Math.PI) * bend;
        pts.push([from[0] + dx * t - (dz / best.d) * wob, from[1] + dz * t + (dx / best.d) * wob]);
      }
      road = { from: null, to: null, airfield: af.key, pts };
    }
    roadCache.set(af.key, road);
    return road;
  };
}

// ---- What stands on a field ---------------------------------------------------

// Everything on and beside an airfield, in world coordinates:
// { markers [{x, z, rot}], windsock, tower, hangars, tents, vehicles, apron }.
export function facilities(world, af) {
  const h = (n, k = 0) => hash(world.seed + 220, af.seed % 100000, n, k);
  const { halfLength: hl, halfWidth: hw } = af;
  const markers = [];
  const inset = 8;
  const marker = (u, v, inU, inV) => {
    const [x, z] = toWorld(af, u, v);
    const s = Math.sin(af.heading);
    const c = Math.cos(af.heading);
    // The inward direction in the world: u axis (s, -c), v axis (c, s).
    markers.push({ x, z, rot: rotToward(inU * s + inV * c, -inU * c + inV * s) });
  };
  // Corners, pointing diagonally in.
  for (const su of [-1, 1]) for (const sv of [-1, 1]) marker(su * (hl - inset), sv * (hw - inset), -su, -sv);
  // Along the long edges and the ends, about every 80 m, pointing straight in.
  const along = Math.max(1, Math.round((2 * hl) / 80));
  for (let k = 1; k < along; k++) {
    const u = -hl + (2 * hl * k) / along;
    marker(u, hw - inset, 0, -1);
    marker(u, -hw + inset, 0, 1);
  }
  const across = Math.max(1, Math.round((2 * hw) / 80));
  for (let k = 1; k < across; k++) {
    const v = -hw + (2 * hw * k) / across;
    marker(hl - inset, v, -1, 0);
    marker(-hl + inset, v, 1, 0);
  }

  const s = Math.sin(af.heading);
  const c = Math.cos(af.heading);
  const alongRot = rotToward(s, -c); // a model's +Z along the landing direction
  const fieldRot = rotToward(c, s); // a model's +Z across, toward the right-hand side

  // Wind sock on the right-hand side, tower on the left, both near the middle.
  const [wx, wz] = toWorld(af, -0.3 * hl, hw + 22);
  const windsock = { x: wx, z: wz, height: 16.8, length: 8.4, dirX: WIND.toX, dirZ: WIND.toZ };
  const [tx, tz] = toWorld(af, 0.15 * hl, -(hw + 30));
  const tower = { x: tx, z: tz, height: 16.8, rot: fieldRot + Math.PI };

  // Hangars in a row behind the upwind end, with the doors toward the field.
  const nHangars = 3 + Math.floor(h(1) * 3);
  const rowShift = (h(2) - 0.5) * 80;
  const hangars = [];
  for (let k = 0; k < nHangars; k++) {
    const [x, z] = toWorld(af, -hl - 55, rowShift + (k - (nHangars - 1) / 2) * 31);
    hangars.push({ type: 'hangar', x, z, w: 20, d: 28, h: 9, rot: alongRot });
  }
  const rowHalf = ((nHangars - 1) / 2) * 31 + 25;
  // Tents behind the hangars.
  const tents = [];
  const nTents = 6 + Math.floor(h(3) * 7);
  for (let k = 0; k < nTents; k++) {
    const row = k % 2;
    const [x, z] = toWorld(af, -hl - 120 - row * 22, rowShift - rowHalf + (2 * rowHalf * (Math.floor(k / 2) + 0.5)) / Math.ceil(nTents / 2) + (h(10, k) - 0.5) * 6);
    tents.push({ type: 'tent', x, z, w: 4, d: 6, h: 3, rot: alongRot + (h(11, k) - 0.5) * 0.2 });
  }
  // A few lorries and a fuel dump near the apron.
  const vehicles = [];
  for (let k = 0; k < 3; k++) {
    const [x, z] = toWorld(af, -hl - 25, rowShift + rowHalf + 10 + k * 7);
    vehicles.push({ type: 'lorry', x, z, w: 2.4, d: 5.6, h: 2.6, rot: alongRot + (h(12, k) - 0.5) * 0.6 });
  }
  const [fx, fz] = toWorld(af, -hl - 25, rowShift - rowHalf - 14);
  for (let k = 0; k < 6; k++) vehicles.push({ type: 'drum', x: fx + (k % 3) * 1.2, z: fz + Math.floor(k / 3) * 1.2, w: 0.7, d: 0.7, h: 0.9, rot: 0 });

  // The worn apron between the hangars and the field.
  const apronU0 = -hl - 38;
  const apronU1 = -hl + 12;
  const apron = { u0: apronU0, u1: apronU1, v0: rowShift - rowHalf, v1: rowShift + rowHalf, centre: toWorld(af, -hl - 45, rowShift) };
  return { markers, windsock, tower, hangars, tents, vehicles, apron };
}

