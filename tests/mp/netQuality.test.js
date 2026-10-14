import { describe, it, expect } from 'vitest';
import { measure } from './netMeasure.js';

// The brief: playable with up to 150 ms delay and light packet loss; your own aircraft responds
// at once (it is flown in your browser: what is measured here is that corrections stay
// invisible), the others move smoothly, without jumps or stutter.
const CONNECTIONS = [];
for (const ping of [0, 50, 100, 150]) {
  for (const loss of [0, 1, 2]) CONNECTIONS.push({ ping, jitter: Math.round(ping / 7), loss });
}

describe('network quality up to the brief (150 ms, light loss)', () => {
  for (const net of CONNECTIONS) {
    it(`${net.ping} ms ping, ${net.jitter} ms jitter, ${net.loss}% loss: smooth, and corrections invisible`, () => {
      const r = measure(net, { seconds: 25 });
      expect(r.worst.remoteError).toBeLessThan(1); // others drawn on the server's path
      expect(r.worst.frameJump).toBeLessThan(0.3); // no jump or stutter
      expect(r.largest).toBeLessThan(0.5); // own corrections too small to see
      expect(r.lead).toBeGreaterThan(-1); // controls arrive in time (on average)
    });
  }
});
