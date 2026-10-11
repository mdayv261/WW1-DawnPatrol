import { describe, it, expect } from 'vitest';
import { Simulation } from '../src/core/simulation.js';
import { AIRCRAFT_LIST } from '../src/aircraft/index.js';
import { createWorld } from '../src/world/layout.js';
import { tileTrees } from '../src/world/obstacles.js';
import {
  SolidIndex, treeSolid, buildingSolid, hangarSolid, windsockSolid, structureLists, solidsFromStructures,
} from '../src/world/solids.js';

// Flying real aircraft into trees and buildings: the whole chain (hit points, simulation
// hook, solid shapes). The aircraft flies level from `distance` metres short of the target.

const DT = 1 / 120;
const APPROACH = 120; // m

function indexOf(...solids) {
  const index = new SolidIndex();
  solids.forEach((s, i) => index.add(`s${i}`, s));
  return index;
}

// Fly level at height `y` along its own heading toward (tx, tz) (shifted sideways by `lateral`),
// past it. Returns { sim, dir } where dir is the unit flight direction.
function pass(ac, index, { tx, tz, y, lateral = 0, seconds = 6 }) {
  const sim = new Simulation();
  sim.start(ac, y);
  const v = sim.state.velocity;
  const speed = Math.hypot(v.x, v.z);
  const dir = { x: v.x / speed, z: v.z / speed };
  // sideways direction = the model's local +X for a yaw whose +Z is `dir`
  const side = { x: dir.z, z: -dir.x };
  sim.state.position.set(tx - dir.x * APPROACH + side.x * lateral, y, tz - dir.z * APPROACH + side.z * lateral);
  sim.previous.position.copy(sim.state.position);
  sim.solidAt = (x, yy, z) => index.hit(x, yy, z);
  for (let i = 0; i < seconds / DT && !sim.crashed; i++) sim.step(DT, sim.startInput);
  return { sim, dir, side };
}

// A building turned so its length runs along the flight direction.
const aligned = (dir) => Math.atan2(dir.x, dir.z);

describe('flying into trees', () => {
  const tree = { x: 3000, z: -3000, h: 14, r: 4, kind: 'conifer' };
  for (const ac of AIRCRAFT_LIST) {
    it(`${ac.name}: crashes into a tree and says so; flies clear over its top`, () => {
      const index = indexOf(treeSolid(tree));
      const hit = pass(ac, index, { tx: tree.x, tz: tree.z, y: 6 });
      expect(hit.sim.crashed).toBe(true);
      expect(hit.sim.crashReason).toBe('Hit a tree');
      const over = pass(ac, index, { tx: tree.x, tz: tree.z, y: 40 });
      expect(over.sim.crashed).toBe(false);
    });

    it(`${ac.name}: passes a tree 12 m to the side`, () => {
      const index = indexOf(treeSolid(tree));
      expect(pass(ac, index, { tx: tree.x, tz: tree.z, y: 6, lateral: 12 }).sim.crashed).toBe(false);
    });
  }
});

describe('flying into buildings', () => {
  for (const ac of AIRCRAFT_LIST) {
    describe(ac.name, () => {
      it('crashes into a house wall, flies over the roof with clearance, passes beside it', () => {
        const probe = pass(ac, indexOf(), { tx: 0, tz: 0, y: 3, seconds: 0.01 });
        const house = { type: 'house', x: -2500, z: 2500, w: 10, d: 8, h: 5, rot: aligned(probe.dir), ruined: false };
        const index = indexOf(buildingSolid(house));
        const wall = pass(ac, index, { tx: house.x, tz: house.z, y: 3 });
        expect(wall.sim.crashed).toBe(true);
        expect(wall.sim.crashReason).toBe('Hit a house');
        expect(pass(ac, index, { tx: house.x, tz: house.z, y: 25 }).sim.crashed).toBe(false);
        expect(pass(ac, index, { tx: house.x, tz: house.z, y: 3, lateral: 15 }).sim.crashed).toBe(false);
      });

      it('a wing tip alone clipping a hangar crashes; clearing it by a metre does not', () => {
        const probe = pass(ac, indexOf(), { tx: 0, tz: 0, y: 3, seconds: 0.01 });
        const hangar = { x: 2500, z: 2500, w: 20, d: 28, h: 9, rot: aligned(probe.dir) };
        const index = indexOf(hangarSolid(hangar));
        const halfSpan = Math.max(...ac.wingStack.map((w) => w.span)) / 2;
        const edge = hangar.w / 2; // the hangar's side wall is this far from its centre line
        // Fuselage 0.6 m outside the wall, so only a wing tip reaches into it.
        const clip = pass(ac, index, { tx: hangar.x, tz: hangar.z, y: 3, lateral: edge + 0.6 });
        expect(clip.sim.crashed).toBe(true);
        expect(clip.sim.crashReason).toBe('Hit a hangar');
        const clear = pass(ac, index, { tx: hangar.x, tz: hangar.z, y: 3, lateral: edge + halfSpan + 1 });
        expect(clear.sim.crashed).toBe(false);
      });
    });
  }

  it('the thin wind sock pole is not missed at full flying speed', () => {
    for (const ac of AIRCRAFT_LIST) {
      const index = indexOf(windsockSolid({ x: 1500, z: 1500, height: 16.8 }));
      const hit = pass(ac, index, { tx: 1500, tz: 1500, y: 9 });
      expect(hit.sim.crashReason, ac.name).toBe('Hit the wind sock pole');
    }
  });
});

describe('with the real world', () => {
  const world = createWorld(1917);
  const index = new SolidIndex();
  const tilesAround = (cx, cz) => {
    const out = [];
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) out.push([Math.floor(cx / 1000) * 1000 + i * 1000, Math.floor(cz / 1000) * 1000 + j * 1000]);
    return out;
  };
  const load = (cx, cz) => {
    for (const [x0, z0] of tilesAround(cx, cz)) {
      for (const t of tileTrees(world, x0, z0, x0 + 1000, z0 + 1000, 14)) index.add(`${x0},${z0}:t:${t.x},${t.z}`, treeSolid(t));
      for (const s of solidsFromStructures(structureLists(world, x0, z0, x0 + 1000, z0 + 1000))) index.add(`${x0},${z0}:s:${s.x},${s.z}`, s);
    }
  };

  it('a drawn tree and a drawn village house both crash the aircraft', () => {
    const ac = AIRCRAFT_LIST[0];
    const v = world.village(0, 0);
    load(v.x, v.z);
    const lists = structureLists(world, Math.floor(v.x / 1000) * 1000, Math.floor(v.z / 1000) * 1000, Math.floor(v.x / 1000) * 1000 + 1000, Math.floor(v.z / 1000) * 1000 + 1000);
    const house = lists.houses.find((b) => b.type === 'house' && !b.ruined && b.h >= 4);
    expect(house).toBeTruthy();
    const r = pass(ac, index, { tx: house.x, tz: house.z, y: Math.max(2.8, house.h * 0.5) });
    expect(r.sim.crashed).toBe(true);
    expect(r.sim.crashReason).toMatch(/^Hit (a|the) /);
    expect(r.sim.crashReason).not.toBe('Hit the ground');

    const [x0, z0] = [Math.floor(v.x / 1000) * 1000, Math.floor(v.z / 1000) * 1000];
    const tree = tileTrees(world, x0, z0, x0 + 1000, z0 + 1000, 14).find((t) => t.kind === 'conifer' && t.h > 8);
    if (tree) {
      const t = pass(ac, index, { tx: tree.x, tz: tree.z, y: Math.max(2.8, tree.h * 0.5) });
      expect(t.sim.crashed).toBe(true);
      expect(t.sim.crashReason).toMatch(/^Hit (a|the) /);
    }
  });

  // On the start field the obstacles must never change what happens: run the same flight with
  // and without the hook and compare.
  function sameWithAndWithout(ac, setup, seconds) {
    const runs = [false, true].map((hook) => {
      const sim = new Simulation();
      const input = setup(sim, ac);
      sim.solidAt = hook ? (x, y, z) => index.hit(x, y, z) : null;
      for (let i = 0; i < seconds / DT && !sim.crashed; i++) sim.step(DT, input);
      return sim;
    });
    return runs;
  }

  for (const ac of AIRCRAFT_LIST) {
    it(`${ac.name}: a take-off run on the start field is not stopped by any tree or building`, () => {
      load(0, 0);
      const [without, withHook] = sameWithAndWithout(ac, (sim) => {
        const input = sim.startOnGround(ac);
        input.throttle = 1;
        return input;
      }, 12);
      expect(withHook.crashed).toBe(without.crashed);
      expect(withHook.crashReason).toBe(without.crashReason);
      expect(withHook.state.position.distanceTo(without.state.position)).toBeLessThan(1e-9);
      expect(withHook.state.position.z).toBeLessThan(-10); // it did run up the field (north is -Z); hands-off, it may veer off by itself, with or without the hook
    });

    it(`${ac.name}: a low pass up the start field's landing ground (3 m up) hits nothing`, () => {
      load(0, 0);
      const [without, withHook] = sameWithAndWithout(ac, (sim) => {
        const input = sim.start(ac, 3);
        sim.state.position.set(0, 3, 500); // just inside the south end of the landing ground, flying north
        sim.previous.position.copy(sim.state.position);
        return input;
      }, 20);
      expect(withHook.crashed).toBe(without.crashed);
      expect(withHook.crashReason).toBe(without.crashReason);
      expect(withHook.state.position.z).toBeLessThan(-200); // it flew most of the length (hands-off it eventually touches down)
    });
  }
});
