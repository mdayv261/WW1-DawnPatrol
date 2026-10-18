import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { Simulation } from '../src/core/simulation.js';
import { AIRCRAFT } from '../src/aircraft/index.js';
import { Agent } from '../src/game/agents.js';
import { Combat } from '../src/game/combat.js';
import { seededRandom } from '../src/weapons/guns.js';

// Early War AI pilots fight under the same physics and controls as the player: the Nieuport 11
// with its over-wing Lewis and drum changes, the Fokker E.IV with its wing warping and all-moving
// tail. They must fly under control, shoot, change drums, and keep within their structure.

const DT = 1 / 120;

function aiAt(ac, skill, pos, seed = 3) {
  const a = new Agent(ac, skill, { rng: seededRandom(seed) });
  a.placeOnCircuit({ x: pos.x + 1500, z: pos.z }, Math.PI); // on the circuit's west point it flies north
  a.state.position.copy(pos);
  a.sim.previous.position.copy(pos);
  return a;
}

// A "player" flying straight north at its trimmed setting.
function straightPlayer(ac, pos) {
  const sim = new Simulation();
  const input = sim.start(ac, pos.y);
  sim.state.position.copy(pos);
  sim.previous.position.copy(pos);
  return { sim, input };
}

function fight(agents, player, seconds, onStep = () => {}) {
  const combat = new Combat({ rng: seededRandom(5), dropRange: Infinity });
  combat.reset(player.sim.aircraft);
  combat.practice = true; // the player cannot be shot down, so the fight runs its length
  combat.agents.push(...agents);
  for (let i = 0; i < seconds / DT; i++) {
    player.sim.step(DT, player.input);
    combat.step(DT, player.sim, false);
    onStep(combat);
  }
  return combat;
}

describe('Early War AI pilots', () => {
  it('an AI Nieuport attacks an E.IV: fires its Lewis, hits, changes its drum, and keeps its lower wing on', () => {
    const player = straightPlayer(AIRCRAFT.e4, new Vector3(0, 1500, 0));
    const ai = aiAt(AIRCRAFT.n11, 'ace', new Vector3(0, 1500, 900));
    ai.gunBank.guns[0].rounds = 20; // a part-used drum, so it runs out in the fight
    let fired = 0;
    let changed = false;
    const combat = fight([ai], player, 120, () => {
      if (ai.fire) fired++;
      if (ai.gunBank.guns[0].state === 'changing') changed = true;
    });
    expect(fired).toBeGreaterThan(0);
    expect(combat.hitsOnPlayer, 'hits').toBeGreaterThan(0); // (practice mode: counted, but the player is not hurt)
    expect(changed, 'changed a drum').toBe(true);
    expect(ai.crashed).toBe(false);
    expect(ai.sim.damage.lowerFailed.L || ai.sim.damage.lowerFailed.R).toBe(false);
  });

  it('an AI E.IV attacks a Nieuport: fires its twin guns, hits, and flies under control', () => {
    const player = straightPlayer(AIRCRAFT.n11, new Vector3(0, 1500, 0));
    const ai = aiAt(AIRCRAFT.e4, 'ace', new Vector3(0, 1500, 900));
    let fired = 0;
    const combat = fight([ai], player, 120, () => { if (ai.fire) fired++; });
    expect(fired).toBeGreaterThan(0);
    expect(combat.hitsOnPlayer, 'hits').toBeGreaterThan(0);
    expect(ai.crashed).toBe(false);
    expect(ai.sim.damage.failed.L || ai.sim.damage.failed.R).toBe(false);
  });

  it('an AI Nieuport and an AI E.IV fight each other for three minutes without flying into the ground or breaking up', () => {
    const player = straightPlayer(AIRCRAFT.n11, new Vector3(0, 3500, -20000)); // far away, out of the fight
    const n11 = aiAt(AIRCRAFT.n11, 'regular', new Vector3(0, 1500, 0), 7);
    const e4 = aiAt(AIRCRAFT.e4, 'regular', new Vector3(300, 1500, 800), 9);
    let shots = 0;
    fight([n11, e4], player, 180, () => { if (n11.fire || e4.fire) shots++; });
    expect(shots).toBeGreaterThan(0);
    for (const a of [n11, e4]) {
      // Either still flying, or brought down by the other's bullets: never by its own flying.
      if (a.crashed) expect(a.down, `${a.aircraft.name}: ${a.reason}`).toBe(true);
      expect(a.sim.damage.overload, `${a.aircraft.name} load`).toBeLessThan(a.aircraft.structure.ultimateLoad);
    }
  });
});
