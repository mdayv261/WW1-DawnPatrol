// The fighting in a match, on the server: every pilot's guns (GunBank, with the server's own
// random numbers for jams), the rounds in the air, and every hit, decided here and only here.
// Rounds are tested against each target where the shooter saw it ("lag compensation"): a round
// fired at tick T by a player whose screen showed the others at tick V is tested, all its flight,
// against the targets as they were (T - V) ticks earlier, up to MAX_REWIND_TICKS. Hits damage the
// parts they pass through (the single-player damage model); a pilot whose aircraft is destroyed
// is down, and the last enemy to hit them in the last KILL_CREDIT_S seconds gets the kill.

import { Vector3 } from 'three';
import { GunBank } from '../weapons/guns.js';
import { makeBullet, stepBullet, bulletSpeed } from '../weapons/ballistics.js';
import { findImpact } from '../weapons/hits.js';
import { BULLETS } from '../aircraft/weapons.js';
import { DAMAGE } from '../aircraft/damageModel.js';
import { applyHit, destroyedReason, pilotDead } from '../physics/damage.js';
import { PoseHistory } from './history.js';
import { TICK_HZ, MAX_REWIND_TICKS, KILL_CREDIT_S, RESPAWN_S, FX_MAX } from './netConfig.js';

const DT = 1 / TICK_HZ;
const _p = new Vector3();
const _v = new Vector3();
const _d = new Vector3();

export class MatchCombat {
  // settings: the match's (friendly fire); solidAt(x, y, z): trees and buildings; rng: jams and
  // damage; maxRewind: ticks of lag compensation allowed (tests set 0 to compare).
  constructor({ settings, solidAt = null, rng = Math.random, maxRewind = MAX_REWIND_TICKS }) {
    this.settings = settings;
    this.solidAt = solidAt;
    this.rng = rng;
    this.maxRewind = maxRewind;
    this.bullets = [];
    this.pending = []; // rounds fired this tick, not yet moved: { b, age }
    this.targets = new Map();
    this.fx = []; // [kind, x, y, z, victimSlot] since the last snapshot
    this.notices = []; // { to: player id | 'all', text }
    this.teams = { allied: 0, central: 0 };
    this.scoreChanged = true; // a kill or a player: send the score at once
    this.talliesChanged = false; // rounds and hits: send at most once a second
    this.tick = 0;
  }

  // A pilot joins (their tallies are kept if they come back in the same match).
  addPilot(p, tally = null) {
    p.tally = tally ?? { kills: 0, deaths: 0, shots: 0, hits: 0 };
    p.history = new PoseHistory();
    this.armed(p);
    this.scoreChanged = true;
  }

  // A fresh aircraft (a spawn or respawn): full belts, no past poses, not down.
  armed(p) {
    p.guns = new GunBank(p.ac, this.rng);
    p.history?.clear();
    p.down = false;
    p.lastHit = null; // { by: pilot, tick }
    p.shotsSince = 0; // rounds fired since the last snapshot (for the others' tracers)
  }

  // After a pilot's aircraft has stepped tick `tick` with controls `input` (and `viewTick`, the
  // tick of the others on their screen when they gave those controls).
  afterStep(p, tick, input, viewTick) {
    this.tick = tick;
    p.history.record(tick, p.sim.state);
    if (input.clearJam) p.guns.clearJam();
    const sim = p.sim;
    const trigger = Boolean(input.fire) && !p.down && !sim.crashed && !pilotDead(sim.damage);
    const shots = p.guns.update(DT, trigger, sim.diag ? sim.diag.rpm : 0);
    if (!shots.length) return;
    p.shotsSince += shots.length;
    p.tally.shots += shots.length;
    this.talliesChanged = true;
    const rewind = Math.max(0, Math.min(this.maxRewind, tick - (viewTick || tick)));
    for (const shot of shots) this.spawn(p, shot, rewind);
  }

  // A round leaves one of p's guns (as single-player's Combat.spawn).
  spawn(p, shot, rewind) {
    const s = p.sim.state;
    _p.set(shot.muzzle.x, shot.muzzle.y, shot.muzzle.z).applyQuaternion(s.quaternion).add(s.position);
    _d.set(1, 0, 0).applyQuaternion(s.quaternion);
    _v.copy(s.velocity).addScaledVector(_d, shot.cartridge.muzzleVelocity);
    const b = makeBullet(shot.cartridge, _p, _v, { tracer: shot.tracer, owner: p, rewind });
    this.pending.push({ b, age: shot.age });
  }

  // Move every round one tick (new ones by the time they have been out) and deal with hits.
  // pilots: everyone in the match.
  moveBullets(tick, pilots) {
    this.tick = tick;
    this.targets = new Map(); // rewind -> targets this tick (shared by all rounds with that rewind)
    for (const { b, age } of this.pending.splice(0)) {
      this.advance(b, age, tick, pilots);
      if (b.alive !== false) this.bullets.push(b);
    }
    let keep = 0;
    for (const b of this.bullets) {
      this.advance(b, DT, tick, pilots);
      if (b.alive !== false) this.bullets[keep++] = b;
    }
    this.bullets.length = Math.min(keep, BULLETS.maxAlive * 2);
  }

  // What a round with this rewind can hit this tick: every other aircraft still flying, where it
  // was `rewind` ticks ago (and the tick before, so a fast crossing is not missed).
  targetsFor(rewind, pilots) {
    let list = this.targets.get(rewind);
    if (!list) {
      list = [];
      for (const q of pilots) {
        if (q.sim.crashed) continue;
        const now = q.history.at(this.tick - rewind);
        const before = q.history.at(this.tick - rewind - 1);
        if (now && before) list.push({ pilot: q, aircraft: q.ac, state: now, previous: before });
      }
      this.targets.set(rewind, list);
    }
    return list;
  }

  advance(b, dt, tick, pilots) {
    const [x0, y0, z0] = [b.x, b.y, b.z];
    stepBullet(b, dt);
    const owner = b.owner;
    const friendly = this.settings.friendlyFire;
    const targets = this.targetsFor(b.rewind, pilots).filter((t) => t.pilot !== owner && (friendly || t.pilot.team !== owner.team));
    const hit = findImpact(x0, y0, z0, b.x, b.y, b.z, targets, this.solidAt, null);
    if (hit) {
      const x = x0 + (b.x - x0) * hit.t;
      const y = y0 + (b.y - y0) * hit.t;
      const z = z0 + (b.z - z0) * hit.t;
      if (hit.kind === 'aircraft') this.hit(hit, b, tick, x, y, z);
      else this.addFx(hit.kind, x, y, z, 0);
      b.alive = false;
    } else if (b.age > BULLETS.maxLife || bulletSpeed(b) < BULLETS.minSpeed) b.alive = false;
  }

  hit(hit, b, tick, x, y, z) {
    const victim = hit.target.pilot;
    const shooter = b.owner;
    this.addFx('hit', x, y, z, victim.slot);
    shooter.tally.hits += 1;
    this.talliesChanged = true;
    const enemy = victim.team !== shooter.team;
    if (enemy) victim.lastHit = { by: shooter, tick };
    // The round's energy as the victim feels it (their speeds subtract), through each part it meets.
    const v = victim.sim.state.velocity;
    let energy = 0.5 * b.cartridge.mass * ((b.vx - v.x) ** 2 + (b.vy - v.y) ** 2 + (b.vz - v.z) ** 2);
    for (const part of hit.zones) {
      applyHit(victim.sim.damage, part.zone, energy, this.rng, victim.sim.surfaces);
      energy *= DAMAGE.passLoss;
    }
    if (!victim.down && destroyedReason(victim.sim.damage)) this.goDown(victim, tick, destroyedReason(victim.sim.damage));
  }

  // A pilot's aircraft is destroyed (hits, or overstressed): down, and someone may get the kill.
  goDown(p, tick, reason) {
    p.down = true;
    p.respawnAt = tick + RESPAWN_S * TICK_HZ;
    p.tally.deaths += 1;
    const s = p.sim.state.position;
    this.addFx('down', s.x, s.y, s.z, p.slot);
    this.credit(p, tick, reason, 'shot down');
  }

  // A pilot crashed (into the ground, a tree...). If they were already down, that was counted.
  crashed(p, tick, reason) {
    if (p.down) return;
    p.down = true;
    p.respawnAt = tick + RESPAWN_S * TICK_HZ;
    p.tally.deaths += 1;
    this.credit(p, tick, reason, 'brought down');
  }

  // The kill: the last enemy to hit p within KILL_CREDIT_S, if any.
  credit(p, tick, reason, verb) {
    const last = p.lastHit;
    const by = last && tick - last.tick <= KILL_CREDIT_S * TICK_HZ ? last.by : null;
    if (by) {
      by.tally.kills += 1;
      this.teams[by.team] += 1;
      this.notices.push({ to: 'all', except: [p.id, by.id], text: `${by.name} ${verb} ${p.name} (${reason})` });
      this.notices.push({ to: by.id, text: `You ${verb} ${p.name} (${reason})` });
      this.notices.push({ to: p.id, text: `You were ${verb} by ${by.name} (${reason})` });
    } else {
      this.notices.push({ to: 'all', except: [p.id], text: `${p.name} went down (${reason})` });
      this.notices.push({ to: p.id, text: `You went down (${reason})` });
    }
    this.notices.push({ to: p.id, text: `Back in the air in ${RESPAWN_S} s` });
    this.scoreChanged = true;
  }

  addFx(kind, x, y, z, slot) {
    if (this.fx.length < FX_MAX) this.fx.push([kind, Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(z * 10) / 10, slot]);
  }

  // The score, for everyone: { teams, players: [{ id, kills, deaths, shots, hits }] }.
  score(pilots) {
    return { teams: { ...this.teams }, players: pilots.map((p) => ({ id: p.id, ...p.tally })) };
  }
}

