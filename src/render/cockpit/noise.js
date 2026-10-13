// Seeded noise for the cockpit's code-made textures (wood grain, leather, worn paint).
// Pure maths, no canvas, so it is tested in Node. Everything tiles: the noise repeats every
// `period` lattice cells, so a texture made from it has no seam when it repeats.

// A small fast random number generator (mulberry32): the same seed gives the same numbers.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Value noise on a lattice that repeats every `period` cells. Returns f(x, y) in 0..1.
export function tiledNoise(seed, period) {
  const r = rng(seed);
  const table = new Float32Array(period * period);
  for (let i = 0; i < table.length; i++) table[i] = r();
  const at = (i, j) => table[(((j % period) + period) % period) * period + (((i % period) + period) % period)];
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = smooth(x - i);
    const fy = smooth(y - j);
    const top = at(i, j) + (at(i + 1, j) - at(i, j)) * fx;
    const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * fx;
    return top + (bottom - top) * fy;
  };
}

// Several octaves of tiled noise added together (fractal noise), still 0..1 and still tiling:
// u, v run 0..1 across the texture; `cells` is the coarsest lattice size across it.
export function fractal(seed, cells, octaves = 4) {
  const layers = [];
  for (let o = 0; o < octaves; o++) layers.push({ n: tiledNoise(seed + o * 101, cells << o), size: cells << o, weight: 0.5 ** o });
  const total = layers.reduce((s, l) => s + l.weight, 0);
  return (u, v) => layers.reduce((s, l) => s + l.weight * l.n(u * l.size, v * l.size), 0) / total;
}

// Mix two colours (0xRRGGBB) by t (0..1); returns [r, g, b] in 0..255.
export function mix(a, b, t) {
  const k = Math.min(1, Math.max(0, t));
  return [16, 8, 0].map((s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k));
}
