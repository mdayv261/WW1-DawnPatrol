// The short sound clips, made as samples (no sound files): gunshots, a hit, a passing bullet's
// crack, a crash, and plain noise for the wind. Each clip is a burst of filtered noise (the crack)
// plus a low decaying knock (the thump), from the settings in src/aircraft/sounds.js. Pure (tested);
// audioEngine.js turns them into audio buffers.

import { rng } from '../render/cockpit/noise.js';
import { CLIPS, CLIP_PEAK } from '../aircraft/sounds.js';

// White noise, the same for the same seed.
export function noise(length, seed = 1) {
  const r = rng(seed);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = r() * 2 - 1;
  return out;
}

// A clip from its settings (CLIPS[name]) at `rate` samples per second, peaking at CLIP_PEAK.
export function clip(name, rate = 44100, seed = 7) {
  const c = CLIPS[name];
  const n = Math.round(c.length * rate);
  const white = noise(n, seed);
  const out = new Float32Array(n);
  // A simple band-pass round `crack` Hz: a high-pass then a low-pass (one-pole filters).
  const hp = Math.exp((-2 * Math.PI * c.crack * 0.5) / rate);
  const lp = Math.exp((-2 * Math.PI * c.crack * 2) / rate);
  let hpPrev = 0;
  let hpOut = 0;
  let lpOut = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    hpOut = hp * (hpOut + white[i] - hpPrev);
    hpPrev = white[i];
    lpOut = (1 - lp) * hpOut + lp * lpOut;
    const crack = lpOut * Math.exp(-c.crackDecay * t);
    const thump = c.thump > 0 ? Math.sin(2 * Math.PI * c.thump * t * (1 - 0.3 * t)) * Math.exp(-c.thumpDecay * t) : 0;
    out[i] = crack * (1 - c.thumpShare) + thump * c.thumpShare;
  }
  // Saturation (a gunshot's density): normalise, push through a soft curve, so quiet parts come up.
  if (c.drive) {
    let p0 = 0;
    for (let i = 0; i < n; i++) p0 = Math.max(p0, Math.abs(out[i]));
    if (p0 > 0) for (let i = 0; i < n; i++) out[i] = Math.tanh((c.drive * out[i]) / p0);
  }
  // A short fade in and out so it does not click.
  const edge = Math.min(n >> 2, Math.round(rate * 0.002));
  for (let i = 0; i < edge; i++) {
    out[i] *= i / edge;
    out[n - 1 - i] *= i / edge;
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) for (let i = 0; i < n; i++) out[i] *= CLIP_PEAK / peak;
  return out;
}
