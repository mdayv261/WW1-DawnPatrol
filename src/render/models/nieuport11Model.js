// Nieuport 11, marked as Jean Navarre's N.576 of Escadrille N.67, 1916 (Bruce). Silhouette: a
// small, rounded fuselage behind a horseshoe cowling with cheek panels, a large upper wing over
// a narrow lower wing on V-struts (a sesquiplane), a wide tailplane, a horn-balanced rudder with
// no fin, and the Lewis gun on its mount over the upper wing with its drum on top.
// Marking sources: docs/AIRCRAFT_DATA.md ("Liveries").

import { Group } from 'three';
import * as P from './parts.js';
import * as M from './livery.js';
import { cockpitSpan, anchors, wingPlan, wingY, addSurfaces } from './layout.js';
import { gunMounts } from '../../weapons/mounts.js';

const DOPE = 0xd8c99a; // clear-doped linen or pale yellow overall (S60)
const METAL = 0xb4b9be; // bare-metal cowling and cheek panels (S60)
const RED = 0xc0262b;
const BLUE = 0x23408f;
const GUNMETAL = 0x2a2c2e;

export function createN11(ac) {
  const v = ac.visual;
  const a = anchors(ac);
  const L = a.L;
  const group = new Group();
  const dope = P.lambert(DOPE);
  const metal = P.lambert(METAL);
  const dark = P.lambert(0x222222);
  const gunmetal = P.lambert(GUNMETAL);
  const strutMat = P.lambert(0x9a7b4f);
  const wireMat = P.lambert(0x2b2b2b);
  const wingMat = P.lambert(DOPE, { side: 2 });
  const doped = (extra = {}) => ({ material: wingMat, colors: null, ...extra });

  const D = v.fuselageDepth;
  const W = v.fuselageWidth;
  const cd = v.cowlingDiameter;
  const stations = [
    { x: 0.3 * L, w: W * 1.1, h: D * 1.1, y: 0, p: 2 },
    { x: 0.12 * L, w: W, h: D, y: 0.02, p: 2 },
    { x: -0.12 * L, w: W * 0.92, h: D * 0.95, y: 0.02, p: 2 },
    { x: -0.3 * L, w: W * 0.58, h: D * 0.62, y: 0.03, p: 2 },
    { x: -0.48 * L, w: W * 0.28, h: D * 0.32, y: 0.06, p: 2 },
    { x: a.tailEnd, w: 0.06, h: 0.14, y: 0.08 },
  ];
  group.add(P.fuselageSplit(stations, cockpitSpan(ac), dope, 12));
  // The horseshoe cowling, open underneath (Sheps, Shavrov), and its small triangular cheek panels.
  group.add(P.cylinderX(cd / 2, cd / 2 * 0.95, 0.42, metal, a.noseX - 0.2, 0.02));
  group.add(P.box(0.38, 0.05, cd * 0.4, dark, a.noseX - 0.2, -cd / 2 + 0.03, 0));
  for (const s of [-1, 1]) group.add(P.strut([a.noseX - 0.42, 0.05, s * cd * 0.45], [0.12 * L, -0.05, s * W * 0.5], 0.3, 0.02, metal));
  group.add(P.nose(P.box(0.5, 0.02, 0.34, dark, -0.12 * L, D / 2 + 0.01, 0))); // cockpit opening

  // Sesquiplane: the large upper wing with ailerons, the narrow lower wing.
  const [upper, lower] = wingPlan(ac);
  const controls = { ailerons: [], elevators: [], rudder: null };
  const AILERON = { from: 0.5, to: 0.95, depth: 0.28 }; // upper wing only (an estimate: no source found)
  group.add(P.wing({ ...upper, thickness: 0.08, tip: 'round', ...doped(), cuts: [AILERON] }));
  addSurfaces(group, controls.ailerons, upper, AILERON, 0.08, null, wingMat, 'aileron');
  group.add(P.wing({ ...lower, thickness: 0.06, tip: 'round', ...doped() }));

  // V-struts: from the lower wing's single spar up to the upper wing's front and rear spars (S60),
  // the cabane struts, and the flying wires.
  for (const s of [-1, 1]) {
    const z0 = 0.78 * (lower.span / 2);
    const low = [lower.x, wingY(lower, z0) + 0.02, s * z0];
    for (const dx of [0.38, -0.38]) group.add(P.strut(low, [upper.x + dx, wingY(upper, z0) - 0.04, s * z0], 0.07, 0.035, strutMat));
    group.add(P.strut([upper.x + 0.3, D / 2 - 0.05, s * 0.18], [upper.x + 0.3, wingY(upper, 0.45) - 0.04, s * 0.45], 0.05, 0.03, strutMat));
    group.add(P.strut([upper.x - 0.3, D / 2 - 0.05, s * 0.18], [upper.x - 0.3, wingY(upper, 0.45) - 0.04, s * 0.45], 0.05, 0.03, strutMat));
    group.add(P.wire([lower.x, wingY(lower, 0.25), s * 0.25], [upper.x + 0.3, wingY(upper, z0) - 0.05, s * z0], wireMat));
    group.add(P.wire([lower.x, wingY(lower, 0.25), s * 0.25], [upper.x - 0.3, wingY(upper, z0) - 0.05, s * z0], wireMat));
  }

  // The Lewis gun on its mount over the upper wing, the pan drum on top (S58, S59). The drum is
  // hidden while it is being changed (setDrum below).
  const [gunAt] = gunMounts(ac);
  const wingTop = wingY(upper, 0) + 0.04;
  const gun = new Group();
  gun.add(P.cylinderX(0.022, 0.022, 0.75, gunmetal, gunAt.x - 0.375, gunAt.y, 0, 8)); // barrel
  gun.add(P.box(0.45, 0.09, 0.07, gunmetal, gunAt.x - 0.95, gunAt.y, 0)); // receiver and butt
  const drum = P.cylinderX(0.13, 0.13, 0.05, gunmetal, gunAt.x - 0.9, gunAt.y + 0.07, 0, 12);
  drum.rotation.z = Math.PI / 2; // the pan lies flat on top of the gun
  drum.name = 'lewisDrum';
  gun.add(drum);
  for (const [dx, dz] of [[-0.75, 0.12], [-0.75, -0.12], [-1.1, 0]]) gun.add(P.strut([gunAt.x + dx, wingTop, dz], [gunAt.x + dx * 0.95, gunAt.y - 0.04, 0], 0.03, 0.03, gunmetal)); // the mount
  group.add(gun);

  // Tail: the wide tailplane (3.25 m by 0.45 m, S58) and a horn-balanced rudder with no fin.
  const tailPlan = { x: -0.56 * L, y: 0.08, span: v.tailSpan, chord: v.tailChord, dihedral: 0 };
  const ELEVATOR = { from: 0.1, to: 0.92, depth: 0.45 };
  group.add(P.wing({ ...tailPlan, thickness: 0.04, tip: 'round', part: 'tail', ...doped(), cuts: [ELEVATOR] }));
  addSurfaces(group, controls.elevators, tailPlan, ELEVATOR, 0.04, null, wingMat, 'elevator');
  const fh = v.finHeight;
  const rudder = P.finAndRudder([[-0.57 * L, 0.08], [-0.575 * L, fh * 0.75], [-0.6 * L, fh + 0.04], [-0.64 * L, fh * 0.95], [-0.655 * L, fh * 0.5], [-0.65 * L, -0.12], [-0.62 * L, -0.15]], -0.565 * L, 0.035, dope, dope);
  group.add(rudder.rudder);
  controls.rudder = rudder.rudder;

  // V-strut undercarriage on a single axle (S58), and a sprung tailskid.
  const hubY = a.contactY + a.wheelR;
  for (const s of [-1, 1]) {
    group.add(P.strut([a.mainX + 0.3, -D / 2 + 0.06, s * 0.16], [a.mainX, hubY, s * 0.3], 0.07, 0.035, strutMat));
    group.add(P.strut([a.mainX - 0.25, -D / 2 + 0.06, s * 0.16], [a.mainX, hubY, s * 0.3], 0.07, 0.035, strutMat));
    group.add(P.wheel(a.wheelR, 0.1, P.lambert(0x1c1c1c), a.mainX, hubY, s * a.track / 2));
  }
  group.add(P.box(0.04, 0.04, a.track, dark, a.mainX, hubY, 0));
  const skid = P.strut([a.tailEnd + 0.4, -0.02, 0], [a.tailX, a.tailY, 0], 0.05, 0.04, dark);
  skid.userData.part = 'skid';
  group.add(skid);

  // French roundels in six places (S60): the fuselage sides, the upper wing (its white left out,
  // the linen showing through) and under the lower wing.
  const sideZ = (x) => P.fuselageAt(stations, x).w / 2;
  for (const s of [-1, 1]) {
    group.add(M.onSide(M.roundel(0.26, [RED, 0xf2f2f2, BLUE]), s, -0.3 * L, 0.03, sideZ(-0.3 * L)));
    group.add(M.onWing(M.roundel(0.45, [RED, DOPE, BLUE]), true, upper.x, wingY(upper, s * 0.68 * (upper.span / 2)), s * 0.68 * (upper.span / 2)));
    group.add(M.onWing(M.roundel(0.28, [RED, 0xf2f2f2, BLUE]), false, lower.x, wingY(lower, s * 0.7 * (lower.span / 2)), s * 0.7 * (lower.span / 2)));
  }

  const prop = P.propeller(ac.propeller.diameter, a.propX, P.lambert(0x6b4b2a), { hub: 0.12, chord: 0.15 });
  group.add(prop);
  return { group, prop, controls, stations, drum };
}
