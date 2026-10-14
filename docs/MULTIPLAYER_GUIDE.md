# Dawn Patrol together: a guide for family and friends

Two to four people fly against each other over the Western Front: Allied (Sopwith Camel, SPAD
XIII) against Central (Fokker Dr.I, Albatros D.V). Each person plays on their own computer, at
home, in a web browser. Nothing to install and no account: you need only the game's address and
a six-letter room code.

## What you need
- A computer (Mac or Windows) with **Chrome** or **Firefox**, and an internet connection. Home
  broadband or a phone hotspot both work.
- A keyboard and mouse, or a joystick (a Logitech Extreme 3D Pro works out of the box). The game's
  **Options > Controls** changes the keys.
- The game's address. The test copy is https://dawn-patrol-mp.dawn-patrol-mp-server.workers.dev/;
  once multiplayer is published, it is https://mdayv261.github.io/WW1-DawnPatrol/.

## Playing
1. Open the game's address and click **Multiplayer** on the main menu.
2. **One person creates the room:** type your name, press **Create a room**, and send the six-letter
   code to the others (by text message, email, or phone). Letters and numbers only, never I, O,
   0 or 1.
3. **Everyone else joins:** type your name and the code, and press **Join**.
4. **In the room:** choose your team and aircraft, and press **I am ready**. The person who created
   the room (the host) chooses:
   - where you start (on an airfield, or in the air at 1,000, 2,000 or 3,000 m);
   - dawn, day or dusk;
   - the score to win and the time limit;
   - friendly fire, and whether the wings can break.

   The host then presses **Start the match**.
5. **In the air:**
   - The score and the time left are at the top left. Press **U** for the modern HUD, which shows
     the other aircraft with names and distances. **C** changes the camera (chase, free look,
     cockpit).
   - **Space** (or the joystick trigger) fires. Aim with the gun sight: the guns point a little up.
     **B** clears a jammed gun.
   - **Esc** opens the match menu. The match does *not* pause: your aircraft flies on.
   - If you are shot down or crash, you are back in the air 10 seconds later.
6. **The end:** the first team to the score wins, or the higher score when time is up. Everyone
   sees the results, then goes back to the room for another match.

## Good to know
- **Keep the game window visible.** A minimised or hidden window stops sending your controls, and
  after a second your aircraft flies straight on by itself.
- **Reloading the page** puts you back into your room, in your place, for a minute or so.
- **"Please reload"** means your page is older than the server: reload it.
- **"Lost the connection to the room"**: the game tried three times to reconnect and could not.
  Check your internet, then join again with the same code.
- **Your own aircraft always responds instantly.** Others are shown about a tenth of a second
  behind, so they move smoothly. When you fire at what you see, the game gives you the hit,
  allowing up to 0.4 s for your connection's delay.

## Testing with family on different home networks
This checks the real thing: different houses, different internet.

1. **Agree a time.** One person (the organiser) creates a room and sends the code to everyone.
2. **Each person opens the address in Chrome or Firefox**, clicks Multiplayer, joins with the code,
   picks a team, and presses I am ready. The organiser starts the match.
3. **Fly together for 5-10 minutes:** fly toward each other, have a fight, get shot down, and come
   back.
4. **Everyone presses F3** during the match and reads the three "net" lines at the bottom left:
   - `ping`: how long a message takes to the server and back. Under 150 ms is what the game is
     built for; most homes are 20-80 ms.
   - `corrections`: how often your own aircraft was nudged to match the server, and the size of the
     last nudge. Many small ones (centimetres) are normal; a nudge of metres is worth reporting.
   - `down` / `up`: the data used, about 10-15 KB/s down and 1-2 KB/s up.
5. **Report back to the organiser:**
   - your ping, the largest correction you saw, and your kind of internet (broadband, Wi-Fi far
     from the router, a phone hotspot);
   - whether the other aircraft moved smoothly or jumped;
   - whether your hits counted when your sight was on the target;
   - anything that went wrong, with what you were doing at the time.
6. **If someone cannot join at all:** check they typed the code correctly, and that they are on the
   same address as everyone else. Very strict work or school networks can block the game's
   connection; a home network or a phone hotspot should work.
