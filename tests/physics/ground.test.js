import { describe, it, expect } from 'vitest';
import { Simulation } from '../../src/core/simulation.js';
import { AIRCRAFT_LIST, AIRCRAFT, common } from '../../src/aircraft/index.js';
import { gearGeometry } from '../../src/physics/ground.js';
import { stallSpeed } from '../../src/physics/performance.js';
import { levelState } from '../../src/physics/trim.js';
import { createInput } from '../../src/physics/controls.js';
import { attitude, DT, DEG } from '../helpers/flight.js';

// Ground handling (Phase 2): resting, chocks, take-off, landing, nose-over,
// and the propeller's swing on the take-off run.

function parked(ac) {
  const sim = new Simulation();
  const input = { ...sim.startOnGround(ac) };
  return { sim, input };
}

function headingChange(sim, h0) {
  let d = attitude(sim.state).heading - h0;
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

// A scripted take-off: full power, rudder holds the heading, wings level,
// gentle back stick from 0.9 x stall speed. Returns lift-off details.
function takeOff(ac) {
  const { sim, input } = parked(ac);
  const vs = stallSpeed(ac, common, 0);
  const h0 = attitude(sim.state).heading;
  input.throttle = 1;
  let rudderSum = 0;
  let steps = 0;
  for (let i = 0; i < 30 / DT; i++) {
    const a = attitude(sim.state);
    const yawRate = -sim.state.angularVelocity.y;
    input.yaw = Math.max(-1, Math.min(1, -4 * headingChange(sim, h0) - 1.5 * yawRate));
    input.roll = Math.max(-1, Math.min(1, -2 * a.bank - 0.5 * sim.state.angularVelocity.x));
    input.pull = sim.diag && sim.diag.speed > 0.9 * vs ? 0.35 : 0;
    sim.step(DT, input);
    if (sim.crashed) return { crashed: sim.crashReason };
    if (sim.diag.onGround) {
      rudderSum += input.yaw;
      steps += 1;
    } else if (sim.diag.speed > 5) {
      return {
        time: (i + 1) * DT,
        speed: sim.diag.speed,
        distance: Math.hypot(sim.state.position.x, sim.state.position.z),
        vs,
        meanRudder: rudderSum / steps,
      };
    }
  }
  return { noLiftOff: true };
}

// Glide onto the field from `height` m at 1.25 x stall speed with the given
// sink rate, engine at idle, holding the three-point attitude and steering
// straight with the rudder on the roll-out, as a pilot would.
function land(ac, sinkRate, seconds = 40, height = 3) {
  const sim = new Simulation();
  sim.startOnGround(ac);
  const vs = stallSpeed(ac, common, 0);
  const state = levelState(sim.state.position.y + height, 1.25 * vs, ac.gear.groundAngle * 0.6);
  state.velocity.y = -sinkRate;
  for (const k of ['position', 'velocity', 'quaternion', 'angularVelocity']) sim.state[k].copy(state[k]);
  sim.state.chocked = false;
  const input = createInput();
  input.throttle = 0;
  let touched = false;
  const h0 = attitude(sim.state).heading;
  for (let i = 0; i < seconds / DT; i++) {
    const a = attitude(sim.state);
    // Tail-draggers are directionally unstable on the ground; this pilot
    // damps the swing firmly (a lightly damped rudder ground-loops).
    input.yaw = Math.max(-1, Math.min(1, -3 * headingChange(sim, h0) - 6 * -sim.state.angularVelocity.y));
    input.pull = Math.max(-1, Math.min(1, 3 * (ac.gear.groundAngle - a.pitch) - 0.5 * sim.state.angularVelocity.z));
    input.roll = Math.max(-1, Math.min(1, -2 * a.bank - 0.5 * sim.state.angularVelocity.x));
    sim.step(DT, input);
    if (sim.crashed) break;
    if (sim.diag.onGround) touched = true;
  }
  return { sim, touched };
}

describe('ground handling', () => {
  for (const ac of AIRCRAFT_LIST) {
    describe(ac.name, () => {
      it('rests on the field in the three-point attitude, tailskid carrying 10-30% of the weight', () => {
        const { sim } = parked(ac);
        expect(sim.crashed).toBe(false);
        expect(sim.diag.onGround).toBe(true);
        expect(attitude(sim.state).pitch * DEG).toBeCloseTo(ac.gear.groundAngle * DEG, 0);
        const share = gearGeometry(ac, common).tailShare;
        expect(share).toBeGreaterThan(0.1);
        expect(share).toBeLessThan(0.3);
      });

      it('stays chocked at idle, and the chocks come away when the throttle is opened', () => {
        const { sim, input } = parked(ac);
        const start = sim.state.position.clone();
        for (let i = 0; i < 10 / DT; i++) sim.step(DT, input);
        expect(sim.state.position.distanceTo(start)).toBeLessThan(1);
        input.throttle = 1;
        sim.step(DT, input);
        expect(sim.state.chocked).toBe(false);
      });

      it('takes off at full power: lifts off at 1.05-1.35 x stall speed within 250 m', () => {
        const r = takeOff(ac);
        expect(r.crashed).toBeUndefined();
        expect(r.noLiftOff).toBeUndefined();
        expect(r.speed / r.vs).toBeGreaterThan(1.05);
        expect(r.speed / r.vs).toBeLessThan(1.35);
        expect(r.distance).toBeGreaterThan(50);
        expect(r.distance).toBeLessThan(250);
      });

      it('the propeller swings it left under full power, so the take-off needs right rudder', () => {
        // Sources: pilots held right rudder on take-off (secondary sources,
        // see FLIGHT_VALIDATION.md); physically the slipstream swirl and
        // P-factor of a propeller turning clockwise from the cockpit.
        const { sim, input } = parked(ac);
        const h0 = attitude(sim.state).heading;
        input.throttle = 1;
        for (let i = 0; i < 3 / DT; i++) sim.step(DT, input);
        expect(headingChange(sim, h0) * DEG).toBeLessThan(-5);
        expect(takeOff(ac).meanRudder).toBeGreaterThan(0);
      });

      it('a gentle landing (1 m/s sink) survives and rolls to a stop', () => {
        const { sim, touched } = land(ac, 1);
        expect(touched).toBe(true);
        expect(sim.crashed).toBe(false);
        expect(sim.state.velocity.length()).toBeLessThan(3);
      });

      it('a hard landing (5 m/s sink at touchdown) collapses the undercarriage', () => {
        const { sim } = land(ac, 5, 3, 0.3);
        expect(sim.crashed).toBe(true);
        expect(sim.crashReason).toMatch(/Heavy landing/);
      });

      it('full forward stick at full power on the ground noses it over (propeller strike)', () => {
        const { sim, input } = parked(ac);
        input.throttle = 1;
        input.pull = -1;
        for (let i = 0; i < 20 / DT && !sim.crashed; i++) {
          // keep it straight so only the nose-over is tested
          input.yaw = Math.max(-1, Math.min(1, -1.5 * -sim.state.angularVelocity.y));
          sim.step(DT, input);
        }
        expect(sim.crashed).toBe(true);
        expect(sim.crashReason).toMatch(/Propeller strike/);
      });
    });
  }

  it('the ground does not touch an aircraft in the air', () => {
    const sim = new Simulation();
    const input = { ...sim.start(AIRCRAFT.camel) };
    for (let i = 0; i < 120; i++) sim.step(DT, input);
    expect(sim.diag.onGround).toBe(false);
    expect(sim.diag.crash).toBeNull();
  });
});

describe('Camel gyroscopic swing on the take-off run (Canadian Museum of Flight, S18)', () => {
  // "Just raising the tail ... would cause a swerve to the left. As the nose
  // was raised to lift off ... the aircraft would 'kick' to the right."
  // Raising the tail is a nose-down pitch rate; lifting off a nose-up one.
  const yawResponse = (ac, pitchRate) => {
    const { sim, input } = parked(ac);
    input.throttle = 1;
    for (let i = 0; i < 2 / DT; i++) sim.step(DT, input); // rolling
    const before = -sim.state.angularVelocity.y;
    sim.state.angularVelocity.z = pitchRate;
    sim.step(DT, input);
    return -sim.state.angularVelocity.y - before; // + = towards the right
  };

  it('raising the tail swings the Camel left; raising the nose kicks it right', () => {
    expect(yawResponse(AIRCRAFT.camel, -0.5)).toBeLessThan(0);
    expect(yawResponse(AIRCRAFT.camel, 0.5)).toBeGreaterThan(0);
  });
});

