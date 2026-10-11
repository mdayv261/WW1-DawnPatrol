import { describe, it, expect } from 'vitest';
import { Box3, Vector3 } from 'three';
import { AIRCRAFT_LIST, AIRCRAFT, common } from '../src/aircraft/index.js';
import { createAircraftMesh, setControlSurfaces } from '../src/render/aircraftMesh.js';
import { wingPlan } from '../src/render/models/layout.js';
import { triangleCount } from '../src/render/models/parts.js';
import { gearGeometry } from '../src/physics/ground.js';

// The 3D models are built from each aircraft's data. These tests check that
// the sizes match the documented dimensions, the number and relative size of
// the wings give each type its recognisable shape, and the wheels sit where
// the ground physics puts them. (How it looks is judged in /hangar.html.)

function build(ac) {
  const m = createAircraftMesh(ac);
  m.group.updateMatrixWorld(true);
  return m;
}
const parts = (group, name) => {
  const out = [];
  group.traverse((o) => { if (o.userData?.part === name) out.push(o); });
  return out;
};
const boxOf = (o) => new Box3().setFromObject(o);

describe('aircraft models', () => {
  for (const ac of AIRCRAFT_LIST) {
    describe(ac.name, () => {
      const { group, prop } = build(ac);

      it('has the documented wingspan and roughly the documented length', () => {
        const b = boxOf(group);
        expect((b.max.z - b.min.z) / ac.geometry.wingspan).toBeGreaterThan(0.99);
        expect((b.max.z - b.min.z) / ac.geometry.wingspan).toBeLessThan(1.01);
        const length = b.max.x - b.min.x;
        expect(length / ac.geometry.length).toBeGreaterThan(0.97);
        expect(length / ac.geometry.length).toBeLessThan(1.06); // the propeller adds a little
      });

      it('has one wing per entry of the wing stack, with the documented spans, top first', () => {
        const wings = parts(group, 'wing').sort((a, b) => b.userData.span - a.userData.span || 0);
        expect(wings).toHaveLength(ac.wings);
        const bySpan = ac.wingStack.map((w) => w.span).sort((a, b) => b - a);
        wings.forEach((w, i) => expect(w.userData.span).toBeCloseTo(bySpan[i], 6));
        // Top wing is the highest.
        const heights = parts(group, 'wing').map((w) => boxOf(w).max.y);
        expect(Math.max(...heights)).toBe(boxOf(parts(group, 'wing').find((w) => w.userData.span === ac.wingStack[0].span)).max.y);
      });

      it('wheels touch the ground exactly where the physics says, and the tailskid reaches its contact point', () => {
        const g = gearGeometry(ac, common);
        const wheels = parts(group, 'wheel');
        expect(wheels).toHaveLength(2);
        for (const w of wheels) {
          const b = boxOf(w);
          expect(b.min.y).toBeCloseTo(g.contactY, 2);
          expect((b.min.x + b.max.x) / 2).toBeCloseTo(g.mainX, 2);
          expect(Math.abs((b.min.z + b.max.z) / 2)).toBeCloseTo(ac.gear.track / 2, 2);
        }
        const [skid] = parts(group, 'skid');
        const tip = new Vector3();
        const b = boxOf(skid);
        tip.set((b.min.x + b.max.x) / 2, b.min.y, 0);
        expect(Math.abs(b.min.y - g.tailY)).toBeLessThan(0.06);
        expect(b.min.x).toBeLessThan(g.tailX + 0.1);
      });

      it('has a propeller of the documented diameter at the physics propeller plane', () => {
        prop.updateMatrixWorld(true);
        const blade = boxOf(prop);
        expect((blade.max.y - blade.min.y) / ac.propeller.diameter).toBeGreaterThan(0.99);
        expect((blade.max.y - blade.min.y) / ac.propeller.diameter).toBeLessThan(1.01);
        expect(prop.position.x).toBeCloseTo(0.36 * ac.geometry.length + 0.05, 6);
        expect(group.children).toContain(prop);
      });

      it('stays within the triangle budget and has no broken geometry', () => {
        expect(triangleCount(group)).toBeLessThan(3000);
        group.traverse((o) => {
          if (o.geometry) {
            for (const v of o.geometry.attributes.position.array) expect(Number.isFinite(v)).toBe(true);
          }
        });
      });
    });
  }

  it('the Camel has two wings of equal span and chord, the lower one on dihedral', () => {
    const { group } = build(AIRCRAFT.camel);
    const [a, b] = parts(group, 'wing');
    expect(a.userData.span).toBeCloseTo(b.userData.span, 6);
    expect(a.userData.chord).toBeCloseTo(b.userData.chord, 6);
    const lowest = parts(group, 'wing').sort((p, q) => boxOf(p).min.y - boxOf(q).min.y)[0];
    const bb = boxOf(lowest);
    expect(bb.max.y - bb.min.y).toBeGreaterThan(0.3); // tips lifted by the 5 degrees of dihedral
  });

  it('the Dr.I is a triplane with each wing smaller than the one above', () => {
    const { group } = build(AIRCRAFT.dr1);
    const wings = parts(group, 'wing').sort((p, q) => boxOf(q).max.y - boxOf(p).max.y);
    expect(wings).toHaveLength(3);
    expect(wings[0].userData.span).toBeGreaterThan(wings[1].userData.span);
    expect(wings[1].userData.span).toBeGreaterThan(wings[2].userData.span);
  });

  it('the Albatros is a sesquiplane: the lower wing has under 70% of the upper wing chord', () => {
    const { group } = build(AIRCRAFT.albatros);
    const wings = parts(group, 'wing').sort((p, q) => boxOf(q).max.y - boxOf(p).max.y);
    expect(wings[1].userData.chord / wings[0].userData.chord).toBeLessThan(0.7);
    expect(wings[0].userData.chord).toBeCloseTo(AIRCRAFT.albatros.visual.chord, 6);
  });

  it('the SPAD is a two-bay biplane (four struts a side at two spanwise positions); the Camel has one bay', () => {
    const bays = (ac) => {
      const struts = parts(build(ac).group, 'interplane');
      return { count: struts.length, positions: new Set(struts.map((s) => s.userData.z)).size };
    };
    expect(bays(AIRCRAFT.spad13)).toEqual({ count: 8, positions: 2 });
    expect(bays(AIRCRAFT.camel)).toEqual({ count: 4, positions: 1 });
  });
});

describe('control surfaces', () => {
  const expectedAilerons = { camel: 4, spad13: 2, dr1: 2, albatros: 2 }; // the Camel had them on both wings
  const box = (o) => { o.updateMatrixWorld(true); return new Box3().setFromObject(o); };
  const REST = { pull: 0, roll: 0, yaw: 0 };

  for (const ac of AIRCRAFT_LIST) {
    describe(ac.name, () => {
      it('has the right number of ailerons, two elevators and a rudder', () => {
        const { controls } = build(ac);
        expect(controls.ailerons).toHaveLength(expectedAilerons[ac.id]);
        expect(controls.elevators).toHaveLength(2);
        expect(controls.rudder).toBeTruthy();
      });

      it('ailerons sit on the trailing edge of the wing, hinged at their leading edge', () => {
        const m = build(ac);
        const [upper] = wingPlan(ac);
        const topAilerons = m.controls.ailerons.filter((a) => Math.abs(a.position.y - upper.y) < 0.05 + Math.abs(a.position.z) * 0.1);
        expect(topAilerons.length).toBeGreaterThanOrEqual(2);
        for (const a of topAilerons) {
          const b = box(a);
          expect(b.min.x).toBeCloseTo(upper.x - upper.chord / 2, 1); // the rear edge is the wing's trailing edge
          expect(a.position.x).toBeGreaterThan(b.min.x); // the hinge is ahead of it
          expect(Math.abs(a.position.z)).toBeGreaterThan(0.4 * upper.span / 2);
          expect(Math.abs(a.position.z)).toBeLessThan(upper.span / 2);
        }
      });

      it('pulling back raises both elevators\' trailing edges; pushing forward lowers them', () => {
        const m = build(ac);
        const rest = m.controls.elevators.map((e) => box(e));
        setControlSurfaces(m, { ...REST, pull: 0.3 });
        m.controls.elevators.forEach((e, i) => expect(box(e).max.y).toBeGreaterThan(rest[i].max.y + 0.05));
        setControlSurfaces(m, { ...REST, pull: -0.3 });
        m.controls.elevators.forEach((e, i) => expect(box(e).min.y).toBeLessThan(rest[i].min.y - 0.05));
        setControlSurfaces(m, REST);
        m.controls.elevators.forEach((e, i) => expect(box(e).max.y).toBeCloseTo(rest[i].max.y, 6));
      });

      it('rolling right raises the right ailerons and lowers the left ones', () => {
        const m = build(ac);
        const rest = m.controls.ailerons.map((a) => box(a));
        setControlSurfaces(m, { ...REST, roll: 0.3 });
        m.controls.ailerons.forEach((a, i) => {
          const b = box(a);
          if (a.userData.side > 0) expect(b.max.y).toBeGreaterThan(rest[i].max.y + 0.03);
          else expect(b.min.y).toBeLessThan(rest[i].min.y - 0.03);
        });
      });

      it('right rudder swings the rudder\'s trailing edge to the right', () => {
        const m = build(ac);
        const rest = box(m.controls.rudder);
        setControlSurfaces(m, { ...REST, yaw: 0.3 });
        expect(box(m.controls.rudder).max.z).toBeGreaterThan(rest.max.z + 0.1);
        setControlSurfaces(m, { ...REST, yaw: -0.3 });
        expect(box(m.controls.rudder).min.z).toBeLessThan(rest.min.z - 0.1);
      });

      it('does not change the overall size of the model at rest', () => {
        const m = build(ac);
        const before = boxOf(m.group);
        setControlSurfaces(m, REST);
        const after = boxOf(m.group);
        expect(after.min.distanceTo(before.min)).toBeLessThan(1e-9);
        expect(after.max.distanceTo(before.max)).toBeLessThan(1e-9);
      });
    });
  }

  it('does nothing for a model with no control surfaces', () => {
    expect(() => setControlSurfaces({}, REST)).not.toThrow();
  });
});
