// Paints the ground of one square tile onto a 2D canvas from the world
// layout: farmland parcels, the churned band along the front, woods, rivers,
// roads, village yards, trenches and craters. Everything is drawn in world
// metres (the canvas is set up so one unit is one metre), so the same code
// serves close tiles (fine) and far tiles (coarse, lines thickened so they
// stay visible).

import { CROPS, FIELD_REGION } from '../../world/layout.js';
import * as F from '../../world/features.js';
import { hash } from '../../world/noise.js';
import { facilities } from '../../world/airfields.js';
import { farms as worldFarms } from '../../world/farms.js';

const PASTURE = '#7ba24d';

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amount)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function stroke(ctx, pts, colour, width, minPx, k) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(width, minPx / k);
  ctx.beginPath();
  pts.forEach(([x, z], i) => (i === 0 ? ctx.moveTo(x, z) : ctx.lineTo(x, z)));
  ctx.stroke();
}

// An airfield: pale mown ground (striped along the landing direction on close
// tiles), a worn apron in front of the hangars, and the white triangular
// markers. In the field's own frame: px across, py = -(distance along).
function paintAirfield(ctx, world, af, near, k) {
  const f = facilities(world, af);
  const { halfLength: hl, halfWidth: hw } = af;
  ctx.save();
  ctx.translate(af.x, af.z);
  ctx.rotate(af.heading);
  ctx.fillStyle = '#93bb60';
  ctx.fillRect(-hw, -hl, 2 * hw, 2 * hl);
  if (near) {
    ctx.fillStyle = '#9fc86b';
    for (let x = -hw; x < hw; x += 36) ctx.fillRect(x, -hl, 18, 2 * hl); // mown stripes
  }
  ctx.fillStyle = '#a79c80'; // worn apron
  const a = f.apron;
  ctx.fillRect(a.v0, -a.u1, a.v1 - a.v0, a.u1 - a.u0);
  ctx.restore();
  // White triangles: bigger on far tiles so they still show a few pixels across.
  const grow = near ? 1 : Math.max(1, 3 / (k * 14));
  ctx.fillStyle = '#ffffff';
  for (const m of f.markers) {
    const sx = Math.sin(m.rot);
    const cz = Math.cos(m.rot);
    const len = 14 * grow;
    const half = 4 * grow;
    ctx.beginPath();
    ctx.moveTo(m.x + (sx * len) / 2, m.z + (cz * len) / 2); // apex
    ctx.lineTo(m.x - (sx * len) / 2 + cz * half, m.z - (cz * len) / 2 - sx * half);
    ctx.lineTo(m.x - (sx * len) / 2 - cz * half, m.z - (cz * len) / 2 + sx * half);
    ctx.closePath();
    ctx.fill();
  }
}

// Land, fields, airfields, woods and the churned front (phase 1).
function paintLand(ctx, world, bounds, k, near) {
  const { x0, z0, size } = bounds;
  const x1 = x0 + size;
  const z1 = z0 + size;
  ctx.fillStyle = PASTURE;
  ctx.fillRect(x0 - 1, z0 - 1, size + 2, size + 2);

  // Farmland parcels, each clipped to its region so the edges are clean.
  for (const p of world.parcels(x0 - 100, z0 - 100, x1 + 100, z1 + 100)) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.region.x0, p.region.z0, FIELD_REGION, FIELD_REGION);
    ctx.clip();
    ctx.translate(p.x, p.z);
    ctx.rotate(p.angle);
    const tone = (hash(world.seed + 90, Math.round(p.x), Math.round(p.z)) - 0.5) * 22;
    ctx.fillStyle = shade(CROPS[p.crop].colour, tone);
    ctx.fillRect(-p.w / 2, -p.l / 2, p.w, p.l);
    if (near) {
      ctx.strokeStyle = 'rgba(40,30,15,0.16)'; // furrows
      ctx.lineWidth = Math.max(0.7, 0.8 / k);
      ctx.beginPath();
      const step = p.crop === 4 ? 3.5 : 5;
      for (let u = -p.w / 2 + step / 2; u < p.w / 2; u += step) {
        ctx.moveTo(u, -p.l / 2);
        ctx.lineTo(u, p.l / 2);
      }
      ctx.stroke();
      // Bare headland where the plough turns, just inside the hedge.
      ctx.strokeStyle = 'rgba(190,172,122,0.38)';
      ctx.lineWidth = 6;
      ctx.strokeRect(-p.w / 2 + 3, -p.l / 2 + 3, p.w - 6, p.l - 6);
    }
    ctx.strokeStyle = 'rgba(38,66,28,0.9)'; // hedge
    ctx.lineWidth = Math.max(near ? 1.6 : 1.2, 1.1 / k);
    ctx.strokeRect(-p.w / 2, -p.l / 2, p.w, p.l);
    ctx.restore();
  }

  // Airfields: the mown landing ground, the worn apron and the white markers.
  for (const af of world.airfieldsIn(x0, z0, x1, z1, 100)) paintAirfield(ctx, world, af, near, k);

  // Woods.
  const cell = near ? 14 : 40;
  for (let x = Math.floor(x0 / cell) * cell; x < x1; x += cell) {
    for (let z = Math.floor(z0 / cell) * cell; z < z1; z += cell) {
      const d = F.woodDensity(world, x + cell / 2, z + cell / 2);
      if (d > 0.25) {
        ctx.fillStyle = `rgba(46,74,38,${Math.min(0.85, 0.35 + d * 0.6)})`;
        ctx.fillRect(x, z, cell + 0.5, cell + 0.5);
      }
    }
  }

  // The churned earth along the front.
  const frontLine = [];
  for (let z = Math.floor(z0 / 100) * 100 - 100; z <= z1 + 100; z += 100) frontLine.push([world.frontX(z), z]);
  if (Math.min(...frontLine.map((p) => p[0])) - 1100 < x1 && Math.max(...frontLine.map((p) => p[0])) + 1100 > x0) {
    stroke(ctx, frontLine, 'rgba(110,92,62,0.22)', 1300, 1, k);
    stroke(ctx, frontLine, 'rgba(96,80,54,0.32)', 760, 1, k);
    stroke(ctx, frontLine, 'rgba(84,68,46,0.30)', 300, 1, k);
  }
}

// River, roads (with muddy verges), village yards, trenches, wire and craters (phase 2).
function paintFeatures(ctx, world, bounds, k, near) {
  const { x0, z0, size } = bounds;
  const x1 = x0 + size;
  const z1 = z0 + size;
  for (const r of world.rivers(x0, z0, x1, z1)) {
    stroke(ctx, r.pts, '#4f6b57', 2 * (world.riverHalfWidth(x0) + 5), 3, k); // muddy banks
    stroke(ctx, r.pts, '#6f93a8', 2 * world.riverHalfWidth(x0), 2.5, k);
  }

  const roads = world.roads(x0, z0, x1, z1);
  if (near) for (const r of roads) stroke(ctx, r.pts, 'rgba(98,80,54,0.45)', 11, 1, k); // churned verge
  for (const r of roads) stroke(ctx, r.pts, '#a99c7b', 5.5, 2, k);
  // Farm tracks and yards.
  for (const f of worldFarms(world, x0 - 60, z0 - 60, x1 + 60, z1 + 60)) {
    if (f.track) stroke(ctx, f.track, '#8e8366', 3.4, 1.2, k);
    ctx.save();
    ctx.translate(f.x, f.z);
    ctx.rotate(-f.rot); // the farm's own axes
    ctx.fillStyle = '#867a5e';
    ctx.fillRect(-8, -19, 34, 38);
    ctx.restore();
  }
  for (const v of world.villages(x0 - 200, z0 - 200, x1 + 200, z1 + 200)) {
    ctx.fillStyle = 'rgba(150,134,104,0.55)';
    ctx.beginPath();
    ctx.arc(v.x, v.z, v.radius * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const t of F.trenches(world, x0, z0, x1, z1)) {
    stroke(ctx, t.pts, 'rgba(112,92,60,0.75)', near ? 6 : 8, 1.5, k); // spoil heaped either side
    stroke(ctx, t.pts, '#2a2015', near ? 2.2 : 5, 1.2, k);
  }
  if (near) {
    for (const wl of F.wire(world, x0, z0, x1, z1)) stroke(ctx, wl.pts, 'rgba(25,25,25,0.8)', 0.5, 1, k);
    for (const c of F.craters(world, x0, z0, x1, z1)) {
      ctx.fillStyle = 'rgba(138,122,88,0.9)';
      ctx.beginPath();
      ctx.arc(c.x, c.z, c.r * 1.25, 0, Math.PI * 2);
      ctx.fill();
      const wet = hash(world.seed + 95, Math.round(c.x), Math.round(c.z)) < 0.4;
      ctx.fillStyle = wet ? 'rgba(86,104,112,0.95)' : 'rgba(54,42,28,0.95)'; // some craters hold water
      ctx.beginPath();
      ctx.arc(c.x, c.z, c.r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// bounds: { x0, z0, size }; pixels: canvas size; near: paint the fine detail.
// phase 1: land, fields, airfields, woods and the churned front; phase 2: river,
// roads, trenches, wire and craters; 0 (the default): both.
export function paintTile(ctx, world, bounds, pixels, near, phase = 0) {
  const k = pixels / bounds.size; // pixels per metre
  ctx.setTransform(k, 0, 0, k, -bounds.x0 * k, -bounds.z0 * k);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (phase !== 2) paintLand(ctx, world, bounds, k, near);
  if (phase !== 1) paintFeatures(ctx, world, bounds, k, near);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
