// The cockpit view's pilot eye and the 3D cockpit (built in render/cockpit/). Body axes:
// +X nose, +Y up, +Z right wing.

import { buildCockpit } from './cockpit/build.js';

export function eyePosition(aircraft) {
  return { x: -aircraft.cockpit.eyeBehind, y: aircraft.cockpit.eyeAbove, z: 0 };
}

// model: the aircraft's model (createAircraftMesh), for its fuselage stations and struts;
// panel: from createInstrumentPanel(). Returns { group, materials, animate(surfaces, values) }.
export function createCockpit(aircraft, panel, model) {
  const strut = model.group.getObjectByName('cabaneRear');
  return buildCockpit(aircraft, eyePosition(aircraft), model.stations, panel, strut ? strut.userData.ends : null);
}
