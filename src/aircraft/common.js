// Flight-model parameters shared by all four aircraft.
//
// EVERY value here is an ESTIMATE: no measured WWI stability or control data
// was found (see docs/AIRCRAFT_DATA.md, "Common flight-model parameters",
// where each value has its reason). The Phase 1 tuning rule is that a value
// may only change together with its row in that document.
//
// Sign conventions: "pull" is stick back (nose up). Rudder positive = nose
// right. Roll positive = right wing down. Coefficients are the usual
// aerodynamic ones, defined in aeroplane axes (x forward, y right, z down).

export const common = {
  // --- stall and post-stall shape
  alphaZeroLift: (-3 * Math.PI) / 180, // rad, angle of attack at zero lift
  stallWidth: 0.0175, // rad, how sharply lift falls past the stall (about 1 degree)
  autorotationGain: 1.5, // roll damping reverses sign when fully stalled
  stallYawDampingLoss: 0.3, // fraction of yaw damping lost when fully stalled
  stallDihedralFlip: 3, // sideslip roll effect reverses when fully stalled
  autorotationRate: 0.32, // non-dimensional roll rate (p*b/2V) where autorotation levels off
  stallNoseDown: 0.2, // pitching moment coefficient per unit sin(alpha) when stalled (flat-plate theory suggests 0.5; reduced because the tail contributes)
  stallWingDropBias: -0.03, // small fixed left-wing-down roll moment coefficient when fully stalled (rigging asymmetry)
  stallRollYaw: 0.1, // yaw moment toward the dropping wing per unit non-dimensional roll rate when stalled
  stallElevatorLoss: 0.5, // fraction of elevator effect lost when fully stalled

  // --- stability derivatives (per radian, or per unit of rate)
  cyBeta: -0.35, // side force from sideslip
  clBeta: -0.07, // roll from sideslip (dihedral effect)
  clP: -0.4, // roll damping
  clR: 0.1, // roll from yaw rate
  cmQ: -8, // pitch damping
  cnR: -0.12, // yaw damping

  // --- control power
  cmDeltaPull: 1.2, // nose-up pitching moment per radian of stick-back deflection
  clDeltaRoll: 0.2, // roll moment per radian of aileron
  cnDeltaYaw: 0.08, // nose-right moment per radian of rudder
  cnDeltaRoll: -0.02, // adverse yaw from aileron
  maxPull: 0.44, // rad, elevator travel (about 25 degrees)
  maxRoll: 0.35, // rad, aileron travel (about 20 degrees)
  maxYaw: 0.44, // rad, rudder travel (about 25 degrees)
  surfaceRate: 4, // control travel per second (full travel in a quarter second)
  trimAuthority: 0.4, // fraction of full elevator travel the trim lever can add

  // --- engine and propeller
  propEfficiencyPeak: 0.7, // best propeller efficiency
  propDesignSpeedFraction: 0.9, // propeller is best at this fraction of top speed
  propStaticMerit: 0.6, // figure of merit for static thrust
  torqueRigging: 0.8, // fraction of engine torque (at 60% throttle) the rigging cancels
  idlePowerFraction: 0.05, // power at throttle zero, fraction of rated
  idleRpmFraction: 0.55, // engine speed at throttle zero, fraction of rated
};
