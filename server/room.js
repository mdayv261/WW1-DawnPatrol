// One room on the server: a Cloudflare Durable Object holding the room's lobby (src/mp/roomCore.js)
// and its players' connections. Everything is kept in memory; nothing is written to storage,
// and the room is forgotten when the last player has gone.
//
// The Worker (worker.js) sends two kinds of request here:
//   POST /claim?code=XXXXXX   a new room: succeeds unless the code is already in use
//   GET  /ws?code=XXXXXX      (a WebSocket upgrade) a player connecting
// attach(socket) does the work for one connection, so the tests can use fake sockets.
// Browsers ping every 2 s; a connection silent for SILENT_DROP_S is closed as dropped.
// While a match is on, a MatchSim (src/mp/matchSim.js) flies every connected player's aircraft
// from the controls they send (binary messages), and a timer sends each player 30 snapshots a
// second.

import { RoomCore } from '../src/mp/roomCore.js';
import { parseClientMessage, errorMessage, notice } from '../src/mp/protocol.js';
import { MatchSim } from '../src/mp/matchSim.js';
import { WorldSolids } from '../src/mp/worldSolids.js';
import { decodeInputs } from '../src/mp/binary.js';
import { createWorld } from '../src/world/layout.js';
import { MAX_BAD_MESSAGES, SILENT_DROP_S, SERVER_INTERVAL_MS } from '../src/mp/netConfig.js';

// The world and its trees and buildings, the same for every room (built once, when first needed).
let shared = null;
const sharedWorld = () => {
  if (!shared) {
    const world = createWorld();
    shared = { world, solids: new WorldSolids(world) };
  }
  return shared;
};

const sendText = (socket, text) => {
  try {
    socket?.send(text);
  } catch {
    // the socket closed in the meantime: its close event tidies up
  }
};

export class Room {
  constructor(state, env, clock = () => Date.now()) {
    this.state = state;
    this.env = env;
    this.now = clock;
    this.core = null; // the lobby, from the moment the code is claimed
    this.sockets = new Map(); // player id -> socket
    this.heard = new Map(); // socket -> { t: when it last sent anything (ms), drop(): treat it as closed }
    this.timer = null;
    this.watch = null; // the silent-connection check, while anyone is connected
    this.match = null; // the MatchSim while a match is on
    this.ticker = null;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code') ?? '';
    if (url.pathname === '/claim') return this.claim(code);
    if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();
      this.attach(server);
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response('Not found', { status: 404 });
  }

  // Reserve this room for a new host. Refused if players are already in it.
  claim(code) {
    if (this.core && this.core.players.size > 0) return new Response('In use', { status: 409 });
    this.core = new RoomCore(code);
    return new Response('OK', { status: 200 });
  }

  // Look after one connection: its first message must be `hello` (join or rejoin).
  attach(socket) {
    socket.binaryType = 'arraybuffer'; // controls arrive as bytes (the runtime's default is a Blob, which would need waiting for)
    let id = null;
    let bad = 0;
    const refuse = (msg) => {
      sendText(socket, JSON.stringify(msg));
      socket.close(1000, msg.code ?? 'refused');
    };
    const contact = { t: this.now(), drop: () => closed() };
    this.heard.set(socket, contact);
    this.watchSilence();
    socket.addEventListener('message', (event) => {
      contact.t = this.now();
      if (typeof event.data !== 'string') {
        // Binary: a player's controls for the match.
        const inputs = id !== null && this.match ? decodeInputs(event.data) : null;
        if (inputs) this.match.receiveInputs(id, inputs);
        else if (++bad > MAX_BAD_MESSAGES) socket.close(1008, 'Too many bad messages');
        return;
      }
      const { msg, error } = parseClientMessage(event.data);
      if (error) {
        if (++bad > MAX_BAD_MESSAGES) socket.close(1008, 'Too many bad messages');
        else sendText(socket, JSON.stringify(errorMessage('badMessage')));
        return;
      }
      if (id === null) {
        if (msg.type !== 'hello') return sendText(socket, JSON.stringify(errorMessage('badMessage', 'Join the room first.')));
        if (!this.core) return refuse(errorMessage('noRoom'));
        const joined = this.core.join(msg, this.now());
        if (joined.error) return refuse(joined.error);
        id = joined.id;
        const old = this.sockets.get(id); // the same player on an older connection (a reload)
        this.sockets.set(id, socket);
        if (old && old !== socket) old.close(4000, 'Replaced by a newer connection');
      } else {
        this.core.handle(id, msg, this.now());
        if (msg.type === 'leave') {
          this.sockets.delete(id);
          id = null;
          this.flush();
          socket.close(1000, 'Left the room');
          return this.forgetIfEmpty();
        }
      }
      this.flush();
    });
    const closed = () => {
      this.heard.delete(socket);
      if (id === null || this.sockets.get(id) !== socket) return; // never joined, or replaced
      this.sockets.delete(id);
      this.core?.disconnect(id, this.now());
      this.flush();
      this.scheduleExpiry();
    };
    socket.addEventListener('close', closed);
    socket.addEventListener('error', closed);
  }

  // Send what the room has to say. Only the newest lobby view for everyone is worth sending.
  flush() {
    if (!this.core) return;
    this.syncMatch();
    const out = this.core.outbox.splice(0);
    const isLobby = (o) => o.to === 'all' && o.msg.type === 'lobby';
    const last = out.findLastIndex(isLobby);
    out.forEach((o, i) => {
      if (isLobby(o) && i !== last) return;
      const text = JSON.stringify(o.msg);
      if (o.to === 'all') for (const s of this.sockets.values()) sendText(s, text);
      else sendText(this.sockets.get(o.to), text);
    });
  }

  // Check again when the next dropped player's time to rejoin runs out.
  scheduleExpiry() {
    clearTimeout(this.timer);
    this.timer = null;
    if (!this.core) return;
    const waiting = [...this.core.players.values()].filter((p) => !p.connected);
    if (!waiting.length) return;
    this.timer = setTimeout(() => {
      this.core?.expire(this.now());
      this.flush();
      if (!this.forgetIfEmpty()) this.scheduleExpiry();
    }, 1000);
  }

  // Close connections that have gone quiet and mark their players dropped (a dead connection
  // may never report its own close).
  checkSilent() {
    const now = this.now();
    for (const [socket, contact] of this.heard) {
      if (now - contact.t < SILENT_DROP_S * 1000) continue;
      contact.drop();
      try {
        socket.close(4001, 'Nothing heard for too long');
      } catch {
        // already gone
      }
    }
    if (!this.heard.size) {
      clearInterval(this.watch);
      this.watch = null;
    }
  }

  watchSilence() {
    this.watch ??= setInterval(() => this.checkSilent(), 5000);
  }

  // Keep the match in step with the lobby: started when the host starts it, stopped when the
  // room goes back to the lobby, and flying exactly the players who are connected.
  syncMatch() {
    const core = this.core;
    if (!core || core.phase !== 'match') return this.stopMatch();
    if (!this.match) {
      const { world, solids } = sharedWorld();
      this.match = new MatchSim({ settings: { ...core.settings }, world, solidAt: (x, y, z) => solids.hit(x, y, z), now: this.now() });
      this.ticker = setInterval(() => this.tickMatch(), SERVER_INTERVAL_MS);
    }
    for (const p of core.players.values()) {
      const flying = this.match.players.has(p.id);
      if (p.connected && !flying) this.match.addPlayer({ id: p.id, slot: p.order, name: p.name, team: p.team, aircraft: p.aircraft });
      if (!p.connected && flying) this.match.removePlayer(p.id);
    }
    for (const id of [...this.match.players.keys()]) if (!core.players.has(id)) this.match.removePlayer(id);
  }

  // The match timer: fly the ticks that are due, send the snapshots, and tell everyone what
  // happened (impacts for the sparks, the score, and messages such as who shot whom down).
  tickMatch() {
    if (!this.match) return;
    const { snapshots, notices, fx, score } = this.match.advanceTo(this.now());
    for (const s of snapshots) sendText(this.sockets.get(s.id), s.buffer);
    if (fx.length) this.broadcast({ type: 'fx', e: fx });
    if (score) {
      this.score = score;
      this.broadcast({ type: 'score', ...score });
    }
    if (!notices.length || !this.core) return;
    for (const n of notices) {
      if (n.to !== 'all') this.core.send(n.to, notice(n.text));
      else for (const id of this.sockets.keys()) if (!n.except?.includes(id)) this.core.send(id, notice(n.text));
    }
    this.flush();
  }

  // A message to every connected player, straight away (not through the lobby).
  broadcast(msg) {
    const text = JSON.stringify(msg);
    for (const s of this.sockets.values()) sendText(s, text);
  }

  stopMatch() {
    clearInterval(this.ticker);
    this.ticker = null;
    this.match = null;
  }

  // Nobody left: forget the room. Returns true if it was forgotten.
  forgetIfEmpty() {
    if (!this.core || this.core.players.size > 0) return false;
    this.stopMatch();
    this.core = null;
    clearTimeout(this.timer);
    this.timer = null;
    return true;
  }
}
