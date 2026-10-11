// The things placed on the land: trenches and wire along the front, shell
// craters, woods and trees, village houses, bridges and the airfield
// buildings. Pure functions of a world (layout.js) and a rectangle of ground,
// so each tile asks only for what it needs and neighbours agree.
// Metres; +X east, -Z north.

import { hash, fbm } from './noise.js';
import { FRONT_BAND, distToSegment } from './layout.js';

// Trench lines either side of the front: distance east of the front line (m)
// and what each is. Allied (west) lines are negative.
export const TRENCH_LINES = [
  { d: -80, kind: 'front' },
  { d: -260, kind: 'support' },
  { d: -560, kind: 'reserve' },
  { d: 80, kind: 'front' },
  { d: 260, kind: 'support' },
  { d: 560, kind: 'reserve' },
];
const WIRE_OFFSETS = [-40, 40]; // barbed wire in front of the front lines
const ZIG_PERIOD = 24; // m: the bays of a trench

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const tri = (t) => {
  const f = t - Math.floor(t);
  return f < 0.5 ? f * 4 - 1 : 3 - f * 4;
};

// Does the front's band overlap this rectangle?
function nearFront(world, x0, z0, x1, z1, margin = 0) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let z = z0 - 10; z <= z1 + 10; z += 150) {
    const fx = world.frontX(z);
    lo = Math.min(lo, fx);
    hi = Math.max(hi, fx);
  }
  return hi + FRONT_BAND + margin > x0 && lo - FRONT_BAND - margin < x1;
}

// Zigzag lines of [x, z] along the front at given offsets, sampled every `step` metres.
function linesAlongFront(world, offsets, z0, z1, step, amplitude, period) {
  const out = [];
  const za = Math.floor(z0 / step) * step - step;
  for (const o of offsets) {
    const pts = [];
    for (let z = za; z <= z1 + step; z += step) pts.push([world.frontX(z) + o.d + amplitude * tri(z / period), z]);
    out.push({ ...o, pts });
  }
  return out;
}

// Front, support and reserve trenches plus the communication trenches that
// join them, as { kind, pts } polylines.
export function trenches(world, x0, z0, x1, z1) {
  if (!nearFront(world, x0, z0, x1, z1)) return [];
  const out = linesAlongFront(world, TRENCH_LINES, z0, z1, 6, 3, ZIG_PERIOD);
  const pairs = [[-80, -260], [-260, -560], [80, 260], [260, 560]];
  const spacing = 450;
  for (let n = Math.floor(z0 / spacing) - 1; n <= Math.floor(z1 / spacing) + 1; n++) {
    for (const [d1, d2] of pairs) {
      const zA = n * spacing + hash(world.seed + 50, n, d1) * 250;
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const z = zA + k * 14;
        pts.push([world.frontX(z) + d1 + (d2 - d1) * (k / 6), z]);
      }
      out.push({ kind: 'communication', d: d1, pts });
    }
  }
  return out;
}

// Barbed wire lines in front of the front trenches.
export function wire(world, x0, z0, x1, z1) {
  if (!nearFront(world, x0, z0, x1, z1)) return [];
  return linesAlongFront(world, WIRE_OFFSETS.map((d) => ({ d, kind: 'wire' })), z0, z1, 5, 1.5, 10);
}

// Shell craters, densest at the front line: { x, z, r }.
export function craters(world, x0, z0, x1, z1) {
  if (!nearFront(world, x0, z0, x1, z1)) return [];
  const out = [];
  const cell = 26;
  for (let i = Math.floor(x0 / cell); i < Math.ceil(x1 / cell); i++) {
    for (let j = Math.floor(z0 / cell); j < Math.ceil(z1 / cell); j++) {
      const x = (i + hash(world.seed + 60, i, j, 1)) * cell;
      const z = (j + hash(world.seed + 60, i, j, 2)) * cell;
      const fd = Math.abs(world.frontDistance(x, z));
      if (fd > FRONT_BAND) continue;
      const p = 0.5 * (1 - fd / FRONT_BAND) ** 1.6;
      if (hash(world.seed + 60, i, j, 3) < p) out.push({ x, z, r: 2.5 + 7 * hash(world.seed + 60, i, j, 4) ** 2 });
    }
  }
  return out;
}

// ---- Woods and trees ----------------------------------------------------------

// How thickly the land is wooded at (x, z): 0 (open) to 1. Woods are
// patches of low-frequency noise; none on the river, the airfield, in the
// trenches themselves, and shattered (thin) near the front.
export function woodDensity(world, x, z) {
  const n = fbm(world.seed + 40, x / 900, z / 900, 3);
  let d = smoothstep(0.57, 0.67, n);
  if (d === 0) return 0;
  if (world.inAirfield(x, z, 80)) return 0;
  if (world.riverDistance(x, z) < world.riverHalfWidth(x) + 14) return 0;
  const fd = world.frontDistance(x, z);
  const af = Math.abs(fd);
  if (af < FRONT_BAND) {
    d *= 0.12 + 0.88 * smoothstep(250, FRONT_BAND, af);
    for (const t of TRENCH_LINES) if (Math.abs(fd - t.d) < 14) return 0;
    if (Math.abs(Math.abs(fd) - 40) < 10) return 0; // wire
  }
  return d;
}

// Trees in a rectangle: { x, z, h, r, kind: 'conifer' | 'broadleaf' | 'stump' }.
// `spacing` is the grid in metres (larger = fewer trees).
export function trees(world, x0, z0, x1, z1, spacing = 14) {
  const out = [];
  const villages = world.villages(x0 - 300, z0 - 300, x1 + 300, z1 + 300);
  const roads = world.roads(x0 - 50, z0 - 50, x1 + 50, z1 + 50);
  for (let i = Math.floor(x0 / spacing); i < Math.ceil(x1 / spacing); i++) {
    for (let j = Math.floor(z0 / spacing); j < Math.ceil(z1 / spacing); j++) {
      const x = (i + hash(world.seed + 70, i, j, 1)) * spacing;
      const z = (j + hash(world.seed + 70, i, j, 2)) * spacing;
      if (x < x0 || x >= x1 || z < z0 || z >= z1) continue;
      const density = woodDensity(world, x, z);
      if (density <= 0 || hash(world.seed + 70, i, j, 3) > density) continue;
      if (villages.some((v) => Math.hypot(x - v.x, z - v.z) < v.radius + 25)) continue;
      if (roads.length && world.roadDistance(roads, x, z) < 14) continue;
      const af = Math.abs(world.frontDistance(x, z));
      const kindRoll = hash(world.seed + 70, i, j, 4);
      const h = 7 + 9 * hash(world.seed + 70, i, j, 5);
      const broken = af < 450 && hash(world.seed + 70, i, j, 6) < 0.75;
      out.push({
        x, z,
        h: broken ? h * 0.3 : h,
        r: (kindRoll < 0.4 ? 1.8 : 3) * (0.8 + 0.4 * hash(world.seed + 70, i, j, 7)),
        kind: broken ? 'stump' : kindRoll < 0.4 ? 'conifer' : 'broadleaf',
      });
    }
  }
  return out;
}

// Lines of poplars either side of the roads: same record as trees.
export function roadTrees(world, x0, z0, x1, z1) {
  const out = [];
  for (const road of world.roads(x0, z0, x1, z1)) {
    let carry = 0;
    for (let k = 0; k < road.pts.length - 1; k++) {
      const [ax, az] = road.pts[k];
      const [bx, bz] = road.pts[k + 1];
      const len = Math.hypot(bx - ax, bz - az) || 1;
      const nx = -(bz - az) / len;
      const nz = (bx - ax) / len;
      for (let s = carry; s < len; s += 18) {
        for (const side of [-1, 1]) {
          const x = ax + ((bx - ax) * s) / len + nx * 7 * side;
          const z = az + ((bz - az) * s) / len + nz * 7 * side;
          if (x < x0 || x >= x1 || z < z0 || z >= z1) continue;
          if (world.riverDistance(x, z) < world.riverHalfWidth(x) + 20 || world.inAirfield(x, z, 20)) continue;
          if (Math.abs(world.frontDistance(x, z)) < FRONT_BAND && hash(world.seed + 71, Math.round(x), Math.round(z)) < 0.7) continue;
          out.push({ x, z, h: 18 + 6 * hash(world.seed + 72, Math.round(x), Math.round(z)), r: 1.4, kind: 'poplar' });
        }
      }
      carry = (carry + len) % 18;
    }
  }
  return out;
}

// ---- Villages -----------------------------------------------------------------

export const WALL_COLOURS = [0xcfc3a8, 0xbfae8c, 0xa65a43, 0xd8cdb4, 0x9e8f78];
export const ROOF_COLOURS = [0x8f3b2c, 0x6a5a52, 0x7a4a3a, 0x4a4a52];

// The buildings of a village: houses along a street with a church at the
// centre, as { type: 'house' | 'church', x, z, w, d, h, rot, ruined, wall, roof }.
export function houses(world, village) {
  const out = [];
  const h = (n, k = 0) => hash(world.seed + 80, village.seed % 100000, n, k);
  const c = Math.cos(village.angle);
  const s = Math.sin(village.angle);
  out.push({ type: 'church', x: village.x, z: village.z, w: 8, d: 18, h: 7, tower: 22, rot: village.angle, ruined: village.ruined, wall: 0, roof: 3 });
  let n = 0;
  for (let along = -village.radius; along <= village.radius && n < village.houses; along += 12 + h(100 + n) * 6) {
    for (const side of [-1, 1]) {
      if (n >= village.houses) break;
      const off = side * (14 + h(200 + n) * 8);
      const lx = along + (h(300 + n) - 0.5) * 4;
      const x = village.x + lx * c - off * s;
      const z = village.z + lx * s + off * c;
      if (Math.abs(lx) < 12 && Math.abs(off) < 20) continue; // the church
      const ruined = village.ruined && h(400 + n) < 0.7;
      out.push({
        type: 'house', x, z,
        w: 6 + h(500 + n) * 4, d: 8 + h(600 + n) * 6,
        h: (4 + h(700 + n) * 2) * (ruined ? 0.55 : 1),
        rot: village.angle + (side > 0 ? 0 : Math.PI) + (h(800 + n) - 0.5) * 0.15,
        ruined, wall: Math.floor(h(900 + n) * WALL_COLOURS.length), roof: Math.floor(h(950 + n) * ROOF_COLOURS.length),
      });
      n++;
    }
  }
  return out;
}

// Where roads cross rivers: { x, z, rot, length } for a bridge deck.
export function bridges(world, roads) {
  const out = [];
  for (const road of roads) {
    for (let k = 0; k < road.pts.length - 1; k++) {
      const [ax, az] = road.pts[k];
      const [bx, bz] = road.pts[k + 1];
      let best = null;
      for (let t = 0; t <= 1; t += 0.125) {
        const x = ax + (bx - ax) * t;
        const z = az + (bz - az) * t;
        const rd = world.riverDistance(x, z);
        if (rd < world.riverHalfWidth(x) && (!best || rd < best.rd)) best = { x, z, rd };
      }
      if (best) out.push({ x: best.x, z: best.z, rot: Math.atan2(bz - az, bx - ax), length: 2 * world.riverHalfWidth(best.x) + 14 });
    }
  }
  // One bridge per crossing: drop ones closer than 40 m to another.
  return out.filter((b, i) => out.findIndex((o) => Math.hypot(o.x - b.x, o.z - b.z) < 40) === i);
}

// The airfield: hangars, tents and a windsock pole beside the mown field.
export function airfieldBuildings(world) {
  const a = world.airfield;
  const out = [];
  for (const z of [-120, 0, 120]) out.push({ type: 'hangar', x: a.x - a.halfX + 30, z, w: 20, d: 28, h: 9, rot: 0 });
  for (let i = 0; i < 6; i++) out.push({ type: 'tent', x: a.x - a.halfX + 70, z: -200 + i * 70, w: 4, d: 6, h: 3, rot: 0 });
  out.push({ type: 'windsock', x: a.x + 60, z: a.z + 140, w: 0.2, d: 0.2, h: 7, rot: 0 });
  return out;
}

export { distToSegment };
