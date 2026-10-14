// The browser's side of a multiplayer room: creating or joining one, keeping the latest lobby
// the server sent, passing the player's choices on, and reconnecting by itself (with the
// tab's private token, so the room gives back the same place) when the connection drops.
// No drawing: the screens (src/ui/screens/multiplayer.js, lobby.js) read `state` and call the
// actions; onChange() tells them something changed.

import { openConnection } from './connection.js';
import { roomSocketUrl } from './serverUrl.js';
import { tidyCode, isCode } from '../mp/roomCode.js';
import { PROTOCOL_VERSION, RECONNECT_DELAYS_S } from '../mp/netConfig.js';

export const TOKEN_KEY = 'dawnPatrol.mpToken';
export const ROOM_KEY = 'dawnPatrol.mpRoom';
const FATAL = new Set(['version', 'noRoom', 'full', 'badName']); // the room refused us: do not retry

const read = (storage, key) => {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};
const write = (storage, key, value) => {
  try {
    if (value === null) storage?.removeItem(key);
    else storage?.setItem(key, value);
  } catch {
    // not remembered (private window)
  }
};

// A random private token for this tab (kept in sessionStorage, so it is forgotten with the tab).
function newToken(rng) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  for (let i = 0; i < 24; i++) t += chars[Math.floor(rng() * chars.length) % chars.length];
  return t;
}

// options: { base (the server's address, or null), storage (sessionStorage), netsim (settings or
// null), onChange(), onNotice(text), onBinary(ArrayBuffer) (the match's snapshots), onFx(list)
// (impacts), fetchFn, makeSocket, timers, rng, now }.
export function createMpClient(options) {
  const { storage = null, onChange = () => {}, onNotice = () => {}, fetchFn = (...a) => fetch(...a), timers = globalThis, rng = Math.random } = options;
  let token = read(storage, TOKEN_KEY);
  if (!token) {
    token = newToken(rng);
    write(storage, TOKEN_KEY, token);
  }

  const state = {
    status: 'idle', // idle | creating | connecting | inRoom | reconnecting | lost | error
    message: '', // the last problem, in words
    you: null, // our player id
    code: null,
    lobby: null, // the latest lobby view
    match: null, // the latest matchStart
    score: null, // the match's score: { teams, players }
  };
  let conn = null;
  let join = null; // { code, name, team }: what to send when (re)connecting
  let leaving = false;
  let retry = 0;
  let retryTimer = null;

  const changed = () => onChange(state);
  const set = (patch) => {
    Object.assign(state, patch);
    changed();
  };

  function connect() {
    conn?.close();
    const url = roomSocketUrl(options.base, join.code);
    conn = openConnection(url, {
      onOpen: () => conn.send({ type: 'hello', v: PROTOCOL_VERSION, name: join.name, token, team: join.team ?? null }),
      onMessage: received,
      onBinary: (buffer) => options.onBinary?.(buffer),
      onClose: closed,
    }, { netsim: options.netsim, makeSocket: options.makeSocket, timers, rng, now: options.now });
  }

  function received(msg) {
    switch (msg.type) {
      case 'welcome':
        retry = 0;
        write(storage, ROOM_KEY, msg.code);
        return set({ status: 'inRoom', you: msg.you, code: msg.code, message: '' });
      case 'lobby':
        return set({ lobby: msg });
      case 'matchStart':
        return set({ match: msg, score: null });
      case 'notice':
        return onNotice(msg.text);
      case 'fx':
        return options.onFx?.(Array.isArray(msg.e) ? msg.e : []);
      case 'score':
        return set({ score: { teams: msg.teams, players: msg.players } });
      case 'error':
        if (FATAL.has(msg.code)) {
          leaving = true; // the server closes the connection: no retry
          if (msg.code === 'noRoom') write(storage, ROOM_KEY, null);
          return set({ status: 'error', message: msg.text });
        }
        return set({ message: msg.text });
      default:
    }
  }

  function closed() {
    conn = null;
    if (leaving) {
      leaving = false;
      if (state.status !== 'error') set({ status: 'idle', lobby: null, match: null, you: null, code: null });
      return;
    }
    if (retry < RECONNECT_DELAYS_S.length && join) {
      set({ status: 'reconnecting', message: 'Connection lost: reconnecting...' });
      retryTimer = timers.setTimeout(connect, RECONNECT_DELAYS_S[retry++] * 1000);
      return;
    }
    set({ status: 'lost', message: 'Lost the connection to the room.', lobby: null, match: null });
  }

  function start(code, name, team) {
    timers.clearTimeout(retryTimer);
    retry = 0;
    leaving = false;
    join = { code, name, team };
    set({ status: 'connecting', message: '', lobby: null, match: null });
    connect();
  }

  const send = (msg) => conn?.send(msg);

  return {
    state,
    get available() {
      return Boolean(options.base);
    },
    get ping() {
      return conn?.ping ?? null;
    },
    get jitter() {
      return conn?.jitter ?? 0;
    },
    sendBinary: (buffer) => conn?.sendBinary(buffer),
    get me() {
      return state.lobby?.players.find((p) => p.id === state.you) ?? null;
    },
    get isHost() {
      return Boolean(state.you) && state.lobby?.hostId === state.you;
    },
    // The room this tab was in before a reload, if any.
    savedRoom: () => read(storage, ROOM_KEY),

    // Ask the server for a new room, then join it as its host.
    async createRoom(name, team = null) {
      if (!options.base) return set({ status: 'error', message: 'Multiplayer is not available on this copy of the game yet.' });
      set({ status: 'creating', message: '' });
      try {
        const answer = await fetchFn(`${options.base}/rooms`, { method: 'POST' });
        const body = await answer.json();
        if (!answer.ok || !isCode(body.code)) throw new Error(body.error ?? 'no code');
        start(body.code, name, team);
      } catch {
        set({ status: 'error', message: 'Could not reach the multiplayer server. Is it running?' });
      }
    },

    joinRoom(codeText, name, team = null) {
      if (!options.base) return set({ status: 'error', message: 'Multiplayer is not available on this copy of the game yet.' });
      const code = tidyCode(codeText);
      if (!isCode(code)) return set({ status: 'error', message: 'A room code has six letters and numbers (no I, O, 0 or 1).' });
      start(code, name, team);
    },

    setTeam: (team) => send({ type: 'setTeam', team }),
    setAircraft: (aircraft) => send({ type: 'setAircraft', aircraft }),
    setReady: (ready) => send({ type: 'setReady', ready }),
    setSettings: (settings) => send({ type: 'setSettings', settings }),
    startMatch: () => send({ type: 'start' }),
    toLobby: () => send({ type: 'toLobby' }),

    // The page is being left (a reload, another page): close the connection but keep the place,
    // so coming back within the grace time rejoins. No reconnect is tried from here.
    drop() {
      timers.clearTimeout(retryTimer);
      conn?.close();
      conn = null;
      Object.assign(state, { status: 'idle', lobby: null, match: null });
    },

    // Leave the room on purpose: the place is given up at once and no reconnect is tried.
    leave() {
      timers.clearTimeout(retryTimer);
      write(storage, ROOM_KEY, null);
      join = null;
      if (!conn) return set({ status: 'idle', lobby: null, match: null, you: null, code: null });
      leaving = true;
      send({ type: 'leave' });
      const c = conn;
      timers.setTimeout(() => { // if the server has not closed it by then
        if (conn !== c) return;
        c.close();
        closed();
      }, 1500);
    },
  };
}
