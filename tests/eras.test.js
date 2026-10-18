import { describe, it, expect } from 'vitest';
import { AIRCRAFT, AIRCRAFT_LIST } from '../src/aircraft/index.js';
import { ERAS, aircraftOfEra } from '../src/aircraft/eras.js';
import { aircraftFor, enemyChoices, cleanConfig, loadoutChoices, DEFAULT_CONFIG } from '../src/game/flow.js';
import { startMission, missionAircraft } from '../src/game/mission.js';
import { enemiesOf } from '../src/game/agents.js';
import { Simulation } from '../src/core/simulation.js';
import { Combat } from '../src/game/combat.js';
import { createWorld } from '../src/world/layout.js';
import { structureLimits } from '../src/physics/damage.js';

// Phase E4: the player chooses Early War (1916) or Late War (1917-1918) for a mission; their
// aircraft and the AI enemies come from that era.

const world = createWorld(1917);
const ids = (list) => list.map((a) => a.id);

describe('eras', () => {
  it('are Late War (the default) and Early War, each with its own aircraft', () => {
    expect(ERAS.map((e) => e.id)).toEqual(['late', 'early']);
    expect(DEFAULT_CONFIG.era).toBe('late');
    expect(ids(aircraftOfEra('late'))).toEqual(ids(AIRCRAFT_LIST));
    expect(ids(aircraftOfEra('early'))).toEqual(['e4', 'n11']);
    expect(ids(aircraftOfEra('early', 'Allied'))).toEqual(['n11']);
  });

  it('each era offers a pilot only that era\'s aircraft of their own side', () => {
    expect(ids(aircraftFor('allied', 'early'))).toEqual(['n11']);
    expect(ids(aircraftFor('german', 'early'))).toEqual(['e4']);
    expect(ids(aircraftFor('allied'))).toEqual(['camel', 'spad13']); // Late War by default, as before
  });

  it('the enemies are the other side of the same era', () => {
    expect(enemyChoices('n11')).toEqual(['mixed', 'e4']);
    expect(enemyChoices('e4')).toEqual(['mixed', 'n11']);
    expect(enemyChoices('camel')).toEqual(['mixed', 'dr1', 'albatros']);
    expect(ids(enemiesOf(AIRCRAFT.n11))).toEqual(['e4']);
    expect(ids(enemiesOf(AIRCRAFT.albatros))).toEqual(['camel', 'spad13']);
  });

  it('settings saved before the eras existed become Late War, unchanged', () => {
    const old = { aircraft: 'spad13', enemyType: 'dr1', enemyCount: 3, skill: 'ace', start: '1000', timeOfDay: 'day' };
    expect(cleanConfig(old)).toEqual({ ...old, era: 'late', loadout: 'standard' });
  });

  it('an aircraft or enemy from the wrong era falls back to the era\'s own', () => {
    expect(cleanConfig({ era: 'early', aircraft: 'camel' }, 'allied').aircraft).toBe('n11');
    expect(cleanConfig({ era: 'early', aircraft: 'n11', enemyType: 'dr1' }, 'allied').enemyType).toBe('mixed');
    expect(cleanConfig({ era: 'late', aircraft: 'e4' }, 'german').aircraft).toBe('dr1');
    expect(cleanConfig({ era: 'nonsense', aircraft: 'e4' }).era).toBe('late');
  });

  it('offers the three-gun loadout for the E.IV only', () => {
    expect(loadoutChoices('e4').map(([id]) => id)).toEqual(['standard', 'immelmann']);
    expect(loadoutChoices('n11').map(([id]) => id)).toEqual(['standard']);
    expect(cleanConfig({ era: 'early', aircraft: 'e4', loadout: 'immelmann' }).loadout).toBe('immelmann');
    expect(cleanConfig({ era: 'early', aircraft: 'n11', loadout: 'immelmann' }).loadout).toBe('standard');
  });
});

describe('an Early War mission', () => {
  const start = (cfg) => {
    const sim = new Simulation();
    const combat = new Combat();
    startMission(cleanConfig(cfg), { sim, combat, world });
    return { sim, combat };
  };

  it('puts the player in their Early War aircraft against Early War enemies only', () => {
    const { sim, combat } = start({ era: 'early', aircraft: 'n11', enemyType: 'mixed', enemyCount: 3, start: '1000' });
    expect(sim.aircraft.id).toBe('n11');
    expect(combat.agents).toHaveLength(3);
    for (const a of combat.agents) expect(a.aircraft.id).toBe('e4');
  });

  it('flies the three-gun E.IV when that loadout is chosen (and its AI enemies fly the standard guns)', () => {
    const { sim, combat } = start({ era: 'early', aircraft: 'e4', loadout: 'immelmann', enemyCount: 1, start: '1000' });
    expect(sim.aircraft.loadout).toBe('immelmann');
    expect(combat.gunBank.guns).toHaveLength(3);
    expect(missionAircraft({ aircraft: 'e4', loadout: 'immelmann' })).toBe(sim.aircraft);
    expect(combat.agents[0].aircraft.id).toBe('n11');
  });

  it('a Late War mission is as before', () => {
    const { sim, combat } = start({ aircraft: 'camel', enemyCount: 2, start: '1000' });
    expect(sim.aircraft).toBe(AIRCRAFT.camel);
    for (const a of combat.agents) expect(['dr1', 'albatros']).toContain(a.aircraft.id);
  });
});

describe('structure limits for the AI and the warnings', () => {
  it('are each aircraft\'s own, except the Nieuport\'s weaker lower wing', () => {
    for (const ac of [...AIRCRAFT_LIST, AIRCRAFT.e4]) {
      expect(structureLimits(ac)).toEqual({ neverExceedSpeed: ac.structure.neverExceedSpeed, ultimateLoad: ac.structure.ultimateLoad });
    }
    const lw = AIRCRAFT.n11.structure.lowerWing;
    expect(structureLimits(AIRCRAFT.n11)).toEqual({ neverExceedSpeed: lw.neverExceedSpeed, ultimateLoad: lw.ultimateLoad });
  });
});
