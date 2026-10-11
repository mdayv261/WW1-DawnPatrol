// Frame-rate statistics for the F3 overlay: average frames per second over the
// last couple of seconds, the worst frame in the last two seconds (a stutter
// shows up here even when the average looks fine), and the "1% low" rate (how
// fast the slowest one frame in a hundred was). No browser code, so it can be
// tested.

export class FrameStats {
  constructor(window = 120, worstSeconds = 2) {
    this.window = window; // frames kept for the average and the 1% low
    this.worstSeconds = worstSeconds;
    this.times = []; // frame times, ms, newest last
    this.recent = []; // { at (ms), ms } for the worst-frame search
  }

  // Record one frame that took `ms`, ending at `now` (ms).
  push(ms, now) {
    this.times.push(ms);
    if (this.times.length > this.window) this.times.shift();
    this.recent.push({ at: now, ms });
    while (this.recent.length && now - this.recent[0].at > this.worstSeconds * 1000) this.recent.shift();
  }

  get fps() {
    if (!this.times.length) return 0;
    const mean = this.times.reduce((s, v) => s + v, 0) / this.times.length;
    return mean > 0 ? 1000 / mean : 0;
  }

  get worstMs() {
    return this.recent.reduce((m, f) => Math.max(m, f.ms), 0);
  }

  // The frame rate of the slowest 1% of the recent frames (the average of the slowest
  // ones; with the last 120 frames that is the single slowest, so one hitch shows).
  get lowFps() {
    if (!this.times.length) return 0;
    const slowest = [...this.times].sort((a, b) => b - a).slice(0, Math.max(1, Math.round(this.times.length * 0.01)));
    const mean = slowest.reduce((s, v) => s + v, 0) / slowest.length;
    return mean > 0 ? 1000 / mean : 0;
  }
}

const thousands = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

// The performance lines of the F3 overlay.
// info: renderer.info.render ({ calls, triangles }); view: { width, height, pixelRatio } of the drawing buffer.
export function perfLines(stats, info, qualityName, view, terrain = null) {
  const lines = [
    `frames    ${stats.fps.toFixed(0)} fps   1% low ${stats.lowFps.toFixed(0)}   worst ${stats.worstMs.toFixed(0)} ms`,
    `drawing   ${info.calls} calls   ${thousands(info.triangles)} triangles`,
    `quality   ${qualityName}   ${Math.round(view.width * view.pixelRatio)}x${Math.round(view.height * view.pixelRatio)} pixels (x${view.pixelRatio.toFixed(2)})   L to change`,
  ];
  if (terrain) lines.push(`terrain   ${terrain.tiles} tiles${terrain.pending ? `, ${terrain.pending} building` : ''}`);
  return lines;
}
