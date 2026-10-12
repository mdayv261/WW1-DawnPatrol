import { describe, it, expect } from 'vitest';
import { Vector3, Quaternion } from 'three';
import { Simulation } from '../src/core/simulation.js';
import { AIRCRAFT_LIST } from '../src/aircraft/index.js';
import { DAMAGE } from '../src/aircraft/damageModel.js';
import { Pilot, directionFrom } from '../src/ai/steering.js';
import { attitude } from '../src/dev/flightScenarios.js';

// The AI pilot's hands: the same controls a person has, flying a wanted direction and speed.

const DT = 1 / 120;
const DEG = 180 / Math.PI;
const angleDiff = (a, b) => ((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

function fly(ac, { seconds, want, setup = () => {}, altitude = 1500, speed = 0.75 * ac.documented.maxSpeed, solidAt = null }) {
  const sim = new Simulation();
  sim.start(ac, altitude, speed);
  setup(sim);
  const pilot = new Pilot(ac);
  const log = { maxStall: 0, maxLoad: 0, minY: Infinity, maxY: -Infinity, maxEas: 0, inputs: [] };
  for (let i = 0; i < seconds / DT && !sim.crashed; i++) {
    const w = typeof want === 'function' ? want(i * DT, sim) : want;
    const input = pilot.steer(sim, w, DT, solidAt);
    log.inputs.push(input);
    sim.step(DT, input);
    log.maxStall = Math.max(log.maxStall, sim.diag.stall);
    log.maxLoad = Math.max(log.maxLoad, sim.diag.loadFactor);
    log.minY = Math.min(log.minY, sim.state.position.y);
    log.maxY = Math.max(log.maxY, sim.state.position.y);
    log.maxEas = Math.max(log.maxEas, sim.diag.speed * Math.sqrt(sim.diag.density));
  }
  return { sim, pilot, ...log };
}

for (const ac of AIRCRAFT_LIST) {
  const v = 0.75 * ac.documented.maxSpeed;
  const level = (heading) => ({ dir: directionFrom(heading, 0), speed: v, gShare: 0.9 });

  describe(ac.name, () => {
    it('holds a heading and height in level flight', () => {
      const r = fly(ac, { seconds: 20, want: level(0) });
      expect(Math.abs(angleDiff(attitude(r.sim.state).heading, 0)) * DEG).toBeLessThan(2);
      expect(r.maxY - r.minY).toBeLessThan(10);
      expect(r.maxStall).toBeLessThan(0.02);
    });

    for (const [name, heading] of [['right 90', Math.PI / 2], ['left 90', -Math.PI / 2], ['round to 180', Math.PI]]) {
      it(`turns ${name} degrees and settles on the heading, with no stall and little height lost`, () => {
        const r = fly(ac, { seconds: 45, want: level(heading) });
        expect(Math.abs(angleDiff(attitude(r.sim.state).heading, heading)) * DEG, 'heading error').toBeLessThan(3);
        expect(r.maxStall, 'stall').toBeLessThan(0.15);
        expect(1500 - r.minY, 'height lost').toBeLessThan(180);
        expect(Math.abs(attitude(r.sim.state).bank) * DEG).toBeLessThan(5); // wings level again
        expect(r.sim.crashed).toBe(false);
      });
    }

    it('climbs 100 m onto a new height without losing much speed', () => {
      const r = fly(ac, { seconds: 60, want: (t, sim) => ({ dir: directionFrom(0, Math.max(-0.1, Math.min(0.15, (1600 - sim.state.position.y) / 150))), speed: 0.7 * ac.documented.maxSpeed, gShare: 0.9 }) });
      expect(Math.abs(r.sim.state.position.y - 1600)).toBeLessThan(15);
      expect(r.sim.diag.speed).toBeGreaterThan(0.6 * ac.documented.maxSpeed);
    });

    it('holds its speed: the throttle brings it to the wanted speed within 3 m/s', () => {
      const wanted = 0.65 * ac.documented.maxSpeed;
      const r = fly(ac, { seconds: 40, want: { dir: directionFrom(0, 0), speed: wanted, gShare: 0.9 } });
      expect(Math.abs(r.sim.diag.speed - wanted)).toBeLessThan(3);
    });

    it('never dives faster than the wings can take, even when told to dive into the ground', () => {
      const r = fly(ac, { seconds: 40, want: { dir: directionFrom(0, -0.7), speed: v, gShare: 0.9 } });
      expect(r.maxEas).toBeLessThan(ac.structure.neverExceedSpeed);
      expect(r.sim.damage.wing).toEqual({ L: 0, R: 0 });
      expect(r.sim.crashed).toBe(false);
      expect(r.sim.state.position.y).toBeGreaterThan(100); // and it levels out above the floor
    });

    it('pulls out of a 45 degree dive from 250 m above the ground', () => {
      const r = fly(ac, {
        seconds: 20, altitude: 250, want: { dir: directionFrom(0, -0.5), speed: v, gShare: 0.9 },
        setup: (sim) => {
          sim.state.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -0.785));
          sim.state.velocity.set(0, -0.707 * v, -0.707 * v);
        },
      });
      expect(r.sim.crashed).toBe(false);
      expect(r.minY).toBeGreaterThan(30);
      expect(r.sim.state.velocity.y).toBeGreaterThan(-1); // out of the dive
    });

    it('rolls upright and recovers from inverted flight at 400 m', () => {
      const r = fly(ac, {
        seconds: 20, altitude: 400, want: level(0),
        setup: (sim) => sim.state.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI)),
      });
      expect(r.sim.crashed).toBe(false);
      expect(Math.abs(attitude(r.sim.state).bank) * DEG).toBeLessThan(20);
      expect(r.minY).toBeGreaterThan(200);
    });

    it('climbs away from a line of trees ahead when it is low', () => {
      // A wall of trees 25 m high across the path, 400 m ahead (north is -Z).
      const wall = (x, y, z) => (y < 25 && z < -400 && z > -420 ? 'Hit a tree' : null);
      const r = fly(ac, { seconds: 15, altitude: 30, want: { dir: directionFrom(0, 0), speed: v, gShare: 0.9 }, solidAt: wall });
      expect(r.sim.crashed).toBe(false);
      expect(r.sim.state.position.y).toBeGreaterThan(100);
    });

    it('only ever gives the controls a person has, within their ranges, and stays inside the aircraft\'s limits', () => {
      const r = fly(ac, { seconds: 60, want: (t) => ({ dir: directionFrom(Math.sin(t / 5) * 3, 0.1 * Math.sin(t / 3)), speed: v, gShare: 0.8 }) });
      for (const i of r.inputs) {
        expect(Object.keys(i).sort()).toEqual(['fire', 'pull', 'roll', 'throttle', 'trim', 'yaw']);
        for (const k of ['pull', 'roll', 'yaw', 'trim']) expect(Math.abs(i[k])).toBeLessThanOrEqual(1);
        expect(i.throttle).toBeGreaterThanOrEqual(0);
        expect(i.throttle).toBeLessThanOrEqual(1);
      }
      expect(r.maxLoad).toBeLessThan(ac.structure.ultimateLoad / DAMAGE.safetyFactor + 0.5);
      expect(r.maxEas).toBeLessThan(ac.structure.neverExceedSpeed);
      expect(r.sim.aircraft).toBe(ac); // the very same aircraft data the player flies
    });
  });
}

describe('the pilot\'s load limit', () => {
  it('is a share of the structural limit, and no more than the wing can lift at this speed', () => {
    const ac = AIRCRAFT_LIST[0];
    const sim = new Simulation();
    sim.start(ac, 1500);
    sim.step(DT, sim.startInput);
    const pilot = new Pilot(ac);
    const limit = ac.structure.ultimateLoad / DAMAGE.safetyFactor;
    expect(pilot.maxLoad(sim, 0.5)).toBeCloseTo(0.5 * limit, 6);
    expect(pilot.maxLoad(sim, 2)).toBeLessThan(2 * limit); // held back by the wing at this speed
    sim.diag = { ...sim.diag, dynamicPressure: 50 }; // very slow: the wing cannot lift more than 1 g
    expect(pilot.maxLoad(sim, 1)).toBe(1);
  });
});
