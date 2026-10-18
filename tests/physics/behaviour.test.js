import { describe, it, expect } from 'vitest';
import { AIRCRAFT_LIST, ALL_AIRCRAFT, AIRCRAFT } from '../../src/aircraft/index.js';
import { holdBankTurn, stallAndSpin, DEG } from '../helpers/flight.js';

// These tests lock in the handling behaviour listed in the spec: stall with
// wing drop, rotary-engine turn asymmetry, and spin with recovery.
// The thresholds come from measured runs of the current estimated parameters,
// so they guard against accidental change, not against history.

describe('stall and wing drop', () => {
  for (const ac of ALL_AIRCRAFT) {
    it(`${ac.name}: full back stick at idle stalls within 1 to 3 seconds and drops a wing`, () => {
      const r = stallAndSpin(ac, { seconds: 8 });
      expect(r.firstStall).toBeGreaterThan(1);
      expect(r.firstStall).toBeLessThan(3);
      expect(r.maxBank * DEG).toBeGreaterThan(30); // the wing drops
      expect(r.bankAtMax).toBeLessThan(0); // left wing, from the rigging asymmetry
    });

    // The E.IV's strong all-moving elevator and near-neutral stability bunt it over into an
    // inverted stall if the stick is held forward, so its pilot eases back once the wing flies.
    const easeOff = ac.id === 'e4';
    it(`${ac.name}: stick forward${easeOff ? ' (eased off once flying)' : ''}, throttle open and wings level recovers from the stall`, () => {
      const r = stallAndSpin(ac, { recoverAt: 4, forward: 0.3, seconds: 14, recoverThrottle: 1, levelWings: true, easeOff });
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

  // Sourced: the nose rises in left turns and drops in right turns (S35,
  // S33). With the propeller effects (Phase 2) the Camel shows about 8 deg.
  it('the Camel nose sits lower in a right turn than in a left turn (gyroscopic effect)', () => {
    const t = turns(AIRCRAFT.camel);
    expect(t.left.pitch - t.right.pitch).toBeGreaterThan(5);
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

  // Inline engines have no large spinning mass, so only the small propeller
  // effects (swirl, P-factor) make left and right differ.
  for (const id of ['spad13', 'albatros']) {
    it(`${AIRCRAFT[id].name} turns almost the same left and right (no gyroscopic asymmetry)`, () => {
      const t = turns(AIRCRAFT[id]);
      expect(Math.abs(t.left.pitch - t.right.pitch)).toBeLessThan(3);
      expect(Math.abs(t.left.turnRate / t.right.turnRate - 1)).toBeLessThan(0.02);
    });
  }

  it('a level 60-degree-bank turn pulls about 2 g', () => {
    const t = holdBankTurn(AIRCRAFT.spad13, { side: 1, pull: 0.2 });
    expect(t.loadFactor).toBeGreaterThan(1.6);
    expect(t.loadFactor).toBeLessThan(2.4);
  });
});

describe('spin and spin recovery', () => {
  // A spin counts as steady only if the aircraft keeps rotating (over 2 rad/s)
  // and stays stalled for the whole 12-20 s window, not just at one instant.
  // Only the Camel does so with the current estimates; the others enter a
  // rotation and then recover by themselves (known deviation, see
  // docs/FLIGHT_VALIDATION.md). Full back stick, idle, left rudder.
  const window = (ac) => stallAndSpin(ac, { rudder: -1, seconds: 20, windowFrom: 12 });

  it('Sopwith Camel F.1: full back stick plus left rudder gives a steady spin', () => {
    const r = window(AIRCRAFT.camel);
    expect(r.minYaw).toBeGreaterThan(2);
    expect(r.minStall).toBeGreaterThan(0.9);
    expect(r.maxYaw).toBeLessThan(8); // a plausible spin, not a numerical runaway
  });

  // RAE Farnborough 1918 (S33): the Camel "spun steadily to the left, but in
  // an 'uncertain manner' to the right ... going round in jerks and trying
  // to come out all the time".
  it('Sopwith Camel F.1: a right spin does not settle (jerky), unlike the steady left spin', () => {
    const right = stallAndSpin(AIRCRAFT.camel, { rudder: 1, seconds: 20, windowFrom: 12 });
    expect(right.minYaw).toBeLessThan(1);
    expect(right.maxYaw).toBeGreaterThan(1);
  });

  for (const id of ['spad13', 'dr1', 'albatros']) {
    it.fails(`${AIRCRAFT[id].name}: KNOWN DEVIATION, the spin is transient (it self-recovers)`, () => {
      const r = window(AIRCRAFT[id]);
      expect(r.minYaw).toBeGreaterThan(1);
      expect(r.minStall).toBeGreaterThan(0.9);
    });
  }

  it('every aircraft rotates (incipient spin) at some point with pro-spin controls', () => {
    for (const ac of ALL_AIRCRAFT) {
      const r = window(ac);
      expect(r.maxYaw, ac.name).toBeGreaterThan(0.9);
    }
  });

  // Two standard recoveries: the RAE 1918 technique (stick forward and
  // opposite rudder, S33) and Shuttleworth's "stick forward with rudder
  // central" (S33). Every spin must be recoverable by at least one.
  const recovered = (r) => Math.abs(r.yawRate) < 0.5 && r.stall < 0.2;
  const RAE = { recoverAt: 12, forward: 0.3, seconds: 26 };
  const CENTRAL = { recoverAt: 12, forward: 0.5, seconds: 26, rudderHold: 0 };
  for (const ac of AIRCRAFT_LIST) {
    for (const rudder of [-1, 1]) {
      it(`${ac.name}: a spin (rudder ${rudder > 0 ? 'right' : 'left'}) is recoverable with a standard technique`, () => {
        const ok = recovered(stallAndSpin(ac, { rudder, ...RAE })) || recovered(stallAndSpin(ac, { rudder, ...CENTRAL }));
        expect(ok).toBe(true);
      });
    }
  }

  // The Early War pair also recover, by one of three standard techniques: the two above, or
  // the RAE technique with the opposite rudder released after 3 s (the 1918 trials recovered in
  // about 3 s and found rudder held across could start a spin the other way, S33). Measured: the
  // Nieuport recovers within 14 s; the E.IV's left spin takes up to 40 s (its heavy two-row
  // rotary and slow warping), so it is given that long.
  const RAE3 = { ...RAE, rudderHold: 3 };
  for (const [ac, recovery] of [[AIRCRAFT.n11, 14], [AIRCRAFT.e4, 40]]) {
    for (const rudder of [-1, 1]) {
      it(`${ac.name}: a spin (rudder ${rudder > 0 ? 'right' : 'left'}) is recoverable within ${recovery} s`, () => {
        const seconds = 12 + recovery;
        const ok = [RAE, CENTRAL, RAE3].some((t) => recovered(stallAndSpin(ac, { rudder, ...t, seconds })));
        expect(ok).toBe(true);
      });
    }
  }

  for (const rudder of [-1, 1]) {
    it(`Sopwith Camel F.1: the RAE technique recovers a ${rudder > 0 ? 'right' : 'left'} spin`, () => {
      expect(recovered(stallAndSpin(AIRCRAFT.camel, { rudder, ...RAE }))).toBe(true);
    });
  }

});
