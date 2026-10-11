// Streams the ground around the aircraft in square tiles: close, fine 1 km
// tiles (with trenches, trees and buildings nearby) and coarse 2 km tiles
// farther out. Each tile is built in small stages and only a few milliseconds
// of building are done per frame, so flying never stutters while new ground
// appears. Old tiles are freed. Rendering only; the physics ground is flat.

import { Group, Mesh, PlaneGeometry, BufferGeometry, Float32BufferAttribute, CanvasTexture, SRGBColorSpace } from 'three';
import { groundMaterial } from './grain.js';
import { paintTile } from './paint.js';
import * as G from './geometry.js';
import { addBuildings } from './geometry.js';
import * as F from '../../world/features.js';
import { warworks, rubble } from '../../world/warworks.js';
import { tileTrees } from '../../world/obstacles.js';
import { SolidIndex, structureLists, solidsFromStructures, treeSolid } from '../../world/solids.js';
import { Batch } from './batch.js';
import { addAirfield } from './airfieldGeometry.js';
import { addFarmExtras, addWarWorks } from './structures.js';

// The build stages of a tile's objects, in order (the ground comes first).
const OBJECT_STAGES = ['trenches', 'trees', 'structures'];
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
    this.solids = new SolidIndex(); // what can be crashed into: the trees and buildings drawn here
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
        const ring = Math.max(Math.abs(ix - cx), Math.abs(iz - cz));
        wanted.push({ key: `n${ix},${iz}`, level: 'near', x0: ix * NEAR_SIZE, z0: iz * NEAR_SIZE, size: NEAR_SIZE, ring, objects: ring <= q.objectRadius });
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
        else {
          if (!w.objects && t.objects) this.dropObjects(t, w);
          else if (w.objects && !t.objects) t.objects = true;
          t.ring = w.ring;
          this.regrade(t, w.ring);
        }
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

  // A far (2 km) tile's ground as four 1 km quads sharing its texture, so any quad that a
  // close tile already covers can be left out: two surfaces in the same plane would
  // flicker where the depth buffer cannot tell them apart.
  farGeometry(tile) {
    const g = new BufferGeometry();
    const pos = [];
    const uv = [];
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        const [xa, xb, za, zb] = [(i - 1) * 1000, i * 1000, (j - 1) * 1000, j * 1000];
        pos.push(xa, 0, za, xa, 0, zb, xb, 0, zb, xb, 0, za);
        const [ua, ub, va, vb] = [i * 0.5, (i + 1) * 0.5, 1 - (j + 1) * 0.5, 1 - j * 0.5]; // image row 0 is north
        uv.push(ua, vb, ua, va, ub, va, ub, vb);
      }
    }
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new Float32BufferAttribute(new Array(16).fill([0, 1, 0]).flat(), 3)); // flat ground faces straight up
    tile.farQuads = g;
    return g;
  }

  // Hide the quads of far tiles that close tiles already draw (and show them again when those go).
  updateCoverage() {
    for (const tile of this.tiles.values()) {
      if (tile.level !== 'far' || !tile.farQuads) continue;
      const index = [];
      for (let j = 0; j < 2; j++) {
        for (let i = 0; i < 2; i++) {
          const ix = Math.floor(tile.x0 / NEAR_SIZE) + i;
          const iz = Math.floor(tile.z0 / NEAR_SIZE) + j;
          const near = this.tiles.get(`n${ix},${iz}`);
          if (near?.built.has('ground2') && near.groundMesh) continue;
          const base = (j * 2 + i) * 4;
          index.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
      }
      tile.farQuads.setIndex(index);
      tile.groundMesh.visible = index.length > 0;
    }
  }

  // Texture size a tile should have: sharper for the 3x3 tiles around the camera
  // (kept until the camera is 3 tiles away, so crossing a boundary does not repaint back and forth).
  pixelsFor(tile, ring) {
    const q = this.quality;
    if (tile.level === 'far') return q.farTexture;
    const sharp = ring <= 1 || (tile.pixels === q.innerTexture && ring <= 2);
    return sharp ? q.innerTexture : q.nearTexture;
  }

  // Repaint a tile's ground at a new texture size if it should change.
  regrade(tile, ring) {
    if (!tile.built.has('ground2')) return; // not painted yet: it will use the right size
    const want = this.pixelsFor(tile, ring ?? 9);
    if (want !== tile.pixels) {
      tile.wantPixels = want;
      tile.built.delete('ground');
      tile.built.delete('ground2');
    }
  }

  // The most urgent piece of building work, or null.
  nextJob(position, within = Infinity) {
    let best = null;
    for (const t of this.tiles.values()) {
      const stage = !t.built.has('ground') ? 'ground' : !t.built.has('ground2') ? 'ground2' : t.objects ? OBJECT_STAGES.find((s) => !t.built.has(s)) : null;
      if (!stage) continue;
      const d = Math.hypot(t.x0 + t.size / 2 - position.x, t.z0 + t.size / 2 - position.z);
      if (d > within) continue;
      const score = d + (stage === 'ground' || stage === 'ground2' ? 0 : 1200);
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
      // First half of the painting: the land, fields, woods and the front.
      const pixels = tile.wantPixels ?? this.pixelsFor(tile, tile.ring);
      tile.canvas = document.createElement('canvas');
      tile.canvas.width = pixels;
      tile.canvas.height = pixels;
      tile.pixels = pixels;
      tile.wantPixels = null;
      paintTile(tile.canvas.getContext('2d'), this.world, { x0, z0, size }, pixels, tile.level === 'near', 1);
    } else if (stage === 'ground2') {
      // Second half: river, roads, trenches, craters; then the texture goes on the ground.
      paintTile(tile.canvas.getContext('2d'), this.world, { x0, z0, size }, tile.pixels, tile.level === 'near', 2);
      const texture = new CanvasTexture(tile.canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = this.anisotropy;
      tile.canvas = null;
      if (tile.groundMesh) {
        tile.groundMesh.material.map?.dispose();
        tile.groundMesh.material.map = texture;
        tile.groundMesh.material.needsUpdate = true;
      } else {
        const offset = tile.level === 'near' ? -2 : -1;
        const geometry = tile.level === 'far' ? this.farGeometry(tile) : this.planes.near;
        const mesh = new Mesh(geometry, groundMaterial(texture, offset));
        mesh.position.set(x0 + size / 2, 0, z0 + size / 2);
        tile.groundMesh = mesh;
        tile.group.add(mesh);
        this.group.add(tile.group);
      }
      this.updateCoverage();
    } else if (stage === 'trenches') {
      const trench = G.trenchMesh(F.trenches(this.world, x0, z0, x1, z1));
      const wire = G.wireLines(F.wire(this.world, x0, z0, x1, z1));
      for (const o of [trench, wire]) if (o) { o.userData.objects = true; tile.group.add(o); }
    } else if (stage === 'trees') {
      const list = tileTrees(this.world, x0, z0, x1, z1, q.treeSpacing); // none in buildings or round hangars
      for (const m of G.treeMeshes(list)) { m.userData.objects = true; tile.group.add(m); }
      for (const t of list) this.solids.add(`${tile.key}:trees`, treeSolid(t));
    } else if (stage === 'structures') {
      // Everything built or left standing: village houses, farms, mills, airfields, war works, rubble.
      const batch = new Batch();
      const world = this.world;
      const lists = structureLists(world, x0, z0, x1, z1);
      const bridges = F.bridges(world, world.roads(x0, z0, x1, z1)).filter((b) => b.x >= x0 && b.x < x1 && b.z >= z0 && b.z < z1);
      addBuildings(batch, [...lists.houses, ...lists.farms.flatMap((f) => f.buildings)], bridges);
      addFarmExtras(batch, lists.farms, lists.windmills);
      addWarWorks(batch, warworks(world, x0, z0, x1, z1), lists.villages.map((v) => rubble(world, v)));
      for (const parts of lists.airfields) addAirfield(batch, parts);
      for (const m of batch.build()) { m.userData.objects = true; tile.group.add(m); }
      for (const s of solidsFromStructures(lists)) this.solids.add(`${tile.key}:structures`, s); // so they can be crashed into
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
    for (const s of OBJECT_STAGES) tile.built.delete(s);
    this.solids.remove(`${tile.key}:trees`);
    this.solids.remove(`${tile.key}:structures`);
    tile.objects = wanted.objects;
  }

  dropTile(tile) {
    this.solids.remove(`${tile.key}:trees`);
    this.solids.remove(`${tile.key}:structures`);
    this.group.remove(tile.group);
    G.disposeObject(tile.group);
    if (tile.level === 'near' && this.tiles.size) setTimeout(() => this.updateCoverage(), 0);
  }

  stats() {
    let pending = 0;
    let objects = 0;
    for (const t of this.tiles.values()) {
      if (!t.built.has('ground') || !t.built.has('ground2')) pending += (t.built.has('ground') ? 0 : 1) + (t.built.has('ground2') ? 0 : 1);
      else if (t.objects) pending += OBJECT_STAGES.filter((s) => !t.built.has(s)).length;
      t.group.traverse((o) => { if (o.userData.objects) objects++; });
    }
    return { tiles: this.tiles.size, pending, objects };
  }
}
