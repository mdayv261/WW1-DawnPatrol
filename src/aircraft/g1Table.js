// The G1 standard drag function: drag coefficient of the standard "G1" projectile
// (a short blunt ogive-cylinder) against Mach number. A bullet's drag is the G1
// drag scaled by its ballistic coefficient (see src/aircraft/weapons.js).
//
// Source: Robert L. McCoy's tabulation of the G1 function (data file mcg1.txt,
// 79 points, Mach 0 to 5) as published by JBM Ballistics,
// https://jbmballistics.com/downloads.html. It is the standard small-arms
// table from Lowry, "Exterior Ballistics of Small Arms Projectiles" (Winchester-
// Western, 1965), and the same function the Ingalls tables describe above Mach 1.5.
// Values are copied unchanged. Confidence: high (published standard).

export const G1 = {
  mach: [
    0.00, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.70, 0.725,
    0.75, 0.775, 0.80, 0.825, 0.85, 0.875, 0.90, 0.925, 0.95, 0.975, 1.0, 1.025, 1.05, 1.075,
    1.10, 1.125, 1.15, 1.20, 1.25, 1.30, 1.35, 1.40, 1.45, 1.50, 1.55, 1.60, 1.65, 1.70, 1.75,
    1.80, 1.85, 1.90, 1.95, 2.00, 2.05, 2.10, 2.15, 2.20, 2.25, 2.30, 2.35, 2.40, 2.45, 2.50,
    2.60, 2.70, 2.80, 2.90, 3.00, 3.10, 3.20, 3.30, 3.40, 3.50, 3.60, 3.70, 3.80, 3.90, 4.00,
    4.20, 4.40, 4.60, 4.80, 5.00,
  ],
  cd: [
    0.2629, 0.2558, 0.2487, 0.2413, 0.2344, 0.2278, 0.2214, 0.2155, 0.2104, 0.2061, 0.2032,
    0.2020, 0.2034, 0.2165, 0.2230, 0.2313, 0.2417, 0.2546, 0.2706, 0.2901, 0.3136, 0.3415,
    0.3734, 0.4084, 0.4448, 0.4805, 0.5136, 0.5427, 0.5677, 0.5883, 0.6053, 0.6191, 0.6393,
    0.6518, 0.6589, 0.6621, 0.6625, 0.6607, 0.6573, 0.6528, 0.6474, 0.6413, 0.6347, 0.6280,
    0.6210, 0.6141, 0.6072, 0.6003, 0.5934, 0.5867, 0.5804, 0.5743, 0.5685, 0.5630, 0.5577,
    0.5527, 0.5481, 0.5438, 0.5397, 0.5325, 0.5264, 0.5211, 0.5168, 0.5133, 0.5105, 0.5084,
    0.5067, 0.5054, 0.5040, 0.5030, 0.5022, 0.5016, 0.5010, 0.5006, 0.4998, 0.4995, 0.4992,
    0.4990, 0.4988,
  ],
};
