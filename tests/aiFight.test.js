import { describe, it, expect } from 'vitest';
import { Vector3, Quaternion } from 'three';
import { Simulation } from '../src/core/simulation.js';
import { AIRCRAFT } from '../src/aircraft/index.js';
import { SKILLS, COMBAT } from '../src/aircraft/aiData.js';
import { Agent } from '../src/game/agents.js';
import { Combat } from '../src/game/combat.js';
import { damageScore } from '../src/ai/brain.js';
import { createDamage } from '../src/physics/damage.js';
import { seededRandom } from '../src/weapons/guns.js';
import { attitude } from '../src/dev/flightScenarios.js';

// AI pilots in a fight: engage, attack, evade, disengage, and shooting at the player.

const DT = 1 / 120;

// An AI agent flying north at `pos`, at its attack speed.
function aiAt(ac, skill, pos, rng = seededRandom(3)) {
  const a = new Agent(ac, skill, { rng });
  a.placeOnCircuit({ x: pos.x + 1500, z: pos.z }, Math.PI); // on the circuit's west point the agent flies north
  a.state.position.copy(pos);
  a.sim.previous.position.copy(pos);
  return a;
}

// The player: a Camel flying straight north at `pos` (its controls left at the trimmed setting).
function playerAt(pos) {
  const sim = new Simulation();
  const input = sim.start(AIRCRAFT.camel, pos.y);
  sim.state.position.copy(pos);
  sim.previous.position.copy(pos);
  return { sim, input };
}

function fight(agents, player, seconds, { practice = false, seed = 1, rng = null, onStep = () => {} } = {}) {
  const combat = new Combat({ rng: rng ?? seededRandom(seed), dropRange: Infinity });
  combat.reset(player.sim.aircraft);
  combat.practice = practice;
  combat.agents.push(...agents);
  for (let i = 0; i < seconds / DT; i++) {
    player.sim.step(DT, player.input);
    combat.step(DT, player.sim, false);
    if (onStep(i * DT, combat) === true) break;
  }
  return combat;
}

describe('engaging and attacking', () => {
  it('an AI pilot that sees the player goes from patrol to engage, closes, attacks and fires', () => {
    const player = playerAt(new Vector3(0, 1500, 0));
    const ai = aiAt(AIRCRAFT.dr1, 'ace', new Vector3(0, 1500, 900));
    const seen = new Set();
    let fired = false;
    fight([ai], player, 60, { practice: true, onStep: () => { seen.add(ai.brain.state); fired ||= ai.fire; } });
    expect(seen.has('engage')).toBe(true);
    expect(seen.has('attack')).toBe(true);
    expect(fired).toBe(true);
  });

  it('it shoots the player: hits damage his aircraft, and he is told', () => {
    const player = playerAt(new Vector3(0, 1500, 0));
    const ai = aiAt(AIRCRAFT.dr1, 'ace', new Vector3(0, 1500, 300)); // 300 m behind him, same heading
    const combat = fight([ai], player, 40);
    expect(combat.hitsOnPlayer).toBeGreaterThan(0);
    const d = player.sim.damage;
    expect(damageScore(d)).toBeGreaterThan(0);
    expect(combat.messages.some((m) => m.startsWith('You are hit') || m.startsWith('YOU WERE SHOT DOWN'))).toBe(true);
  });

  it('in practice mode the hits are counted but do no damage', () => {
    const player = playerAt(new Vector3(0, 1500, 0));
    const ai = aiAt(AIRCRAFT.dr1, 'ace', new Vector3(0, 1500, 300));
    const combat = fight([ai], player, 40, { practice: true });
    expect(combat.hitsOnPlayer).toBeGreaterThan(0);
    expect(JSON.stringify(player.sim.damage.wing)).toBe(JSON.stringify(createDamage().wing));
    expect(player.sim.damage.pilot).toBe(0);
    expect(combat.messages).toContain('You are hit (practice: no damage)');
  });

  it('when its fire brings the player down, the screen says who did it', () => {
    const player = playerAt(new Vector3(0, 1500, 0));
    player.sim.damage.pilot = 0.95; // one more hit on the pilot is enough
    player.sim.damage.wing.L = 0.97;
    player.sim.damage.wing.R = 0.97;
    const ai = aiAt(AIRCRAFT.dr1, 'ace', new Vector3(0, 1500, 250));
    let done = false;
    const combat = fight([ai], player, 60, { onStep: (t, c) => (done = c.playerDown) });
    expect(done).toBe(true);
    expect(combat.messages.find((m) => m.startsWith('YOU WERE SHOT DOWN BY Fokker Dr.I'))).toBeTruthy();
  });

  it('it never aims at its own side', () => {
    const player = playerAt(new Vector3(0, 1500, 30000)); // far away
    const a = aiAt(AIRCRAFT.dr1, 'ace', new Vector3(0, 1500, 0));
    const b = aiAt(AIRCRAFT.albatros, 'ace', new Vector3(0, 1500, 300)); // same side, right behind a
    let fired = false;
    fight([a, b], player, 20, { onStep: () => { fired ||= a.fire || b.fire; } });
    expect(fired).toBe(false);
    expect(a.brain.target).toBeNull();
  });

  for (const [skill, pattern] of [['ace', 'circle'], ['regular', 'circle'], ['ace', 'straight']]) {
    it(`a ${SKILLS[skill].name} Dr.I shoots down a Camel drone (${pattern}) within two and a half minutes (it falls, or crashes after its hits)`, () => {
      const player = playerAt(new Vector3(0, 5000, 60000));
      const rng = seededRandom(5);
      const ref = new Simulation();
      ref.start(AIRCRAFT.camel, 1500);
      ref.state.position.set(-900, 1500, 900);
      const drone = new Agent(AIRCRAFT.camel, 'drone', { pattern, rng });
      drone.place(ref.state, 0);
      const ai = new Agent(AIRCRAFT.dr1, skill, { rng });
      ai.placeOnCircuit({ x: 0, z: 0 }, 0);
      fight([drone, ai], player, 150, { practice: true, rng, onStep: () => drone.down || drone.crashed });
      expect(drone.down || drone.crashed, `${skill} ${pattern}`).toBe(true);
      expect(drone.hits).toBeGreaterThan(5);
      expect(ai.crashed).toBe(false);
    });
  }
});

describe('evading', () => {
  // The AI flies north; an enemy (a drone that keeps flying north too) sits on its tail.
  function tailed(skill, gap = 220, hit = false) {
    const player = playerAt(new Vector3(0, 1500, 30000));
    const ai = aiAt(AIRCRAFT.dr1, skill, new Vector3(0, 1500, 0));
    const chaser = new Agent(AIRCRAFT.camel, 'drone', { pattern: 'straight' });
    const ref = new Simulation();
    ref.start(AIRCRAFT.camel, 1500);
    ref.state.position.set(0, 1500, gap + 450); // the drone is placed 450 m ahead of this, so `gap` behind the AI
    chaser.place(ref.state, 0);
    chaser.state.position.set(0, 1500, gap);
    chaser.sim.previous.position.copy(chaser.state.position);
    if (hit) ai.hitTimer = COMBAT.hitMemory;
    let evadeAt = null;
    const h0 = attitude(ai.state).heading;
    let turned = 0;
    fight([ai, chaser], player, 6, {
      practice: true,
      onStep: (t) => {
        if (evadeAt === null && ai.brain.state === 'evade') evadeAt = t;
        if (evadeAt !== null && t > evadeAt + 3 && turned === 0) turned = Math.abs(((attitude(ai.state).heading - h0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      },
    });
    return { evadeAt, turned, ai };
  }

  it('an Ace notices an enemy on its tail within about a second and breaks hard (more than 45 degrees in 3 s)', () => {
    const r = tailed('ace');
    expect(r.evadeAt).not.toBeNull();
    expect(r.evadeAt).toBeLessThan(1.5);
    expect(r.turned * 180 / Math.PI).toBeGreaterThan(45);
    expect(r.ai.brain.manoeuvre === 'defensive break' || r.ai.brain.state !== 'evade').toBe(true);
  });

  it('a Novice is slower to notice, but being hit wakes anyone up at once (after the reaction time)', () => {
    const slow = [1, 2, 3, 4, 5].map((s) => {
      const player = playerAt(new Vector3(0, 1500, 30000));
      void player;
      return tailed('novice').evadeAt ?? 99;
    });
    const quick = tailed('novice', 220, true).evadeAt;
    expect(quick).not.toBeNull();
    expect(quick).toBeLessThan(SKILLS.novice.reactionTime + 0.3);
    expect(Math.min(...slow)).toBeGreaterThanOrEqual(quick);
  });

  it('nobody evades an enemy that is far behind', () => {
    const r = tailed('ace', 1500);
    expect(r.evadeAt).toBeNull();
  });
});

describe('disengaging', () => {
  const flee = (setup) => {
    const player = playerAt(new Vector3(0, 1500, 0));
    const ai = aiAt(AIRCRAFT.albatros, 'regular', new Vector3(0, 1500, 600));
    setup(ai);
    const states = new Set();
    const d0 = ai.state.position.distanceTo(player.sim.state.position);
    fight([ai], player, 20, { practice: true, onStep: () => { states.add(ai.brain.state); } });
    return { states, ai, d0, d1: ai.state.position.distanceTo(player.sim.state.position) };
  };

  it('breaks off when nearly out of ammunition and flies away toward its own side (east for the Germans)', () => {
    const r = flee((ai) => { for (const g of ai.gunBank.guns) g.rounds = 20; });
    expect(r.states.has('disengage')).toBe(true);
    expect(r.ai.brain.state).toBe('disengage');
    expect(r.ai.state.position.x).toBeGreaterThan(200);
    expect(r.ai.gunBank.roundsLeft).toEqual([20, 20]); // it does not shoot while running
  });

  it('breaks off when badly damaged, earlier the more skilled it is', () => {
    expect(SKILLS.ace.fleeDamage).toBeLessThan(SKILLS.regular.fleeDamage);
    expect(SKILLS.regular.fleeDamage).toBeLessThan(SKILLS.novice.fleeDamage);
    const r = flee((ai) => { ai.sim.damage.engine = 0.7; });
    expect(r.states.has('disengage')).toBe(true);
    const healthy = flee(() => {});
    expect(healthy.states.has('disengage')).toBe(false);
  });

  it('breaks off when short of fuel', () => {
    const r = flee((ai) => { ai.sim.damage.fuel = 0.05; });
    expect(r.ai.brain.state).toBe('disengage');
  });

  it('the damage score is the worst part, and a sound aircraft scores zero', () => {
    const d = createDamage();
    expect(damageScore(d)).toBe(0);
    d.wing.R = 0.4;
    d.engine = 0.2;
    expect(damageScore(d)).toBeCloseTo(0.4, 9);
    d.pilot = 1;
    expect(damageScore(d)).toBeGreaterThanOrEqual(1);
  });
});

describe('fair play', () => {
  it('an AI aircraft in a fight flies the player\'s aircraft data and stays inside its limits', () => {
    const player = playerAt(new Vector3(0, 1500, 0));
    const ai = aiAt(AIRCRAFT.dr1, 'ace', new Vector3(0, 1500, 500));
    let maxSpeed = 0;
    let maxLoad = 0;
    fight([ai], player, 60, { practice: true, onStep: () => { maxSpeed = Math.max(maxSpeed, ai.sim.diag.speed); maxLoad = Math.max(maxLoad, ai.sim.diag.loadFactor); } });
    expect(ai.sim.aircraft).toBe(AIRCRAFT.dr1);
    expect(maxSpeed * Math.sqrt(ai.sim.diag.density)).toBeLessThan(AIRCRAFT.dr1.structure.neverExceedSpeed * 1.02);
    expect(maxLoad).toBeLessThan(AIRCRAFT.dr1.structure.ultimateLoad);
    expect(ai.crashed).toBe(false);
  });
});

