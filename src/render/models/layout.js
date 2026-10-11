// Where things go on an aircraft model, worked out from the aircraft's data:
// documented dimensions and the physics undercarriage positions, so a parked
// aircraft touches the grass where the ground physics says it does.

import { gearGeometry } from '../../physics/ground.js';
import { common } from '../../aircraft/common.js';
import { strut } from './parts.js';

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

// A single strut each side at x (between the wings' mid-chords by default).
export function singleStrut(upper, lower, z, material, { chordwise = 0.12, thin = 0.05 } = {}) {
  return [-1, 1].map((s) => strut(
    [lower.x, wingY(lower, z) + 0.03, s * z],
    [upper.x, wingY(upper, z) - 0.03, s * z],
    chordwise, thin, material,
  ));
}
