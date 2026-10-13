// Graphics quality levels. Each sets how far the detailed terrain reaches, how
// finely it is drawn and how many pixels the screen is drawn with. Chosen with
// ?quality=low|medium|high, or press L while flying (remembered in this browser);
// the settings menu comes in a later phase.

export const QUALITY_LEVELS = {
  // nearRadius: detailed 1 km tiles out to this many tiles each way (so 3x3, 5x5, 7x7);
  // farRadius: coarse 2 km tiles out to this distance (m);
  // nearTexture / farTexture: pixels across a tile's ground texture; innerTexture for
  // the 3x3 tiles around the camera (sharper where you can see most);
  // treeSpacing: grid of the trees in metres (bigger = fewer trees);
  // cloudRadius (m) and cloudDensity (share of sky cells with a cloud);
  // objectRadius: tiles whose trees, buildings and trenches are built (in tiles);
  // shadowMap: pixels across the sun's shadow map in the cockpit view (0 = no cockpit shadows);
  // maxPixels: most pixels drawn per frame (a retina screen would otherwise draw four
  // times a normal one): 1,000,000 is about 1280 x 780, 2,100,000 about 1920 x 1080.
  low: { nearRadius: 1, farRadius: 4000, nearTexture: 256, innerTexture: 512, farTexture: 128, treeSpacing: 22, objectRadius: 1, cloudRadius: 9000, cloudDensity: 0.34, shadowMap: 0, maxPixels: 1000000 },
  medium: { nearRadius: 2, farRadius: 7000, nearTexture: 512, innerTexture: 1024, farTexture: 256, treeSpacing: 16, objectRadius: 2, cloudRadius: 14000, cloudDensity: 0.42, shadowMap: 1024, maxPixels: 2100000 },
  high: { nearRadius: 3, farRadius: 10000, nearTexture: 512, innerTexture: 1024, farTexture: 256, treeSpacing: 12, objectRadius: 3, cloudRadius: 20000, cloudDensity: 0.45, shadowMap: 2048, maxPixels: Infinity },
};

export const DEFAULT_QUALITY = 'medium';

export function qualityFromUrl(search = '') {
  const q = new URLSearchParams(search).get('quality');
  return q in QUALITY_LEVELS ? q : DEFAULT_QUALITY;
}

export const QUALITY_ORDER = ['low', 'medium', 'high'];
export const QUALITY_KEY = 'dawnPatrol.quality';

// The level after `name`, wrapping round (what L does).
export function nextQuality(name) {
  return QUALITY_ORDER[(QUALITY_ORDER.indexOf(name) + 1) % QUALITY_ORDER.length];
}

// The level to start with: ?quality= in the address, else the one saved in this
// browser, else Medium. `storage` is localStorage (or anything with getItem).
export function chooseQuality(search = '', storage = null) {
  const fromUrl = new URLSearchParams(search).get('quality');
  if (fromUrl in QUALITY_LEVELS) return fromUrl;
  try {
    const saved = storage?.getItem(QUALITY_KEY);
    if (saved in QUALITY_LEVELS) return saved;
  } catch {
    // storage unavailable (private window): use the default
  }
  return DEFAULT_QUALITY;
}

// Pixels per CSS pixel to draw the screen with: the screen's own ratio (at most
// 2), cut down so the whole frame stays within maxPixels.
export function pixelRatioFor(maxPixels, devicePixelRatio, cssWidth, cssHeight) {
  const native = Math.min(devicePixelRatio || 1, 2);
  const budget = Math.sqrt(maxPixels / Math.max(1, cssWidth * cssHeight));
  return Math.max(0.5, Math.min(native, budget));
}
