import { describe, it, expect } from 'vitest';
import { Simulation } from '../src/core/simulation.js';
import { AIRCRAFT_LIST, AIRCRAFT, common } from '../src/aircraft/index.js';
import { startScenario, attitude, turnRate, SCENARIOS } from '../src/dev/flightScenarios.js';
import { topSpeed } from '../src/physics/performance.js';
import { InputMapper } from '../src/input/inputMapper.js';

// The temporary F4 test-panel scenarios (development builds only). They must
// set up what their buttons say, using only the pilot's controls.

const DT = 1 / 120;
const DEG = 180 / Math.PI;

// Fly a scenario for `seconds`; onStep(t, sim, runner) is called after each step.
function fly(ac, id, seconds, onStep = () => {}) {
  const sim = new Simulation();
  const { input, runner } = startScenario(sim, ac, id);
  for (let i = 0; i < seconds / DT; i++) {
    runner.apply(input, DT);
    sim.step(DT, input);
    onStep((i + 1) * DT, sim, runner, input);
  }
  return { sim, runner, input };
}

describe('F4 test panel scenarios', () => {
  it('offers the six requested scenarios', () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(['level', 'full', 'stall', 'turnLeft', 'turnRight', 'spin']);
  });

  for (const ac of AIRCRAFT_LIST) {
    describe(ac.name, () => {
      it('level flight: starts trimmed at 1,000 m and holds height within 10 m for 10 s', () => {
        let worst = 0;
        const { runner } = fly(ac, 'level', 10, (t, sim) => {
          worst = Math.max(worst, Math.abs(sim.state.position.y - 1000));
        });
        expect(worst).toBeLessThan(10);
        expect(runner.active).toBe(false); // no scripted pilot
      });

      it('full throttle: runs at 100% and settles within 2% of the model top speed at 1,000 m', () => {
        const target = topSpeed(ac, common, 1000);
        const { sim, input } = fly(ac, 'full', 20);
        expect(input.throttle).toBe(1);
        expect(Math.abs(sim.diag.speed / target - 1)).toBeLessThan(0.02);
        expect(Math.abs(sim.state.position.y - 1000)).toBeLessThan(30);
      });

      it('stall: reaches a full stall within 4 s, then hands control back', () => {
        let stalledAt = null;
        let handedBackAt = null;
        fly(ac, 'stall', 10, (t, sim, runner) => {
          if (stalledAt === null && sim.diag.stall > 0.9) stalledAt = t;
          if (handedBackAt === null && !runner.active) handedBackAt = t;
        });
        expect(stalledAt).not.toBeNull();
        expect(stalledAt).toBeLessThan(4);
        expect(handedBackAt).not.toBeNull();
      });

      for (const [id, side] of [['turnLeft', -1], ['turnRight', 1]]) {
        it(`${id}: full power, holds 60 degrees bank and turns the right way`, () => {
          let heading0 = null;
          let bankAt5 = null;
          let turned = 0;
          let previous = null;
          let turnRateAtEnd = 0;
          fly(ac, id, 8, (t, sim) => {
            turnRateAtEnd = turnRate(sim.state);
            const a = attitude(sim.state);
            if (heading0 === null) heading0 = a.heading;
            if (previous !== null) {
              let d = a.heading - previous;
              if (d > Math.PI) d -= 2 * Math.PI;
              if (d < -Math.PI) d += 2 * Math.PI;
              turned += d;
            }
            previous = a.heading;
            if (bankAt5 === null && t >= 5) bankAt5 = a.bank * DEG;
          });
          expect(Math.abs(bankAt5 - side * 60)).toBeLessThan(5);
          expect(Math.sign(turned)).toBe(side);
          // The panel's turn-rate readout agrees with the heading change.
          expect(Math.sign(turnRateAtEnd)).toBe(side);
          expect(Math.abs(turnRateAtEnd * DEG)).toBeGreaterThan(10);
        });
      }

      it('spin: pro-spin controls make the aircraft rotate', () => {
        let maxYaw = 0;
        fly(ac, 'spin', 11, (t, sim) => {
          maxYaw = Math.max(maxYaw, Math.abs(sim.state.angularVelocity.y));
        });
        expect(maxYaw).toBeGreaterThan(0.9);
      });
    });
  }

  it('spin: the Camel is still spinning when the scripted pilot lets go', () => {
    let yawAtRelease = null;
    fly(AIRCRAFT.camel, 'spin', 12, (t, sim, runner) => {
      if (yawAtRelease === null && !runner.active) yawAtRelease = Math.abs(sim.state.angularVelocity.y);
    });
    expect(yawAtRelease).toBeGreaterThan(2);
  });

  it('cancelling hands control back immediately and the script stops moving the controls', () => {
    const sim = new Simulation();
    const { input, runner } = startScenario(sim, AIRCRAFT.camel, 'turnRight');
    for (let i = 0; i < 60; i++) {
      runner.apply(input, DT);
      sim.step(DT, input);
    }
    runner.cancel();
    expect(runner.active).toBe(false);
    input.roll = 0;
    runner.apply(input, DT);
    expect(input.roll).toBe(0);
  });

  it('a held flight key counts as the pilot taking over; other keys do not', () => {
    const m = new InputMapper();
    expect(m.pilotActive()).toBe(false);
    m.press('KeyR');
    expect(m.pilotActive()).toBe(false);
    m.press('ArrowLeft');
    expect(m.pilotActive()).toBe(true);
  });
});
