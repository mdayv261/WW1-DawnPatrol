// The trees and buildings everyone in a match can crash into: the same on the room server and
// in every browser, whatever each player's graphics quality (the drawn woods are thicker on
// High and thinner on Low; the solid ones are always Medium's). Built in 1 km tiles the first
// time something low comes near, exactly as the terrain builds its own (src/render/terrain).

import { tileTrees } from '../world/obstacles.js';
import { SolidIndex, structureLists, solidsFromStructures, treeSolid } from '../world/solids.js';
import { SOLIDS } from './netConfig.js';

export class WorldSolids {
  constructor(world, { tile = SOLIDS.tile, treeSpacing = SOLIDS.treeSpacing, maxHeight = SOLIDS.maxHeight, border = SOLIDS.border } = {}) {
    this.world = world;
    this.tile = tile;
    this.treeSpacing = treeSpacing;
    this.maxHeight = maxHeight;
    this.border = border;
    this.index = new SolidIndex();
    this.built = new Set();
  }

  // The label of what is at (x, y, z) ("Hit a tree"), or null.
  hit(x, y, z) {
    if (y > this.maxHeight) return null; // nothing stands this tall
    this.around(x, z);
    return this.index.hit(x, y, z);
  }

  // Build the tile under (x, z), and its neighbour too when that close to its edge (a tree
  // there can reach across).
  around(x, z) {
    const t = this.tile;
    const i = Math.floor(x / t);
    const j = Math.floor(z / t);
    const fx = x / t - i;
    const fz = z / t - j;
    const e = this.border / t;
    const di = fx < e ? -1 : fx > 1 - e ? 1 : 0;
    const dj = fz < e ? -1 : fz > 1 - e ? 1 : 0;
    this.build(i, j);
    if (di) this.build(i + di, j);
    if (dj) this.build(i, j + dj);
    if (di && dj) this.build(i + di, j + dj);
  }

  build(i, j) {
    const key = `${i},${j}`;
    if (this.built.has(key)) return;
    this.built.add(key);
    const t = this.tile;
    const [x0, z0, x1, z1] = [i * t, j * t, (i + 1) * t, (j + 1) * t];
    for (const tree of tileTrees(this.world, x0, z0, x1, z1, this.treeSpacing)) this.index.add(key, treeSolid(tree));
    for (const s of solidsFromStructures(structureLists(this.world, x0, z0, x1, z1))) this.index.add(key, s);
  }
}
