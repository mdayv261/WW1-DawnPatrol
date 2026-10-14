import { describe, it, expect } from 'vitest';
import { createNetSim, parseNetsim, cleanNetsim, netsimActive, netsimText } from '../../src/net/netSim.js';

// A repeatable random number source.
function seeded(seed = 7) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

describe('network simulator', () => {
  it('with nothing set, a message arrives when it is sent', () => {
    const sim = createNetSim(cleanNetsim(null));
    expect(sim.schedule(100)).toBe(100);
    expect(netsimActive(cleanNetsim(null))).toBe(false);
  });

  it('adds half the ping each way, plus up to the jitter', () => {
    const sim = createNetSim({ ping: 150, jitter: 20, loss: 0 }, seeded());
    for (let i = 0; i < 200; i++) {
      const now = i * 1000; // far apart, so ordering never holds one back
      const delay = sim.schedule(now) - now;
      expect(delay).toBeGreaterThanOrEqual(75);
      expect(delay).toBeLessThanOrEqual(95);
    }
  });

  it('keeps messages in order, as TCP does', () => {
    const sim = createNetSim({ ping: 100, jitter: 80, loss: 5 }, seeded(3));
    let last = -Infinity;
    for (let i = 0; i < 500; i++) {
      const at = sim.schedule(i * 5);
      expect(at).toBeGreaterThanOrEqual(last);
      last = at;
    }
  });

  it('a lost message is late, never missing, and holds up the ones behind it', () => {
    const sim = createNetSim({ ping: 150, jitter: 0, loss: 50 }, seeded(11));
    const delays = Array.from({ length: 400 }, (_, i) => sim.schedule(i * 1000) - i * 1000);
    const late = delays.filter((d) => d > 75);
    expect(late.length).toBeGreaterThan(120); // about half
    expect(late.length).toBeLessThan(280);
    for (const d of late) expect(d).toBeCloseTo(75 + 150 + 200, 6); // one more round trip and TCP's 200 ms
    const burst = createNetSim({ ping: 100, jitter: 0, loss: 50 }, () => 0.1); // every message "lost"
    expect(burst.schedule(0)).toBe(350);
    expect(burst.schedule(1)).toBe(351);
  });

  it('reads ?netsim=ping,jitter,loss, within limits', () => {
    expect(parseNetsim('150,20,2')).toEqual({ ping: 150, jitter: 20, loss: 2 });
    expect(parseNetsim('300')).toEqual({ ping: 300, jitter: 0, loss: 0 });
    expect(parseNetsim('99999,-5,80')).toEqual({ ping: 2000, jitter: 0, loss: 50 });
    expect(parseNetsim('')).toBe(null);
    expect(parseNetsim(null)).toBe(null);
    expect(netsimText({ ping: 150, jitter: 20, loss: 2 })).toBe('150 ms ping, 20 ms jitter, 2% loss');
    expect(netsimText({ ping: 0, jitter: 0, loss: 0 })).toBe('off');
  });
});
