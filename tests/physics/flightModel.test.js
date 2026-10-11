import { describe, it, expect } from 'vitest';
import { advance, evaluate } from '../../src/physics/flightModel.js';
import { trimLevel, levelState } from '../../src/physics/trim.js';
import { createSurfaces, createInput } from '../../src/physics/controls.js';
import { AIRCRAFT_LIST, AIRCRAFT, common } from '../../src/aircraft/index.js';
import { attitude, startTrimmed, DT, DEG } from '../helpers/flight.js';

// Highest speed (m/s) at which the aircraft can hold level flight at the
// given altitude without full throttle.
function topSpeed(ac, altitude) {
  let best = 0;
  for (let v = 0.6 * ac.documented.maxSpeed; v < 1.4 * ac.documented.maxSpeed; v += 0.25) {
    if (trimLevel(ac, common, altitude, v).surfaces.throttle < 0.999) best = v;
  }
  return best;
}

describe('trim and level flight', () => {
  for (const ac of AIRCRAFT_LIST) {
    describe(ac.name, () => {
      it('can be trimmed for level flight at 80% of top speed', () => {
        const t = trimLevel(ac, common, 1000, 0.8 * ac.documented.maxSpeed);
        expect(t.feasible).toBe(true);
        expect(t.surfaces.throttle).toBeGreaterThan(0.2);
        expect(t.surfaces.throttle).toBeLessThan(0.95);
      });

      it('starts at about 1 g (the aerodynamic load excludes the thrust component)', () => {
        const { state, surfaces } = startTrimmed(ac, 1000);
        expect(evaluate(ac, common, state, surfaces).diag.loadFactor).toBeCloseTo(1, 1);
      });

      it('holds height and speed for 10 s with the controls left alone', () => {
        const { state, surfaces, input } = startTrimmed(ac, 1000);
        const speed0 = state.velocity.length();
        let maxBank = 0;
        let diag;
        for (let i = 0; i < 10 * 120; i++) {
          diag = advance(ac, common, state, surfaces, input, DT);
          maxBank = Math.max(maxBank, Math.abs(attitude(state).bank));
          expect(Math.abs(state.position.y - 1000)).toBeLessThan(5);
        }
        expect(Math.abs(diag.speed - speed0)).toBeLessThan(2);
        expect(maxBank * DEG).toBeLessThan(15);
      });

      it('top speed at sea level is within 5% of the documented figure', () => {
        const v = topSpeed(ac, 0);
        expect(Math.abs(v / ac.documented.maxSpeed - 1)).toBeLessThan(0.05);
      });

      it('is slower at 3,000 m than at sea level (thinner air)', () => {
        expect(topSpeed(ac, 3000)).toBeLessThan(topSpeed(ac, 0));
      });

      // Plausibility only: no climb rate is documented yet (see the gaps list
      // in docs/AIRCRAFT_DATA.md).
      it('can climb at full throttle at a plausible rate (2 to 10 m/s)', () => {
        let best = 0;
        const weight = ac.mass.loaded * 9.80665;
        for (let v = 0.45 * ac.documented.maxSpeed; v <= 0.9 * ac.documented.maxSpeed; v += 1) {
          const t = trimLevel(ac, common, 0, v);
          const s = createSurfaces();
          s.throttle = 1;
          s.trim = t.surfaces.trim;
          const state = levelState(0, v, t.alpha);
          const excess = evaluate(ac, common, state, s).force.z * -1; // horizontal force along the path
          best = Math.max(best, (excess * v) / weight);
        }
        expect(best).toBeGreaterThan(2);
        expect(best).toBeLessThan(10);
      });
    });
  }
});

describe('control authority', () => {
  it('the same aileron gives about four times the roll moment at twice the airspeed', () => {
    const ac = AIRCRAFT.spad13;
    const roll = (speed) => {
      const state = levelState(1000, speed, 0);
      const s = createSurfaces();
      const base = evaluate(ac, common, state, s).moment.x;
      s.roll = 1;
      return evaluate(ac, common, state, s).moment.x - base;
    };
    expect(roll(60) / roll(30)).toBeCloseTo(4, 2);
  });

  it('the same elevator gives about four times the pitch moment at twice the airspeed', () => {
    const ac = AIRCRAFT.camel;
    const pitch = (speed) => {
      const state = levelState(1000, speed, 0);
      const s = createSurfaces();
      const base = evaluate(ac, common, state, s).moment.z;
      s.pull = 1;
      return evaluate(ac, common, state, s).moment.z - base;
    };
    expect(pitch(60) / pitch(30)).toBeCloseTo(4, 2);
  });
});

describe('engine effects on the airframe', () => {
  it('a rotary aircraft feels engine torque; an inline one does not', () => {
    const level = (ac, throttle) => {
      const state = levelState(1000, 40, 0);
      const s = createSurfaces();
      s.throttle = throttle;
      return evaluate(ac, common, state, s).moment.x;
    };
    expect(Math.abs(level(AIRCRAFT.camel, 1))).toBeGreaterThan(100);
    expect(level(AIRCRAFT.spad13, 1)).toBeCloseTo(0, 3);
    expect(level(AIRCRAFT.albatros, 1)).toBeCloseTo(0, 3);
  });

  it('full power rolls a rotary aircraft left (negative roll moment)', () => {
    const state = levelState(1000, 40, 0);
    const s = createSurfaces();
    s.throttle = 1;
    expect(evaluate(AIRCRAFT.camel, common, state, s).moment.x).toBeLessThan(0);
  });
});

describe('determinism and numerical health', () => {
  it('two identical runs give identical results', () => {
    const run = () => {
      const { state, surfaces, input } = startTrimmed(AIRCRAFT.camel, 1500);
      input.roll = 0.3;
      input.pull = 0.2;
      for (let i = 0; i < 5 * 120; i++) advance(AIRCRAFT.camel, common, state, surfaces, input, DT);
      return [state.position.toArray(), state.velocity.toArray(), state.quaternion.toArray()];
    };
    expect(run()).toEqual(run());
  });

  it('keeps the orientation normalised through a violent manoeuvre', () => {
    const { state, surfaces, input } = startTrimmed(AIRCRAFT.dr1, 3000);
    input.throttle = 0;
    for (let i = 0; i < 20 * 120; i++) {
      input.pull = i < 120 ? 0 : 1;
      input.yaw = i > 300 ? -1 : 0;
      advance(AIRCRAFT.dr1, common, state, surfaces, input, DT);
    }
    expect(state.quaternion.length()).toBeCloseTo(1, 8);
    expect(Number.isFinite(state.position.y)).toBe(true);
    expect(state.angularVelocity.length()).toBeLessThan(15);
  });
});

describe('input shape', () => {
  it('createInput gives a neutral stick and full throttle', () => {
    const i = createInput();
    expect(i.pull + i.roll + i.yaw + i.trim).toBe(0);
    expect(i.throttle).toBe(1);
  });
});
