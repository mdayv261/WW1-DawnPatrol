// The messages between the browser and the room server. In M1 they are small JSON objects
// with a `type`; the frequent flight messages (M2) will be compact binary.
//
// Browser -> server:
//   hello { v, name, token, team? }   the first message: join the room (or rejoin with the token)
//   setTeam { team }  setAircraft { aircraft }  setReady { ready }
//   setSettings { settings }  start {}  toLobby {}   (host only)
//   ping { t }  leave {}
// Server -> browser:
//   welcome { you, code, token }  lobby { ...room view }  matchStart { settings, players }
//   matchEnd { result }  fx { e }  score { teams, players }  (binary snapshots: src/mp/binary.js)
//   notice { text }  error { code, text }  pong { t }
//
// Everything a browser sends is checked here before the room looks at it: a message of the
// wrong shape is refused, never half-used.

import { MAX_MESSAGE_BYTES, TEAM_IDS } from './netConfig.js';

const TOKEN_OK = /^[A-Za-z0-9_-]{8,64}$/;
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Each type's check of its fields: returns the clean message, or null if it is malformed.
const CLIENT = {
  hello: (m) => {
    if (!Number.isInteger(m.v) || typeof m.name !== 'string' || m.name.length > 64 || !TOKEN_OK.test(m.token ?? '')) return null;
    if (m.team !== undefined && m.team !== null && !TEAM_IDS.includes(m.team)) return null;
    return { type: 'hello', v: m.v, name: m.name, token: m.token, team: m.team ?? null };
  },
  setTeam: (m) => (TEAM_IDS.includes(m.team) ? { type: 'setTeam', team: m.team } : null),
  setAircraft: (m) => (typeof m.aircraft === 'string' && m.aircraft.length <= 20 ? { type: 'setAircraft', aircraft: m.aircraft } : null),
  setReady: (m) => (typeof m.ready === 'boolean' ? { type: 'setReady', ready: m.ready } : null),
  setSettings: (m) => (isObject(m.settings) ? { type: 'setSettings', settings: m.settings } : null),
  start: () => ({ type: 'start' }),
  toLobby: () => ({ type: 'toLobby' }),
  leave: () => ({ type: 'leave' }),
  ping: (m) => (Number.isFinite(m.t) ? { type: 'ping', t: m.t } : null),
};

export const CLIENT_TYPES = Object.keys(CLIENT);

// Read a browser's message (text). Returns { msg } or { error: why it was refused }.
export function parseClientMessage(text) {
  if (typeof text !== 'string') return { error: 'not text' };
  if (text.length > MAX_MESSAGE_BYTES) return { error: 'too long' };
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: 'not JSON' };
  }
  if (!isObject(raw) || !Object.hasOwn(CLIENT, raw.type)) return { error: 'unknown type' };
  const msg = CLIENT[raw.type](raw);
  return msg ? { msg } : { error: `bad ${raw.type}` };
}

// ---- server messages ----------------------------------------------------------------------

export const welcome = (you, code, token) => ({ type: 'welcome', you, code, token });
export const lobbyMessage = (view) => ({ type: 'lobby', ...view });
export const matchStart = (settings, players) => ({ type: 'matchStart', settings, players });
export const matchEnd = (result) => ({ type: 'matchEnd', result });
export const notice = (text) => ({ type: 'notice', text });
export const pong = (t) => ({ type: 'pong', t });

// Errors the room can report, in words a player understands.
export const ERRORS = {
  version: 'This page is out of date: please reload it.',
  noRoom: 'No room with that code. Check the code, or ask the host to create a new room.',
  full: 'That room is full (four players).',
  badName: 'That name cannot be used.',
  notHost: 'Only the host can do that.',
  cannotStart: 'The match cannot start yet.',
  badMessage: 'The game sent something the room did not understand.',
  notInLobby: 'That can only be changed in the lobby.',
};

// An error message; `text` adds detail (for example why a name is refused).
export const errorMessage = (code, text = ERRORS[code] ?? code) => ({ type: 'error', code, text });
