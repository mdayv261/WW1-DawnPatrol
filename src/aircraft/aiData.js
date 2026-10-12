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
    gLimit: 0.68, // share of the structural limit load it will pull: it does not use its aircraft's turn fully
    patrolSpeed: 0.7,
    sightRange: 2000, // m, how far away it sees another aircraft
    patrolAltitude: 1200, // m
    aimError: 0.035, // rad (1 sigma, about 2 degrees): how far its aim wanders from the true aim point
    aimMemory: 1.2, // s: how slowly the aim error changes
    fireCone: 0.075, // rad: it fires when its nose is this close to the aim point (a Novice sprays)
    fireRange: 280, // m: it opens fire inside this range
    burst: [0.8, 2.2], // s: how long a burst lasts (between these)
    pause: [0.6, 1.4], // s: the pause between bursts
    rearAwareness: 0.25, // chance per second of noticing an enemy on its tail (it always notices being hit)
    fleeDamage: 0.8, // damage (0 to 1) at which it breaks off the fight
    attackSpeed: 0.8, // of top speed, the speed it flies into an attack
  },
  regular: {
    name: 'Regular',
    reactionTime: 0.35,
    gLimit: 0.82,
    patrolSpeed: 0.75,
    sightRange: 3000,
    patrolAltitude: 1500,
    aimError: 0.018,
    aimMemory: 1.0,
    fireCone: 0.05,
    fireRange: 330,
    burst: [0.6, 1.6],
    pause: [0.4, 1.0],
    rearAwareness: 0.6,
    fleeDamage: 0.55,
    attackSpeed: 0.85,
  },
  ace: {
    name: 'Ace',
    reactionTime: 0.15,
    gLimit: 0.92, // close to the limit, with a margin for overshoot (it does not want to bend its wings)
    patrolSpeed: 0.8,
    sightRange: 4000,
    patrolAltitude: 1800,
    aimError: 0.007,
    aimMemory: 0.8,
    fireCone: 0.04,
    fireRange: 400,
    burst: [0.4, 1.1],
    pause: [0.3, 0.7],
    rearAwareness: 0.95,
    fleeDamage: 0.4,
    attackSpeed: 0.9,
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
  turnDamping: 0.3, // 1/s: the demand is cut by this times the turn rate it already has toward the wanted direction
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
  // --- fine aiming (the last few degrees, with rudder and elevator)
  aimYaw: 2.5, // rudder per radian of aim error to the side
  aimYawDamping: 0.8, // rudder per rad/s of yaw rate
  aimRoll: 1.5, // roll stick per radian of aim error to the side (a little bank toward it)
  aimPitch: 1.5, // pull per radian of aim error up or down
  aimPitchIntegral: 1.5, // pull per radian-second of aim error up or down
  // --- speed
  throttleGain: 0.1, // throttle per m/s of speed error
  throttleIntegral: 0.03, // throttle per metre of speed error
  climbSpeedMargin: 0.12, // a climb is eased off as speed falls this fraction below the wanted speed (speed first, height second)
  diveSpeedFraction: 0.92, // of the never-exceed speed: a dive flattens out as it nears this
  diveEaseBand: 0.12, // of the never-exceed speed: how quickly it flattens
  // --- safety
  overspeedPullOut: 0.88, // of the never-exceed speed: diving faster than this, it pulls out whatever it was doing
  urgentShare: 0.9, // share of the limit load it pulls to avoid the ground (a margin for overshoot)
  stallMargin: 0.88, // the pilot asks for no more than this share of the wing's lift limit
  stallStall: 0.02, // stall fraction above which the stick is pushed forward
  unloadPull: -0.25, // the stick when it is near a stall
  floor: 150, // m above the ground it will not go in normal flying (it climbs away)
  floorLookahead: 4.5, // s: it checks where it will be this far ahead
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

// The fighting: ranges, angles and timings shared by every skill.
export const COMBAT = {
  fineAim: 0.12, // rad: inside this the pilot aims with rudder and elevator instead of banking
  fineAimSpeed: 0.8, // of the never-exceed speed: faster than this it stops fine aiming (the dive limiter is in steering)
  fineAimExit: 0.22, // rad: and goes back to banking and pulling only when the aim is this far off
  trackDamping: 0.8, // 1/s: and the damping when tracking
  trackGain: 1.6, // 1/s: how hard it turns toward the aim point when tracking a target (tighter than patrol turns)
  closeTo: 150, // m: the range it wants to settle at behind a target
  closingGain: 0.06, // m/s of extra speed per metre of range beyond that
  maxClosing: 25, // m/s: the most extra speed it asks for
  engageRange: 900, // m: inside this it stops approaching and starts an attack run
  breakOffRange: 70, // m: closer than this and closing fast, it breaks away to avoid a collision
  breakOffClosing: 15, // m/s: ...if it is closing faster than this
  breakOffTime: 2.0, // s: how long the break-away lasts
  threatRange: 500, // m: an enemy on its tail inside this is a threat
  threatAngle: 0.5, // rad (about 29 degrees): off its tail, to count as "on my tail"
  threatAim: 0.4, // rad: the enemy's nose must be this near to pointing at it
  evadeMin: 2.5, // s: a defensive break lasts at least this long
  evadeMax: 7, // s: and gives up after this long
  evadeReverse: 1.8, // s: if the enemy is still on its tail after this long, it reverses the turn
  evadeClear: 1.2, // rad: the enemy is clear when it is this far off the tail
  hitMemory: 1.5, // s: it knows it is being shot at for this long after a hit
  fleeAmmo: 0.1, // share of its ammunition left at which it breaks off
  fleeLowFuel: 0.12, // share of fuel left at which it breaks off
  fleeTime: 25, // s of flying away before it goes back on patrol
  fleeSlope: -0.08, // slope of its flight away (a shallow dive for speed)
  energyFloor: 0.7, // of the speed it wants: below this share it eases the turn to get speed back (energy management)
  energyBand: 0.2, // of the speed it wants: over this range the turn eases from full to its minimum
  minTurnShare: 0.35, // the least share of its load it will pull while it regains speed
  climbSpeed: 0.75, // of the speed it wants: it climbs at this share of it (nearer the speed that climbs best)
  diveRange: 450, // m: inside this it may dive steeply on the enemy
  maxAttackDive: -0.6, // the steepest slope it dives on an enemy that is in range
  maxApproachDive: -0.1, // and on one that is not
  recoverSpeed: 0.62, // of the speed it wants: below this it stops turning and extends to build speed
  extendDone: 0.92, // of the speed it wants: it climbs once it has this much and goes back to the fight when it is high enough
  extendMargin: 120, // m above the fight floor it must be to go back to the fight
  recoverDive: -0.22, // slope of that dive
  fightFloor: 450, // m: below this height in a fight it stops turning for position and climbs away
  fightClimb: 0.18, // the slope it climbs on then
  leadClamp: 1200, // m: the farthest it will try to lead
  pursuitAhead: 150, // m: height above the enemy it likes to approach from (Ace), scaled by the skill
};
