import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/world/layout.js';
import { tileTrees } from '../src/world/obstacles.js';
import {
  SolidIndex, insideSolid, treeSolid, buildingSolid, haystackSolid, windmillSolid, hangarSolid, tentSolid,
  lorrySolid, towerSolid, windsockSolid, structureLists, solidsFromStructures,
} from '../src/world/solids.js';

// What can be crashed into: trees and buildings as solid shapes (Phase 3 follow-up).

const idx = (s) => { const i = new SolidIndex(); i.add('t', s); return i; };

describe('trees', () => {
  it('a conifer is a cone on a trunk: solid inside, free outside and above the top', () => {
    const s = treeSolid({ x: 10, z: 5, h: 10, r: 3, kind: 'conifer' });
    expect(s.label).toBe('Hit a tree');
    expect(insideSolid(s, 10, 2, 5)).toBe(true); // on the axis
    expect(insideSolid(s, 12.5, 2, 5)).toBe(true); // within the cone's spread low down
    expect(insideSolid(s, 13.3, 2, 5)).toBe(false); // outside it
    expect(insideSolid(s, 10.5, 9.5, 5)).toBe(false); // the point of the cone is narrow
    expect(insideSolid(s, 10, 9.5, 5)).toBe(true);
    expect(insideSolid(s, 10, 10.5, 5)).toBe(false); // above the top
    expect(insideSolid(s, 10, -0.1, 5)).toBe(false); // below the ground
  });

  it('a broadleaf tree is a rounded canopy on a trunk, with clear air under the canopy', () => {
    const s = treeSolid({ x: 0, z: 0, h: 12, r: 3, kind: 'broadleaf' });
    expect(insideSolid(s, 0, 0.62 * 12, 0)).toBe(true); // middle of the canopy
    expect(insideSolid(s, 2.4, 0.62 * 12, 0)).toBe(true);
    expect(insideSolid(s, 2.7, 0.62 * 12, 0)).toBe(false); // beyond 85% of the spread
    expect(insideSolid(s, 0, 2, 0)).toBe(true); // the trunk
    expect(insideSolid(s, 2, 2, 0)).toBe(false); // clear air beside the trunk, under the canopy
    expect(insideSolid(s, 0, 12.5, 0)).toBe(false); // above
  });

  it('stumps and burnt trunks are thin cylinders with their own labels', () => {
    const stump = treeSolid({ x: 0, z: 0, h: 1.5, r: 0.5, kind: 'stump' });
    expect(stump.label).toBe('Hit a tree stump');
    expect(insideSolid(stump, 0.4, 1, 0)).toBe(true);
    expect(insideSolid(stump, 0.7, 1, 0)).toBe(false);
    expect(insideSolid(stump, 0, 1.6, 0)).toBe(false);
    const dead = treeSolid({ x: 0, z: 0, h: 6, r: 0.3, kind: 'dead' });
    expect(dead.label).toBe('Hit a burnt tree');
    expect(insideSolid(dead, 0, 5.5, 0)).toBe(true);
  });

  it('a poplar is a tall narrow cone', () => {
    const s = treeSolid({ x: 0, z: 0, h: 20, r: 1.4, kind: 'poplar' });
    expect(insideSolid(s, 0, 15, 0)).toBe(true);
    expect(insideSolid(s, 1.4, 15, 0)).toBe(false);
  });
});

describe('buildings', () => {
  const house = { type: 'house', x: 0, z: 0, w: 10, d: 8, h: 5, rot: 0, ruined: false };

  it('a house is a box with a gabled roof', () => {
    const s = buildingSolid(house);
    expect(s.label).toBe('Hit a house');
    expect(insideSolid(s, 0, 2.5, 0)).toBe(true);
    expect(insideSolid(s, 4.9, 2.5, 3.9)).toBe(true); // near a corner
    expect(insideSolid(s, 5.2, 2.5, 0)).toBe(false); // just outside the wall
    expect(insideSolid(s, 0, 5.5, 0)).toBe(true); // in the roof
    expect(insideSolid(s, 5.2, 5.2, 0)).toBe(true); // the eave overhangs the wall by half a metre
    expect(insideSolid(s, 5.4, 8, 0)).toBe(false); // the roof narrows toward the ridge
    expect(insideSolid(s, 0, 9.6, 0)).toBe(false); // above the ridge (5 + 0.45 x 10)
  });

  it('a ruined house has walls but no roof', () => {
    const s = buildingSolid({ ...house, ruined: true, h: 2.7 });
    expect(insideSolid(s, 0, 2, 0)).toBe(true);
    expect(insideSolid(s, 0, 3, 0)).toBe(false);
  });

  it('turns with the building: rotated a quarter turn, the long side runs the other way', () => {
    const s = buildingSolid({ ...house, rot: Math.PI / 2 });
    expect(insideSolid(s, 0, 2.5, 4.5)).toBe(true); // the 10 m width now runs north-south
    expect(insideSolid(s, 4.5, 2.5, 0)).toBe(false); // and the 8 m depth east-west (half 4)
    expect(insideSolid(s, 3.5, 2.5, 0)).toBe(true);
  });

  it('a church has a tall tower at one end with a spire', () => {
    const s = buildingSolid({ type: 'church', x: 0, z: 0, w: 8, d: 18, h: 7, tower: 22, rot: 0, ruined: false });
    expect(s.label).toBe('Hit the church');
    expect(insideSolid(s, 0, 15, 11.5)).toBe(true); // the tower (2.5 m past the end of the nave)
    expect(insideSolid(s, 0, 26, 11.5)).toBe(true); // the spire
    expect(insideSolid(s, 0, 32, 11.5)).toBe(false); // above the spire (22 + 9)
    expect(insideSolid(s, 0, 15, 0)).toBe(false); // over the nave, far above its roof
    const ruined = buildingSolid({ type: 'church', x: 0, z: 0, w: 8, d: 18, h: 3.8, tower: 22, rot: 0, ruined: true });
    expect(insideSolid(ruined, 0, 10, 11.5)).toBe(true); // the broken tower still stands (55% height)
    expect(insideSolid(ruined, 0, 14, 11.5)).toBe(false);
  });

  it('farm buildings, a haystack and a windmill (body, roof and sails)', () => {
    expect(buildingSolid({ ...house, type: 'barn' }).label).toBe('Hit a barn');
    expect(buildingSolid({ ...house, type: 'farmhouse' }).label).toBe('Hit a farmhouse');
    const hay = haystackSolid({ x: 0, z: 0, r: 3, h: 4 });
    expect(insideSolid(hay, 0, 3, 0)).toBe(true);
    expect(insideSolid(hay, 2, 3, 0)).toBe(false); // the pyramid narrows
    expect(insideSolid(hay, 2, 0.5, 0)).toBe(true);
    const mill = windmillSolid({ x: 0, z: 0, rot: 0 });
    expect(mill.label).toBe('Hit a windmill');
    expect(insideSolid(mill, 0, 3, 0)).toBe(true); // the body
    expect(insideSolid(mill, 0, 10, 2.6)).toBe(true); // the upright sail
    expect(insideSolid(mill, 6, 8.8, 2.6)).toBe(true); // the crossbar sail
    expect(insideSolid(mill, 6, 12, 2.6)).toBe(false); // clear air between the sails
    expect(insideSolid(mill, 0, 10, 6)).toBe(false); // in front of the sails
  });
});

describe('airfield buildings', () => {
  it('hangar, tent and lorry are boxes; the open air above them is free', () => {
    const h = hangarSolid({ x: 0, z: 0, w: 20, d: 28, h: 9, rot: 0 });
    expect(h.label).toBe('Hit a hangar');
    expect(insideSolid(h, 9, 3, 13)).toBe(true);
    expect(insideSolid(h, 0, 8, 0)).toBe(true); // the roof ridge
    expect(insideSolid(h, 0, 10.5, 0)).toBe(false); // above 5.4 + 4.05
    expect(insideSolid(h, 11, 3, 0)).toBe(false);
    expect(tentSolid({ x: 0, z: 0, w: 4, d: 6, h: 3, rot: 0 }).label).toBe('Hit a tent');
    const lorry = lorrySolid({ x: 0, z: 0, w: 2.4, d: 5.6, h: 2.6, rot: 0 });
    expect(insideSolid(lorry, 0, 1.5, 2)).toBe(true);
    expect(insideSolid(lorry, 0, 4, 2)).toBe(false);
  });

  it('the tower has four legs with open air between them, then a solid cabin and roof', () => {
    const t = towerSolid({ x: 0, z: 0, height: 16.8, rot: 0 });
    const s = 16.8 / 14;
    expect(t.label).toBe('Hit the control tower');
    expect(insideSolid(t, 1.7 * s, 5, 1.7 * s)).toBe(true); // a leg
    expect(insideSolid(t, 0, 5, 0)).toBe(false); // between the legs
    expect(insideSolid(t, 0, 16.8 * 0.75 + 1, 0)).toBe(true); // the cabin
    expect(insideSolid(t, 0, 16.8 * 0.75 + 4, 0)).toBe(true); // the roof
    expect(insideSolid(t, 0, 16.8 * 0.75 + 7, 0)).toBe(false); // above it
  });

  it('the wind sock pole is thin but solid, and the sock itself is not', () => {
    const p = windsockSolid({ x: 0, z: 0, height: 16.8 });
    expect(p.label).toBe('Hit the wind sock pole');
    expect(insideSolid(p, 0.3, 10, 0)).toBe(true);
    expect(insideSolid(p, 1, 10, 0)).toBe(false);
    expect(insideSolid(p, 0, 17.5, 0)).toBe(false);
  });
});

describe('the index', () => {
  it('finds a solid from any square it covers, and nothing elsewhere', () => {
    const i = idx(buildingSolid({ type: 'house', x: 100, z: 100, w: 30, d: 30, h: 5, rot: 0, ruined: true })); // spans several 40 m squares
    expect(i.hit(100, 2, 100)).toBe('Hit a house');
    expect(i.hit(86, 2, 114)).toBe('Hit a house');
    expect(i.hit(114, 2, 86)).toBe('Hit a house');
    expect(i.hit(116, 2, 100)).toBeNull();
    expect(i.hit(100, 6, 100)).toBeNull();
    expect(i.hit(5000, 2, 5000)).toBeNull();
  });

  it('forgets a tile\'s solids when it is removed, and keeps the others', () => {
    const i = new SolidIndex();
    i.add('a', treeSolid({ x: 0, z: 0, h: 10, r: 3, kind: 'conifer' }));
    i.add('b', treeSolid({ x: 5, z: 0, h: 10, r: 3, kind: 'conifer' }));
    expect(i.size).toBe(2);
    i.remove('a');
    expect(i.size).toBe(1);
    expect(i.hit(0, 2, 0)).toBeNull();
    expect(i.hit(5, 2, 0)).toBe('Hit a tree');
    i.remove('b');
    expect(i.size).toBe(0);
    expect(i.cells.size).toBe(0);
    i.remove('never added'); // harmless
  });

  it('finds solids across the 40 m square boundaries', () => {
    const i = idx(treeSolid({ x: 39.5, z: 79.8, h: 10, r: 3, kind: 'conifer' }));
    for (const [x, z] of [[38, 79], [41, 81], [39, 82]]) expect(i.hit(x, 2, z)).toBe('Hit a tree');
  });
});

describe('matches what the terrain draws', () => {
  const world = createWorld(1917);
  const tiles = [];
  const v = world.village(0, 0);
  const af = world.airfieldsNear(0, 0, 12000).filter((a) => !a.start)[0];
  for (const [x, z] of [[v.x, v.z], [0, 0], [af.x, af.z], [-2579, -1578]]) tiles.push([Math.floor(x / 1000) * 1000, Math.floor(z / 1000) * 1000]);

  it('has a solid for every building drawn, found at its centre below the roof', () => {
    let checked = 0;
    for (const [x0, z0] of tiles) {
      const lists = structureLists(world, x0, z0, x0 + 1000, z0 + 1000);
      const index = new SolidIndex();
      for (const s of solidsFromStructures(lists)) index.add('t', s);
      const expected = lists.houses.length + lists.farms.reduce((n, f) => n + f.buildings.length + f.haystacks.length, 0) + lists.windmills.length
        + lists.airfields.reduce((n, a) => n + a.hangars.length + a.tents.length + a.vehicles.filter((c) => c.type === 'lorry').length + (a.tower ? 1 : 0) + (a.windsock ? 1 : 0), 0);
      expect(index.size).toBe(expected);
      for (const b of [...lists.houses, ...lists.farms.flatMap((f) => f.buildings)]) {
        expect(index.hit(b.x, Math.min(b.h, 2) * 0.9, b.z), `building at ${b.x | 0},${b.z | 0}`).toMatch(/^Hit/);
        checked++;
      }
      for (const f of lists.farms) for (const s of f.haystacks) { expect(index.hit(s.x, 0.4, s.z)).toBe('Hit a haystack'); checked++; }
      for (const m of lists.windmills) { expect(index.hit(m.x, 3, m.z)).toBe('Hit a windmill'); checked++; }
      for (const a of lists.airfields) {
        for (const h of a.hangars) { expect(index.hit(h.x, 3, h.z)).toBe('Hit a hangar'); checked++; }
        if (a.tower) { expect(index.hit(a.tower.x, a.tower.height * 0.75 + 1, a.tower.z)).toBe('Hit the control tower'); checked++; }
        if (a.windsock) { expect(index.hit(a.windsock.x, 5, a.windsock.z)).toBe('Hit the wind sock pole'); checked++; }
      }
    }
    expect(checked).toBeGreaterThan(40);
  });

  it('has a solid for every tree drawn and none for the clear ground between', () => {
    let trees = 0;
    for (const [x0, z0] of tiles) {
      const list = tileTrees(world, x0, z0, x0 + 1000, z0 + 1000, 14);
      const index = new SolidIndex();
      for (const t of list) index.add('t', treeSolid(t));
      expect(index.size).toBe(list.length);
      for (const t of list) {
        expect(index.hit(t.x, t.kind === 'broadleaf' ? 0.62 * t.h : 0.5 * t.h, t.z), `${t.kind} at ${t.x | 0},${t.z | 0}`).toMatch(/^Hit a/);
        trees++;
      }
    }
    expect(trees).toBeGreaterThan(30);
  });

  it('keeps the start landing ground and the strip above it free of every tree and building', () => {
    const index = new SolidIndex();
    for (const [x0, z0] of [[-1000, -1000], [0, -1000], [-1000, 0], [0, 0]]) {
      for (const t of tileTrees(world, x0, z0, x0 + 1000, z0 + 1000, 14)) index.add('t', treeSolid(t));
      for (const s of solidsFromStructures(structureLists(world, x0, z0, x0 + 1000, z0 + 1000))) index.add('t', s);
    }
    const a = world.airfield;
    for (let x = -a.halfWidth + 1; x < a.halfWidth; x += 20) {
      for (let z = -a.halfLength + 1; z < a.halfLength; z += 20) {
        for (const y of [0.5, 3, 8, 20]) expect(index.hit(x, y, z), `${x}, ${y}, ${z}`).toBeNull();
      }
    }
  });
});
