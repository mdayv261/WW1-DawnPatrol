// Fokker Dr.I, marked as Richthofen's red 425/17. Silhouette: three short
// wings stacked up the front of a short, slab-sided fuselage (the middle wing
// at the top of the fuselage), no fixed fin, a comma-shaped rudder, a round
// rotary cowling and a broad aerofoil axle between the wheels.
// Marking sources and doubts: docs/AIRCRAFT_DATA.md ("Liveries").

import { Group } from 'three';
import * as P from './parts.js';
import * as M from './livery.js';
import { cockpitSpan, anchors, wingPlan, wingY, singleStrut, addSurfaces } from './layout.js';

const RED = 0xc4281c; // vermilion (NASM fabric from 425/17)
const BLACK = 0x111111;

export function createDr1(ac) {
  const v = ac.visual;
  const a = anchors(ac);
  const L = a.L;
  const group = new Group();
  const red = P.lambert(RED);
  const dark = P.lambert(0x222222);
  const wingMat = P.lambert(RED, { side: 2 });
  const redWing = (extra = {}) => ({ material: wingMat, colors: null, ...extra });

  const D = v.fuselageDepth;
  const W = v.fuselageWidth;
  const stations = [
    // The nose broadens toward the engine (widened in Phase 6: it looked too narrow from the cockpit).
    { x: 0.272 * L, w: W * 1.12, h: D * 1.0, y: 0, p: 4 },
    { x: 0.1 * L, w: W * 1.15, h: D * 1.05, y: 0.02, p: 4 },
    { x: -0.1 * L, w: W * 0.95, h: D * 0.95, y: 0.0, p: 4 },
    { x: -0.3 * L, w: W * 0.6, h: D * 0.6, y: 0.02, p: 4 },
    { x: -0.49 * L, w: W * 0.28, h: D * 0.32, y: 0.05, p: 4 },
    { x: a.tailEnd, w: 0.08, h: 0.2, y: 0.08 },
  ];
  group.add(P.fuselageSplit(stations, cockpitSpan(ac), red, 10));
  group.add(P.cylinderX(v.cowlingDiameter / 2, v.cowlingDiameter / 2 * 0.98, 0.5, red, a.noseX - 0.25, 0.02));
  group.add(P.nose(P.box(0.5, 0.02, 0.34, dark, -0.05 * L, D / 2 - 0.005, 0))); // cockpit opening

  // Three wings, top first; middle wing at the top of the fuselage.
  const [upper, middle, lower] = wingPlan(ac);
  const controls = { ailerons: [], elevators: [], rudder: null };
  const AILERON = { from: 0.55, to: 0.88, depth: 0.28 }; // upper wing only (Herris and Phillips, S39)
  for (const w of [upper, middle, lower]) group.add(P.wing({ ...w, thickness: 0.09, tip: 'round', ...redWing(), cuts: w === upper ? [AILERON] : [] }));
  addSurfaces(group, controls.ailerons, upper, AILERON, 0.09, null, wingMat, 'aileron');
  for (const m of [...singleStrut(upper, middle, 1.9, red, { chordwise: 0.12 }), ...singleStrut(middle, lower, 1.9, red, { chordwise: 0.12 })]) group.add(m);
  for (const s of [-1, 1]) { // inverted-V cabane struts to the upper wing
    group.add(P.strut([upper.x + 0.25, middle.y + 0.05, s * 0.18], [upper.x + 0.1, wingY(upper, 0.7) - 0.05, s * 0.75], 0.06, 0.035, red));
    const rear = P.strut([upper.x - 0.25, middle.y + 0.05, s * 0.18], [upper.x - 0.1, wingY(upper, 0.7) - 0.05, s * 0.75], 0.06, 0.035, red);
    if (s > 0) rear.name = 'cabaneRear'; // the airspeed dial is clamped to it (render/cockpit/build.js)
    group.add(rear);
  }

  // Tail: tailplane and a comma-shaped rudder (no fixed fin).
  const tailPlan = { x: -0.55 * L, y: 0.08, span: v.tailSpan, chord: v.tailChord, dihedral: 0 };
  const ELEVATOR = { from: 0.08, to: 0.88, depth: 0.4 };
  group.add(P.wing({ ...tailPlan, thickness: 0.05, tip: 'round', part: 'tail', ...redWing(), cuts: [ELEVATOR] }));
  addSurfaces(group, controls.elevators, tailPlan, ELEVATOR, 0.05, null, wingMat, 'elevator');
  const fh = v.finHeight;
  // No fixed fin: the whole outline is the rudder, hinged at its front edge.
  const tailSurfaces = P.finAndRudder([[-0.55 * L, 0.1], [-0.58 * L, fh * 0.9], [-0.61 * L, fh + 0.1], [-0.645 * L, fh * 0.9], [-0.65 * L, fh * 0.4], [-0.645 * L, 0.06]], -0.545 * L, 0.04, red, red);
  group.add(tailSurfaces.rudder);
  controls.rudder = tailSurfaces.rudder;

  // Undercarriage: thin legs and the aerofoil axle.
  const hubY = a.contactY + a.wheelR;
  group.add(P.wing({ span: a.track, chord: 0.4, thickness: 0.08, x: a.mainX, y: hubY, tip: 'square', part: 'axle', ...redWing() }));
  for (const s of [-1, 1]) {
    group.add(P.strut([a.mainX + 0.15, -D / 2 + 0.1, s * 0.12], [a.mainX, hubY, s * a.track / 2], 0.07, 0.04, red));
    group.add(P.strut([a.mainX - 0.15, -D / 2 + 0.1, s * 0.12], [a.mainX, hubY, s * a.track / 2], 0.07, 0.04, red));
    group.add(P.wheel(a.wheelR, 0.1, P.lambert(0x1c1c1c), a.mainX, hubY, s * a.track / 2));
  }
  const skid = P.strut([a.tailEnd + 0.4, 0.0, 0], [a.tailX, a.tailY, 0], 0.06, 0.05, dark);
  skid.userData.part = 'skid';
  group.add(skid);

  // Black crosses with a white border (cross style is an estimate).
  const sideZ = (x) => P.fuselageAt(stations, x).w / 2;
  for (const s of [-1, 1]) {
    group.add(M.onSide(M.cross(0.5, BLACK, 0xf2f2f2), s, -0.3 * L, 0.02, sideZ(-0.3 * L)));
    group.add(M.onWing(M.cross(0.7, BLACK, 0xf2f2f2), true, upper.x, wingY(upper, s * 2.3), s * 2.3));
    group.add(M.onWing(M.cross(0.7, BLACK, 0xf2f2f2), false, lower.x, wingY(lower, s * 1.9), s * 1.9));
  }

  const prop = P.propeller(ac.propeller.diameter, a.propX, P.lambert(0x6b4b2a), { hub: 0.14, chord: 0.17 });
  group.add(prop);
  return { group, prop, controls, stations };
}
