// Farmsteads and windmills scattered over the open countryside: a farmhouse
// and barns round a yard, haystacks, a windbreak of trees and a track to the
// nearest road, all lined up with the fields. Near the front they are ruined.
// Pure functions of the world and a rectangle of ground (metres; +X east, -Z north).

import { hash } from './noise.js';
import { woodDensity, WALL_COLOURS, ROOF_COLOURS } from './features.js';
import { WIND } from './airfields.js';

export const FARM_CELL = 600; // m: at most one farm per cell
const FARM_CHANCE = 0.3;
const MILL_CELL = 1500;
const MILL_CHANCE = 0.35;
const RUINED_WITHIN = 1600; // m of the front line

const around = (x, z, rot, ox, oz) => [x + ox * Math.cos(rot) + oz * Math.sin(rot), z - ox * Math.sin(rot) + oz * Math.cos(rot)];

// Open ground a farm or mill may stand on: not on a river, in a wood, on an
// airfield, in a village or in no-man's land.
function openGround(world, x, z, villages) {
  if (world.riverDistance(x, z) < world.riverHalfWidth(x) + 90) return false;
  if (woodDensity(world, x, z) > 0.05 || world.inAirfield(x, z, 120)) return false;
  if (Math.abs(world.frontDistance(x, z)) < 500) return false;
  return !villages.some((v) => Math.hypot(x - v.x, z - v.z) < v.radius + 130);
}

// The nearest point on any road within `maxDistance`, or null.
function nearestRoadPoint(roads, x, z, maxDistance) {
  let best = null;
  for (const r of roads) {
    for (let k = 0; k < r.pts.length - 1; k++) {
      const [ax, az] = r.pts[k];
      const [bx, bz] = r.pts[k + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      const px = ax + t * dx;
      const pz = az + t * dz;
      const d = Math.hypot(x - px, z - pz);
      if (d < maxDistance && (!best || d < best.d)) best = { x: px, z: pz, d };
    }
  }
  return best;
}

// Farmsteads whose yard is in [x0, x1) x [z0, z1):
// { x, z, rot, ruined, buildings: [{ type, x, z, w, d, h, rot, ruined, wall, roof }],
//   haystacks: [{ x, z, r, h }], trees: [{ x, z, h, r, kind }], track: [[x, z]...] | null }.
export function farms(world, x0, z0, x1, z1) {
  const out = [];
  const villages = world.villages(x0 - 500, z0 - 500, x1 + 500, z1 + 500);
  const roads = world.roads(x0 - 600, z0 - 600, x1 + 600, z1 + 600);
  for (let i = Math.floor(x0 / FARM_CELL); i <= Math.floor(x1 / FARM_CELL); i++) {
    for (let j = Math.floor(z0 / FARM_CELL); j <= Math.floor(z1 / FARM_CELL); j++) {
      const h = (n, k = 0) => hash(world.seed + 300, i, j, n * 31 + k);
      if (h(1) > FARM_CHANCE) continue;
      const x = (i + 0.2 + 0.6 * h(2)) * FARM_CELL;
      const z = (j + 0.2 + 0.6 * h(3)) * FARM_CELL;
      if (x < x0 || x >= x1 || z < z0 || z >= z1 || !openGround(world, x, z, villages)) continue;
      const rot = world.fieldAt(x, z).region.angle;
      const ruined = Math.abs(world.frontDistance(x, z)) < RUINED_WITHIN;
      const at = (lx, lz) => around(x, z, rot, lx, lz);

      const building = (type, lx, lz, w, d, hh, r, k) => {
        const [bx, bz] = at(lx, lz);
        const broken = ruined && h(40, k) < 0.7;
        return { type, x: bx, z: bz, w, d, h: hh * (broken ? 0.55 : 1), rot: r, ruined: broken, wall: Math.floor(h(41, k) * WALL_COLOURS.length), roof: Math.floor(h(42, k) * ROOF_COLOURS.length) };
      };
      const buildings = [building('farmhouse', -16, 0, 9 + h(4) * 3, 8 + h(5) * 2, 5, rot, 0)];
      const nBarns = 1 + Math.floor(h(6) * 3);
      const barnSpots = [[8, -17, rot + Math.PI / 2], [8, 17, rot + Math.PI / 2], [26, 0, rot]];
      for (let k = 0; k < nBarns; k++) buildings.push(building('barn', ...barnSpots[k].slice(0, 2), 9 + h(7, k) * 2, 17 + h(8, k) * 5, 6, barnSpots[k][2], k + 1));

      const haystacks = [];
      const nStacks = ruined ? 0 : 2 + Math.floor(h(9) * 4);
      for (let k = 0; k < nStacks; k++) {
        const [sx, sz] = at(34 + h(10, k) * 14, (h(11, k) - 0.5) * 50);
        haystacks.push({ x: sx, z: sz, r: 2.4 + h(12, k) * 1.2, h: 3.4 + h(13, k) * 1.2 });
      }
      // A windbreak of trees behind the house, on the side the wind comes from.
      const trees = [];
      const nTrees = ruined ? 2 : 5 + Math.floor(h(14) * 5);
      for (let k = 0; k < nTrees; k++) {
        const [tx, tz] = at(-30 - h(15, k) * 6, (k / Math.max(1, nTrees - 1) - 0.5) * 46 + (h(16, k) - 0.5) * 4);
        trees.push({ x: tx, z: tz, h: 9 + h(17, k) * 5, r: 2.6 + h(18, k) * 0.8, kind: ruined && h(19, k) < 0.6 ? 'stump' : 'broadleaf' });
      }
      // A track from the yard to the nearest road within 450 m.
      const road = nearestRoadPoint(roads, x, z, 450);
      const track = road ? [at(-16, 0), [(x + road.x) / 2 + (h(20) - 0.5) * 20, (z + road.z) / 2 + (h(21) - 0.5) * 20], [road.x, road.z]] : null;
      out.push({ x, z, rot, ruined, buildings, haystacks, trees, track });
    }
  }
  return out;
}

// Post windmills: { x, z, rot (sails face into the wind) }, in [x0, x1) x [z0, z1).
export function windmills(world, x0, z0, x1, z1) {
  const out = [];
  const villages = world.villages(x0 - 500, z0 - 500, x1 + 500, z1 + 500);
  for (let i = Math.floor(x0 / MILL_CELL); i <= Math.floor(x1 / MILL_CELL); i++) {
    for (let j = Math.floor(z0 / MILL_CELL); j <= Math.floor(z1 / MILL_CELL); j++) {
      const h = (n) => hash(world.seed + 310, i, j, n);
      if (h(1) > MILL_CHANCE) continue;
      const x = (i + 0.2 + 0.6 * h(2)) * MILL_CELL;
      const z = (j + 0.2 + 0.6 * h(3)) * MILL_CELL;
      if (x < x0 || x >= x1 || z < z0 || z >= z1 || !openGround(world, x, z, villages)) continue;
      if (Math.abs(world.frontDistance(x, z)) < RUINED_WITHIN) continue;
      out.push({ x, z, rot: Math.atan2(-WIND.toX, -WIND.toZ) + (h(4) - 0.5) * 0.5 });
    }
  }
  return out;
}
