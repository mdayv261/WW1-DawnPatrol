// Low-poly aircraft models built in code from each aircraft's data
// (wingspan, length, wing area, number of wings). No external assets.
// The model is built in body axes: +X nose, +Y up, +Z right wing, origin at
// the centre of gravity, so it can take the physics orientation directly.
// The shapes are only for looks. Wing sizes are not taken as physics.

import {
  Group, Mesh, BoxGeometry, CylinderGeometry, CircleGeometry,
  MeshLambertMaterial, MeshBasicMaterial, DoubleSide,
} from 'three';

const COLOURS = {
  camel: { body: 0x8a7a4a, wing: 0xa89a68 },
  spad13: { body: 0x6b7a4a, wing: 0x8a9565 },
  dr1: { body: 0xb02020, wing: 0xc03a3a },
  albatros: { body: 0x56674d, wing: 0x7d8b6e },
};

const lambert = (color) => new MeshLambertMaterial({ color, flatShading: true });

function box(w, h, d, material, x, y, z) {
  const m = new Mesh(new BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  return m;
}

export function createAircraftMesh(ac) {
  const palette = COLOURS[ac.id] ?? COLOURS.camel;
  const bodyMat = lambert(palette.body);
  const wingMat = lambert(palette.wing);
  const darkMat = lambert(0x2a2a2a);
  const { wingspan: span, length: L } = ac.geometry;
  const group = new Group();

  // Fuselage: a six-sided taper, thick at the nose, thin at the tail.
  const fuselage = new Mesh(new CylinderGeometry(0.34, 0.07, L, 6), bodyMat);
  fuselage.geometry.rotateZ(-Math.PI / 2); // axis along X, wide end forward
  fuselage.position.x = -0.15 * L; // nose at +0.35 L, tail at -0.65 L
  group.add(fuselage);

  // Wings: equal-chord planks stacked above and below the fuselage.
  const levels = ac.wings === 3 ? [0.95, 0.3, -0.35] : [0.8, -0.3];
  const spanScale = ac.wings === 3 ? [1, 0.87, 0.79] : [1, 0.92];
  const chord = ac.geometry.wingArea / (ac.wings * span * 0.92);
  levels.forEach((y, i) => {
    group.add(box(chord, 0.06, span * spanScale[i], wingMat, 0.15 - i * 0.05, y, 0));
  });
  // Struts between the wings.
  for (const side of [-1, 1]) {
    const strut = box(0.05, levels[0] - levels[levels.length - 1], 0.05, darkMat, 0.15, (levels[0] + levels[levels.length - 1]) / 2, side * span * 0.3);
    group.add(strut);
  }

  // Tail: horizontal stabiliser, elevator line and fin.
  group.add(box(0.9, 0.05, span * 0.32, wingMat, -0.6 * L, 0.1, 0));
  group.add(box(0.8, 0.8, 0.05, bodyMat, -0.62 * L, 0.45, 0));

  // Landing gear.
  for (const side of [-1, 1]) {
    const wheel = new Mesh(new CylinderGeometry(0.3, 0.3, 0.1, 10), darkMat);
    wheel.geometry.rotateX(Math.PI / 2);
    wheel.position.set(0.25, -1.0, side * 0.55);
    group.add(wheel);
    group.add(box(0.05, 0.75, 0.05, darkMat, 0.25, -0.62, side * 0.4));
  }

  // Propeller: two blades and a faint disc, spun around the X axis.
  const prop = new Group();
  prop.position.x = 0.36 * L + 0.05;
  prop.add(box(0.05, ac.propeller.diameter, 0.14, darkMat, 0, 0, 0));
  const disc = new Mesh(
    new CircleGeometry(ac.propeller.diameter / 2, 24),
    new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, side: DoubleSide }),
  );
  disc.geometry.rotateY(Math.PI / 2); // face along X
  prop.add(disc);
  group.add(prop);

  return { group, prop };
}
