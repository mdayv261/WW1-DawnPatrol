// Universal constants (SI units). These are properties of the world, not of
// any one aircraft. Aircraft-specific numbers live in src/aircraft/.

export const G = 9.80665; // standard gravity, m/s^2

// International Standard Atmosphere (ISA)
export const ISA = {
  T0: 288.15, // sea-level temperature, K
  P0: 101325, // sea-level pressure, Pa
  RHO0: 1.225, // sea-level density, kg/m^3
  LAPSE: 0.0065, // temperature drop per metre in the troposphere, K/m
  R: 287.05287, // specific gas constant for dry air, J/(kg K)
  GAMMA: 1.4, // ratio of specific heats
  TROPOPAUSE: 11000, // m, top of the lapse-rate layer
  T_STRATO: 216.65, // K, constant-temperature layer above the tropopause
};

// Drag coefficient of a flat plate facing the wind (fully stalled wing).
export const FLAT_PLATE_CD = 1.98;

// Thin-airfoil theory gives a lift slope of 2*pi per radian; real sections
// reach about 90% of that.
export const SECTION_LIFT_SLOPE = 0.9 * 2 * Math.PI;
