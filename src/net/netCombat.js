// The fighting as this browser shows it in a match. Only the server's rounds count; everything
// here is for the eyes and ears, fed into the same Combat object single-player uses (so the
// existing tracers, sparks, smoke and sounds draw and play it):
//   - your guns: Combat fires them at once (tracers, sound, counter). Their bank never jams by
//     itself; jams, clearing and the true round count come from the server;
//   - the others' guns: each snapshot says how many rounds an aircraft fired; that many tracer
//     rounds leave its drawn guns over the next 1/30 s, with their sound, and crack past you if close;
//   - impacts the server reports become sparks (and the thud and "You are hit!" if it was you);
//   - smoke and spray from the others' damaged engines and tanks.

import { Vector3 } from 'three';
import { GunBank } from '../weapons/guns.js';
import { makeBullet, stepBullet } from '../weapons/ballistics.js';
import { GUN_TYPES, CARTRIDGES, BULLETS } from '../aircraft/weapons.js';
import { DISTANCE_SOUND } from '../aircraft/sounds.js';
import { closestApproach } from '../audio/soundMath.js';
import { ROUNDS_DRIFT, HIT_NOTICE_S } from '../mp/netConfig.js';

const SNAPSHOT_S = 1 / 30;
const _p = new Vector3();
const _d = new Vector3();
const _v = new Vector3();

export class NetCombat {
  // combat: the session's Combat; sim: your own Simulation; solidAt: trees and buildings;
  // notice(text): the message line; now(): ms.
  constructor({ combat, sim, solidAt = null, notice = () => {}, now = () => performance.now() }) {
    Object.assign(this, { combat, sim, solidAt, notice, now });
    this.tracers = []; // the others' rounds (for the eyes only)
    this.queue = []; // { view, at (ms) } rounds still to leave
    this.lastHitNotice = -Infinity;
    this.smokeTimer = 0;
    this.shotCount = 0;
    // Your guns: jams only ever come from the server (this bank's random numbers never jam it,
    // nor clear it).
    combat.gunBank = new GunBank(combat.aircraft, () => 1);
  }

  // Your guns as the server has them: jams and clearing always; the round count only when it has
  // drifted (your own last shots may not have reached the server yet) or the guns are empty.
  syncGuns(guns) {
    const bank = this.combat.gunBank;
    if (!bank || !guns) return;
    guns.forEach((s, i) => {
      const g = bank.guns[i];
      if (!g) return;
      if (g.drum) {
        // A drum-fed gun: the spare drums and any drum change as the server has them.
        g.spares = s.spares ?? g.spares;
        if (s.state === 'changing' && g.changing <= 0) g.changing = g.drum.changeTime;
        if (s.state !== 'changing') g.changing = 0;
        if (s.state === 'changing' || s.state === 'drumEmpty') g.rounds = 0;
      }
      if (s.state === 'jammed') {
        g.jammed = true;
        g.clearing = 0;
      } else if (s.state === 'clearing') {
        g.jammed = true;
        if (g.clearing <= 0) g.clearing = bank.type.clearTime;
      } else {
        g.jammed = false;
        g.clearing = 0;
      }
      if (s.state === 'empty' || Math.abs(g.rounds - s.rounds) > ROUNDS_DRIFT) g.rounds = s.rounds;
    });
  }

  // An aircraft fired `count` rounds in the last 1/30 s: they leave its guns over the next 1/30 s.
  shots(view, count) {
    const now = this.now();
    for (let k = 0; k < count; k++) this.queue.push({ view, at: now + (k / count) * SNAPSHOT_S * 1000, gun: k % 2 });
  }

  // Once a frame.
  frame(realDt, views) {
    const now = this.now();
    let keep = 0;
    for (const q of this.queue) {
      if (q.at <= now) this.fireFrom(q.view, q.gun);
      else this.queue[keep++] = q;
    }
    this.queue.length = keep;
    this.moveTracers(realDt);
    this.smokeTimer += realDt;
    if (this.smokeTimer >= 0.05) {
      this.smokeTimer -= 0.05;
      for (const v of views) this.smoke(v);
    }
  }

  // One round from one of a drawn aircraft's guns (at its drawn pose), with its sound.
  fireFrom(view, gun) {
    const g = view.aircraft.guns;
    const cartridge = CARTRIDGES[GUN_TYPES[g.type].cartridge];
    const q = view.quaternion;
    _p.set(g.muzzleX, g.muzzleY, (gun ? 1 : -1) * g.muzzleZ).applyQuaternion(q).add(view.position);
    _d.set(1, 0, 0).applyQuaternion(q);
    _v.copy(view.velocity).addScaledVector(_d, cartridge.muzzleVelocity);
    this.shotCount += 1;
    this.tracers.push(makeBullet(cartridge, _p, _v, { tracer: this.shotCount % BULLETS.tracerEvery === 0 }));
    this.combat.sounds.push({ kind: 'shot', gun: g.type, player: false, x: _p.x, y: _p.y, z: _p.z });
  }

  // The others' rounds fly on; they stop at the ground and in trees, and crack past you once.
  moveTracers(dt) {
    const me = this.sim.state.position;
    let keep = 0;
    for (const b of this.tracers) {
      const a = { x: b.x, y: b.y, z: b.z };
      stepBullet(b, dt);
      let alive = b.y > 0 && b.age < BULLETS.maxLife;
      if (alive && b.y < 40 && this.solidAt?.(b.x, b.y, b.z)) alive = false;
      if (alive && !b.cracked) {
        const pass = closestApproach(a, b, me);
        if (pass.distance < DISTANCE_SOUND.nearMiss && pass.t < 1) {
          b.cracked = true;
          this.combat.sounds.push({ kind: 'nearMiss', distance: pass.distance, x: b.x, y: b.y, z: b.z });
        }
      }
      if (alive) this.tracers[keep++] = b;
    }
    this.tracers.length = Math.min(keep, BULLETS.maxAlive);
  }

  // Smoke from a hurt engine, spray from a holed tank (as single-player's Combat.damageEffects).
  smoke(view) {
    const d = view.sim.damage;
    if (view.crashed || (d.engine <= 0.25 && d.tank <= 0)) return;
    _p.set(0.2 * view.aircraft.geometry.length, 0, 0).applyQuaternion(view.quaternion).add(view.position);
    if (d.engine > 0.25) this.combat.events.push({ kind: 'smoke', x: _p.x, y: _p.y, z: _p.z });
    if (d.tank > 0) this.combat.events.push({ kind: 'spray', x: _p.x, y: _p.y - 0.4, z: _p.z });
  }

  // Impacts from the server: [kind, x, y, z, victimSlot]. mySlot: your own slot.
  impacts(list, mySlot) {
    for (const [kind, x, y, z, slot] of list) {
      this.combat.events.push({ kind, x, y, z });
      if (kind !== 'hit' || slot !== mySlot) continue;
      this.combat.sounds.push({ kind: 'hitPlayer' });
      const now = this.now();
      if (now - this.lastHitNotice > HIT_NOTICE_S * 1000) {
        this.lastHitNotice = now;
        this.notice('You are hit!');
      }
    }
  }
}
