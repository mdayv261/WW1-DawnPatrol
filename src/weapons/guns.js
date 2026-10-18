// The guns of one aircraft: ammunition, rate of fire, the synchroniser, stoppages.
//
// Synchronisation: the guns fire through the propeller disc, so a round may only
// leave when no blade is in the line of fire. The propeller's turning angle is
// followed here (from the engine speed the flight model reports), and a gun
// whose turn has come waits until the blade has passed. So the rate of fire is
// the gun's own rate, a little less because of the waiting, and it falls with
// engine speed; it never exceeds the gun's cyclic rate. Gun and cartridge data
// are in src/aircraft/weapons.js; the positions and rounds in each aircraft file.

import { GUN_TYPES, CARTRIDGES, SYNC, BULLETS } from '../aircraft/weapons.js';
import { gunMounts, drumFed } from './mounts.js';

// A small repeatable random number generator (mulberry32), so tests can fix the sequence.
export function seededRandom(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;
const SUBSTEPS = 8; // propeller angle checks per physics step (the blades turn about 0.13 rad each at 1,200 rpm)


export class Gun {
  // drum (drum-fed guns only): { capacity, spares, changeTime }; `rounds` is then what is in the
  // drum fitted now.
  constructor(index, muzzle, rounds, drum = null) {
    this.index = index;
    this.muzzle = muzzle; // { x, y, z } in body axes
    this.rounds = rounds;
    this.drum = drum;
    this.spares = drum ? drum.spares : 0; // full drums still to fit
    this.changing = 0; // s left of a drum change (0 = not changing)
    this.cooldown = 0; // s until the gun can fire again
    this.jammed = false;
    this.clearing = 0; // s left of a clearing attempt (0 = not clearing)
    this.fired = 0;
  }

  get state() {
    if (this.changing > 0) return 'changing';
    if (this.rounds <= 0) return this.spares > 0 ? 'drumEmpty' : 'empty';
    if (this.clearing > 0) return 'clearing';
    return this.jammed ? 'jammed' : 'ready';
  }

  // Rounds still to fire, the spare drums included.
  get totalRounds() {
    return this.rounds + (this.drum ? this.spares * this.drum.capacity : 0);
  }

  // Rounds it started with, the spare drums included.
  get fullLoad() {
    return this.drum ? this.drum.capacity * (1 + this.drum.spares) : this.initialRounds;
  }
}

export class GunBank {
  constructor(aircraft, rng = Math.random) {
    this.aircraft = aircraft;
    const g = aircraft.guns; // none on an unarmed aircraft
    this.type = g ? GUN_TYPES[g.type] : null;
    this.cartridge = g ? CARTRIDGES[this.type.cartridge] : null;
    this.synchronised = g?.synchronised !== false; // an over-wing gun fires over the propeller and never waits
    const drum = g && drumFed(aircraft) ? { capacity: g.rounds, spares: g.spareDrums, changeTime: g.drumChangeTime } : null;
    this.guns = gunMounts(aircraft).map((m, i) => {
      const gun = new Gun(i, m, g.rounds, drum);
      gun.initialRounds = g.rounds;
      return gun;
    });
    this.events = []; // 'drumOff' (a change starts) and 'drumOn' (the new drum is on), for the sounds
    this.rng = rng;
    this.propAngle = 0; // rad, where blade 0 points (0 = straight up)
    this.shots = 0; // rounds fired in all (for tracer spacing)
    this.time = 0;
  }

  get roundsLeft() {
    return this.guns.map((g) => g.rounds);
  }

  // Share of the ammunition left (0 to 1), spare drums included.
  get ammoFraction() {
    if (this.guns.length === 0) return 0;
    const left = this.guns.reduce((sum, g) => sum + g.totalRounds, 0);
    return left / (this.guns.length * this.guns[0].fullLoad);
  }

  // Does it feed from drums that the pilot changes in flight?
  get drumFed() {
    return this.guns.length > 0 && this.guns[0].drum !== null;
  }

  // Is a propeller blade in the way of this muzzle's line of fire?
  blocked(gun) {
    const p = this.aircraft.propeller;
    const r = Math.hypot(gun.muzzle.y, gun.muzzle.z);
    if (r > p.diameter / 2) return false; // outside the blades' reach
    const spacing = TAU / p.blades;
    const theta = Math.atan2(gun.muzzle.z, gun.muzzle.y); // the muzzle's angle round the shaft, from straight up
    const half = Math.atan2(p.chord / 2, Math.max(r, 0.05)) + SYNC.bladeMargin;
    let phase = (theta - this.propAngle) % spacing;
    if (phase < 0) phase += spacing;
    return Math.min(phase, spacing - phase) < half;
  }

  // The pilot hammers on the cocking handle: every jammed gun starts clearing.
  clearJam() {
    for (const g of this.guns) if (g.jammed && g.clearing <= 0) g.clearing = this.type.clearTime;
  }

  // The pilot changes the drum of every drum-fed gun that has a spare and is not jammed or
  // already changing. Rounds left in the old drum are lost. Returns true if a change began.
  changeDrum() {
    let started = false;
    for (const g of this.guns) {
      if (!g.drum || g.spares <= 0 || g.changing > 0 || g.jammed || g.clearing > 0) continue;
      g.rounds = 0;
      g.changing = g.drum.changeTime;
      started = true;
    }
    if (started) this.events.push('drumOff');
    return started;
  }

  // Advance dt seconds. trigger: is the trigger down; rpm: propeller speed.
  // Returns the shots fired: { gun, muzzle (body axes), cartridge, tracer, age (s since it left) }.
  update(dt, trigger, rpm) {
    const shots = [];
    if (this.guns.length === 0) return shots; // unarmed
    const omega = (rpm / 60) * TAU;
    const sub = dt / SUBSTEPS;
    const period = 60 / this.type.cyclicRate;
    for (let s = 0; s < SUBSTEPS; s++) {
      this.propAngle = (this.propAngle + omega * sub) % TAU;
      this.time += sub;
      for (const g of this.guns) {
        g.cooldown -= sub;
        if (g.changing > 0) {
          g.changing -= sub;
          if (g.changing <= 0) {
            g.changing = 0;
            g.spares--;
            g.rounds = g.drum.capacity;
            this.events.push('drumOn');
          }
          continue;
        }
        if (g.clearing > 0) {
          g.clearing -= sub;
          if (g.clearing <= 0) {
            g.clearing = 0;
            if (this.rng() < this.type.clearSuccess) g.jammed = false;
          }
          continue;
        }
        if (!trigger || g.jammed || g.rounds <= 0 || g.cooldown > 0 || (this.synchronised && this.blocked(g))) continue;
        g.rounds--;
        g.fired++;
        g.cooldown = period;
        this.shots++;
        shots.push({
          gun: g.index,
          muzzle: g.muzzle,
          cartridge: this.cartridge,
          tracer: this.shots % BULLETS.tracerEvery === 0,
          age: (SUBSTEPS - 1 - s) * sub, // it has been in the air this long by the end of the step
        });
        if (this.rng() < this.type.jamPerRound) g.jammed = true;
      }
    }
    return shots;
  }

  // One line for the screen, e.g. "250 | 250" or "JAMMED | 248"; for a drum-fed gun
  // "DRUM 63/97 · 2 SPARE", "CHANGING DRUM" or "DRUM EMPTY".
  statusText() {
    if (this.guns.length === 0) return 'none';
    if (this.drumFed) return this.guns.map(drumText).join('  |  ');
    return this.guns.map((g) => (g.state === 'ready' ? String(g.rounds) : g.state === 'clearing' ? 'CLEARING' : g.state === 'jammed' ? 'JAMMED' : 'EMPTY')).join('  |  ');
  }
}

function drumText(g) {
  switch (g.state) {
    case 'changing': return 'CHANGING DRUM';
    case 'drumEmpty': return `DRUM EMPTY · ${g.spares} SPARE`;
    case 'empty': return 'NO DRUMS LEFT';
    case 'jammed': return 'JAMMED';
    case 'clearing': return 'CLEARING';
    default: return `DRUM ${g.rounds}/${g.drum.capacity} · ${g.spares} SPARE`;
  }
}
