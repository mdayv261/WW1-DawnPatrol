# Multiplayer Specification: Allied vs Central team dogfights

Status: Stage 1 (research and recommendation) approved by the product owner on 14 Oct 2026.
M1-M6 (D66-D71) are done: multiplayer is merged into `main` and published with the game on GitHub Pages. Server: https://dawn-patrol-mp.dawn-patrol-mp-server.workers.dev (Cloudflare free plan; it also serves a test copy of the game). Guide for players: `docs/MULTIPLAYER_GUIDE.md`. Test server: https://dawn-patrol-mp.dawn-patrol-mp-server.workers.dev (Cloudflare free plan). The phase plan (M1-M6) is in `PROGRESS.md`. The decision record is D65 in `DECISIONS.md`.

## 1. Goal and rules

- **Players:** 2 to 4 human players fight each other in a private room. There are no AI aircraft in multiplayer.
- **Teams and aircraft:** Allied (Camel, SPAD) against Central (Dr.I, Albatros).
  - Each player chooses a side, then an aircraft from that side only.
  - Uneven teams (1 v 2, 1 v 3) are allowed.
- **Rooms:** private, for family and friends.
  - The host creates a room and shares a short code; the others join with the code.
  - There is no public lobby, no accounts, and no personal data is stored.
- **Physics:** the existing validated flight model is used unchanged for every aircraft. No player can gain an advantage by editing their own copy of the game.
- **Single-player:** works exactly as now, including the AI.
- **Hosting:** the game stays on GitHub Pages. The one extra service is free, and players give it no personal data.

## 2. Approaches compared

### a) Peer-to-peer WebRTC, with one player's browser as the host

| | |
|---|---|
| Finding each other | Players need a "signalling" meeting point to swap connection details. Two ways: (1) A free public service: the PeerJS cloud server, or public MQTT, Nostr or BitTorrent trackers through the Trystero library. No account is needed, but nobody guarantees it stays up, and a third party sees who connects. (2) A small service of our own, which needs an account anyway. |
| Strict networks | A free public STUN server (Google's) lets most home networks connect directly. Roughly 10-20% of connections need a **TURN relay**: some routers, and many mobile and carrier networks. TURN choices: (1) Cloudflare TURN: 1,000 GB a month free, but it needs a Cloudflare account and a small credential service, because the key cannot sit in a public page. (2) Metered: 5-20 GB a month free (its pages disagree), account needed. |
| Reliability | The host's computer and home upload carry the whole match. If the host's tab goes into the background, the browser slows its timers and the whole match stutters. If the host leaves, the match ends, unless "host migration" hands the full game state to another player. That is complex and causes a freeze. |
| Fairness | The host plays with zero delay; everyone else plays at their delay to the host. The host has a built-in advantage. |
| Cheating | The host's browser decides everything, so **the host can edit their copy** (speed, invulnerability) and nobody can detect it. Other players are safe, because they only send controls. **This fails the "no client may gain an advantage" rule** for whoever hosts. |
| Network quality | Good. Data channels can skip a lost packet instead of waiting for it. |
| Cost | £0. TURN would stay inside the free quotas at our volumes. |
| Your setup | None with public signalling. A Cloudflare or Metered account for TURN, which is needed in practice, or players on strict networks cannot connect. |
| Maintenance | Public signalling services can vanish, and free TURN quotas change. |

### b) A small hosted game server that runs the physics for everyone ("authoritative" server)

Where it could run (checked October 2026):

| Service | Cost | Account / card | Notes |
|---|---|---|---|
| **Cloudflare Workers + Durable Objects** (chosen) | Free plan: 100,000 requests a day (each message from a player counts as 1/20 of a request), 13,000 GB-s of running time a day | Cloudflare account (your email), **no card** | No sleeping and no cold start. Each room runs in a data centre near the first player to join. No server to patch. Deployed with one command. The free limits allow about **4.5 hours of 4-player play a day** (about 9 hours with 2 players). Workers Paid costs **$5 a month** if that is ever not enough. |
| Render free web service (Node) | Free, 750 hours a month | Render account, no card | Sleeps after 15 minutes without traffic, then takes about **1 minute** to wake for the next room. One fixed region. Small shared CPU. Can restart at any time. |
| Fly.io, smallest machine | About **$2 a month** | Account **and card** | Reliable, with a London region. New accounts get no free tier (since October 2024), only a short trial. |
| Your own virtual server (Hetzner about €4 a month, Oracle Always Free) | £0-4 | Account and card | The most power, but you look after the operating system and security. Not recommended. |

| | |
|---|---|
| Reliability | High. The server is neutral, so no player's laptop carries the match. Any player, the host included, can leave without stopping it. |
| Fairness | Every player is at their own delay to a neutral server. Shooting uses lag compensation (section 4), so a higher delay is neither a big handicap nor an advantage. |
| Cheating | Browsers send only stick, rudder, throttle, trim, fire and clear-jam, and the server clamps them to the legal range. **The server runs the validated physics for every aircraft.** Editing your own copy changes only what you see, and the server's state overrides it. No approach can stop automated aiming software; that is accepted for family play. |
| Network quality | WebSockets run over TCP, which resends lost packets. Light packet loss shows up as an occasional short delay, not as lost data. The smoothing buffer and short extrapolation (section 4) hide it. |
| Your setup | One Cloudflare account, and one browser login from the Mac (`npx wrangler login`). |
| Maintenance | Almost none: there is no operating system to update and nothing to wake up. Keep an eye on the free daily limit, which Cloudflare's dashboard shows. |

## 3. Recommendation (approved): (b) on Cloudflare Workers + Durable Objects

- **It is the only approach that meets the anti-cheat rule for every player, the host included.** The physics runs where no player can edit it.
- **It is fair:** nobody gets the host's zero-delay advantage.
- **The host can leave** and the match carries on.
- **It is free:** no card, no cold start and no sleeping.
- **No relay (TURN) is needed.** Each browser makes an ordinary secure web connection to the server, which works on strict home and mobile networks too.
- **The server runs our existing physics files unchanged.** The physics, weapons and world code is plain JavaScript that already runs outside the browser (the tests run it in Node). So the server *is* the validated flight model.
- **Testing on the Mac needs no account:** `wrangler dev` runs the same server locally.

**Risks and fallbacks:**
1. Cloudflare's documents are unclear on how CPU time is counted for a room that ticks continuously on the free plan. This will be measured in M2 against a real deployment. The fallbacks are:
   - Workers Paid ($5 a month, generous limits), or
   - Render free (the same code under Node, with its 1-minute wake-up).
2. TCP waits for a lost packet before passing on later ones ("head-of-line delay"). This is tested with the built-in network simulator. If it ever proves a problem, WebTransport (which, like UDP, does not wait) can be added later without changing the design.

## 4. Network design

### Who decides what (authority)
The **server** decides everything that matters:
- every aircraft's flight;
- guns, ammunition and jams;
- bullets, hits and damage;
- kills, score and respawns;
- the match clock.

Each **browser** decides only what it shows and plays.

### Ticks
- The server steps every aircraft at 120 Hz with the unchanged `Simulation.step` (`src/core/simulation.js`), on one shared tick counter.
- Bullets step on the same ticks, as in single-player.
- The physics uses no random numbers. Only bullet damage does (`applyHit`), and only the server runs it. So the same start and the same controls give the same flight on the server and in the browser. Prediction depends on this.

### Browser to server: controls
- Each 120 Hz tick's controls are stamped with the tick number: pull, roll, rudder, throttle, trim, fire and clear-jam.
- Four ticks go in one message, 30 messages a second.
- The controls are sent *after* the player's own auto-rudder (if switched on), so the assist needs nothing on the server. It only moves the rudder, as a pilot could.
- Each message also carries the "view time" of the other aircraft on the player's screen (for lag compensation, below).
- Size: about 40 bytes (binary), so **about 1.5 KB/s up per player**.
- **Checks:**
  - every value is clamped to its legal range;
  - one input per tick at most, and only for ticks near "now", which stops "speed hacks";
  - a missing input repeats the last one.

### Server to browsers: snapshots, 30 a second
- **Each other aircraft:** about 45 bytes, rounded to a sensible precision.
  - Position, orientation, velocity, rotation rate.
  - Throttle and engine rpm (for the sound).
  - Control surfaces.
  - Flags: firing, jammed, down, crashed.
  - A damage summary, for smoke and broken wings.
- **Your own aircraft:** about 150 bytes. This is everything the physics needs to continue exactly:
  - the rigid body and the control surfaces;
  - the full damage record;
  - fuel, ammunition and jams;
  - "the last control tick used".
- **Bandwidth:** about **10 KB/s down per player** (about 80 kbit/s), and 40 KB/s out of the server for 4 players.
- **Other messages:** lobby messages and events are small JSON messages. Events are things like a hit, a kill, a respawn or a player leaving.

### Your own aircraft: prediction, so it responds instantly
1. Your browser flies your aircraft itself, with the same physics and your controls, exactly as in single-player. It keeps the last second of its controls and states.
2. When the server's state for tick T arrives, the browser compares it with its own record for tick T.
3. If they differ, the browser restarts from the server's state at T and replays the controls since then. That is about 20-40 physics steps, a few milliseconds. Reasons they can differ:
   - a hit or other damage;
   - a control that reached the server late;
   - tiny maths differences between Chrome and Firefox.
4. The visible part of a correction is faded in over about 0.15 s, so you never see a jump.

The browser's tick clock runs just ahead of the server's, so your controls reach the server just in time. It starts a full round trip plus a small margin ahead, because the first snapshot is already half a round trip old. It is held there by running up to 2% faster or slower, which cannot be felt. It jumps only if it stays far out, not because of one late packet.

### Other aircraft: smoothing
- Other aircraft are drawn about **100 ms in the past**, between two snapshots that have already arrived:
  - the position follows a curve that matches each snapshot's velocity;
  - the orientation is blended smoothly.
- The 100 ms buffer grows (to at most 200 ms) if the connection is jittery.
- If snapshots stop briefly, the aircraft carries on along its last motion for up to 0.5 s (a lost packet on TCP arrives about a round trip plus 200 ms late), then eases back onto the true path when data returns, no faster than 20 m/s.
- The drawing clock never jumps: it runs at most 10% fast or slow to follow its target.

### Hits: fair across different delays
- Bullets exist only on the server. The server decides every hit with the existing hit test and hit zones (`src/weapons/hits.js`, `zones.js`).
- **Lag compensation ("favour the shooter", capped):**
  1. The server keeps one second of every aircraft's positions.
  2. Each bullet carries its shooter's view delay. While it flies, it is tested against the targets *where that shooter saw them*.
  3. The delay allowed is capped at **0.4 s** (decided in M3, D68: at 150 ms ping the look-back is the round trip plus the lead plus the 100-200 ms drawing delay, about 0.3-0.4 s), so a slow connection cannot be abused.
- **What this means in play:**
  - If your sight was on the target on your screen, you hit.
  - The cost falls on the target: they can be hit up to 0.4 s after breaking away.
  - Dogfights have no cover to duck behind, so this is the fairest trade.
- **Damage** uses the existing `applyHit` with the server's random numbers. The victim's browser receives the new damage in the next snapshot. A shot-off wing therefore changes the flight for everyone at the same moment.
- **Tracers, gun sounds and sparks** are effects that each browser draws for itself:
  - your own guns fire on screen at once;
  - other players' tracers are drawn while their "firing" flag is on;
  - hit sparks appear where the server reports a hit.

### Kills and score
- Shot down means the single-player rule: pilot killed, a wing or the tail gone, or the engine seized. A shot-down aircraft falls (throttle off, stick back, full rudder), the same in every window.
- A kill goes to the last enemy who hit the victim within 15 s before it was shot down or crashed.
- A crash with no recent enemy hit scores nothing.
- Friendly fire is a host setting, **off** by default.
- A team's score is its kills.

### Respawn
- **Delay:** 10 s after going down.
- **Air start:** you reappear in your team's start area, about 3 km behind your side of the front line:
  - at the host's start height;
  - facing the front;
  - 300 m from your team-mates.
- **"Airfield" start:** you reappear on your team's airfield nearest the front.

### Rooms, lobby and match
- **Room code:** the host presses Create and gets a 6-character code. It uses 32 letters and digits, leaving out the look-alikes I, O, 0 and 1. The others type it to join; capitals, spaces and dashes do not matter.
- **Lobby:** shows each player's name, team, aircraft (only that side's types) and ready status.
- **Host settings:**
  - start height (airfield, 1,000, 2,000 or 3,000 m);
  - time of day (dawn, day, dusk);
  - score limit (3, 5, 10, 20);
  - time limit (5, 10, 15, 20 min);
  - friendly fire;
  - structural damage.
- **Start:** the host's Start works when 2-4 players are connected, all are ready, and each team has at least one pilot.
- **The match:**
  1. A countdown, then the match. A score line at the top shows "ALLIED 2 - 1 CENTRAL, 7:42".
  2. The first team to the score limit wins, or the team with the higher score when time runs out. An equal score is a draw.
  3. The results show the team scores and each player's kills, deaths and accuracy.
  4. Back to the lobby after 20 s, or sooner with the host's Back to the lobby now.
- **No pause in multiplayer:** Esc opens Options / Leave match while your aircraft flies on.

### Disconnects
- **A player drops out:** their aircraft disappears with a notice. Their place and score are kept for 60 s, so reloading the page rejoins. A random token is kept for that browser tab only. Leaving on purpose gives the place up at once.
- **Dead connections:** the page closes its connection when it is left. The server treats 20 s without a message (browsers ping every 2 s) as a drop, for a laptop asleep or lost Wi-Fi.
- **The host leaves:** the match carries on, because the server runs it, not the host. The host role passes to the player who joined earliest.
- **A whole team is gone for 30 s:** the match ends with the results.
- **The server connection is lost:** the screen says so and returns to the main menu. Single-player is unaffected.
- **Empty rooms:** an empty room is forgotten at once.
- **Version check:** browser and server check a protocol version, so an old cached page says "please reload".

### Trees, buildings and the ground on the server
The server builds the same trees and buildings as the browsers (`src/world/solids.js`), from the same world seed. It builds them only for the 1 km tiles near an aircraft flying low. Crashing into them, and bullets stopping in them, are therefore decided by the server too.

### Privacy
- There are no player accounts.
- A display name is held only in the room's memory while the room exists, and nothing is written to storage. The name defaults to your Roll Call pilot's name.
- Cloudflare sees IP addresses to deliver the traffic, as GitHub Pages already does. The server's logging stays off.

## 5. Accounts, costs and settings (the product owner creates them; Claude creates none)

| When | What | Cost | Who |
|---|---|---|---|
| M1-M5, testing on the Mac | Nothing: `wrangler dev` runs the server on the Mac without an account | 0 | - |
| End of M2 (to measure the real limits), and M5 (family test) | **A Cloudflare account** (free plan, your email, no card) at dash.cloudflare.com | 0 | Product owner |
| Same | Log the Mac in once: type `! npx wrangler login` in Claude Code (it opens your browser) | 0 | Product owner |
| Same | Deploy the server and a test copy of the game (`npm run mp:deploy`) to `dawn-patrol-mp.<your-subdomain>.workers.dev` | 0 | Claude, after a yes each time |
| Only if the free limits are reached | Cloudflare Workers Paid | $5 a month | Product owner's decision |
| Start of Stage 2 | Create the local `multiplayer` branch; pushing it to GitHub needs a yes | 0 | Claude, with permission |
| M6 | Merge to main (GitHub Pages redeploys automatically). The server's address is in a committed config file; it is public and not a secret. | 0 | Claude, with permission |
| Optional, later | GitHub repository secrets (a Cloudflare API token) so the server deploys itself on each push | 0 | Product owner's decision; deploying by hand is the default |

No TURN, STUN, signalling service, database or player accounts are needed.

## 6. Code layout (planned)

All multiplayer code goes in new files, each under about 400 lines.

**`src/mp/`: shared by the server and the tests**

| File | What it holds |
|---|---|
| `protocol.js` | Messages, binary snapshots, rounding |
| `roomCore.js` | Lobby, host and settings |
| `matchSim.js` | Authoritative flight, guns, bullets and hits |
| `history.js` | Past positions, for lag compensation |
| `scoring.js` | Kills, respawns and limits |
| `spawn.js` | Start areas |
| `netConfig.js` | Rates, delays and caps. These are network settings, not physics, so they stay out of `src/aircraft/`. |

**`src/net/`: in the browser**

| File | What it holds |
|---|---|
| `serverUrl.js` | Where the server is: `?server=`, the build setting `VITE_MP_SERVER`, or port 8787 of this computer while developing |
| `connection.js` | WebSocket, the test network, the ping |
| `mpClient.js` | Creating and joining rooms, the lobby actions, reconnecting |
| `attachMultiplayer.js` | Adds the multiplayer screens to the game and follows the room |
| `netSim.js` | Delay, jitter and loss, for testing |
| `clock.js` | The tick clock |
| `prediction.js` | Predicting your own aircraft |
| `interpolation.js` | Smoothing the other aircraft |
| `mpSession.js` | The multiplayer version of `src/game/session.js` |

**Other new files:**
- `src/ui/screens/multiplayer.js` (create, join, test network) and `src/ui/screens/lobby.js` (the lobby and the match screen).
- `server/worker.js`, `server/room.js`, `server/wrangler.toml`, `server/package.json`: the Cloudflare Worker, one Durable Object per room, its settings, and its own tools (wrangler), kept apart from the game's.
- `scripts/mpSmoke.mjs` (`npm run mp:smoke`): three scripted players try a running server.

**Reused unchanged:**
- `Simulation`, `GunBank`, the ballistics, `findImpact`, `applyHit` / `destroyedReason`, and the world and solids;
- for drawing: `TargetViews`, `TracerView` and `EffectsView`;
- the cockpits, instruments, HUD, sound and warnings.

**Existing files touched:**
- `src/ui/screens/screens.js`: a Multiplayer button on the main menu;
- `src/game/flow.js`: the new screens;
- `src/main.js`: one hook to a new multiplayer start-up file, which keeps `main.js` under 400 lines;
- `package.json`: wrangler as a development tool, and the scripts `mp:server` and `mp:deploy`.

**Not touched:** `src/physics/`, the physics data in `src/aircraft/`, and `src/ai/`. At the end of every phase, `git diff main -- src/physics src/aircraft src/ai` must show no change.

## 7. Testing

### Automated (Vitest)
| Area | What is checked |
|---|---|
| Messages | Every message survives encoding and decoding, and the rounding errors stay within limits |
| Prediction | A browser and the server given the same controls stay identical. After an injected correction, the replay converges and the drawn position never jumps more than a set amount. |
| Smoothing | With jittery or late snapshots, the drawn path stays continuous and extrapolation stays limited |
| Hit decisions | At 150 ms delay the shooter hits what was on their screen; beyond the 250 ms cap, nothing; friendly fire on and off |
| Scoring | Kill credit; a crash after a hit and without one; the score limit; the time limit; a draw |
| Lobby | Join and leave; only the side's aircraft; ready; the Start rules; host hand-over; a full room |
| Anti-cheat | Out-of-range controls are clamped; extra or future ticks are dropped |
| A whole match | Four simulated players run through the network simulator at 150 ms delay and 2% loss. Scripted test pilots fly them (the AI brain drives *test* players only; multiplayer has no AI aircraft). |
| Single-player | All existing tests unchanged and passing |

### Alone on one Mac
1. Run `npm run dev` and `npm run mp:server`.
2. Open 2-4 separate browser **windows**, not tabs: browsers slow down background tabs. Chrome and Firefox can sit side by side.
3. Create a room in one window and join from the others.
4. **Network simulator:** set per window, either in the multiplayer menu or in the address, for example `?netsim=150,20,2` (delay in ms, jitter in ms, loss in %). It models TCP's behaviour: a lost packet arrives late rather than never.

### With family on different home networks
1. After the Cloudflare test deployment, everyone opens the test address (later the live site) and joins your room code.
2. F3 shows each player's ping, jitter and corrections per second. If something feels wrong, read these numbers out.

## 8. Decisions (the product owner accepted the proposed defaults on 14 Oct 2026)
1. Approach (b) on Cloudflare: **approved**. The product owner creates the free Cloudflare account around the end of M2.
2. Friendly fire: off by default; the host can switch it on.
3. Respawn: after 10 s, in the air, about 3 km behind your side of the front.
4. Multiplayer kills do **not** count towards Roll Call ranks, which keeps single-player records exactly as now.
5. Auto-rudder and the warnings are allowed for each player. The assist only moves the rudder, as a pilot could.
6. Still open: where family and friends live (the same country, another continent). This only sets expectations for delay; the server room goes near the first player automatically.

## 9. Sources checked (October 2026)
- Cloudflare Durable Objects pricing (free plan limits, WebSocket messages billed 20:1): https://developers.cloudflare.com/durable-objects/platform/pricing/
- Cloudflare Durable Objects limits (CPU time per request and message): https://developers.cloudflare.com/durable-objects/platform/limits/
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Realtime / TURN pricing (1,000 GB a month free, then $0.05/GB): https://developers.cloudflare.com/realtime/pricing/
- Render free instances (15-minute sleep, about 1-minute wake-up, 750 hours): https://render.com/docs/free
- Fly.io pricing (shared-cpu-1x 256 MB about $1.94 a month) and discontinued free plans: https://fly.io/docs/about/pricing/ and https://fly.io/docs/about/discontinued-plans/
- Metered Open Relay (free TURN quota): https://www.metered.ca/tools/openrelay/
