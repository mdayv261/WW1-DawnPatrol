// Three.js objects for the things standing on the ground: trenches (a low
// ribbon mesh), barbed wire (lines) and instanced trees and buildings. Shapes
// are tiny low-poly meshes drawn many times, so a whole tile of woods or a
// village is a handful of draw calls.

import {
  BufferGeometry, Float32BufferAttribute, InstancedMesh, MeshLambertMaterial, LineSegments, LineBasicMaterial,
  Mesh, Matrix4, Quaternion, Vector3, Euler, Color, ConeGeometry, CylinderGeometry, OctahedronGeometry, BoxGeometry, TorusGeometry, DoubleSide,
} from 'three';
import { hash } from '../../world/noise.js';
import { WALL_COLOURS, ROOF_COLOURS } from '../../world/features.js';

// ---- Shared unit shapes (built once) ------------------------------------------

function merge(geometries) {
  const positions = [];
  for (const g of geometries) {
    const flat = g.index ? g.toNonIndexed() : g;
    positions.push(...flat.attributes.position.array);
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new Float32BufferAttribute(positions, 3));
  out.computeVertexNormals();
  return out;
}

let shapes = null;
export function getShapes() {
  if (shapes) return shapes;
  const trunk = (h) => new CylinderGeometry(0.12, 0.16, h, 5).translate(0, h / 2, 0);
  const conifer = merge([trunk(0.25), new ConeGeometry(1, 0.85, 6).translate(0, 0.15 + 0.425, 0)]);
  const broadleaf = merge([trunk(0.4), new OctahedronGeometry(1, 0).scale(1, 0.38, 1).translate(0, 0.62, 0)]);
  const stump = new CylinderGeometry(1, 1.2, 1, 5).translate(0, 0.5, 0);
  const wall = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  // Gabled roof: a triangular prism, ridge along z, 1 wide, 1 long, 1 high.
  const roof = new BufferGeometry();
  const v = [
    [-0.5, 0, -0.5], [0.5, 0, -0.5], [0, 1, -0.5], [-0.5, 0, 0.5], [0.5, 0, 0.5], [0, 1, 0.5],
  ];
  const tris = [[0, 1, 2], [3, 5, 4], [0, 2, 5], [0, 5, 3], [1, 4, 5], [1, 5, 2]];
  roof.setAttribute('position', new Float32BufferAttribute(tris.flat().flatMap((i) => v[i]), 3));
  roof.computeVertexNormals();
  const spire = new ConeGeometry(0.5, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0);
  // Flat triangle lying on the ground, apex toward +z: 1 wide, 1 long (airfield markers).
  const flatTriangle = new BufferGeometry();
  flatTriangle.setAttribute('position', new Float32BufferAttribute([-0.5, 0.06, -0.5, 0, 0.06, 0.5, 0.5, 0.06, -0.5], 3));
  flatTriangle.computeVertexNormals();
  // A tube along +z, 1 long and 1 across (wind sock segments).
  const tube = new CylinderGeometry(1, 1, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  // A low ring of thrown-up earth round a crater, radius 1 (instances scale it).
  const rim = new TorusGeometry(1, 0.12, 4, 10).rotateX(Math.PI / 2);
  shapes = { conifer, broadleaf, stump, wall, roof, spire, flatTriangle, tube, rim };
  return shapes;
}

// One material for every instanced shape; colour comes from each instance.
let instanceMaterial = null;
export const getInstanceMaterial = () => (instanceMaterial ??= new MeshLambertMaterial({ color: 0xffffff, flatShading: true }));

const _m = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _e = new Euler();
const _s = new Vector3();
const _c = new Color();
const UP = new Vector3(0, 1, 0);

// An InstancedMesh of `geometry` with one instance per item. place(item)
// returns { x, y, z, sx, sy, sz, rot (yaw), pitch (nose-down tilt), colour (hex) }.
export function instanced(geometry, items, place, material = getInstanceMaterial()) {
  const mesh = new InstancedMesh(geometry, material, items.length);
  items.forEach((item, i) => {
    const o = place(item, i);
    _q.setFromEuler(_e.set(o.pitch ?? 0, o.rot ?? 0, 0, 'YXZ'));
    _m.compose(_p.set(o.x, o.y ?? 0, o.z), _q, _s.set(o.sx, o.sy, o.sz));
    mesh.setMatrixAt(i, _m);
    mesh.setColorAt(i, _c.setHex(o.colour));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

const jitter = (item, n) => hash(77, Math.round(item.x * 7), Math.round(item.z * 7), n);

// ---- Trees ---------------------------------------------------------------------

const hsl = (h, s, l) => _c.setHSL(h, s, l).getHex();

export function treeMeshes(trees) {
  const S = getShapes();
  const out = [];
  const group = (kind) => trees.filter((t) => t.kind === kind);
  const make = (kind, geometry, colour) => {
    const list = group(kind);
    if (!list.length) return;
    out.push(instanced(geometry, list, (t) => ({ x: t.x, z: t.z, sx: t.r, sy: t.h, sz: t.r, rot: jitter(t, 1) * 6.28, colour: colour(t) })));
  };
  make('conifer', S.conifer, (t) => hsl(0.33, 0.4, 0.09 + jitter(t, 2) * 0.05));
  make('broadleaf', S.broadleaf, (t) => hsl(0.24 + jitter(t, 3) * 0.06, 0.45, 0.12 + jitter(t, 2) * 0.06));
  make('poplar', S.conifer, (t) => hsl(0.27, 0.5, 0.14 + jitter(t, 2) * 0.05));
  make('stump', S.stump, (t) => hsl(0.09, 0.25, 0.1 + jitter(t, 2) * 0.05));
  make('dead', S.stump, (t) => hsl(0.08, 0.1, 0.1 + jitter(t, 2) * 0.05)); // burnt, leafless trunks
  return out;
}

// ---- Buildings -----------------------------------------------------------------

// Houses and churches (any `type: 'house'` items, farms included) and bridges, added to a batch.
export function addBuildings(batch, buildings, bridges = []) {
  for (const b of buildings) {
    const sin = Math.sin(b.rot);
    const cos = Math.cos(b.rot);
    batch.wall(b.x, b.z, b.w, b.h, b.d, b.rot, WALL_COLOURS[b.wall]);
    if (!b.ruined) batch.roof(b.x, b.z, b.h, b.w * 1.1, b.w * 0.45, b.d * 1.08, b.rot, ROOF_COLOURS[b.roof]);
    if (b.type === 'church') {
      const oz = b.d / 2 + 2.5; // the tower stands at one end
      const tx = b.x + oz * sin;
      const tz = b.z + oz * cos;
      const th = b.ruined ? b.tower * 0.55 : b.tower;
      batch.wall(tx, tz, 5, th, 5, b.rot, 0xbfae8c);
      if (!b.ruined) batch.spire(tx, tz, th, 5.4, 9, b.rot, 0x4a4a52);
    }
  }
  for (const br of bridges) batch.wall(br.x, br.z, br.length, 0.7, 5, -br.rot, 0x8a8478);
}

// ---- Trenches and wire ---------------------------------------------------------

// Cross-section of a trench: [offset across, height, is floor]. A dark floor
// between two raised banks of spoil.
const PROFILE = [[-2.8, 0.02, false], [-1.6, 0.8, false], [-0.95, 0.1, false], [0.95, 0.1, true], [1.6, 0.8, false], [2.8, 0.02, false]];
const EARTH = new Color(0x6b5a3d);
const FLOOR = new Color(0x241a10);

// A ribbon mesh along the trench polylines: floor and banks. `stride` skips
// points (the plan zigzags every 12 m, so every other sample keeps the shape).
export function trenchMesh(lines, stride = 2) {
  const pos = [];
  const col = [];
  for (const line of lines) {
    const pts = line.pts.filter((_, i) => i % stride === 0 || i === line.pts.length - 1);
    if (pts.length < 2) continue;
    // Across-line directions at each point (average of the neighbouring segments).
    const rows = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      const tx = b[0] - a[0];
      const tz = b[1] - a[1];
      const len = Math.hypot(tx, tz) || 1;
      return { x: p[0], z: p[1], nx: -tz / len, nz: tx / len };
    });
    for (let i = 0; i < rows.length - 1; i++) {
      for (let j = 0; j < PROFILE.length - 1; j++) {
        const [o1, h1, f1] = PROFILE[j];
        const [o2, h2] = PROFILE[j + 1];
        const a = rows[i];
        const b = rows[i + 1];
        const p = (r, o, h) => [r.x + r.nx * o, h, r.z + r.nz * o];
        const quad = [p(a, o1, h1), p(a, o2, h2), p(b, o2, h2), p(b, o1, h1)];
        const colour = f1 && PROFILE[j + 1][2] ? FLOOR : EARTH;
        const shade = 0.85 + 0.3 * hash(5, Math.round(a.x), Math.round(a.z), j);
        for (const idx of [0, 1, 2, 0, 2, 3]) {
          pos.push(...quad[idx]);
          col.push(colour.r * shade, colour.g * shade, colour.b * shade);
        }
      }
    }
  }
  if (!pos.length) return null;
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mesh = new Mesh(g, new MeshLambertMaterial({ vertexColors: true, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  return mesh;
}

// Barbed wire: two strands of line segments above the ground.
export function wireLines(lines) {
  const pos = [];
  for (const line of lines) {
    for (let i = 0; i < line.pts.length - 1; i++) {
      for (const y of [0.45, 0.9]) {
        pos.push(line.pts[i][0], y, line.pts[i][1], line.pts[i + 1][0], y, line.pts[i + 1][1]);
      }
    }
  }
  if (!pos.length) return null;
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return new LineSegments(g, new LineBasicMaterial({ color: 0x1b1b1b }));
}

// Free the GPU memory of a tile's objects (shared geometry and material are kept).
export function disposeObject(o) {
  const shared = new Set(Object.values(shapes ?? {}));
  o.traverse((c) => {
    if (c.geometry && !shared.has(c.geometry)) c.geometry.dispose();
    if (c.material && c.material !== instanceMaterial && !c.material.userData.shared) {
      if (c.material.map) c.material.map.dispose();
      c.material.dispose();
    }
    if (c.dispose && c.isInstancedMesh) c.dispose();
  });
}
