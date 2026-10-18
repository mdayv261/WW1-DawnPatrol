// Fokker E.IV, marked as Oswald Boelcke's 123/15 (Herris and Scott). Silhouette: a long, slim
// box-section fuselage with a turtle-deck behind the cockpit, a big horseshoe cowling round the
// two-row rotary, a shoulder wing braced by wires to a pylon above the cockpit and to the
// undercarriage below, no ailerons (wing warping), and an all-moving comma rudder and
// elevators with no fixed fin or tailplane. Marking sources: docs/AIRCRAFT_DATA.md ("Liveries").

import { Group } from 'three';
import * as P from './parts.js';
import * as M from './livery.js';
import { cockpitSpan, anchors, wingPlan, wingY, addSurfaces } from './layout.js';
import { gunMounts } from '../../weapons/mounts.js';

const LINEN = 0xd6c79c; // unbleached linen, the commonest E.IV finish (S54)
const METAL = 0x9ca1a6; // the aluminium cowling and panels
const BLACK = 0x111111;
const WHITE = 0xf2f2f2;
const RED = 0xb52a1e;

export function createE4(ac) {
  const v = ac.visual;
  const a = anchors(ac);
  const L = a.L;
  const group = new Group();
  const linen = P.lambert(LINEN);
  const metal = P.lambert(METAL);
  const dark = P.lambert(0x222222);
  const steel = P.lambert(0x3a3d40);
  const wireMat = P.lambert(0x2b2b2b);
  const wingMat = P.lambert(LINEN, { side: 2 });
  const linenWing = (extra = {}) => ({ material: wingMat, colors: null, ...extra });

  const D = v.fuselageDepth;
  const W = v.fuselageWidth;
  const cd = v.cowlingDiameter;
  // A box section (Fokker's steel-tube frame) with the turtle-deck rising behind the cockpit (S56).
  const stations = [
    { x: 0.3 * L, w: W * 1.05, h: D * 1.05, y: 0, p: 4 },
    { x: 0.15 * L, w: W, h: D, y: 0, p: 4 },
    { x: -0.12 * L, w: W * 0.9, h: D * 1.0, y: 0.04, p: 4 },
    { x: -0.25 * L, w: W * 0.7, h: D * 0.78, y: 0.06, p: 4 },
    { x: -0.45 * L, w: W * 0.36, h: D * 0.42, y: 0.08, p: 4 },
    { x: a.tailEnd, w: 0.06, h: 0.14, y: 0.1 },
  ];
  group.add(P.fuselageSplit(stations, cockpitSpan(ac), linen, 10));
  // The horseshoe cowling, cut away underneath so petrol could not collect (S55): a dark slot shows the gap.
  group.add(P.cylinderX(cd / 2, cd / 2 * 0.96, 0.55, metal, a.noseX - 0.27, 0.02));
  group.add(P.box(0.5, 0.05, cd * 0.42, dark, a.noseX - 0.27, -cd / 2 + 0.02, 0));
  group.add(P.nose(P.box(0.5, 0.02, 0.34, dark, -0.15 * L, D / 2 + 0.03, 0))); // cockpit opening
  // The guns' barrels on the decking, where the gun data puts them (two, or three with Immelmann's loadout).
  for (const m of gunMounts(ac)) group.add(P.nose(P.box(0.6, 0.05, 0.05, dark, m.x - 0.3, m.y, m.z)));

  // The shoulder wing: no ailerons, the whole wing warps (S55, S56).
  const [wingP] = wingPlan(ac);
  group.add(P.wing({ ...wingP, thickness: 0.09, tip: 'round', ...linenWing() }));
  const controls = { ailerons: [], elevators: [], rudder: null };

  // The pylon over the cockpit and the one under the fuselage on the undercarriage, with four
  // bracing wires to each wing panel, front and rear spar at two places (S55).
  const half = wingP.span / 2;
  const top = [wingP.x, wingY(wingP, 0) + 0.85, 0];
  const hubY = a.contactY + a.wheelR;
  const bottom = [wingP.x, -D / 2 - 0.45, 0];
  for (const s of [-1, 1]) {
    group.add(P.strut([wingP.x + 0.15, D / 2, s * 0.2], top, 0.025, 0.02, steel)); // pylon legs (thin steel tube)
    group.add(P.strut([wingP.x - 0.15, D / 2, s * 0.2], top, 0.025, 0.02, steel));
    for (const f of [0.38, 0.72]) {
      for (const dx of [0.45, -0.45]) {
        const at = [wingP.x + dx, wingY(wingP, s * f * half), s * f * half];
        group.add(P.wire(top, at, wireMat));
        group.add(P.wire(bottom, [at[0], at[1] - 0.04, at[2]], wireMat));
      }
    }
  }

  // Tail: all-moving elevators (no fixed tailplane) and a comma rudder (no fixed fin) (S55).
  const tailPlan = { x: -0.55 * L, y: 0.1, span: v.tailSpan, chord: v.tailChord, dihedral: 0 };
  const ELEVATOR = { from: 0.06, to: 1.0, depth: 0.95 }; // the whole surface moves; only its root stub is fixed
  group.add(P.wing({ ...tailPlan, thickness: 0.04, tip: 'square', part: 'tail', ...linenWing(), cuts: [ELEVATOR] }));
  addSurfaces(group, controls.elevators, tailPlan, ELEVATOR, 0.04, null, wingMat, 'elevator');
  const fh = v.finHeight;
  const rudder = P.finAndRudder([[-0.56 * L, 0.1], [-0.58 * L, fh * 0.7], [-0.61 * L, fh + 0.05], [-0.645 * L, fh * 0.95], [-0.655 * L, fh * 0.5], [-0.65 * L, -0.1], [-0.62 * L, -0.15]], -0.555 * L, 0.035, linen, linen);
  group.add(rudder.rudder);
  controls.rudder = rudder.rudder;

  // Steel-tube undercarriage, with the lower pylon (S55).
  for (const s of [-1, 1]) {
    group.add(P.strut([a.mainX + 0.25, -D / 2 + 0.05, s * 0.2], [a.mainX, hubY, s * a.track / 2], 0.05, 0.04, steel));
    group.add(P.strut([a.mainX - 0.35, -D / 2 + 0.05, s * 0.2], [a.mainX, hubY, s * a.track / 2], 0.05, 0.04, steel));
    group.add(P.strut([wingP.x, -D / 2 + 0.02, s * 0.2], bottom, 0.04, 0.03, steel));
    group.add(P.wheel(a.wheelR, 0.11, P.lambert(0x1c1c1c), a.mainX, hubY, s * a.track / 2));
    // Boelcke's wheel covers, painted in thirds of red, white and black (S54).
    group.add(M.onSide(M.sectors(a.wheelR * 0.85, [RED, WHITE, BLACK]), s, a.mainX, hubY, a.track / 2 + 0.056));
  }
  group.add(P.box(0.04, 0.04, a.track, steel, a.mainX, hubY, 0));
  const skid = P.strut([a.tailEnd + 0.5, 0.0, 0], [a.tailX, a.tailY, 0], 0.05, 0.04, dark);
  skid.userData.part = 'skid';
  group.add(skid);

  // 1915-style crosses (black cross pattee on a white square) on the fuselage, the wing, under the
  // wing and on the rudder; "OB" on the cowling (S54).
  const sideZ = (x) => P.fuselageAt(stations, x).w / 2;
  for (const s of [-1, 1]) {
    group.add(M.onSide(M.crossPattee(0.45, BLACK), s, -0.36 * L, 0.06, sideZ(-0.36 * L)));
    group.add(M.onWing(M.crossPattee(0.75, BLACK), true, wingP.x, wingY(wingP, s * 0.75 * half), s * 0.75 * half));
    group.add(M.onWing(M.crossPattee(0.75, BLACK), false, wingP.x, wingY(wingP, s * 0.75 * half), s * 0.75 * half));
    controls.rudder.add(M.onSide(M.crossPattee(0.35, BLACK), s, -0.61 * L + 0.555 * L, fh * 0.55, 0.02));
    const letters = M.text('OB', 0.36, 0.2, '#111111');
    if (letters) group.add(M.onSide(letters, s, a.noseX - 0.3, 0.05, cd / 2));
  }

  const prop = P.propeller(ac.propeller.diameter, a.propX, P.lambert(0x6b4b2a), { hub: 0.13, chord: 0.17 });
  group.add(prop);
  return { group, prop, controls, stations };
}
