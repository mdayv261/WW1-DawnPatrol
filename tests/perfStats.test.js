import { describe, it, expect } from 'vitest';
import { FrameStats, perfLines } from '../src/ui/perfStats.js';
import { debugLines } from '../src/ui/debugText.js';
import { AIRCRAFT } from '../src/aircraft/index.js';

describe('frame statistics', () => {
  it('reports the average frame rate', () => {
    const s = new FrameStats();
    for (let i = 0; i < 60; i++) s.push(1000 / 60, i * (1000 / 60));
    expect(s.fps).toBeCloseTo(60, 6);
    expect(new FrameStats().fps).toBe(0);
  });

  it('shows a stutter as the worst frame and in the 1% low, though the average barely moves', () => {
    const s = new FrameStats();
    let t = 0;
    for (let i = 0; i < 119; i++) { s.push(16.7, t += 16.7); }
    s.push(90, t += 90); // one 90 ms hitch
    expect(s.fps).toBeGreaterThan(57); // the average hardly notices one 90 ms frame
    expect(s.worstMs).toBe(90);
    expect(s.lowFps).toBeLessThan(15);
  });

  it('forgets a hitch after two seconds, and keeps only the last 120 frames', () => {
    const s = new FrameStats();
    s.push(120, 0);
    for (let i = 1; i <= 200; i++) s.push(16, i * 16);
    expect(s.worstMs).toBe(16);
    expect(s.times.length).toBe(120);
    const quick = new FrameStats();
    quick.push(120, 0);
    quick.push(16, 500);
    expect(quick.worstMs).toBe(120);
  });

  it('lists frames, drawing, quality and terrain for the F3 overlay', () => {
    const s = new FrameStats();
    for (let i = 0; i < 10; i++) s.push(16.7, i * 16.7);
    const lines = perfLines(s, { calls: 152, triangles: 310450 }, 'medium', { width: 1728, height: 1117, pixelRatio: 1.04 }, { tiles: 97, pending: 3 });
    const text = lines.join('\n');
    expect(text).toContain('60 fps');
    expect(text).toContain('152 calls');
    expect(text).toContain('310k triangles');
    expect(text).toContain('medium');
    expect(text).toContain('1797x1162 pixels');
    expect(text).toContain('97 tiles, 3 building');
    expect(perfLines(s, { calls: 5, triangles: 800 }, 'low', { width: 800, height: 600, pixelRatio: 1 }).join('\n')).toContain('800 triangles');
  });

  it('is added to the debug overlay', () => {
    expect(debugLines(AIRCRAFT.camel, null, { extra: ['frames    60 fps'] }).join('\n')).toContain('frames    60 fps');
  });
});
