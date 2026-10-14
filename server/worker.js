// The multiplayer server's front door (a Cloudflare Worker). It answers three requests:
//   GET  /health        is the server up, and which message version it speaks
//   POST /rooms         create a room: returns { code }, a free six-character room code
//   GET  /rooms/CODE    (a WebSocket) join that room; passed on to the room's Durable Object
// Each room is its own Durable Object (room.js), found by its code. Only the game's own web
// pages may connect (ALLOWED_ORIGINS in wrangler.toml); tools that send no Origin, such as the
// smoke test, are let through, since an Origin check only stops other web sites.

import { Room } from './room.js';
import { makeCode, isCode } from '../src/mp/roomCode.js';
import { PROTOCOL_VERSION } from '../src/mp/netConfig.js';

export { Room };

const CODE_TRIES = 5;

// A random number in [0, 1) from the cryptographic generator, so codes cannot be predicted.
const secureRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

// Is this page allowed? An allowed entry without a port matches any port ("http://localhost").
export function originAllowed(origin, list = '') {
  if (!origin) return true;
  let o;
  try {
    o = new URL(origin);
  } catch {
    return false;
  }
  return list.split(',').map((s) => s.trim()).filter(Boolean).some((entry) => {
    const e = new URL(entry);
    return e.protocol === o.protocol && e.hostname === o.hostname && (e.port === '' || e.port === o.port);
  });
}

const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

export async function handle(request, env, rng = secureRandom) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const allowed = originAllowed(origin, env.ALLOWED_ORIGINS);
  const cors = allowed && origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }
  if (url.pathname === '/health') return json({ ok: true, version: PROTOCOL_VERSION }, 200, cors);
  if (!allowed) return new Response('This page may not use the multiplayer server', { status: 403 });

  if (url.pathname === '/rooms' && request.method === 'POST') {
    for (let i = 0; i < CODE_TRIES; i++) {
      const code = makeCode(rng);
      const room = env.ROOMS.get(env.ROOMS.idFromName(code));
      const answer = await room.fetch(`https://room/claim?code=${code}`, { method: 'POST' });
      if (answer.ok) return json({ code }, 200, cors);
    }
    return json({ error: 'No free room code: try again' }, 503, cors);
  }

  const match = url.pathname.match(/^\/rooms\/([^/]+)$/);
  if (match && request.headers.get('Upgrade') === 'websocket') {
    const code = match[1];
    if (!isCode(code)) return new Response('Not a room code', { status: 404 });
    const room = env.ROOMS.get(env.ROOMS.idFromName(code));
    return room.fetch(new Request(`https://room/ws?code=${code}`, request));
  }
  return new Response('Not found', { status: 404 });
}

export default { fetch: (request, env) => handle(request, env) };
