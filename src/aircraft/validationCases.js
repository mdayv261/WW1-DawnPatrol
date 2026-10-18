// Sourced performance figures used to validate the flight model.
//
// Each case is one source's data for one aircraft, flown at that source's
// conditions (loaded mass in kg, engine power in W) where they differ from
// the aircraft data file. Each value has a row in docs/AIRCRAFT_DATA.md
// ("Validation data"); `source` is the source ID used there.
//
// Check types:
//   topSpeed      level top speed (m/s) at `altitude` (m)
//   climbTime     time (s) to climb from sea level to `altitude`
//   climbRate     best steady climb rate (m/s) at `altitude`
//   serviceCeiling / absoluteCeiling   altitude (m)
// `calibration: true` marks the one figure each aircraft's drag (CD0) is
// fitted to; it matches by construction and proves nothing on its own.

const hp = (h) => h * 745.7; // horsepower to watts
const mph = (v) => v * 0.44704; // to m/s
const kmh = (v) => v / 3.6; // to m/s
const ft = (h) => h * 0.3048; // to m
const mins = (m, s = 0) => m * 60 + s; // to seconds

export const VALIDATION_CASES = [
  // ---- Sopwith Camel F.1, 130 hp Clerget
  {
    id: 'camel-mason', aircraft: 'camel', source: 'S22', conditions: { mass: 659 },
    note: 'Mason, The British Fighter since 1912 (130 hp Clerget, 1,453 lb).',
    checks: [
      { type: 'topSpeed', altitude: 0, value: mph(117), calibration: true },
      { type: 'topSpeed', altitude: ft(10000), value: mph(113) },
      { type: 'climbTime', altitude: ft(10000), value: mins(10, 35) },
      { type: 'serviceCeiling', value: ft(19000) },
    ],
  },
  {
    id: 'camel-king', aircraft: 'camel', source: 'S23', conditions: { mass: 672 },
    note: 'King, Sopwith Aircraft 1912-1920 (130 hp Clerget, 1,482 lb).',
    // Known deviations: King's speeds are about 8% below Mason's for the same
    // engine, so no model can match both. The model matches Mason.
    deviations: {
      'topSpeed@3048': 'Source conflict: King is about 8% slower than Mason (S22) at the same height; the model matches Mason within 0.3%.',
      'topSpeed@4572': 'Source conflict with Mason (S22), as above.',
      serviceCeiling: 'King gives 18,000 ft and Mason 19,000 ft; the model is above both (see FLIGHT_VALIDATION.md).',
    },
    checks: [
      { type: 'topSpeed', altitude: ft(10000), value: mph(104.5) },
      { type: 'topSpeed', altitude: ft(15000), value: mph(97.5) },
      { type: 'climbTime', altitude: ft(10000), value: mins(11, 45) },
      { type: 'climbTime', altitude: ft(15000), value: mins(23, 15) },
      { type: 'serviceCeiling', value: ft(18000) },
    ],
  },
  {
    id: 'camel-green', aircraft: 'camel', source: 'S24', conditions: { mass: 659 },
    note: 'Green and Swanborough, The Complete Book of Fighters (130 hp Clerget 9B).',
    checks: [
      { type: 'topSpeed', altitude: ft(6500), value: mph(115) },
      { type: 'climbTime', altitude: ft(6500), value: mins(6) },
    ],
  },

  // ---- SPAD S.XIII
  {
    id: 'spad-mccook', aircraft: 'spad13', source: 'S17', conditions: { mass: 924 },
    note: 'McCook Field test of S.XIII 17956, 1921, at 924 kg. Titled "220 h.p. Wright engine"; the as-modelled 220 hp is used.',
    // Known deviations: which engine the test aircraft had is uncertain. With
    // the 197 hp 8Ba (re-deriving drag) every check passes; with the 220 hp
    // named in the title, the model climbs too well. Product owner decided
    // (11 Oct 2026) to keep 220 hp until the original report is found.
    deviations: {
      'climbTime@1981': 'Test engine uncertain: 220 hp (report title) gives -21%; 197 hp (8Ba, article text) gives -9%.',
      'climbTime@4572': 'Test engine uncertain: 220 hp gives -26%; 197 hp gives -13%.',
      serviceCeiling: 'Test engine uncertain: 220 hp gives +15.0% (just outside); 197 hp gives +8%.',
    },
    checks: [
      { type: 'topSpeed', altitude: 1981, value: kmh(213), calibration: true },
      { type: 'climbTime', altitude: ft(6500), value: mins(6.5) },
      { type: 'climbTime', altitude: ft(15000), value: mins(23) },
      { type: 'serviceCeiling', value: ft(18400) },
      { type: 'absoluteCeiling', value: ft(20000) },
    ],
  },
  {
    id: 'spad-usaf', aircraft: 'spad13', source: 'S5', conditions: {},
    note: 'USAF Museum fact sheet, 135 mph; altitude not stated, compared at sea level.',
    checks: [{ type: 'topSpeed', altitude: 0, value: mph(135) }],
  },

  // ---- Fokker Dr.I, 110 hp Oberursel UR.II
  {
    id: 'dr1-green', aircraft: 'dr1', source: 'S24', conditions: {},
    note: 'Green and Swanborough: 185 km/h at sea level, 165 km/h at 4,000 m.',
    checks: [
      { type: 'topSpeed', altitude: 0, value: kmh(185), calibration: true },
      { type: 'topSpeed', altitude: 4000, value: kmh(165) },
    ],
  },
  {
    id: 'dr1-thetford', aircraft: 'dr1', source: 'S27', conditions: {},
    note: 'Thetford and Gray, German Aircraft of the First World War.',
    checks: [
      { type: 'climbTime', altitude: 1000, value: mins(2.9) },
      { type: 'serviceCeiling', value: ft(20000) },
    ],
  },
  {
    id: 'dr1-herris', aircraft: 'dr1', source: 'S26', conditions: { mass: 571 },
    note: 'Herris, Fokker Aircraft of WWI vol. 4: Fokker type description (Baubeschreibung) figures at 571 kg; manufacturer data.',
    // Known deviations: the manufacturer's table implies a faster climb in the
    // second kilometre than the first, which an unsupercharged engine cannot
    // do; above 1,000 m the model climbs slower than this table.
    deviations: {
      'climbTime@2000': 'Manufacturer data, internally inconsistent (2nd km climbed faster than the 1st); model +25%.',
      'climbTime@3000': 'As above; model +27%.',
      'climbTime@4000': 'As above; model +33%.',
      'climbTime@5000': 'As above; model +34%.',
    },
    checks: [
      { type: 'climbTime', altitude: 1000, value: mins(2.9) },
      { type: 'climbTime', altitude: 2000, value: mins(5.5) },
      { type: 'climbTime', altitude: 3000, value: mins(9.3) },
      { type: 'climbTime', altitude: 4000, value: mins(13.9) },
      { type: 'climbTime', altitude: 5000, value: mins(21.9) },
      { type: 'serviceCeiling', value: 6000 },
    ],
  },
  {
    id: 'dr1-aviodrome', aircraft: 'dr1', source: 'S7', conditions: {},
    note: 'Aviodrome: rate of climb 5.7 m/s, altitude not stated (taken as sea level).',
    checks: [{ type: 'climbRate', altitude: 0, value: 5.7 }],
  },

  // ---- Albatros D.V / D.Va
  {
    id: 'albatros-dva-herris', aircraft: 'albatros', source: 'S25', conditions: { mass: 937, power: hp(170) },
    note: 'Herris, Albatros Aircraft of WWI vol. 4: D.Va, 170 hp Mercedes D.IIIa, 937 kg. Speed altitude not stated (taken as sea level).',
    // Known deviation: above 4,000 m the model climbs slower than the table.
    deviations: {
      'climbTime@5000': 'Model loses climb above 4,000 m faster than the source (+19%); see FLIGHT_VALIDATION.md.',
    },
    checks: [
      { type: 'topSpeed', altitude: 0, value: kmh(172), calibration: true },
      { type: 'climbTime', altitude: 1000, value: mins(4) },
      { type: 'climbTime', altitude: 2000, value: mins(8, 48) },
      { type: 'climbTime', altitude: 3000, value: mins(14, 47) },
      { type: 'climbTime', altitude: 4000, value: mins(22, 45) },
      { type: 'climbTime', altitude: 5000, value: mins(35) },
      { type: 'serviceCeiling', value: 5800 },
    ],
  },
  {
    id: 'albatros-dv-herris', aircraft: 'albatros', source: 'S25', conditions: { mass: 915, power: hp(160) },
    note: 'Herris: D.V, 160 hp Mercedes D.III, 915 kg. Speed altitude not stated (taken as sea level).',
    deviations: {
      'climbTime@5000': 'As for the D.Va (+38%); the source gives the same 35 min for both versions.',
    },
    checks: [
      { type: 'topSpeed', altitude: 0, value: kmh(170) },
      { type: 'climbTime', altitude: 1000, value: mins(4, 20) },
      { type: 'climbTime', altitude: 2000, value: mins(8, 50) },
      { type: 'climbTime', altitude: 3000, value: mins(14, 30) },
      { type: 'climbTime', altitude: 4000, value: mins(22, 40) },
      { type: 'climbTime', altitude: 5000, value: mins(35) },
    ],
  },

  // ---- Fokker E.IV, 160 hp Oberursel U.III (Early War). Fewer, weaker sources than the
  // Late War aircraft: book transcriptions only, and no altitude for the top speed.
  {
    id: 'e4-herris', aircraft: 'e4', source: 'S54', conditions: { mass: 724 },
    note: 'Herris and Scott, Fokker Aircraft of WWI vol. 2: Eindeckers (724 kg). Top speed altitude not given: taken as sea level.',
    deviations: {
      'climbTime@2000': 'The model, at the sourced 160 hp rating, climbs much faster than every source. The books say the U.III gave less than its rating (Weyl, Thetford and Gray) but none gives a figure; about 120 hp would match. Kept at 160 hp by product owner decision (18 Oct 2026).',
      'climbTime@3000': 'Engine output below its rating, as for 2,000 m (see FLIGHT_VALIDATION.md).',
      'climbTime@4000': 'Engine output below its rating, as for 2,000 m (see FLIGHT_VALIDATION.md).',
    },
    checks: [
      { type: 'topSpeed', altitude: 0, value: kmh(160), calibration: true },
      { type: 'climbTime', altitude: 1000, value: mins(3) },
      { type: 'climbTime', altitude: 2000, value: mins(8) },
      { type: 'climbTime', altitude: 3000, value: mins(15) },
      { type: 'climbTime', altitude: 4000, value: mins(25) },
    ],
  },
  {
    id: 'e4-weyl', aircraft: 'e4', source: 'S56', conditions: { mass: 724 },
    note: "Weyl, Fokker: The Creative Years: Parschau's test report of 13 Nov 1915 (two guns, 950 rounds, fuel for 1.5 h; weight not given, the loaded weight is used).",
    deviations: {
      'climbTime@3000': 'Engine output below its rating: the model at 160 hp climbs faster than this test (see e4-herris and FLIGHT_VALIDATION.md).',
      'climbTime@4000': 'Engine output below its rating, as above; Weyl also reports the U.III losing revs at height.',
    },
    checks: [
      { type: 'climbTime', altitude: 2000, value: mins(7) },
      { type: 'climbTime', altitude: 3000, value: mins(15) },
      { type: 'climbTime', altitude: 4000, value: mins(28, 30) },
    ],
  },
  {
    id: 'e4-thetford', aircraft: 'e4', source: 'S55', conditions: { mass: 722.6 },
    note: 'Thetford and Gray, German Aircraft of the First World War (1,593 lb).',
    deviations: { serviceCeiling: 'Engine output below its rating: at 160 hp the model ceiling is well above both books (see e4-herris).' },
    checks: [{ type: 'serviceCeiling', value: ft(13500) }],
  },
  {
    id: 'e4-green', aircraft: 'e4', source: 'S55', conditions: { mass: 724 },
    note: 'Green and Swanborough, The Complete Book of Fighters (724 kg).',
    deviations: { serviceCeiling: 'Engine output below its rating: at 160 hp the model ceiling is well above both books (see e4-herris).' },
    checks: [{ type: 'serviceCeiling', value: 4500 }],
  },

  // ---- Nieuport 11, 80 hp Le Rhône 9C (Early War). The sources disagree on the top speed.
  {
    id: 'n11-davilla', aircraft: 'n11', source: 'S58', conditions: { mass: 480 },
    note: 'Davilla and Soltan, French Aircraft of the First World War (480 kg).',
    checks: [
      { type: 'topSpeed', altitude: 2000, value: kmh(162), calibration: true },
      { type: 'climbTime', altitude: 2000, value: mins(8, 30) },
      { type: 'climbTime', altitude: 3000, value: mins(15) },
      { type: 'serviceCeiling', value: 5000 },
    ],
  },
  {
    id: 'n11-green', aircraft: 'n11', source: 'S59', conditions: { mass: 480 },
    note: 'Green and Swanborough, The Complete Book of Fighters (480 kg).',
    checks: [
      { type: 'topSpeed', altitude: 0, value: kmh(167) },
      { type: 'climbTime', altitude: 3000, value: mins(15) },
    ],
  },
  {
    id: 'n11-thetford', aircraft: 'n11', source: 'S59', conditions: { mass: 480 },
    note: 'Thetford, British Naval Aircraft since 1912 (RNAS aircraft; weight not given, the loaded weight is used).',
    // Known deviations: Thetford's RNAS figures are slower than both other books. The model
    // matches Davilla and Soltan and Green and Swanborough (product owner decision, 18 Oct 2026).
    deviations: {
      'topSpeed@0': 'Source conflict: Thetford is 7% slower than Green and Swanborough (S59) at sea level; the model matches them within 0.3%.',
      'climbTime@1000': 'Source conflict: Thetford climbs far slower than Davilla and Soltan (S58) and Green and Swanborough, whom the model matches.',
      'climbTime@2987': 'Source conflict with Davilla and Soltan (S58) and Green and Swanborough, as above.',
    },
    checks: [
      { type: 'topSpeed', altitude: 0, value: mph(97) },
      { type: 'climbTime', altitude: ft(3280), value: mins(5) },
      { type: 'climbTime', altitude: ft(9800), value: mins(18) },
      { type: 'serviceCeiling', value: ft(18000) },
    ],
  },
];

// Pass/fail tolerances (fraction of the sourced value), set by the product owner.
export const TOLERANCE = {
  topSpeed: 0.05,
  climbTime: 0.15,
  climbRate: 0.15,
  serviceCeiling: 0.15,
  absoluteCeiling: 0.15,
};
