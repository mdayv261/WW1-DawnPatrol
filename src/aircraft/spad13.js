// SPAD S.XIII with the Hispano-Suiza 8Be 220 hp geared V-8.
// Every value is a row in docs/AIRCRAFT_DATA.md (section "SPAD S.XIII").
// confidence: H = high, M = medium, E = estimate.

export const spad13 = {
  id: 'spad13',
  name: 'SPAD S.XIII',
  side: 'Allied',
  wings: 2,
  geometry: {
    wingspan: 8.2, // m (H)
    length: 6.3, // m (H)
    height: 2.41, // m (H)
    wingArea: 21.09, // m^2 (M)
  },
  mass: {
    loaded: 820, // kg gross (H)
    ixx: 3446, // kg m^2 (E)
    iyy: 2929, // kg m^2 (E)
    izz: 6375, // kg m^2 (E)
  },
  engine: {
    kind: 'inline',
    ratedPower: 164000, // W (M)
    ratedRpm: 2100, // crankshaft rpm (M)
    rotationSign: 1,
    rotatingInertia: 0, // inline engine: torque and gyro effects not modelled in Phase 1
  },
  propeller: {
    diameter: 2.5, // m (M)
    gearRatio: 0.75, // propeller turns at 0.75 x crankshaft speed (M)
  },
  aero: {
    oswald: 0.75, // (E)
    cd0: 0.0365, // (E)
    clMax: 1.3, // (E)
    staticMargin: 0.1, // (E)
    cnBeta: 0.12, // (E)
  },
  documented: {
    maxSpeed: 60.35, // m/s, 135 mph, altitude not stated (M)
    serviceCeiling: 5608, // m (M)
  },
};
