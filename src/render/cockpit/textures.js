// The cockpit's surface textures, made in code (no image files): varnished wood, plywood,
// stitched leather, doped linen, worn gunmetal, the Vickers' slotted jacket and the
// LMG 08/15's perforated one, and painted steel. Each pattern gives, for a point (u, v) on
// the texture (0..1, tiling), a colour and a height; the height becomes a bump map so light
// catches the grain, creases and weave. The patterns are pure (tested); painting them on a
// canvas only happens in the browser.

import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { fractal, mix } from './noise.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Each pattern: (options) => (u, v) => { rgb: [r, g, b], h: 0..1 }.
export const PATTERNS = {
  // Varnished wood: long grain along u, gently wavy, with darker lines and a little figure.
  wood({ light = 0xa8743e, dark = 0x6b4222, seed = 1 } = {}) {
    const warp = fractal(seed, 2, 3);
    const fine = fractal(seed + 7, 8, 3);
    const streak = fractal(seed + 13, 2, 2);
    return (u, v) => {
      const w = v * 22 + warp(u, v) * 1.2;
      const ring = 0.5 + 0.5 * Math.sin(w * Math.PI * 2);
      const pores = fine(u * 0.25, v * 8); // fine streaks along the grain
      const t = clamp01(0.3 + 0.35 * ring ** 4 + 0.35 * (pores - 0.5) + 0.25 * (streak(u, v) - 0.5));
      return { rgb: mix(light, dark, t), h: 1 - t };
    };
  },
  // Plywood: paler and quieter than solid wood.
  plywood({ light = 0xc49a62, dark = 0x93683a, seed = 2 } = {}) {
    const wood = PATTERNS.wood({ light, dark, seed });
    return (u, v) => {
      const p = wood(u, v * 0.5);
      return { rgb: mix((p.rgb[0] << 16) | (p.rgb[1] << 8) | p.rgb[2], light, 0.35), h: p.h * 0.6 };
    };
  },
  // Leather: soft creases (ridged noise) and pores, with two rows of stitching along u.
  leather({ colour = 0x4a2c1a, seed = 3, stitches = true } = {}) {
    const crease = fractal(seed, 6, 4);
    const pores = fractal(seed + 9, 48, 2);
    return (u, v) => {
      const c = 1 - Math.abs(crease(u, v) * 2 - 1);
      const p = pores(u, v);
      let h = 0.5 + 0.35 * c - 0.15 * p;
      let shade = 0.85 + 0.3 * c - 0.1 * p;
      if (stitches) {
        for (const row of [0.3, 0.7]) {
          const across = Math.abs(v - row);
          const along = (u * 64) % 1;
          if (across < 0.012 && along > 0.25 && along < 0.75) {
            h = 0.9;
            shade = 1.25;
          } else if (across < 0.02) h -= 0.2; // the seam is pulled in
        }
      }
      const base = mix(colour, 0x000000, 0);
      return { rgb: base.map((x) => Math.min(255, Math.round(x * shade))), h: clamp01(h) };
    };
  },
  // Doped linen: a fine weave, a little blotchy where the dope pooled.
  linen({ colour = 0xcbb68c, seed = 4 } = {}) {
    const blotch = fractal(seed, 4, 3);
    return (u, v) => {
      const weave = 0.5 + 0.25 * Math.sin(u * 256 * Math.PI) * Math.sin(v * 256 * Math.PI);
      const shade = 0.88 + 0.18 * blotch(u, v) + 0.06 * weave;
      return { rgb: mix(colour, 0x000000, 0).map((x) => Math.min(255, Math.round(x * shade))), h: weave };
    };
  },
  // Gunmetal: dark blued steel, rubbed lighter in places, with fine scratches along u.
  gunmetal({ colour = 0x2b2d30, seed = 5 } = {}) {
    const rub = fractal(seed, 4, 4);
    const scratch = fractal(seed + 3, 2, 2);
    return (u, v) => {
      const s = Math.abs(Math.sin((v * 90 + scratch(u, v) * 20) * Math.PI));
      const t = clamp01(rub(u, v) * 0.6 + (s > 0.985 ? 0.4 : 0));
      return { rgb: mix(colour, 0x6c7178, t * 0.6), h: 0.5 + 0.2 * (rub(u, v) - 0.5) };
    };
  },
  // The Vickers' aircraft jacket: long slots (louvres) around a gunmetal tube; u runs along it.
  louvred({ seed = 6 } = {}) {
    const metal = PATTERNS.gunmetal({ seed });
    return (u, v) => {
      const p = metal(u, v);
      const along = (u * 6) % 1;
      const around = (v * 16) % 1;
      const slot = along > 0.1 && along < 0.9 && around > 0.35 && around < 0.65;
      return slot ? { rgb: [12, 12, 12], h: 0 } : p;
    };
  },
  // The LMG 08/15's jacket: rows of round holes.
  perforated({ seed = 7 } = {}) {
    const metal = PATTERNS.gunmetal({ seed });
    return (u, v) => {
      const p = metal(u, v);
      const du = ((u * 20) % 1) - 0.5;
      const dv = ((v * 12) % 1) - 0.5;
      return du * du + dv * dv < 0.09 ? { rgb: [10, 10, 10], h: 0 } : p;
    };
  },
  // Painted steel or wood: a flat colour, worn and chipped to the metal at the edges of patches.
  paint({ colour = 0x6d7458, seed = 8 } = {}) {
    const wear = fractal(seed, 5, 4);
    return (u, v) => {
      const w = wear(u, v);
      if (w > 0.72) return { rgb: mix(0x55585c, 0x8a8d90, (w - 0.72) * 3), h: 0.3 };
      return { rgb: mix(colour, 0x000000, 0.15 * (w - 0.3)), h: 0.6 };
    };
  },
};

const cache = new Map();

// A pattern painted on a canvas: { map, bumpMap } (repeating), or null outside a browser.
// Cached by name and options, so each texture is made once.
export function patternTextures(name, options = {}, size = 512) {
  if (typeof document === 'undefined') return null;
  const key = `${name}:${JSON.stringify(options)}:${size}`;
  if (cache.has(key)) return cache.get(key);
  const pattern = PATTERNS[name](options);
  const colour = document.createElement('canvas');
  const bump = document.createElement('canvas');
  colour.width = bump.width = size;
  colour.height = bump.height = size;
  const c = colour.getContext('2d');
  const b = bump.getContext('2d');
  const ci = c.createImageData(size, size);
  const bi = b.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const { rgb, h } = pattern(x / size, y / size);
      const i = (y * size + x) * 4;
      ci.data[i] = rgb[0];
      ci.data[i + 1] = rgb[1];
      ci.data[i + 2] = rgb[2];
      ci.data[i + 3] = 255;
      bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = Math.round(h * 255);
      bi.data[i + 3] = 255;
    }
  }
  c.putImageData(ci, 0, 0);
  b.putImageData(bi, 0, 0);
  const map = new CanvasTexture(colour);
  map.colorSpace = SRGBColorSpace;
  const bumpMap = new CanvasTexture(bump);
  for (const t of [map, bumpMap]) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = 4;
  }
  const result = { map, bumpMap };
  cache.set(key, result);
  return result;
}
