// Simple low-poly cockpit, built in code: the decking ahead of the pilot,
// the twin machine guns and the instrument panel (a canvas texture). Shown
// only in the cockpit view. Body axes: +X nose, +Y up, +Z right wing.

import { Group, Mesh, BoxGeometry, PlaneGeometry, MeshLambertMaterial, MeshBasicMaterial } from 'three';

export function eyePosition(aircraft) {
  return { x: -aircraft.cockpit.eyeBehind, y: aircraft.cockpit.eyeAbove, z: 0 };
}

export function createCockpit(aircraft, panelTexture) {
  const eye = eyePosition(aircraft);
  const group = new Group();
  const deck = new MeshLambertMaterial({ color: 0x4a3a28, flatShading: true });
  const metal = new MeshLambertMaterial({ color: 0x222222, flatShading: true });

  // Placed so that, with the 60 degree field of view, the guns sit just
  // below the line of sight and the whole panel is on screen.
  // Decking ahead of the pilot (the "hump" over the guns on the Camel).
  const decking = new Mesh(new BoxGeometry(0.9, 0.05, 0.62), deck);
  decking.position.set(eye.x + 1.05, eye.y - 0.165, 0);
  group.add(decking);

  // Twin machine guns on top of the decking, between which the pilot aims.
  for (const side of [-1, 1]) {
    const gun = new Mesh(new BoxGeometry(0.75, 0.08, 0.07), metal);
    gun.position.set(eye.x + 1.125, eye.y - 0.1, side * 0.1);
    group.add(gun);
  }

  // Instrument panel facing the pilot, just under the rear of the decking.
  const panel = new Mesh(new PlaneGeometry(0.48, 0.15), new MeshBasicMaterial({ map: panelTexture }));
  panel.geometry.rotateY(-Math.PI / 2); // face back toward the pilot (-X)
  panel.position.set(eye.x + 0.55, eye.y - 0.215, 0);
  group.add(panel);

  return group;
}
