// Multiplayer in the page: builds the room client and its three screens (Multiplayer, the
// lobby, the match) and adds them to the game's screens, so the flow (src/game/flow.js) shows
// and hides them like the others. Follows the room: joined -> lobby, match started -> match,
// refused or lost -> back to the Multiplayer screen with the reason. Called once by main.js.

import { createMpClient } from './mpClient.js';
import { serverBase } from './serverUrl.js';
import { parseNetsim, cleanNetsim, netsimActive, netsimText } from './netSim.js';
import { createMultiplayerScreen } from '../ui/screens/multiplayer.js';
import { createLobby, createMpMatch } from '../ui/screens/lobby.js';

const NETSIM_KEY = 'dawnPatrol.netsim';
const ROOM_SCREENS = ['lobby', 'mpMatch'];

const tabStorage = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

// flow: the game's Flow; screens: main.js's screens (the three are added to it);
// pilot(): the Roll Call pilot flying now (for the name and team), or null.
export function attachMultiplayer({ flow, screens, pilot }) {
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

  const options = {
    base: serverBase({ search: window.location.search, env: import.meta.env, location: window.location, dev: import.meta.env.DEV }),
    storage,
    netsim,
    onChange: () => sync(),
    onNotice: (text) => {
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

  const leave = () => {
    client.leave();
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
  const match = createMpMatch({ client, onLobby: () => client.toLobby(), onLeave: leave });

  // The flow calls show() with nothing; each screen draws from the client's state.
  screens.multiplayer = { ...menu, show: () => { menu.show(pending || (client.available ? '' : 'Multiplayer is not available on this copy of the game yet.')); pending = ''; } };
  screens.lobby = { ...lobby, show: () => { lobby.show(); lobby.render(note); } };
  screens.mpMatch = { ...match, show: () => { match.show(); match.render(note); } };

  function render() {
    if (flow.state === 'lobby') lobby.render(note);
    if (flow.state === 'mpMatch') match.render(note);
  }

  // Follow the room's state with the screens.
  const WAITING = { creating: 'Creating a room...', connecting: 'Connecting to the room...' };
  function sync() {
    const st = client.state;
    const here = flow.state;
    if ((st.status === 'inRoom' || st.status === 'reconnecting') && st.lobby) {
      const want = st.lobby.phase === 'match' && st.match ? 'mpMatch' : 'lobby';
      if (here !== want && (here === 'multiplayer' || ROOM_SCREENS.includes(here))) return flow.go(want);
    } else if (['error', 'lost', 'idle'].includes(st.status)) {
      if (ROOM_SCREENS.includes(here)) {
        pending = st.message;
        return flow.go('multiplayer');
      }
      if (here === 'multiplayer' && st.message) menu.say(st.message);
    } else if (here === 'multiplayer' && WAITING[st.status]) menu.say(WAITING[st.status]);
    render();
  }

  // The ping line, once a second.
  setInterval(() => { if (flow.state === 'lobby') lobby.update(); }, 1000);

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
