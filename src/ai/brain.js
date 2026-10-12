// The AI pilot's head. Every step it reads what it knows (its own instruments, and
// what it saw of the others a reaction time ago), decides what to do, and gives the
// pilot's hands (steering.js) a direction and a speed to fly, and pulls the trigger.
// The result is a ControlInput like a person's.
//
// States: patrol (a circuit at a set height, looking for the enemy), engage (close with
// an enemy that has been seen), attack (lead the target, aim, fire in bursts), evade (an
// enemy is on the tail: defensive break) and disengage (out of ammunition, short of
// fuel or badly damaged: break off and fly away, then go back on patrol). Settings are
// in src/aircraft/aiData.js: the skill sets the reaction time, aim error, nerve and so on.

import { Vector3 } from 'three';
import { SKILLS, PATROL, COMBAT } from '../aircraft/aiData.js';
import { CARTRIDGES, GUN_TYPES } from '../aircraft/weapons.js';
import { Observer, geometry } from './perception.js';
import { Pilot } from './steering.js';
import { aimSolution, AimError, Trigger } from './aiming.js';
import { DefensiveBreak, BreakAway } from './manoeuvres.js';
import { chooseManoeuvre, chooseEscape } from './tactics.js';
import { MANOEUVRES } from '../aircraft/aiData.js';

const _to = new Vector3();
const _nose = new Vector3();
const _vhat = new Vector3();
const _muzzle = new Vector3();
const _aim = new Vector3();
const _want = new Vector3();
const _accel = new Vector3();

// How hurt the aircraft is, 0 (sound) to 1 (finished): the worst of its parts.
export function damageScore(d) {
  const cables = Object.values(d.cables).filter((c) => c !== null).length;
  return Math.max(d.engine * 0.9, d.tank * 0.8, d.wing.L, d.wing.R, d.tailplane * 0.9, d.fin * 0.7, d.pilot * 1.1, cables * 0.25, d.fuel <= 0 ? 1 : 0);
}

export class AiBrain {
  // aircraft: the aircraft data; skill: a key of SKILLS; centre: { x, z } the middle of its patrol circuit.
  constructor(aircraft, skillName, centre, rng = Math.random) {
    this.aircraft = aircraft;
    this.skillName = skillName;
    this.skill = SKILLS[skillName];
    this.rng = rng;
    this.pilot = new Pilot(aircraft);
    this.observer = new Observer(this.skill);
    this.aimError = new AimError(this.skill, rng);
    this.trigger = new Trigger(this.skill, rng);
    this.cartridge = CARTRIDGES[GUN_TYPES[aircraft.guns.type].cartridge];
    this.centre = { x: centre.x, z: centre.z };
    this.patrolAltitude = this.skill.patrolAltitude; // the height of its circuit (a mission may set another)
    this.state = 'patrol';
    this.stateTime = 0;
    this.manoeuvre = null; // the named manoeuvre in progress
    this.script = null; // its script object
    this.contacts = []; // what it can see now: [{ id, side, range, geometry }]
    this.targetId = null;
    this.target = null; // the contact it is after (with the position it believes)
    this.noticed = 0; // s left in which it knows an enemy is behind it
    this.lastLook = 0;
    this.time = 0;
    this.lastInput = null;
    this.firing = false;
    this.aimed = false;
    this.extending = false; // flying straight to rebuild speed and height
    this.fine = false; // aiming with rudder and elevator
    this.tactic = null; // a chosen manoeuvre in progress (Immelmann, split-S, climbing turn, boom-and-zoom)
    this.cooldown = 0; // s before it may start another
  }

  // ---- looking ------------------------------------------------------------

  // Look at the others: which can it see (within its sight range), and what is the geometry.
  look(self, others) {
    this.observer.record(this.time, others);
    this.contacts.length = 0;
    for (const o of others) {
      const seen = this.observer.view(o.id, this.time);
      if (!seen) continue;
      const g = geometry(self.state, seen);
      if (g.range <= this.skill.sightRange) this.contacts.push({ id: o.id, side: o.side, range: g.range, geometry: g, seen });
    }
  }

  // The enemy it is going after: the nearest it can see, kept while it stays reasonably near.
  chooseTarget(side) {
    const enemies = this.contacts.filter((c) => c.side !== side);
    if (!enemies.length) {
      this.target = null;
      this.targetId = null;
      return;
    }
    const nearest = enemies.reduce((a, b) => (a.range <= b.range ? a : b));
    const keep = enemies.find((c) => c.id === this.targetId);
    this.target = keep && keep.range < nearest.range * 1.4 ? keep : nearest;
    this.targetId = this.target.id;
  }

  // Is an enemy on its tail, shooting or about to, and does it know? It always knows after a hit;
  // otherwise it notices now and then, as often as the skill's rear awareness says.
  threatened(dt, self, enemies) {
    const behind = enemies.find(
      (c) => c.geometry.offTail < COMBAT.threatAngle && c.range < COMBAT.threatRange && c.geometry.pointingAtMe < COMBAT.threatAim,
    );
    this.noticed = Math.max(0, this.noticed - dt);
    if (behind && this.rng() < 1 - (1 - this.skill.rearAwareness) ** dt) this.noticed = 1;
    const hit = self.hitTimer > 0;
    if (behind && (this.noticed > 0 || hit)) return behind;
    if (hit) return enemies.find((c) => c.range < COMBAT.threatRange * 1.5) ?? null;
    return null;
  }

  // Should it break off the fight now?
  shouldFlee(self) {
    const left = self.gunBank.roundsLeft;
    const ammo = (left[0] + left[1]) / (2 * self.aircraft.guns.rounds);
    const d = self.sim.damage;
    return ammo < COMBAT.fleeAmmo || d.fuel < COMBAT.fleeLowFuel || damageScore(d) >= this.skill.fleeDamage;
  }

  // ---- changing state -----------------------------------------------------

  enter(state, manoeuvre = null, script = null) {
    this.state = state;
    this.stateTime = 0;
    this.manoeuvre = manoeuvre;
    this.script = script;
    this.tactic = null;
    if (state === 'patrol') this.target = null;
  }

  // ---- directions ---------------------------------------------------------

  // The patrol circuit: a point a little way round it from where the aircraft is.
  patrolDirection(position) {
    const dx = position.x - this.centre.x;
    const dz = position.z - this.centre.z;
    const here = Math.atan2(dz, dx);
    const ahead = here + PATROL.waypointAhead;
    const aim = { x: this.centre.x + PATROL.radius * Math.cos(ahead), z: this.centre.z + PATROL.radius * Math.sin(ahead) };
    _to.set(aim.x - position.x, 0, aim.z - position.z);
    const run = Math.max(_to.length(), 1);
    const slope = Math.max(-PATROL.climbSlope, Math.min(PATROL.climbSlope, (this.patrolAltitude - position.y) / (run * 0.5)));
    return new Vector3(_to.x / run, slope, _to.z / run).normalize();
  }

  // Where the enemy is now, as far as it can tell: what it saw, carried on by its velocity.
  believedPosition(c) {
    return new Vector3().copy(c.seen.position).addScaledVector(c.seen.velocity, this.time - c.seen.t);
  }

  // The aim solution on the target: the direction to fly the nose along, and the range.
  aimAt(self, c) {
    const s = self.sim.state;
    const g = self.aircraft.guns;
    _muzzle.set(g.muzzleX, g.muzzleY, 0).applyQuaternion(s.quaternion).add(s.position);
    // A skilled pilot allows for the target's turn; a novice leads it as if it flew straight.
    const accel = this.skill.leadsTurns ? this.observer.acceleration(c.id, c.seen, 0.25, _accel) : null;
    return aimSolution(this.cartridge, _muzzle, s.velocity, this.believedPosition(c), c.seen.velocity, {}, accel);
  }

  // ---- one step -----------------------------------------------------------

  // self: the Agent (its sim, gunBank, hitTimer); others: [{ id, side, state }] aircraft it could see.
  // Returns the ControlInput.
  think(dt, self, others, solidAt = null) {
    const sim = self.sim;
    this.time += dt;
    this.stateTime += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.look(self, others);
    this.aimError.update(dt);
    const side = self.aircraft.side;
    this.chooseTarget(side);
    const enemies = this.contacts.filter((c) => c.side !== side);
    const vmax = this.aircraft.documented.maxSpeed;
    const threat = this.threatened(dt, self, enemies);
    const hurt = this.shouldFlee(self);
    this.firing = false;
    this.aimed = false;

    // Changes of state.
    if (this.state !== 'disengage' && this.state !== 'patrol' && hurt) this.enter('disengage');
    else if (this.state === 'patrol' && this.target) {
      if (hurt) this.enter('disengage');
      else this.enter('engage');
    } else if (this.state === 'engage' || this.state === 'attack') {
      if (threat) {
        const s = sim.state;
        const escape = chooseEscape(this.skillName, { y: s.position.y, velocity: s.velocity }, this.rng);
        this.enter('evade', escape ? escape.name : 'defensive break', escape ?? new DefensiveBreak(this.rng));
      }
      else if (!this.target && this.stateTime > 4) this.enter('patrol');
      else if (this.target) {
        const near = this.target.range < COMBAT.engageRange && this.target.geometry.offNose < 1.2;
        if (this.state === 'engage' && near) this.enter('attack');
        else if (this.state === 'attack' && !near && this.target.range > 1.4 * COMBAT.engageRange) this.enter('engage');
      }
    }

    let want;
    switch (this.state) {
      case 'evade':
        want = this.evade(dt, self, enemies, threat, vmax);
        break;
      case 'disengage':
        want = this.disengage(self, enemies, vmax);
        break;
      case 'attack':
        want = this.attack(dt, self, vmax);
        break;
      case 'engage':
        want = this.engage(self, vmax, dt);
        break;
      default:
        want = { dir: this.patrolDirection(sim.state.position), speed: this.skill.patrolSpeed * vmax, gShare: this.skill.gLimit };
    }
    // Fine aim only while it is safe: not near the ground, and not diving toward its never-exceed speed.
    const eas = sim.diag ? sim.diag.speed * Math.sqrt(sim.diag.density) : 0;
    const tooFast = eas > COMBAT.fineAimSpeed * this.aircraft.structure.neverExceedSpeed;
    this.lastInput = want.fineAim && !tooFast && !this.pilot.safeDirection(sim, want.dir, solidAt).urgent
      ? this.pilot.aimNose(sim, want.fineAim, want.speed, dt, want.gShare)
      : this.pilot.steer(sim, want, dt, solidAt);
    this.lastInput.fire = this.firing;
    // A stoppage: the pilot hammers it clear while he is not firing.
    if (!this.firing && self.gunBank.guns.some((g) => g.jammed)) self.gunBank.clearJam();
    return this.lastInput;
  }

  // ---- what each state flies ---------------------------------------------

  // A chosen manoeuvre: start one if the situation calls for it, run it, and say what to fly
  // (null when there is none, so the state's own flying goes on).
  tactics(dt, self, c, vmax) {
    const s = self.sim.state;
    const speed = self.sim.diag ? self.sim.diag.speed : 0;
    const me = { y: s.position.y, speed, velocity: s.velocity, vmax, aircraft: this.aircraft };
    if (!this.tactic && this.cooldown <= 0 && !this.extending) {
      this.tactic = chooseManoeuvre(this.skillName, me, {
        y: this.believedPosition(c).y, speed: c.seen.velocity.length(), range: c.range, offNose: c.geometry.offNose,
        closing: c.geometry.closing, pointingAtMe: c.geometry.pointingAtMe,
      });
    }
    if (!this.tactic) return null;
    const sol = this.aimAt(self, c);
    const out = this.tactic.update(dt, {
      velocity: s.velocity, speed, topSpeed: vmax, up: new Vector3(0, 1, 0).applyQuaternion(s.quaternion),
      toEnemy: c.geometry.direction, aimDir: sol.dir, range: c.range, offNose: c.geometry.offNose,
      enemyAbove: this.believedPosition(c).y - s.position.y,
    });
    this.manoeuvre = this.tactic.name;
    if (out.aim) this.shoot(dt, self, c, sol); // the dive of a boom-and-zoom is a firing pass
    if (this.tactic.done) {
      this.tactic = null;
      this.cooldown = MANOEUVRES.cooldown;
    }
    return { ...out, gShare: Math.min(out.gShare, this.skill.gLimit) };
  }

  // Aim error, the fire cone and the trigger: fire if the nose is on and the range is right.
  // Returns the aim direction with the pilot's error and how far the nose is off it.
  shoot(dt, self, c, sol) {
    const aimDir = this.aimError.apply(sol.dir, _aim);
    _nose.set(1, 0, 0).applyQuaternion(self.sim.state.quaternion);
    const off = Math.acos(Math.min(1, Math.max(-1, _nose.dot(aimDir))));
    this.aimOff = off;
    // On if the nose is within the fire cone, or (close in) if the shot would pass within the target's size.
    this.aimed = off < Math.max(this.skill.fireCone, this.skill.fireSpread / Math.max(c.range, 1));
    const ok = this.aimed && c.range < this.skill.fireRange;
    if (ok) this.trigger.ready();
    this.firing = this.trigger.update(dt, ok);
    return { aimDir, off };
  }

  engage(self, vmax, dt = 0) {
    const c = this.target;
    if (!c) return { dir: this.patrolDirection(self.sim.state.position), speed: this.skill.patrolSpeed * vmax, gShare: this.skill.gLimit };
    const planned = this.tactics(dt, self, c, vmax);
    if (planned) return planned;
    const sol = this.aimAt(self, c);
    return this.managed(self, { dir: sol.dir.clone(), speed: this.closingSpeed(c, vmax), gShare: this.skill.gLimit });
  }

  attack(dt, self, vmax) {
    const c = this.target;
    const s = self.sim.state;
    if (!c) return this.engage(self, vmax);
    // Too close and closing fast: break away before colliding.
    if (this.script instanceof BreakAway) {
      const out = this.script.update(dt, { los: c.geometry.direction, topSpeed: vmax });
      this.manoeuvre = this.script.name;
      if (this.script.done) {
        this.script = null;
        this.manoeuvre = null;
      }
      return out;
    }
    if (c.range < COMBAT.breakOffRange && c.geometry.closing > COMBAT.breakOffClosing) {
      this.script = new BreakAway(this.rng);
      return this.attack(dt, self, vmax);
    }
    const planned = this.tactics(dt, self, c, vmax);
    if (planned) return planned;
    this.manoeuvre = 'turning fight';
    const sol = this.aimAt(self, c);
    const { aimDir, off } = this.shoot(dt, self, c, sol);
    // The nose is not along the velocity (the wing flies at an angle of attack): steer the velocity so the nose lands on the aim.
    _vhat.copy(s.velocity).normalize();
    const dir = _want.copy(aimDir).sub(_nose).add(_vhat).normalize().clone();
    const want = this.managed(self, { dir, speed: this.closingSpeed(c, vmax), gShare: this.skill.gLimit, gain: COMBAT.trackGain, damping: COMBAT.trackDamping, maxTurn: true });
    this.fine = !this.extending && off < (this.fine ? COMBAT.fineAimExit : COMBAT.fineAim);
    if (this.fine) want.fineAim = aimDir.clone(); // close: nudge the nose on
    return want;
  }

  // The speed to fly at to close on the target: its speed plus a closing speed that falls as the
  // range shrinks (full throttle from far off, about its speed at the firing range).
  closingSpeed(c, vmax) {
    const theirs = c.seen.velocity.length();
    const closing = Math.min(COMBAT.maxClosing, Math.max(0, (c.range - COMBAT.closeTo) * COMBAT.closingGain));
    return Math.min(vmax, Math.max(this.skill.attackSpeed * 0.75 * vmax, theirs + closing));
  }

  // Energy management: a pilot who turns hard bleeds speed and height until he is easy meat. So
  // when he is slow or low he stops turning and extends (flies straight) to build speed, then
  // climbs, and only then goes back to the fight.
  managed(self, want) {
    const speed = self.sim.diag ? self.sim.diag.speed : want.speed;
    // Speeds are judged against a fighting speed for this aircraft, not the (higher) speed it would like for closing in.
    const ref = COMBAT.fightSpeed * this.aircraft.documented.maxSpeed;
    const s = self.sim.state;
    const y = s.position.y;
    const slow = speed < COMBAT.recoverSpeed * ref;
    const low = y < COMBAT.fightFloor;
    const close = this.target && this.target.range < COMBAT.extendNoCloser;
    if (close) this.extending = false; // no time for it: fight on, turning gently
    else if (!this.extending && (slow || low)) this.extending = true;
    if (this.extending && speed >= COMBAT.extendDone * ref && y >= COMBAT.fightFloor + COMBAT.extendMargin) this.extending = false;
    if (this.extending) {
      // Straight along the present heading: a shallow dive if there is height to give, level to build speed, a climb once fast.
      const dir = new Vector3(s.velocity.x, 0, s.velocity.z).normalize();
      if (speed < COMBAT.extendDone * ref) dir.y = y > COMBAT.fightFloor + 150 ? COMBAT.recoverDive : 0;
      else dir.y = COMBAT.fightClimb;
      this.manoeuvre = speed < COMBAT.extendDone * ref ? 'regaining speed' : 'climbing away';
      const climbing = speed >= COMBAT.extendDone * ref;
      return { dir: dir.normalize(), speed: (climbing ? COMBAT.climbSpeed : 1) * want.speed, gShare: COMBAT.minTurnShare * want.gShare };
    }
    // Not too steep a dive on an enemy that is not yet in range: a height lost is a speed to be paid for later.
    let dir = want.dir;
    const nearEnough = this.target && this.target.range < COMBAT.diveRange;
    const lowest = nearEnough ? COMBAT.maxAttackDive : COMBAT.maxApproachDive;
    if (dir.y < lowest) dir = new Vector3(dir.x, 0, dir.z).normalize().multiplyScalar(Math.sqrt(1 - lowest * lowest)).setY(lowest).normalize();
    // And it does not follow an enemy down below the fight floor.
    if (dir.y < 0 && y < COMBAT.fightFloor + COMBAT.extendMargin) dir = new Vector3(dir.x, 0, dir.z).normalize();
    const ease = Math.min(1, Math.max(0, (speed - COMBAT.energyFloor * ref) / (COMBAT.energyBand * ref)));
    return { dir, speed: want.speed, gain: want.gain, damping: want.damping, maxTurn: want.maxTurn, gShare: want.gShare * (COMBAT.minTurnShare + (1 - COMBAT.minTurnShare) * ease) };
  }

  evade(dt, self, enemies, threat, vmax) {
    const attacker = threat ?? enemies.reduce((a, b) => (!a || b.range < a.range ? b : a), null);
    if (!attacker) {
      this.enter('patrol');
      return { dir: this.patrolDirection(self.sim.state.position), speed: this.skill.patrolSpeed * vmax, gShare: this.skill.gLimit };
    }
    const s = self.sim.state;
    _vhat.copy(s.velocity).normalize();
    const g = attacker.geometry;
    const clear = g.offTail > COMBAT.evadeClear || g.range > COMBAT.threatRange * 1.4;
    const speed = self.sim.diag ? self.sim.diag.speed : 0;
    const out = this.script.update(dt, { los: g.direction, vhat: _vhat, threat: Boolean(threat), clear, topSpeed: vmax, velocity: s.velocity, speed });
    out.gShare = Math.min(out.gShare, this.skill.gLimit);
    if (this.script.done) this.enter('engage');
    return out;
  }

  disengage(self, enemies, vmax) {
    const s = self.sim.state;
    // Away from the enemy and toward its own side (the Allies are west of the front, the Germans east).
    const home = self.aircraft.side === 'Allied' ? -1 : 1;
    _to.set(0, 0, 0);
    const nearest = enemies.reduce((a, b) => (!a || b.range < a.range ? b : a), null);
    if (nearest) _to.copy(nearest.geometry.direction).negate();
    _to.setY(0);
    _to.x += home * 0.8;
    if (_to.lengthSq() < 1e-6) _to.set(home, 0, 0);
    _to.normalize();
    const out = { dir: new Vector3(_to.x, COMBAT.fleeSlope, _to.z).normalize(), speed: 0.95 * vmax, gShare: this.skill.gLimit };
    if (this.stateTime > COMBAT.fleeTime || (this.stateTime > 4 && !nearest)) {
      // Back on patrol on a new circuit through where it is, once it has got away.
      const h = _vhat.copy(s.velocity).setY(0).normalize();
      this.centre = { x: s.position.x - PATROL.radius * h.z, z: s.position.z + PATROL.radius * h.x };
      this.enter('patrol');
    }
    return out;
  }

  // One line for the F3 panel.
  describe() {
    const seen = this.contacts.length ? `sees ${this.contacts.length} (nearest ${Math.round(Math.min(...this.contacts.map((c) => c.range)))} m)` : 'sees nothing';
    const extra = this.target ? `, after ${Math.round(this.target.range)} m${this.firing ? ', FIRING' : ''}` : '';
    return `${this.skill.name} ${this.state}${this.manoeuvre ? ` / ${this.manoeuvre}` : ''}, ${seen}${extra}`;
  }
}

