// Cumulus clouds scattered over the sky. Each cell of the sky grid may hold a
// cloud of random size at a random height; a cloud is a cluster of overlapping
// puffs with a flat base and a domed top. A pure function of the seed and the
// cell, so the same sky is there however you fly to it. Metres.

import { hash } from './noise.js';

export const CLOUD_CELL = 2200; // m between possible clouds
export const CLOUD_BASE = [1300, 2600]; // m: height of a cloud's flat base
export const CLOUD_WIDTH = [250, 1750]; // m: from small puffs to big banks (most are smallish)

// The cloud in cell (i, j), or null.
// { key, x, z, base, width, height, puffs: [{ x, y, z, r, tex, rot, shade }] }.
export function cloudAt(seed, i, j, density = 0.42) {
  const h = (n, k = 0) => hash(seed + 500, i, j, n * 53 + k);
  if (h(1) > density) return null;
  const x = (i + 0.1 + 0.8 * h(2)) * CLOUD_CELL;
  const z = (j + 0.1 + 0.8 * h(3)) * CLOUD_CELL;
  const base = CLOUD_BASE[0] + h(4) * (CLOUD_BASE[1] - CLOUD_BASE[0]);
  const width = CLOUD_WIDTH[0] + h(5) ** 2.2 * (CLOUD_WIDTH[1] - CLOUD_WIDTH[0]); // many small, a few large
  const height = Math.min(900, width * (0.35 + 0.2 * h(6)));
  const half = width / 2;
  const n = 5 + Math.floor(width / 150);
  const puffs = [];
  for (let k = 0; k < n; k++) {
    const angle = h(10, k) * Math.PI * 2;
    const rho = Math.sqrt(h(11, k)) * half * 0.8; // across the cloud
    const dome = Math.max(0, 1 - (rho / half) ** 2) ** 0.6; // taller in the middle
    const up = k === 0 ? 0 : (0.15 + 0.85 * h(12, k)) * dome; // 0 = base, 1 = top of the dome here; the first puff rests on the base
    const r = width * (0.1 + 0.12 * h(13, k)) * (0.75 + 0.25 * dome);
    puffs.push({
      x: x + Math.cos(angle) * rho,
      z: z + Math.sin(angle) * rho,
      y: base + r * 0.45 + up * Math.max(0, height - r * 0.9), // the lowest puffs sit on the flat base
      r,
      tex: Math.floor(h(14, k) * 4),
      rot: h(15, k) * Math.PI * 2,
      shade: 0.8 + 0.2 * up, // darker underneath, brighter on top
    });
  }
  return { key: `${i},${j}`, x, z, base, width, height, puffs };
}

// All clouds whose centre is within `radius` metres of (x, z).
export function cloudsNear(seed, x, z, radius, density = 0.42) {
  const out = [];
  const reach = Math.ceil(radius / CLOUD_CELL) + 1;
  const ci = Math.floor(x / CLOUD_CELL);
  const cj = Math.floor(z / CLOUD_CELL);
  for (let i = ci - reach; i <= ci + reach; i++) {
    for (let j = cj - reach; j <= cj + reach; j++) {
      const c = cloudAt(seed, i, j, density);
      if (c && Math.hypot(c.x - x, c.z - z) <= radius) out.push(c);
    }
  }
  return out;
}
