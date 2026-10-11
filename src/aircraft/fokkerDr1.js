// Fokker Dr.I triplane with the Oberursel UR.II 110 hp rotary.
// Every value is a row in docs/AIRCRAFT_DATA.md (section "Fokker Dr.I").
// confidence: H = high, M = medium, E = estimate.

export const fokkerDr1 = {
  id: 'dr1',
  name: 'Fokker Dr.I',
  side: 'Central',
  instruments: { speed: 'kmh', altitude: 'm' }, // German instruments
  wings: 3,
  geometry: {
    wingspan: 7.19, // m, upper wing (M)
    length: 5.77, // m (M)
    height: 2.95, // m (M)
    wingArea: 18.7, // m^2, all three wings (M)
  },
  // Wings, top to bottom (m). Spans from Herris (M); gaps 0.88 m and 0.86 m
  // taken from the closely related MAG-Fokker 90.03 (E).
  wingStack: [
    { span: 7.19, height: 1.74 },
    { span: 6.225, height: 0.86 },
    { span: 5.725, height: 0 },
  ],
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
  // Undercarriage (body axes, from the centre of gravity). The main wheels'
  // height is derived from the propeller clearance; the tailskid height from
  // the three-point ground attitude (src/physics/ground.js).
  gear: {
    track: 1.25, // m, distance between the main wheels (E) scaled from span
    wheelRadius: 0.33, // m (E)
    mainAhead: 0.08, // main wheel contact ahead of the centre of gravity, fraction of length (E)
    tailAt: 0.62, // tailskid behind the centre of gravity, fraction of length (E)
    groundAngle: 0.192, // rad, three-point attitude, about 11 degrees nose up (E)
  },
  // Pilot's eye, body axes from the centre of gravity (E). Rendering only.
  cockpit: {
    eyeBehind: 0.63, // m behind the centre of gravity
    eyeAbove: 0.6, // m above the centre of gravity
  },
  // Shape for the 3D model (rendering only), m unless noted. M = sourced, E = estimate.
  visual: {
    chord: 1.0, // wing chord, all three wings (M)
    stagger: 0.15, // each wing ahead of the one below (E)
    tailSpan: 2.6, // tailplane span (E)
    tailChord: 0.7, // tailplane chord (E)
    finHeight: 0.9, // rudder height; there is no fixed fin (E)
    fuselageDepth: 0.85, // greatest fuselage depth (E)
    fuselageWidth: 0.62, // greatest fuselage width (E)
    cowlingDiameter: 1.04, // engine cowling (E)
  },
  aero: {
    oswald: 0.75, // (E)
    cd0: 0.0356, // (E) from the calibration speed: npm run calibrate
    clMax: 1.4, // (E)
    staticMargin: 0.04, // (E)
    cnBeta: 0.08, // (E)
  },
  documented: {
    maxSpeed: 51.39, // m/s, 185 km/h at sea level (M); drag is calibrated to this. 103 mph is the 4,000 m figure
    maxSpeedAltitude: 0, // m
    serviceCeiling: 6000, // m (M)
  },
};
