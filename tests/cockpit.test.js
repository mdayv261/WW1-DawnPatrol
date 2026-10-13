import { describe, it, expect } from 'vitest';
import { Raycaster, Vector3, Box3 } from 'three';
import { rng, tiledNoise, fractal } from '../src/render/cockpit/noise.js';
import { PATTERNS } from '../src/render/cockpit/textures.js';
import { createCockpit, eyePosition } from '../src/render/cockpit.js';
import { createAircraftMesh, setUpperWingChord } from '../src/render/aircraftMesh.js';
import { wingPlan, wingY } from '../src/render/models/layout.js';
import { archHeight, rimHalfWidth } from '../src/render/cockpit/parts.js';
import { createInstrumentPanel } from '../src/ui/instrumentPanel.js';
import { triangleCount, fuselageAt } from '../src/render/models/parts.js';
import { COCKPITS } from '../src/aircraft/cockpits.js';
import { PANELS } from '../src/aircraft/panels.js';
import { AIRCRAFT_LIST } from '../src/aircraft/index.js';

// The 3D cockpits (Phase 6): rendering only, so these are geometry checks, run without a browser.

const build = (ac) => {
  const model = createAircraftMesh(ac);
  const panel = createInstrumentPanel(ac);
  return { model, cockpit: createCockpit(ac, panel, model) };
};
const part = (cockpit, name) => cockpit.group.getObjectByName(name);
const bounds = (object) => new Box3().setFromObject(object);

describe('code-made textures', () => {
  it('the noise is the same for the same seed, between 0 and 1, and tiles', () => {
    expect([rng(7)(), rng(7)()]).toEqual([rng(7)(), rng(7)()].map(() => rng(7)()));
    const n = tiledNoise(3, 8);
    for (const [x, y] of [[0.3, 0.7], [5.5, 2.25], [7.9, 7.9]]) {
      expect(n(x, y)).toBeGreaterThanOrEqual(0);
      expect(n(x, y)).toBeLessThanOrEqual(1);
      expect(n(x + 8, y + 16)).toBeCloseTo(n(x, y), 10); // repeats every 8 cells
    }
    const f = fractal(5, 4);
    expect(f(0.1, 0.9)).toBeCloseTo(f(1.1, 1.9), 10);
  });

  it('every pattern gives colours 0-255 and heights 0-1', () => {
    for (const [name, make] of Object.entries(PATTERNS)) {
      const p = make();
      for (const [u, v] of [[0, 0], [0.25, 0.6], [0.9, 0.33], [0.5, 0.5]]) {
        const { rgb, h } = p(u, v);
        expect(rgb, name).toHaveLength(3);
        for (const c of rgb) expect(c >= 0 && c <= 255, `${name} colour ${c}`).toBe(true);
        expect(h >= 0 && h <= 1, `${name} height ${h}`).toBe(true);
      }
    }
  });
});

describe('cockpits', () => {
  for (const ac of AIRCRAFT_LIST) {
    describe(ac.name, () => {
      const { cockpit } = build(ac);
      const eye = eyePosition(ac);
      const c = COCKPITS[ac.id];

      it('has a gauge for every panel instrument, and the strut instrument on the strut', () => {
        const inside = PANELS[ac.id].instruments.filter((i) => i.mount !== 'strut').length;
        const gauges = [];
        cockpit.group.traverse((o) => { if (o.name === 'gauge') gauges.push(o); });
        expect(gauges).toHaveLength(inside);
        const strut = PANELS[ac.id].instruments.some((i) => i.mount === 'strut');
        expect(Boolean(part(cockpit, 'strutGauge'))).toBe(strut);
      });

      it('the line of sight along the guns is clear (only the sight and glass are in it)', () => {
        const solid = [];
        cockpit.group.updateMatrixWorld(true);
        cockpit.group.traverse((o) => {
          let sight = false;
          for (let p = o; p; p = p.parent) if (p.name === 'sight') sight = true;
          if (o.isMesh && !sight && !o.material.transparent) solid.push(o);
        });
        const ray = new Raycaster(new Vector3(eye.x, eye.y, 0), new Vector3(1, 0, 0), 0, 4);
        expect(ray.intersectObjects(solid, false).map((h) => h.object.name || h.object.geometry.type)).toEqual([]);
      });

      it('the padded rim is below the eye and within the fuselage', () => {
        const b = bounds(part(cockpit, 'coaming'));
        expect(b.max.y).toBeLessThan(eye.y - 0.1);
        // All the way round it stays on the fuselage: never out past its side, where the opening is wider than the body.
        const stations = createAircraftMesh(ac).stations;
        const v = new Vector3();
        part(cockpit, 'coaming').traverse((o) => {
          if (!o.isMesh) return;
          const p = o.geometry.attributes.position;
          for (let i = 0; i < p.count; i += 7) {
            v.fromBufferAttribute(p, i);
            expect(Math.abs(v.z)).toBeLessThanOrEqual(fuselageAt(stations, v.x).w / 2 + c.opening.rimRadius + 0.002);
          }
        });
        const widest = Math.max(...[c.opening.back, c.opening.front].map((x) => fuselageAt(createAircraftMesh(ac).stations, x).w / 2));
        expect(Math.max(-b.min.z, b.max.z)).toBeLessThanOrEqual(widest + c.opening.rimRadius + 0.01);
      });

      it('the instrument board and windscreen are ahead of the eye', () => {
        expect(c.panel.x - eye.x).toBeGreaterThan(0.3);
        const w = part(cockpit, 'windscreen');
        if (w) expect(bounds(w).min.x).toBeGreaterThan(eye.x + 0.25);
      });

      it('the stick and throttle follow the controls, within their travel', () => {
        cockpit.animate({ pull: 1, roll: -1, throttle: 0 }, null);
        expect(cockpit.stick.rotation.z).toBeGreaterThan(0.2); // pulled back
        expect(cockpit.stick.rotation.x).toBeLessThan(-0.2); // to the left
        const closed = cockpit.throttle.rotation.z;
        cockpit.animate({ pull: 0, roll: 0, throttle: 1 }, null);
        expect(cockpit.stick.rotation.z).toBe(0);
        expect(cockpit.throttle.rotation.z).toBeLessThan(closed); // the lever goes forward
        for (const r of [closed, cockpit.throttle.rotation.z]) expect(Math.abs(r)).toBeLessThan(0.6);
      });

      it('costs a bounded number of triangles', () => {
        expect(triangleCount(cockpit.group)).toBeLessThan(40000);
      });
    });
  }
});

describe('SPAD upper wing in the cockpit view', () => {
  // The lowest angle above the pilot's line of sight at which the centre of the upper wing is seen.
  const lowestAngle = (ac, model) => {
    const wing = model.upperWing ?? model.group.children.find((o) => o.isMesh && o.userData.part === 'wing');
    model.group.updateMatrixWorld(true);
    const eye = eyePosition(ac);
    const v = new Vector3();
    let lo = Infinity;
    wing.traverse((o) => {
      if (!o.isMesh) return;
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
        if (Math.abs(v.z) < 0.4 && v.y > eye.y) lo = Math.min(lo, Math.atan2(v.y - eye.y, v.x - eye.x));
      }
    });
    return (lo * 180) / Math.PI;
  };

  it('is shortened from the front, keeping its trailing edge, and goes back to full size outside', () => {
    const spad = AIRCRAFT_LIST.find((a) => a.id === 'spad13');
    const model = createAircraftMesh(spad);
    const box = () => {
      model.group.updateMatrixWorld(true);
      return bounds(model.upperWing);
    };
    const full = box();
    const k = COCKPITS.spad13.upperWingChord;
    setUpperWingChord(model, k);
    const short = box();
    expect(short.max.x - short.min.x).toBeCloseTo((full.max.x - full.min.x) * k, 6);
    expect(short.min.x).toBeCloseTo(full.min.x, 6); // the trailing edge stays
    setUpperWingChord(model, 1);
    expect(box().max.x).toBeCloseTo(full.max.x, 6);
  });

  it("from the seat it ends as far above the sight line as the Camel's (within half a degree)", () => {
    const camel = AIRCRAFT_LIST.find((a) => a.id === 'camel');
    const spad = AIRCRAFT_LIST.find((a) => a.id === 'spad13');
    const model = createAircraftMesh(spad);
    setUpperWingChord(model, COCKPITS.spad13.upperWingChord);
    expect(Math.abs(lowestAngle(spad, model) - lowestAngle(camel, createAircraftMesh(camel)))).toBeLessThan(0.5);
  });

  it('in the cockpit view its struts reach up into the shortened wing (and the full-size ones are hidden)', () => {
    const spad = AIRCRAFT_LIST.find((a) => a.id === 'spad13');
    const model = createAircraftMesh(spad);
    const upper = wingPlan(spad)[0];
    const k = COCKPITS.spad13.upperWingChord;
    const te = upper.x - upper.chord / 2;
    const le = te + upper.chord * k;
    const twins = model.showInCockpit.filter((o) => o.userData.part === 'cockpitStrut');
    expect(twins).toHaveLength(12); // 8 interplane and 4 cabane struts
    for (const t of twins) {
      const top = t.userData.ends.reduce((p, q) => (q[1] > p[1] ? q : p));
      expect(top[0]).toBeGreaterThan(te);
      expect(top[0]).toBeLessThan(le);
      expect(top[1]).toBeCloseTo(wingY(upper, top[2]), 6); // up to the wing's centre line
      expect(t.visible).toBe(false); // until the cockpit view shows it
    }
    const hiddenStruts = model.hideInCockpit.filter((o) => o.userData.ends);
    expect(hiddenStruts).toHaveLength(12);
  });

  it('only the SPAD narrows its wing', () => {
    for (const ac of AIRCRAFT_LIST) if (ac.id !== 'spad13') expect(COCKPITS[ac.id].upperWingChord ?? 1).toBe(1);
  });
});

describe('the Fokker Dr.I cockpit (laid out as a photograph of a replica, S52, with period instruments)', () => {
  const dr1 = AIRCRAFT_LIST.find((a) => a.id === 'dr1');
  const { cockpit } = build(dr1);
  const { muzzleX, muzzleY, muzzleZ } = dr1.guns;

  it('has a small ring sight on top of each gun and no centre sight', () => {
    const rings = [];
    part(cockpit, 'sight').traverse((o) => { if (o.isMesh && o.geometry.type === 'TorusGeometry') rings.push(o); });
    expect(rings).toHaveLength(2);
    for (const r of rings) expect(r.geometry.parameters.radius).toBeCloseTo(0.0385, 6); // made larger twice (product owner)
    for (const r of rings) {
      expect(Math.abs(r.position.z)).toBeCloseTo(muzzleZ, 6); // over a gun, not on the centre line
      expect(r.position.y).toBeGreaterThan(muzzleY);
      expect(r.position.x).toBeLessThan(muzzleX);
    }
  });

  it('the guns stand on posts down into the cockpit, joined by a cross bar; no strut dial', () => {
    const b = bounds(part(cockpit, 'gunPosts'));
    expect(b.max.y).toBeCloseTo(muzzleY - 0.06, 2); // up to the bottom of the guns
    expect(b.min.y).toBeLessThan(COCKPITS.dr1.panel.topY - PANELS.dr1.size[1]); // below the panel
    expect(part(cockpit, 'strutGauge')).toBeUndefined();
  });

  it('a padded leather cushion block covers the rear of each breech, below the line of sight', () => {
    const pads = [];
    cockpit.group.traverse((o) => { if (o.name === 'gunPad') pads.push(o); });
    expect(pads).toHaveLength(2);
    const eye = eyePosition(dr1);
    for (const p of pads) {
      const b = bounds(p);
      expect(Math.abs(p.position.z)).toBeCloseTo(muzzleZ, 6); // one on each gun
      expect(b.max.x).toBeLessThan(COCKPITS.dr1.breechX - 0.02); // just behind the rear plate, toward the pilot
      expect(b.max.x).toBeGreaterThan(COCKPITS.dr1.breechX - 0.03); // touching it
      expect(b.max.y - b.min.y).toBeGreaterThan(0.1); // as tall as the rear cover (0.102 m)
      expect(b.max.y).toBeLessThan(eye.y);
      expect(p.material).toBe(cockpit.materials.leather);
    }
  });

  it('the gun posts pass between the dials, not in front of them', () => {
    const [pw, ph] = PANELS.dr1.size;
    for (const i of PANELS.dr1.instruments.filter((d) => !d.mount)) {
      const z = (i.x - 0.5) * pw;
      const half = i.r * ph * (i.kind === 'slip' ? 1.7 : 1.12);
      for (const s of [-1, 1]) expect(Math.abs(z - s * muzzleZ), i.kind).toBeGreaterThan(half + 0.012); // the post's radius
    }
  });
});

describe('gun heights', () => {
  it('the rotary-engined aircraft carry their guns above the cowling, not inside it', () => {
    for (const id of ['camel', 'dr1']) {
      const ac = AIRCRAFT_LIST.find((a) => a.id === id);
      expect(ac.guns.muzzleY, id).toBeGreaterThan(ac.visual.cowlingDiameter / 2 + 0.02);
    }
  });
});

describe('narrow brown rims that arch over the front of the cockpit (all four aircraft)', () => {
  for (const id of ['camel', 'spad13', 'dr1', 'albatros']) {
    it(`${id}: clears the tops of every dial below it, and there is no crash pad`, () => {
      const ac = AIRCRAFT_LIST.find((a) => a.id === id);
      const { model } = build(ac);
      const c = COCKPITS[id];
      const [pw, ph] = PANELS[id].size;
      expect(c.opening.frontArch).toBeDefined();
      expect(c.crashPad).toBe(false);
      for (const i of PANELS[id].instruments) {
        if (i.mount) continue;
        const z = (i.x - 0.5) * pw;
        const top = c.panel.topY - i.y * ph + i.r * ph * 1.12; // the bezel's top
        expect(archHeight(model.stations, c.opening, z) - c.opening.rimRadius, i.kind).toBeGreaterThan(top);
        // On the Dr.I (and the Albatros, whose panel is the same) its sides also stay inside the rim's sides (product owner). (The Camel's pulsator, signed off
        // as it is, tucks 5 mm under its rim.)
        if (id === 'dr1' || id === 'albatros') expect(Math.abs(z) + i.r * ph * 1.12, i.kind).toBeLessThan(rimHalfWidth(model.stations, c.opening, c.opening.front) - c.opening.rimRadius);
      }
      expect(c.opening.frontArch + c.opening.rimRadius).toBeLessThan(ac.cockpit.eyeAbove); // below the line of sight
      // Where it runs under the gun breeches (front to back they overlap: the Dr.I), it passes beneath them.
      const { muzzleY, muzzleZ, type } = ac.guns;
      const receiverBottom = muzzleY - (type === 'lmg0815' ? 0.06 : 0.055);
      if (c.opening.front + c.opening.rimRadius > c.breechX - 0.0205) { // the rear plate's back face (parts.js gun())
        expect(archHeight(model.stations, c.opening, Math.min(muzzleZ, c.opening.halfWidth)) + c.opening.rimRadius).toBeLessThan(receiverBottom);
      }
      // And it is the same narrow brown leather in every aircraft.
      expect(c.opening.rimRadius).toBe(COCKPITS.spad13.opening.rimRadius);
      expect(c.style.leather).toBe(COCKPITS.spad13.style.leather);
    });
  }
});


describe('wing undersides', () => {
  it("the Camel's upper wing is cream all over underneath and brown on top (no blending between them)", () => {
    const camel = AIRCRAFT_LIST.find((a) => a.id === 'camel');
    const model = createAircraftMesh(camel);
    const wings = [];
    model.group.traverse((o) => { if (o.isMesh && o.userData.part === 'wing') wings.push(o); });
    const upper = wings.reduce((a, b) => (bounds(b).max.y > bounds(a).max.y ? b : a));
    const pos = upper.geometry.attributes.position;
    const col = upper.geometry.attributes.color;
    const [A, B, C] = [new Vector3(), new Vector3(), new Vector3()];
    const cream = [0xd8 / 255, 0xcc / 255, 0xaa / 255];
    const brown = [0x7a / 255, 0x4b / 255, 0x2c / 255];
    let under = 0;
    for (let i = 0; i < pos.count; i += 3) {
      A.fromBufferAttribute(pos, i);
      B.fromBufferAttribute(pos, i + 1);
      C.fromBufferAttribute(pos, i + 2);
      const n = B.clone().sub(A).cross(C.clone().sub(A)).normalize();
      if (Math.abs(n.y) < 0.5) continue; // edges
      const want = n.y < 0 ? cream : brown;
      if (n.y < 0) under++;
      for (let k = 0; k < 3; k++) for (let ch = 0; ch < 3; ch++) expect(col.getComponent(i + k, ch)).toBeCloseTo(want[ch], 3);
    }
    expect(under).toBeGreaterThan(10);
  });
});
