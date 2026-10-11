// SPAD S.XIII with the Hispano-Suiza 8Be 220 hp geared V-8.
// Every value is a row in docs/AIRCRAFT_DATA.md (section "SPAD S.XIII").
// confidence: H = high, M = medium, E = estimate.

export const spad13 = {
  id: 'spad13',
  name: 'SPAD S.XIII',
  side: 'Allied',
  instruments: { speed: 'kmh', altitude: 'm' }, // French instruments
  wings: 2,
  geometry: {
    wingspan: 8.2, // m (H)
    length: 6.3, // m (H)
    height: 2.41, // m (H)
    wingArea: 21.09, // m^2 (M)
  },
  // Wings, top to bottom (m). Equal span and chord; gap 3 ft 10.5 in (M).
  wingStack: [
    { span: 8.2, height: 1.181 },
    { span: 8.2, height: 0 },
  ],
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
    rotationSign: 1, // +1 = right-hand propeller, clockwise seen from the cockpit (E): the left-hand 8B engine drives it through reversing reduction gears
    rotatingInertia: 0, // inline engine: torque and gyro effects not modelled in Phase 1
  },
  propeller: {
    diameter: 2.5, // m (M)
    gearRatio: 0.75, // propeller turns at 0.75 x crankshaft speed (M)
  },
  // Undercarriage (body axes, from the centre of gravity). The main wheels'
  // height is derived from the propeller clearance; the tailskid height from
  // the three-point ground attitude (src/physics/ground.js).
  gear: {
    track: 1.492, // m, distance between the main wheels (M) 4 ft 10.75 in
    wheelRadius: 0.33, // m (E)
    mainAhead: 0.08, // main wheel contact ahead of the centre of gravity, fraction of length (E)
    tailAt: 0.62, // tailskid behind the centre of gravity, fraction of length (E)
    groundAngle: 0.192, // rad, three-point attitude, about 11 degrees nose up (E)
  },
  // Pilot's eye, body axes from the centre of gravity (E). Rendering only.
  cockpit: {
    eyeBehind: 0.69, // m behind the centre of gravity
    eyeAbove: 0.6, // m above the centre of gravity
  },
  // Shape for the 3D model (rendering only), m unless noted. M = sourced, E = estimate.
  visual: {
    chord: 1.4, // wing chord, both wings (M)
    stagger: 0.4, // upper wing ahead of the lower (E)
    tailSpan: 2.6, // tailplane span (E)
    tailChord: 0.7, // tailplane chord (E)
    finHeight: 0.8, // fin and rudder height (E)
    fuselageDepth: 0.9, // greatest fuselage depth (E)
    fuselageWidth: 0.62, // greatest fuselage width (E)
    cowlingDiameter: 0.8, // engine cowling (E)
  },
  aero: {
    oswald: 0.75, // (E)
    cd0: 0.039, // (E) from the calibration speed: npm run calibrate
    clMax: 1.3, // (E)
    staticMargin: 0.1, // (E)
    cnBeta: 0.12, // (E)
  },
  documented: {
    maxSpeed: 59.17, // m/s, 213 km/h at 1,981 m, McCook Field test at 924 kg (M); drag is calibrated to this
    maxSpeedAltitude: 1981, // m
    serviceCeiling: 5608, // m (M)
  },
};
