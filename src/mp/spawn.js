// Where each team's aircraft appear in a match (and again after going down):
//   in the air: about 3 km behind their own side of the front line, at the host's height,
//     flying toward the front, 300 m apart;
//   "airfield": parked on their side's field (the Allies on the start field, the Central team
//     on the German field nearest the front opposite), side by side, facing along it.

import { Quaternion, Vector3 } from 'three';
import { STARTS } from '../game/flow.js';
import { toWorld } from '../world/airfields.js';
import { SPAWN } from './netConfig.js';

const UP = new Vector3(0, 1, 0);
const _yaw = new Quaternion();

// Turn and move a freshly started Simulation (facing north at the origin) to (x, z), facing
// `heading` (radians clockwise from north). Its height is kept.
export function placeAt(sim, x, z, heading) {
  _yaw.setFromAxisAngle(UP, -heading);
  const s = sim.state;
  s.quaternion.premultiply(_yaw);
  s.velocity.applyQuaternion(_yaw);
  s.position.x = x;
  s.position.z = z;
  sim.previous.position.copy(s.position);
  sim.previous.quaternion.copy(s.quaternion);
  sim.previous.velocity.copy(s.velocity);
}

// The Central team's airfield: the German one nearest the front opposite the start field.
function centralAirfield(world) {
  const x = world.frontX(0) + 5000;
  const fields = world.airfieldsNear(x, 0, 25000).filter((af) => af.side === 'german');
  fields.sort((a, b) => Math.hypot(a.x - x, a.z) - Math.hypot(b.x - x, b.z));
  return fields[0];
}

// Where the index-th aircraft of `team` appears: { x, z, heading, altitude } (altitude 0: parked
// on the ground). Each place is fixed (-1.5, -0.5, 0.5, 1.5 spacings across), so an aircraft
// joining later never lands on top of one already there.
export function spawnPoint(world, settings, team, index) {
  const start = STARTS.find((s) => s.id === settings.start) ?? STARTS[1];
  const across = (index % 4) - 1.5;
  if (start.altitude === 0) {
    const af = team === 'allied' ? world.airfieldsNear(0, 0, 10).find((a) => a.start) : centralAirfield(world);
    const [x, z] = toWorld(af, -SPAWN.groundFromEnd * af.halfLength, across * SPAWN.groundSpacing);
    return { x, z, heading: af.heading, altitude: 0 };
  }
  const allied = team === 'allied';
  const z = across * SPAWN.airSpacing;
  const x = world.frontX(z) + (allied ? -1 : 1) * SPAWN.airBehindFront;
  return { x, z, heading: allied ? Math.PI / 2 : -Math.PI / 2, altitude: start.altitude };
}

// Start `sim` flying `aircraft` at a spawn point. Returns its starting controls.
export function spawnAircraft(sim, aircraft, point) {
  const input = point.altitude > 0 ? sim.start(aircraft, point.altitude) : sim.startOnGround(aircraft);
  placeAt(sim, point.x, point.z, point.heading);
  return input;
}
