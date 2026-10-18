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
// `colors`: optional list of colours, one per ring point, for vertex colouring; with `faceColors`
// each colour fills the whole face from that ring point to the next (no blending between them).
export function loft(rings, { capStart = true, capEnd = true, colors = null, faceColors = false } = {}) {
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
      const kc = faceColors ? j : k; // the face's own colour, or a blend from point to point
      push(a, j); push(b, kc); push(c, kc);
      push(a, j); push(c, kc); push(d, j);
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

// The fuselage in three lofts, split at the back and front of the cockpit opening ([back, front]):
// the part behind, the cockpit section (tagged as nose: hidden in the cockpit view, where the
// cockpit draws its own walls, rim and decking) and the part ahead.
export function fuselageSplit(stations, [back, front], material, segments = 8) {
  const at = (x) => ({ ...stations[0], x, ...fuselageAt(stations, x) });
  const ahead = [...stations.filter((s) => s.x > front), at(front)];
  const section = [at(front), ...stations.filter((s) => s.x < front && s.x > back), at(back)];
  const rear = [at(back), ...stations.filter((s) => s.x < back)];
  const g = new Group();
  g.add(fuselage(ahead, material, segments));
  g.add(nose(fuselage(section, material, segments)));
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
// square tip. `colors` colours the six faces round the section: the first three the upper
// surface (leading edge to trailing edge), the last three the underside.
export function wing({ span, chord, thickness = 0.07, dihedral = 0, tip = 'round', x = 0, y = 0, colors = null, material, part = 'wing', cuts = [] }) {
  const half = span / 2;
  // Trailing-edge cut-outs for hinged surfaces: { from, to (fractions of the
  // half-span), depth (fraction of the chord removed) }. Each side of the
  // wing is cut the same way.
  const depthAt = (f) => cuts.reduce((d, c) => (f > c.from && f < c.to ? Math.max(d, c.depth) : d), 0);
  // Stations from the root outward: [fraction of half-span, chord left, cut depth].
  const fractions = [...new Set([0, 0.3, 0.6, ...TIPS[tip].map(([f]) => f), ...cuts.flatMap((c) => [c.from, c.to])])].sort((a, b) => a - b);
  const chordAt = (f) => {
    const tips = [[0.6, 1], ...[...TIPS[tip]].reverse()];
    for (let i = 0; i < tips.length - 1; i++) {
      if (f >= tips[i][0] && f <= tips[i + 1][0]) {
        const t = (f - tips[i][0]) / (tips[i + 1][0] - tips[i][0] || 1);
        return tips[i][1] + (tips[i + 1][1] - tips[i][1]) * t;
      }
    }
    return 1;
  };
  const side = [];
  for (const f of fractions) {
    const before = depthAt(f - 1e-6);
    const after = depthAt(f + 1e-6);
    side.push([f, chordAt(f), before]);
    if (after !== before) side.push([f, chordAt(f), after]);
  }
  // Mirror to the other wing: reversed order, so each step in a cut is met in the right order.
  const stations = [...side.slice(1).reverse().map(([f, c, d]) => [-f, c, d]), ...side];
  const rings = stations.map(([f, c, cut]) => {
    const z = f * half;
    const full = chord * c;
    const ch = full * (1 - cut); // chord left after the cut
    const mid = x + (full * cut) / 2; // the leading edge stays put
    const cy = y + Math.abs(z) * Math.tan(dihedral);
    const t = thickness;
    return [
      [mid + ch * 0.5, cy, z], // leading edge
      [mid + ch * 0.25, cy + t * 0.5, z],
      [mid - ch * 0.25, cy + t * 0.35, z],
      [mid - ch * 0.5, cy, z], // trailing edge
      [mid - ch * 0.25, cy - t * 0.3, z],
      [mid + ch * 0.25, cy - t * 0.45, z],
    ];
  });
  const mesh = new Mesh(loft(rings, { colors, faceColors: true }), material);
  mesh.userData = { part, span, chord }; // for the tests
  return mesh;
}

// A hinged control surface (aileron, elevator): a small wing section whose
// group origin is on the hinge line (the leading edge of the surface), so
// rotating the group about Z swings the trailing edge up or down.
// span and chord are the surface's own; (hingeX, y, z) is the middle of the hinge.
export function hinged({ span, chord, thickness, hingeX, y, z, colors, material, part, side = 1 }) {
  const pivot = new Group();
  pivot.position.set(hingeX, y, z);
  pivot.add(wing({ span, chord, thickness, tip: 'square', x: -chord / 2, y: 0, colors, material, part }));
  pivot.userData = { part, side };
  return pivot;
}

// Clip a polygon of [x, y] points to one side of the vertical line x = hingeX.
export function clipPolygon(points, hingeX, keepFront) {
  const inside = (p) => (keepFront ? p[0] >= hingeX : p[0] <= hingeX);
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if (inside(a)) out.push(a);
    if (inside(a) !== inside(b)) {
      const t = (hingeX - a[0]) / (b[0] - a[0]);
      out.push([hingeX, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

// A fin and rudder from one side-profile outline, split at x = hingeX: the
// fixed fin ahead of it and the rudder behind, as a group hinged about the
// vertical line through (hingeX, 0). With no fin (the Dr.I) pass a hingeX at
// or ahead of the front of the outline.
export function finAndRudder(points, hingeX, thickness, finMaterial, rudderMaterial) {
  const frontPart = clipPolygon(points, hingeX, true);
  const rearPart = clipPolygon(points, hingeX, false);
  const fin = frontPart.length >= 3 ? profile(frontPart, thickness, finMaterial) : null;
  if (fin) fin.userData.part = 'fin';
  const rudder = new Group();
  rudder.position.set(hingeX, 0, 0);
  rudder.add(profile(rearPart.map(([x, y]) => [x - hingeX, y]), thickness, rudderMaterial));
  rudder.userData.part = 'rudder';
  return { fin, rudder };
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
  m.userData.ends = [a, b];
  m.position.copy(from).add(to).multiplyScalar(0.5);
  m.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), dir.normalize()));
  return m;
}

// A bracing wire (or cable) between two points: a very thin strut, cheap in triangles.
export function wire(a, b, material) {
  const m = strut(a, b, 0.006, 0.006, material);
  m.userData.part = 'wire';
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

// Mark a mesh as shown only in the cockpit view (hidden outside).
export function cockpitOnly(mesh) {
  mesh.userData.cockpitOnly = true;
  mesh.visible = false;
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
