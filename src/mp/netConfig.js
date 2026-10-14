// Multiplayer settings shared by the room server and the browser: room sizes, timings, room
// codes and the match settings the host may choose. Network and game-flow values only; the
// flight physics and aircraft data stay in src/aircraft/ and are never changed by multiplayer.

import { STARTS, TIMES } from '../game/flow.js';

// Raised whenever a message changes shape, so an old cached page and a new server (or the
// other way round) refuse each other with "please reload" instead of misunderstanding.
export const PROTOCOL_VERSION = 3; // 2: M3 (guns in the snapshots); 3: M4 (the results phase)

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

// ---- flying together (M2) --------------------------------------------------------------------
export const TICK_HZ = 120; // the server's physics steps per second (the same fixed step as single-player)
export const TICK_MS = 1000 / TICK_HZ;
export const SNAPSHOT_EVERY = 4; // ticks between snapshots: 30 a second
export const INPUTS_PER_MESSAGE = 4; // ticks of controls in one message from a browser: 30 messages a second
export const SERVER_INTERVAL_MS = 16; // how often the room's timer runs the ticks that are due
export const MAX_TICKS_PER_CALLBACK = 24; // more than this (a stalled server) is dropped, not raced through
export const INPUT_AHEAD_MAX = TICK_HZ; // controls more than 1 s ahead of the server are refused
export const HANDS_OFF_TICKS = TICK_HZ; // no controls from a player for this long (a hidden tab, a stalled line): stick and rudder centred, throttle kept
// (1 s: a lost packet on a 250 ms line holds controls up about half a second, which must not count)
export const LEAD_TARGET_TICKS = 2; // how early a browser's controls should reach the server, plus the jitter
export const CLOCK_RATE = 0.02; // the browser runs up to 2% fast or slow to keep that lead
export const CLOCK_RESET_TICKS = 30; // further off than this, the browser's clock jumps instead
export const HISTORY_TICKS = 2 * TICK_HZ; // own controls and states kept for replaying corrections
export const CORRECT = { position: 0.02, velocity: 0.02, angle: (0.1 * Math.PI) / 180, rate: 0.01, other: 1e-6 }; // differences that trigger a correction
export const SMOOTH_S = 0.05; // time constant of fading out a correction (95% gone in 0.15 s)
export const SNAP_DISTANCE = 50; // m: a correction this big (a respawn) is not faded
export const INTERP_DELAY_MS = 100; // other aircraft are drawn this far in the past...
export const INTERP_DELAY_MAX_MS = 200; // ...rising to this on a jittery connection
export const EXTRAPOLATE_MAX_S = 0.5; // past the newest snapshot, carry on for at most this long (covers a lost packet sent again)
export const CATCH_UP_SPEED = 20; // m/s: a drawn aircraft that fell behind its true path closes the gap no faster than this
export const RESPAWN_S = 10; // back in the air this long after going down
// ---- combat (M3) ----------------------------------------------------------------------------------
// Lag compensation: a round is tested against the targets where its shooter saw them, up to this
// far back. At 150 ms ping that is the round trip + the browser's lead + the 100-200 ms drawing
// delay, about 0.3-0.4 s; more than this cannot be claimed (a very slow line cannot be abused).
export const MAX_REWIND_TICKS = Math.round(0.4 * TICK_HZ);
export const POSE_HISTORY_TICKS = TICK_HZ + 4; // the server keeps a second of every aircraft's poses
export const KILL_CREDIT_S = 15; // going down (or crashing) this soon after an enemy's hit is their kill
export const FX_MAX = 60; // impacts sent in one message at most
export const HIT_NOTICE_S = 2; // "You are hit!" at most this often
export const ROUNDS_DRIFT = 20; // the browser's own round count is corrected from the server beyond this
// ---- match flow (M4) ------------------------------------------------------------------------------
export const RESULTS_S = 20; // the results stay up this long, then everyone is back in the lobby
export const EMPTY_TEAM_S = 30; // a team with nobody in the sky this long ends the match
export const END_CHECK_TICKS = TICK_HZ; // how often the match checks whether it is over (once a second)
export const SOLIDS = { tile: 1000, treeSpacing: 16, maxHeight: 60, border: 50 }; // trees and buildings everyone crashes into (Medium's spacing)
export const SPAWN = { airBehindFront: 3000, airSpacing: 300, groundSpacing: 30, groundFromEnd: 0.3 }; // where teams appear

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
