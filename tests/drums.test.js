import { describe, it, expect } from 'vitest';
import { AIRCRAFT, AIRCRAFT_LIST } from '../src/aircraft/index.js';
import { GUN_TYPES } from '../src/aircraft/weapons.js';
import { GunBank } from '../src/weapons/guns.js';
import { gunMounts, withLoadout, drumFed } from '../src/weapons/mounts.js';
import { Agent } from '../src/game/agents.js';
import { Combat } from '../src/game/combat.js';
import { Simulation } from '../src/core/simulation.js';
import { DEV_FLIGHTS } from '../src/game/devFlights.js';
import { ACTIONS } from '../src/input/bindings.js';
import { DEFAULT_MAPPING } from '../src/input/joystickMapping.js';
import { CLIPS } from '../src/aircraft/sounds.js';

// Phase E2: the Nieuport 11's over-wing Lewis gun with its drums, and the Fokker E.IV's
// optional three-gun loadout. The Late War guns are checked unchanged in guns.test.js.

const n11 = AIRCRAFT.n11;
const e4 = AIRCRAFT.e4;
const DT = 1 / 120;

// Hold the trigger for `seconds` at engine speed `rpm`; returns the rounds fired.
function fire(bank, seconds, rpm = 1200, trigger = true) {
  let n = 0;
  for (let i = 0; i < Math.round(seconds / DT); i++) n += bank.update(DT, trigger, rpm).length;
  return n;
}

describe('gun mounts', () => {
  it('gives every Late War aircraft its usual mirrored pair', () => {
    for (const ac of AIRCRAFT_LIST) {
      expect(gunMounts(ac)).toEqual([
        { x: ac.guns.muzzleX, y: ac.guns.muzzleY, z: -ac.guns.muzzleZ },
        { x: ac.guns.muzzleX, y: ac.guns.muzzleY, z: ac.guns.muzzleZ },
      ]);
    }
  });

  it('gives the Nieuport one gun on the centre line, above the propeller', () => {
    const m = gunMounts(n11);
    expect(m).toHaveLength(1);
    expect(m[0].z).toBe(0);
    expect(m[0].y).toBeGreaterThan(n11.propeller.diameter / 2); // its line of fire clears the blade tips
  });
});

describe('the Nieuport 11 Lewis gun', () => {
  it('is drum-fed, unsynchronised, and fires .303 rounds', () => {
    const bank = new GunBank(n11, () => 1);
    expect(drumFed(n11)).toBe(true);
    expect(bank.drumFed).toBe(true);
    expect(bank.synchronised).toBe(false);
    expect(bank.cartridge.name).toContain('.303');
  });

  it('fires at its full rate whatever the engine speed (no waiting for the blades)', () => {
    for (const rpm of [600, 1200]) {
      const bank = new GunBank(n11, () => 1);
      expect(fire(bank, 6, rpm)).toBe(55); // 550 a minute for 6 s
    }
  });

  it('stops when the drum is empty, until the drum is changed', () => {
    const bank = new GunBank(n11, () => 1);
    expect(fire(bank, 15)).toBe(97);
    expect(bank.guns[0].state).toBe('drumEmpty');
    expect(bank.statusText()).toBe('DRUM EMPTY · 3 SPARE');
    expect(fire(bank, 2)).toBe(0);
  });

  it('changes the drum in its change time, firing nothing meanwhile', () => {
    const bank = new GunBank(n11, () => 1);
    fire(bank, 15);
    expect(bank.changeDrum()).toBe(true);
    expect(bank.events).toEqual(['drumOff']);
    expect(bank.statusText()).toBe('CHANGING DRUM');
    expect(fire(bank, n11.guns.drumChangeTime - 0.1)).toBe(0);
    fire(bank, 0.2, 1200, false);
    expect(bank.events).toEqual(['drumOff', 'drumOn']);
    expect(bank.statusText()).toBe('DRUM 97/97 · 2 SPARE');
    expect(fire(bank, 15)).toBe(97);
  });

  it('can change a part-used drum (its rounds are lost), but not while changing or jammed', () => {
    const bank = new GunBank(n11, () => 1);
    fire(bank, 2);
    expect(bank.guns[0].rounds).toBeLessThan(97);
    expect(bank.changeDrum()).toBe(true);
    expect(bank.guns[0].rounds).toBe(0);
    expect(bank.changeDrum()).toBe(false); // already changing
    const jammed = new GunBank(n11, () => 1);
    jammed.guns[0].jammed = true;
    expect(jammed.changeDrum()).toBe(false);
  });

  it('runs out after the spare drums', () => {
    const bank = new GunBank(n11, () => 1);
    let fired = fire(bank, 15);
    for (let d = 0; d < n11.guns.spareDrums; d++) {
      bank.changeDrum();
      fired += fire(bank, n11.guns.drumChangeTime + 15);
    }
    expect(fired).toBe(97 * 4);
    expect(bank.guns[0].state).toBe('empty');
    expect(bank.changeDrum()).toBe(false);
    expect(bank.statusText()).toBe('NO DRUMS LEFT');
    expect(bank.ammoFraction).toBe(0);
  });

  it('counts the spare drums in the ammunition the AI judges', () => {
    const bank = new GunBank(n11, () => 1);
    expect(bank.ammoFraction).toBe(1);
    fire(bank, 15); // one drum of four gone
    expect(bank.ammoFraction).toBeCloseTo(0.75, 9);
  });

  it('uses the Vickers stoppage values and has its own firing sound', () => {
    for (const k of ['jamPerRound', 'clearTime', 'clearSuccess']) expect(GUN_TYPES.lewis[k]).toBe(GUN_TYPES.vickers[k]);
    expect(CLIPS.lewis).toBeTruthy();
  });
});

describe('changing a drum in the game', () => {
  it('Combat changes the player\'s drum and makes the two drum sounds', () => {
    const combat = new Combat();
    combat.reset(n11);
    const sim = new Simulation();
    sim.start(n11);
    combat.gunBank.guns[0].rounds = 0;
    expect(combat.changeDrum()).toBe(true);
    for (let i = 0; i < Math.round((n11.guns.drumChangeTime + 0.5) / DT); i++) combat.step(DT, sim, false);
    const kinds = combat.sounds.map((s) => s.kind);
    expect(kinds).toContain('drumOff');
    expect(kinds).toContain('drumOn');
    expect(CLIPS.drumOff && CLIPS.drumOn).toBeTruthy();
  });

  it('an AI pilot changes his own empty drum when he is not firing', () => {
    const agent = new Agent(n11, 'regular', { rng: () => 0.5 });
    agent.placeOnCircuit({ x: 0, z: 0 }, 0);
    agent.gunBank.guns[0].rounds = 0;
    for (let i = 0; i < Math.round((n11.guns.drumChangeTime + 1) / DT); i++) {
      agent.step(DT, [], null);
      agent.gunBank.update(DT, agent.fire, 1200); // as Combat.step does for every agent
    }
    expect(agent.gunBank.guns[0].rounds).toBe(97);
    expect(agent.gunBank.guns[0].spares).toBe(2);
  });

  it('has a rebindable key (F) and a joystick button', () => {
    const action = ACTIONS.find((a) => a.id === 'changeDrum');
    expect(action.keys).toEqual(['KeyF']);
    const taken = ACTIONS.filter((a) => a.id !== 'changeDrum').flatMap((a) => a.keys);
    expect(taken).not.toContain('KeyF');
    const buttons = Object.entries(DEFAULT_MAPPING.buttons).filter(([, b]) => b !== null);
    expect(DEFAULT_MAPPING.buttons.changeDrum).toBe(9);
    expect(buttons.filter(([, b]) => b === 9)).toHaveLength(1);
  });
});

describe('the Fokker E.IV three-gun loadout (Immelmann)', () => {
  const three = withLoadout(e4, 'immelmann');

  it('has three guns and carries their weight, with the inertias scaled to suit', () => {
    expect(new GunBank(three, () => 1).guns).toHaveLength(3);
    expect(three.mass.loaded).toBe(e4.mass.loaded + 25);
    expect(three.mass.ixx).toBeCloseTo(e4.mass.ixx * (749 / 724), 6);
    expect(three.id).toBe('e4');
  });

  it('is the same object each time, and the standard aircraft is untouched', () => {
    expect(withLoadout(e4, 'immelmann')).toBe(three);
    expect(withLoadout(e4, 'standard')).toBe(e4);
    expect(withLoadout(e4, null)).toBe(e4);
    expect(new GunBank(e4, () => 1).guns).toHaveLength(2);
    expect(e4.mass.loaded).toBe(724);
  });

  it('fires all three guns through the propeller (synchronised)', () => {
    const bank = new GunBank(three, () => 1);
    const shots = fire(bank, 6);
    expect(shots).toBeGreaterThan(2 * 40); // three guns at up to 450 a minute, less the waiting
    expect(shots).toBeLessThanOrEqual(3 * 45);
    expect(new Set(bank.guns.map((g) => g.fired > 0)).has(false)).toBe(false);
  });

  it('climbs a little worse than the standard E.IV', () => {
    const climb = (ac) => {
      const sim = new Simulation();
      const base = sim.start(ac, 1000, 30);
      const h0 = sim.state.position.y;
      for (let i = 0; i < 20 / DT; i++) sim.step(DT, { ...base, throttle: 1, pull: base.pull + 0.03 });
      return sim.state.position.y - h0;
    };
    expect(climb(three)).toBeLessThan(climb(e4));
  });

  it('is the seventh test flight', () => {
    expect(DEV_FLIGHTS).toHaveLength(7);
    expect(DEV_FLIGHTS[6]).toBe(three);
    expect(DEV_FLIGHTS[6].name).toContain('Immelmann');
  });
});
