// The shared flight-model parameters (src/aircraft/common.js) as one aircraft sees them.
//
// An aircraft may override some of the shared control values with its own `controls`
// block, for example the Fokker E.IV's wing warping and all-moving tail. An aircraft
// without a `controls` block gets the very same shared object back, so its physics
// runs on exactly the same numbers as before the block existed.

const cache = new WeakMap(); // aircraft -> (shared parameters -> merged copy)
const MERGED = Symbol('aircraftCommon');

export function commonFor(ac, common) {
  if (!ac.controls || common[MERGED] === ac) return common;
  let byCommon = cache.get(ac);
  if (!byCommon) {
    byCommon = new WeakMap();
    cache.set(ac, byCommon);
  }
  let merged = byCommon.get(common);
  if (!merged) {
    merged = { ...common, ...ac.controls, [MERGED]: ac };
    byCommon.set(common, merged);
  }
  return merged;
}

// Fraction of full wing warp the pilot can hold at dynamic pressure q (Pa). Warping twists
// the whole outer wing, and the force needed grows with the airspeed: above the speed set
// by `warpForceSpeed` (m/s at sea-level density) the pilot can no longer pull full warp.
// 1 for aircraft with ailerons (no `warpForceSpeed`).
export function warpAuthority(common, q, seaLevelDensity) {
  if (!common.warpForceSpeed) return 1;
  const qFull = 0.5 * seaLevelDensity * common.warpForceSpeed * common.warpForceSpeed;
  return q > qFull ? qFull / q : 1;
}
