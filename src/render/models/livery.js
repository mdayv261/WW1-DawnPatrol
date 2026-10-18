// Markings drawn in code: roundels, crosses, stars, stripes and lettering.
// Shapes are flat geometry laid just proud of the surface (so no texture files
// are needed and they stay sharp at any distance). Lettering needs a canvas,
// so it is skipped where there is no browser (the automated tests).
// A decal is built facing +Z; place it with onSide() or onWing().

import {
  Group, Mesh, CircleGeometry, PlaneGeometry, ShapeGeometry, Shape, MeshLambertMaterial,
  CanvasTexture, SRGBColorSpace, DoubleSide,
} from 'three';

const flat = (color) =>
  new MeshLambertMaterial({ color, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

// Concentric rings, outermost first (e.g. [blue, white, red] for a British roundel).
export function roundel(radius, colours) {
  const g = new Group();
  colours.forEach((colour, i) => {
    const disc = new Mesh(new CircleGeometry(radius * (1 - i / colours.length), 20), flat(colour));
    disc.position.z = i * 0.0015;
    g.add(disc);
  });
  return g;
}

// A straight-armed cross with a border (the German Balkenkreuz). `size` is the
// width of the whole cross; the arm is a third of it wide.
export function cross(size, fill, border = null) {
  const g = new Group();
  const arm = size / 3;
  const layer = (grow, colour, z) => {
    for (const [w, h] of [[size + grow, arm + grow], [arm + grow, size + grow]]) {
      const bar = new Mesh(new PlaneGeometry(w, h), flat(colour));
      bar.position.z = z;
      g.add(bar);
    }
  };
  if (border !== null) layer(size * 0.16, border, 0);
  layer(0, fill, 0.0015);
  return g;
}

// The 1915-1916 German cross (Eisernes Kreuz, a cross pattee: arms flaring out to the
// ends) in `fill` on a square field of `field` colour (white on the early Fokkers). `size`
// is the cross's width; the field is a little larger.
export function crossPattee(size, fill, field = 0xf2f2f2) {
  const g = new Group();
  if (field !== null) g.add(new Mesh(new PlaneGeometry(size * 1.2, size * 1.2), flat(field)));
  const s = size / 2;
  const inner = size * 0.09; // half the arm's width at the centre
  const outer = size * 0.22; // half its width at the end
  const shape = new Shape();
  const points = [];
  for (let k = 0; k < 4; k++) {
    const a = (-k * Math.PI) / 2; // each arm in turn, a quarter turn clockwise, so the outline runs round
    const rot = ([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    points.push(rot([-inner, inner]), rot([-outer, s]), rot([outer, s]), rot([inner, inner]));
  }
  points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  const cross = new Mesh(new ShapeGeometry(shape), flat(fill));
  cross.position.z = 0.0015;
  g.add(cross);
  return g;
}

// A wheel cover painted in equal sectors (e.g. red, white and black thirds), radius r.
export function sectors(radius, colours) {
  const g = new Group();
  const n = colours.length;
  colours.forEach((colour, i) => {
    g.add(new Mesh(new CircleGeometry(radius, 8, (i * 2 * Math.PI) / n + Math.PI / 2, (2 * Math.PI) / n), flat(colour)));
  });
  return g;
}

export function star(radius, colour) {
  const shape = new Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.4;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const [x, y] = [Math.cos(a) * r, Math.sin(a) * r];
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return new Mesh(new ShapeGeometry(shape), flat(colour));
}

export function rect(width, height, colour) {
  return new Mesh(new PlaneGeometry(width, height), flat(colour));
}

// Lettering on a transparent panel, or null where canvases are not available.
export function text(label, width, height, colour = '#ffffff') {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = Math.max(32, Math.round((256 * height) / width));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = colour;
  ctx.font = `bold ${Math.round(canvas.height * 0.8)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const material = new MeshLambertMaterial({
    map: texture, transparent: true, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
  return new Mesh(new PlaneGeometry(width, height), material);
}

// Put a decal on the right (+1) or left (-1) side of the fuselage at (x, y),
// with the surface at z = |z| (the decal faces outward).
export function onSide(decal, side, x, y, z) {
  if (!decal) return null;
  decal.position.set(x, y, side * (Math.abs(z) + 0.004));
  if (side < 0) decal.rotation.y = Math.PI;
  return decal;
}

// Put a decal on the top (up = true) or underside of a wing at (x, z), height y.
export function onWing(decal, up, x, y, z) {
  if (!decal) return null;
  decal.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
  decal.position.set(x, y + (up ? 0.05 : -0.05), z);
  return decal;
}
