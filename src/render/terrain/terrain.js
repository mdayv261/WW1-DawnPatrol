// Streams the ground around the aircraft in square tiles: close, fine 1 km
// tiles (with trenches, trees and buildings nearby) and coarse 2 km tiles
// farther out. Each tile is built in small stages and only a few milliseconds
// of building are done per frame, so flying never stutters while new ground
// appears. Old tiles are freed. Rendering only; the physics ground is flat.

import { Group, Mesh, PlaneGeometry, MeshLambertMaterial, CanvasTexture, SRGBColorSpace } from 'three';
import { paintTile } from './paint.js';
import * as G from './geometry.js';
import * as F from '../../world/features.js';

const NEAR_SIZE = 1000;
const FAR_SIZE = 2000;

export class Terrain {
  constructor(scene, world, quality, anisotropy = 4) {
    this.world = world;
    this.quality = quality;
    this.anisotropy = anisotropy;
    this.tiles = new Map();
    this.group = new Group();
    scene.add(this.group);
    this.planes = {
      near: new PlaneGeometry(NEAR_SIZE, NEAR_SIZE).rotateX(-Math.PI / 2),
      far: new PlaneGeometry(FAR_SIZE, FAR_SIZE).rotateX(-Math.PI / 2),
    };
    this.cell = null; // camera tile the wanted list was made for
    this.wanted = [];
  }

  setQuality(quality) {
    this.quality = quality;
    this.clear();
  }

  clear() {
    for (const t of this.tiles.values()) this.dropTile(t);
    this.tiles.clear();
    this.cell = null;
  }

  // The tiles that should exist around a camera position.
  plan(x, z) {
    const q = this.quality;
    const cx = Math.floor(x / NEAR_SIZE);
    const cz = Math.floor(z / NEAR_SIZE);
    const wanted = [];
    for (let ix = cx - q.nearRadius; ix <= cx + q.nearRadius; ix++) {
      for (let iz = cz - q.nearRadius; iz <= cz + q.nearRadius; iz++) {
        wanted.push({ key: `n${ix},${iz}`, level: 'near', x0: ix * NEAR_SIZE, z0: iz * NEAR_SIZE, size: NEAR_SIZE, objects: Math.max(Math.abs(ix - cx), Math.abs(iz - cz)) <= q.objectRadius });
      }
    }
    // Coarse tiles, skipping any wholly covered by the close ones.
    const nx0 = (cx - q.nearRadius) * NEAR_SIZE;
    const nx1 = (cx + q.nearRadius + 1) * NEAR_SIZE;
    const nz0 = (cz - q.nearRadius) * NEAR_SIZE;
    const nz1 = (cz + q.nearRadius + 1) * NEAR_SIZE;
    const reach = q.farRadius + FAR_SIZE;
    for (let fx = Math.floor((x - reach) / FAR_SIZE); fx <= Math.floor((x + reach) / FAR_SIZE); fx++) {
      for (let fz = Math.floor((z - reach) / FAR_SIZE); fz <= Math.floor((z + reach) / FAR_SIZE); fz++) {
        const x0 = fx * FAR_SIZE;
        const z0 = fz * FAR_SIZE;
        if (Math.hypot(x0 + FAR_SIZE / 2 - x, z0 + FAR_SIZE / 2 - z) > q.farRadius + FAR_SIZE / 2) continue;
        if (x0 >= nx0 && x0 + FAR_SIZE <= nx1 && z0 >= nz0 && z0 + FAR_SIZE <= nz1) continue;
        wanted.push({ key: `f${fx},${fz}`, level: 'far', x0, z0, size: FAR_SIZE, objects: false });
      }
    }
    return wanted;
  }

  // Create, upgrade and free tiles for a camera at (x, z). Builds for at most
  // budgetMs (but always at least one step).
  update(position, budgetMs = 3) {
    const cellKey = `${Math.floor(position.x / NEAR_SIZE)},${Math.floor(position.z / NEAR_SIZE)}`;
    if (cellKey !== this.cell) {
      this.cell = cellKey;
      this.wanted = this.plan(position.x, position.z);
      const keep = new Set(this.wanted.map((w) => w.key));
      for (const [key, t] of this.tiles) {
        if (!keep.has(key)) {
          // Hysteresis: keep a tile one step beyond the plan until it is far from the camera.
          const d = Math.hypot(t.x0 + t.size / 2 - position.x, t.z0 + t.size / 2 - position.z);
          if (d > (t.level === 'near' ? (this.quality.nearRadius + 1.6) * NEAR_SIZE : this.quality.farRadius + 2.5 * FAR_SIZE)) {
            this.dropTile(t);
            this.tiles.delete(key);
          }
        }
      }
      for (const w of this.wanted) {
        const t = this.tiles.get(w.key);
        if (!t) this.tiles.set(w.key, { ...w, group: new Group(), stage: 0, stages: [], built: new Set() });
        else if (!w.objects && t.objects) this.dropObjects(t, w);
        else if (w.objects && !t.objects) t.objects = true;
      }
    }
    const start = performance.now();
    let first = true;
    for (;;) {
      const job = this.nextJob(position);
      if (!job) return;
      if (!first && performance.now() - start > budgetMs) return;
      first = false;
      this.build(job.tile, job.stage);
    }
  }

  // Build everything near a position straight away (at the start of a flight).
  prime(position) {
    this.update(position, 0);
    for (;;) {
      const job = this.nextJob(position, 1600);
      if (!job) return;
      this.build(job.tile, job.stage);
    }
  }

  // The most urgent piece of building work, or null.
  nextJob(position, within = Infinity) {
    let best = null;
    for (const t of this.tiles.values()) {
      const stage = !t.built.has('ground') ? 'ground' : t.objects ? ['trenches', 'trees', 'buildings'].find((s) => !t.built.has(s)) : null;
      if (!stage) continue;
      const d = Math.hypot(t.x0 + t.size / 2 - position.x, t.z0 + t.size / 2 - position.z);
      if (d > within) continue;
      const score = d + (stage === 'ground' ? 0 : 1200);
      if (!best || score < best.score) best = { tile: t, stage, score };
    }
    return best;
  }

  build(tile, stage) {
    tile.built.add(stage);
    const { x0, z0, size } = tile;
    const x1 = x0 + size;
    const z1 = z0 + size;
    const q = this.quality;
    if (stage === 'ground') {
      const pixels = tile.level === 'near' ? q.nearTexture : q.farTexture;
      const canvas = document.createElement('canvas');
      canvas.width = pixels;
      canvas.height = pixels;
      paintTile(canvas.getContext('2d'), this.world, { x0, z0, size }, pixels, tile.level === 'near');
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = this.anisotropy;
      const offset = tile.level === 'near' ? -2 : -1; // near tiles draw over far ones, both over the fallback ground
      const mesh = new Mesh(this.planes[tile.level], new MeshLambertMaterial({ map: texture, polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset }));
      mesh.position.set(x0 + size / 2, 0, z0 + size / 2);
      tile.group.add(mesh);
      this.group.add(tile.group);
    } else if (stage === 'trenches') {
      const trench = G.trenchMesh(F.trenches(this.world, x0, z0, x1, z1));
      const wire = G.wireLines(F.wire(this.world, x0, z0, x1, z1));
      for (const o of [trench, wire]) if (o) { o.userData.objects = true; tile.group.add(o); }
    } else if (stage === 'trees') {
      const list = [...F.trees(this.world, x0, z0, x1, z1, q.treeSpacing), ...F.roadTrees(this.world, x0, z0, x1, z1)];
      for (const m of G.treeMeshes(list)) { m.userData.objects = true; tile.group.add(m); }
    } else if (stage === 'buildings') {
      const items = [];
      for (const v of this.world.villages(x0, z0, x1, z1)) items.push(...F.houses(this.world, v));
      const a = this.world.airfield;
      if (a.x - a.halfX < x1 && a.x + a.halfX > x0 && a.z - a.halfZ < z1 && a.z + a.halfZ > z0) items.push(...F.airfieldBuildings(this.world));
      const bridges = F.bridges(this.world, this.world.roads(x0, z0, x1, z1)).filter((b) => b.x >= x0 && b.x < x1 && b.z >= z0 && b.z < z1);
      for (const m of G.buildingMeshes(items, bridges)) { m.userData.objects = true; tile.group.add(m); }
    }
  }

  // Remove a tile's trees, buildings and trenches but keep its ground.
  dropObjects(tile, wanted) {
    for (const child of [...tile.group.children]) {
      if (child.userData.objects) {
        tile.group.remove(child);
        G.disposeObject(child);
      }
    }
    for (const s of ['trenches', 'trees', 'buildings']) tile.built.delete(s);
    tile.objects = wanted.objects;
  }

  dropTile(tile) {
    this.group.remove(tile.group);
    G.disposeObject(tile.group);
  }

  stats() {
    let pending = 0;
    let objects = 0;
    for (const t of this.tiles.values()) {
      if (!t.built.has('ground')) pending++;
      else if (t.objects) pending += ['trenches', 'trees', 'buildings'].filter((s) => !t.built.has(s)).length;
      t.group.traverse((o) => { if (o.userData.objects) objects++; });
    }
    return { tiles: this.tiles.size, pending, objects };
  }
}
