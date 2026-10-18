// Low-poly aircraft models built in code from each aircraft's data. No
// external assets. One builder per type lives in src/render/models/. Every
// model is in body axes (+X nose, +Y up, +Z right wing) with the origin at the
// centre of gravity, so it takes the physics orientation directly.

import { createCamel } from './models/camelModel.js';
import { createSpad } from './models/spadModel.js';
import { createDr1 } from './models/dr1Model.js';
import { createAlbatros } from './models/albatrosModel.js';
import { createPlaceholder } from './models/placeholderModel.js';

const BUILDERS = { camel: createCamel, spad13: createSpad, dr1: createDr1, albatros: createAlbatros };

// Returns { group, prop, hideInCockpit, showInCockpit }: prop is the spinning propeller group;
// hideInCockpit lists the parts to hide in the cockpit view, showInCockpit those shown only there.
export function createAircraftMesh(ac) {
  const build = BUILDERS[ac.id] ?? createPlaceholder; // the Early War aircraft until phase E3
  const model = build(ac);
  const hideInCockpit = [];
  const showInCockpit = [];
  model.group.traverse((o) => {
    if (o.userData?.cockpitHide) hideInCockpit.push(o);
    if (o.userData?.cockpitOnly) showInCockpit.push(o);
  });
  return { ...model, hideInCockpit, showInCockpit, controls: model.controls };
}

// Shorten the upper wing front to back by `factor` (1 = as built), keeping its trailing edge (the
// edge nearest the pilot) in place, for the cockpit view (COCKPITS: upperWingChord). Only the
// drawing changes; the flight model and hit boxes do not.
export function setUpperWingChord(model, factor) {
  const w = model.upperWing;
  if (!w || w.scale.x === factor) return;
  w.scale.x = factor;
  w.position.x = w.userData.trailingX * (1 - factor);
}

// Move the model's control surfaces to the positions the physics has them at.
// defl: { pull, roll, yaw } in radians (physics/controls.js deflections()):
// pull = elevator trailing edge up; roll = right aileron trailing edge up
// (the left one goes down); yaw = rudder trailing edge to the right.
export function setControlSurfaces(model, defl) {
  const c = model.controls;
  if (!c) return;
  for (const a of c.ailerons) a.rotation.z = -a.userData.side * defl.roll;
  for (const e of c.elevators) e.rotation.z = -defl.pull;
  if (c.rudder) c.rudder.rotation.y = defl.yaw;
}
