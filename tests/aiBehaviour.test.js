import { describe, it, expect } from 'vitest';
import { Simulation } from '../src/core/simulation.js';
import { AIRCRAFT, ALL_AIRCRAFT as AIRCRAFT_LIST } from '../src/aircraft/index.js'; // every aircraft, both eras
import { SKILLS, SKILL_ORDER, PATROL, stepSkill } from '../src/aircraft/aiData.js';
import { DAMAGE } from '../src/aircraft/damageModel.js';
import { TARGETS } from '../src/aircraft/weapons.js';
import { Agent, DroneBrain, enemiesOf } from '../src/game/agents.js';
import { Combat } from '../src/game/combat.js';
import { seededRandom } from '../src/weapons/guns.js';
import { attitude } from '../src/dev/flightScenarios.js';

// AI pilots on patrol, and how they are put into a fight.

const DT = 1 / 120;

function patrol(ac, skillName, seconds, centre = { x: 0, z: 0 }) {
  const agent = new Agent(ac, skillName, { rng: seededRandom(3) });
  agent.placeOnCircuit(centre, 0.5);
  const log = { maxStall: 0, maxLoad: 0, maxSpeed: 0, minY: Infinity, maxY: 0, minR: Infinity, maxR: 0, states: new Set(), samples: [] };
  for (let i = 0; i < seconds / DT && !agent.crashed; i++) {
    agent.step(DT, []);
    const s = agent.state;
    const r = Math.hypot(s.position.x - centre.x, s.position.z - centre.z);
    if (i * DT > 30) {
      log.minR = Math.min(log.minR, r);
      log.maxR = Math.max(log.maxR, r);
      log.minY = Math.min(log.minY, s.position.y);
      log.maxY = Math.max(log.maxY, s.position.y);
    }
    log.maxStall = Math.max(log.maxStall, agent.sim.diag.stall);
    log.maxLoad = Math.max(log.maxLoad, agent.sim.diag.loadFactor);
    log.maxSpeed = Math.max(log.maxSpeed, agent.sim.diag.speed);
    log.states.add(agent.brain.state);
    if (i % 600 === 0) log.samples.push(Math.atan2(s.position.z - centre.z, s.position.x - centre.x));
  }
  return { agent, ...log };
}

describe('the skill list', () => {
  it('has a drone and three fighting levels, ordered from the easiest', () => {
    expect(SKILL_ORDER).toEqual(['drone', 'novice', 'regular', 'ace']);
    expect(SKILLS.novice.reactionTime).toBeGreaterThan(SKILLS.regular.reactionTime);
    expect(SKILLS.regular.reactionTime).toBeGreaterThan(SKILLS.ace.reactionTime);
    expect(SKILLS.ace.gLimit).toBeGreaterThan(SKILLS.regular.gLimit);
    expect(SKILLS.regular.gLimit).toBeGreaterThan(SKILLS.novice.gLimit);
    expect(SKILLS.ace.sightRange).toBeGreaterThan(SKILLS.novice.sightRange);
    for (const k of SKILL_ORDER) expect(SKILLS[k].name.length).toBeGreaterThan(0);
  });

  it('[ and ] step through it and stop at the ends', () => {
    expect(stepSkill('drone', 1)).toBe('novice');
    expect(stepSkill('novice', 1)).toBe('regular');
    expect(stepSkill('ace', 1)).toBe('ace');
    expect(stepSkill('drone', -1)).toBe('drone');
    expect(stepSkill('regular', -1)).toBe('novice');
  });
});

for (const ac of AIRCRAFT_LIST) {
  for (const skill of ['novice', 'regular', 'ace']) {
    describe(`${SKILLS[skill].name} ${ac.name} on patrol`, () => {
      const r = patrol(ac, skill, 120);

      it('flies the circuit for two minutes without crashing, stalling or breaking anything', () => {
        expect(r.agent.crashed, r.agent.sim.crashReason).toBe(false);
        expect(r.maxStall).toBeLessThan(0.2);
        expect(r.agent.sim.damage.wing).toEqual({ L: 0, R: 0 });
      });

      it('stays on the circuit: within 600 m of its radius, going round it, at its patrol height and speed', () => {
        expect(r.minR).toBeGreaterThan(PATROL.radius - 600);
        expect(r.maxR).toBeLessThan(PATROL.radius + 600);
        expect(Math.abs(r.minY - SKILLS[skill].patrolAltitude)).toBeLessThan(120);
        expect(Math.abs(r.maxY - SKILLS[skill].patrolAltitude)).toBeLessThan(120);
        // The angle round the circle advances all the time (it goes round, not back and forth).
        let turned = 0;
        for (let i = 1; i < r.samples.length; i++) turned += ((r.samples[i] - r.samples[i - 1] + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        expect(turned).toBeGreaterThan(1.5);
        const want = SKILLS[skill].patrolSpeed * ac.documented.maxSpeed;
        expect(Math.abs(r.agent.sim.diag.speed - want)).toBeLessThan(0.15 * want);
        expect(r.states.size).toBe(1);
        expect([...r.states][0]).toBe('patrol');
      });

      it('flies the aircraft the player flies, inside its own limits', () => {
        expect(r.agent.sim.aircraft).toBe(ac);
        expect(r.maxSpeed).toBeLessThan(ac.documented.maxSpeed * 1.02);
        expect(r.maxLoad).toBeLessThanOrEqual((SKILLS[skill].gLimit * ac.structure.ultimateLoad) / DAMAGE.safetyFactor + 0.4);
      });
    });
  }
}

describe('putting AI pilots into a fight', () => {
  const start = () => {
    const sim = new Simulation();
    sim.start(AIRCRAFT.camel, 1000);
    return sim;
  };

  it('an AI enemy appears on its circuit round the player, in the direction the player faces, at its skill\'s height', () => {
    for (const skill of ['novice', 'regular', 'ace']) {
      const sim = start();
      const combat = new Combat({ rng: seededRandom(1) });
      combat.reset(AIRCRAFT.camel);
      const a = combat.spawnAgent(sim, skill);
      expect(a.skill).toBe(skill);
      expect(a.isDrone).toBe(false);
      expect(a.aircraft.side).not.toBe('Allied');
      const rel = a.state.position.clone().sub(sim.state.position);
      expect(Math.hypot(rel.x, rel.z)).toBeCloseTo(PATROL.radius, 3);
      expect(rel.z).toBeLessThan(-1000); // north of the player, who faces north
      expect(a.state.position.y).toBeCloseTo(SKILLS[skill].patrolAltitude, 3);
      // Flying round the circuit: the velocity is across the line to the centre.
      const radial = rel.clone().setY(0).normalize();
      expect(Math.abs(a.state.velocity.clone().setY(0).normalize().dot(radial))).toBeLessThan(0.01);
      expect(a.brain.describe()).toContain(SKILLS[skill].name);
    }
  });

  it('up to four enemies appear at different places, all of the other side', () => {
    const sim = start();
    const combat = new Combat({ rng: seededRandom(1) });
    combat.reset(AIRCRAFT.camel);
    combat.skill = 'regular';
    const all = [1, 2, 3, 4].map(() => combat.spawnAgent(sim));
    expect(combat.spawnAgent(sim)).toBeNull();
    expect(all.every((a) => a && a.aircraft.side === 'Central')).toBe(true);
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(all[i].state.position.distanceTo(all[j].state.position)).toBeGreaterThan(500);
    expect(new Set(all.map((a) => a.aircraft.id)).size).toBe(enemiesOf(AIRCRAFT.camel).length);
  });

  it('the skill chosen for new enemies decides what they are; drones still fly the old scripted paths', () => {
    const sim = start();
    const combat = new Combat({ rng: seededRandom(1) });
    combat.reset(AIRCRAFT.camel);
    expect(combat.skill).toBe('regular');
    combat.skill = 'drone';
    const d = combat.spawnAgent(sim);
    expect(d.isDrone).toBe(true);
    expect(d.brain).toBeInstanceOf(DroneBrain);
    combat.skill = 'ace';
    const a = combat.spawnAgent(sim);
    expect(a.isDrone).toBe(false);
    expect(a.brain.skill).toBe(SKILLS.ace);
  });

  it('a fight with AI pilots runs: they see the player inside their sight range and go for him, and nobody crashes', () => {
    const sim = start();
    const combat = new Combat({ rng: seededRandom(1) });
    combat.reset(AIRCRAFT.camel);
    combat.skill = 'ace';
    for (let i = 0; i < 3; i++) combat.spawnAgent(sim);
    sim.diag = { rpm: 1100 };
    const pos = sim.state.position.clone();
    let sawPlayer = 0;
    for (let i = 0; i < 20 / DT; i++) {
      sim.state.position.copy(pos); // the player is parked, so the circuits stay put
      sim.previous.position.copy(pos);
      combat.step(DT, sim, false);
      for (const a of combat.agents) if (a.brain.contacts.some((c) => c.id === 'player')) sawPlayer++;
    }
    expect(combat.agents.length).toBe(3);
    expect(combat.agents.every((a) => !a.crashed)).toBe(true);
    expect(sawPlayer).toBeGreaterThan(0); // at 1.5 km an Ace (sees 4 km) sees him
    for (const a of combat.agents) expect(['engage', 'attack', 'evade']).toContain(a.brain.state);
  });

  it('a Novice, who sees only 2 km, does not see a player 3 km away', () => {
    const sim = start();
    const combat = new Combat({ rng: seededRandom(1) });
    combat.reset(AIRCRAFT.camel);
    combat.skill = 'novice';
    const a = combat.spawnAgent(sim);
    sim.diag = { rpm: 1100 };
    sim.state.position.set(0, 1000, 3000);
    sim.previous.position.copy(sim.state.position);
    for (let i = 0; i < 2 / DT; i++) {
      sim.state.position.set(0, 1000, 3000);
      combat.step(DT, sim, false);
      if (i === 0) a.state.position.set(0, 1200, 0); // put it well away from its circuit's start for a clean test
    }
    expect(Math.hypot(a.state.position.x - sim.state.position.x, a.state.position.z - sim.state.position.z)).toBeGreaterThan(SKILLS.novice.sightRange);
    expect(a.brain.contacts.length).toBe(0);
  });

  it('the default for a new fight is Regular AI pilots, with at most four agents', () => {
    expect(TARGETS.maxAlive).toBe(4);
    expect(new Combat().skill).toBe('regular');
    expect(new Combat().practice).toBe(false);
  });

  it('agents face the way they fly: the brain sees the player through the same Simulation objects the game uses', () => {
    const a = new Agent(AIRCRAFT.albatros, 'regular');
    a.placeOnCircuit({ x: 0, z: 0 }, 1);
    expect(a.sim).toBeInstanceOf(Simulation);
    const h = attitude(a.state).heading;
    const v = a.state.velocity;
    expect(Math.atan2(v.x, -v.z)).toBeCloseTo(h, 2);
  });
});
