// Graphics quality levels. Each sets how far the detailed terrain reaches and
// how finely it is drawn. (Chosen with ?quality=low|medium|high; the settings
// menu comes in a later phase.)

export const QUALITY_LEVELS = {
  // nearRadius: detailed 1 km tiles out to this many tiles each way (so 3x3, 5x5, 7x7);
  // farRadius: coarse 2 km tiles out to this distance (m);
  // nearTexture / farTexture: pixels across a tile's ground texture;
  // treeSpacing: grid of the trees in metres (bigger = fewer trees);
  // objectRadius: tiles whose trees, buildings and trenches are built (in tiles).
  low: { nearRadius: 1, farRadius: 4000, nearTexture: 256, farTexture: 128, treeSpacing: 22, objectRadius: 1 },
  medium: { nearRadius: 2, farRadius: 7000, nearTexture: 512, farTexture: 256, treeSpacing: 16, objectRadius: 2 },
  high: { nearRadius: 3, farRadius: 10000, nearTexture: 512, farTexture: 256, treeSpacing: 12, objectRadius: 3 },
};

export const DEFAULT_QUALITY = 'medium';

export function qualityFromUrl(search = '') {
  const q = new URLSearchParams(search).get('quality');
  return q in QUALITY_LEVELS ? q : DEFAULT_QUALITY;
}
