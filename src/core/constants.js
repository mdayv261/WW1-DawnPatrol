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

// Prandtl's approximation for the mutual influence of two wings,
// sigma = (1 - A g) / (B + C g), g = gap / span. NACA TN-182 (1924), eq. (5).
// The scan prints B as "1.05", but the report's own worked example and
// Table I are only reproduced with 1.055, so 1.055 is used.
export const PRANDTL = { SIGMA_A: 0.66, SIGMA_B: 1.055, SIGMA_C: 3.7 };

// Unsupercharged piston engine power versus air density ratio s:
// P = P_sea_level * (A s - B). Virginia Tech AOE 3104 notes, "10. Thrust
// Models", eq. (2): A = 1.132, B = A - 1 = 0.132 (usually credited to Gagg
// and Farrar, SAE paper 340096, 1934).
export const ENGINE_LAPSE = { A: 1.132, B: 0.132 };

// Measured efficiency of 1917 wooden model propellers against advance ratio
// J = V / (n D): the mean of propellers No. 1-4 in Table III of Durand and
// Lesley, NACA Report 30 (1919). Peak 0.790 at J of about 0.825.
export const PROPELLER_EFFICIENCY = {
  J: [0.2, 0.3, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0],
  ETA: [0.342, 0.4775, 0.587, 0.627, 0.6668, 0.7003, 0.729, 0.7528, 0.771, 0.7838, 0.79, 0.789, 0.7755, 0.7433, 0.685],
  PEAK_J: 0.825,
};
