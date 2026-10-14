// The network simulator, for testing: it makes a fast local connection behave like a slow or
// unreliable home connection. Each message is held back before it is passed on.
//
//   ping    ms added to the round trip (half on the way out, half on the way back)
//   jitter  up to this many ms more, at random, per message
//   loss    % of messages "lost". The game's connection (a WebSocket, over TCP) never really
//           loses a message: TCP sends it again. So a lost message arrives late (one more
//           round trip plus TCP's 200 ms minimum wait) and holds up the ones behind it, which
//           is exactly what a player on a lossy line sees.
// Messages always arrive in the order they were sent, as on TCP.

export const NETSIM_LIMITS = { ping: 2000, jitter: 1000, loss: 50 };
const RESEND_WAIT = 200; // ms, TCP's minimum retransmission timeout

const clampTo = (v, max) => Math.min(max, Math.max(0, Number.isFinite(v) ? v : 0));

// Settings from "150,20,2" (as in ?netsim=150,20,2); missing numbers count as 0. null if none given.
export function parseNetsim(text) {
  if (text === null || text === undefined || String(text).trim() === '') return null;
  const [ping, jitter, loss] = String(text).split(',').map((s) => Number.parseFloat(s));
  return cleanNetsim({ ping, jitter, loss });
}

export function cleanNetsim(s) {
  return {
    ping: clampTo(s?.ping, NETSIM_LIMITS.ping),
    jitter: clampTo(s?.jitter, NETSIM_LIMITS.jitter),
    loss: clampTo(s?.loss, NETSIM_LIMITS.loss),
  };
}

export const netsimActive = (s) => Boolean(s && (s.ping > 0 || s.jitter > 0 || s.loss > 0));

export const netsimText = (s) => (netsimActive(s) ? `${s.ping} ms ping, ${s.jitter} ms jitter, ${s.loss}% loss` : 'off');

// One direction of a simulated connection. schedule(now) says when a message sent at `now`
// (ms) arrives. rng() returns numbers in [0, 1).
export function createNetSim(settings, rng = Math.random) {
  const s = cleanNetsim(settings);
  let last = -Infinity; // when the previous message arrives: none may overtake it
  return {
    settings: s,
    schedule(now) {
      let delay = s.ping / 2 + rng() * s.jitter;
      if (s.loss > 0 && rng() * 100 < s.loss) delay += s.ping + RESEND_WAIT;
      last = Math.max(now + delay, last);
      return last;
    },
  };
}
