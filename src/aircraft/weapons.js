// Weapon data shared by the four aircraft: the two cartridges, the two gun
// types, and the settings of the synchroniser, bullets and tracers.
// Every value is a row in docs/AIRCRAFT_DATA.md (section "Weapons").
// confidence: H = high, M = medium, E = estimate (the reason is in that file).
// SI units throughout (kg, m, m/s). Per-aircraft gun positions and rounds
// carried are in each aircraft's own file (the `guns` block).

export const CARTRIDGES = {
  // British .303 in Mark VII ball, used by the Vickers.
  mk7: {
    name: '.303 in Mk VII',
    mass: 0.011275, // kg, 174 grains (M) Western Front Association (S44)
    diameter: 0.00786, // m, bullet diameter 0.3095 in (E) typical .303 in bullet; the bore is 0.303 in (7.7 mm)
    muzzleVelocity: 731.5, // m/s, about 2,400 ft/s (M) Western Front Association (S44); other quotations of the 1929 Textbook of Small Arms give 2,440 ft/s (744 m/s), 2% higher
    formFactor: 0.56, // G1 form factor i: ballistic coefficient = mass / (i d^2) (E) no measured WWI value found
  },
  // German 7.92 x 57 mm S ball, used by the LMG 08/15.
  smk: {
    name: '7.92 x 57 mm S',
    mass: 0.0099, // kg, about 9.9 g, 153 grains (E) not found in an allowed source; the S bullet of 1905-1915
    diameter: 0.00792, // m, 7.92 mm (H)
    muzzleVelocity: 859.9, // m/s, 2,821 ft/s (M) The Vintage Aviator, Spandau LMG 08/15 page (S42)
    formFactor: 0.56, // (E) as above
  },
};

export const GUN_TYPES = {
  vickers: {
    name: 'Vickers .303 in Mk I*',
    cartridge: 'mk7',
    cyclicRate: 500, // rounds per minute, the gun's own rate (M) 450 to 550 quoted (S40); 500 is the middle
    jamPerRound: 0.0025, // chance a round causes a stoppage (E) about one in 400
    clearTime: 3, // s to hammer a stoppage clear with the cocking handle (E)
    clearSuccess: 0.7, // chance one attempt clears it (E)
  },
  lmg0815: {
    name: 'LMG 08/15 (Spandau) 7.92 mm',
    cartridge: 'smk',
    cyclicRate: 450, // rounds per minute (M) 450 (S43); 400 to 500 quoted for synchronised use (S42)
    jamPerRound: 0.0025, // (E) same reasoning as the Vickers
    clearTime: 3, // (E)
    clearSuccess: 0.7, // (E)
  },
};

// The synchroniser holds a gun's shot until no propeller blade is in the line
// of fire. The blade is taken as its chord plus a safety margin on each side.
export const SYNC = {
  bladeMargin: 0.08, // rad each side of the blade edge where the gear will not fire (E)
};

export const BULLETS = {
  maxLife: 5, // s, a bullet is dropped after this (E)
  minSpeed: 120, // m/s, a bullet slower than this is dropped (E) too slow to hurt
  tracerEvery: 3, // every third round is a tracer, so the stream can be seen (E) period belts mixed tracer and ball
  tracerLength: 14, // m, length of the drawn streak (looks)
  maxAlive: 400, // most bullets in flight at once (a safety cap)
};

// Where the pipper (gun sight mark) is drawn: the point a bullet reaches at this range.
export const SIGHT = { range: 200 }; // m (E) guns of the period were harmonised for about this

// Target aircraft (Phase 4: they fly but do not fight).
export const TARGETS = {
  speedFraction: 0.65, // of the target type's top speed, so the player can catch up (E)
  startRange: 450, // m ahead of the player at spawn (E)
  startAbove: 20, // m above the player at spawn (E)
  maxAlive: 3,
  dropRange: 6000, // m, a target farther than this is removed
  patterns: ['straight', 'circle', 'weave'],
  circleBank: (20 * Math.PI) / 180, // rad (E)
  weaveBank: (25 * Math.PI) / 180, // rad (E)
  weavePeriod: 7, // s (E)
  shotDownHits: 30, // weighted hits (pilot and engine count 4, fuel 3, wings and tail 1, fuselage 0.5) before the target is shot down (E, checkpoint 1; replaced by damage in checkpoint 2)
};

// Where the hit boxes of an aircraft are, as fractions of its own documented
// dimensions (see src/weapons/zones.js). Body axes: +X nose, +Y up, +Z right.
export const ZONE_LAYOUT = {
  engineX: 0.27, // centre of the engine, fraction of length ahead of the centre of gravity
  engineLength: 0.14, // fraction of length
  fuelX: 0.1, // fuel tank centre (E: tank behind the engine in front of the pilot)
  fuelLength: 0.1,
  fuelSize: 0.45, // m, width and height of the tank
  pilotSize: [0.5, 0.75, 0.5], // m, length, height, width of the pilot's box
  wingThickness: 0.2, // m, half-thickness of a wing's hit box (at the wing's own height)
  tailX: -0.55, // tailplane's centre, fraction of length
  tailThickness: 0.1, // m
};
