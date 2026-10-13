// Sopwith Camel F.1 with the Clerget 9B 130 hp rotary.
// Every value is a row in docs/AIRCRAFT_DATA.md (section "Sopwith Camel F.1").
// confidence: H = high, M = medium, E = estimate (see that file for reasons).

export const camel = {
  id: 'camel',
  name: 'Sopwith Camel F.1',
  side: 'Allied',
  instruments: { speed: 'mph', altitude: 'ft' }, // British instruments
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
    cylinders: 9, // (H) for the engine sound's firing rate; see AIRCRAFT_DATA
    ratedPower: 96900, // W at sea level (H)
    ratedRpm: 1250, // rpm (H)
    rotationSign: 1, // +1 = clockwise seen from the cockpit (M)
    rotatingInertia: 22.1, // kg m^2 about the crankshaft (E)
  },
  propeller: {
    diameter: 2.59, // m (E)
    blades: 2, // (H) two-bladed wooden propeller
    chord: 0.17, // m, blade width at the gun's radius (E) as drawn on the model
    gearRatio: 1, // propeller turns with the engine
  },
  // Undercarriage (body axes, from the centre of gravity). The main wheels'
  // height is derived from the propeller clearance; the tailskid height from
  // the three-point ground attitude (src/physics/ground.js).
  gear: {
    track: 1.422, // m, distance between the main wheels (M) 4 ft 8 in
    wheelRadius: 0.33, // m (E)
    mainAhead: 0.08, // main wheel contact ahead of the centre of gravity, fraction of length (E)
    tailAt: 0.62, // tailskid behind the centre of gravity, fraction of length (E)
    groundAngle: 0.192, // rad, three-point attitude, about 11 degrees nose up (E)
  },
  // Pilot's eye, body axes from the centre of gravity (E). Rendering only.
  cockpit: {
    eyeBehind: 0.72, // m behind the centre of gravity (E) far enough back to see the whole instrument board, near enough that the upper wing fills the top of the view
    eyeAbove: 0.76, // m above the centre of gravity (E) a little above the top of the guns, so the pilot sights along them
  },
  // Shape for the 3D model (rendering only), m unless noted. M = sourced, E = estimate.
  visual: {
    chord: 1.37, // wing chord, both wings (M) 4 ft 6 in
    stagger: 0.457, // upper wing ahead of the lower (M) 18 in
    lowerDihedral: 0.0873, // rad, lower wing 5 degrees; the upper is flat (M)
    tailSpan: 2.5, // tailplane span (M) 8 ft 2.5 in
    tailChord: 0.52, // tailplane chord (M) from its 14 sq ft area
    finHeight: 0.85, // fin and rudder height (E)
    fuselageDepth: 1.0, // greatest fuselage depth (E)
    fuselageWidth: 0.62, // greatest fuselage width (E)
    cowlingDiameter: 1.1, // engine cowling (E)
  },
  aero: {
    oswald: 0.75, // (E)
    cd0: 0.036, // zero-lift drag coefficient (E) from the calibration speed: npm run calibrate
    clMax: 1.3, // (E)
    staticMargin: 0.03, // fraction of chord (E)
    cnBeta: 0.07, // weathercock stability per rad (E)
  },
  // Guns (body axes, from the centre of gravity). Parallel to the thrust line, as the
  // synchroniser lets them fire only between propeller blades. Positions: on top of the fuselage ahead of the cockpit, a few inches apart (M position; the figures are E).
  guns: {
    type: 'vickers',
    rounds: 250, // per gun, King, 250 rounds per gun at first (M)
    synchroniser: 'Sopwith-Kauper rod gear on early aircraft, Constantinesco hydraulic gear later (M)',
    muzzleX: 1.72, // m ahead of the centre of gravity: about 0.30 of the length, just behind the propeller plane (E)
    muzzleY: 0.645, // m above the centre of gravity: on top of the cowling (E) its top is 0.60 m (cowling centre 0.05 + radius 0.55), plus the jacket's radius
    muzzleZ: 0.13, // m each side of the centre line: the two guns sit this far left and right (E)
  },
  // Fuel carried (kg) and the structure's strength; see docs/AIRCRAFT_DATA.md for sources and reasons.
  fuel: { capacity: 78 },
  structure: {
    ultimateLoad: 6.0, // g, load factor at which the wings fail (E)
    neverExceedSpeed: 70, // m/s equivalent airspeed above which wings begin to fail (E)
  },
  documented: {
    maxSpeed: 52.3, // m/s, 117 mph at sea level, Mason (M); drag is calibrated to this
    maxSpeedAltitude: 0, // m
    serviceCeiling: 5791, // m, 19,000 ft (M)
  },
};
