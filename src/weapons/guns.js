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
  constructor(index, muzzle, rounds) {
    this.index = index;
    this.muzzle = muzzle; // { x, y, z } in body axes
    this.rounds = rounds;
    this.cooldown = 0; // s until the gun can fire again
    this.jammed = false;
    this.clearing = 0; // s left of a clearing attempt (0 = not clearing)
    this.fired = 0;
  }

  get state() {
    if (this.rounds <= 0) return 'empty';
    if (this.clearing > 0) return 'clearing';
    return this.jammed ? 'jammed' : 'ready';
  }
}

export class GunBank {
  constructor(aircraft, rng = Math.random) {
    this.aircraft = aircraft;
    this.type = GUN_TYPES[aircraft.guns.type];
    this.cartridge = CARTRIDGES[this.type.cartridge];
    const g = aircraft.guns;
    this.guns = [-1, 1].map((side, i) => new Gun(i, { x: g.muzzleX, y: g.muzzleY, z: side * g.muzzleZ }, g.rounds));
    this.rng = rng;
    this.propAngle = 0; // rad, where blade 0 points (0 = straight up)
    this.shots = 0; // rounds fired in all (for tracer spacing)
    this.time = 0;
  }

  get roundsLeft() {
    return this.guns.map((g) => g.rounds);
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

  // Advance dt seconds. trigger: is the trigger down; rpm: propeller speed.
  // Returns the shots fired: { gun, muzzle (body axes), cartridge, tracer, age (s since it left) }.
  update(dt, trigger, rpm) {
    const shots = [];
    const omega = (rpm / 60) * TAU;
    const sub = dt / SUBSTEPS;
    const period = 60 / this.type.cyclicRate;
    for (let s = 0; s < SUBSTEPS; s++) {
      this.propAngle = (this.propAngle + omega * sub) % TAU;
      this.time += sub;
      for (const g of this.guns) {
        g.cooldown -= sub;
        if (g.clearing > 0) {
          g.clearing -= sub;
          if (g.clearing <= 0) {
            g.clearing = 0;
            if (this.rng() < this.type.clearSuccess) g.jammed = false;
          }
          continue;
        }
        if (!trigger || g.jammed || g.rounds <= 0 || g.cooldown > 0 || this.blocked(g)) continue;
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

  // One line for the screen, e.g. "250 | 250" or "JAMMED | 248".
  statusText() {
    return this.guns.map((g) => (g.state === 'ready' ? String(g.rounds) : g.state === 'clearing' ? 'CLEARING' : g.state === 'jammed' ? 'JAMMED' : 'EMPTY')).join('  |  ');
  }
}

