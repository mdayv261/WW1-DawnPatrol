// Shared numbers of the damage model: how much a hit hurts each part, how damage
// changes the flight, and the structural limits' shape. Per-aircraft figures (fuel
// capacity, strength) are in each aircraft file. Every value is a row in
// docs/AIRCRAFT_DATA.md (section "Damage model") and almost all are ESTIMATES: no
// source gives them, and the reasons are in that file. SI units.

export const DAMAGE = {
  // --- how much a hit hurts: hits of the reference energy needed to take a part from 0 to 1
  energyRef: 1800, // J, the energy a .303 bullet carries at about 300 m (a hit of this energy counts as one hit)
  hitsToDestroy: {
    wing: 20, // one wing panel (spar and ribs, fabric)
    engine: 15,
    tank: 6,
    pilot: 3,
    tailplane: 15,
    fin: 12,
  },
  passLoss: 0.75, // share of its energy a bullet keeps after going through a wing, the tail or the fuselage
  cableCutChance: 0.03, // chance a hit on a wing (aileron cable) or on the fuselage or tail (elevator and rudder cables) cuts a cable

  // --- what damage does
  wingLiftLoss: 0.6, // fraction of one wing's lift lost at full damage (a wing that has failed loses all of it)
  wingDragGain: 0.5, // extra drag of one wing at full damage, as a fraction of its share of the drag
  wingStallBias: 0.05, // roll moment coefficient toward the more damaged wing when stalled, at full damage
  liftArm: 4 / (3 * Math.PI), // centre of lift of a half wing, as a fraction of the half span (elliptical loading)
  enginePowerLoss: 0.85, // fraction of power lost at full engine damage (the engine seizes only at full damage)
  seizedPropDrag: 0.35, // drag coefficient on the propeller disc of a stopped, locked propeller
  windmillPropDrag: 0.12, // the same for a propeller turning freely with the engine stopped (no fuel)
  windmillRpmFraction: 0.5, // propeller speed of a windmilling propeller at top speed, fraction of rated
  tailAuthorityLoss: 0.8, // fraction of elevator (or rudder) effect lost at full tailplane (or fin) damage
  tailStabilityLoss: 0.5, // fraction of pitch (or yaw) stability lost at full damage
  pilotAuthorityLoss: 0.5, // fraction of stick and rudder movement lost with a fully wounded pilot (dead is another case)
  pilotSlowing: 0.5, // fraction of control speed lost with a fully wounded pilot

  // --- fuel
  specificFuelConsumption: 1.11e-7, // kg per joule of shaft work (0.40 kg per kWh)
  leakRate: 0.0222, // fraction of the tank lost per second at full tank damage (about 1 / 45)

  // --- structure
  safetyFactor: 1.8, // ultimate load / limit load
  overloadRate: 0.25, // wing damage per second at the ultimate load (less below it, zero at the limit)
  overspeedMargin: 0.25, // wings fail this fraction above the never-exceed speed; damage builds from the speed itself
};
