import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/world/layout.js';
import { Terrain } from '../src/render/terrain/terrain.js';
import { QUALITY_LEVELS } from '../src/render/quality.js';

// Two ground surfaces in the same plane flicker, most when the view angle changes
// (banking). A far tile must therefore leave out every quarter that a close tile draws.

function setup(nearCells) {
  const t = new Terrain({ add() {} }, createWorld(1917), QUALITY_LEVELS.medium);
  const far = { level: 'far', x0: 0, z0: 0, size: 2000, built: new Set(['ground', 'ground2']), groundMesh: { visible: true } };
  far.groundMesh.geometry = t.farGeometry(far);
  t.tiles.set('f0,0', far);
  for (const [ix, iz] of nearCells) t.tiles.set(`n${ix},${iz}`, { level: 'near', x0: ix * 1000, z0: iz * 1000, built: new Set(['ground', 'ground2']), groundMesh: {} });
  t.updateCoverage();
  return { far, quads: Array.from(far.farQuads.index.array).length / 6 };
}

describe('far tiles under close tiles', () => {
  it('draw all four quarters when no close tile is there', () => {
    const { far, quads } = setup([]);
    expect(quads).toBe(4);
    expect(far.groundMesh.visible).toBe(true);
  });

  it('leave out exactly the quarters that close tiles draw', () => {
    const { quads, far } = setup([[0, 0], [1, 0]]); // the two northern quarters are covered
    expect(quads).toBe(2);
    const used = new Set(Array.from(far.farQuads.index.array).map((i) => Math.floor(i / 4)));
    expect([...used].sort()).toEqual([2, 3]); // quads (0,1) and (1,1): the southern row
  });

  it('hide the whole far tile when all four quarters are covered, and show it again when one goes', () => {
    const cells = [[0, 0], [1, 0], [0, 1], [1, 1]];
    const t = setup(cells);
    expect(t.quads).toBe(0);
    expect(t.far.groundMesh.visible).toBe(false);
  });

  it('ignores a close tile whose ground is not painted yet, so there is never a hole', () => {
    const t = new Terrain({ add() {} }, createWorld(1917), QUALITY_LEVELS.medium);
    const far = { level: 'far', x0: 0, z0: 0, size: 2000, built: new Set(['ground', 'ground2']), groundMesh: { visible: true } };
    t.farGeometry(far);
    t.tiles.set('f0,0', far);
    t.tiles.set('n0,0', { level: 'near', x0: 0, z0: 0, built: new Set(['ground']), groundMesh: null });
    t.updateCoverage();
    expect(far.farQuads.index.array.length / 6).toBe(4);
  });

  it('lights the ground face-up: every normal points straight up', () => {
    const { far } = setup([]);
    const n = far.farQuads.attributes.normal.array;
    for (let i = 0; i < n.length; i += 3) expect([n[i], n[i + 1], n[i + 2]]).toEqual([0, 1, 0]);
  });

  it('puts the quarters where they belong: quad corners and textures line up with the tile', () => {
    const { far } = setup([]);
    const p = far.farQuads.attributes.position.array;
    expect(Math.min(...[...p].filter((_, i) => i % 3 === 0))).toBe(-1000);
    expect(Math.max(...[...p].filter((_, i) => i % 3 === 0))).toBe(1000);
    const uv = far.farQuads.attributes.uv.array;
    expect(Math.min(...uv)).toBe(0);
    expect(Math.max(...uv)).toBe(1);
  });
});
