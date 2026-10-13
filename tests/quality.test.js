import { describe, it, expect } from 'vitest';
import { QUALITY_LEVELS, QUALITY_ORDER, QUALITY_KEY, DEFAULT_QUALITY, nextQuality, chooseQuality, pixelRatioFor } from '../src/render/quality.js';
import { SKY, sunDirection } from '../src/render/sky.js';

// Graphics quality levels and the pixel budget (Phase 3, checkpoint 3).

describe('quality levels', () => {
  it('get stronger from low to high in every setting', () => {
    const [lo, mid, hi] = QUALITY_ORDER.map((n) => QUALITY_LEVELS[n]);
    for (const key of ['nearRadius', 'farRadius', 'nearTexture', 'innerTexture', 'farTexture', 'objectRadius', 'cloudRadius', 'cloudDensity', 'maxPixels']) {
      expect(mid[key], key).toBeGreaterThanOrEqual(lo[key]);
      expect(hi[key], key).toBeGreaterThanOrEqual(mid[key]);
    }
    expect(lo.treeSpacing).toBeGreaterThan(mid.treeSpacing); // bigger spacing = fewer trees
    expect(mid.treeSpacing).toBeGreaterThan(hi.treeSpacing);
    for (const q of Object.values(QUALITY_LEVELS)) expect(q.objectRadius).toBeLessThanOrEqual(q.nearRadius);
  });

  it('draws at most about 1080p of pixels at Medium and only Low is smaller', () => {
    expect(QUALITY_LEVELS.medium.maxPixels).toBe(2100000);
    expect(QUALITY_LEVELS.low.maxPixels).toBeLessThan(QUALITY_LEVELS.medium.maxPixels);
    expect(QUALITY_LEVELS.high.maxPixels).toBe(Infinity);
  });

  it('cycles low, medium, high and round again', () => {
    expect(nextQuality('low')).toBe('medium');
    expect(nextQuality('medium')).toBe('high');
    expect(nextQuality('high')).toBe('low');
  });

  it('starts from the address, else the saved level, else Medium', () => {
    const storage = (v) => ({ getItem: (k) => (k === QUALITY_KEY ? v : null) });
    expect(chooseQuality('?quality=high', storage('low'))).toBe('high'); // the address wins
    expect(chooseQuality('', storage('low'))).toBe('low');
    expect(chooseQuality('', storage('nonsense'))).toBe(DEFAULT_QUALITY);
    expect(chooseQuality('?quality=nonsense', storage(null))).toBe(DEFAULT_QUALITY);
    expect(chooseQuality('', null)).toBe(DEFAULT_QUALITY);
    expect(chooseQuality('', { getItem() { throw new Error('blocked'); } })).toBe(DEFAULT_QUALITY);
  });
});

describe('pixel budget', () => {
  it('leaves an ordinary 1080p screen at full resolution at Medium', () => {
    expect(pixelRatioFor(2100000, 1, 1920, 1080)).toBeCloseTo(1, 6);
  });

  it('draws a retina screen (ratio 2) at about 1080p of pixels instead of four times that', () => {
    const r = pixelRatioFor(2100000, 2, 1728, 1117); // a typical MacBook window
    expect(r).toBeLessThan(2);
    const pixels = 1728 * r * 1117 * r;
    expect(pixels).toBeLessThanOrEqual(2100000 * 1.0001);
    expect(pixels).toBeGreaterThan(2100000 * 0.99);
  });

  it('lets High use the screen\'s own ratio, up to 2', () => {
    expect(pixelRatioFor(Infinity, 2, 1728, 1117)).toBe(2);
    expect(pixelRatioFor(Infinity, 3, 1000, 800)).toBe(2);
    expect(pixelRatioFor(Infinity, 1, 1000, 800)).toBe(1);
  });

  it('never goes below half resolution or draws more than the screen has', () => {
    expect(pixelRatioFor(1000, 1, 3840, 2160)).toBe(0.5);
    expect(pixelRatioFor(2100000, 1, 800, 600)).toBe(1); // a small window is not scaled up
    expect(pixelRatioFor(2100000, undefined, 800, 600)).toBe(1);
  });
});

describe('sky definition', () => {
  it('has real colours, a sun above the horizon and haze that starts before it ends', () => {
    for (const k of ['horizon', 'zenith', 'sunColour', 'skyLight', 'groundLight', 'bounceColour']) expect(Number.isInteger(SKY[k])).toBe(true);
    const sun = sunDirection();
    expect(sun.length()).toBeCloseTo(1, 9);
    expect(sun.y).toBeGreaterThan(0.2);
    expect(SKY.hazeNear).toBeLessThan(SKY.hazeFar);
    expect(SKY.cirrus).toBeGreaterThanOrEqual(0);
    expect(SKY.cirrus).toBeLessThanOrEqual(1);
    expect(SKY.sunIntensity).toBeGreaterThan(0);
  });
});

describe('the ground beyond the tiles', () => {
  it('is one flat colour: the average of the crop colours, a mid green-brown', async () => {
    const { averageCropColour } = await import('../src/world/layout.js');
    const c = averageCropColour();
    const [r, g, b] = [c >> 16, (c >> 8) & 255, c & 255];
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
    expect(b).toBeLessThan(r);
    expect(r).toBeGreaterThan(90);
    expect(r).toBeLessThan(180);
  });
});
