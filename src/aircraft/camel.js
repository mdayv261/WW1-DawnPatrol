// Sopwith Camel F.1 with the Clerget 9B 130 hp rotary.
// Every value is a row in docs/AIRCRAFT_DATA.md (section "Sopwith Camel F.1").
// confidence: H = high, M = medium, E = estimate (see that file for reasons).

export const camel = {
  id: 'camel',
  name: 'Sopwith Camel F.1',
  side: 'Allied',
  wings: 2,
  geometry: {
    wingspan: 8.53, // m, upper wing (H)
    length: 5.72, // m (H)
    height: 2.59, // m (H)
    wingArea: 21.46, // m^2 (M)
  },
  // Wings, top to bottom: span and height above the lowest wing (m). Used for
  // the multiplane induced drag (Prandtl). Equal 28 ft spans; gap 5 ft at the
  // fuselage closing toward the tips (lower wing 5 deg dihedral), so the mean
  // gap 1.337 m is used (M).
  wingStack: [
    { span: 8.534, height: 1.337 },
    { span: 8.534, height: 0 },
  ],
  mass: {
    loaded: 659, // kg (M)
    ixx: 2997, // kg m^2 roll (E)
    iyy: 1941, // kg m^2 pitch (E)
    izz: 4937, // kg m^2 yaw (E)
  },
  engine: {
    kind: 'rotary',
    ratedPower: 96900, // W at sea level (H)
    ratedRpm: 1250, // rpm (H)
    rotationSign: 1, // +1 = clockwise seen from the cockpit (M)
    rotatingInertia: 22.1, // kg m^2 about the crankshaft (E)
  },
  propeller: {
    diameter: 2.59, // m (E)
    gearRatio: 1, // propeller turns with the engine
  },
  aero: {
    oswald: 0.75, // (E)
    cd0: 0.036, // zero-lift drag coefficient (E) from the calibration speed: npm run calibrate
    clMax: 1.3, // (E)
    staticMargin: 0.03, // fraction of chord (E)
    cnBeta: 0.07, // weathercock stability per rad (E)
  },
  documented: {
    maxSpeed: 52.3, // m/s, 117 mph at sea level, Mason (M); drag is calibrated to this
    maxSpeedAltitude: 0, // m
    serviceCeiling: 5791, // m, 19,000 ft (M)
  },
};
