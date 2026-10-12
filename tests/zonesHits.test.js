import { describe, it, expect } from 'vitest';
import { Vector3, Quaternion } from 'three';
import { AIRCRAFT_LIST, common } from '../src/aircraft/index.js';
import { hitZones, segmentBoxEntry } from '../src/weapons/zones.js';
import { aircraftImpact, findImpact } from '../src/weapons/hits.js';

// Hit boxes and the bullet-path tests.

const pose = (x, y, z, q = new Quaternion()) => ({ position: new Vector3(x, y, z), quaternion: q.clone() });

describe('hit boxes', () => {
  for (const ac of AIRCRAFT_LIST) {
    describe(ac.name, () => {
      const zones = hitZones(ac, common);
      const names = zones.map((z) => z.name);

      it('has the engine, fuel tank, pilot, fuselage, tail and a wing box for each wing on each side', () => {
        for (const n of ['engine', 'fuel', 'pilot', 'fuselage', 'tailplane', 'fin']) expect(names, n).toContain(n);
        expect(names.filter((n) => n === 'wingL').length).toBe(ac.wings);
        expect(names.filter((n) => n === 'wingR').length).toBe(ac.wings);
      });

      it('every box is finite and has a size; vital zones come before the fuselage', () => {
        for (const z of zones) for (const k of ['cx', 'cy', 'cz', 'hx', 'hy', 'hz']) expect(Number.isFinite(z[k])).toBe(true);
        for (const z of zones) expect(Math.min(z.hx, z.hy, z.hz)).toBeGreaterThan(0);
        expect(names.indexOf('engine')).toBeLessThan(names.indexOf('fuselage'));
        expect(names.indexOf('pilot')).toBeLessThan(names.indexOf('fuselage'));
      });

      it('right wings are on the right (+Z), left wings on the left, and reach the documented half span', () => {
        for (const z of zones.filter((q) => q.name === 'wingR')) expect(z.cz).toBeGreaterThan(0);
        for (const z of zones.filter((q) => q.name === 'wingL')) expect(z.cz).toBeLessThan(0);
        const reach = Math.max(...zones.filter((q) => q.name === 'wingR').map((z) => z.cz + z.hz));
        expect(reach).toBeCloseTo(Math.max(...ac.wingStack.map((w) => w.span)) / 2, 6);
      });

      it('the engine is ahead of the pilot, the tail behind, the wings level with the fuselage', () => {
        const at = (n) => zones.find((z) => z.name === n);
        expect(at('engine').cx).toBeGreaterThan(at('fuel').cx);
        expect(at('fuel').cx).toBeGreaterThan(at('pilot').cx);
        expect(at('pilot').cx).toBeGreaterThan(at('tailplane').cx);
        expect(at('wingR').cy).toBeGreaterThan(-1);
      });

      it('a shot from the front along the axis meets the engine first; from behind, the tail then the pilot', () => {
        const front = aircraftImpact(ac, pose(0, 0, 0), pose(0, 0, 0), 20, 0, 0, -20, 0, 0);
        expect(front.zone).toBe('engine');
        const back = aircraftImpact(ac, pose(0, 0, 0), pose(0, 0, 0), -20, 0.05, 0, 20, 0.05, 0);
        expect(['tailplane', 'fin', 'fuselage']).toContain(back.zone);
      });

      it('a shot from above onto the right or left wing reports that side', () => {
        const half = ac.wingStack[0].span / 2;
        const x = hitZones(ac, common).find((z) => z.name === 'wingR').cx;
        const y = hitZones(ac, common).find((z) => z.name === 'wingR').cy;
        const right = aircraftImpact(ac, pose(0, 0, 0), pose(0, 0, 0), x, y + 5, half * 0.6, x, y - 5, half * 0.6);
        const left = aircraftImpact(ac, pose(0, 0, 0), pose(0, 0, 0), x, y + 5, -half * 0.6, x, y - 5, -half * 0.6);
        expect(right.zone).toBe('wingR');
        expect(left.zone).toBe('wingL');
      });

      it('a shot beside the wing tip, or above the aircraft, misses', () => {
        const half = ac.wingStack[0].span / 2;
        expect(aircraftImpact(ac, pose(0, 0, 0), pose(0, 0, 0), 0, 0, half + 0.5, 10, 0, half + 0.5)).toBeNull();
        expect(aircraftImpact(ac, pose(0, 0, 0), pose(0, 0, 0), -5, 8, 0, 5, 8, 0)).toBeNull();
      });
    });
  }
});

describe('segmentBoxEntry', () => {
  const box = { cx: 0, cy: 0, cz: 0, hx: 1, hy: 1, hz: 1 };
  it('gives the fraction of the way to the first face, 0 from inside, -1 for a miss', () => {
    expect(segmentBoxEntry(-3, 0, 0, 3, 0, 0, box)).toBeCloseTo(1 / 3, 9);
    expect(segmentBoxEntry(0, 0, 0, 5, 0, 0, box)).toBe(0);
    expect(segmentBoxEntry(-3, 2, 0, 3, 2, 0, box)).toBe(-1);
    expect(segmentBoxEntry(-3, 0, 0, -2, 0, 0, box)).toBe(-1); // stops short
    expect(segmentBoxEntry(-3, 0.5, 0.5, 3, 0.5, 0.5, { ...box, hy: 0.4 })).toBe(-1);
  });
  it('handles a path parallel to a face', () => {
    expect(segmentBoxEntry(-3, 0.9, 0, 3, 0.9, 0, box)).toBeCloseTo(1 / 3, 9);
    expect(segmentBoxEntry(-3, 1.1, 0, 3, 1.1, 0, box)).toBe(-1);
  });
  it('a diagonal path through a corner region', () => {
    expect(segmentBoxEntry(-3, -3, 0, 3, 3, 0, box)).toBeCloseTo(1 / 3, 9);
  });
});

describe('fast bullets and moving targets', () => {
  const ac = AIRCRAFT_LIST[0];
  const wing = hitZones(ac, common).find((z) => z.name === 'wingR');

  it('a bullet that crosses a thin wing in one step is not missed (it moves 6 m a step, the wing is 0.4 m thick)', () => {
    const y = wing.cy;
    const hit = aircraftImpact(ac, pose(0, 0, 0), pose(0, 0, 0), wing.cx, y + 3, wing.cz, wing.cx, y - 3, wing.cz);
    expect(hit.zone).toBe('wingR');
    expect(hit.t).toBeGreaterThan(0.3);
    expect(hit.t).toBeLessThan(0.7);
  });

  it('a target that moves across the path during the step is tested at both ends of the step', () => {
    const tip = wing.cz + wing.hz; // the outer edge of the right wing, in body axes
    const path = [wing.cx - 3, wing.cy, 0, wing.cx + 3, wing.cy, 0]; // the bullet runs along X at world z = 0
    // A target that stays put with its wing tip 0.3 m off the path: a miss.
    expect(aircraftImpact(ac, pose(0, 0, -tip - 0.3), pose(0, 0, -tip - 0.3), ...path)).toBeNull();
    // The same target moving 0.8 m sideways during the step, its wing tip crossing the path: a hit.
    expect(aircraftImpact(ac, pose(0, 0, -tip + 0.5), pose(0, 0, -tip - 0.3), ...path)?.zone).toBe('wingR');
  });

  it('the aircraft turns the boxes with it: rolled 90 degrees, a shot from above meets the side', () => {
    const q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2); // rolled onto its side
    const state = pose(100, 500, 100, q);
    // The right wing (body +Z) now points down; fire from below at the right wing tip region.
    const half = ac.wingStack[0].span / 2;
    const tipBody = new Vector3(wing.cx, wing.cy, half * 0.6).applyQuaternion(q).add(state.position);
    const hit = aircraftImpact(ac, state, state, tipBody.x, tipBody.y - 4, tipBody.z, tipBody.x, tipBody.y + 4, tipBody.z);
    expect(hit.zone).toBe('wingR');
  });

  it('far away aircraft are skipped quickly', () => {
    expect(aircraftImpact(ac, pose(5000, 1000, 0), pose(5000, 1000, 0), 0, 1000, 0, 10, 1000, 0)).toBeNull();
  });
});

describe('findImpact: the first thing in the way', () => {
  const ac = AIRCRAFT_LIST[3];
  const target = { id: 1, aircraft: ac, state: pose(0, 10, 0), previous: pose(0, 10, 0) }; // 10 m up, where trees and buildings can matter

  it('the ground stops a bullet at the right point', () => {
    const hit = findImpact(0, 10, 0, 40, -10, 0, []);
    expect(hit.kind).toBe('ground');
    expect(hit.t).toBeCloseTo(0.5, 9);
  });

  it('a tree or building (the solidAt callback) stops a bullet, and the label comes back', () => {
    const hit = findImpact(0, 5, 0, 30, 5, 0, [], (x) => (x > 12 ? 'Hit a tree' : null));
    expect(hit.kind).toBe('solid');
    expect(hit.label).toBe('Hit a tree');
    expect(hit.t).toBeGreaterThan(0.4);
    expect(hit.t).toBeLessThan(0.5);
  });

  it('an aircraft in front of a tree is hit first, and a tree in front of the aircraft shields it', () => {
    const front = findImpact(-30, 10, 0, 30, 10, 0, [target], (x) => (x > 20 ? 'Hit a tree' : null));
    expect(front.kind).toBe('aircraft');
    const shielded = findImpact(-30, 10, 0, 30, 10, 0, [target], (x) => (x > -10 ? 'Hit a tree' : null));
    expect(shielded.kind).toBe('solid');
  });

  it('nothing in the way gives null; the earliest of two targets wins', () => {
    expect(findImpact(0, 300, 0, 40, 300, 0, [target])).toBeNull();
    const far = { id: 2, aircraft: ac, state: pose(60, 10, 0), previous: pose(60, 10, 0) };
    const hit = findImpact(-30, 10, 0, 120, 10, 0, [far, target]);
    expect(hit.target.id).toBe(1);
  });
});
