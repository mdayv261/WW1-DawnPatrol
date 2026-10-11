// Paints the ground of one square tile onto a 2D canvas from the world
// layout: farmland parcels, the churned band along the front, woods, rivers,
// roads, village yards, trenches and craters. Everything is drawn in world
// metres (the canvas is set up so one unit is one metre), so the same code
// serves close tiles (fine) and far tiles (coarse, lines thickened so they
// stay visible).

import { CROPS, FIELD_REGION } from '../../world/layout.js';
import * as F from '../../world/features.js';
import { hash } from '../../world/noise.js';

const PASTURE = '#7ba24d';
const MOWN = '#8db55a';

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

// bounds: { x0, z0, size }; pixels: canvas size; near: paint the fine detail.
export function paintTile(ctx, world, bounds, pixels, near) {
  const { x0, z0, size } = bounds;
  const x1 = x0 + size;
  const z1 = z0 + size;
  const k = pixels / size; // pixels per metre
  ctx.setTransform(k, 0, 0, k, -x0 * k, -z0 * k);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
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
    }
    ctx.strokeStyle = 'rgba(38,66,28,0.9)'; // hedge
    ctx.lineWidth = Math.max(near ? 1.6 : 1.2, 1.1 / k);
    ctx.strokeRect(-p.w / 2, -p.l / 2, p.w, p.l);
    ctx.restore();
  }

  // The airfield: a mown field.
  const a = world.airfield;
  if (a.x - a.halfX < x1 && a.x + a.halfX > x0 && a.z - a.halfZ < z1 && a.z + a.halfZ > z0) {
    ctx.fillStyle = MOWN;
    ctx.fillRect(a.x - a.halfX, a.z - a.halfZ, 2 * a.halfX, 2 * a.halfZ);
  }

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

  // River.
  for (const r of world.rivers(x0, z0, x1, z1)) {
    stroke(ctx, r.pts, '#4f6b57', 2 * (world.riverHalfWidth(x0) + 5), 3, k); // muddy banks
    stroke(ctx, r.pts, '#6f93a8', 2 * world.riverHalfWidth(x0), 2.5, k);
  }

  // Roads and village yards.
  const roads = world.roads(x0, z0, x1, z1);
  for (const r of roads) stroke(ctx, r.pts, '#a99c7b', 5.5, 2, k);
  for (const v of world.villages(x0 - 200, z0 - 200, x1 + 200, z1 + 200)) {
    ctx.fillStyle = 'rgba(150,134,104,0.55)';
    ctx.beginPath();
    ctx.arc(v.x, v.z, v.radius * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Trenches, wire and craters along the front (fine detail only on close tiles).
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
      ctx.fillStyle = 'rgba(54,42,28,0.95)';
      ctx.beginPath();
      ctx.arc(c.x, c.z, c.r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
