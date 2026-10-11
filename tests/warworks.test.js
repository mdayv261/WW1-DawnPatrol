import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/world/layout.js';
import { warworks, rubble, MAX_RIMS } from '../src/world/warworks.js';
import { TRENCH_LINES, craters, houses } from '../src/world/features.js';

// What the war left behind (Phase 3, checkpoint 2b).

const world = createWorld(1917);
const fx0 = world.frontX(0);
const RECT = [fx0 - 800, -1200, fx0 + 800, 1200];
const ww = warworks(world, ...RECT);
const fd = (o) => world.frontDistance(o.x, o.z);
const nearLine = (o, d, tol) => Math.abs(fd(o) - d) <= tol;

describe('sandbags, dugouts and wire posts', () => {
  it('are the same every time, and absent away from the front', () => {
    expect(warworks(createWorld(1917), ...RECT).sandbags.length).toBe(ww.sandbags.length);
    const far = warworks(world, fx0 - 5000, -1000, fx0 - 3000, 1000);
    for (const list of Object.values(far)) expect(list).toHaveLength(0);
  });

  it('put sandbags on the parapets of the front trenches (most) and support trenches (a few)', () => {
    expect(ww.sandbags.length).toBeGreaterThan(300);
    const onFront = ww.sandbags.filter((s) => nearLine(s, -80, 8) || nearLine(s, 80, 8));
    const onSupport = ww.sandbags.filter((s) => nearLine(s, -260, 8) || nearLine(s, 260, 8));
    expect(onFront.length + onSupport.length).toBe(ww.sandbags.length);
    expect(onFront.length).toBeGreaterThan(onSupport.length * 2);
  });

  it('face the enemy: a front-line sandbag lies on the enemy side of its trench', () => {
    // Allied front trench (west) has its sandbags east of the trench centre line, German ones west of it.
    const allied = ww.sandbags.filter((s) => nearLine(s, -80, 8));
    const german = ww.sandbags.filter((s) => nearLine(s, 80, 8));
    expect(allied.length).toBeGreaterThan(50);
    expect(german.length).toBeGreaterThan(50);
    const mean = (list) => list.reduce((s, o) => s + fd(o), 0) / list.length;
    expect(mean(allied)).toBeGreaterThan(-80);
    expect(mean(german)).toBeLessThan(80);
  });

  it('put dugout entrances along the support trenches, on the side away from the enemy', () => {
    expect(ww.dugouts.length).toBeGreaterThan(10);
    for (const d of ww.dugouts) expect(nearLine(d, -260, 8) || nearLine(d, 260, 8)).toBe(true);
    const allied = ww.dugouts.filter((d) => fd(d) < 0);
    const german = ww.dugouts.filter((d) => fd(d) > 0);
    expect(allied.every((d) => fd(d) < -260 + 0.5)).toBe(true);
    expect(german.every((d) => fd(d) > 260 - 0.5)).toBe(true);
  });

  it('put a post about every 5 m along the wire lines 40 m in front of the front trenches', () => {
    expect(ww.posts.length).toBeGreaterThan(200);
    for (const p of ww.posts) expect(nearLine(p, -40, 2) || nearLine(p, 40, 2)).toBe(true);
  });

  it('keep everything inside the rectangle asked for', () => {
    for (const list of [ww.sandbags, ww.dugouts, ww.posts, ww.gunPits, ww.dumps, ww.rims]) {
      for (const o of list) expect(o.x >= RECT[0] && o.x < RECT[2] && o.z >= RECT[1] && o.z < RECT[3]).toBe(true);
    }
  });
});

describe('gun pits, supply dumps and crater rims', () => {
  const wide = warworks(world, fx0 - 800, -4000, fx0 + 800, 4000);

  it('put gun pits 450-650 m behind each side\'s front line, aimed toward the enemy', () => {
    expect(wide.gunPits.length).toBeGreaterThan(8);
    for (const g of wide.gunPits) {
      const d = fd(g);
      expect(Math.abs(d)).toBeGreaterThanOrEqual(449);
      expect(Math.abs(d)).toBeLessThanOrEqual(651);
      // The gun's +Z points toward the front line: east for Allied pits (west of the front).
      expect(Math.sign(Math.sin(g.rot))).toBe(d < 0 ? 1 : -1);
      expect(world.isRiver(g.x, g.z)).toBe(false);
    }
    expect(wide.gunPits.some((g) => fd(g) < 0)).toBe(true);
    expect(wide.gunPits.some((g) => fd(g) > 0)).toBe(true);
  });

  it('put supply dumps close behind the reserve trenches', () => {
    expect(wide.dumps.length).toBeGreaterThan(8);
    for (const d of wide.dumps) {
      expect(Math.abs(fd(d))).toBeGreaterThanOrEqual(599);
      expect(Math.abs(fd(d))).toBeLessThanOrEqual(661);
    }
    expect(TRENCH_LINES.some((l) => Math.abs(l.d) === 560)).toBe(true);
  });

  it('rim only the bigger craters, the biggest first, up to a cap', () => {
    expect(ww.rims.length).toBeGreaterThan(20);
    expect(ww.rims.length).toBeLessThanOrEqual(MAX_RIMS);
    const all = craters(world, ...RECT);
    for (const r of ww.rims) {
      expect(r.r).toBeGreaterThanOrEqual(4);
      expect(all.some((c) => c.x === r.x && c.z === r.z && c.r === r.r)).toBe(true);
    }
    for (let i = 1; i < ww.rims.length; i++) expect(ww.rims[i].r).toBeLessThanOrEqual(ww.rims[i - 1].r);
  });
});

describe('rubble', () => {
  const vs = world.villages(-12000, -12000, 12000, 12000);
  it('lies round the wrecked houses of a ruined village and nowhere in an intact one', () => {
    const ruined = vs.find((v) => v.ruined);
    const intact = vs.find((v) => !v.ruined);
    const r = rubble(world, ruined);
    const wrecked = houses(world, ruined).filter((b) => b.ruined);
    expect(wrecked.length).toBeGreaterThan(0);
    expect(r.piles.length).toBe(3 * wrecked.length);
    expect(r.stumps.length).toBe(2 * wrecked.length);
    for (const p of r.piles) expect(wrecked.some((b) => Math.hypot(p.x - b.x, p.z - b.z) < 14)).toBe(true);
    expect(rubble(world, intact)).toEqual({ piles: [], stumps: [] });
  });
});
