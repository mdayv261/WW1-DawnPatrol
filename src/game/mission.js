// A mission: started from the settings chosen on the setup screen, watched until it ends,
// then summed up for the results screen. No drawing in here (src/game/session.js does that),
// so a whole mission can run in a test.
//
// It ends when: every enemy is down (victory), the player is shot down or crashes (defeat),
// the player lands and stops on one of his own side's airfields (a safe return), or he ends
// it from the pause menu.

import { AIRCRAFT, ALL_AIRCRAFT } from '../aircraft/index.js';
import { withLoadout } from '../weapons/mounts.js';
import { SKILLS } from '../aircraft/aiData.js';
import { STARTS } from './flow.js';
import { destroyedReason, damageLines } from '../physics/damage.js';
import { toLocal } from '../world/airfields.js';

export const MISSION = {
  endDelay: 4, // s between the end (an enemy falling, a crash) and the results, to watch it happen
  landedSpeed: 2, // m/s: slower than this on the ground counts as stopped
  airborneHeight: 20, // m: having been this high, a stop on an airfield is a landing
  frontDistance: 4000, // m: with an airfield start the enemy patrols this far toward the front
  dropRange: 12000, // m: in a mission an enemy is only taken away this far from the player
  altitudeStep: 300, // m: an Ace patrols this much above the start height and a Novice this much below
};

// The player's aircraft as flown in a mission: the chosen type (of either era) with its loadout.
export function missionAircraft(config) {
  const ac = ALL_AIRCRAFT.find((a) => a.id === config.aircraft) ?? ALL_AIRCRAFT[0];
  return withLoadout(ac, config.loadout);
}

// Start a mission: the player's aircraft (on the ground or in the air), the enemies, and a watcher.
// Returns { input (the player's starting controls), watcher }.
export function startMission(config, { sim, combat, world }) {
  const ac = missionAircraft(config);
  const start = STARTS.find((s) => s.id === config.start) ?? STARTS[1];
  const input = start.altitude > 0 ? sim.start(ac, start.altitude) : sim.startOnGround(ac);
  combat.reset(ac);
  combat.dropRange = MISSION.dropRange;
  combat.skill = config.skill;
  const p = sim.state.position;
  // On the ground, the enemy patrols over the front (east for the Allies, west for the Germans), not over you.
  const toFront = ac.side === 'Allied' ? 1 : -1;
  const offset = SKILLS[config.skill].patrolAltitude - SKILLS.regular.patrolAltitude; // Novice lower, Ace higher
  for (let i = 0; i < config.enemyCount; i++) {
    const options = { aircraft: config.enemyType === 'mixed' ? undefined : AIRCRAFT[idKey(config.enemyType)] };
    if (start.altitude === 0) {
      options.centre = { x: p.x + toFront * MISSION.frontDistance, z: p.z };
    } else {
      options.altitude = Math.max(400, start.altitude + Math.sign(offset) * MISSION.altitudeStep);
    }
    combat.spawnAgent(sim, config.skill, options);
  }
  return { input, watcher: new MissionWatcher(config, ac, world) };
}

// AIRCRAFT is keyed by id; enemyType holds an id.
const idKey = (id) => Object.keys(AIRCRAFT).find((k) => AIRCRAFT[k].id === id);

export class MissionWatcher {
  constructor(config, aircraft, world) {
    this.config = config;
    this.aircraft = aircraft;
    this.world = world;
    this.time = 0;
    this.airborne = false;
    this.pending = null; // { outcome, detail } waiting out the end delay
    this.endTimer = 0;
    this.result = null; // set when the mission is over
    this.enemiesDown = new Set();
  }

  // Is the player stopped on a landing ground of his own side's airfields?
  landedAtHome(sim) {
    if (!this.airborne || !sim.diag || !sim.diag.onGround || sim.diag.speed > MISSION.landedSpeed) return false;
    const side = this.aircraft.side === 'Allied' ? 'allied' : 'german';
    const { x, z } = sim.state.position;
    return this.world.airfieldsNear(x, z, 1500).some((af) => {
      if (af.side !== side) return false;
      const [u, v] = toLocal(af, x, z);
      return Math.abs(u) < af.halfLength && Math.abs(v) < af.halfWidth;
    });
  }

  // Advance dt. Returns the result once the mission is over, else null.
  update(dt, sim, combat) {
    if (this.result) return this.result;
    this.time += dt;
    if (sim.state.position.y > MISSION.airborneHeight) this.airborne = true;
    for (const a of combat.agents) if (a.down || a.crashed) this.enemiesDown.add(a.id);
    if (!this.pending) {
      const reason = destroyedReason(sim.damage);
      const enemiesLeft = combat.agents.filter((a) => !a.down && !a.crashed).length;
      if (sim.crashed) this.pending = { outcome: reason || combat.playerDown ? 'shot down' : 'crashed', detail: reason ?? sim.crashReason };
      else if (reason) this.pending = { outcome: 'shot down', detail: reason };
      else if (this.config.enemyCount > 0 && enemiesLeft === 0) {
        this.pending = this.enemiesDown.size > 0 ? { outcome: 'victory', detail: 'All enemy aircraft down' } : { outcome: 'withdrew', detail: 'The enemy broke off' };
      } else if (this.landedAtHome(sim)) this.pending = { outcome: 'landed', detail: 'Landed at a friendly airfield' };
    }
    if (this.pending) {
      this.endTimer += dt;
      if (this.endTimer >= (this.pending.outcome === 'landed' ? 1 : MISSION.endDelay)) this.finish(this.pending, sim, combat);
    }
    return this.result;
  }

  // The player ends the mission from the pause menu.
  end(sim, combat) {
    if (!this.result) this.finish({ outcome: 'ended', detail: 'You ended the mission from the pause menu' }, sim, combat);
    return this.result;
  }

  finish(pending, sim, combat) {
    this.result = summary(pending, this, sim, combat);
  }
}

export const HEADLINES = {
  victory: 'Victory',
  landed: 'Safe return',
  withdrew: 'The enemy withdrew',
  'shot down': 'Shot down',
  crashed: 'Crashed',
  ended: 'Mission ended',
};

// The numbers for the results screen.
export function summary(pending, watcher, sim, combat) {
  const accuracy = combat.shotsFired ? (100 * combat.hitsOnTargets) / combat.shotsFired : 0;
  const damage = damageLines(sim.damage, sim.aircraft)[0].replace(/^damage\s+/, '');
  return {
    outcome: pending.outcome,
    headline: HEADLINES[pending.outcome],
    detail: pending.detail,
    time: watcher.time,
    kills: combat.kills,
    enemies: watcher.config.enemyCount,
    shotsFired: combat.shotsFired,
    hits: combat.hitsOnTargets,
    accuracy,
    hitsTaken: combat.hitsOnPlayer,
    damage,
    fuelUsed: 100 * (1 - sim.damage.fuel),
    aircraft: watcher.aircraft.name,
  };
}

// "4 min 05 s"
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`;
}
