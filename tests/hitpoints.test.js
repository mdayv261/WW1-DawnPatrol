import { describe, it, expect } from 'vitest';
import { AIRCRAFT_LIST, common } from '../src/aircraft/index.js';
import { hitPoints } from '../src/physics/hitpoints.js';
import { gearGeometry } from '../src/physics/ground.js';

// The points of an aircraft that crash it against trees and buildings.

describe('aircraft hit points', () => {
  for (const ac of AIRCRAFT_LIST) {
    describe(ac.name, () => {
      const pts = hitPoints(ac, common);
      const g = gearGeometry(ac, common);
      const L = ac.geometry.length;

      it('has 23 to 30 finite points, the same list every time', () => {
        expect(pts.length).toBeGreaterThanOrEqual(23);
        expect(pts.length).toBeLessThanOrEqual(30);
        for (const p of pts) for (const c of [p.x, p.y, p.z]) expect(Number.isFinite(c)).toBe(true);
        expect(hitPoints(ac, common)).toBe(pts);
      });

      it('reaches the nose, the propeller tips, the tail and every wing tip', () => {
        const maxX = Math.max(...pts.map((p) => p.x));
        const minX = Math.min(...pts.map((p) => p.x));
        expect(maxX).toBeGreaterThanOrEqual(0.36 * L + 0.05);
        expect(minX).toBeCloseTo(-0.65 * L, 6);
        const D = ac.propeller.diameter;
        expect(pts.some((p) => Math.abs(p.y - D / 2) < 1e-9 && p.x > 0.3 * L)).toBe(true); // top blade tip
        expect(pts.some((p) => Math.abs(p.z - D / 2) < 1e-9 && p.x > 0.3 * L)).toBe(true); // side blade tip
        for (const w of ac.wingStack) {
          expect(pts.some((p) => Math.abs(p.z - w.span / 2) < 1e-9)).toBe(true);
          expect(pts.some((p) => Math.abs(p.z + w.span / 2) < 1e-9)).toBe(true);
        }
        expect(Math.max(...pts.map((p) => Math.abs(p.z)))).toBeCloseTo(Math.max(...ac.wingStack.map((w) => w.span)) / 2, 6);
        expect(Math.max(...pts.map((p) => Math.abs(p.z)))).toBeCloseTo(ac.geometry.wingspan / 2, 2); // and agrees with the documented span
      });

      it('puts the wheels at the ground contact height and the top wing at the documented height', () => {
        expect(Math.min(...pts.map((p) => p.y))).toBeCloseTo(Math.min(g.contactY, g.tailY, -ac.propeller.diameter / 2), 6);
        for (const c of g.contacts) expect(pts.some((p) => p.distanceTo(c.p) < 1e-9)).toBe(true);
        const topWingY = Math.max(...pts.filter((p) => Math.abs(p.z) > ac.wingStack[0].span / 2 - 1e-6).map((p) => p.y));
        expect(Math.abs(topWingY - (g.contactY + ac.geometry.height))).toBeLessThan(0.6);
      });

      it('has the right number of wings: three levels for the triplane, two for the biplanes', () => {
        const wingYs = new Set(pts.filter((p) => Math.abs(p.z) > 2).map((p) => p.y.toFixed(3)));
        expect(wingYs.size).toBeGreaterThanOrEqual(ac.wings); // the Camel's dihedral adds its raised tips
      });
    });
  }
});
