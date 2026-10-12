// Where each wing of an aircraft is, in body axes (+X nose, +Y up, +Z right wing,
// origin at the centre of gravity), worked out from the aircraft's own data:
// the wing stack gives spans and heights, the visual block the chord and stagger.
// Shared by the crash points (hitpoints.js) and the bullet hit boxes (src/weapons/zones.js).

import { gearGeometry } from './ground.js';

// Top wing first. Each: { span, chord, x (mid-chord), root (height at the fuselage),
// tip (height at the wing tip), dihedral }.
export function wingLevels(ac, common) {
  const v = ac.visual;
  const g = gearGeometry(ac, common);
  const n = ac.wingStack.length;
  const upperY = g.contactY + ac.geometry.height - 0.1;
  const topX = 0.12 + (v.stagger * (n - 1)) / 2;
  return ac.wingStack.map((w, i) => {
    const chord = i === n - 1 && v.lowerChord ? v.lowerChord : v.chord;
    const dihedral = i === n - 1 ? v.lowerDihedral ?? 0 : 0;
    const root = upperY - (ac.wingStack[0].height - w.height) - (w.span / 4) * Math.tan(dihedral);
    const tip = root + (w.span / 2) * Math.tan(dihedral);
    return { span: w.span, chord, x: topX - i * v.stagger, root, tip, dihedral };
  });
}
