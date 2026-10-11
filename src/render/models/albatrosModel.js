// Albatros D.Va 7161/17 of Jasta 46, as in the Smithsonian. Silhouette: a
// sesquiplane (narrow lower wing) on V-struts, a deep elliptical plywood
// fuselage, a large pointed spinner, the radiator in the upper wing and an
// exhaust pipe up the side. Marking sources: docs/AIRCRAFT_DATA.md.

import { Group } from 'three';
import * as P from './parts.js';
import * as M from './livery.js';
import { anchors, wingPlan, wingY, addSurfaces } from './layout.js';

const WOOD = 0xb98c52; // natural plywood fuselage
const GREEN = 0x3e6a38; // nose and tail (Jasta 46)
const YELLOW = 0xd9b52a;
const LOZENGE_TOP = 0x5f6460; // one blended colour standing in for the multicolour lozenge fabric
const LOZENGE_UNDER = 0xa9adb8;
const SPINNER = 0.3; // length of the spinner ahead of the propeller plane

export function createAlbatros(ac) {
  const v = ac.visual;
  const a = anchors(ac);
  const L = a.L;
  const tailEnd = a.tailEnd + SPINNER; // the spinner counts in the overall length
  const group = new Group();
  const wood = P.lambert(WOOD);
  const green = P.lambert(GREEN);
  const dark = P.lambert(0x222222);
  const metal = P.lambert(0x6e7378);
  const strutMat = P.lambert(0x9a7b4f);
  const wingMat = P.vertexColoured();
  const wingColours = [LOZENGE_TOP, LOZENGE_TOP, LOZENGE_TOP, LOZENGE_TOP, LOZENGE_UNDER, LOZENGE_UNDER];

  const D = v.fuselageDepth;
  const W = v.fuselageWidth;
  const cd = v.cowlingDiameter;
  const stations = [
    { x: 0.36 * L, w: cd * 0.95, h: cd * 1.0, y: 0, p: 2 },
    { x: 0.2 * L, w: W * 1.0, h: D * 0.95, y: 0.02, p: 2 },
    { x: 0.0, w: W, h: D, y: 0.02, p: 2 },
    { x: -0.15 * L, w: W * 0.9, h: D * 0.85, y: 0.0, p: 2 },
    { x: -0.3 * L, w: W * 0.55, h: D * 0.6, y: 0.02, p: 2 },
    { x: -0.48 * L, w: W * 0.28, h: D * 0.3, y: 0.05, p: 2 },
    { x: tailEnd, w: 0.08, h: 0.2, y: 0.08 },
  ];
  // The nose (cowling panels) is green, the rest natural wood: two lofts.
  group.add(P.nose(P.fuselage(stations.slice(0, 2), green, 12))); // hidden in the cockpit view
  const eyeX = -ac.cockpit.eyeBehind;
  group.add(P.fuselageSplit(stations.slice(1), eyeX, wood, 12));
  group.add(P.nose(P.cone(0.36, SPINNER, green, a.propX + SPINNER / 2, 12))); // spinner
  group.add(P.nose(P.box(0.5, 0.02, 0.36, dark, -0.02 * L, D / 2 - 0.005, 0))); // cockpit opening
  group.add(P.strut([0.2 * L, D * 0.35, 0.3], [0.02 * L, D * 0.75, 0.26], 0.07, 0.07, metal)); // exhaust pipe

  // Sesquiplane: wide upper wing, narrow lower wing.
  const [upper, lower] = wingPlan(ac);
  const controls = { ailerons: [], elevators: [], rudder: null };
  const AILERON = { from: 0.55, to: 0.88, depth: 0.25 }; // upper wing only (an assumption: no source found)
  group.add(P.wing({ ...upper, thickness: 0.1, tip: 'round', colors: wingColours, material: wingMat, cuts: [AILERON] }));
  addSurfaces(group, controls.ailerons, upper, AILERON, 0.1, wingColours, wingMat, 'aileron');
  group.add(P.wing({ ...lower, thickness: 0.08, tip: 'round', colors: wingColours, material: wingMat }));
  group.add(P.box(0.5, 0.07, 0.55, metal, upper.x + 0.3, wingY(upper, 0) + 0.07, 0)); // radiator in the upper wing
  for (const s of [-1, 1]) {
    const z0 = 1.9;
    const lowAt = [lower.x, wingY(lower, z0) + 0.03, s * z0];
    for (const dz of [-0.55, 0.55]) {
      group.add(P.strut(lowAt, [upper.x, wingY(upper, z0 + dz) - 0.04, s * (z0 + dz)], 0.1, 0.05, strutMat)); // V-strut
    }
    group.add(P.strut([upper.x + 0.2, D / 2 - 0.05, s * 0.2], [upper.x + 0.2, wingY(upper, 0.6) - 0.05, s * 0.55], 0.06, 0.035, strutMat));
    group.add(P.strut([upper.x - 0.25, D / 2 - 0.05, s * 0.2], [upper.x - 0.25, wingY(upper, 0.6) - 0.05, s * 0.5], 0.06, 0.035, strutMat));
  }

  // Tail: lozenge tailplane, green fin with a yellow band across fin and rudder.
  const tailPlan = { x: -0.55 * L + SPINNER, y: 0.08, span: v.tailSpan, chord: v.tailChord, dihedral: 0 };
  const ELEVATOR = { from: 0.08, to: 0.88, depth: 0.4 };
  group.add(P.wing({ ...tailPlan, thickness: 0.05, tip: 'round', colors: wingColours, part: 'tail', material: wingMat, cuts: [ELEVATOR] }));
  addSurfaces(group, controls.elevators, tailPlan, ELEVATOR, 0.05, wingColours, wingMat, 'elevator');
  const fh = v.finHeight;
  const fin = [[-0.5 * L, 0.12], [-0.56 * L, fh * 0.85], [-0.6 * L, fh + 0.03], [-0.64 * L, fh * 0.8], [-0.65 * L, 0.2], [-0.645 * L, 0.08]]
    .map(([x, y]) => [x + SPINNER, y]);
  const rudderHinge = -0.58 * L + SPINNER;
  const tailSurfaces = P.finAndRudder(fin, rudderHinge, 0.045, green, green);
  group.add(tailSurfaces.fin);
  group.add(tailSurfaces.rudder);
  controls.rudder = tailSurfaces.rudder;
  const band = P.box(0.3, 0.14, 0.05, P.lambert(YELLOW), -0.3, fh * 0.45, 0); // yellow band across the rudder
  controls.rudder.add(band);

  // Undercarriage.
  const hubY = a.contactY + a.wheelR;
  for (const s of [-1, 1]) {
    group.add(P.strut([a.mainX + 0.2, -D / 2 + 0.1, s * 0.16], [a.mainX, hubY, s * a.track / 2], 0.08, 0.05, strutMat));
    group.add(P.strut([a.mainX - 0.3, -D / 2 + 0.1, s * 0.16], [a.mainX, hubY, s * a.track / 2], 0.08, 0.05, strutMat));
    group.add(P.wheel(a.wheelR, 0.12, P.lambert(0x1c1c1c), a.mainX, hubY, s * a.track / 2));
  }
  group.add(P.box(0.04, 0.04, a.track, dark, a.mainX, hubY, 0));
  const skid = P.strut([tailEnd + 0.45, -0.05, 0], [a.tailX, a.tailY, 0], 0.06, 0.05, dark);
  skid.userData.part = 'skid';
  group.add(skid);

  // Markings: black crosses on the wings and fuselage, "Stropp" in black.
  const sideZ = (x) => P.fuselageAt(stations, x).w / 2;
  for (const s of [-1, 1]) {
    group.add(M.onSide(M.cross(0.55, 0x111111, 0xf2f2f2), s, -0.28 * L, 0.0, sideZ(-0.28 * L)));
    group.add(M.onWing(M.cross(0.8, 0x111111, 0xf2f2f2), true, upper.x, wingY(upper, s * 2.8), s * 2.8));
    group.add(M.onWing(M.cross(0.7, 0x111111, 0xf2f2f2), false, lower.x, wingY(lower, s * 2.6), s * 2.6));
    const name = M.text('Stropp', 0.9, 0.2, '#111111');
    if (name) group.add(M.onSide(name, s, 0.05 * L, -0.05, sideZ(0.05 * L)));
  }

  const prop = P.propeller(ac.propeller.diameter, a.propX, P.lambert(0x6b4b2a), { hub: 0.12, chord: 0.18 });
  group.add(prop);
  return { group, prop, controls };
}
