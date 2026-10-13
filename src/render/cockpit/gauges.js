// The instruments as 3D objects: a metal bezel and case, the live dial face (a canvas from
// ui/instrumentPanel.js) and a glass front that catches the light. Each faces -X (back toward
// the pilot) with its centre at the origin; the builder places and turns it.

import { Mesh, Group, CircleGeometry, CylinderGeometry, TorusGeometry, BoxGeometry, PlaneGeometry, SphereGeometry, MeshStandardMaterial } from 'three';

const faceMaterial = (texture) => new MeshStandardMaterial({ color: texture ? 0xffffff : 0x151515, map: texture ?? null, roughness: 0.55 });

const toBack = (g) => {
  g.rotateY(-Math.PI / 2); // a circle or plane facing +Z now faces -X
  return g;
};

// kind: the instrument (panels.js); R: dial radius (m); face: its canvas texture (or null);
// m: the cockpit materials; hatot: the French Hatot altimeter's case (a knurled setting knob on
// top and four mounting lugs). Returns { group, levers } (levers: the switch toggles, to animate).
export function gauge(kind, R, face, m, { hatot = false } = {}) {
  const group = new Group();
  const levers = [];
  const add = (g, mat, x = 0, y = 0, z = 0) => {
    const o = new Mesh(g, mat);
    o.position.set(x, y, z);
    group.add(o);
    return o;
  };
  if (kind === 'compass') {
    // A box housing with a window onto the card.
    add(new BoxGeometry(0.05, R * 1.5, R * 2.6), m.bezel, 0.026, 0, 0);
    add(toBack(new PlaneGeometry(R * 2.3, R * 1.2)), faceMaterial(face), -0.001, 0, 0);
    add(toBack(new PlaneGeometry(R * 2.3, R * 1.2)), m.gaugeGlass, -0.004, 0, 0);
  } else if (kind === 'slip') {
    // An oblong case with a window onto the curved tube.
    add(new BoxGeometry(0.03, R * 1.3, R * 3.4), m.bezel, 0.016, 0, 0);
    add(toBack(new PlaneGeometry(R * 3.2, R * 1.1)), faceMaterial(face), -0.001, 0, 0);
    add(toBack(new PlaneGeometry(R * 3.2, R * 1.1)), m.gaugeGlass, -0.004, 0, 0);
  } else if (kind === 'switches') {
    // Two brass switch bosses with toggle levers (up = on).
    for (const dz of [-0.7, 0.7]) {
      const boss = new CylinderGeometry(R * 0.55, R * 0.6, 0.02, 16);
      boss.rotateZ(Math.PI / 2);
      add(boss, m.brass, -0.005, 0, dz * R);
      const lever = new Group();
      lever.position.set(-0.016, 0, dz * R);
      const bar = new Mesh(new BoxGeometry(0.008, R * 0.8, 0.008), m.steel);
      bar.position.y = R * 0.4;
      lever.add(bar);
      group.add(lever);
      levers.push(lever);
    }
  } else if (kind === 'pulsator') {
    // A glass dome over the oil, on a brass base.
    const base = new CylinderGeometry(R, R * 1.05, 0.015, 20);
    base.rotateZ(Math.PI / 2);
    add(base, m.brass, 0.004, 0, 0);
    add(toBack(new CircleGeometry(R * 0.85, 24)), faceMaterial(face), -0.004, 0, 0);
    const dome = new SphereGeometry(R * 0.85, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.rotateZ(Math.PI / 2); // the dome bulges toward -X
    add(dome, m.gaugeGlass, -0.004, 0, 0);
  } else {
    // A round dial: case behind, the face, a bezel ring and the glass.
    const caseGeometry = new CylinderGeometry(R * 1.08, R * 1.08, 0.05, 28);
    caseGeometry.rotateZ(Math.PI / 2);
    add(caseGeometry, m.black, 0.025, 0, 0);
    add(toBack(new CircleGeometry(R, 32)), faceMaterial(face), -0.001, 0, 0);
    add(toBack(new TorusGeometry(R * 1.04, R * 0.07, 8, 36)), m.bezel, -0.004, 0, 0);
    add(toBack(new CircleGeometry(R * 1.02, 32)), m.gaugeGlass, -0.006, 0, 0);
    if (hatot) {
      add(new CylinderGeometry(R * 0.08, R * 0.06, R * 0.18, 8), m.steel, 0.01, R * 1.17, 0); // the stem
      add(new CylinderGeometry(R * 0.13, R * 0.13, R * 0.14, 16), m.steel, 0.01, R * 1.3, 0); // the knurled knob
      for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
        add(toBack(new TorusGeometry(R * 0.09, R * 0.025, 6, 12)), m.brass, 0.012, Math.cos(a) * R * 1.16, Math.sin(a) * R * 1.16);
      }
    }
  }
  return { group, levers };
}
