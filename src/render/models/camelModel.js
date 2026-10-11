// Sopwith Camel F.1, marked as Major W. G. Barker's B6313 of No. 139 Squadron.
// Silhouette: two equal-span, square-tipped wings with the lower one on
// dihedral and the upper one flat, a short deep fuselage, the humped gun
// decking over the breeches, a round rotary cowling and a small tail.
// Colour and marking sources: docs/AIRCRAFT_DATA.md ("Liveries").

import { Group } from 'three';
import * as P from './parts.js';
import * as M from './livery.js';
import { anchors, wingPlan, wingY, strutBay } from './layout.js';

const BROWN = 0x7a4b2c; // reddish-brown top surfaces and body (estimate, from a 1918 report on B.6290)
const CREAM = 0xd8ccaa; // wing undersides
const COWL = 0x2a2724; // cowling (estimate)
const WOOD = 0x9a7b4f;
const DARK = 0x222222;

export function createCamel(ac) {
  const v = ac.visual;
  const a = anchors(ac);
  const L = a.L;
  const group = new Group();
  const body = P.lambert(BROWN);
  const dark = P.lambert(DARK);
  const wood = P.lambert(WOOD);
  const wingMat = P.vertexColoured();
  const wingColours = [BROWN, BROWN, BROWN, BROWN, CREAM, CREAM];

  // Fuselage.
  const D = v.fuselageDepth;
  const W = v.fuselageWidth;
  const stations = [
    { x: 0.272 * L, w: W * 1.05, h: D * 1.0, y: 0.05 },
    { x: 0.157 * L, w: W * 1.08, h: D * 1.05, y: 0.06 },
    { x: 0.035 * L, w: W * 1.05, h: D, y: 0 },
    { x: -0.12 * L, w: W * 0.85, h: D * 0.85, y: -0.02 },
    { x: -0.3 * L, w: W * 0.55, h: D * 0.55, y: -0.02 },
    { x: -0.49 * L, w: W * 0.3, h: D * 0.32, y: 0 },
    { x: a.tailEnd, w: 0.08, h: 0.2, y: 0.06 },
  ];
  const eyeX = -ac.cockpit.eyeBehind;
  group.add(P.fuselageSplit(stations, eyeX, body, 10));
  // Nose parts the cockpit view hides (the cockpit draws its own decking and guns).
  group.add(P.nose(P.cylinderX(v.cowlingDiameter / 2, v.cowlingDiameter / 2 * 0.98, 0.5, P.lambert(COWL), a.noseX - 0.25, 0.05)));
  group.add(P.nose(P.box(0.9, 0.17, 0.4, body, 0.2 * L, D / 2 + 0.03, 0))); // the hump
  for (const s of [-1, 1]) group.add(P.nose(P.box(0.7, 0.05, 0.05, dark, 0.27 * L + 0.2, D / 2 + 0.06, s * 0.09))); // gun barrels
  group.add(P.nose(P.box(0.5, 0.02, 0.36, dark, -0.02 * L, D / 2 - 0.005, 0))); // cockpit opening

  // Wings, struts.
  const [upper, lower] = wingPlan(ac);
  for (const w of [upper, lower]) {
    group.add(P.wing({ ...w, thickness: 0.08, tip: 'square', colors: wingColours, material: wingMat }));
  }
  for (const m of strutBay(upper, lower, 0.52 * (upper.span / 2), wood, { chordwise: 0.1, thin: 0.05 })) group.add(m);
  for (const s of [-1, 1]) { // cabane struts from the fuselage to the upper wing
    group.add(P.strut([upper.x + 0.35, D / 2 - 0.05, s * 0.18], [upper.x + 0.3, wingY(upper, 0.6) - 0.05, s * 0.6], 0.06, 0.035, wood));
    group.add(P.strut([upper.x - 0.3, D / 2 - 0.05, s * 0.16], [upper.x - 0.3, wingY(upper, 0.6) - 0.05, s * 0.5], 0.06, 0.035, wood));
  }

  // Tail.
  group.add(P.wing({ span: v.tailSpan, chord: v.tailChord, thickness: 0.05, x: -0.55 * L, y: 0.05, colors: wingColours, part: 'tail', material: wingMat }));
  const fh = v.finHeight;
  group.add(P.profile([[-0.5 * L, 0.1], [-0.55 * L, fh * 0.75], [-0.6 * L, fh + 0.05], [-0.645 * L, fh * 0.85], [-0.65 * L, 0.05]], 0.04, body));

  // Undercarriage and tailskid.
  const hubY = a.contactY + a.wheelR;
  for (const s of [-1, 1]) {
    group.add(P.strut([a.mainX + 0.2, -D / 2 + 0.1, s * 0.14], [a.mainX, hubY, s * a.track / 2], 0.07, 0.05, wood));
    group.add(P.strut([a.mainX - 0.3, -D / 2 + 0.1, s * 0.14], [a.mainX, hubY, s * a.track / 2], 0.07, 0.05, wood));
    group.add(P.wheel(a.wheelR, 0.12, P.lambert(0x1c1c1c), a.mainX, hubY, s * a.track / 2));
  }
  group.add(P.box(0.04, 0.04, a.track, dark, a.mainX, hubY, 0));
  const skid = P.strut([a.tailEnd + 0.45, -0.05, 0], [a.tailX, a.tailY, 0], 0.06, 0.05, dark);
  skid.userData.part = 'skid';
  group.add(skid);

  // Markings: roundels, the seven white stripes and the serial.
  const roundel = () => M.roundel(0.3, [0x1f3a7a, 0xf2f2f2, 0xb02020]);
  const white = 0xf2f2f2;
  const sideZ = (x) => P.fuselageAt(stations, x).w / 2;
  for (const s of [-1, 1]) {
    group.add(M.onSide(roundel(), s, -0.125 * L, 0, sideZ(-0.125 * L)));
    for (let i = 0; i < 7; i++) {
      const x = -0.27 * L - i * 0.14;
      const f = P.fuselageAt(stations, x);
      group.add(M.onSide(M.rect(0.06, f.h * 0.65, white), s, x, f.y, f.w / 2));
    }
    const serial = M.text('B6313', 0.6, 0.13);
    if (serial) group.add(M.onSide(serial, s, -0.5 * L - 0.1, 0.02, sideZ(-0.5 * L - 0.1)));
    const wr = () => M.roundel(0.42, [0x1f3a7a, 0xf2f2f2, 0xb02020]);
    group.add(M.onWing(wr(), true, upper.x, wingY(upper, s * 2.4), s * 2.4));
    group.add(M.onWing(wr(), false, lower.x, wingY(lower, s * 2.4), s * 2.4));
  }

  const prop = P.propeller(ac.propeller.diameter, a.propX, P.lambert(0x6b4b2a), { hub: 0.14, chord: 0.17 });
  group.add(prop);
  return { group, prop };
}
