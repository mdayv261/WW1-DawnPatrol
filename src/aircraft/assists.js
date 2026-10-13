// The optional assists (Options screen): auto-rudder and the stall, G and overspeed warnings.
// They are game aids, not historical equipment, so these numbers are design choices (recorded
// in docs/DECISIONS.md, D62), tuned so the aids work in all four aircraft. The limits they warn
// about are each aircraft's own documented figures (structure, stall), not new ones.

const DEG = Math.PI / 180;

// Auto-rudder: rudder that keeps the sideslip at zero (the slip ball in the centre), as a
// pilot's feet do. Three parts, tuned in hard reversing turns in all four aircraft (product
// owner: the first version set up yaw oscillations while manoeuvring hard):
// - a yaw damper: rudder against the nose swinging faster or slower than a balanced turn at
//   this bank needs (the main part; it calms the swing instead of chasing the slip);
// - a lead with the roll: a little rudder the way the aircraft rolls (against adverse yaw);
// - the sideslip itself (smoothed; firmer slow, softer fast, as the rudder bites with the
//   square of the speed: gains x (refSpeed / speed)^2 within minScale..maxScale), with a
//   summed part that holds steady rudder against a rotary's steady swing.
// It uses at most `authority` of the rudder in the air and lets go as the wing stalls.
export const AUTO_RUDDER = {
  slipGain: 3, // per radian of sideslip, at refSpeed
  integralGain: 6, // per radian-second
  rateGain: 0.4, // per radian per second of sideslip change
  yawDamping: 1.2, // per rad/s of unbalanced yaw rate, at refSpeed
  rollLead: 0.4, // per rad/s of roll rate, at refSpeed
  refSpeed: 45, // m/s
  minScale: 0.15,
  maxScale: 4,
  integralLimit: 0.6, // the most rudder the summed part may hold (the rotary's steady swing)
  override: 0.02, // pilot rudder beyond this takes over
  minSpeed: 5, // m/s: below this (taxiing) the pilot steers
  groundRateGain: 3, // on the ground: rudder per rad/s of swing (stops a swing before it becomes a ground loop)
  smoothing: 0.08, // s: the sideslip it reads is smoothed over about this long
  authority: 0.7, // the most rudder it uses in the air (the pilot has the rest)
  rollRateHold: 0.5, // rad/s: rolling faster than this, the summed part stops building
};

export const WARNINGS = {
  stallMargin: 2 * DEG, // warn this far before the wing's stall angle
  minSpeed: 15, // m/s: no stall warning slower than this (on the ground, taxiing)
  loadCaution: 0.85, // amber G warning from this share of the limit load (where damage starts)
  speedCaution: 0.95, // amber overspeed warning from this share of the never-exceed speed
};
