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
];

// Pass/fail tolerances (fraction of the sourced value), set by the product owner.
export const TOLERANCE = {
  topSpeed: 0.05,
  climbTime: 0.15,
  climbRate: 0.15,
  serviceCeiling: 0.15,
  absoluteCeiling: 0.15,
};
