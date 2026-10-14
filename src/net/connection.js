// One connection to a room: a WebSocket carrying JSON messages, passed through the network
// simulator (netSim.js) in both directions when it is switched on, and measuring the ping.
// The socket and the timers are passed in, so the tests run it without a network.

import { createNetSim, netsimActive } from './netSim.js';
import { PING_INTERVAL_S } from '../mp/netConfig.js';

// url: the room's ws:// address. handlers: { onOpen(), onMessage(msg), onClose(code, reason) }.
// options: { netsim (settings or null), makeSocket(url), now() (ms), timers, rng }.
export function openConnection(url, handlers, {
  netsim = null, makeSocket = (u) => new WebSocket(u), now = () => performance.now(),
  timers = globalThis, rng = Math.random,
} = {}) {
  const simulate = netsimActive(netsim);
  const out = simulate ? createNetSim(netsim, rng) : null;
  const back = simulate ? createNetSim(netsim, rng) : null;
  const socket = makeSocket(url);
  const waiting = []; // texts to send once the socket is open
  let open = false;
  let closed = false;
  let ping = null; // ms, smoothed
  let pingTimer = null;

  // Run f now, or when the simulator says the message has arrived.
  const later = (sim, f) => {
    if (!sim) return f();
    const t = now();
    timers.setTimeout(f, Math.max(0, sim.schedule(t) - t));
  };

  const write = (text) => {
    if (closed) return;
    if (!open) return waiting.push(text);
    try {
      socket.send(text);
    } catch {
      // closing: the close event follows
    }
  };

  socket.addEventListener('open', () => {
    open = true;
    for (const text of waiting.splice(0)) socket.send(text);
    pingTimer = timers.setInterval(() => conn.send({ type: 'ping', t: now() }), PING_INTERVAL_S * 1000);
    conn.send({ type: 'ping', t: now() });
    handlers.onOpen?.();
  });
  socket.addEventListener('message', (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return; // not ours
    }
    later(back, () => {
      if (closed) return;
      if (msg.type === 'pong' && Number.isFinite(msg.t)) {
        const sample = now() - msg.t;
        ping = ping === null ? sample : 0.7 * ping + 0.3 * sample;
        return;
      }
      handlers.onMessage?.(msg);
    });
  });
  let reported = false;
  const ended = (code, reason) => {
    if (reported) return;
    reported = true;
    timers.clearInterval(pingTimer);
    later(back, () => {
      closed = true;
      handlers.onClose?.(code, reason);
    });
  };
  socket.addEventListener('close', (e) => ended(e?.code ?? 1006, e?.reason ?? ''));
  socket.addEventListener('error', () => ended(1006, 'error'));

  const conn = {
    send(msg) {
      const text = JSON.stringify(msg);
      later(out, () => write(text));
    },
    // Close it ourselves (no onClose call follows).
    close() {
      closed = true;
      reported = true;
      timers.clearInterval(pingTimer);
      try {
        socket.close(1000, 'bye');
      } catch {
        // already closed
      }
    },
    get ping() {
      return ping;
    },
    get open() {
      return open && !closed;
    },
  };
  return conn;
}
