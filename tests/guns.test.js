import { describe, it, expect } from 'vitest';
import { AIRCRAFT_LIST } from '../src/aircraft/index.js';
import { GUN_TYPES, SYNC } from '../src/aircraft/weapons.js';
import { GunBank, seededRandom } from '../src/weapons/guns.js';

// The guns: ammunition, rate of fire, the synchroniser and stoppages.

const DT = 1 / 120;

// Hold the trigger for `seconds` at a propeller speed; returns the bank and the shots.
function fire(ac, rpm, seconds, rng = seededRandom(3), tweak = () => {}) {
  const bank = new GunBank(ac, rng);
  tweak(bank);
  const shots = [];
  for (let i = 0; i < seconds / DT; i++) shots.push(...bank.update(DT, true, rpm));
  return { bank, shots };
}

// Make the guns never jam, so rate tests are clean.
const noJams = (bank) => { bank.type = { ...bank.type, jamPerRound: 0 }; };

describe('the guns of each aircraft', () => {
  for (const ac of AIRCRAFT_LIST) {
    describe(ac.name, () => {
      it('has two guns, left and right of the centre line, with the documented belts', () => {
        const bank = new GunBank(ac);
        expect(bank.guns.length).toBe(2);
        expect(bank.guns[0].muzzle.z).toBeCloseTo(-ac.guns.muzzleZ, 9);
        expect(bank.guns[1].muzzle.z).toBeCloseTo(ac.guns.muzzleZ, 9);
        expect(bank.guns[0].muzzle.x).toBe(ac.guns.muzzleX);
        expect(bank.roundsLeft).toEqual([ac.guns.rounds, ac.guns.rounds]);
        expect(bank.type).toBe(GUN_TYPES[ac.guns.type]);
        expect(ac.side === 'Allied' ? 'vickers' : 'lmg0815').toBe(ac.guns.type);
      });

      it('the muzzles are inside the propeller disc, so the synchroniser is needed', () => {
        for (const g of new GunBank(ac).guns) expect(Math.hypot(g.muzzle.y, g.muzzle.z)).toBeLessThan(ac.propeller.diameter / 2);
      });

      it('never fires faster than the gun\'s own rate, at any engine speed', () => {
        const cyclic = GUN_TYPES[ac.guns.type].cyclicRate;
        for (const rpm of [0, 300, 700, 1200, 1500]) {
          const { shots } = fire(ac, rpm, 6, seededRandom(1), noJams);
          const perGun = shots.filter((s) => s.gun === 0).length / 6;
          expect(perGun * 60, `${rpm} rpm`).toBeLessThanOrEqual(cyclic * 1.02 + 10);
        }
      });

      it('at cruise engine speed the rate is close to the cyclic rate, and a little below it', () => {
        const cyclic = GUN_TYPES[ac.guns.type].cyclicRate;
        const rpm = (ac.engine.ratedRpm * 0.9) * ac.propeller.gearRatio;
        const { shots } = fire(ac, rpm, 10, seededRandom(1), noJams);
        const perMinute = (shots.filter((s) => s.gun === 1).length / 10) * 60;
        expect(perMinute).toBeGreaterThan(0.8 * cyclic);
        expect(perMinute).toBeLessThanOrEqual(cyclic + 1);
      });
    });
  }
});

describe('the synchroniser', () => {
  const ac = AIRCRAFT_LIST[0];

  it('blocks a shot when a blade is in front of the muzzle and allows it half a turn of blades later', () => {
    const bank = new GunBank(ac);
    const g = bank.guns[1];
    const theta = Math.atan2(g.muzzle.z, g.muzzle.y);
    bank.propAngle = theta; // a blade points straight at the muzzle
    expect(bank.blocked(g)).toBe(true);
    bank.propAngle = theta + Math.PI; // the other blade
    expect(bank.blocked(g)).toBe(true);
    bank.propAngle = theta + Math.PI / 2; // between the blades
    expect(bank.blocked(g)).toBe(false);
  });

  it('the blocked arc is the blade width plus the margin on each side', () => {
    const bank = new GunBank(ac);
    const g = bank.guns[1];
    const theta = Math.atan2(g.muzzle.z, g.muzzle.y);
    const r = Math.hypot(g.muzzle.y, g.muzzle.z);
    const half = Math.atan2(ac.propeller.chord / 2, r) + SYNC.bladeMargin;
    bank.propAngle = theta + half * 0.95;
    expect(bank.blocked(g)).toBe(true);
    bank.propAngle = theta + half * 1.05;
    expect(bank.blocked(g)).toBe(false);
  });

  it('with a blade stopped in front of a muzzle, that gun cannot fire at all', () => {
    const { shots } = fire(ac, 0, 2, seededRandom(1), (bank) => {
      noJams(bank);
      const g = bank.guns[1];
      bank.propAngle = Math.atan2(g.muzzle.z, g.muzzle.y);
    });
    expect(shots.filter((s) => s.gun === 1).length).toBe(0);
  });

  it('with the propeller stopped between the blades, the guns fire at exactly the cyclic rate', () => {
    const cyclic = GUN_TYPES[ac.guns.type].cyclicRate;
    const { shots } = fire(ac, 0, 6, seededRandom(1), (bank) => {
      noJams(bank);
      bank.propAngle = Math.PI / 2;
    });
    expect(shots.filter((s) => s.gun === 0).length).toBeCloseTo((cyclic / 60) * 6, -0.3);
  });

  it('every shot leaves while no blade covers its muzzle (checked at the moment of each shot, propeller turning)', () => {
    const bank = new GunBank(ac, seededRandom(2));
    noJams(bank);
    const rpm = 1150;
    const omega = (rpm / 60) * 2 * Math.PI;
    let fired = 0;
    for (let i = 0; i < 120 * 4; i++) {
      const shots = bank.update(DT, true, rpm);
      const end = bank.propAngle;
      for (const s of shots) {
        // Where the propeller was when this round left: the end angle wound back by the time since.
        bank.propAngle = end - omega * s.age;
        expect(bank.blocked(bank.guns[s.gun])).toBe(false);
        fired++;
      }
      bank.propAngle = end;
    }
    expect(fired).toBeGreaterThan(50);
  });

  it('the rate falls as the engine runs slower (longer waits for a gap)', () => {
    const rate = (rpm) => fire(ac, rpm, 10, seededRandom(1), noJams).shots.filter((s) => s.gun === 0).length / 10;
    expect(rate(200)).toBeLessThan(rate(1200));
    expect(rate(1200)).toBeGreaterThan(7); // about 8.3 per gun per second at 500 per minute
  });

  it('the propeller angle follows the engine speed', () => {
    const bank = new GunBank(ac);
    for (let i = 0; i < 120; i++) bank.update(DT, false, 600); // one second at 600 rpm = 10 turns
    const turns = (10 * 2 * Math.PI) % (2 * Math.PI);
    const diff = Math.abs(((bank.propAngle - turns + Math.PI) % (2 * Math.PI)) - Math.PI);
    expect(Math.min(diff, 2 * Math.PI - diff)).toBeLessThan(1e-6);
  });
});

describe('ammunition', () => {
  it('counts down, stops at zero and never goes negative', () => {
    const ac = AIRCRAFT_LIST[0];
    const { bank, shots } = fire(ac, 1200, 80, seededRandom(1), noJams);
    expect(bank.roundsLeft).toEqual([0, 0]);
    expect(shots.length).toBe(2 * ac.guns.rounds);
    expect(bank.guns[0].state).toBe('empty');
    expect(bank.statusText()).toBe('EMPTY  |  EMPTY');
  });

  it('a gun fires only the rounds in its own belt: 250 for the Camel, 400 for the SPAD, 500 for the German aircraft', () => {
    expect(AIRCRAFT_LIST.map((a) => a.guns.rounds)).toEqual([250, 400, 500, 500]);
  });

  it('every third round is a tracer, with the rounds counted over both guns', () => {
    const { shots } = fire(AIRCRAFT_LIST[0], 1200, 3, seededRandom(1), noJams);
    shots.forEach((s, i) => expect(s.tracer).toBe((i + 1) % 3 === 0));
  });

  it('shots carry the right cartridge and the time they have been in the air this step', () => {
    const { shots } = fire(AIRCRAFT_LIST[2], 1200, 1, seededRandom(1), noJams);
    expect(shots[0].cartridge.name).toContain('7.92');
    for (const s of shots) {
      expect(s.age).toBeGreaterThanOrEqual(0);
      expect(s.age).toBeLessThan(DT);
    }
  });

  it('no shots without the trigger', () => {
    const bank = new GunBank(AIRCRAFT_LIST[0]);
    for (let i = 0; i < 240; i++) expect(bank.update(DT, false, 1200).length).toBe(0);
  });
});

describe('stoppages', () => {
  const ac = AIRCRAFT_LIST[0];
  const always = () => 0; // a random number that is always below every chance: it always jams, and a clearing attempt always works
  const never = () => 0.999; // never jams, and a clearing attempt always fails

  it('a jam stops that gun after the round that caused it; the other gun jams on its own chance', () => {
    const bank = new GunBank(ac, always);
    bank.update(DT, true, 1200);
    for (let i = 0; i < 120; i++) bank.update(DT, true, 1200);
    expect(bank.guns[0].jammed).toBe(true);
    expect(bank.guns[0].fired).toBe(1);
    expect(bank.guns[0].state).toBe('jammed');
    expect(bank.statusText()).toContain('JAMMED');
  });

  it('B (clearJam) takes the clearing time, then the gun works again', () => {
    const bank = new GunBank(ac, always);
    for (let i = 0; i < 20; i++) bank.update(DT, true, 1200);
    expect(bank.guns[0].jammed).toBe(true);
    bank.clearJam();
    expect(bank.guns[0].state).toBe('clearing');
    // While clearing, the trigger does nothing.
    const steps = Math.round(GUN_TYPES.vickers.clearTime / DT);
    for (let i = 0; i < steps - 3; i++) {
      expect(bank.update(DT, true, 1200).length).toBe(0);
      expect(bank.guns[0].jammed).toBe(true);
    }
    for (let i = 0; i < 6; i++) bank.update(DT, false, 1200);
    expect(bank.guns[0].jammed).toBe(false);
    expect(bank.guns[0].clearing).toBe(0);
    bank.rng = never;
    const more = [];
    for (let i = 0; i < 60; i++) more.push(...bank.update(DT, true, 1200));
    expect(more.filter((s) => s.gun === 0).length).toBeGreaterThan(2);
  });

  it('a clearing attempt can fail, and then the gun is still jammed', () => {
    const bank = new GunBank(ac, always);
    for (let i = 0; i < 20; i++) bank.update(DT, true, 1200);
    bank.rng = never;
    bank.clearJam();
    for (let i = 0; i < 120 * 4; i++) bank.update(DT, false, 1200);
    expect(bank.guns[0].jammed).toBe(true);
    expect(bank.guns[0].clearing).toBe(0);
    bank.clearJam(); // and the pilot can try again
    expect(bank.guns[0].state).toBe('clearing');
  });

  it('clearing a gun that is not jammed does nothing', () => {
    const bank = new GunBank(ac, never);
    bank.clearJam();
    expect(bank.guns.every((g) => g.state === 'ready')).toBe(true);
  });

  it('over a long burst about one round in 400 jams a gun (the estimate in the data)', () => {
    let jams = 0;
    let rounds = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const bank = new GunBank(AIRCRAFT_LIST[2], seededRandom(seed));
      for (let i = 0; i < 120 * 30; i++) {
        const before = bank.guns.map((g) => g.jammed);
        bank.update(DT, true, 1200);
        bank.guns.forEach((g, k) => { if (g.jammed && !before[k]) { jams++; g.jammed = false; } });
      }
      rounds += bank.guns[0].fired + bank.guns[1].fired;
    }
    const perRound = jams / rounds;
    expect(perRound).toBeGreaterThan(0.0015);
    expect(perRound).toBeLessThan(0.0035);
  });
});

describe('seededRandom', () => {
  it('gives the same numbers for the same seed, all between 0 and 1', () => {
    const a = seededRandom(9);
    const b = seededRandom(9);
    for (let i = 0; i < 20; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    expect(seededRandom(10)()).not.toBe(seededRandom(9)());
  });
});
