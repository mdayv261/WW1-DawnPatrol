import { describe, it, expect } from 'vitest';
import { cloudAt, cloudsNear, CLOUD_CELL, CLOUD_BASE, CLOUD_WIDTH } from '../src/world/clouds.js';

// Cumulus clouds: random sizes at random places and heights (Phase 3).

const SEED = 1917;
const clouds = [];
for (let i = -30; i < 30; i++) for (let j = -30; j < 30; j++) { const c = cloudAt(SEED, i, j); if (c) clouds.push(c); }

describe('cloud placement', () => {
  it('is the same every time for a seed, and different for another', () => {
    expect(cloudAt(SEED, 3, 4)).toEqual(cloudAt(SEED, 3, 4));
    const other = [];
    for (let i = -30; i < 30; i++) for (let j = -30; j < 30; j++) { const c = cloudAt(42, i, j); if (c) other.push(c.key + c.x); }
    expect(other).not.toEqual(clouds.map((c) => c.key + c.x));
  });

  it('puts a cloud in about 42% of the cells, each inside its own cell', () => {
    expect(clouds.length / 3600).toBeGreaterThan(0.36);
    expect(clouds.length / 3600).toBeLessThan(0.48);
    for (const c of clouds) {
      const [i, j] = c.key.split(',').map(Number);
      expect(c.x).toBeGreaterThanOrEqual(i * CLOUD_CELL);
      expect(c.x).toBeLessThan((i + 1) * CLOUD_CELL);
      expect(c.z).toBeGreaterThanOrEqual(j * CLOUD_CELL);
      expect(c.z).toBeLessThan((j + 1) * CLOUD_CELL);
    }
  });

  it('gives clouds random sizes, from small to big, mostly small', () => {
    const widths = clouds.map((c) => c.width).sort((a, b) => a - b);
    expect(widths[0]).toBeGreaterThanOrEqual(CLOUD_WIDTH[0]);
    expect(widths[widths.length - 1]).toBeLessThanOrEqual(CLOUD_WIDTH[1]);
    expect(widths[0]).toBeLessThan(400);
    expect(widths[widths.length - 1]).toBeGreaterThan(1300);
    const median = widths[Math.floor(widths.length / 2)];
    expect(median).toBeLessThan((CLOUD_WIDTH[0] + CLOUD_WIDTH[1]) / 2);
    expect(new Set(widths.map((w) => Math.floor(w / 250))).size).toBeGreaterThanOrEqual(5); // a spread, not a few sizes
  });

  it('puts bases at random heights between 1,300 and 2,600 m', () => {
    const bases = clouds.map((c) => c.base);
    expect(Math.min(...bases)).toBeGreaterThanOrEqual(CLOUD_BASE[0]);
    expect(Math.max(...bases)).toBeLessThanOrEqual(CLOUD_BASE[1]);
    expect(Math.max(...bases) - Math.min(...bases)).toBeGreaterThan(1000);
  });

  it('builds each cloud from puffs with a flat base and a domed top, all inside its bounds', () => {
    for (const c of clouds) {
      expect(c.puffs.length).toBeGreaterThanOrEqual(5);
      expect(c.height).toBeLessThanOrEqual(900);
      for (const p of c.puffs) {
        expect(Math.hypot(p.x - c.x, p.z - c.z)).toBeLessThanOrEqual(c.width / 2);
        expect(p.y - p.r * 0.45).toBeGreaterThanOrEqual(c.base - 1e-6); // nothing hangs below the flat base (a puff's lower edge is 0.45 r under its centre)
        expect(p.y).toBeLessThanOrEqual(c.base + c.height + 1e-6);
        expect(p.r).toBeGreaterThan(0);
        expect([0, 1, 2, 3]).toContain(p.tex);
        expect(p.shade).toBeGreaterThanOrEqual(0.8);
        expect(p.shade).toBeLessThanOrEqual(1);
      }
      expect(c.puffs.some((p) => p.y - p.r * 0.45 < c.base + 1)).toBe(true); // something sits on the base
    }
  });

  it('bigger clouds have more puffs', () => {
    const small = clouds.filter((c) => c.width < 500);
    const big = clouds.filter((c) => c.width > 1200);
    const avg = (l) => l.reduce((s, c) => s + c.puffs.length, 0) / l.length;
    expect(avg(big)).toBeGreaterThan(avg(small) * 1.5);
  });

  it('finds the clouds near a point without duplicates, whatever order you ask in', () => {
    const near = cloudsNear(SEED, 0, 0, 12000);
    expect(near.length).toBeGreaterThan(20);
    expect(new Set(near.map((c) => c.key)).size).toBe(near.length);
    for (const c of near) expect(Math.hypot(c.x, c.z)).toBeLessThanOrEqual(12000);
    const bigger = cloudsNear(SEED, 0, 0, 20000).map((c) => c.key);
    for (const c of near) expect(bigger).toContain(c.key);
    expect(cloudsNear(SEED, 0, 0, 12000, 0.1).length).toBeLessThan(near.length / 2);
  });
});
