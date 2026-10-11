// Fokker Dr.I triplane with the Oberursel UR.II 110 hp rotary.
// Every value is a row in docs/AIRCRAFT_DATA.md (section "Fokker Dr.I").
// confidence: H = high, M = medium, E = estimate.

export const fokkerDr1 = {
  id: 'dr1',
  name: 'Fokker Dr.I',
  side: 'Central',
  wings: 3,
  geometry: {
    wingspan: 7.19, // m, upper wing (M)
    length: 5.77, // m (M)
    height: 2.95, // m (M)
    wingArea: 18.7, // m^2, all three wings (M)
  },
  mass: {
    loaded: 586, // kg (M)
    ixx: 1893, // kg m^2 (E)
    iyy: 1756, // kg m^2 (E)
    izz: 3649, // kg m^2 (E)
  },
  engine: {
    kind: 'rotary',
    ratedPower: 82000, // W (M)
    ratedRpm: 1200, // rpm (M)
    rotationSign: 1, // +1 = clockwise seen from the cockpit (E)
    rotatingInertia: 18.8, // kg m^2 (E), scaled from the Clerget 9B
  },
  propeller: {
    diameter: 2.6, // m (E)
    gearRatio: 1,
  },
  aero: {
    oswald: 0.75, // (E)
    cd0: 0.043, // (E)
    clMax: 1.4, // (E)
    staticMargin: 0.04, // (E)
    cnBeta: 0.08, // (E)
  },
  documented: {
    maxSpeed: 46.0, // m/s, 103 mph, altitude not stated (M); another source gives 51.4
    serviceCeiling: 6000, // m (M)
  },
};
