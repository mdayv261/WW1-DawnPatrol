import { describe, it, expect } from 'vitest';
import {
  firingFrequency, engineLoudness, engineCutoff, windLoudness, windCutoff, wireHum, distanceGain, distanceCutoff,
  soundDelay, dopplerFactor, stereoPan, closingSpeed, closestApproach, steadyPeak,
} from '../src/audio/soundMath.js';
import { clip, noise } from '../src/audio/synth.js';
import { createAudio } from '../src/audio/audioEngine.js';
import { CLIPS, DISTANCE_SOUND, ENGINE_SOUND, GUNS_OVER_ENGINE, MIX } from '../src/aircraft/sounds.js';
import { AIRCRAFT, AIRCRAFT_LIST } from '../src/aircraft/index.js';
import { CARTRIDGES } from '../src/aircraft/weapons.js';
import { Simulation } from '../src/core/simulation.js';
import { Combat } from '../src/game/combat.js';
import { makeBullet } from '../src/weapons/ballistics.js';
import { seededRandom } from '../src/weapons/guns.js';

// Sound (Phase 6, checkpoint 3). The numbers and the clips are checked here; the Web Audio graph
// itself only runs in a browser (it does nothing in these tests).

describe('the numbers behind the sound', () => {
  it('the engine fires once per cylinder every two turns', () => {
    expect(firingFrequency(9, 1250)).toBeCloseTo(93.75, 9); // the Camel's Clerget at rated speed
    expect(firingFrequency(8, 2100)).toBeCloseTo(140, 9); // the SPAD's Hispano V8 (crankshaft)
    expect(firingFrequency(6, 1400)).toBeCloseTo(70, 9); // the Albatros's Mercedes six
    expect(firingFrequency(9, 0)).toBe(0);
    for (const ac of AIRCRAFT_LIST) expect([6, 8, 9]).toContain(ac.engine.cylinders);
  });

  it('the engine is louder with the throttle open, quieter turning slowly, and silent when it has stopped', () => {
    expect(engineLoudness(1, 1, true)).toBeCloseTo(1, 9);
    expect(engineLoudness(0, 1, true)).toBeLessThan(engineLoudness(0.5, 1, true));
    expect(engineLoudness(1, 0.3, true)).toBeLessThan(engineLoudness(1, 1, true));
    expect(engineLoudness(1, 1, false)).toBe(0);
    expect(engineCutoff('rotary', 1)).toBeGreaterThan(engineCutoff('rotary', 0)); // brighter with the throttle open
  });

  it('the wind rises with airspeed (with the square, by dynamic pressure), less in thin air, and the wires hum only when fast', () => {
    expect(windLoudness(0)).toBe(0);
    expect(windLoudness(30)).toBeCloseTo(windLoudness(60) / 4, 9);
    expect(windLoudness(40, 0.6)).toBeLessThan(windLoudness(40, 1));
    expect(windCutoff(60)).toBeGreaterThan(windCutoff(10));
    expect(wireHum(20).loudness).toBe(0);
    expect(wireHum(55).loudness).toBeGreaterThan(0);
    expect(wireHum(60).pitch).toBeGreaterThan(wireHum(40).pitch);
  });

  it('far sounds are quieter, duller and later (sound takes about 3 seconds a kilometre)', () => {
    expect(distanceGain(10)).toBe(1);
    expect(distanceGain(500)).toBeCloseTo(DISTANCE_SOUND.near / 500, 9);
    expect(distanceGain(1000)).toBeLessThan(distanceGain(500));
    expect(distanceGain(DISTANCE_SOUND.farGuns + 1)).toBe(0);
    expect(distanceCutoff(1500)).toBeLessThan(distanceCutoff(100));
    expect(distanceCutoff(1e6)).toBe(DISTANCE_SOUND.dull);
    expect(soundDelay(1000)).toBeCloseTo(1000 / 343, 9);
  });

  it('Doppler: higher as a source comes toward you, lower as it goes away', () => {
    expect(dopplerFactor(0)).toBe(1);
    expect(dopplerFactor(50)).toBeGreaterThan(1);
    expect(dopplerFactor(-50)).toBeLessThan(1);
    // Closing speed from positions and velocities: one coming head-on at 60 m/s while we fly at 50.
    const me = { x: 0, y: 0, z: 0 };
    expect(closingSpeed(me, { x: 50, y: 0, z: 0 }, { x: 500, y: 0, z: 0 }, { x: -60, y: 0, z: 0 })).toBeCloseTo(110, 9);
    expect(closingSpeed(me, { x: 0, y: 0, z: 0 }, { x: 500, y: 0, z: 0 }, { x: 60, y: 0, z: 0 })).toBeCloseTo(-60, 9);
  });

  it('left and right: a source on the right pans right, on the left pans left, ahead is centred', () => {
    const me = { x: 0, y: 0, z: 0 };
    const right = { x: 0, y: 0, z: 1 };
    expect(stereoPan(me, right, { x: 0, y: 0, z: 100 })).toBeCloseTo(1, 9);
    expect(stereoPan(me, right, { x: 0, y: 0, z: -100 })).toBeCloseTo(-1, 9);
    expect(stereoPan(me, right, { x: 100, y: 0, z: 0 })).toBeCloseTo(0, 9);
  });

  it('the closest a bullet comes to you: in front, beside, or already past', () => {
    const p = { x: 0, y: 0, z: 0 };
    expect(closestApproach({ x: -50, y: 5, z: 0 }, { x: 50, y: 5, z: 0 }, p)).toEqual({ distance: 5, t: 0.5 });
    expect(closestApproach({ x: 10, y: 0, z: 0 }, { x: 60, y: 0, z: 0 }, p).distance).toBeCloseTo(10, 9); // going away: its start
    expect(closestApproach({ x: -60, y: 0, z: 3 }, { x: -20, y: 0, z: 3 }, p).distance).toBeCloseTo(Math.hypot(20, 3), 9); // not there yet
  });

  it('the steady sounds together cannot clip', () => {
    expect(steadyPeak()).toBeLessThan(1);
  });
});

describe('the sound clips (made in code)', () => {
  it('each has its length, peaks at 0.9, and fades to silence at its end', () => {
    for (const name of Object.keys(CLIPS)) {
      const c = clip(name, 8000);
      expect(c.length, name).toBe(Math.round(CLIPS[name].length * 8000));
      const peak = c.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      expect(peak, name).toBeCloseTo(0.9, 6);
      expect(Math.abs(c[c.length - 1]), name).toBeLessThan(0.02);
    }
  });

  it("the player's guns peak at four times the engine at full throttle, and carry far more sound than it on average (product owner)", () => {
    expect(GUNS_OVER_ENGINE).toBe(4);
    const engineFull = ENGINE_SOUND.level * engineLoudness(1, 1, true);
    for (const gun of ['vickers', 'lmg0815']) {
      const c = clip(gun, 8000);
      const peak = c.reduce((m, v) => Math.max(m, Math.abs(v)), 0) * CLIPS[gun].level;
      expect(peak / engineFull, gun).toBeCloseTo(4, 6);
      // Average loudness over the first 50 ms of a shot (rms) at least three times the engine's (rms ~0.45 of its level).
      const first = c.slice(0, 400);
      const rms = Math.sqrt(first.reduce((t, v) => t + v * v, 0) / first.length) * CLIPS[gun].level;
      expect(rms / (engineFull * 0.45), gun).toBeGreaterThan(3);
    }
    expect(MIX.limiter).toBeGreaterThanOrEqual(-1.5); // the limiter does not flatten them
  });

  it('the Vickers and the Spandau sound different', () => {
    const a = clip('vickers', 8000);
    const b = clip('lmg0815', 8000);
    let diff = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) diff += Math.abs(a[i] - b[i]);
    expect(diff / Math.min(a.length, b.length)).toBeGreaterThan(0.01);
  });

  it('noise is the same for the same seed and different for another', () => {
    expect(noise(16, 4)).toEqual(noise(16, 4));
    expect(noise(16, 4)).not.toEqual(noise(16, 5));
  });
});

describe('the fight makes sound events', () => {
  const setup = () => {
    const sim = new Simulation();
    sim.start(AIRCRAFT.camel, 1000);
    sim.diag = { rpm: 1100 };
    const combat = new Combat({ rng: seededRandom(3) });
    combat.reset(AIRCRAFT.camel);
    return { sim, combat, victims: combat.victims(sim) };
  };
  const enemy = { id: 'enemy', aircraft: AIRCRAFT.dr1 };
  const pass = (combat, sim, victims, offset) => {
    const p = sim.state.position;
    const b = makeBullet(CARTRIDGES.smk, { x: p.x - 60, y: p.y + offset.y, z: p.z + offset.z }, { x: 800, y: 0, z: 0 }, { owner: enemy });
    combat.advance(b, 0.15, victims);
    return b;
  };

  it('each round the player fires is a shot sound, with the gun type', () => {
    const { sim, combat } = setup();
    for (let i = 0; i < 120; i++) combat.step(1 / 120, sim, true);
    const shots = combat.sounds.filter((s) => s.kind === 'shot');
    expect(shots.length).toBe(combat.shotsFired);
    expect(shots.length).toBeGreaterThan(5);
    expect(shots.every((s) => s.player && s.gun === 'vickers')).toBe(true);
  });

  it('an enemy bullet passing 5 m away cracks; one 50 m away does not', () => {
    const { sim, combat, victims } = setup();
    pass(combat, sim, victims, { y: 5, z: 0 });
    const near = combat.sounds.filter((s) => s.kind === 'nearMiss');
    expect(near).toHaveLength(1);
    expect(near[0].distance).toBeCloseTo(5, 0); // a few centimetres less: gravity drops the bullet on the way
    combat.sounds.length = 0;
    pass(combat, sim, victims, { y: 50, z: 0 });
    expect(combat.sounds.filter((s) => s.kind === 'nearMiss')).toHaveLength(0);
  });

  it('a hit on the player is a hit sound (and not also a near miss)', () => {
    const { sim, combat, victims } = setup();
    pass(combat, sim, victims, { y: 0, z: 0 });
    expect(combat.sounds.map((s) => s.kind)).toEqual(['hitPlayer']);
  });

  it('a new flight starts with no sounds waiting', () => {
    const { combat } = setup();
    combat.sounds.push({ kind: 'hitPlayer' });
    combat.reset(AIRCRAFT.camel);
    expect(combat.sounds).toHaveLength(0);
  });
});

describe('the audio outside a browser', () => {
  it('does nothing (no Web Audio), but still empties the sound events, and keeps volume and mute', () => {
    const audio = createAudio();
    audio.start(); // no AudioContext in the tests
    expect(audio.running).toBe(false);
    const sounds = [{ kind: 'hitPlayer' }];
    audio.update({ player: {}, listener: {}, enemies: [], sounds });
    expect(sounds).toHaveLength(0);
    audio.setMuted(true);
    expect(audio.muted).toBe(true);
    audio.setMuted(false);
    expect(audio.muted).toBe(false);
  });
});
