// How the game sounds: every sound is made in code (src/audio/), from these settings. They are
// design choices to sound right, not measurements, recorded in docs/DECISIONS.md (D60). The
// engines' cylinder counts are in each aircraft's file (documented in AIRCRAFT_DATA.md).

// Engine voices. harmonics: the loudness of each overtone of the firing frequency (the waveform);
// roughness: how much the loudness wanders at random (a rotary's uneven firing); crankWobble: a
// pulse at the crankshaft's own speed; filter: the brightness, opening from `closed` (Hz) at idle
// to `open` at full throttle.
export const ENGINE_SOUND = {
  rotary: { harmonics: [1, 0.75, 0.6, 0.45, 0.35, 0.28, 0.2, 0.15, 0.1, 0.07], roughness: 0.35, crankWobble: 0.3, filter: { closed: 450, open: 2600, q: 0.9 } },
  inline: { harmonics: [1, 0.5, 0.28, 0.16, 0.1, 0.06, 0.04], roughness: 0.08, crankWobble: 0.1, filter: { closed: 320, open: 1700, q: 0.7 } },
  idleLoudness: 0.3, // share of full loudness with the throttle closed (the engine still turning)
  slowLoudness: 0.4, // share of full loudness at very low engine speed
  level: 0.32, // the engine in the mix
  windmillLevel: 0.12, // the swish of a windmilling propeller when the engine has stopped
};

// Rushing air: filtered noise, louder and brighter with airspeed (by dynamic pressure), and the
// hum of the bracing wires at speed.
export const WIND_SOUND = {
  refSpeed: 60, // m/s at which the wind reaches full loudness at sea level
  filter: { slow: 350, fast: 3200 }, // Hz, brightness from standing still to refSpeed
  level: 0.28,
  wireFrom: 35, // m/s above which the wires begin to hum
  wirePitch: { slow: 180, fast: 420 }, // Hz from wireFrom to refSpeed
  wireLevel: 0.04,
};

// The player's guns are this many times as loud as the engine at full throttle (product owner: first
// "50% louder", then "much louder", twice). Clips peak at CLIP_PEAK, so a gun clip's level is set to give that
// peak. The gun clips are also saturated (`drive`), which packs far more sound into the same peak, as
// recorded gunfire is: a short shot that dies away fast otherwise sounds much quieter than it peaks.
export const GUNS_OVER_ENGINE = 4;
export const CLIP_PEAK = 0.9;
const GUN_LEVEL = (ENGINE_SOUND.level * GUNS_OVER_ENGINE) / CLIP_PEAK;

// One-shot clips, made as samples. length in s; crack: the sharp noise burst's centre (Hz) and how
// fast it dies (per s); thump: the low knock (Hz) and its decay; drive: saturation (0 = none); level: in the mix.
export const CLIPS = {
  vickers: { length: 0.16, crack: 3600, crackDecay: 32, thump: 170, thumpDecay: 22, thumpShare: 0.35, drive: 4, level: GUN_LEVEL }, // a fuller, longer report; pitch raised (product owner)
  lmg0815: { length: 0.15, crack: 4300, crackDecay: 38, thump: 200, thumpDecay: 25, thumpShare: 0.3, drive: 4, level: GUN_LEVEL },
  lewis: { length: 0.13, crack: 4000, crackDecay: 40, thump: 190, thumpDecay: 26, thumpShare: 0.28, drive: 4, level: GUN_LEVEL }, // lighter and drier than the Vickers: an air-cooled gun out on the wing
  drumOff: { length: 0.09, crack: 2400, crackDecay: 70, thump: 380, thumpDecay: 45, thumpShare: 0.3, level: 0.45 }, // the latch and the empty drum coming off
  drumOn: { length: 0.14, crack: 1500, crackDecay: 45, thump: 240, thumpDecay: 30, thumpShare: 0.5, level: 0.55 }, // the full drum clunking home
  hit: { length: 0.22, crack: 900, crackDecay: 28, thump: 70, thumpDecay: 18, thumpShare: 0.6, level: 0.55 }, // a bullet into wood and fabric
  crack: { length: 0.05, crack: 4200, crackDecay: 140, thump: 0, thumpDecay: 1, thumpShare: 0, level: 0.38 }, // a bullet passing close (its shock wave)
  crash: { length: 1.2, crack: 600, crackDecay: 3.5, thump: 45, thumpDecay: 4, thumpShare: 0.5, level: 0.7 },
};

// Distance. Inside `near` a sound is at full loudness; beyond it, it falls with distance (1/d),
// and it is silent beyond `far`. Far sounds lose their high notes (`clear` Hz at `near`, falling by
// half every `halving` m, not below `dull`) and arrive late at the speed of sound.
export const DISTANCE_SOUND = {
  near: 25, // m
  farEngine: 2500, // m: enemy engines beyond this are not heard
  farGuns: 3000, // m
  clear: 9000, // Hz
  halving: 700, // m
  dull: 350, // Hz
  speedOfSound: 343, // m/s, sea level standard atmosphere
  enemyEngineLevel: 0.12,
  maxEngines: 4, // enemy engines heard at once (the nearest)
  nearMiss: 10, // m: an enemy bullet passing closer than this cracks
};

// The warnings (Options: stall warning, G and overspeed warning): a square-wave tone switched
// on and off `pulse` times a second. The stall horn is higher and slower; the damage buzzer
// (too much g or speed) lower and faster. Game aids, not period sounds.
export const WARNING_SOUND = {
  stall: { pitch: 700, pulse: 4 },
  damage: { pitch: 260, pulse: 10 },
  level: 0.05, // a square wave sounds far louder than its level suggests
};

export const MIX = {
  master: 0.85, // before the player's volume setting
  limiter: -1, // dB: a safety limiter just below full scale (lower would flatten the gunfire)
  fade: 0.3, // s to fade in or out (pause, menus, mute)
};
