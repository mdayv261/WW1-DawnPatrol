import { describe, it, expect } from 'vitest';
import { Simulation } from '../src/core/simulation.js';
import { AIRCRAFT } from '../src/aircraft/index.js';
import { Combat } from '../src/game/combat.js';
import { Agent } from '../src/game/agents.js';
import { seededRandom } from '../src/weapons/guns.js';

// The skill levels make a measurable difference in a fight: the same Dr.I flown by a Novice,
// a Regular and an Ace against Camel drones flying a weave and a straight path, from four
// starting positions each (seeded, so repeatable). AI-against-AI duels between pilots who
// both fight back mostly end in long circling fights (a known issue, D56), so the skill test
// uses targets that fly a known path.

function engagement(skill, pattern, seed, maxT = 180) {
  const rng = seededRandom(seed);
  const parked = new Simulation();
  parked.start(AIRCRAFT.camel, 5000);
  parked.diag = { rpm: 1100 };
  parked.crashed = true; // the player is out of this: only the drone and the AI fly
  const combat = new Combat({ rng, dropRange: Infinity });
  combat.reset(AIRCRAFT.camel);
  combat.practice = true;
  const ref = new Simulation();
  ref.start(AIRCRAFT.camel, 1300);
  ref.state.position.set(-600 - 200 * (seed % 3), 1300, 300);
  const drone = new Agent(AIRCRAFT.camel, 'drone', { pattern, rng });
  drone.place(ref.state, 0);
  const ai = new Agent(AIRCRAFT.dr1, skill, { rng });
  ai.placeOnCircuit({ x: 0, z: 0 }, 0);
  combat.agents.push(drone, ai);
  for (let i = 0; i < maxT * 120; i++) {
    combat.step(1 / 120, parked, false);
    if (drone.down || drone.crashed) return { killed: true, t: i / 120, aiCrashed: ai.crashed };
  }
  return { killed: false, t: maxT, aiCrashed: ai.crashed };
}

describe('skill levels in a fight', () => {
  const results = {};
  for (const skill of ['novice', 'regular', 'ace']) {
    results[skill] = [];
    for (const pattern of ['weave', 'straight']) for (const seed of [1, 2, 3, 4]) results[skill].push(engagement(skill, pattern, seed));
  }
  const kills = (s) => results[s].filter((r) => r.killed).length;

  it('an Ace shoots down more targets than a Regular, who shoots down more than a Novice', () => {
    expect(kills('ace')).toBeGreaterThan(kills('regular'));
    expect(kills('regular')).toBeGreaterThan(kills('novice'));
  });

  it('an Ace gets most of them in three minutes; a Novice hardly any', () => {
    expect(kills('ace')).toBeGreaterThanOrEqual(6);
    expect(kills('novice')).toBeLessThanOrEqual(1);
  });

  it('nobody flies into the ground doing it', () => {
    for (const s of Object.keys(results)) for (const r of results[s]) expect(r.aiCrashed).toBe(false);
  });
});

describe('AI against AI', () => {
  it('two pilots who both fight back can fly a three-minute fight without either flying into the ground', () => {
    for (const [a, b, seed] of [['ace', 'novice', 1], ['regular', 'regular', 2]]) {
      const rng = seededRandom(seed);
      const parked = new Simulation();
      parked.start(AIRCRAFT.camel, 5000);
      parked.diag = { rpm: 1100 };
      parked.crashed = true;
      const combat = new Combat({ rng, dropRange: Infinity });
      combat.reset(AIRCRAFT.camel);
      combat.practice = true;
      const A = new Agent(AIRCRAFT.dr1, a, { rng });
      A.placeOnCircuit({ x: 0, z: 0 }, 0);
      const B = new Agent(AIRCRAFT.camel, b, { rng });
      B.placeOnCircuit({ x: 600, z: 0 }, Math.PI);
      combat.agents.push(A, B);
      const states = new Set();
      for (let i = 0; i < 180 * 120 && !(A.down || B.down); i++) {
        combat.step(1 / 120, parked, false);
        states.add(A.brain.state).add(B.brain.state);
      }
      const groundCrash = (x) => x.crashed && !x.down;
      expect(groundCrash(A) || groundCrash(B), `${a} v ${b}`).toBe(false);
      expect(states.has('attack')).toBe(true);
    }
  });
});
