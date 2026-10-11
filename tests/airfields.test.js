import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/world/layout.js';
import { facilities, toWorld, toLocal, WIND } from '../src/world/airfields.js';
import * as F from '../src/world/features.js';

// Airfields (Phase 3, checkpoint 2b): the start field and more, Allied ones
// behind the Allied line and German ones behind the German line.

const SEEDS = [1917, 42, 7, 99];
const world = createWorld(1917);
const all = world.airfieldsNear(0, 0, 40000);
const corners = (af, margin = 0) => [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => toWorld(af, a * (af.halfLength + margin), b * (af.halfWidth + margin)));
const angleDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

describe('where the airfields are', () => {
  it('always has the start field at the origin, lined up north-south', () => {
    for (const seed of SEEDS) {
      const w = createWorld(seed);
      expect(w.airfield).toMatchObject({ x: 0, z: 0, heading: 0, start: true, side: 'allied' });
      expect(w.airfieldsNear(0, 0, 10).map((a) => a.key)).toEqual(['start']);
    }
  });

  it('is the same every time for a seed and different for another', () => {
    const again = createWorld(1917).airfieldsNear(0, 0, 40000);
    expect(again.map((a) => [a.key, a.x, a.z, a.heading])).toEqual(all.map((a) => [a.key, a.x, a.z, a.heading]));
    const other = createWorld(42).airfieldsNear(0, 0, 40000).map((a) => a.key + a.x);
    expect(other).not.toEqual(all.map((a) => a.key + a.x));
  });

  it('puts Allied fields west of the front and German fields east of it, well behind the line', () => {
    for (const seed of SEEDS) {
      const w = createWorld(seed);
      for (const af of w.airfieldsNear(0, 0, 40000)) {
        for (const [x, z] of [[af.x, af.z], ...corners(af)]) {
          if (af.side === 'allied') expect(w.frontDistance(x, z)).toBeLessThan(-1100);
          else expect(w.frontDistance(x, z)).toBeGreaterThan(1100);
        }
      }
    }
  });

  it('keeps fields off the river and at least 3 km apart', () => {
    for (const seed of SEEDS) {
      const w = createWorld(seed);
      const list = w.airfieldsNear(0, 0, 40000);
      for (const af of list) {
        for (const [x, z] of [[af.x, af.z], ...corners(af)]) expect(w.isRiver(x, z)).toBe(false);
      }
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) expect(Math.hypot(list[i].x - list[j].x, list[i].z - list[j].z)).toBeGreaterThanOrEqual(3000);
    }
  });

  it('lines every field up within 25 degrees of straight into the wind, and sizes it sensibly', () => {
    expect(all.length).toBeGreaterThan(20);
    for (const af of all) {
      expect(angleDiff(af.heading, WIND.from)).toBeLessThanOrEqual((25 * Math.PI) / 180 + 1e-9);
      expect(af.halfLength).toBeGreaterThanOrEqual(340);
      expect(af.halfLength).toBeLessThanOrEqual(560);
      expect(af.halfWidth).toBeGreaterThanOrEqual(140);
      expect(af.halfWidth).toBeLessThanOrEqual(260);
    }
  });

  it('has Allied and German fields within reach of the start, for every seed', () => {
    for (const seed of SEEDS) {
      const near = createWorld(seed).airfieldsNear(0, 0, 16000);
      expect(near.filter((a) => a.side === 'allied').length).toBeGreaterThanOrEqual(3);
      expect(near.filter((a) => a.side === 'german').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps every landing ground clear of woods, trees, villages and roads', () => {
    for (const af of all.slice(0, 14)) {
      for (let u = -af.halfLength + 1; u < af.halfLength; u += 90) {
        for (let v = -af.halfWidth + 1; v < af.halfWidth; v += 60) {
          const [x, z] = toWorld(af, u, v);
          expect(F.woodDensity(world, x, z), `${af.key} wood`).toBe(0);
          expect(world.inAirfield(x, z)).toBe(true);
        }
      }
      const r = af.halfLength + 60;
      expect(F.trees(world, af.x - r, af.z - r, af.x + r, af.z + r).filter((t) => world.inAirfield(t.x, t.z))).toHaveLength(0);
      expect(world.villages(af.x - r, af.z - r, af.x + r, af.z + r).filter((v) => world.inAirfield(v.x, v.z, 400))).toHaveLength(0);
      for (const road of world.roads(af.x - r, af.z - r, af.x + r, af.z + r)) {
        if (road.airfield === af.key) continue;
        for (const [x, z] of road.pts) expect(world.inAirfield(x, z), `${af.key} road`).toBe(false);
      }
    }
  });

  it('tells you the nearest airfield and the compass bearing to it', () => {
    expect(world.nearestAirfield(0, 0).airfield.key).toBe('start');
    const n = world.nearestAirfield(3000, 0);
    expect(n.airfield.key).toBe('start');
    expect(n.distance).toBeCloseTo(3000, 6);
    expect(n.bearing).toBeCloseTo(270, 6); // due west
    const other = all.find((a) => !a.start);
    const east = world.nearestAirfield(other.x + 800, other.z); // the field is to the west
    expect(east.airfield.key).toBe(other.key);
    expect(east.bearing).toBeCloseTo(270, 6);
    const south = world.nearestAirfield(other.x, other.z + 800); // the field is to the north
    expect(south.bearing).toBeCloseTo(0, 6);
  });

  it('local and world positions convert both ways', () => {
    const af = all.find((a) => !a.start);
    for (const [u, v] of [[0, 0], [100, -50], [-300, 120]]) {
      const [x, z] = toWorld(af, u, v);
      const [uu, vv] = toLocal(af, x, z);
      expect(uu).toBeCloseTo(u, 6);
      expect(vv).toBeCloseTo(v, 6);
    }
  });
});

describe('what stands on a field', () => {
  const fields = [world.airfield, ...all.filter((a) => !a.start).slice(0, 12)];
  const distanceOutside = (af, x, z) => {
    const [u, v] = toLocal(af, x, z);
    return Math.max(Math.abs(u) - af.halfLength, Math.abs(v) - af.halfWidth);
  };

  it('has white triangular markers at all four corners and at most 100 m apart along every long edge', () => {
    for (const af of fields) {
      const f = facilities(world, af);
      expect(f.markers.length).toBeGreaterThanOrEqual(16);
      for (const [cx, cz] of corners(af, -8)) expect(f.markers.some((m) => Math.hypot(m.x - cx, m.z - cz) < 1)).toBe(true);
      for (const side of [-1, 1]) {
        const us = f.markers.map((m) => toLocal(af, m.x, m.z)).filter(([, v]) => Math.abs(v - side * (af.halfWidth - 8)) < 1).map(([u]) => u).sort((a, b) => a - b);
        expect(us.length).toBeGreaterThanOrEqual(8);
        for (let i = 1; i < us.length; i++) expect(us[i] - us[i - 1]).toBeLessThanOrEqual(100);
      }
    }
  });

  it('puts every marker just inside the boundary, with its point aimed into the field', () => {
    for (const af of fields) {
      for (const m of facilities(world, af).markers) {
        expect(distanceOutside(af, m.x, m.z)).toBeLessThan(0);
        expect(distanceOutside(af, m.x, m.z)).toBeGreaterThan(-12);
        const [u, v] = toLocal(af, m.x, m.z);
        // The point's direction in the field's own axes should head toward the centre.
        const dx = Math.sin(m.rot);
        const dz = Math.cos(m.rot);
        const du = dx * Math.sin(af.heading) - dz * Math.cos(af.heading);
        const dv = dx * Math.cos(af.heading) + dz * Math.sin(af.heading);
        expect(du * -u + dv * -v).toBeGreaterThan(0);
      }
    }
  });

  it('has a wind sock and a tower beside the field, and hangars, tents and lorries beyond the upwind end', () => {
    for (const af of fields) {
      const f = facilities(world, af);
      expect(f.windsock.height).toBeCloseTo(16.8, 9); // 20% bigger than the first version
      expect(f.windsock.length).toBeCloseTo(8.4, 9);
      expect(distanceOutside(af, f.windsock.x, f.windsock.z)).toBeGreaterThan(5);
      expect(distanceOutside(af, f.windsock.x, f.windsock.z)).toBeLessThan(40);
      expect(f.windsock.dirX).toBeCloseTo(WIND.toX, 9); // the sock points downwind
      expect(f.tower.height).toBeCloseTo(16.8, 9);
      expect(distanceOutside(af, f.tower.x, f.tower.z)).toBeGreaterThan(10);
      expect(distanceOutside(af, f.tower.x, f.tower.z)).toBeLessThan(50);
      expect(f.hangars.length).toBeGreaterThanOrEqual(3);
      expect(f.hangars.length).toBeLessThanOrEqual(5);
      expect(f.tents.length).toBeGreaterThanOrEqual(6);
      for (const o of [...f.hangars, ...f.tents, ...f.vehicles]) {
        expect(distanceOutside(af, o.x, o.z)).toBeGreaterThan(20);
        expect(toLocal(af, o.x, o.z)[0]).toBeLessThan(-af.halfLength);
      }
      expect(Math.sign(toLocal(af, f.windsock.x, f.windsock.z)[1])).toBe(-Math.sign(toLocal(af, f.tower.x, f.tower.z)[1]));
    }
  });

  it('puts hangars in a row 31 m apart with their doors toward the field', () => {
    for (const af of fields) {
      const hs = facilities(world, af).hangars;
      for (let i = 1; i < hs.length; i++) {
        const a = toLocal(af, hs[i - 1].x, hs[i - 1].z);
        const b = toLocal(af, hs[i].x, hs[i].z);
        expect(Math.abs(Math.abs(b[1] - a[1]) - 31)).toBeLessThan(1e-6);
        expect(Math.abs(b[0] - a[0])).toBeLessThan(1e-6);
      }
      // A model's +Z (where its door is) points along the landing direction, toward the field.
      for (const h of hs) {
        expect(Math.sin(h.rot)).toBeCloseTo(Math.sin(af.heading), 9);
        expect(Math.cos(h.rot)).toBeCloseTo(-Math.cos(af.heading), 9);
      }
    }
  });

  it('gives each field an apron in front of the hangars, and most an access road to a village', () => {
    let roads = 0;
    for (const af of fields) {
      const f = facilities(world, af);
      expect(f.apron.v1).toBeGreaterThan(f.apron.v0);
      expect(distanceOutside(af, ...f.apron.centre)).toBeGreaterThan(20);
      const road = world.airfieldRoad(af);
      if (road) {
        roads++;
        expect(road.pts.length).toBeGreaterThan(5);
        expect(Math.hypot(road.pts[0][0] - f.apron.centre[0], road.pts[0][1] - f.apron.centre[1])).toBeLessThan(1);
      }
    }
    expect(roads).toBeGreaterThan(fields.length / 2);
  });

  it('has no broken numbers', () => {
    for (const af of fields) {
      const f = facilities(world, af);
      const everything = [...f.markers, f.windsock, f.tower, ...f.hangars, ...f.tents, ...f.vehicles];
      for (const o of everything) for (const [k, v] of Object.entries(o)) if (typeof v === 'number') expect(Number.isFinite(v), `${af.key} ${k}`).toBe(true);
    }
  });
});
