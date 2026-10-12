// Showing damage on an aircraft model: a wing that has broken off disappears
// (the wing meshes are cut off by a clipping plane just outside the fuselage, and the
// ailerons on that side are hidden), and a broken tailplane disappears. Clipping needs
// renderer.localClippingEnabled. Rendering only.

import { Plane, Vector3 } from 'three';

const STUB = 0.9; // m of wing left beside the fuselage

// Find the parts of a model once.
function parts(model) {
  if (model.damageParts) return model.damageParts;
  const wings = [];
  const ailerons = [];
  const tail = [];
  model.group.traverse((o) => {
    const part = o.userData?.part;
    if (o.isMesh && part === 'wing') wings.push(o);
    else if (o.isMesh && part === 'tail') tail.push(o);
    else if (part === 'aileron' && o.userData.side) ailerons.push(o);
    else if (part === 'elevator') tail.push(o);
  });
  for (const w of wings) w.material = w.material.clone(); // so clipping one aircraft does not cut every one
  model.damageParts = { wings, ailerons, tail, shown: { L: false, R: false, tail: false }, planes: { L: new Plane(new Vector3(0, 0, 1), STUB), R: new Plane(new Vector3(0, 0, -1), STUB) } };
  return model.damageParts;
}

// Call every frame with the model (after its group has been positioned) and its damage state.
export function showDamage(model, damage) {
  const p = parts(model);
  const failed = { L: damage.failed.L, R: damage.failed.R, tail: damage.failed.tailplane };
  if (!failed.L && !failed.R && !failed.tail && !p.shown.L && !p.shown.R && !p.shown.tail) return;
  model.group.updateMatrixWorld();
  const planes = [];
  for (const side of ['L', 'R']) {
    if (failed[side]) planes.push(p.planes[side].clone().applyMatrix4(model.group.matrixWorld));
  }
  for (const w of p.wings) w.material.clippingPlanes = planes.length ? planes : null;
  // Ailerons on a failed side (right is +Z, side +1).
  for (const a of p.ailerons) a.visible = !failed[a.userData.side > 0 ? 'R' : 'L'];
  for (const t of p.tail) t.visible = !failed.tail;
  p.shown = failed;
}
