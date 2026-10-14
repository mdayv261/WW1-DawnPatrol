// Where the multiplayer server is. In this order:
//   1. ?server=https://... in the page address (for testing another server);
//   2. VITE_MP_SERVER, set when the game is built for publishing (empty until the server is deployed),
//      or 'same-origin' for a copy of the game served by the room server itself (the test copy);
//   3. while developing, the local server `npm run mp:server` starts, on port 8787 of this computer.
// null: this copy of the game has no server, and the Multiplayer screen says so.

export const DEV_SERVER_PORT = 8787;

export function serverBase({ search = '', env = {}, location = null, dev = false } = {}) {
  const asked = new URLSearchParams(search).get('server');
  const built = env.VITE_MP_SERVER === 'same-origin' && location ? `${location.protocol}//${location.host}` : env.VITE_MP_SERVER;
  const base = asked || built || (dev && location ? `${location.protocol}//${location.hostname}:${DEV_SERVER_PORT}` : null);
  return base ? String(base).replace(/\/+$/, '') : null;
}

// The WebSocket address of a room: http(s) becomes ws(s).
export const roomSocketUrl = (base, code) => `${base.replace(/^http/, 'ws')}/rooms/${code}`;
