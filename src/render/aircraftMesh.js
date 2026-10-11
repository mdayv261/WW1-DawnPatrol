// Low-poly aircraft models built in code from each aircraft's data. No
// external assets. One builder per type lives in src/render/models/. Every
// model is in body axes (+X nose, +Y up, +Z right wing) with the origin at the
// centre of gravity, so it takes the physics orientation directly.

import { createCamel } from './models/camelModel.js';
import { createSpad } from './models/spadModel.js';
import { createDr1 } from './models/dr1Model.js';
import { createAlbatros } from './models/albatrosModel.js';

const BUILDERS = { camel: createCamel, spad13: createSpad, dr1: createDr1, albatros: createAlbatros };

// Returns { group, prop, hideInCockpit }: prop is the spinning propeller group;
// hideInCockpit lists the nose parts to hide in the cockpit view.
export function createAircraftMesh(ac) {
  const build = BUILDERS[ac.id];
  if (!build) throw new Error(`No 3D model for aircraft "${ac.id}"`);
  const model = build(ac);
  const hideInCockpit = [];
  model.group.traverse((o) => { if (o.userData?.cockpitHide) hideInCockpit.push(o); });
  return { ...model, hideInCockpit };
}
