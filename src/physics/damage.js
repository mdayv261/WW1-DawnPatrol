// Damage to one aircraft: the state of each part (0 = sound, 1 = destroyed), what
// hits do to it, and what it does to the flight (read by flightModel.js and
// controls.js). Wings (left and right), engine, fuel tank, pilot, tailplane, fin
// and the three control cables. Fuel burns and leaks; overloading or over-speeding
// the airframe damages the wings and, past the ultimate load, breaks one off.
// All the numbers are in src/aircraft/damageModel.js and the aircraft files.
// With no damage state (or a fresh one) the flight model behaves exactly as before.

import { DAMAGE as D } from '../aircraft/damageModel.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function createDamage() {
  return {
    wing: { L: 0, R: 0 }, // each wing: 0 sound to 1 destroyed (a failed wing is also marked in `failed`)
    engine: 0,
    tank: 0, // damage to the fuel tank: the leak rate
    pilot: 0, // 0 well, below 1 wounded, 1 dead
    tailplane: 0,
    fin: 0,
    cables: { aileron: null, elevator: null, rudder: null }, // null = working, else the stuck position (-1 to 1)
    fuel: 1, // fraction of the tank left
    failed: { L: false, R: false, tailplane: false },
    events: [], // short texts for the screen ("Right wing failed"), taken by the game
    overload: 0, // the worst load factor seen (for the readout)
  };
}

// Put the state back to a new aircraft's (in place, so references stay valid).
export function resetDamage(d) {
  Object.assign(d, createDamage());
  return d;
}

// ---- hits ------------------------------------------------------------------

const SIDE = { wingL: 'L', wingR: 'R' };

// A hit in `zone` with `energy` joules. rng: random numbers (cable cuts); surfaces: where
// the controls are now (a cut cable leaves its surface there). Returns a short description.
export function applyHit(d, zone, energy, rng = Math.random, surfaces = null) {
  const hurt = energy / D.energyRef; // in units of "one reference hit"
  const cut = (name, value) => {
    if (d.cables[name] === null && rng() < D.cableCutChance * hurt) {
      d.cables[name] = value ?? 0;
      d.events.push(`${name[0].toUpperCase()}${name.slice(1)} cable cut`);
    }
  };
  switch (zone) {
    case 'wingL':
    case 'wingR': {
      const side = SIDE[zone];
      d.wing[side] = clamp01(d.wing[side] + hurt / D.hitsToDestroy.wing);
      cut('aileron', surfaces?.roll);
      break;
    }
    case 'engine':
      d.engine = clamp01(d.engine + hurt / D.hitsToDestroy.engine);
      break;
    case 'fuel':
      d.tank = clamp01(d.tank + hurt / D.hitsToDestroy.tank);
      break;
    case 'pilot':
      d.pilot = clamp01(d.pilot + hurt / D.hitsToDestroy.pilot);
      break;
    case 'tailplane':
      d.tailplane = clamp01(d.tailplane + hurt / D.hitsToDestroy.tailplane);
      cut('elevator', surfaces?.pull);
      break;
    case 'fin':
      d.fin = clamp01(d.fin + hurt / D.hitsToDestroy.fin);
      cut('rudder', surfaces?.yaw);
      break;
    default: // the fuselage: only the control cables run through it
      cut('elevator', surfaces?.pull);
      cut('rudder', surfaces?.yaw);
  }
  markFailures(d);
  return zone;
}

// A wing or the tailplane at full damage has failed.
function markFailures(d) {
  for (const side of ['L', 'R']) {
    if (d.wing[side] >= 1 && !d.failed[side]) {
      d.failed[side] = true;
      d.events.push(`${side === 'L' ? 'Left' : 'Right'} wing failed`);
    }
  }
  if (d.tailplane >= 1 && !d.failed.tailplane) {
    d.failed.tailplane = true;
    d.events.push('Tailplane failed');
  }
}

// ---- the state at a glance -------------------------------------------------

export const pilotDead = (d) => d.pilot >= 1;
export const engineSeized = (d) => d.engine >= 1;
export const fuelOut = (d) => d.fuel <= 0;

// Why the aircraft cannot go on flying under control, or null. (Used to decide a
// target is shot down; a player in this state sees it in the banner.)
export function destroyedReason(d) {
  if (pilotDead(d)) return 'Pilot killed';
  if (d.failed.L || d.failed.R) return 'Wing failed';
  if (d.failed.tailplane) return 'Tailplane failed';
  if (engineSeized(d)) return 'Engine seized';
  return null;
}

// ---- what damage does to the flight ----------------------------------------

// Fraction of one wing's lift lost, and its extra drag, from its damage.
export function wingLoss(d, side) {
  if (d.failed[side]) return 1;
  return D.wingLiftLoss * d.wing[side];
}

// Power factor of the engine (1 = healthy): damage, seizing and an empty tank.
export function powerFactor(d) {
  if (engineSeized(d) || fuelOut(d)) return 0;
  return 1 - D.enginePowerLoss * d.engine;
}

// Extra drag force (N) from a stopped propeller: locked (seized) or windmilling (no fuel).
export function stoppedPropDrag(ac, d, dynamicPressure) {
  const cd = engineSeized(d) ? D.seizedPropDrag : fuelOut(d) ? D.windmillPropDrag : 0;
  if (cd === 0) return 0;
  const area = (Math.PI * ac.propeller.diameter ** 2) / 4;
  return dynamicPressure * area * cd;
}

// Propeller speed (rpm) when the engine is not driving it.
export function stoppedPropRpm(ac, d, speed) {
  if (engineSeized(d)) return 0;
  return D.windmillRpmFraction * ac.engine.ratedRpm * ac.propeller.gearRatio * Math.min(1, speed / ac.documented.maxSpeed);
}

// What the pilot's hands do: a wounded pilot moves the controls less and more slowly, a dead
// pilot not at all (the controls stay where they were, the throttle too). Returns a new input.
export function filterInput(d, input, surfaces) {
  if (d.pilot <= 0) return input;
  if (pilotDead(d)) {
    return { ...input, pull: surfaces.pull, roll: surfaces.roll, yaw: surfaces.yaw, throttle: surfaces.throttle, trim: surfaces.trim, fire: false };
  }
  const auth = 1 - D.pilotAuthorityLoss * d.pilot;
  return { ...input, pull: input.pull * auth, roll: input.roll * auth, yaw: input.yaw * auth };
}

// Control travel rate multiplier (a wounded pilot is slower).
export const controlSpeed = (d) => 1 - D.pilotSlowing * Math.min(d.pilot, 0.99);

// The control-surface positions the aerodynamics sees: a cut cable leaves the surface where
// it was, a damaged tailplane or fin works less well. defl: { pull, roll, yaw } in radians;
// maxes: the control travels (common.maxPull, ...).
export function damagedDeflections(d, defl, common) {
  const out = { ...defl };
  if (d.cables.aileron !== null) out.roll = d.cables.aileron * common.maxRoll;
  if (d.cables.elevator !== null) out.pull = d.cables.elevator * common.maxPull;
  if (d.cables.rudder !== null) out.yaw = d.cables.rudder * common.maxYaw;
  out.pull *= 1 - D.tailAuthorityLoss * (d.failed.tailplane ? 1 : d.tailplane);
  out.yaw *= 1 - D.tailAuthorityLoss * d.fin;
  return out;
}

// ---- time: fuel and structure ----------------------------------------------

// Equivalent airspeed (m/s): the speed at sea-level density with the same dynamic pressure.
const equivalentSpeed = (diag) => diag.speed * Math.sqrt(diag.density);

// Advance the damage state by dt: burn and leak fuel, and damage the wings if the load
// factor or speed is beyond the structure's limits. diag: the flight model's diagnostics
// from the same step (speed, loadFactor, power, density as a fraction of sea level).
export function stepDamage(ac, d, diag, dt) {
  // Fuel burns with the power the engine gives, and runs out through a holed tank.
  if (d.fuel > 0) {
    const burn = (diag.power * D.specificFuelConsumption * dt) / ac.fuel.capacity;
    const leak = D.leakRate * d.tank * dt;
    d.fuel = Math.max(0, d.fuel - burn - leak);
    if (d.fuel === 0) d.events.push('Out of fuel');
  }

  // Structure: damage grows between the limit and the ultimate load, and past the
  // never-exceed speed; a wing fails at the ultimate load or well past the speed.
  const ultimate = ac.structure.ultimateLoad;
  const limit = ultimate / D.safetyFactor;
  const load = Math.abs(diag.loadFactor);
  d.overload = Math.max(d.overload, load);
  const vne = ac.structure.neverExceedSpeed;
  const v = equivalentSpeed(diag);
  const xLoad = Math.max(0, (load - limit) / (ultimate - limit));
  const xSpeed = Math.max(0, (v - vne) / (D.overspeedMargin * vne));
  const x = Math.max(xLoad, xSpeed);
  if (x <= 0) return;
  if (x >= 1) {
    failWing(d);
  } else {
    for (const side of ['L', 'R']) d.wing[side] = clamp01(d.wing[side] + x * D.overloadRate * dt);
  }
  markFailures(d);
}

// A wing breaks: the more damaged one (the left if they are equal).
function failWing(d) {
  const side = d.wing.R > d.wing.L ? 'R' : 'L';
  d.wing[side] = 1;
}

// ---- the F4 test panel's buttons -------------------------------------------

export const TEST_DAMAGE = [
  { id: 'wingL', label: 'Left wing 50%' },
  { id: 'wingR', label: 'Right wing 50%' },
  { id: 'engine', label: 'Engine 50%' },
  { id: 'seize', label: 'Engine seized' },
  { id: 'tank', label: 'Fuel leak' },
  { id: 'tailplane', label: 'Tailplane 50%' },
  { id: 'fin', label: 'Fin 50%' },
  { id: 'aileron', label: 'Cut aileron cable' },
  { id: 'elevator', label: 'Cut elevator cable' },
  { id: 'rudder', label: 'Cut rudder cable' },
  { id: 'wound', label: 'Pilot wounded' },
  { id: 'kill', label: 'Pilot killed' },
  { id: 'repair', label: 'Repair all' },
];

export function applyTestDamage(d, id, surfaces) {
  switch (id) {
    case 'wingL': d.wing.L = clamp01(d.wing.L + 0.5); break;
    case 'wingR': d.wing.R = clamp01(d.wing.R + 0.5); break;
    case 'engine': d.engine = clamp01(d.engine + 0.5); break;
    case 'seize': d.engine = 1; break;
    case 'tank': d.tank = 1; break;
    case 'tailplane': d.tailplane = clamp01(d.tailplane + 0.5); break;
    case 'fin': d.fin = clamp01(d.fin + 0.5); break;
    case 'aileron': d.cables.aileron = surfaces?.roll ?? 0; break;
    case 'elevator': d.cables.elevator = surfaces?.pull ?? 0; break;
    case 'rudder': d.cables.rudder = surfaces?.yaw ?? 0; break;
    case 'wound': d.pilot = Math.max(d.pilot, 0.6); break;
    case 'kill': d.pilot = 1; break;
    case 'repair': resetDamage(d); return;
    default: return;
  }
  markFailures(d);
}

// For the F3 panel: one line per damaged part, or a single "none".
export function damageLines(d, ac) {
  const pct = (v) => `${Math.round(v * 100)}%`;
  const parts = [];
  if (d.wing.L > 0) parts.push(`left wing ${d.failed.L ? 'FAILED' : pct(d.wing.L)}`);
  if (d.wing.R > 0) parts.push(`right wing ${d.failed.R ? 'FAILED' : pct(d.wing.R)}`);
  if (d.engine > 0) parts.push(`engine ${engineSeized(d) ? 'SEIZED' : pct(d.engine)}`);
  if (d.tank > 0) parts.push(`fuel leak ${pct(d.tank)}`);
  if (d.tailplane > 0) parts.push(`tailplane ${pct(d.tailplane)}`);
  if (d.fin > 0) parts.push(`fin ${pct(d.fin)}`);
  for (const [name, v] of Object.entries(d.cables)) if (v !== null) parts.push(`${name} cable CUT`);
  if (d.pilot > 0) parts.push(pilotDead(d) ? 'pilot KILLED' : `pilot wounded ${pct(d.pilot)}`);
  const limit = ac ? ac.structure.ultimateLoad / D.safetyFactor : 0;
  return [`damage    ${parts.length ? parts.join(', ') : 'none'}`, `fuel      ${pct(d.fuel)}   worst load ${d.overload.toFixed(1)} g${ac ? ` (limit ${limit.toFixed(1)}, breaks ${ac.structure.ultimateLoad})` : ''}`];
}

