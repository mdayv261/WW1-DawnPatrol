// Albatros D.V with the Mercedes D.IIIa 6-cylinder inline.
// Every value is a row in docs/AIRCRAFT_DATA.md (section "Albatros D.V").
// confidence: H = high, M = medium, E = estimate.

export const albatrosDv = {
  id: 'albatros',
  name: 'Albatros D.V',
  side: 'Central',
  wings: 2,
  geometry: {
    wingspan: 9.0, // m (H)
    length: 7.3, // m (H)
    height: 2.8, // m (H)
    wingArea: 20.9, // m^2 (M)
  },
  // Wings, top to bottom (m). Spans 9.00 m and 8.73 m (Herris) (M); gap
  // 1.47 m taken from the closely related Albatros D.III (Oeffag) (E).
  wingStack: [
    { span: 9.0, height: 1.47 },
    { span: 8.73, height: 0 },
  ],
  mass: {
    loaded: 915, // kg gross (H)
    ixx: 4632, // kg m^2 (E)
    iyy: 4388, // kg m^2 (E)
    izz: 9021, // kg m^2 (E)
  },
  engine: {
    kind: 'inline',
    ratedPower: 130000, // W (M)
    ratedRpm: 1400, // rpm (M)
    rotationSign: 1, // +1 = clockwise seen from the cockpit (E): direction not found
    rotatingInertia: 0, // inline engine: torque and gyro effects not modelled in Phase 1
  },
  propeller: {
    diameter: 2.7, // m (E)
    gearRatio: 1, // direct drive
  },
  // Undercarriage (body axes, from the centre of gravity). The main wheels'
  // height is derived from the propeller clearance; the tailskid height from
  // the three-point ground attitude (src/physics/ground.js).
  gear: {
    track: 1.57, // m, distance between the main wheels (E) scaled from span
    wheelRadius: 0.33, // m (E)
    mainAhead: 0.08, // main wheel contact ahead of the centre of gravity, fraction of length (E)
    tailAt: 0.62, // tailskid behind the centre of gravity, fraction of length (E)
    groundAngle: 0.192, // rad, three-point attitude, about 11 degrees nose up (E)
  },
  // Pilot's eye, body axes from the centre of gravity (E). Rendering only.
  cockpit: {
    eyeBehind: 0.8, // m behind the centre of gravity
    eyeAbove: 0.6, // m above the centre of gravity
  },
  aero: {
    oswald: 0.75, // (E)
    cd0: 0.0602, // (E) from the calibration speed: npm run calibrate
    clMax: 1.3, // (E)
    staticMargin: 0.08, // (E)
    cnBeta: 0.12, // (E)
  },
  documented: {
    maxSpeed: 47.78, // m/s, 172 km/h (D.Va, 937 kg, 170 hp), Herris; altitude not stated, taken as sea level (M)
    maxSpeedAltitude: 0, // m
    serviceCeiling: 5800, // m, D.Va (M)
  },
};
