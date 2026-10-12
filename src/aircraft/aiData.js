// Settings of the AI pilots: the skill levels, and the numbers the pilot's hands
// (src/ai/steering.js) and brain (src/ai/brain.js) use. These are DESIGN CHOICES,
// not historical data: nothing here is an aircraft figure, so none of it is in
// docs/AIRCRAFT_DATA.md; the reasons are in docs/DECISIONS.md (D54 onward). SI units.

// Skill levels. `drone` is the old scripted target: it flies a path and never fights.
export const SKILLS = {
  drone: {
    name: 'Drone',
    reactionTime: 0, // s, not used (scripted)
    gLimit: 1, // share of the structural limit load it will pull (not used)
    patrolSpeed: 0.65, // of the aircraft's top speed
  },
  novice: {
    name: 'Novice',
    reactionTime: 0.6, // s: it acts on what it saw this long ago
    gLimit: 0.7, // share of the structural limit load it will pull: it does not use its aircraft's turn fully
    patrolSpeed: 0.7,
    sightRange: 2000, // m, how far away it sees another aircraft
    patrolAltitude: 1200, // m
  },
  regular: {
    name: 'Regular',
    reactionTime: 0.35,
    gLimit: 0.88,
    patrolSpeed: 0.75,
    sightRange: 3000,
    patrolAltitude: 1500,
  },
  ace: {
    name: 'Ace',
    reactionTime: 0.15,
    gLimit: 1.0,
    patrolSpeed: 0.8,
    sightRange: 4000,
    patrolAltitude: 1800,
  },
};

// The order the [ and ] keys step through.
export const SKILL_ORDER = ['drone', 'novice', 'regular', 'ace'];

// The skill after stepping `step` places along that order (clamped at the ends).
export function stepSkill(name, step) {
  const i = SKILL_ORDER.indexOf(name) + step;
  return SKILL_ORDER[Math.min(SKILL_ORDER.length - 1, Math.max(0, i))];
}

// The pilot's hands: gains and limits shared by every skill.
export const STEERING = {
  // --- turning: the wanted turn is proportional to the angle to the wanted direction
  turnGain: 0.9, // 1/s: lateral acceleration wanted per radian of error, divided by speed
  rollGain: 2.5, // roll stick per radian of bank error (the same loop the Drone uses)
  rollDamping: 0.8, // roll stick per rad/s of roll rate
  loadGain: 0.06, // pull per g of load-factor error, at the reference dynamic pressure
  pitchDamping: 0.25, // pull per rad/s of pitch rate (steadies the load-factor loop)
  loadIntegral: 0.2, // pull per g-second of load-factor error
  loadIntegralLimit: 0.5, // the most the integral can pull or push
  referenceSpeed: 0.7, // of top speed: the speed at which loadGain is right (it is scaled up at lower dynamic pressure)
  maxGainScale: 3, // the most the gain is scaled up at low speed
  sideslipGain: 3, // rudder per radian of sideslip (coordinated turns)
  // --- speed
  throttleGain: 0.1, // throttle per m/s of speed error
  throttleIntegral: 0.03, // throttle per metre of speed error
  climbSpeedMargin: 0.12, // a climb is eased off as speed falls this fraction below the wanted speed (speed first, height second)
  diveSpeedFraction: 0.92, // of the never-exceed speed: a dive flattens out as it nears this
  diveEaseBand: 0.12, // of the never-exceed speed: how quickly it flattens
  // --- safety
  stallMargin: 0.88, // the pilot asks for no more than this share of the wing's lift limit
  stallStall: 0.02, // stall fraction above which the stick is pushed forward
  unloadPull: -0.25, // the stick when it is near a stall
  floor: 150, // m above the ground it will not go in normal flying (it climbs away)
  floorLookahead: 3, // s: it checks where it will be this far ahead
  recoverClimb: 0.35, // slope (rise over run) of the direction it climbs away on
  obstacleLookahead: 4, // s: it looks this far ahead for trees and buildings when low
  obstacleCeiling: 60, // m: higher than this it does not look for trees and buildings
};

// Patrol: a circuit flown at a set height, looking for the enemy.
export const PATROL = {
  radius: 1500, // m, radius of the circuit
  climbSlope: 0.12, // slope of the climb or descent onto the patrol height
  waypointAhead: 0.9, // rad: how far round the circle ahead of the aircraft it aims
  spread: 700, // m: aircraft in a patrol are started this far apart (spawn)
};
