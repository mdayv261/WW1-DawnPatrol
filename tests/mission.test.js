import { describe, it, expect } from 'vitest';
import { Simulation } from '../src/core/simulation.js';
import { AIRCRAFT_LIST } from '../src/aircraft/index.js';
import { SKILLS } from '../src/aircraft/aiData.js';
import { Combat } from '../src/game/combat.js';
import { Flow, STARTS, cleanConfig } from '../src/game/flow.js';
import { startMission, MISSION, summary, formatTime } from '../src/game/mission.js';
import { createWorld } from '../src/world/layout.js';

// Missions: started from the settings, ended four ways, summed up; and the Phase 6 acceptance
// test: menu -> mission -> results -> menu -> another mission, with nothing left over.

const DT = 1 / 120;
const world = createWorld(1917);

function begin(cfg) {
  const sim = new Simulation();
  const combat = new Combat();
  const config = cleanConfig(cfg);
  const { input, watcher } = startMission(config, { sim, combat, world });
  return { sim, combat, config, input, watcher };
}

describe('starting a mission', () => {
  for (const ac of AIRCRAFT_LIST) {
    for (const start of STARTS) {
      it(`${ac.name}, ${start.label}: the player is where the settings say, with full belts and a sound aircraft`, () => {
        const m = begin({ aircraft: ac.id, start: start.id, enemyCount: 2, skill: 'regular' });
        expect(m.sim.aircraft).toBe(ac);
        if (start.altitude) expect(m.sim.state.position.y).toBeCloseTo(start.altitude, 0);
        else expect(m.sim.state.position.y).toBeLessThan(3);
        expect(m.combat.gunBank.roundsLeft).toEqual([ac.guns.rounds, ac.guns.rounds]);
        expect(m.combat.agents.length).toBe(2);
        expect(m.combat.agents.every((a) => a.side !== ac.side)).toBe(true);
      });
    }
  }

  it('the enemy type, number and skill are as chosen', () => {
    const m = begin({ aircraft: 'camel', enemyType: 'albatros', enemyCount: 3, skill: 'ace', start: '2000' });
    expect(m.combat.agents.map((a) => a.aircraft.id)).toEqual(['albatros', 'albatros', 'albatros']);
    expect(m.combat.agents.every((a) => a.skill === 'ace')).toBe(true);
    const none = begin({ enemyCount: 0 });
    expect(none.combat.agents.length).toBe(0);
  });

  it('in the air, AI enemies patrol near the start height (an Ace above, a Novice below)', () => {
    const ace = begin({ aircraft: 'camel', enemyCount: 1, skill: 'ace', start: '2000' }).combat.agents[0];
    const novice = begin({ aircraft: 'camel', enemyCount: 1, skill: 'novice', start: '2000' }).combat.agents[0];
    expect(ace.state.position.y).toBe(2000 + MISSION.altitudeStep);
    expect(novice.state.position.y).toBe(2000 - MISSION.altitudeStep);
  });

  it('on the airfield, the enemy patrols over the front, kilometres away, not over the player', () => {
    for (const [id, toward] of [['camel', 1], ['dr1', -1]]) {
      const m = begin({ aircraft: id, enemyCount: 2, skill: 'regular', start: 'airfield' });
      for (const a of m.combat.agents) {
        expect(a.state.position.distanceTo(m.sim.state.position)).toBeGreaterThan(2000);
        expect(Math.sign(a.brain.centre.x - m.sim.state.position.x)).toBe(toward);
        expect(a.state.position.y).toBe(SKILLS.regular.patrolAltitude);
      }
    }
  });

  it('drones fly ahead of the player as before', () => {
    const m = begin({ aircraft: 'spad13', enemyCount: 2, skill: 'drone', start: '1000' });
    for (const a of m.combat.agents) expect(a.isDrone).toBe(true);
  });
});

describe('how a mission ends', () => {
  const run = (m, seconds, each = () => {}) => {
    for (let i = 0; i < seconds / DT && !m.watcher.result; i++) {
      each(m);
      m.sim.step(DT, m.input);
      m.combat.step(DT, m.sim, false);
      m.watcher.update(DT, m.sim, m.combat);
    }
    return m.watcher.result;
  };

  it('victory: a few seconds after the last enemy goes down', () => {
    const m = begin({ aircraft: 'camel', enemyCount: 2, skill: 'drone', start: '1000' });
    run(m, 1);
    for (const a of m.combat.agents) a.sim.damage.pilot = 1;
    m.combat.kills = 2;
    expect(run(m, 2)).toBeNull(); // not yet: the player watches them fall
    const r = run(m, 5);
    expect(r.outcome).toBe('victory');
    expect(r.headline).toBe('Victory');
    expect(r.kills).toBe(2);
    expect(r.time).toBeGreaterThan(MISSION.endDelay);
  });

  it('shot down: when the player\'s pilot is killed or a wing fails', () => {
    const m = begin({ aircraft: 'camel', enemyCount: 1, skill: 'regular', start: '1000' });
    m.sim.damage.pilot = 1;
    const r = run(m, 6);
    expect(r.outcome).toBe('shot down');
    expect(r.detail).toBe('Pilot killed');
  });

  it('crashed: flying into the ground with no enemy damage', () => {
    const m = begin({ aircraft: 'spad13', enemyCount: 0, start: '1000' });
    m.sim.state.position.y = 5;
    m.sim.state.velocity.set(0, -30, -40);
    const r = run(m, 8);
    expect(r.outcome).toBe('crashed');
  });

  it('a safe return: landing and stopping on a friendly airfield, but not before flying', () => {
    const m = begin({ aircraft: 'camel', enemyCount: 1, skill: 'novice', start: 'airfield' });
    expect(run(m, 3)).toBeNull(); // parked at the start: not a landing yet
    m.watcher.airborne = true; // pretend the flight has happened and it is now back on the field
    const r = run(m, 3);
    expect(r.outcome).toBe('landed');
    expect(r.headline).toBe('Safe return');
  });

  it('stopping on an enemy airfield or in a farm field is not a safe return', () => {
    const german = world.airfieldsNear(10000, 0, 20000).find((af) => af.side === 'german');
    expect(german).toBeTruthy();
    for (const [x, z] of [[german.x, german.z], [0, 3000]]) {
      const m = begin({ aircraft: 'camel', enemyCount: 0, start: 'airfield' });
      m.sim.state.position.x = x;
      m.sim.state.position.z = z;
      m.sim.previous.position.copy(m.sim.state.position);
      m.watcher.airborne = true;
      expect(run(m, 3)).toBeNull();
    }
  });

  it('ended from the pause menu at once, with the numbers so far', () => {
    const m = begin({ aircraft: 'dr1', enemyCount: 2, skill: 'regular', start: '1000' });
    run(m, 2);
    const r = m.watcher.end(m.sim, m.combat);
    expect(r.outcome).toBe('ended');
    expect(r.time).toBeCloseTo(2, 1);
    expect(r.aircraft).toBe('Fokker Dr.I');
    expect(m.watcher.end(m.sim, m.combat)).toBe(r); // a second call changes nothing
  });

  it('the enemy withdrew: all enemies gone without any shot down', () => {
    const m = begin({ aircraft: 'camel', enemyCount: 1, skill: 'regular', start: '1000' });
    run(m, 0.5);
    m.combat.agents.length = 0; // flown out of range
    expect(run(m, 6).outcome).toBe('withdrew');
  });

  it('a free flight (no enemies) only ends by landing, crashing or from the pause menu', () => {
    const m = begin({ enemyCount: 0, start: '1000' });
    expect(run(m, 3)).toBeNull();
  });
});

describe('the results', () => {
  it('sum up the shots, hits, accuracy, damage and fuel', () => {
    const m = begin({ aircraft: 'camel', enemyCount: 1, skill: 'regular', start: '1000' });
    m.combat.shotsFired = 80;
    m.combat.hitsOnTargets = 20;
    m.combat.hitsOnPlayer = 3;
    m.sim.damage.wing.L = 0.3;
    m.sim.damage.fuel = 0.9;
    const r = summary({ outcome: 'ended', detail: 'x' }, m.watcher, m.sim, m.combat);
    expect(r.accuracy).toBe(25);
    expect(r.hitsTaken).toBe(3);
    expect(r.damage).toContain('left wing 30%');
    expect(r.fuelUsed).toBeCloseTo(10, 6);
    expect(r.enemies).toBe(1);
  });

  it('format the time as minutes and seconds', () => {
    expect(formatTime(5)).toBe('5 s');
    expect(formatTime(245)).toBe('4 min 05 s');
  });
});

describe('Phase 6 acceptance: menu -> mission -> results -> menu -> another mission, in one page', () => {
  it('runs two missions in a row with the same game objects and nothing left over from the first', () => {
    const flow = new Flow();
    const sim = new Simulation();
    const combat = new Combat();
    let mission = null;
    const flyMission = (cfg) => {
      mission = startMission(cleanConfig(cfg), { sim, combat, world });
      flow.go('flying');
    };
    const play = (seconds, during = () => {}) => {
      for (let i = 0; i < seconds / DT && flow.flying; i++) {
        during();
        sim.step(DT, mission.input);
        combat.step(DT, sim, true); // holding the trigger
        if (mission.watcher.update(DT, sim, combat)) flow.go('results');
      }
    };

    // First mission: two drones, shot down.
    flow.go('setup');
    flyMission({ aircraft: 'camel', enemyCount: 2, skill: 'drone', start: '1000' });
    play(1);
    for (const a of combat.agents) a.sim.damage.pilot = 1;
    sim.damage.wing.L = 0.4; // and the player took some damage
    play(10);
    expect(flow.state).toBe('results');
    expect(mission.watcher.result.outcome).toBe('victory');
    expect(combat.shotsFired).toBeGreaterThan(0);

    // Back to the menu, and a second, different mission.
    flow.go('menu');
    flow.go('setup');
    flyMission({ aircraft: 'albatros', enemyCount: 1, skill: 'novice', start: '2000', timeOfDay: 'dusk' });
    expect(sim.aircraft.id).toBe('albatros');
    expect(combat.agents.length).toBe(1);
    expect(combat.agents[0].down).toBe(false);
    expect(combat.bullets.length).toBe(0);
    expect(combat.events.length).toBe(0);
    expect(combat.messages.length).toBe(0);
    expect(combat.shotsFired).toBe(0);
    expect(combat.kills).toBe(0);
    expect(sim.damage.wing).toEqual({ L: 0, R: 0 });
    expect(sim.crashed).toBe(false);
    expect(mission.watcher.result).toBeNull();
    expect(mission.watcher.time).toBe(0);

    // And it can end too.
    flow.go('paused');
    mission.watcher.end(sim, combat);
    flow.go('results');
    expect(mission.watcher.result.outcome).toBe('ended');
    flow.go('menu');
    expect(flow.state).toBe('menu');
  });
});
