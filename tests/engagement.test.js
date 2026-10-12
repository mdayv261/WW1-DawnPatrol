import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { Simulation } from '../src/core/simulation.js';
import { AIRCRAFT_LIST } from '../src/aircraft/index.js';
import { Combat } from '../src/game/combat.js';
import { seededRandom } from '../src/weapons/guns.js';
import { attitude } from '../src/dev/flightScenarios.js';

// An end-to-end fight: a scripted pilot flies the real flight model up behind a target,
// puts the gun sight on it and fires. Guns, ballistics, hit boxes, damage and the target's
// own flying all have to work together for the target to be shot down.

const DT = 1 / 120;
const clamp = (v, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, v));

function fight(player, seed) {
  const sim = new Simulation();
  const base = sim.start(player, 1000);
  const combat = new Combat({ rng: seededRandom(seed) });
  combat.reset(player);
  combat.skill = 'drone'; // a target that flies straight on
  const target = combat.spawnAgent(sim); // the first target flies straight
  const e = new Vector3();
  let downAt = null;
  for (let i = 0; i < 120 * 90 && !sim.crashed; i++) {
    const s = sim.state;
    const a = attitude(s);
    // Where the target is compared with where bullets will land, in the aircraft's own axes.
    e.copy(target.state.position).sub(combat.sightPoint(sim)).applyQuaternion(s.quaternion.clone().invert());
    const dist = Math.max(50, target.state.position.distanceTo(s.position));
    const up = e.y / dist;
    const right = e.z / dist;
    const input = { ...base, throttle: dist > 260 ? 1 : 0.75 };
    input.pull = clamp(6 * up);
    input.roll = clamp(2.5 * (clamp(right * 8, -0.5, 0.5) - a.bank) - 0.8 * s.angularVelocity.x);
    input.yaw = clamp(3 * (sim.diag ? sim.diag.beta : 0) + 4 * right);
    input.fire = Math.hypot(e.y, e.z) < 4 && dist < 320;
    sim.step(DT, input);
    combat.step(DT, sim, input.fire);
    if (target.down && downAt === null) downAt = i * DT;
    if (downAt !== null && i * DT > downAt + 0.2) break;
  }
  return { sim, combat, target, downAt };
}

describe('shooting down a target aircraft', () => {
  for (const player of AIRCRAFT_LIST) {
    it(`${player.name}: catches a slower enemy, gets on its tail and shoots it down within 60 s`, () => {
      const r = fight(player, 4);
      expect(r.sim.crashed, `${player.name} crashed: ${r.sim.crashReason}`).toBe(false);
      expect(r.target.aircraft.side).not.toBe(player.side);
      expect(r.downAt, 'never shot down').not.toBeNull();
      expect(r.downAt).toBeLessThan(60);
      expect(r.combat.kills).toBe(1);
      expect(r.combat.messages[0]).toMatch(/^SHOT DOWN: .* \((Pilot killed|Wing failed|Engine seized|Tailplane failed)\)$/);
      // It fired in bursts, not all its ammunition, and a fair share of its rounds hit.
      expect(r.combat.shotsFired).toBeGreaterThan(10);
      expect(r.combat.shotsFired).toBeLessThan(2 * player.guns.rounds);
      expect(r.combat.hitsOnTargets).toBeGreaterThan(8);
      expect(r.combat.hitsOnTargets / r.combat.shotsFired).toBeGreaterThan(0.1);
    });
  }
});
