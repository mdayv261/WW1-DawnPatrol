// Building blocks for the low-poly aircraft models: lofted fuselages and
// wings, struts, wheels, propellers, fins. Everything is plain geometry built
// in code (no files, no canvas), so it also works in the automated tests.
// Body axes: +X nose, +Y up, +Z right wing.

import {
  BufferGeometry, Float32BufferAttribute, Mesh, BoxGeometry, CylinderGeometry, ConeGeometry,
  CircleGeometry, Group, Shape, ExtrudeGeometry, MeshLambertMaterial, MeshBasicMaterial, Vector3,
  Quaternion, DoubleSide,
} from 'three';

export const lambert = (color, extra = {}) => new MeshLambertMaterial({ color, flatShading: true, ...extra });
export const vertexColoured = () => new MeshLambertMaterial({ vertexColors: true, flatShading: true, side: DoubleSide });

const signedPow = (v, p) => Math.sign(v) * Math.abs(v) ** p;
const hex = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];

// A tube through a list of rings (each ring a list of [x, y, z] points, the
// same count in every ring), optionally closed at the ends. Flat-shaded.
// `colors`: optional list of colours, one per ring point, for vertex colouring.
export function loft(rings, { capStart = true, capEnd = true, colors = null } = {}) {
  const positions = [];
  const shades = [];
  const n = rings[0].length;
  const push = (p, j) => {
    positions.push(...p);
    if (colors) shades.push(...hex(colors[j % colors.length]));
  };
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      const a = rings[i][j];
      const b = rings[i][k];
      const c = rings[i + 1][k];
      const d = rings[i + 1][j];
      push(a, j); push(b, k); push(c, k);
      push(a, j); push(c, k); push(d, j);
    }
  }
  const cap = (ring, flip) => {
    const centre = [0, 1, 2].map((a) => ring.reduce((s, p) => s + p[a], 0) / n);
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      const [p, q] = flip ? [ring[k], ring[j]] : [ring[j], ring[k]];
      push(p, j); push(q, k); push(centre, j);
    }
  };
  if (capStart) cap(rings[0], false);
  if (capEnd) cap(rings[rings.length - 1], true);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  if (colors) g.setAttribute('color', new Float32BufferAttribute(shades, 3));
  g.computeVertexNormals();
  return g;
}

// ---- Fuselage ---------------------------------------------------------------

// Stations: { x, w (width), h (height), y (centre height), p (squareness, 2 = oval) }.
export function fuselageRing(s, segments = 8) {
  const ring = [];
  const p = s.p ?? 2.6;
  for (let j = 0; j < segments; j++) {
    const t = (j / segments) * Math.PI * 2;
    ring.push([s.x, (s.y ?? 0) + (s.h / 2) * signedPow(Math.sin(t), 2 / p), (s.w / 2) * signedPow(Math.cos(t), 2 / p)]);
  }
  return ring;
}

export function fuselage(stations, material, segments = 8) {
  const sorted = [...stations].sort((a, b) => b.x - a.x); // nose to tail
  return new Mesh(loft(sorted.map((s) => fuselageRing(s, segments))), material);
}

// The fuselage in two lofts split at x: the part ahead of x (tagged as nose,
// hidden in the cockpit view) and the part behind it.
export function fuselageSplit(stations, x, material, segments = 8) {
  const at = { x, ...fuselageAt(stations, x) };
  const front = [...stations.filter((s) => s.x > x), at];
  const rear = [at, ...stations.filter((s) => s.x < x)];
  const g = new Group();
  g.add(nose(fuselage(front, material, segments)));
  g.add(fuselage(rear, material, segments));
  return g;
}

// Width, height and centre of the fuselage at x, interpolated between stations
// (used to place markings on its sides).
export function fuselageAt(stations, x) {
  const s = [...stations].sort((a, b) => b.x - a.x);
  for (let i = 0; i < s.length - 1; i++) {
    if (x <= s[i].x && x >= s[i + 1].x) {
      const t = (s[i].x - x) / (s[i].x - s[i + 1].x || 1);
      const lerp = (key) => s[i][key] + (s[i + 1][key] - s[i][key]) * t;
      return { w: lerp('w'), h: lerp('h'), y: lerp('y') };
    }
  }
  return { w: s[0].w, h: s[0].h, y: s[0].y };
}

// ---- Wings ------------------------------------------------------------------

// Spanwise stations (fraction of the half-span) and the chord left there, so
// the tip rounds off. `square` keeps nearly the full chord to the tip.
const TIPS = {
  round: [[1, 0.28], [0.96, 0.62], [0.9, 0.86]],
  square: [[1, 0.9], [0.97, 1]],
};

// A wing centred on the aircraft: span, chord and thickness in metres, centred
// at (x, y) (mid-chord at the root), with dihedral (radians) and a rounded or
// square tip. `colors` colours the six ring points (top, bottom, edges).
export function wing({ span, chord, thickness = 0.07, dihedral = 0, tip = 'round', x = 0, y = 0, colors = null, material, part = 'wing' }) {
  const half = span / 2;
  // Stations from the root outward (fraction of the half-span, chord left),
  // then mirrored for the other side.
  const side = [[0, 1], [0.3, 1], [0.6, 1], ...[...TIPS[tip]].reverse()];
  const stations = [...side.slice(1).reverse().map(([f, c]) => [-f, c]), ...side];
  const rings = stations.map(([f, c]) => {
    const z = f * half;
    const ch = chord * c;
    const cy = y + Math.abs(z) * Math.tan(dihedral);
    const t = thickness;
    return [
      [x + ch * 0.5, cy, z], // leading edge
      [x + ch * 0.25, cy + t * 0.5, z],
      [x - ch * 0.25, cy + t * 0.35, z],
      [x - ch * 0.5, cy, z], // trailing edge
      [x - ch * 0.25, cy - t * 0.3, z],
      [x + ch * 0.25, cy - t * 0.45, z],
    ];
  });
  const mesh = new Mesh(loft(rings, { colors }), material);
  mesh.userData = { part, span, chord }; // for the tests
  return mesh;
}

// A flat side-profile shape (points in x, y) extruded across the aircraft:
// fins, rudders, decking. `thickness` is its width in z.
export function profile(points, thickness, material, z = 0) {
  const shape = new Shape();
  points.forEach(([px, py], i) => (i === 0 ? shape.moveTo(px, py) : shape.lineTo(px, py)));
  const g = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, z - thickness / 2);
  return new Mesh(g, material);
}

// ---- Struts, wheels, propeller ---------------------------------------------

// A thin member between two points. `chordwise` is its fore-aft size and
// `thin` its other size, both in metres.
export function strut(a, b, chordwise, thin, material) {
  const from = new Vector3(...a);
  const to = new Vector3(...b);
  const dir = to.clone().sub(from);
  const m = new Mesh(new BoxGeometry(dir.length(), chordwise, thin), material);
  m.position.copy(from).add(to).multiplyScalar(0.5);
  m.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), dir.normalize()));
  return m;
}

export function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new Mesh(new BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  return m;
}

// A cylinder (or cone frustum) along the X axis, wide end at `rFront`.
export function cylinderX(rFront, rRear, length, material, x, y = 0, z = 0, segments = 16) {
  const g = new CylinderGeometry(rRear, rFront, length, segments); // top (+Y) is the front
  g.rotateZ(-Math.PI / 2);
  const m = new Mesh(g, material);
  m.position.set(x, y, z);
  return m;
}

export function cone(radius, length, material, x, segments = 16) {
  const g = new ConeGeometry(radius, length, segments);
  g.rotateZ(-Math.PI / 2);
  const m = new Mesh(g, material);
  m.position.set(x, 0, 0);
  return m;
}

// A wheel with its axle along Z.
export function wheel(radius, width, material, x, y, z) {
  const g = new CylinderGeometry(radius, radius, width, 12);
  g.rotateX(Math.PI / 2);
  const m = new Mesh(g, material);
  m.position.set(x, y, z);
  m.userData = { part: 'wheel', radius };
  return m;
}

// Two-blade propeller turning about the X axis: returns the spinning group
// (which the game rotates) at x. Blades are a flat bar with a faint disc.
export function propeller(diameter, x, bladeMaterial, { hub = 0.12, chord = 0.16 } = {}) {
  const prop = new Group();
  prop.position.x = x;
  prop.add(box(0.04, diameter, chord, bladeMaterial));
  const disc = new Mesh(
    new CircleGeometry(diameter / 2, 24),
    new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, side: DoubleSide, depthWrite: false }),
  );
  disc.geometry.rotateY(Math.PI / 2);
  disc.userData.isDisc = true; // the hangar hides it in silhouette mode
  prop.add(disc);
  prop.add(cylinderX(hub, hub, 0.1, bladeMaterial, 0.02, 0, 0, 8));
  return prop;
}

// Mark a mesh as part of the nose: hidden in the cockpit view, where the
// cockpit draws its own decking and guns in front of the pilot.
export function nose(mesh) {
  mesh.userData.cockpitHide = true;
  return mesh;
}

// ---- Measuring (used by the tests) ------------------------------------------

export function triangleCount(object) {
  let n = 0;
  object.traverse((o) => {
    if (o.geometry) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
  });
  return n;
}
