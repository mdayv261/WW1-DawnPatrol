import { describe, it, expect } from 'vitest';
import { hash, valueNoise, fbm, seedFrom } from '../src/world/noise.js';
import { createWorld, FRONT_BAND, FIELD_REGION, CROPS } from '../src/world/layout.js';
import * as F from '../src/world/features.js';
import { Terrain } from '../src/render/terrain/terrain.js';
import { QUALITY_LEVELS, qualityFromUrl } from '../src/render/quality.js';

// The Western Front world (Phase 3, checkpoint 2): layout is a pure function
// of a seed and world coordinates, so every tile joins its neighbours.

const world = createWorld(1917);
const front0 = world.frontX(0);

describe('noise', () => {
  it('is deterministic and in range', () => {
    for (let i = 0; i < 200; i++) {
      const h = hash(5, i, i * 3, 7);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
      expect(hash(5, i, i * 3, 7)).toBe(h);
    }
    expect(hash(5, 1, 2)).not.toBe(hash(6, 1, 2));
  });
  it('is smooth, so nearby points give nearby values', () => {
    for (let i = 0; i < 100; i++) {
      const x = i * 0.37;
      expect(Math.abs(valueNoise(3, x, 1.3) - valueNoise(3, x + 0.001, 1.3))).toBeLessThan(0.01);
    }
    expect(fbm(3, 10.2, 4.4)).toBeLessThan(1);
  });
  it('turns text into a seed', () => {
    expect(seedFrom('flanders')).toBe(seedFrom('flanders'));
    expect(seedFrom('flanders')).not.toBe(seedFrom('somme'));
  });
});

describe('world layout', () => {
  it('is the same every time for a seed, and different for another', () => {
    const again = createWorld(1917);
    expect(again.frontX(1234)).toBe(world.frontX(1234));
    expect(again.village(2, 3)).toEqual(world.village(2, 3));
    expect(again.parcels(0, 0, 800, 800)).toEqual(world.parcels(0, 0, 800, 800));
    expect(createWorld(42).frontX(1234)).not.toBe(world.frontX(1234));
  });

  it('puts the front a few kilometres east of the airfield, wandering north-south', () => {
    for (let z = -20000; z <= 20000; z += 1000) {
      expect(world.frontX(z)).toBeGreaterThan(2500);
      expect(world.frontX(z)).toBeLessThan(6500);
    }
    expect(world.frontDistance(0, 0)).toBeLessThan(-2500); // the airfield is on the Allied side
  });

  it('lays farmland out in parcels that tile the ground without gaps and agree with fieldAt', () => {
    let checked = 0;
    for (let n = 0; n < 150; n++) {
      const x = -4000 + hash(1, n, 1) * 8000;
      const z = -4000 + hash(1, n, 2) * 8000;
      const parcels = world.parcels(x - 5, z - 5, x + 5, z + 5);
      const here = world.fieldAt(x, z);
      const match = parcels.filter((p) => {
        if (p.region.i !== Math.floor(x / FIELD_REGION) || p.region.j !== Math.floor(z / FIELD_REGION)) return false;
        const c = Math.cos(-p.angle);
        const s = Math.sin(-p.angle);
        const u = (x - p.x) * c - (z - p.z) * s;
        const v = (x - p.x) * s + (z - p.z) * c;
        return Math.abs(u) <= p.w / 2 + 1e-6 && Math.abs(v) <= p.l / 2 + 1e-6;
      });
      expect(match.length, `no parcel at ${x}, ${z}`).toBeGreaterThanOrEqual(1);
      expect(match[0].crop).toBe(here.crop);
      expect(here.crop).toBeLessThan(CROPS.length);
      checked++;
    }
    expect(checked).toBe(150);
  });

  it('keeps the airfield clear: no woods, craters, trenches or roads on the mown field', () => {
    const a = world.airfield; // the start field, lined up north-south
    const [x0, x1, z0, z1] = [a.x - a.halfWidth, a.x + a.halfWidth, a.z - a.halfLength, a.z + a.halfLength];
    for (let x = x0; x <= x1; x += 40) {
      for (let z = z0; z <= z1; z += 40) {
        expect(F.woodDensity(world, x, z)).toBe(0);
        expect(world.isRiver(x, z)).toBe(false);
      }
    }
    expect(F.trees(world, x0, z0, x1, z1)).toHaveLength(0);
    expect(F.craters(world, x0, z0, x1, z1)).toHaveLength(0);
    expect(world.villages(x0, z0, x1, z1)).toHaveLength(0);
  });

  it('has rivers that wander and are found on their own centre line', () => {
    for (let x = -5000; x <= 5000; x += 500) {
      const z = world.riverCentre(0, x);
      expect(world.isRiver(x, z)).toBe(true);
      expect(world.riverDistance(x, z + 200)).toBeGreaterThan(100);
    }
    const r = world.rivers(0, 2000, 1000, 3000);
    expect(r.length).toBeGreaterThanOrEqual(1);
  });
});

describe('villages and roads', () => {
  const vs = world.villages(-12000, -12000, 12000, 12000);
  it('has villages, none in the river, the airfield or no-man\'s land', () => {
    expect(vs.length).toBeGreaterThan(20);
    for (const v of vs) {
      expect(world.riverDistance(v.x, v.z)).toBeGreaterThan(100);
      expect(Math.abs(world.frontDistance(v.x, v.z))).toBeGreaterThan(300);
      expect(world.inAirfield(v.x, v.z)).toBe(false);
    }
  });
  it('marks villages near the front as ruined and far ones as intact', () => {
    for (const v of vs) expect(v.ruined).toBe(Math.abs(world.frontDistance(v.x, v.z)) < 1600);
    expect(vs.some((v) => v.ruined)).toBe(true);
    expect(vs.some((v) => !v.ruined)).toBe(true);
  });
  it('joins every village that has a live neighbour by a road', () => {
    const roads = world.roads(-12500, -12500, 12500, 12500);
    for (const v of vs) {
      const hasNeighbour = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => world.village(v.i + di, v.j + dj).live);
      if (!hasNeighbour) continue;
      expect(roads.some((r) => (r.from[0] === v.i && r.from[1] === v.j) || (r.to[0] === v.i && r.to[1] === v.j)), `village ${v.i},${v.j} has no road`).toBe(true);
    }
  });
  it('builds houses inside the village with a church at the centre', () => {
    const v = vs.find((x) => !x.ruined);
    const list = F.houses(world, v);
    expect(list[0].type).toBe('church');
    expect(list.length).toBeGreaterThan(8);
    for (const h of list) {
      expect(Math.hypot(h.x - v.x, h.z - v.z)).toBeLessThan(v.radius + 40);
      expect(h.w).toBeGreaterThan(0);
      expect(world.isRiver(h.x, h.z)).toBe(false);
    }
    const ruined = vs.find((x) => x.ruined);
    expect(F.houses(world, ruined).some((h) => h.ruined)).toBe(true);
    expect(F.houses(world, v).some((h) => h.ruined)).toBe(false);
  });
  it('puts a bridge where a road crosses a river', () => {
    let found = 0;
    for (const r of world.roads(-12000, -12000, 12000, 12000)) {
      const b = F.bridges(world, [r]);
      for (const br of b) {
        expect(world.riverDistance(br.x, br.z)).toBeLessThan(world.riverHalfWidth(br.x) + 1);
        found++;
      }
    }
    expect(found).toBeGreaterThan(0);
  });
});

describe('the front', () => {
  const z0 = -1000;
  const z1 = 1000;
  const x0 = front0 - 1000;
  const x1 = front0 + 1000;

  it('has front, support and reserve trenches either side, zigzagging within a few metres of their line', () => {
    const lines = F.trenches(world, x0, z0, x1, z1);
    const kinds = new Set(lines.map((l) => l.kind));
    expect(kinds).toEqual(new Set(['front', 'support', 'reserve', 'communication']));
    for (const t of lines.filter((l) => l.kind !== 'communication')) {
      for (const [x, z] of t.pts) expect(Math.abs(x - world.frontX(z) - t.d)).toBeLessThanOrEqual(3.01);
    }
    const sides = new Set(lines.filter((l) => l.kind === 'front').map((l) => Math.sign(l.d)));
    expect(sides).toEqual(new Set([-1, 1]));
  });
  it('has no trenches, wire or craters away from the front', () => {
    const far = [front0 - 4000, -1000, front0 - 2500, 1000];
    expect(F.trenches(world, ...far)).toHaveLength(0);
    expect(F.wire(world, ...far)).toHaveLength(0);
    expect(F.craters(world, ...far)).toHaveLength(0);
  });
  it('puts craters only in the front band, densest at the front line', () => {
    const cs = F.craters(world, x0, z0, x1, z1);
    expect(cs.length).toBeGreaterThan(100);
    let near = 0;
    let far = 0;
    for (const c of cs) {
      const d = Math.abs(world.frontDistance(c.x, c.z));
      expect(d).toBeLessThanOrEqual(FRONT_BAND);
      expect(c.r).toBeGreaterThan(2);
      if (d < 200) near++;
      else if (d > 600) far++;
    }
    expect(near / 400).toBeGreaterThan(far / 300); // per metre of band width
  });
  it('strings barbed wire 40 m in front of the front trenches', () => {
    for (const w of F.wire(world, x0, z0, x1, z1)) for (const [x, z] of w.pts) expect(Math.abs(x - world.frontX(z) - w.d)).toBeLessThanOrEqual(1.51);
  });
});

describe('woods and trees', () => {
  it('never put trees in the river, on the trench lines or in villages, and keep to their spacing', () => {
    let total = 0;
    for (const [x0, z0] of [[front0 - 500, -500], [1000, 1000], [-2000, 2400], [6000, 3000]]) {
      const list = F.trees(world, x0, z0, x0 + 1000, z0 + 1000, 14);
      total += list.length;
      expect(list.length).toBeLessThan(5200); // at most one per 14 m cell
      for (const t of list) {
        expect(world.isRiver(t.x, t.z)).toBe(false);
        const fd = world.frontDistance(t.x, t.z);
        for (const l of F.TRENCH_LINES) expect(Math.abs(fd - l.d)).toBeGreaterThan(10);
        expect(['conifer', 'broadleaf', 'stump', 'dead']).toContain(t.kind);
        expect(t.h).toBeGreaterThan(0);
      }
      for (const v of world.villages(x0, z0, x0 + 1000, z0 + 1000)) expect(list.some((t) => Math.hypot(t.x - v.x, t.z - v.z) < v.radius)).toBe(false);
    }
    expect(total).toBeGreaterThan(0);
  });
  it('are shattered near the front: stumps and few trees', () => {
    const list = F.trees(world, x0f(), -1500, x0f() + 700, 1500, 14);
    const stumps = list.filter((t) => t.kind === 'stump').length;
    const bandArea = list.filter((t) => Math.abs(world.frontDistance(t.x, t.z)) < 450).length;
    expect(bandArea === 0 || stumps / bandArea > 0.4).toBe(true);
    function x0f() { return front0 - 350; }
  });
  it('line the roads with poplars at the roadside', () => {
    const rect = [-6000, -6000, 6000, 6000];
    const rt = F.roadTrees(world, ...rect);
    expect(rt.length).toBeGreaterThan(50);
    const roads = world.roads(...rect);
    for (const t of rt.slice(0, 80)) expect(world.roadDistance(roads, t.x, t.z)).toBeLessThan(12);
  });
});

describe('terrain tile planner', () => {
  const scene = { add() {} };
  for (const name of Object.keys(QUALITY_LEVELS)) {
    it(`${name}: a block of close tiles, coarse tiles beyond, none doubled up`, () => {
      const q = QUALITY_LEVELS[name];
      const t = new Terrain(scene, world, q);
      const plan = t.plan(500, 500);
      const near = plan.filter((p) => p.level === 'near');
      const far = plan.filter((p) => p.level === 'far');
      expect(near).toHaveLength((2 * q.nearRadius + 1) ** 2);
      expect(far.length).toBeGreaterThan(0);
      expect(new Set(plan.map((p) => p.key)).size).toBe(plan.length);
      // No coarse tile lies entirely inside the block of close tiles.
      const x0 = Math.min(...near.map((n) => n.x0));
      const x1 = Math.max(...near.map((n) => n.x0 + n.size));
      const z0 = Math.min(...near.map((n) => n.z0));
      const z1 = Math.max(...near.map((n) => n.z0 + n.size));
      for (const f of far) expect(f.x0 >= x0 && f.x0 + f.size <= x1 && f.z0 >= z0 && f.z0 + f.size <= z1).toBe(false);
      // Detail (trees, buildings, trenches) only close in.
      expect(near.filter((n) => n.objects).length).toBe((2 * q.objectRadius + 1) ** 2);
      expect(Math.max(...far.map((f) => Math.hypot(f.x0 + 1000 - 500, f.z0 + 1000 - 500)))).toBeLessThanOrEqual(q.farRadius + 1001);
    });
  }
  it('reads the quality from the web address', () => {
    expect(qualityFromUrl('?quality=high')).toBe('high');
    expect(qualityFromUrl('?quality=nonsense')).toBe('medium');
    expect(qualityFromUrl('')).toBe('medium');
  });
});
