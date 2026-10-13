// Where things go on an aircraft model, worked out from the aircraft's data:
// documented dimensions and the physics undercarriage positions, so a parked
// aircraft touches the grass where the ground physics says it does.

import { gearGeometry } from '../../physics/ground.js';
import { common } from '../../aircraft/common.js';
import { strut, hinged, nose, cockpitOnly } from './parts.js';
import { COCKPITS } from '../../aircraft/cockpits.js';

// Where the fuselage is split round the cockpit (see fuselageSplit): from the back of the opening
// to just ahead of the instrument board, so the cut end of the fuselage ahead is behind the board.
export const cockpitSpan = (ac) => [COCKPITS[ac.id].opening.back, COCKPITS[ac.id].panel.x + 0.03];

export function anchors(ac) {
  const L = ac.geometry.length;
  const g = gearGeometry(ac, common);
  return {
    L,
    noseX: 0.36 * L, // front of the cowling
    propX: 0.36 * L + 0.05, // propeller plane, the physics crash point
    tailEnd: -0.65 * L, // rear of the fuselage
    contactY: g.contactY,
    mainX: g.mainX,
    tailX: g.tailX,
    tailY: g.tailY,
    wheelR: ac.gear.wheelRadius,
    track: ac.gear.track,
    // The top of the upper wing is the documented overall height above the ground.
    upperY: g.contactY + ac.geometry.height - 0.1,
  };
}

// Mid-chord position, height at the root, span and chord of each wing, top
// wing first, from the wing stack (spans and gaps) and the visual proportions.
export function wingPlan(ac) {
  const v = ac.visual;
  const a = anchors(ac);
  const n = ac.wingStack.length;
  const topX = 0.12 + (v.stagger * (n - 1)) / 2;
  return ac.wingStack.map((w, i) => {
    const dihedral = i === n - 1 ? v.lowerDihedral ?? 0 : 0;
    const gap = ac.wingStack[0].height - w.height; // mean gap below the top wing
    return {
      span: w.span,
      chord: i === n - 1 && v.lowerChord ? v.lowerChord : v.chord,
      dihedral,
      x: topX - i * v.stagger,
      y: a.upperY - gap - (w.span / 4) * Math.tan(dihedral),
    };
  });
}

// Height of a wing's centre line at spanwise position z.
export const wingY = (w, z) => w.y + Math.abs(z) * Math.tan(w.dihedral);

// Hinged control surfaces (ailerons or elevators), one each side, fitted into
// the cut-out of a wing (see wing()'s `cuts`). plan: { x, y, span, chord, dihedral };
// cut: { from, to, depth }. The new group objects are added to `group` and to `list`.
export function addSurfaces(group, list, plan, cut, thickness, colors, material, part) {
  const half = plan.span / 2;
  const zMid = ((cut.from + cut.to) / 2) * half;
  for (const side of [-1, 1]) {
    const pivot = hinged({
      span: (cut.to - cut.from) * half,
      chord: plan.chord * cut.depth,
      thickness: thickness * 0.85,
      hingeX: plan.x - plan.chord / 2 + plan.chord * cut.depth, // the surface is the rear `depth` of the chord
      y: wingY(plan, zMid),
      z: side * zMid,
      colors, material, part, side,
    });
    group.add(pivot);
    list.push(pivot);
  }
}

// A pair of interplane struts (front and rear) between two wings at spanwise
// position z (both sides). Returns meshes.
export function strutBay(upper, lower, z, material, { spread = 0.25, chordwise = 0.1, thin = 0.05 } = {}) {
  const out = [];
  for (const s of [-1, 1]) {
    for (const f of [spread, -spread]) {
      const m = strut(
        [lower.x + lower.chord * f, wingY(lower, z) + 0.03, s * z],
        [upper.x + upper.chord * f, wingY(upper, z) - 0.03, s * z],
        chordwise, thin, material,
      );
      m.userData.part = 'interplane';
      m.userData.z = z;
      out.push(m);
    }
  }
  return out;
}

// For an aircraft whose upper wing the cockpit view draws shorter (COCKPITS: upperWingChord, kept
// at its trailing edge), each strut up to that wing gets a twin shown only in the cockpit view,
// whose top end moves with the shortened wing and goes up into it (to its centre line); the
// original is hidden there. struts: meshes made by strut(); k: the upper wing's depth in the
// cockpit view; returns the twins (add them to the model).
export function cockpitStrutTwins(struts, upper, k, material) {
  const te = upper.x - upper.chord / 2;
  return struts.map((m) => {
    nose(m);
    const [a, b] = m.userData.ends;
    const [low, high] = a[1] < b[1] ? [a, b] : [b, a];
    const top = [te + (high[0] - te) * k, wingY(upper, high[2]), high[2]];
    const p = m.geometry.parameters;
    const twin = cockpitOnly(strut(low, top, p.height, p.depth, material));
    twin.userData.part = 'cockpitStrut';
    return twin;
  });
}

// A single strut each side at x (between the wings' mid-chords by default).
export function singleStrut(upper, lower, z, material, { chordwise = 0.12, thin = 0.05 } = {}) {
  return [-1, 1].map((s) => strut(
    [lower.x, wingY(lower, z) + 0.03, s * z],
    [upper.x, wingY(upper, z) - 0.03, s * z],
    chordwise, thin, material,
  ));
}
