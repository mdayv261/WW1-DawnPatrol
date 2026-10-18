// A plain stand-in model for an aircraft whose own model is not built yet (the Early War
// aircraft until phase E3). It is laid out from the aircraft's data like the real models:
// fuselage, cowling, every wing of its wing stack (one for a monoplane), struts, tail,
// undercarriage and propeller, in one undoped-linen colour with no markings.

import { Group } from 'three';
import * as P from './parts.js';
import { cockpitSpan, anchors, wingPlan, wingY, strutBay, addSurfaces } from './layout.js';

const LINEN = 0xcfc29a; // unbleached linen, the usual finish of both Early War types (Herris and Scott; Bruce)
const METAL = 0x9a9ea3;
const WOOD = 0x8a6a42;

export function createPlaceholder(ac) {
  const v = ac.visual;
  const a = anchors(ac);
  const L = a.L;
  const group = new Group();
  const body = P.lambert(LINEN);
  const metal = P.lambert(METAL);
  const wood = P.lambert(WOOD);
  const dark = P.lambert(0x222222);
  const wingMat = P.vertexColoured();
  const colours = [LINEN, LINEN, LINEN, LINEN, LINEN, LINEN];

  const D = v.fuselageDepth;
  const W = v.fuselageWidth;
  const cd = v.cowlingDiameter;
  const stations = [
    { x: 0.36 * L, w: cd * 0.9, h: cd * 0.9, y: 0, p: 3 },
    { x: 0.2 * L, w: cd, h: cd, y: 0 },
    { x: 0.05 * L, w: W, h: D, y: 0 },
    { x: -0.15 * L, w: W * 0.85, h: D * 0.85, y: 0 },
    { x: -0.35 * L, w: W * 0.5, h: D * 0.5, y: 0 },
    { x: a.tailEnd, w: 0.08, h: 0.16, y: 0.05 },
  ];
  group.add(P.fuselageSplit(stations, cockpitSpan(ac), body, 10));
  group.add(P.cylinderX(cd / 2, cd / 2, 0.3, metal, a.noseX - 0.15, 0, 0, 14)); // cowling

  // Wings, top first. A warping wing has no ailerons.
  const plan = wingPlan(ac);
  const controls = { ailerons: [], elevators: [], rudder: null };
  const AILERON = { from: 0.55, to: 0.95, depth: 0.25 };
  const ailerons = ac.controls?.rollType !== 'warping';
  plan.forEach((w, i) => {
    const cuts = i === 0 && ailerons ? [AILERON] : [];
    group.add(P.wing({ ...w, thickness: 0.07, tip: 'round', colors: colours, material: wingMat, cuts }));
    if (cuts.length) addSurfaces(group, controls.ailerons, w, AILERON, 0.07, colours, wingMat, 'aileron');
  });
  const top = plan[0];
  if (plan.length > 1) {
    for (let i = 0; i < plan.length - 1; i++) for (const m of strutBay(plan[i], plan[i + 1], 0.6 * (plan[i + 1].span / 2), wood)) group.add(m);
    for (const s of [-1, 1]) group.add(P.strut([top.x, D / 2 - 0.05, s * 0.18], [top.x, wingY(top, 0.4) - 0.05, s * 0.4], 0.06, 0.035, wood)); // cabane
  } else {
    // A monoplane's pylon over the fuselage, for the bracing wires.
    group.add(P.strut([top.x, D / 2, 0], [top.x, top.y + 0.7, 0], 0.05, 0.04, metal));
  }

  // Tail: tailplane with elevators, and a rudder.
  const tailPlan = { x: -0.55 * L, y: 0.05, span: v.tailSpan, chord: v.tailChord, dihedral: 0 };
  const ELEVATOR = { from: 0.08, to: 0.9, depth: 0.45 };
  group.add(P.wing({ ...tailPlan, thickness: 0.05, colors: colours, part: 'tail', material: wingMat, cuts: [ELEVATOR] }));
  addSurfaces(group, controls.elevators, tailPlan, ELEVATOR, 0.05, colours, wingMat, 'elevator');
  const fh = v.finHeight;
  const hinge = -0.6 * L;
  const tail = P.finAndRudder([[-0.55 * L, 0.1], [-0.58 * L, fh * 0.8], [-0.62 * L, fh], [-0.66 * L, fh * 0.7], [-0.66 * L, 0.05]], hinge, 0.04, body, body);
  if (tail.fin) group.add(tail.fin);
  group.add(tail.rudder);
  controls.rudder = tail.rudder;

  // Undercarriage and tailskid.
  const hubY = a.contactY + a.wheelR;
  for (const s of [-1, 1]) {
    group.add(P.strut([a.mainX + 0.2, -D / 2 + 0.1, s * 0.15], [a.mainX, hubY, s * a.track / 2], 0.06, 0.04, metal));
    group.add(P.strut([a.mainX - 0.3, -D / 2 + 0.1, s * 0.15], [a.mainX, hubY, s * a.track / 2], 0.06, 0.04, metal));
    group.add(P.wheel(a.wheelR, 0.12, dark, a.mainX, hubY, s * a.track / 2));
  }
  group.add(P.box(0.04, 0.04, a.track, dark, a.mainX, hubY, 0));
  const skid = P.strut([a.tailEnd + 0.45, -0.05, 0], [a.tailX, a.tailY, 0], 0.06, 0.05, dark);
  skid.userData.part = 'skid';
  group.add(skid);

  const prop = P.propeller(ac.propeller.diameter, a.propX, P.lambert(0x6b4b2a), { hub: 0.12, chord: ac.propeller.chord });
  group.add(prop);
  return { group, prop, controls, stations };
}
