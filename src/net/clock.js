// The browser's tick clock in a match. It runs a little ahead of the server's, by about half
// the round trip plus a small margin, so each tick's controls reach the server just before that
// tick is flown. The server reports how early they arrive ("lead"); the browser then runs up
// to 2% faster or slower (too little to feel) to keep that lead near its target, and jumps if
// it is far out (the connection changed a lot).

import { TICK_MS, LEAD_TARGET_TICKS, CLOCK_RATE, CLOCK_RESET_TICKS, INPUTS_PER_MESSAGE } from '../mp/netConfig.js';

export class NetClock {
  constructor() {
    this.tick = 0; // the last tick flown here
    this.started = false;
    this.timeScale = 1; // how fast the browser's physics runs against real time
    this.lead = 0; // smoothed lead the server reports
    this.target = LEAD_TARGET_TICKS;
  }

  // The first snapshot: it is already half a round trip old, and our controls take the other
  // half (plus up to a message's worth of ticks waiting to be sent) to get there.
  start(serverTick, pingMs = 0) {
    this.tick = serverTick + Math.ceil(pingMs / TICK_MS) + INPUTS_PER_MESSAGE + LEAD_TARGET_TICKS;
    this.lead = LEAD_TARGET_TICKS;
    this.started = true;
  }

  // A reported lead (ticks) and the connection's jitter (ms). Returns the number of ticks to jump
  // (0 nearly always; positive to run ahead at once, negative to wait).
  onLead(lead, jitterMs = 0) {
    this.target = LEAD_TARGET_TICKS + Math.ceil(jitterMs / TICK_MS);
    this.lead += 0.2 * (lead - this.lead);
    // Only a lasting difference moves the clock: one late message (a lost packet being sent
    // again) makes a single low reading that the smoothing absorbs.
    const smooth = this.lead - this.target;
    if (Math.abs(smooth) > CLOCK_RESET_TICKS) {
      this.lead = this.target;
      this.timeScale = 1;
      return Math.round(-smooth);
    }
    this.timeScale = smooth < -1 ? 1 + CLOCK_RATE : smooth > 2 ? 1 - CLOCK_RATE : 1;
    return 0;
  }
}
