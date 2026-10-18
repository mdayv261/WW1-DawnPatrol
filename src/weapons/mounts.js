// Where an aircraft's guns are, and its optional loadouts.
//
// gunMounts() turns an aircraft's `guns` block into one muzzle per gun (body axes, from the
// centre of gravity): by default the mirrored pair at +-muzzleZ that every Late War aircraft
// has, a single gun on the centre line with `count: 1` (the Nieuport 11's over-wing Lewis), and
// any extra guns a loadout adds (the Fokker E.IV's third gun).

import { withConditions } from '../physics/performance.js';

export function gunMounts(ac) {
  const g = ac.guns;
  if (!g) return [];
  const base = g.count === 1
    ? [{ x: g.muzzleX, y: g.muzzleY, z: 0 }]
    : [-1, 1].map((side) => ({ x: g.muzzleX, y: g.muzzleY, z: side * g.muzzleZ }));
  return [...base, ...(g.extraGuns ?? []).map((m) => ({ x: m.x, y: m.y, z: m.z }))];
}

// Does this aircraft's gun feed from drums (changed in flight) rather than a belt?
export const drumFed = (ac) => ac.guns?.spareDrums !== undefined;

const cache = new WeakMap(); // aircraft -> loadout name -> the aircraft as flown with it

// The aircraft as flown with a loadout (ac.loadouts[name]): its extra guns, and its extra weight
// with the inertias scaled to suit (withConditions). The same object each time, so the flight
// model's per-aircraft caches are kept. With no loadout, or 'standard', the aircraft itself.
export function withLoadout(ac, name) {
  const lo = name ? ac.loadouts?.[name] : null;
  if (!lo) return ac;
  let byName = cache.get(ac);
  if (!byName) {
    byName = new Map();
    cache.set(ac, byName);
  }
  let flown = byName.get(name);
  if (!flown) {
    const heavier = withConditions(ac, { mass: ac.mass.loaded + lo.extraMass });
    // Named, for example, "Fokker E.IV, three guns (Immelmann)".
    flown = { ...heavier, name: `${ac.name}, ${lo.label.charAt(0).toLowerCase()}${lo.label.slice(1)}`, loadout: name, guns: { ...ac.guns, extraGuns: lo.extraGuns } };
    byName.set(name, flown);
  }
  return flown;
}
