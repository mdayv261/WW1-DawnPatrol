import { describe, it, expect } from 'vitest';
import { AIRCRAFT } from '../src/aircraft/index.js';
import { Combat } from '../src/game/combat.js';
import { createDamage } from '../src/physics/damage.js';
import { combatText, combatLines } from '../src/ui/combatHud.js';

// The fight's on-screen text.

const fresh = () => {
  const c = new Combat();
  c.reset(AIRCRAFT.camel);
  return c;
};

describe('the status line', () => {
  it('is empty before a flight and shows the belts and the fuel in one', () => {
    expect(combatText(new Combat())).toBe('');
    const c = fresh();
    expect(combatText(c)).toBe('GUNS  250  |  250     NEW ENEMIES: DRONE');
    expect(combatText(c, createDamage())).toBe('GUNS  250  |  250     FUEL 100%     NEW ENEMIES: DRONE');
  });

  it('shows stoppages and empty belts', () => {
    const c = fresh();
    c.gunBank.guns[0].jammed = true;
    c.gunBank.guns[1].rounds = 0;
    expect(combatText(c)).toContain('GUNS  JAMMED  |  EMPTY');
    c.gunBank.guns[0].clearing = 2;
    expect(combatText(c)).toContain('CLEARING');
  });

  it('warns of each kind of damage to the player\'s own aircraft', () => {
    const c = fresh();
    const d = createDamage();
    d.engine = 0.4;
    expect(combatText(c, d)).toContain('ENGINE DAMAGED');
    d.engine = 1;
    expect(combatText(c, d)).toContain('ENGINE SEIZED');
    d.tank = 0.5;
    expect(combatText(c, d)).toContain('FUEL LEAK');
    d.fuel = 0;
    expect(combatText(c, d)).toContain('FUEL 0%');
    expect(combatText(c, d)).not.toContain('FUEL LEAK');
    d.failed.R = true;
    d.pilot = 0.5;
    d.cables.rudder = 0;
    const text = combatText(c, d);
    for (const w of ['WING FAILED', 'PILOT WOUNDED', 'CABLE CUT']) expect(text).toContain(w);
    d.pilot = 1;
    expect(combatText(c, d)).toContain('PILOT KILLED');
  });

  it('counts targets and kills once there have been any', () => {
    const c = fresh();
    expect(combatText(c)).not.toContain('ENEMIES 0');
    c.kills = 2;
    expect(combatText(c)).toContain('ENEMIES 0     DOWN 2');
  });
});

describe('the F3 lines', () => {
  it('give the guns, the shots and hits with the percentage, and the targets', () => {
    const c = fresh();
    expect(combatLines(new Combat())).toEqual([]);
    c.shotsFired = 40;
    c.hitsOnTargets = 10;
    c.kills = 1;
    const lines = combatLines(c);
    expect(lines[0]).toContain('250  |  250');
    expect(lines[1]).toContain('fired     40   hits 10 (25%)');
    expect(lines[2]).toContain('shot down 1');
    expect(lines[2]).toContain('new: Drone');
  });
});
