import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/world/layout.js';
import { farms, windmills, FARM_CELL } from '../src/world/farms.js';
import { woodDensity } from '../src/world/features.js';
import { WIND } from '../src/world/airfields.js';

// Farmsteads and windmills in the open countryside (Phase 3, checkpoint 2b).

const world = createWorld(1917);
const RECT = [-4000, -4000, 5000, 5000];
const all = farms(world, ...RECT);

describe('farmsteads', () => {
  it('are the same every time for a seed', () => {
    expect(farms(createWorld(1917), ...RECT).map((f) => [f.x, f.z])).toEqual(all.map((f) => [f.x, f.z]));
    expect(farms(createWorld(42), ...RECT).map((f) => f.x)).not.toEqual(all.map((f) => f.x));
  });

  it('are scattered at a sensible density, at most one per cell', () => {
    expect(all.length).toBeGreaterThan(25);
    expect(all.length).toBeLessThan(90); // 81 km² at about 0.8 per km²
    const cells = new Set(all.map((f) => `${Math.floor(f.x / FARM_CELL)},${Math.floor(f.z / FARM_CELL)}`));
    expect(cells.size).toBe(all.length);
  });

  it('belong to the tile their yard is in, so neighbouring tiles never both build one', () => {
    const left = farms(world, 0, 0, 1000, 1000);
    const right = farms(world, 1000, 0, 2000, 1000);
    for (const f of left) expect(f.x >= 0 && f.x < 1000 && f.z >= 0 && f.z < 1000).toBe(true);
    const keys = new Set(left.map((f) => `${f.x},${f.z}`));
    for (const f of right) expect(keys.has(`${f.x},${f.z}`)).toBe(false);
  });

  it('stand on open ground: not in rivers, woods, airfields, villages or no-man\'s land', () => {
    const villages = world.villages(...RECT.map((v, i) => v + (i < 2 ? -500 : 500)));
    for (const f of all) {
      expect(world.isRiver(f.x, f.z)).toBe(false);
      expect(woodDensity(world, f.x, f.z)).toBeLessThanOrEqual(0.05);
      expect(world.inAirfield(f.x, f.z, 100)).toBe(false);
      expect(Math.abs(world.frontDistance(f.x, f.z))).toBeGreaterThanOrEqual(500);
      for (const v of villages) expect(Math.hypot(f.x - v.x, f.z - v.z)).toBeGreaterThan(v.radius + 100);
    }
  });

  it('have a farmhouse, one to three barns, haystacks and a windbreak, lined up with the fields', () => {
    for (const f of all) {
      const houses = f.buildings.filter((b) => b.type === 'farmhouse');
      const barns = f.buildings.filter((b) => b.type === 'barn');
      expect(houses).toHaveLength(1);
      expect(barns.length).toBeGreaterThanOrEqual(1);
      expect(barns.length).toBeLessThanOrEqual(3);
      expect(f.rot).toBeCloseTo(world.fieldAt(f.x, f.z).region.angle, 12);
      for (const b of f.buildings) {
        expect(Math.hypot(b.x - f.x, b.z - f.z)).toBeLessThan(45);
        expect(b.w).toBeGreaterThan(5);
        expect(b.h).toBeGreaterThan(2);
        expect(Math.hypot(b.x - houses[0].x, b.z - houses[0].z) > 12 || b === houses[0]).toBe(true); // no overlaps with the house
      }
      for (const t of f.trees) expect(Math.hypot(t.x - f.x, t.z - f.z)).toBeLessThan(50);
    }
  });

  it('are ruined within 1.6 km of the front: broken buildings, no haystacks, few trees', () => {
    const ruined = all.filter((f) => f.ruined);
    const intact = all.filter((f) => !f.ruined);
    expect(ruined.length).toBeGreaterThan(0);
    expect(intact.length).toBeGreaterThan(0);
    for (const f of all) expect(f.ruined).toBe(Math.abs(world.frontDistance(f.x, f.z)) < 1600);
    for (const f of ruined) {
      expect(f.haystacks).toHaveLength(0);
      expect(f.trees.length).toBeLessThanOrEqual(2);
    }
    for (const f of intact) {
      expect(f.haystacks.length).toBeGreaterThanOrEqual(2);
      expect(f.haystacks.length).toBeLessThanOrEqual(5);
      expect(f.trees.length).toBeGreaterThanOrEqual(5);
      expect(f.buildings.some((b) => b.ruined)).toBe(false);
    }
  });

  it('join the nearest road by a short track that ends on the road', () => {
    const roads = world.roads(RECT[0] - 800, RECT[1] - 800, RECT[2] + 800, RECT[3] + 800);
    const withTrack = all.filter((f) => f.track);
    expect(withTrack.length).toBeGreaterThan(all.length / 5);
    for (const f of withTrack) {
      const end = f.track[f.track.length - 1];
      expect(world.roadDistance(roads, end[0], end[1])).toBeLessThan(1);
      expect(Math.hypot(end[0] - f.x, end[1] - f.z)).toBeLessThan(460);
    }
  });
});

describe('windmills', () => {
  const mills = windmills(world, -6000, -6000, 8000, 8000);

  it('are rare, on open ground, away from the front, with their sails facing the wind', () => {
    expect(mills.length).toBeGreaterThanOrEqual(3);
    expect(mills.length).toBeLessThan(60);
    const villages = world.villages(-6500, -6500, 8500, 8500);
    for (const m of mills) {
      expect(world.isRiver(m.x, m.z)).toBe(false);
      expect(woodDensity(world, m.x, m.z)).toBeLessThanOrEqual(0.05);
      expect(Math.abs(world.frontDistance(m.x, m.z))).toBeGreaterThanOrEqual(1600);
      expect(world.inAirfield(m.x, m.z, 100)).toBe(false);
      for (const v of villages) expect(Math.hypot(m.x - v.x, m.z - v.z)).toBeGreaterThan(v.radius + 100);
      // The sails (local +Z) point into the wind, within about 15 degrees.
      const into = [-WIND.toX, -WIND.toZ];
      const dot = Math.sin(m.rot) * into[0] + Math.cos(m.rot) * into[1];
      expect(dot).toBeGreaterThan(Math.cos(0.3));
    }
  });
});
