// Collects everything small that stands on a tile (house walls and roofs,
// spires, hangars, sandbags, crates, wind socks, airfield markers, crater
// rims...) and turns it into a few instanced meshes: one draw call per shape
// however many things there are. Items are { x, y, z, sx, sy, sz, rot, pitch,
// colour }; see instanced() in geometry.js.

import { MeshLambertMaterial, DoubleSide } from 'three';
import { getShapes, instanced } from './geometry.js';

let markerMaterial = null;
function getMarkerMaterial() {
  if (!markerMaterial) {
    markerMaterial = new MeshLambertMaterial({ color: 0xffffff, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
    markerMaterial.userData.shared = true;
  }
  return markerMaterial;
}

export class Batch {
  constructor() {
    this.walls = []; // boxes, base on the ground (or at y)
    this.roofs = []; // gabled roofs
    this.spires = []; // four-sided cones (church spires, haystacks)
    this.socks = []; // tubes along +z (wind sock segments)
    this.markers = []; // flat white triangles
    this.rims = []; // crater rims
  }

  wall(x, z, w, h, d, rot, colour, y = 0) { this.walls.push({ x, z, y, sx: w, sy: h, sz: d, rot, colour }); }
  roof(x, z, y, w, h, d, rot, colour) { this.roofs.push({ x, z, y, sx: w, sy: h, sz: d, rot, colour }); }
  spire(x, z, y, w, h, rot, colour) { this.spires.push({ x, z, y, sx: w, sy: h, sz: w, rot, colour }); }
  sock(item) { this.socks.push(item); }
  marker(x, z, rot, width, length) { this.markers.push({ x, z, sx: width, sy: 1, sz: length, rot, colour: 0xffffff }); }
  rim(x, z, radius, colour) { this.rims.push({ x, z, sx: radius, sy: 2.2, sz: radius, colour }); }

  // Local offset (ox, oz) of an object yawed by `rot`, in world metres.
  static around(x, z, rot, ox, oz) {
    return [x + ox * Math.cos(rot) + oz * Math.sin(rot), z - ox * Math.sin(rot) + oz * Math.cos(rot)];
  }

  get size() {
    return this.walls.length + this.roofs.length + this.spires.length + this.socks.length + this.markers.length + this.rims.length;
  }

  build() {
    const S = getShapes();
    const out = [];
    const add = (geometry, list, material) => { if (list.length) out.push(instanced(geometry, list, (o) => o, material)); };
    add(S.wall, this.walls);
    add(S.roof, this.roofs);
    add(S.spire, this.spires);
    add(S.tube, this.socks);
    add(S.rim, this.rims);
    add(S.flatTriangle, this.markers, getMarkerMaterial());
    return out;
  }
}
