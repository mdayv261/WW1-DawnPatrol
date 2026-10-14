// Multiplayer settings shared by the room server and the browser: room sizes, timings, room
// codes and the match settings the host may choose. Network and game-flow values only; the
// flight physics and aircraft data stay in src/aircraft/ and are never changed by multiplayer.

import { STARTS, TIMES } from '../game/flow.js';

// Raised whenever a message changes shape, so an old cached page and a new server (or the
// other way round) refuse each other with "please reload" instead of misunderstanding.
export const PROTOCOL_VERSION = 1;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const REJOIN_GRACE_S = 60; // a dropped player keeps their place this long
export const PING_INTERVAL_S = 2; // how often the browser measures its ping
// A connection the server has heard nothing from for this long is treated as dropped (a laptop
// gone to sleep, Wi-Fi lost: the connection can stay "open" without anyone at the other end).
export const SILENT_DROP_S = 20;
export const MAX_MESSAGE_BYTES = 4096; // larger messages are ignored
export const MAX_BAD_MESSAGES = 50; // a socket sending more malformed messages than this is closed
export const RECONNECT_DELAYS_S = [1, 2, 4]; // the browser's own retries after a dropped connection

// Room codes: capitals and digits without the look-alikes I, O, 0 and 1 (32 characters, so
// about a thousand million six-character codes).
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

// The two teams, by the `side` written in each aircraft's data file.
export const TEAMS = { allied: 'Allied', central: 'Central' };
export const TEAM_IDS = Object.keys(TEAMS);
export const TEAM_LABELS = { allied: 'Allied', central: 'Central (German)' };

// What the host can set, with the first-time values.
export const SETTING_CHOICES = {
  start: STARTS.map((s) => s.id), // 'airfield', '1000', '2000', '3000'
  timeOfDay: TIMES.map((t) => t.id), // 'dawn', 'day', 'dusk'
  scoreLimit: [3, 5, 10, 20], // team kills to win
  timeLimit: [5, 10, 15, 20], // minutes
  friendlyFire: [false, true],
  structuralDamage: [true, false],
};
export const DEFAULT_SETTINGS = { start: '2000', timeOfDay: 'day', scoreLimit: 5, timeLimit: 10, friendlyFire: false, structuralDamage: true };

// Settings from anything (a message, a saved copy): each value must be one of its choices,
// otherwise it falls back to `base` (the current settings).
export function cleanSettings(raw, base = DEFAULT_SETTINGS) {
  const out = { ...base };
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, choices] of Object.entries(SETTING_CHOICES)) {
    if (key in raw && choices.includes(raw[key])) out[key] = raw[key];
  }
  return out;
}
