import { describe, it, expect } from 'vitest';
import { MatchSim } from '../../src/mp/matchSim.js';
import { spawnPoint } from '../../src/mp/spawn.js';
import { WorldSolids } from '../../src/mp/worldSolids.js';
import { createWorld } from '../../src/world/layout.js';
import { attitude } from '../../src/dev/flightScenarios.js';
import { Simulation } from '../../src/core/simulation.js';
import { AIRCRAFT } from '../../src/aircraft/index.js';
import { quantiseInput, decodeSnapshot, captureState } from '../../src/mp/binary.js';
import { DEFAULT_SETTINGS, TICK_MS, RESPAWN_S, TICK_HZ, MAX_TICKS_PER_CALLBACK } from '../../src/mp/netConfig.js';
import { tileTrees } from '../../src/world/obstacles.js';

const world = createWorld();
const settings = { ...DEFAULT_SETTINGS };
const players = [
  { id: 'p1', slot: 1, name: 'Max', team: 'central', aircraft: 'dr1' },
  { id: 'p2', slot: 2, name: 'Albert', team: 'allied', aircraft: 'camel' },
  { id: 'p3', slot: 3, name: 'Werner', team: 'central', aircraft: 'albatros' },
];
function match(s = settings, list = players) {
  const m = new MatchSim({ settings: s, world, now: 0 });
  for (const p of list) m.addPlayer(p);
  return m;
}
const deg = (r) => (r * 180) / Math.PI;

describe('match: where aircraft appear', () => {
  it('in the air, each team behind its own side of the front, at the host\'s height, facing the front', () => {
    const m = match();
    const front = world.frontX(0);
    for (const p of m.players.values()) {
      const s = p.sim.state;
      expect(s.position.y).toBeCloseTo(2000, 0);
      const a = attitude(s);
      if (p.team === 'allied') {
        expect(s.position.x).toBeLessThan(front - 2500);
        expect(deg(a.heading)).toBeCloseTo(90, 0); // east, toward the front
        expect(s.velocity.x).toBeGreaterThan(30);
      } else {
        expect(s.position.x).toBeGreaterThan(front + 2500);
        expect(deg(a.heading) < 0 ? deg(a.heading) + 360 : deg(a.heading)).toBeCloseTo(270, 0); // west
        expect(s.velocity.x).toBeLessThan(-30);
      }
    }
    const [dr1, , albatros] = [...m.players.values()];
    const apart = dr1.sim.state.position.distanceTo(albatros.sim.state.position);
    expect(apart).toBeGreaterThan(295); // team-mates 300 m apart (the front line wanders a little)
    expect(apart).toBeLessThan(320);
  });

  it('on the airfield: parked on their own side\'s field, apart, facing along it', () => {
    const m = match({ ...settings, start: 'airfield' });
    for (const p of m.players.values()) {
      const s = p.sim.state;
      expect(s.position.y).toBeLessThan(3);
      expect(s.velocity.length()).toBeLessThan(0.5);
      const near = world.airfieldsNear(s.position.x, s.position.z, 600).filter((af) => world.inAirfield(s.position.x, s.position.z));
      expect(near.length).toBeGreaterThan(0);
      expect(near[0].side).toBe(p.team === 'allied' ? 'allied' : 'german');
    }
    const pts = [0, 1].map((i) => spawnPoint(world, { start: 'airfield' }, 'central', i));
    expect(Math.hypot(pts[0].x - pts[1].x, pts[0].z - pts[1].z)).toBeCloseTo(30, 3);
  });
});

describe('match: controls and ticks', () => {
  it('runs 120 ticks and 30 snapshots per player each second of real time', () => {
    const m = match();
    let snaps = 0;
    for (let t = 16; t <= 1000; t += 16) snaps += m.advanceTo(t).snapshots.length;
    snaps += m.advanceTo(1000).snapshots.length;
    expect(m.tick).toBe(119); // 1000 ms / (1000/120) = 120 due, minus rounding of the last
    expect(snaps).toBe(29 * 3);
  });

  it('a stalled server drops the backlog instead of racing', () => {
    const m = match();
    m.advanceTo(5000);
    expect(m.tick).toBe(MAX_TICKS_PER_CALLBACK);
    m.advanceTo(5000 + TICK_MS * 2);
    expect(m.tick).toBe(MAX_TICKS_PER_CALLBACK + 2);
  });

  it('uses each control for its own tick, repeats the last when one is missing, and drops late and far-future ones', () => {
    const m = match(settings, [players[0]]);
    const p = m.players.get('p1');
    const left = quantiseInput({ pull: 0, roll: -1, yaw: 0, throttle: 1, trim: 0 });
    const right = quantiseInput({ ...left, roll: 1 });
    m.receiveInputs('p1', { firstTick: 3, viewTick: 0, inputs: [left, right] }); // ticks 3 and 4
    expect(p.lead).toBe(2);
    m.receiveInputs('p1', { firstTick: m.tick + TICK_HZ + 5, viewTick: 0, inputs: [right] }); // too far ahead
    expect(p.inputs.size).toBe(2);
    for (let i = 0; i < 6; i++) m.step();
    expect(p.last).toEqual(right); // tick 4's control, repeated for 5 and 6
    m.receiveInputs('p1', { firstTick: 2, viewTick: 0, inputs: [left] }); // late
    expect(p.inputs.size).toBe(0);
    expect(p.lead).toBe(-5);
  });

  it('with no controls for half a second (a hidden tab), stick and rudder are centred and the throttle kept', () => {
    const m = match(settings, [players[0]]);
    const p = m.players.get('p1');
    const turn = quantiseInput({ pull: 0.8, roll: -1, yaw: 0.5, throttle: 0.7, trim: 0.1 });
    m.receiveInputs('p1', { firstTick: 1, viewTick: 0, inputs: [turn] });
    for (let i = 0; i < 30; i++) m.step();
    expect(p.last).toEqual(turn); // a short gap: the last control is held
    for (let i = 0; i < TICK_HZ; i++) m.step();
    expect(p.last).toMatchObject({ pull: 0, roll: 0, yaw: 0, throttle: turn.throttle, trim: turn.trim });
  });

  it('the server flies an aircraft exactly as a browser does with the same controls', () => {
    const m = match(settings, [players[1]]);
    const p = m.players.get('p2');
    const mine = new Simulation();
    mine.start(AIRCRAFT.camel, 100);
    const { restoreState } = awaitImport;
    restoreState(mine, captureState(p.sim));
    const inputs = Array.from({ length: 600 }, (_, k) => quantiseInput({ pull: 0.3 * Math.sin(k / 50), roll: 0.5 * Math.cos(k / 70), yaw: 0.1, throttle: 0.9, trim: 0.05 }));
    inputs.forEach((input, k) => {
      if (k % 4 === 0) m.receiveInputs('p2', { firstTick: k + 1, viewTick: 0, inputs: inputs.slice(k, k + 4) }); // sent ahead, as a browser does
      m.step();
      mine.step(1 / 120, input);
    });
    expect(Array.from(captureState(mine))).toEqual(Array.from(captureState(p.sim)));
  });
});

describe('match: crashes, joining and leaving', () => {
  it('a crashed aircraft comes back after 10 s with a new spawn number, and everyone hears about it', () => {
    const m = match(settings, [players[0], players[1]]);
    const p = m.players.get('p1');
    p.sim.state.position.y = 2; // into the ground
    p.sim.state.velocity.set(0, -30, 0);
    const events = [];
    let now = 0;
    for (let i = 0; i < (RESPAWN_S + 1) * 60; i++) events.push(...m.advanceTo((now += 1000 / 60)).events);
    expect(events[0]).toMatchObject({ kind: 'crash', id: 'p1', name: 'Max' });
    expect(events.some((e) => e.kind === 'spawn' && e.id === 'p1')).toBe(true);
    expect(p.spawn).toBe(2);
    expect(p.sim.crashed).toBe(false);
    expect(p.sim.state.position.y).toBeGreaterThan(1500);
  });

  it('players can join and leave in the middle; each snapshot has your aircraft and the others', () => {
    const m = match(settings, [players[0], players[1]]);
    m.advanceTo(100);
    m.addPlayer(players[2]);
    const { snapshots } = m.advanceTo(200);
    expect(snapshots).toHaveLength(3 * 3); // ticks 16, 20 and 24, for each of three
    const forWerner = decodeSnapshot(snapshots.find((s) => s.id === 'p3').buffer);
    expect(forWerner.you.slot).toBe(3);
    expect(forWerner.others.map((o) => o.slot).sort()).toEqual([1, 2]);
    m.removePlayer('p1');
    const after = m.advanceTo(300).snapshots;
    expect([...new Set(after.map((s) => s.id))].sort()).toEqual(['p2', 'p3']);
    expect(decodeSnapshot(after[0].buffer).others).toHaveLength(1);
  });

  it('runs four aircraft for a minute quickly enough for a small server', () => {
    const m = match(settings, [...players, { id: 'p4', slot: 4, name: 'Georges', team: 'allied', aircraft: 'spad13' }]);
    const t0 = performance.now();
    for (let i = 0; i < 60 * TICK_HZ; i++) {
      m.step();
      if (m.tick % 4 === 0) m.snapshots();
    }
    const msPerSecond = (performance.now() - t0) / 60;
    console.info(`[matchSim] 4 aircraft: ${msPerSecond.toFixed(1)} ms of computing per second of match (${(msPerSecond / 10).toFixed(1)}% of one core)`);
    expect(msPerSecond).toBeLessThan(200);
  });
});

describe('trees and buildings everyone shares', () => {
  it('are the Medium-quality ones, and nothing counts above 60 m', () => {
    const solids = new WorldSolids(world);
    // A tree of the tile round the start, from the same function the terrain uses at Medium (16 m).
    const tree = tileTrees(world, 0, 0, 1000, 1000, 16)[0];
    expect(solids.hit(tree.x, 1, tree.z)).toBe('Hit a tree');
    expect(solids.hit(tree.x, 61, tree.z)).toBe(null);
    expect(solids.built.size).toBeGreaterThan(0);
  });
});

const awaitImport = await import('../../src/mp/binary.js');
