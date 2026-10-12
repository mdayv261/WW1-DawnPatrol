// Tactics: which manoeuvre an AI pilot chooses, from the height and speed it has against
// the enemy's (its energy), where the enemy is, and what its skill knows (REPERTOIRE).
// Energy height = height + speed squared / 2g: what it could climb to by trading all its speed.
//   - well above the enemy with energy to spare: dive on him and zoom away (boom-and-zoom, Aces);
//   - the enemy well above: turn toward him while climbing (climbing turn);
//   - the enemy far behind: reverse, gaining height (Immelmann) with speed to spare, or losing it
//     (split-S) with height to spare;
//   - otherwise: stay in the turning fight.
// When an enemy is on its tail a skilled pilot with height may also split-S away instead of breaking.

import { G } from '../core/constants.js';
import { MANOEUVRES as M, REPERTOIRE } from '../aircraft/aiData.js';
import { Immelmann, SplitS, ClimbingTurn, BoomAndZoom } from './manoeuvres.js';
import { stallSpeed } from '../physics/performance.js';
import { densityRatio } from '../physics/atmosphere.js';
import { common } from '../aircraft/common.js';

// The 1 g stall speed at a height (worked out once per aircraft at sea level, then scaled by density).
const stallCache = new WeakMap();
export function stallSpeedAt(aircraft, y) {
  if (!stallCache.has(aircraft)) stallCache.set(aircraft, stallSpeed(aircraft, common, 0));
  return stallCache.get(aircraft) / Math.sqrt(densityRatio(y));
}

export const energyHeight = (y, speed) => y + (speed * speed) / (2 * G);

export function knows(skillName, manoeuvre) {
  return (REPERTOIRE[skillName] ?? []).includes(manoeuvre);
}

// The manoeuvre to start now in an attack or approach, or null to keep fighting as it is.
// me: { y, speed, velocity, vmax, aircraft }; enemy: { y, speed, range, offNose, closing, pointingAtMe }.
export function chooseManoeuvre(skillName, me, enemy) {
  const energy = energyHeight(me.y, me.speed) - energyHeight(enemy.y, enemy.speed);
  if (knows(skillName, 'boom-and-zoom') && energy > M.boomEnergy && me.y - enemy.y > M.boomAbove && enemy.range < 1500 && enemy.offNose < 1.0) {
    return new BoomAndZoom();
  }
  if (knows(skillName, 'climbing turn') && enemy.y - me.y > M.climbAbove && enemy.range > 400) return new ClimbingTurn();
  // A reversal only after the two have passed each other and are flying apart (not in a turning fight,
  // where the enemy behind is turning after it and a loop would only give him a shot).
  const passed = (enemy.closing ?? 0) < -M.reverseOpening && (enemy.pointingAtMe ?? 0) > M.reverseAway;
  if (passed && enemy.offNose > M.reverseAngle && enemy.range > M.reverseRange[0] && enemy.range < M.reverseRange[1]) {
    // An Immelmann needs speed enough to get over the top: a good margin over the stall speed.
    const canLoop = !me.aircraft || me.speed > M.immelmannMargin * stallSpeedAt(me.aircraft, me.y);
    if (knows(skillName, 'Immelmann') && canLoop && me.speed > M.immelmannSpeed * me.vmax && me.y < 3500) return new Immelmann(me.velocity);
    if (knows(skillName, 'split-S') && me.y > M.splitSHeight) return new SplitS(me.velocity);
  }
  return null;
}

// Escaping an enemy on the tail: a split-S if it knows it and has the height (sometimes), else null
// (the defensive break).
export function chooseEscape(skillName, me, rng) {
  if (knows(skillName, 'split-S') && me.y > M.splitSHeight + 300 && rng() < M.splitSEscape) return new SplitS(me.velocity);
  return null;
}
