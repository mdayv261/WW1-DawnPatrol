// Nieuport 11 "Bébé" sesquiplane with the Le Rhône 9C 80 hp rotary.
// Every value is a row in docs/AIRCRAFT_DATA.md (section "Nieuport 11").
// confidence: H = high, M = medium, E = estimate (see that file for reasons).

export const nieuport11 = {
  id: 'n11',
  name: 'Nieuport 11',
  side: 'Allied',
  era: 'early', // 1916 (Early War)
  instruments: { speed: 'kmh', altitude: 'm' }, // French instruments
  wings: 2,
  geometry: {
    wingspan: 7.52, // m, upper wing (H)
    length: 5.64, // m (M) Green and Swanborough; Davilla and Soltan 5.50
    height: 2.4, // m (M)
    wingArea: 13.3, // m^2 (M)
  },
  // Sesquiplane: a large upper wing and a small, narrow lower wing (m). The lower span is derived
  // from the lower wing having half the upper wing's area (Green and Swanborough) with the two
  // chords (Davilla and Soltan); the gap is estimated from the height (E).
  wingStack: [
    { span: 7.52, height: 1.1 },
    { span: 6.4, height: 0 },
  ],
  mass: {
    loaded: 480, // kg (H)
    ixx: 1697, // kg m^2 (E)
    iyy: 1374, // kg m^2 (E)
    izz: 3071, // kg m^2 (E)
  },
  engine: {
    kind: 'rotary',
    cylinders: 9, // (H)
    ratedPower: 59660, // W at sea level (H) 80 hp
    ratedRpm: 1200, // rpm (H)
    rotationSign: 1, // +1 = clockwise seen from the cockpit (E)
    rotatingInertia: 11.8, // kg m^2 (E) from the 109 kg, 0.94 m engine
  },
  propeller: {
    diameter: 2.4, // m (E)
    blades: 2, // (E)
    chord: 0.15, // m (E)
    gearRatio: 1,
  },
  gear: {
    track: 1.6, // m (M) Davilla and Soltan
    wheelRadius: 0.33, // m (E)
    mainAhead: 0.08, // fraction of length (E)
    tailAt: 0.62, // fraction of length (E)
    groundAngle: 0.192, // rad (E)
  },
  cockpit: {
    eyeBehind: 0.65, // m behind the centre of gravity (E)
    eyeAbove: 0.65, // m above the centre of gravity (E)
  },
  visual: {
    chord: 1.2, // upper wing chord (M)
    lowerChord: 0.7, // lower wing chord (M) Davilla and Soltan; Sheps 0.6
    stagger: 0.6, // upper wing ahead of the lower (M)
    lowerDihedral: 0.1047, // rad, 6 degrees; the upper wing is flat (M)
    tailSpan: 3.25, // tailplane span (M) Davilla and Soltan
    tailChord: 0.6, // (E)
    finHeight: 0.8, // balanced rudder; no fixed fin (E)
    fuselageDepth: 0.8, // (E)
    fuselageWidth: 0.62, // (E)
    cowlingDiameter: 1.0, // (E) round the 0.94 m engine
  },
  aero: {
    oswald: 0.75, // (E)
    cd0: 0.0488, // (E) from the calibration speed: npm run calibrate
    clMax: 1.3, // (E)
    staticMargin: 0.05, // fraction of chord (E)
    cnBeta: 0.08, // per rad (E)
  },
  // No guns until phase E2 (the over-wing Lewis gun with drum changes).
  fuel: { capacity: 48 }, // kg (E) 2.5 hours at this model's cruise fuel use (Davilla and Soltan: endurance 2.5 h)
  structure: {
    ultimateLoad: 6.0, // g (E)
    neverExceedSpeed: 61, // m/s equivalent airspeed (E) 1.35 times the top speed
    // The weak lower wing (sourced qualitatively: it twisted and broke under stress). Limits (E);
    // its share of the lift from "half the upper wing's area" (M).
    lowerWing: { neverExceedSpeed: 52, ultimateLoad: 5.5, liftShare: 0.333 },
  },
  documented: {
    maxSpeed: 45.0, // m/s, 162 km/h at 2,000 m (M) Davilla and Soltan; drag is calibrated to this
    maxSpeedAltitude: 2000, // m (M)
    serviceCeiling: 5000, // m (M) Davilla and Soltan
  },
};
