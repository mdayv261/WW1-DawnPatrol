// The pieces of a cockpit, built in code: the padded rim, the inside walls and frames, the
// decking ahead, the gun breeches, the ring sight, the windscreen, the stick and the throttle.
// The 3D gauges are in gauges.js. Body axes: +X nose, +Y up, +Z right; metres.

import {
  BufferGeometry, Float32BufferAttribute, Mesh, Group, BoxGeometry, CylinderGeometry, SphereGeometry,
  TorusGeometry, TubeGeometry, CatmullRomCurve3, Vector3, Quaternion,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { fuselageAt } from '../models/parts.js';

// Darker lower down inside the cockpit, where little light reaches: a colour per vertex from
// its height (y in the cockpit's own axes), `minShade` at `lowY` up to 1 at `highY`.
export function shadeByHeight(geometry, lowY, highY, minShade = 0.35, offsetY = 0) {
  const pos = geometry.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) + offsetY - lowY) / (highY - lowY || 1)));
    const k = minShade + (1 - minShade) * t * t;
    colours[i * 3] = colours[i * 3 + 1] = colours[i * 3 + 2] = k;
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  return geometry;
}

// Stretch a geometry's texture coordinates (so one texture repeats at a real-world size).
export function scaleUV(geometry, su, sv, swap = false) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, (swap ? v : u) * su, (swap ? u : v) * sv);
  }
  return geometry;
}

const mesh = (g, m, x = 0, y = 0, z = 0) => {
  const o = new Mesh(g, m);
  o.position.set(x, y, z);
  return o;
};

// A cylinder between two points (a round bar, a tube, a wire).
export function rod(a, b, radius, material, segments = 8) {
  const from = new Vector3(...a);
  const dir = new Vector3(...b).sub(from);
  const m = new Mesh(new CylinderGeometry(radius, radius, dir.length(), segments), material);
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize()));
  return m;
}

// Height of the fuselage's top surface at (x, z): the outline of a fuselage station
// (see fuselageRing in models/parts.js: a superellipse of squareness p).
export function fuselageTop(stations, x, z) {
  const f = fuselageAt(stations, x);
  const p = stations[0].p ?? 2.6;
  const c = Math.min(1, Math.abs(z) / (f.w / 2));
  const s = Math.max(0, 1 - c ** p) ** (1 / p); // sin(t)^(2/p) where cos(t)^(2/p) = c
  return (f.y ?? 0) + (f.h / 2) * s;
}

// Height of the rim's centre across the front of the opening when it closes there (frontArch):
// at the sides it sits on the fuselage, rising in an arch to frontArch in the middle.
export function archHeight(stations, opening, z) {
  const { front, rimRadius, frontArch } = opening;
  const hw = rimHalfWidth(stations, opening, front);
  const side = fuselageTop(stations, front, hw) + rimRadius * 0.6;
  return side + (frontArch - side) * Math.sqrt(Math.max(0, 1 - (z / hw) ** 2));
}

// How far out the rim runs at x: the opening's half width, but never past the fuselage's side
// (where the opening is wider than the fuselage, the rim follows the fuselage's edge).
export function rimHalfWidth(stations, opening, x) {
  return Math.min(opening.halfWidth, fuselageAt(stations, x).w / 2 - 0.012);
}

// The padded leather rim along the sides and round the back of the opening, a tube on the fuselage
// top. A horseshoe (at the front the opening meets the decking over the instrument board), or with
// opening.frontArch a closed ring that arches over the board (the Dr.I).
export function coaming(stations, opening, material) {
  const { back, front, halfWidth: hw, rimRadius } = opening;
  const rc = Math.min(hw, (front - back) / 2); // depth of the rounded back
  const flat = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) flat.push([front - ((front - back - rc) * i) / steps, hw]); // right side, front to back
  for (let i = 1; i < 24; i++) {
    const t = Math.PI / 2 + (i / 24) * Math.PI; // round the back
    const c = Math.cos(t);
    const s = Math.sin(t);
    flat.push([back + rc + rc * Math.sign(c) * Math.abs(c) ** 0.5, hw * Math.sign(s) * Math.abs(s) ** 0.5]);
  }
  for (let i = steps; i >= 0; i--) flat.push([front - ((front - back - rc) * i) / steps, -hw]); // left side, back to front
  const points = flat.map(([x, z]) => {
    const zz = Math.sign(z) * Math.min(Math.abs(z), rimHalfWidth(stations, opening, x)); // kept on the fuselage
    return new Vector3(x, fuselageTop(stations, x, zz) + rimRadius * 0.6, zz);
  });
  const closed = opening.frontArch !== undefined;
  if (closed) {
    points.pop(); // the arch starts at the left front corner
    const fw = rimHalfWidth(stations, opening, front);
    for (let i = 0; i < 12; i++) {
      const z = -fw + (2 * fw * i) / 12;
      points.push(new Vector3(front, archHeight(stations, opening, z), z));
    }
  }
  const curve = new CatmullRomCurve3(points, closed, 'centripetal');
  const g = new TubeGeometry(curve, 140, rimRadius, 12, closed);
  scaleUV(g, curve.getLength() / 0.3, 1);
  const group = new Group();
  group.add(new Mesh(g, material));
  if (!closed) for (const p of [points[0], points[points.length - 1]]) group.add(mesh(new SphereGeometry(rimRadius, 12, 8), material, p.x, p.y, p.z)); // the ends
  return group;
}

// The inside walls of the cockpit (left and right, following the fuselage's width and top),
// with their outside skin, plus the floor and the seat back. Returns a Group.
export function walls(stations, opening, floorY, inner, outer, floor) {
  const group = new Group();
  const { back, front, halfWidth } = opening;
  const steps = 8;
  for (const side of [-1, 1]) {
    for (const [mat, offset, faceOut] of [[inner, -0.004, false], [outer, 0.004, true]]) {
      const pos = [];
      const uv = [];
      for (let i = 0; i <= steps; i++) {
        const x = back + ((front - back) * i) / steps;
        const f = fuselageAt(stations, x);
        const z = side * (Math.min(halfWidth, f.w / 2 - 0.01) + offset);
        const top = fuselageTop(stations, x, z);
        const bottom = faceOut ? f.y - f.h * 0.15 : floorY;
        pos.push(x, top, z, x, bottom, z);
        uv.push((x - back) / 0.5, top / 0.5, (x - back) / 0.5, bottom / 0.5);
      }
      const index = [];
      for (let i = 0; i < steps; i++) {
        const a = i * 2;
        // Faces point toward the inside of the cockpit (inner) or away from it (outer). The first
        // winding faces -Z: inward on the right wall, outward on the left.
        const facesMinusZ = (side > 0) !== faceOut;
        if (facesMinusZ) index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        else index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
      g.setIndex(index);
      g.computeVertexNormals();
      shadeByHeight(g, floorY, fuselageTop(stations, back, 0), 0.3);
      group.add(new Mesh(g, mat));
    }
  }
  // Floor boards and the seat back behind the pilot.
  const fw = 2 * halfWidth;
  const fl = shadeByHeight(scaleUV(new BoxGeometry(front - back, 0.02, fw), 2, 1), floorY - 0.2, floorY + 0.6, 0.3, floorY);
  group.add(mesh(fl, floor, (back + front) / 2, floorY, 0));
  const seatTop = fuselageTop(stations, back, 0) - 0.02;
  const sb = shadeByHeight(new BoxGeometry(0.02, seatTop - floorY, fw), floorY, seatTop, 0.3, (seatTop + floorY) / 2);
  group.add(mesh(sb, inner, back + 0.01, (seatTop + floorY) / 2, 0));
  return group;
}

// The fuselage frame seen inside: a longeron along the top of each wall, uprights and diagonal
// bracing wires. `tube` frames (the Dr.I's welded steel) are round; wooden ones are square.
export function frames(stations, opening, floorY, material, wire, tube = false) {
  const group = new Group();
  const { back, front, halfWidth } = opening;
  const zAt = (x, side) => side * (Math.min(halfWidth, fuselageAt(stations, x).w / 2 - 0.01) - 0.02);
  const yTop = (x) => fuselageTop(stations, x, halfWidth) - 0.035;
  const bar = (a, b, size) => {
    const m = tube ? rod(a, b, size * 0.5, material) : rodSquare(a, b, size, material);
    shadeByHeight(m.geometry, floorY, yTop(back), 0.3, m.position.y);
    return m;
  };
  for (const side of [-1, 1]) {
    group.add(bar([back, yTop(back), zAt(back, side)], [front + 0.05, yTop(front), zAt(front, side)], 0.03));
    const mid = floorY + 0.25;
    group.add(bar([back, mid, zAt(back, side)], [front + 0.05, mid, zAt(front, side)], 0.025));
    const xs = [back + 0.05, (back + front) / 2, front - 0.02];
    for (const x of xs) group.add(bar([x, floorY, zAt(x, side)], [x, yTop(x), zAt(x, side)], 0.025));
    group.add(rod([xs[0], mid, zAt(xs[0], side)], [xs[1], yTop(xs[1]) - 0.02, zAt(xs[1], side)], 0.0015, wire, 4));
    group.add(rod([xs[1], mid, zAt(xs[1], side)], [xs[2], yTop(xs[2]) - 0.02, zAt(xs[2], side)], 0.0015, wire, 4));
  }
  return group;
}

function rodSquare(a, b, size, material) {
  const m = rod(a, b, size / 2, material, 4);
  m.geometry.rotateY(Math.PI / 4); // a square section, sides square to the walls
  return m;
}

// Height of the decking's surface at (x, z): the fuselage top, raised by the hump if there is one.
// A hump with `fade: [x0, x1]` runs at full height back from x0 and dies away by x1.
export function deckHeight(stations, x, z, hump) {
  let bump = hump ? hump.height * Math.max(0, 1 - (z / hump.halfWidth) ** 2) ** 0.6 : 0;
  if (hump?.fade) {
    const t = Math.min(1, Math.max(0, (x - hump.fade[0]) / (hump.fade[1] - hump.fade[0])));
    bump *= 1 - t * t * (3 - 2 * t);
  }
  return fuselageTop(stations, x, z) + 0.004 + bump;
}

// The top of the fuselage ahead of the opening, following the fuselage's own shape, with the
// Camel's hump over the gun breeches (`hump`: { height, halfWidth }).
export function decking(stations, from, to, halfWidth, hump, material) {
  const rows = 14;
  const cols = 16;
  const pos = [];
  const uv = [];
  for (let i = 0; i <= rows; i++) {
    const x = from + ((to - from) * i) / rows;
    const w = Math.min(halfWidth, fuselageAt(stations, x).w / 2) + 0.004;
    for (let j = 0; j <= cols; j++) {
      const z = -w + (2 * w * j) / cols;
      pos.push(x, deckHeight(stations, x, z, hump), z);
      uv.push((x - from) / 0.5, (z + w) / 0.5);
    }
  }
  const index = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      const b = a + cols + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return new Mesh(g, material);
}

// One machine gun lying along X with its breech's rear face at `breechX` and its muzzle at
// `muzzleX`, centred at (y, z). Vickers: a box receiver and a slotted (louvred) jacket; LMG 08/15:
// a taller receiver and a perforated jacket, with the cocking lever and its wooden knob.
export function gun(type, breechX, muzzleX, y, z, m) {
  const g = new Group();
  const vickers = type === 'vickers';
  const rl = vickers ? 0.42 : 0.38; // receiver length
  const rh = vickers ? 0.11 : 0.12;
  const rw = vickers ? 0.09 : 0.088;
  const r = vickers ? 0.044 : 0.047;
  const rounded = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r);
  g.add(mesh(rounded(rl, rh, rw, 0.012), m.gunmetal, breechX + rl / 2, y, z));
  g.add(mesh(rounded(0.025, rh * 0.85, rw * 0.85, 0.008), m.gunmetal, breechX - 0.008, y, z)); // rear plate
  g.add(mesh(rounded(rl * 0.7, 0.022, rw * 0.75, 0.008), m.gunmetal, breechX + rl * 0.45, y + rh / 2 + 0.008, z)); // top cover
  for (const dx of [0.08, 0.2, 0.32]) g.add(mesh(new CylinderGeometry(0.006, 0.006, rw + 0.012, 8).rotateX(Math.PI / 2), m.steel, breechX + rl * dx * 2.2 - 0.02, y - rh * 0.25, z)); // pins through the side plates
  for (const side of [-1, 1]) g.add(mesh(new BoxGeometry(rl * 0.8, rh * 0.6, 0.004), m.steel, breechX + rl * 0.5, y, z + side * (rw / 2 + 0.002))); // side plates
  const inboard = -(Math.sign(z) || 1);
  g.add(mesh(new BoxGeometry(0.07, 0.05, 0.05), m.gunmetal, breechX + rl * 0.35, y + 0.01, z + inboard * (rw / 2 + 0.025))); // feed block, belt in from the inside
  g.add(mesh(new BoxGeometry(0.05, 0.12, 0.04), m.black, breechX + rl * 0.35, y - 0.07, z + inboard * (rw / 2 + 0.03))); // ammunition chute below it
  g.add(rod([breechX - 0.02, y - rh * 0.3, z], [breechX - 0.02, y + rh * 0.3, z], 0.006, m.steel, 6)); // the rear handle
  const jacketLength = Math.max(0.2, muzzleX - (breechX + rl) - 0.04);
  const jacket = new CylinderGeometry(r, r, jacketLength, 20, 1, false);
  scaleUV(jacket, 1, jacketLength / 0.17, true);
  jacket.rotateZ(-Math.PI / 2);
  g.add(mesh(jacket, vickers ? m.louvred : m.perforated, breechX + rl + jacketLength / 2, y, z));
  const muzzle = new CylinderGeometry(r * 0.45, r * 0.6, 0.06, 12);
  muzzle.rotateZ(-Math.PI / 2);
  g.add(mesh(muzzle, m.gunmetal, breechX + rl + jacketLength + 0.03, y, z));
  // Cocking lever on the outer side (outboard of each gun), with its knob.
  const out = Math.sign(z) || 1;
  const pivot = [breechX + rl * 0.7, y, z + out * (rw / 2 + 0.01)];
  const tip = [breechX + rl * 0.35, y + 0.07, z + out * (rw / 2 + 0.03)];
  g.add(rod(pivot, tip, 0.006, m.steel, 6));
  g.add(mesh(new SphereGeometry(vickers ? 0.013 : 0.02, 12, 8), vickers ? m.brass : m.grip, ...tip));
  return g;
}

// A ring-and-bead sight: the ring at eye height (the pilot's eye at its centre puts the bead
// on the target), each on a post down to `postY`.
export function ringSight(eyeY, ringX, beadX, ringPostY, beadPostY, m) {
  const g = new Group();
  const ring = new TorusGeometry(0.045, 0.0028, 6, 40);
  ring.rotateY(Math.PI / 2);
  g.add(mesh(ring, m.steel, ringX, eyeY, 0));
  g.add(mesh(new BoxGeometry(0.002, 0.09, 0.002), m.steel, ringX, eyeY, 0)); // cross wires
  g.add(mesh(new BoxGeometry(0.002, 0.002, 0.09), m.steel, ringX, eyeY, 0));
  g.add(rod([ringX, ringPostY, 0], [ringX, eyeY - 0.045, 0], 0.003, m.steel, 6));
  g.add(mesh(new SphereGeometry(0.006, 10, 8), m.brass, beadX, eyeY, 0));
  g.add(rod([beadX, beadPostY, 0], [beadX, eyeY - 0.006, 0], 0.0025, m.steel, 6));
  return g;
}

// The windscreen: one curved pane ('small') or two panes meeting in a V ('twoPane'). No frame
// along the top edge, which would lie across the view just above the sight (product owner's choice).
export function windscreen(w, m) {
  const g = new Group();
  if (w.kind === 'small') {
    // A slice of an upright cylinder whose axis is behind the screen, so it curves round the pilot.
    const radius = w.halfWidth * 1.6;
    const arc = 2 * Math.asin(w.halfWidth / radius);
    const axisX = w.x - radius;
    g.add(mesh(new CylinderGeometry(radius, radius, w.height, 16, 1, true, Math.PI / 2 - arc / 2, arc), m.glass, axisX, w.baseY + w.height / 2, 0));
  } else {
    const back = 0.06; // the outer edges are this far behind the centre post
    for (const side of [-1, 1]) {
      const len = Math.hypot(w.halfWidth, back);
      const pane = new BoxGeometry(0.003, w.height, len);
      const pm = mesh(pane, m.glass, w.x - back / 2, w.baseY + w.height / 2, side * w.halfWidth / 2);
      pm.rotation.y = side * Math.atan2(back, w.halfWidth);
      g.add(pm);
      g.add(rod([w.x - back, w.baseY, side * w.halfWidth], [w.x - back, w.baseY + w.height, side * w.halfWidth], 0.005, m.black, 6));
    }
    g.add(rod([w.x, w.baseY, 0], [w.x, w.baseY + w.height, 0], 0.006, m.black, 6));
  }
  return g;
}

// The control column on the floor. Returns { group, pivot }: turn `pivot` to move the stick.
// British aircraft: a spade grip (a loop); German: two wooden handles on a cross bar.
export function stick(x, floorY, height, german, m) {
  const pivot = new Group();
  pivot.position.set(x, floorY + 0.04, 0);
  pivot.add(rod([0, 0, 0], [0, height, 0], 0.014, m.black, 10));
  if (german) {
    pivot.add(rod([0, height, -0.09], [0, height, 0.09], 0.01, m.steel, 8));
    for (const s of [-1, 1]) pivot.add(rod([0, height - 0.01, s * 0.09], [0, height + 0.1, s * 0.09], 0.017, m.grip, 10));
  } else {
    const loop = new TorusGeometry(0.045, 0.01, 8, 24, Math.PI * 1.2);
    loop.rotateY(-Math.PI / 2); // into the plane across the cockpit, starting at +Z
    loop.rotateX(Math.PI * 0.1); // so the arc runs over the top, from just below one side to the other
    pivot.add(mesh(loop, m.grip, 0, height + 0.035, 0));
    pivot.add(rod([0, height + 0.02, -0.043], [0, height + 0.02, 0.043], 0.008, m.steel, 6));
    pivot.add(mesh(new BoxGeometry(0.018, 0.018, 0.022), m.brass, 0.012, height + 0.075, 0.025)); // gun trigger
  }
  const group = new Group();
  group.add(mesh(new CylinderGeometry(0.05, 0.06, 0.04, 12), m.black, x, floorY + 0.02, 0)); // the boot at its foot
  group.add(pivot);
  return { group, pivot };
}

// The throttle on the left wall: a quadrant plate and a lever with a knob. Returns { group, lever }.
export function throttle(t, m) {
  const group = new Group();
  group.add(mesh(new BoxGeometry(0.16, 0.08, 0.01), m.brass, t.x, t.y, t.z));
  const lever = new Group();
  lever.position.set(t.x, t.y - 0.02, t.z + 0.012);
  lever.add(rod([0, 0, 0], [0, 0.11, 0], 0.005, m.steel, 6));
  lever.add(mesh(new SphereGeometry(0.014, 10, 8), m.black, 0, 0.115, 0));
  group.add(lever);
  return { group, lever };
}
