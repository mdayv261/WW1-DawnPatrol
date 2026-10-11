import { describe, it, expect } from 'vitest';
import { AIRCRAFT_LIST, AIRCRAFT } from '../../src/aircraft/index.js';
import { holdBankTurn, stallAndSpin, DEG } from '../helpers/flight.js';

// These tests lock in the handling behaviour listed in the spec: stall with
// wing drop, rotary-engine turn asymmetry, and spin with recovery.
// The thresholds come from measured runs of the current estimated parameters,
// so they guard against accidental change, not against history.

describe('stall and wing drop', () => {
  for (const ac of AIRCRAFT_LIST) {
    it(`${ac.name}: full back stick at idle stalls within 1 to 3 seconds and drops a wing`, () => {
      const r = stallAndSpin(ac, { seconds: 8 });
      expect(r.firstStall).toBeGreaterThan(1);
      expect(r.firstStall).toBeLessThan(3);
      expect(r.maxBank * DEG).toBeGreaterThan(30); // the wing drops
      expect(r.bankAtMax).toBeLessThan(0); // left wing, from the rigging asymmetry
    });

    it(`${ac.name}: stick forward, throttle open and wings level recovers from the stall`, () => {
      const r = stallAndSpin(ac, { recoverAt: 4, forward: 0.3, seconds: 14, recoverThrottle: 1, levelWings: true });
      expect(r.stall).toBeLessThan(0.2);
      expect(r.speed).toBeGreaterThan(25);
    });
  }
});

describe('turns: rotary engine asymmetry (Camel, Dr.I) against inline symmetry (SPAD, Albatros)', () => {
  const turns = (ac) => ({
    right: holdBankTurn(ac, { side: 1, pull: 0.2 }),
    left: holdBankTurn(ac, { side: -1, pull: 0.2 }),
  });

  it('the Camel nose sits lower in a right turn than in a left turn (gyroscopic effect)', () => {
    const t = turns(AIRCRAFT.camel);
    expect(t.left.pitch - t.right.pitch).toBeGreaterThan(8);
  });

  it('the Dr.I shows the same nose-drop in right turns', () => {
    const t = turns(AIRCRAFT.dr1);
    expect(t.left.pitch - t.right.pitch).toBeGreaterThan(5);
  });

  it('the Camel sustained turn rate is similar left and right (within 20%)', () => {
    // Documented behaviour in the Flying magazine account: flight tests found
    // similar sustained rates. See docs/DECISIONS.md.
    const t = turns(AIRCRAFT.camel);
    const ratio = t.right.turnRate / t.left.turnRate;
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.25);
  });

  for (const id of ['spad13', 'albatros']) {
    it(`${AIRCRAFT[id].name} turns identically left and right`, () => {
      const t = turns(AIRCRAFT[id]);
      expect(Math.abs(t.left.pitch - t.right.pitch)).toBeLessThan(0.1);
      expect(Math.abs(t.left.turnRate - t.right.turnRate)).toBeLessThan(0.1);
    });
  }

  it('a level 60-degree-bank turn pulls about 2 g', () => {
    const t = holdBankTurn(AIRCRAFT.spad13, { side: 1, pull: 0.2 });
    expect(t.loadFactor).toBeGreaterThan(1.6);
    expect(t.loadFactor).toBeLessThan(2.4);
  });
});

describe('spin and spin recovery', () => {
  // Spin direction that forms for each aircraft with the current tuning
  // (-1 = left rudder). The Dr.I does not sustain a spin yet (known issue).
  const SPINS = { camel: -1, spad13: -1, albatros: -1 };

  for (const [id, rudder] of Object.entries(SPINS)) {
    const ac = AIRCRAFT[id];
    it(`${ac.name}: full back stick plus rudder enters a sustained spin`, () => {
      const r = stallAndSpin(ac, { rudder, seconds: 16 });
      expect(Math.abs(r.yawRate)).toBeGreaterThan(1);
      expect(r.stall).toBeGreaterThan(0.5);
      expect(Math.abs(r.yawRate)).toBeLessThan(8); // a plausible spin, not a numerical runaway
    });
  }

  for (const ac of AIRCRAFT_LIST) {
    for (const rudder of [-1, 1]) {
      it(`${ac.name}: opposite rudder and stick forward stops the rotation (rudder ${rudder > 0 ? 'right' : 'left'})`, () => {
        const r = stallAndSpin(ac, { rudder, recoverAt: 12, forward: 0.3, seconds: 26 });
        expect(Math.abs(r.yawRate)).toBeLessThan(0.5);
        expect(r.stall).toBeLessThan(0.2);
      });
    }
  }
});
