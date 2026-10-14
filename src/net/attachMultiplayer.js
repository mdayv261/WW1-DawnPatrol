// Multiplayer in the page: builds the room client and its screens (Multiplayer, the lobby, the
// match's Esc menu) and adds them to the game's screens, so the flow (src/game/flow.js) shows and
// hides them like the others. Follows the room: joined -> lobby; match started -> flying (once
// the server has placed your aircraft); match ended -> lobby; refused or lost -> back to the
// Multiplayer screen with the reason. Called once by main.js.

import { createMpClient } from './mpClient.js';
import { serverBase } from './serverUrl.js';
import { parseNetsim, cleanNetsim, netsimActive, netsimText } from './netSim.js';
import { NetFlight } from './netFlight.js';
import { createMultiplayerScreen } from '../ui/screens/multiplayer.js';
import { createLobby, createMpEsc } from '../ui/screens/lobby.js';
import { createMpResults } from '../ui/screens/mpResults.js';
import { createScoreLine, scoreLineText } from '../ui/scoreLine.js';
import { AIRCRAFT_LIST } from '../aircraft/index.js';
import { WorldSolids } from '../mp/worldSolids.js';
import { createWorld } from '../world/layout.js';
import { RESULTS_S, TICK_HZ } from '../mp/netConfig.js';

const NETSIM_KEY = 'dawnPatrol.netsim';
const ROOM_SCREENS = ['lobby', 'mpFlying', 'mpEsc', 'mpResults'];
const aircraftById = (id) => AIRCRAFT_LIST.find((a) => a.id === id) ?? null;

const tabStorage = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

// flow: the game's Flow; screens: main.js's screens (these are added to it); session: the flight
// on screen (src/game/session.js); idle(): put the idle aircraft back behind the menus;
// notice(text, ms): the in-flight message line; pilot(): the Roll Call pilot flying now (for the
// name and team), or null.
export function attachMultiplayer({ flow, screens, session, idle, notice, pilot }) {
  const storage = tabStorage();
  const params = new URLSearchParams(window.location.search);
  // The test network: ?netsim= in the address wins, else this tab's own setting.
  let netsim = parseNetsim(params.get('netsim'));
  if (!netsim) {
    try {
      netsim = cleanNetsim(JSON.parse(storage?.getItem(NETSIM_KEY) ?? 'null'));
    } catch {
      netsim = cleanNetsim(null);
    }
  }
  let pending = ''; // the message for the Multiplayer screen when it opens
  let note = ''; // the room's latest notice ("Max joined")
  let noteTimer = null;
  let flight = null; // { match (the matchStart it is for), net (NetFlight) } while a match is on
  let solids = null; // the trees and buildings everyone shares (built when first needed)

  const options = {
    base: serverBase({ search: window.location.search, env: import.meta.env, location: window.location, dev: import.meta.env.DEV }),
    storage,
    netsim,
    onChange: () => sync(),
    onBinary: (buffer) => flight?.net.receive(buffer),
    onFx: (list) => flight?.net.onFx(list),
    onNotice: (text) => {
      if (flow.flying) notice(text, 3500); // in flight: the message line ("Albert crashed")
      note = text;
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => { note = ''; render(); }, 5000);
      render();
    },
  };
  const client = createMpClient(options);
  const name = () => pilot()?.name ?? '';
  const team = () => ({ allied: 'allied', german: 'central' })[pilot()?.side] ?? null;
  const sideNote = () => (netsimActive(options.netsim) ? netsimText(options.netsim) : '');

  // A player in the match by the slot the server gives them (their join order).
  const lookup = (slot) => {
    const p = client.state.lobby?.players.find((q) => q.id === `p${slot}`);
    return p ? { name: p.name, team: p.team, aircraft: aircraftById(p.aircraft) } : null;
  };

  // The match has started (or we joined one): fly it.
  function startFlight(match) {
    stopFlight(false);
    const me = match.players.find((p) => p.id === client.state.you) ?? client.me;
    const ac = aircraftById(me?.aircraft);
    if (!ac) return;
    if (!solids) solids = new WorldSolids(createWorld());
    const net = new NetFlight({
      send: (buffer) => client.sendBinary(buffer),
      settings: match.settings,
      lookup,
      solidAt: (x, y, z) => solids.hit(x, y, z),
      ping: () => client.ping ?? 0,
      jitter: () => client.jitter,
      onReady: (input) => {
        session.resetControls(input);
        sync();
      },
      onRespawn: (input) => session.resetControls(input),
      notice: (text) => notice(text, 2000),
    });
    flight = { match, net };
    session.startNet(ac, match.settings.timeOfDay, net);
  }

  // The match is over for us: back to the idle aircraft behind the menus.
  function stopFlight(putBack = true) {
    if (!flight) return;
    flight = null;
    session.stopNet();
    if (putBack) idle();
  }

  const leave = () => {
    client.leave();
    stopFlight();
    pending = 'You left the room.';
    if (ROOM_SCREENS.includes(flow.state)) flow.go('multiplayer');
  };

  const menu = createMultiplayerScreen({
    getName: name,
    getNetsim: () => options.netsim,
    onCreate: (n) => client.createRoom(n, team()),
    onJoin: (code, n) => client.joinRoom(code, n, team()),
    onNetsim: (s) => {
      options.netsim = s;
      try {
        storage?.setItem(NETSIM_KEY, JSON.stringify(s));
      } catch {
        // not remembered
      }
      menu.say(netsimActive(s) ? `Test network on: ${netsimText(s)} (from the next connection)` : 'Test network off');
    },
    onBack: () => flow.go('menu'),
  });
  const lobby = createLobby({ client, onLeave: leave, netsimNote: sideNote });
  const esc = createMpEsc({
    client,
    onResume: () => flow.go('mpFlying'),
    onOptions: () => flow.go('options'),
    onEnd: () => client.toLobby(),
    onLeave: leave,
  });

  const results = createMpResults({ client, onLobby: () => client.toLobby(), onLeave: leave });
  const secondsLeft = () => RESULTS_S - (Date.now() - client.state.resultAt) / 1000;
  const scoreLine = createScoreLine();

  // The flow calls show() with nothing; each screen draws from the client's state.
  screens.multiplayer = { ...menu, show: () => { menu.show(pending || (client.available ? '' : 'Multiplayer is not available on this copy of the game yet.')); pending = ''; } };
  screens.lobby = { ...lobby, show: () => { lobby.show(); lobby.render(note); } };
  screens.mpEsc = { ...esc, show: () => { esc.show(); esc.render(note); } };
  screens.mpFlying = { show: () => {}, hide: () => {} }; // flying: no screen, just the game
  screens.mpResults = { ...results, show: () => { results.show(); results.render(secondsLeft()); } };

  function render() {
    if (flow.state === 'lobby') lobby.render(flight && !flight.net.ready ? note || 'Joining the match...' : note);
    if (flow.state === 'mpEsc') esc.render(note);
    if (flow.state === 'mpResults') results.render(secondsLeft());
  }

  // Follow the room's state with the screens.
  const WAITING = { creating: 'Creating a room...', connecting: 'Connecting to the room...' };
  function sync() {
    const st = client.state;
    const here = flow.state;
    if ((st.status === 'inRoom' || st.status === 'reconnecting') && st.lobby) {
      const phase = st.lobby.phase;
      const on = phase === 'match';
      if (on && st.match && st.match !== flight?.match) startFlight(st.match);
      if (!on && flight) stopFlight();
      let want = 'lobby';
      if (phase === 'results' && st.result) want = 'mpResults';
      else if (on && flight?.net.ready) want = here === 'mpEsc' ? 'mpEsc' : 'mpFlying';
      if (here !== want && (here === 'multiplayer' || ROOM_SCREENS.includes(here))) return flow.go(want);
    } else if (['error', 'lost', 'idle'].includes(st.status)) {
      stopFlight();
      if (ROOM_SCREENS.includes(here)) {
        pending = st.message;
        return flow.go('multiplayer');
      }
      if (here === 'multiplayer' && st.message) menu.say(st.message);
    } else if (here === 'multiplayer' && WAITING[st.status]) menu.say(WAITING[st.status]);
    render();
  }
  flow.onChange(() => { if (flow.multiplayer) sync(); }); // e.g. back from Options while the match ended

  // The ping line and the results countdown, once a second.
  setInterval(() => {
    if (flow.state === 'lobby') lobby.update();
    if (flow.state === 'mpResults') results.render(secondsLeft());
  }, 1000);

  // The score line while flying in a match (4 times a second).
  setInterval(() => {
    const on = flow.state === 'mpFlying' && flight?.net.ready;
    scoreLine.set(on ? scoreLineText(client.state.score, flight.net.serverTick / TICK_HZ, flight.match.settings) : '');
  }, 250);

  // Leaving the page closes the connection at once (Chrome may otherwise keep a left page, and
  // its connection, alive), and the place in the room is kept. If the browser brings the page
  // back, or it is reloaded, it goes back into the room it was in.
  window.addEventListener('pagehide', () => client.drop());
  const rejoin = () => {
    const saved = client.savedRoom();
    if (!saved) return;
    if (flow.state === 'menu') flow.go('multiplayer');
    if (flow.state === 'multiplayer' || ROOM_SCREENS.includes(flow.state)) client.joinRoom(saved, name(), team());
  };
  window.addEventListener('pageshow', (e) => { if (e.persisted) rejoin(); });
  setTimeout(rejoin, 0); // after a reload, once the page is set up
  return client;
}
