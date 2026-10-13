// The smaller fittings of a cockpit: the steel posts some guns stand on, the ring sight on top of a
// gun, a leather pad on a breech, rivet rows and the fittings on the decking. Body axes: +X nose,
// +Y up, +Z right; metres.

import { Group, BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, Mesh } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rod } from './parts.js';

const mesh = (g, m, x = 0, y = 0, z = 0) => {
  const o = new Mesh(g, m);
  o.position.set(x, y, z);
  return o;
};

// Steel posts the guns stand on, from under each gun down into the cockpit, joined by a cross bar
// in front of the instrument panel (the Dr.I). posts: { x, bottomY, barY, barHalfWidth }.
export function gunPosts(posts, gunY, gunZ, receiverHeight, material) {
  const g = new Group();
  for (const s of [-1, 1]) g.add(rod([posts.x, gunY - receiverHeight / 2, s * gunZ], [posts.x, posts.bottomY, s * gunZ], 0.012, material, 10));
  g.add(rod([posts.x, posts.barY, -posts.barHalfWidth], [posts.x, posts.barY, posts.barHalfWidth], 0.011, material, 10));
  for (const s of [-1, 1]) g.add(mesh(new CylinderGeometry(0.018, 0.018, 0.03, 10).rotateX(Math.PI / 2), material, posts.x, posts.barY, s * gunZ)); // the clamps
  return g;
}

// A padded leather cushion block on the rear cover of a gun's breech, for the pilot's face (the Dr.I).
// It covers the rear plate (gun() in parts.js: 0.025 m deep, at breechX - 0.008), standing just behind it.
export function gunPad(breechX, gunY, z, material) {
  return mesh(new RoundedBoxGeometry(0.035, 0.11, 0.08, 4, 0.014), material, breechX - 0.038, gunY, z);
}

// Rivet heads in rows: one merged mesh (one draw call). points: [[x, y, z]...] on a surface facing -X.
export function rivets(points, material, radius = 0.004) {
  const parts = points.map(([x, y, z]) => new SphereGeometry(radius, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(Math.PI / 2).translate(x, y, z));
  return new Mesh(mergeGeometries(parts), material);
}

// A small ring sight (a ring with a cross) on a short post on top of a gun, near its front.
export function gunRing(x, gunTop, z, m, R = 0.035) {
  const g = new Group(); // R: the ring's radius
  const centreY = gunTop + R + 0.025;
  const ring = new TorusGeometry(R, 0.003, 6, 32);
  ring.rotateY(Math.PI / 2);
  g.add(mesh(ring, m.steel, x, centreY, z));
  g.add(mesh(new BoxGeometry(0.002, 2 * R, 0.002), m.steel, x, centreY, z));
  g.add(mesh(new BoxGeometry(0.002, 0.002, 2 * R), m.steel, x, centreY, z));
  g.add(rod([x, gunTop, z], [x, centreY - R, z], 0.0035, m.steel, 6));
  return g;
}

// Fittings on the decking (the Dr.I): a black strip with a row of bolt heads across its rear edge,
// a red filler cap with a bright ring, and a round black fitting at the rear in the middle.
// f: { boltStripX, fillerCap: [x, z], rearFitting }; deck(x, z): the decking's height there.
export function deckFittings(f, deck, halfWidth, m, capMaterial) {
  const g = new Group();
  const x = f.boltStripX;
  for (let i = 0; i <= 10; i++) {
    const z = -halfWidth * 0.8 + (1.6 * halfWidth * i) / 10;
    const strip = mesh(new BoxGeometry(0.03, 0.006, (1.6 * halfWidth) / 10 + 0.002), m.black, x, deck(x, z) + 0.002, z);
    g.add(strip);
    g.add(mesh(new CylinderGeometry(0.006, 0.006, 0.006, 8), m.steel, x, deck(x, z) + 0.007, z));
  }
  const [cx, cz] = f.fillerCap;
  g.add(mesh(new CylinderGeometry(0.03, 0.03, 0.012, 16), m.steel, cx, deck(cx, cz) + 0.004, cz));
  g.add(mesh(new CylinderGeometry(0.024, 0.026, 0.02, 16), capMaterial, cx, deck(cx, cz) + 0.014, cz));
  const r = f.rearFitting;
  g.add(mesh(new CylinderGeometry(0.035, 0.04, 0.05, 16), m.black, r, deck(r, 0) + 0.022, 0));
  return g;
}
