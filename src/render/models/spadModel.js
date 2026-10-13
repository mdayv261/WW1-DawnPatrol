// SPAD S.XIII, marked as Lt A. Raymond Brooks's "Smith IV" of the 22nd Aero
// Squadron (Smithsonian). Silhouette: a long, narrow V8 nose with a flat
// radiator face and a small propeller boss, two-bay braced wings, a slim
// fuselage and rounded tail surfaces. Marking sources: docs/AIRCRAFT_DATA.md.

import { Group } from 'three';
import * as P from './parts.js';
import * as M from './livery.js';
import { cockpitSpan, cockpitStrutTwins, anchors, wingPlan, wingY, strutBay, addSurfaces } from './layout.js';
import { COCKPITS } from '../../aircraft/cockpits.js';

const GREEN = 0x56633a; // upper surfaces and body (Smithsonian: green and brown camouflage)
const GREY = 0xb3b6ae; // undersurfaces (Smithsonian: gray)
const METAL = 0x6e7378;
const WOOD = 0x9a7b4f;

export function createSpad(ac) {
  const v = ac.visual;
  const a = anchors(ac);
  const L = a.L;
  const group = new Group();
  const body = P.lambert(GREEN);
  const metal = P.lambert(METAL);
  const dark = P.lambert(0x222222);
  const wood = P.lambert(WOOD);
  const wingMat = P.vertexColoured();
  const wingColours = [GREEN, GREEN, GREEN, GREY, GREY, GREY]; // upper surface, underside

  const D = v.fuselageDepth;
  const W = v.fuselageWidth;
  const cd = v.cowlingDiameter;
  const stations = [
    { x: 0.36 * L, w: cd * 0.75, h: cd * 0.95, y: 0, p: 3 },
    { x: 0.22 * L, w: cd * 0.95, h: cd * 1.05, y: 0.03, p: 3 },
    { x: 0.05 * L, w: W * 1.05, h: D, y: 0 },
    { x: -0.12 * L, w: W * 0.9, h: D * 0.85, y: -0.01 },
    { x: -0.3 * L, w: W * 0.55, h: D * 0.55, y: -0.01 },
    { x: -0.49 * L, w: W * 0.3, h: D * 0.32, y: 0 },
    { x: a.tailEnd, w: 0.08, h: 0.2, y: 0.05 },
  ];
  group.add(P.fuselageSplit(stations, cockpitSpan(ac), body, 10));
  group.add(P.box(0.06, cd * 0.85, cd * 0.7, metal, a.noseX - 0.01, 0, 0)); // radiator face
  group.add(P.cylinderX(0.12, 0.14, 0.1, metal, a.propX - 0.04, 0, 0, 10)); // propeller boss
  for (const s of [-1, 1]) group.add(P.box(0.5, 0.06, 0.06, metal, 0.18 * L, cd * 0.45, s * 0.2)); // exhaust pipes
  group.add(P.nose(P.box(0.5, 0.02, 0.36, dark, -0.03 * L, D / 2 - 0.005, 0))); // cockpit opening

  const [upper, lower] = wingPlan(ac);
  const controls = { ailerons: [], elevators: [], rudder: null };
  const AILERON = { from: 0.5, to: 0.88, depth: 0.27 }; // upper wing only (an assumption: no source found)
  // The upper wing and its ailerons in their own group, so the cockpit view can narrow it (see COCKPITS).
  const upperWing = new Group();
  upperWing.userData.trailingX = upper.x - upper.chord / 2;
  upperWing.add(P.wing({ ...upper, thickness: 0.08, tip: 'round', colors: wingColours, material: wingMat, cuts: [AILERON] }));
  addSurfaces(upperWing, controls.ailerons, upper, AILERON, 0.08, wingColours, wingMat, 'aileron');
  group.add(upperWing);
  group.add(P.wing({ ...lower, thickness: 0.08, tip: 'round', colors: wingColours, material: wingMat }));
  const half = upper.span / 2;
  const struts = [];
  for (const f of [0.3, 0.68]) struts.push(...strutBay(upper, lower, f * half, wood, { spread: 0.2, chordwise: 0.1 }));
  for (const s of [-1, 1]) { // cabane struts from the fuselage to the upper wing
    struts.push(P.strut([upper.x + 0.3, D / 2 - 0.05, s * 0.2], [upper.x + 0.3, wingY(upper, 0.5) - 0.05, s * 0.6], 0.06, 0.035, wood));
    struts.push(P.strut([upper.x - 0.3, D / 2 - 0.05, s * 0.18], [upper.x - 0.3, wingY(upper, 0.5) - 0.05, s * 0.5], 0.06, 0.035, wood));
  }
  for (const m of struts) group.add(m);
  // The cockpit view draws the upper wing shorter: struts there that reach into the shortened wing.
  for (const m of cockpitStrutTwins(struts, upper, COCKPITS.spad13.upperWingChord, wood)) group.add(m);

  // Tail: rounded tailplane, fin and rudder.
  const tailPlan = { x: -0.55 * L, y: 0.05, span: v.tailSpan, chord: v.tailChord, dihedral: 0 };
  const ELEVATOR = { from: 0.08, to: 0.88, depth: 0.4 };
  group.add(P.wing({ ...tailPlan, thickness: 0.05, colors: wingColours, part: 'tail', material: wingMat, cuts: [ELEVATOR] }));
  addSurfaces(group, controls.elevators, tailPlan, ELEVATOR, 0.05, wingColours, wingMat, 'elevator');
  const fh = v.finHeight;
  const rudderHinge = -0.56 * L;
  const tailSurfaces = P.finAndRudder([[-0.5 * L, 0.1], [-0.54 * L, fh * 0.8], [-0.59 * L, fh + 0.02], [-0.635 * L, fh * 0.85], [-0.65 * L, 0.4], [-0.645 * L, 0.05]], rudderHinge, 0.04, body, body);
  if (tailSurfaces.fin) group.add(tailSurfaces.fin);
  group.add(tailSurfaces.rudder);
  controls.rudder = tailSurfaces.rudder;

  const hubY = a.contactY + a.wheelR;
  for (const s of [-1, 1]) {
    group.add(P.strut([a.mainX + 0.2, -D / 2 + 0.1, s * 0.16], [a.mainX, hubY, s * a.track / 2], 0.08, 0.05, wood));
    group.add(P.strut([a.mainX - 0.3, -D / 2 + 0.1, s * 0.16], [a.mainX, hubY, s * a.track / 2], 0.08, 0.05, wood));
    group.add(P.wheel(a.wheelR, 0.12, P.lambert(0x1c1c1c), a.mainX, hubY, s * a.track / 2));
  }
  group.add(P.box(0.04, 0.04, a.track, dark, a.mainX, hubY, 0));
  const skid = P.strut([a.tailEnd + 0.45, -0.05, 0], [a.tailX, a.tailY, 0], 0.06, 0.05, dark);
  skid.userData.part = 'skid';
  group.add(skid);

  // Markings (Smithsonian): blue shooting-star roundel, red "20", "Smith",
  // small black cross badges, red-white-blue tail stripes.
  const sideZ = (x) => P.fuselageAt(stations, x).w / 2;
  for (const s of [-1, 1]) {
    const star = new Group();
    star.add(M.roundel(0.3, [0x1f3a7a]));
    const st = M.star(0.22, 0xf2f2f2);
    st.position.z = 0.003;
    star.add(st);
    group.add(M.onSide(star, s, -0.1 * L, 0.02, sideZ(-0.1 * L)));
    group.add(M.onSide(M.cross(0.14, 0x111111), s, 0.1 * L, 0.15, sideZ(0.1 * L)));
    const num = M.text('20', 0.34, 0.2, '#b02020');
    if (num) group.add(M.onSide(num, s, -0.2 * L, 0.02, sideZ(-0.2 * L)));
    const name = M.text('Smith', 0.55, 0.14, '#6b3f1e');
    if (name) group.add(M.onSide(name, s, -0.34 * L, -0.03, sideZ(-0.34 * L)));
    [0x1f3a7a, 0xf2f2f2, 0xb02020].forEach((c, i) => {
      controls.rudder.add(M.onSide(M.rect(0.07, fh * 0.7, c), s, -0.615 * L + i * 0.07 - rudderHinge, 0.05 + fh * 0.45, 0.025)); // moves with the rudder
    });
  }

  const prop = P.propeller(ac.propeller.diameter, a.propX, P.lambert(0x6b4b2a), { hub: 0.14, chord: 0.18 });
  group.add(prop);
  return { group, prop, controls, stations, upperWing };
}
