// Fokker E.IV (M.15) monoplane with the Oberursel U.III 160 hp two-row rotary.
// Every value is a row in docs/AIRCRAFT_DATA.md (section "Fokker E.IV").
// confidence: H = high, M = medium, E = estimate (see that file for reasons).
// No E.IV survives; its data come from reference books quoting Fokker and German records.

export const fokkerE4 = {
  id: 'e4',
  name: 'Fokker E.IV',
  side: 'Central',
  era: 'early', // 1916 (Early War)
  instruments: { speed: 'kmh', altitude: 'm' }, // German instruments
  wings: 1,
  geometry: {
    wingspan: 10.0, // m (M) Green and Swanborough; Herris and Scott 10.05, Thetford and Gray 9.75
    length: 7.5, // m (M)
    height: 2.77, // m (M)
    wingArea: 16.0, // m^2 (M) Herris and Scott; Green and Swanborough 16.3
  },
  // A single wing: no multiplane interference (Prandtl factor 1).
  wingStack: [{ span: 10.0, height: 0 }],
  mass: {
    loaded: 724, // kg (H) three books agree
    ixx: 4525, // kg m^2 roll (E)
    iyy: 3665, // kg m^2 pitch (E)
    izz: 8190, // kg m^2 yaw (E)
  },
  engine: {
    kind: 'rotary',
    cylinders: 14, // (H) two rows of seven
    ratedPower: 119300, // W at sea level (H) 160 hp
    ratedRpm: 1200, // rpm (M) Deutsches Museum
    rotationSign: 1, // +1 = clockwise seen from the cockpit (E)
    rotatingInertia: 23.6, // kg m^2 about the crankshaft (E) from the 193 kg engine
    // Revs lost with height beyond the shared law (M/E): Weyl, a new engine lost 40-50 rpm "at
    // altitude"; the altitude is an estimate (Boelcke's complaint was about climbing above 3,000 m).
    altitudeRpmLoss: { rpm: 45, altitude: 3000 },
  },
  propeller: {
    diameter: 2.7, // m (E)
    blades: 2, // (E) two-bladed wooden propeller
    chord: 0.17, // m, blade width at the guns' radius (E)
    gearRatio: 1,
  },
  gear: {
    track: 1.74, // m (E) scaled from the span
    wheelRadius: 0.33, // m (E)
    mainAhead: 0.08, // fraction of length (E)
    tailAt: 0.62, // fraction of length (E)
    groundAngle: 0.192, // rad (E)
  },
  cockpit: {
    eyeBehind: 1.0, // m behind the centre of gravity (E) behind the wing's trailing edge
    eyeAbove: 0.75, // m above the centre of gravity (E) sighting along the guns
  },
  visual: {
    chord: 1.81, // wing chord (M) Herris and Scott
    stagger: 0, // a monoplane has none
    wingHeight: 2.05, // m, wing root above the wheels' contact (E): a shoulder wing on the top longerons (the fuselage top is 0.45 m above the CG), below the pylon
    tailSpan: 3.0, // all-moving elevator span (E)
    tailChord: 0.8, // (E)
    finHeight: 1.0, // all-moving comma rudder; there is no fixed fin (E)
    fuselageDepth: 0.9, // (E)
    fuselageWidth: 0.75, // (E)
    cowlingDiameter: 1.15, // (E) round the two-row engine
  },
  aero: {
    oswald: 0.8, // (E) a single braced wing
    cd0: 0.0961, // (E) from the calibration speed: npm run calibrate
    clMax: 1.3, // (E)
    staticMargin: 0.02, // fraction of chord (E): near neutral, the all-moving elevator "demanded continual vigilance"
    cnBeta: 0.08, // weathercock stability per rad (E): as the Dr.I, which also had a rudder and no fixed fin
  },
  // Wing warping and all-moving tail surfaces: this aircraft's own control values, in place of
  // the shared ones in common.js (src/physics/aircraftCommon.js). All estimates (E): no source
  // gives roll rate, stick force or control effectiveness.
  controls: {
    rollType: 'warping',
    clDeltaRoll: 0.2, // roll effectiveness per rad of warp (E): as the shared ailerons; the heaviness comes from the linkage and the force limit
    rollRate: 3, // roll control travel per second (E): slower than the shared 4, a heavy warping linkage
    warpForceSpeed: 42, // m/s at sea-level density (E): above it the pilot cannot hold full warp
    cdWarp: 0.02, // extra drag coefficient per rad of warp (E): the twisted wing
    cnDeltaRoll: -0.04, // adverse yaw per rad of warp (E): twice the shared value
    cmDeltaPull: 1.8, // elevator effectiveness per rad (E): the whole surface moves
    cnDeltaYaw: 0.1, // rudder effectiveness per rad (E): the whole surface moves
  },
  // Guns: two synchronised LMG 08/15 on top of the fuselage, ahead of the pilot (M); positions (E).
  guns: {
    type: 'lmg0815',
    rounds: 475, // per gun (M) Weyl: 950 rounds for the two guns in the November 1915 test
    synchroniser: 'Fokker mechanical interrupter gear (Weyl reports it failing in tests)',
    muzzleX: 2.25, // m ahead of the centre of gravity: about 0.30 of the length (E)
    muzzleY: 0.66, // m above the centre of gravity: on top of the cowling (E)
    muzzleZ: 0.15, // m each side of the centre line (E)
  },
  // Optional loadouts beside the standard two guns. Immelmann flew a three-gun E.IV (M); the
  // third gun's position and the added weight are estimates (E).
  loadouts: {
    immelmann: {
      label: 'Three guns (Immelmann)',
      extraGuns: [{ x: 2.25, y: 0.72, z: 0 }], // m, body axes: between and a little above the other two (E)
      extraMass: 25, // kg (E) the gun, its ammunition and mounting
    },
  },
  fuel: { capacity: 57 }, // kg (E) 1.5 hours at this model's cruise fuel use (Weyl: fuel for 1.5 h)
  structure: {
    ultimateLoad: 6.0, // g (E)
    neverExceedSpeed: 60, // m/s equivalent airspeed (E) 1.35 times the top speed
  },
  documented: {
    maxSpeed: 44.44, // m/s, 160 km/h (H), altitude not given, taken as sea level; drag is calibrated to this
    maxSpeedAltitude: 0, // m (E)
    serviceCeiling: 4500, // m (M) Green and Swanborough; Thetford and Gray 4,115 m
  },
};
