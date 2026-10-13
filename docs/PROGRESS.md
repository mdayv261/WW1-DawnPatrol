# Progress

Read this at the start of every session.

## Current status: Phases 0-7 are signed off. Added after Phase 7 at the product owner's request: the **Pilot Roll Call** (named pilots who rise in rank with victories), approved by the product owner and committed. The next phase needs the product owner's brief and a plan in plan mode first.

## Pilot Roll Call (D63)

**Brief (product owner):** a Pilot Roll Call screen where a player enters a pilot's name and gets the lowest rank, rising in rank with enemy kills; adding named pilots is a requirement. Decided by the product owner: a pilot serves one side (chosen when enlisting) and flies only its aircraft; rank follows victories; drone kills do not count; the earlier unnamed record is kept as a pilot to name.

**Done:**
- **Main menu:** a **Pilot Roll Call** button and a line saying who is flying ("Flying as Lieutenant Albert Ball (RFC/RAF), 4 victories in 9 missions"). **Fly a mission** with no pilot opens the Roll Call first.
- **Roll Call:** every pilot with rank, side, victories (drones apart; "Ace" from five), missions (and losses) and score; the pilot flying is highlighted. **Fly as**, **Rename** and **Retire** (asked on the page: "Retire Albert Ball? The record will be removed. Yes, retire / No"). **Enlist a new pilot**: a name and a side; the new pilot starts at the lowest rank and flies next. Names: 1 to 24 letters, numbers, spaces and ' - .; no two the same (ignoring capitals); the screen says why a name is refused. Up to 20 pilots.
- **Ranks by victories:** 0 Second Lieutenant / Leutnant, 3 Lieutenant / Oberleutnant, 8 Captain / Hauptmann, 15 Major / Rittmeister. Drone kills are counted apart and do not promote. Mission points are kept as the pilot's **score**. Practice mode records nothing, as before.
- **Mission orders** offer only the pilot's side's aircraft. **Results** show the pilot, rank, victories and score, and a promotion or "now an Ace".
- **Your earlier record** (6 German missions) is waiting on the Roll Call as "(your earlier German record: give it a name)".
- While a name is being typed, the game's keys (M, C, P...) do nothing.

Checked in Chrome (settings backed up and restored): the old record asked for a name and was named by typing "Max Immelmann" (M and other keys did not mute, invert or change the camera); a duplicate name ("max immelmann") was refused; enlisting "Albert Ball" made that pilot the one flying; the menu line, the Allied-only aircraft list, a mission to the results screen (pilot, rank, victories, score; nothing recorded because practice mode was on), and retiring with the on-page question all worked; no console errors. 1,136 tests pass (plus 15 known deviations); `npm run build` works.

**Please test (about 10 minutes):**
1. Main menu > **Pilot Roll Call**: click **Name** next to your earlier German record, type a name, press Enter.
2. **Enlist** an Allied pilot. Try a name already used: it is refused.
3. **Back**: the menu says who is flying. **Fly a mission**: only the Camel and SPAD are offered. Fly (practice mode off) and shoot something down: the results show your pilot and record.
4. Back on the Roll Call, **Fly as** the German pilot: now only the Dr.I and Albatros are offered.
5. **Rename** one pilot, **Retire** one (answer No first, then Yes). Reload the page: everything is remembered.

**Decided by the product owner:** the rank steps (3, 8, 15 victories) are accepted.

**Known issues:** none yet.

## Phase 7 checkpoint 2: assists and warnings (D62)

**Done:** four new rows on the **Options** screen (from the main menu or the pause menu). The assists start off; structural damage starts on.
- **Auto-rudder:** works the rudder for you to keep the slip ball centred: in turns, against the rotaries' torque, and on the take-off run (it checks the swing from the moment you roll). Your own rudder (keys or the twist) takes over at once while you use it; let go and it carries on. It only moves the rudder; the aircraft still flies by the same flight model, and in the cockpit you can see the rudder bar move.
- **Stall warning:** a red **STALL** box and a pulsing horn about 2 degrees before the wing stalls (also when pushed into a negative stall). Not on the ground or when slower than 15 m/s.
- **G and overspeed warning:** amber **HIGH G** from 85% of the load where the wings start to be damaged, and red **OVER G: AIRFRAME DAMAGE** with a fast buzzer beyond it; the same for speed (**HIGH SPEED** from 95% of the never-exceed speed, red **OVERSPEED** past it). Each aircraft's own documented limits (the Camel's wings are damaged above 3.3 g, for example).
- **Structural damage:** On (as before) or Off: with it off, too much g or speed no longer damages or breaks the wings, and the warning then just says **OVER G** / **OVERSPEED**. Bullets still damage everything.
- The warnings show at the top centre in every view (cockpit, chase, free), whether or not the modern HUD is on.

Measured (tests): in a 30-degree turn auto-rudder cuts the sideslip from about 0.2-3 degrees to 0.02-0.25 degrees in all four aircraft, both ways, and it stays steady from 30 m/s to the never-exceed speed. On a hands-off take-off at full throttle every aircraft ground-loops without it; with it all four take off with the nose within 6-15 degrees of the runway heading. A 9 g pull breaks a wing with structural damage on and leaves the wings untouched with it off. Checked in Chrome: the options are saved; a stall showed STALL and set the 700 Hz horn; a hard pull at speed showed HIGH G then OVER G: AIRFRAME DAMAGE with wing damage, and with damage off just OVER G and no damage; the box sits below the HUD's heading tape; no console errors. 1,124 tests pass (plus 15 known deviations); `npm run build` works.

**Please test (about 15 minutes, with sound on):**
1. **Options:** switch on Auto-rudder, Stall warning and G and overspeed warning.
2. **Stall:** throttle closed, keep pulling back as the speed falls: STALL and the horn come on before the stall.
3. **G:** dive to build speed and pull hard: amber HIGH G, then red OVER G: AIRFRAME DAMAGE and the buzzer (and the wings start to suffer, F3 shows it). Dive steeply at full throttle for OVERSPEED.
4. **Auto-rudder:** fly turns without touching the rudder and watch the slip ball (it stays in the middle; with auto-rudder off it slides). Take off in the Camel or Dr.I at full throttle without the rudder: it runs straight. Press a rudder key: you have the rudder.
5. **Structural damage off:** pull as hard as you like at speed: the warning says OVER G but nothing breaks.

**After the product owner's first test:** the warnings and the stall horn are approved. **Auto-rudder set up yaw oscillations in hard manoeuvring:** it chased the sideslip after it had built up, a little late each time. It now works mainly as a yaw damper (calming the nose's swing), leads the roll with a little rudder as a pilot does, uses at most 70% of the rudder, and lets go in a stall. In hard reversing turns it now gives slightly fewer slip swings than flying without it (70 against 78 across all four aircraft; the first version gave 133), and steady turns stay balanced (within 0.14 degrees). Covered by a new test. 1,126 tests pass.

**Engine overspeed warning (asked for):** not built yet. In the flight model the engine's rpm is set by the throttle alone, so it cannot over-rev in a dive. A warning would need the propeller to drive the engine faster in a dive (a flight model change) and documented maximum rpm for each engine. **Product owner's decision: left out for now, to be added later** (it needs a plan first: propeller-driven engine speed in dives, plus documented rpm limits).

**Decisions for you:** the horn and buzzer are synthesised tones and a matter of taste (louder, quieter, higher, lower). Flying with structural damage off still earns normal career points (only practice mode changes points); say if you want that otherwise.

**Known issues:** none yet.

## Phase 7 checkpoint 1: the Controls screen (D61)

**Brief (product owner):** a settings screen for rebinding both keyboard and joystick controls; options for auto-rudder, stall warning and a G warning / airframe structural damage (checkpoint 2).

**Done:** **Options > Controls (keyboard and joystick)** opens a new screen with two tabs.
- **Keyboard:** every flying key in four groups (Flying, Guns, View, Game), two keys each. Click a key, press the new one (Esc cancels); **x** clears it; **Reset keyboard to the defaults**. A key does one thing only: giving it to a new action takes it from the old one, and the line at the top says so ("E was rudder right: now unassigned there"). Esc, Tab and the F keys cannot be used. The defaults are exactly the keys the game had.
- **Joystick:** the four axes with a live bar, **Learn** and **Flip**; the hat with **Learn**; sliders for the stick and twist dead zones and the curve; and every command with its button: **Set**, then press the button; **x** takes it off. Any keyboard command can now go on a button (new ones: look around, modern HUD, sound on/off, practice mode, invert pitch, graphics quality, show the keys; unassigned until you set them). A light shows each button while pressed. **Reset joystick to the defaults**.
- Everything is saved at once and works straight away in flight. The **H** help, and messages such as "Gun jammed: press B", show your own keys and buttons. F2 still shows the live joystick test panel.
- Fixed keys: Esc (pause and menus), F2 / F3 / F4, and the development quick starts.

Checked in Chrome: rebinding rudder left to E (taken from rudder right) worked on screen, was remembered after a reload, E then gave left rudder and Q nothing, the arrows still flew, and the help showed "E / -" for the rudder; no console errors. (A bug found here, where a key lookup broke all flying keys after the change, was fixed and is now covered by a test of the real keyboard handler.) The joystick tab could not be tried with a stick in the automated browser: please try it. 1,112 tests pass (plus 15 known deviations); `npm run build` works.

**Please test (about 10 minutes):**
1. Main menu > **Options > Controls (keyboard and joystick)**. On **Keyboard**, click the key next to "Fire (hold)", press **F**. Fly a mission: F fires, Space does not. Press **H**: the help shows F.
2. Give an action a key already in use (for example rudder left to **E**) and read the message; check rudder right is now empty.
3. Reload the page: your keys are still there. Then **Reset keyboard to the defaults**.
4. **Joystick** tab (stick plugged in, press the trigger once): move the stick and twist and watch the bars; press buttons and watch the lights. **Set** "Sound on / off", press a spare button (10, 11 or 12), fly and press it: the sound toggles. Try **Learn** and **Flip** on an axis, and the sliders.
5. **Reset joystick to the defaults** at the end if you want your old set-up back.

**Known issues:** none yet.

Phases 0, 1 and 2 are signed off. Phase 3 is built in four commits: aircraft models (48df111), terrain (c3b90ec), airfields and detail (dee316a), and checkpoint 3 (quality levels, pixel budget, frame-rate readout, cirrus). Phase 4 must not start until the product owner confirms Phase 3.

## Phase 6 checkpoint 3: sound (D60)

**Done:** the game now has sound, all made in code through the Web Audio API (no sound files):
- **Your engine:** its pitch is the firing rate of its cylinders (it follows engine speed), louder and brighter with the throttle open. The Camel and Dr.I rotaries sound rough and uneven; the SPAD's V8 and the Albatros's six are smoother and deeper. A stopped engine leaves only the windmilling propeller.
- **Wind:** rises with airspeed, and the bracing wires hum when you are fast.
- **Guns:** a crack and thump for every round actually fired (Vickers and Spandau slightly different), much louder than the engine (peaking at four times it, and saturated like recorded gunfire so each shot is dense and punchy); pitch raised after the louder version sounded too deep (doubling it again was tried and sounded like pop guns, so it was put back).
- **Enemies:** their engines from left or right, quieter and duller with distance, rising in pitch as they come at you and dropping as they pass; their gunfire arrives late at the speed of sound.
- **Being shot at:** a sharp crack when a bullet passes close, a thud when you are hit, a crunch when you crash.
- **Controls:** Options volume; **M** mutes and unmutes; sound fades out when paused and in the menus.
- **Also:** the modern HUD (**U**) now shows the **elevator trim**: a short scale under the height, its marker up for nose-up trim and down for nose-down, with "TRIM 25% UP", "TRIM NEUTRAL" or "TRIM 40% DOWN".

Checked in Chrome: the engine pitch matched the firing rate exactly (Camel 93.8 per second at full throttle, 51.6 at idle; SPAD 110.2 at 1,240 propeller rpm), loudness and brightness followed the throttle, 18 rounds fired made 18 gunshot sounds, and the volume faded to silence when paused and muted. 1,087 tests pass (plus 15 known deviations); `npm run build` works. The flight model and AI are unchanged.

**Please listen (about 10 minutes; headphones help):**
1. Run `npm run dev`, open http://localhost:5173 and click once (browsers start sound only after a click or key press). Fly a mission in the Camel: move the throttle from closed to open and listen to the engine; dive and climb and listen to the wind.
2. Fire (Space): each round cracks. Fly the Dr.I, SPAD and Albatros and compare the engines (rotary rough, inline smooth) and the two guns.
3. Fight one enemy: hear its engine come and go as it passes, its guns from a distance, the crack of its bullets passing close, and the thud of hits.
4. Pause (Esc or P): the sound fades. Press **M** in flight to mute and unmute. Try the Options volume slider.
5. Press **U** for the modern HUD and trim with **Page Up / Page Down** (or T/G; on a Mac, fn+Up / fn+Down): the trim marker and words follow.

**Decisions for you:** sound made purely in code is a matter of taste: tell me which sounds to change (louder, quieter, deeper, rougher, smoother) and I will tune them.

**Known issues:** I cannot hear, so the sound quality has only been checked by measurement; expect a round of tuning. Trim moved from Home/End to **Page Up / Page Down** at the product owner's request (End had not worked on their Mac). On a Mac these are fn+Up / fn+Down; an arrow with Fn held is also read as Page Up / Page Down. The F3 screen shows the last key the game received, to find out what a keyboard sends if a key does not work.

## Phase 6 checkpoint 2: 3D cockpits, period instruments and the modern HUD (D59)

**Done:** every aircraft has a detailed 3D cockpit built in code (no image files): a narrow padded brown leather rim arching over the panel, inside walls and frames, decking, detailed gun breeches, the aircraft's own sights, a windscreen where fitted, a moving stick and throttle, and 3D instruments with live needles. Wood, leather, linen and metal textures are made in code; metal and glass reflect the sky; on Medium and High quality the sun casts shadows in the cockpit. Each cockpit was adjusted with the product owner:
- **Camel:** the Smithsonian layout; guns on top of the nose (their height corrected), small windscreen, ring-and-bead sight.
- **SPAD:** RPM / KM/HR / Hatot-style altimeter lettering; small windscreen above the guns; in the cockpit view its upper wing is drawn shorter so it looks like the Camel's.
- **Dr.I:** the replica-photo layout with old-style German instruments (fuel, altimeter 0-4.5 km, airspeed, rev counter; compass above, new slip indicator below), guns on posts with a ring sight and a padded leather cushion block on each; cockpit 10% wider.
- **Albatros:** the same panel as the Dr.I's.
- Wider noses on the Camel, Dr.I and Albatros; a light bounced up from the fields so wing undersides show their colours (cream Camel, red Dr.I).
- The **modern HUD** (U, or Options; off by default).

Fixed on the way: the slip ball moved the wrong way (a Phase 2 sign error) and its tube was drawn upside down; two-hand altimeter figures did not line up with the hands; the Camel's and Dr.I's guns were drawn inside their cowlings. 1,070 tests pass (plus 15 known deviations); `npm run build` works. The flight model and AI are unchanged; bullets now start from the corrected gun positions.

**Please test (about 10 minutes):**
1. Run `npm run dev`, open http://localhost:5173 and fly a mission in each aircraft. Press **C** for the cockpit view. Look ahead, down at the panel and round the cockpit (right mouse button, V, or the joystick hat).
2. Move the stick and throttle: the stick and lever in the cockpit follow; the rev counter follows the throttle.
3. In the Dr.I or Albatros press **Q** / **E** (rudder): the slip ball rolls the other way from the rudder. Climb and watch the altimeter (the short hand points at 1 at 1,000 m).
4. Try dawn and dusk, and the Low / Medium / High quality settings (cockpit shadows on Medium and High).
5. Press **U** for the modern HUD; turn until an enemy is off screen and an arrow points to it. U again hides it; Options shows the same setting.

**Known issues:** the Camel's oil pulsator glass tucks 5 mm under its rim (signed off as it is). The Albatros and Dr.I panels are the product owner's choice rather than the period evidence (kept in AIRCRAFT_DATA). The volume setting does nothing until checkpoint 3 (sound).

## Phase 6 checkpoint 1: menus, missions and results (D57)

**Done:** the game now opens on a main menu. **Fly a mission** opens the mission orders: your aircraft, enemy aircraft (a type or mixed), number of enemies (0 to 4), skill (Drone, Novice, Regular, Ace), start (airfield or 1,000 / 2,000 / 3,000 m) and time of day (dawn, day, dusk). A mission ends with victory, the enemy withdrawing, being shot down or crashing, landing at one of your own airfields, or End mission from the pause menu (Esc or P), and the results screen shows what happened. From there: Fly again, Change mission or Main menu, all without reloading the page. 987 tests pass (plus 15 known deviations), including the acceptance test in code (two missions in a row, nothing left over); `npm run build` works. The flight model and AI are unchanged.

**Please test (about 10 minutes):**
1. Run `npm run dev` and open http://localhost:5173. The main menu shows over your aircraft on the airfield. Click **Fly a mission**.
2. Choose a Camel, 1 Novice, start at 1,000 m, **Dusk**, and **Take off**. Fight; when the enemy goes down, the results appear a few seconds later. Click **Main menu**.
3. Fly again with a different aircraft, start **on the airfield**, **Dawn**: the enemies are over the front (east for the Allies, F3 shows them), so take off and find them, or fly a circuit and **land back on your airfield**: stop on it and the results say "Safe return".
4. In a mission press **Esc** or **P**: try Resume, Options (volume, graphics, HUD, practice), Restart mission and End mission. Quit to main menu.
5. Get shot down (try an Ace) or fly into the ground: the results say so, and the points go down.
6. Look at the points, rank and victories on the results screen and on the main menu; fly a few missions to be promoted.

**Decided:** cream screens OK; with an airfield start the enemy stays about 4 km away over the front; the results now give **points and a period rank** (D58): points for each enemy shot down (by skill), accuracy and coming home, minus for being shot down or crashing; ranks from Second Lieutenant to Major (Allied) or Leutnant to Rittmeister (German), and Ace at five victories. Practice missions earn nothing. The main menu shows your rank and record for each side.

**Known issues:** sound comes in checkpoint 3. With mouse flying on, the first Esc releases the mouse and pauses.

## Phase 5 checkpoint 3 and acceptance test (D56)

**Done:** the climbing turn, Immelmann, split-S and boom-and-zoom, chosen by height and speed against the enemy's and by what each skill knows; Regular and Ace pilots lead a turning target. 943 tests pass (plus 15 known deviations); `npm run build` works; the flight model is unchanged. In Chrome, four Ace enemies fought with no errors (up to about 250 draw calls).

**Phase 5 acceptance test:**
1. **No cheating** (tests): AI aircraft fly the player's aircraft data with the same flight model and controls, inside the aircraft's speed and load limits; reaction time and aim error are measured (`aiSteering`, `aiBehaviour`, `aiFight`, `aiAiming` tests).
2. **Behaviours and manoeuvres:** press **F3** in a fight: each enemy's line names its state (patrol, engage, attack, evade, disengage) and manoeuvre (turning fight, climbing turn, Immelmann, split-S, boom-and-zoom, defensive break, break away). Tests exercise each one.
3. **Skill:** fly against a Novice, a Regular and an Ace (`?skill=novice&enemies=1`, then `regular`, `ace`, press **Shift+1**). The Ace should notice you on its tail almost at once, shoot straighter in shorter bursts, dive on you from above, and break off earlier when hurt; the Novice is slow, sprays, and knows few tricks. Against drones the Ace shoots down far more (16 of 18 against 1 of 18 for a Novice, in a test series).
4. **A fair fight:** you can be shot down (and are told who did it), and you can shoot them down; **Y** practice mode stops their fire hurting you.
5. **Frame rate** with four enemies (`?enemies=4`): read F3.

**Known issue (accepted):** two AI pilots fighting each other mostly circle without a result; left for a later polish phase.

## Phase 5 checkpoint 2: AI pilots that fight (D55)

**Done:** enemies now engage, attack with a lead solution and the skill's aim error, fire in bursts, evade an enemy on their tail with a defensive break, break away to avoid collisions, and disengage when out of ammunition, short of fuel or badly damaged. Their fire damages you (Phase 4 damage model) unless practice mode (**Y**) is on. New enemies are Regular by default. 916 tests pass (plus 15 known deviations); `npm run build` works; the flight model is unchanged.

**Please test (about 10 minutes):**
1. Open http://localhost:5173/?skill=novice&enemies=1 and press **Shift+1**. Press **F3**: the enemy's line shows its state (patrol, engage, attack, evade, disengage), its manoeuvre, the range to you and FIRING. Let it come at you: it should get behind you and shoot. "You are hit!" appears and the status line shows the damage.
2. Press **Y** (practice mode) and try again: the hits are counted (F3, "hits on you") but do no damage.
3. Get on its tail: after a moment it notices and breaks hard (F3: evade / defensive break). Shoot it: when badly hurt it breaks off and runs east (disengage).
4. Try **Regular** and **Ace** (`[` and `]`, then **N**): an Ace notices you behind it almost at once, shoots straighter in shorter bursts, and breaks off earlier when hurt.
5. Try four enemies (`?enemies=4`) and read F3 for the frame rate.

**Decisions for you:** (a) is a Novice too easy and an Ace too hard? Every number is a first guess (reaction, aim, cone, range, awareness, nerve). (b) Two equal AI pilots fighting each other often go round and round for minutes; checkpoint 3 adds the manoeuvres chosen by height and speed (Immelmann, split-S, climbing turn, boom-and-zoom), which should help. OK to leave that to checkpoint 3?

**Known issues:** aircraft do not collide with each other (the AI breaks away anyway). The Albatros AI is less effective behind slow targets. A shot-down enemy may take a minute to reach the ground.

## Phase 5 checkpoint 1: AI pilots that can fly (D54)

**Done:** AI pilots (`src/ai/`) fly the same aircraft with the same flight model and controls as you: they look at the others with a reaction delay and a sight range (Novice 0.6 s and 2 km, Regular 0.35 s and 3 km, Ace 0.15 s and 4 km), and fly a patrol circuit of 1,500 m radius round where you were when they appeared, at a height and speed that depend on skill. The pilot's hands turn, climb, hold speed and recover from dives and inverted flight, and never stall, over-speed or hit the ground (tests on all four aircraft). The old scripted targets are now the **Drone** skill. They do **not fight yet** (checkpoint 2). 880 tests pass (plus 15 known deviations); `npm run build` works; the flight model is unchanged.

**Please test (about 5 minutes):**
1. Run `npm run dev` and open http://localhost:5173/?skill=regular&enemies=2 then press **Shift+1** (air start). Two enemy aircraft appear on circuits about 1.5 km ahead, above you. Press **F3**: each enemy shows its skill, "patrol", whether it can see you and how far, its speed and height.
2. Press **]** and **[** to change the skill of *new* enemies (Drone, Novice, Regular, Ace) and **N** to add one (up to 4). Compare heights and speeds: Novice 1,200 m and slower, Ace 1,800 m and faster.
3. Watch them for a few minutes (or fly near): they go round smoothly, do not stall, dive into the ground or break up, in all four enemy types (try Shift+2, 3, 4).
4. Shoot at one (Space): it does not yet dodge or shoot back. Drones (the old targets) behave exactly as in Phase 4. **Y** toggles practice mode (a message appears; it matters from checkpoint 2).
5. With 4 enemies up read F3 (frames, calls, triangles): each enemy model adds about 50 draw calls.

**Decisions for you:** (a) the default skill is Drone until the AI fights; checkpoint 2 will make Regular the default. OK? (b) the skill numbers are first guesses (reaction time, sight range, height, speed); you can only judge them by flying, so tell me which feel too easy or hard once they fight.

**Known issues:** the AI does not fight yet. A patrol circuit stays where you were at spawn; if you fly more than 6 km away the enemies are removed.

## Phase 4 checkpoint 3 and acceptance test (D53)

**Done:** the status line now shows both belts, the fuel left and a warning for each kind of damage to your own aircraft; the help screen lists the new keys; an end-to-end test has a scripted pilot shoot down a target in each of the four aircraft. Nothing else was changed (as you asked). 778 tests pass (plus 15 known deviations); `npm run build` works.

**Phase 4 acceptance test (the two things in the brief):**
1. **Bullet drop and travel time.** Tests confirm it (`tests/ballistics.test.js`): for the .303, about 0.30 s and 0.41 m of drop over 200 m, 0.64 s and 1.83 m over 400 m, arriving at about 530 m/s. In the game: press **Shift+1**, line up a target, and fire from over 400 m: the tracers visibly drop.
2. **A damaged wing causes a measurable roll.** Tests confirm it (`tests/damageFlight.test.js`). In the game: **Shift+1**, **F4**, click **Right wing 50%** and hold left stick to stay level.

**Everything in Phase 4 to try (all keys):** **Space** fire, **B** clear a jam (joystick: trigger fires, button 9 clears), **N** new target (up to three), **F4** damage buttons for your own aircraft, **F3** numbers (guns, hits, targets, damage, fuel, worst g). The checkpoint 1 and 2 test lists above still apply.

**Signed off by the product owner; Phase 5 (AI opponents) started.**

**Known issues (unchanged):** no fire; fuel does not change the mass; enemy aircraft do not shoot back; gun convergence is not modelled; a shot-down target with a failed wing takes a minute or more to reach the ground; each target model adds about 50 draw calls (check F3 with three targets up).

## Phase 4 checkpoint 2: component damage (D52)

**Done:** hits now hurt the part they land on (each wing, engine, fuel tank, pilot, tailplane, fin, control cables), and damage changes the flight model. Bullets go through fabric to the engine, tank or pilot. Fuel burns and leaks. Overloading or over-speeding the airframe damages the wings and breaks one off at the ultimate load. 769 tests pass (plus 15 known deviations); `npm run build` works. An undamaged aircraft flies exactly as before (a test checks the forces for all four aircraft).

**Acceptance for this part:** a damaged wing causes a measurable roll (`tests/damageFlight.test.js`): in every aircraft a half-damaged right wing gives 10+ degrees a second of roll and 15+ degrees of bank in 2 s hands-off, the left wing mirrors it, it grows with the damage, and holding it level takes opposite stick.

**Please test (about 10 minutes):**
1. **Your own damage:** press **Shift+1**, then **F4** (test panel) and **F3**. Click **Right wing 50%**: the aircraft should roll right and you must hold left stick to stay level. Click again: the wing fails ("Right wing failed", the wing disappears, violent roll). **Repair all** puts it right. Try **Left wing 50%**.
2. **Engine:** **Engine 50%** (weaker, smoking), **Engine seized** (no power, a lot of drag, no smoke needed). **Fuel leak**: white spray, and the engine quits after about 45 s ("Out of fuel"); the propeller windmills.
3. **Controls:** **Cut aileron cable** (roll stick does nothing; the aileron on the model stays still), **Cut elevator cable**, **Cut rudder cable**, **Tailplane 50%** (weaker pitch), **Fin 50%**. **Pilot wounded** (slower, weaker controls); **Pilot killed** (controls stay put, the banner says PILOT KILLED).
4. **Shooting:** shoot a target from astern: it should fall in a second or so with the pilot killed. Shoot at a target from the side along its wings: they take damage, it rolls, an engine hit makes smoke. Messages say why it went down: "SHOT DOWN: Fokker Dr.I (Pilot killed / Wing failed / Engine seized)". F3 does not show the target's damage.
5. **Structure:** at top speed pull the stick hard back: the g-load in F3 climbs past the limit (about 3.3 g for the Camel) and you get wing damage, then "wing failed" near 6 g. In a steep dive past about 70 m/s the wings begin to fail too. Ordinary turns do nothing. F3 shows the worst g you pulled and the limit.

**Decisions for you:**
(a) **Is the structural limit welcome?** It will break wings if you yank the stick at speed (that is what the spec asks for). I can make it an optional assist or soften it (a higher limit, slower damage).
(b) **Pilot kills in about half a second from astern** (3 hits). Make it harder (more hits) or leave it?
(c) **Fuel and strength figures are estimates** (no sources found): fine for now?

**Known issues:** no fire (a holed tank only leaks). Fuel burning does not change the aircraft's mass. A shot-down target with a failed wing takes a minute or more to reach the ground. Wing damage does not change how the model *looks* until it fails (only smoke, spray and the broken wing are drawn). The player cannot be shot at yet (no AI): use the F4 buttons.

## Phase 4 checkpoint 1: guns, bullets and target aircraft (D48-D51)

**Done:** two synchronised machine guns on each aircraft (twin Vickers on the Camel and SPAD, twin LMG 08/15 on the Dr.I and Albatros), with the real ammunition counts, rate of fire and stoppages. Bullets fly with gravity and air drag, and the guns only fire between the propeller blades. Enemy target aircraft (up to three) fly simple paths, take hits by zone, and fall when shot down. Trees, buildings and the ground stop bullets. A gun sight mark shows where a bullet lands at 200 m. 675 tests pass (plus 15 known deviations); `npm run build` works. The flight model is unchanged.

**Acceptance for this part:** tests confirm bullet drop and travel time (`tests/ballistics.test.js`): for the .303 about 0.41 m drop and 0.30 s over 200 m, 1.83 m and 0.64 s over 400 m, more than in a vacuum and varying with air density and the aircraft's own speed.

**Please test (about 5 minutes):**
1. Run `npm run dev`, open http://localhost:5173, press **Shift+1** (Camel, air start at 1,000 m). Two target aircraft are ahead (about 450 m). Press **F3** for numbers.
2. Open the throttle (Insert or W) to catch the targets (they fly slowly). Put the **ring (sight mark)** on a target and hold **Space** (or the joystick trigger). You should see yellow tracers, sparks where they hit, and the status line at the bottom (GUNS 250 | 250, TARGETS, DOWN).
3. Keep firing at one target: it should be shot down after about a second of hits ("SHOT DOWN" message) and fall.
4. Fire at a distance (over 400 m): the bullets visibly drop, and you must aim a little high.
5. Keep firing until the guns jam ("Gun jammed" message, status shows JAMMED). Press **B** (joystick button 9): "CLEARING" for about 3 s, then it fires again (sometimes it fails; press B again). Fire until the belts are empty (EMPTY).
6. Press **N** for more targets (maximum three). Try the other aircraft (Shift+2, 3, 4): the German ones fire the 7.92 mm gun, and the targets are Allied.
7. Look at F3 frames, calls and triangles with three targets up: each target adds about 50 draw calls.

**Decisions for you:** (a) is the sight mark welcome (I added it; it can be removed or limited to the cockpit)? (b) is about one second of hits too quick to shoot a target down (checkpoint 2 will replace this with real damage anyway)? (c) the three targets slow the screen a little on my measurements (draw calls 146 to 308): if F3 shows a drop below about 60 fps, I will cut that.

**Known issues:** the real aircraft's gun convergence is not modelled (guns point along the nose). Targets do not shoot back or dogfight (next phase). Fuel, structural limits and damage come in checkpoint 2. A hands-off Camel at full throttle turns left on its own (rotary torque, as before), so you need to fly it while chasing.

## Phase 3 follow-up: crashes on trees and buildings, flat horizon (D47)

**Done:** the aircraft now crashes when any part of it touches a tree or a building (banner says what: "CRASHED: Hit a tree", "Hit a house", "Hit a hangar", ...). The far fallback ground is a flat colour instead of a fine checker pattern (the likely cause of the remaining shimmer). 556 tests pass (plus 15 known deviations); `npm run build` works; physics unchanged. In Chrome I flew the real game into a tree, house, farmhouse, hangar, control tower and windmill (each crashed with the right name) and across open fields (no crash).

**Please test (about 5 minutes):**
1. **Flicker:** press **1**, climb to 1,500 m and bank hard left and right over the countryside; watch the far horizon and the ground for shimmer.
2. **Trees:** fly low into a wood (e.g. about 600 m north-east of the start, or any dark green block): it should say "CRASHED: Hit a tree - press R". Press **R**.
3. **Houses:** a village is about 1 km north-east of the start: skim the rooftops (clear), then fly into a wall (crash).
4. **Airfield:** take off and land on the start field (heading north is clear; the hangars are behind the south end, so a low approach from the south can hit them). Landing and taxiing must not crash.
5. Check **F3**: frames, calls and triangles should be about what you saw before.

**Decided by the product owner:** leave the hangars where they are; crash strictness stays as is; Phase 3 signed off after the 5-minute flight test.

**Decisions that were asked:** (a) move the start field's hangars off the centre line so a landing from the south is not blocked? (b) is the crash too strict (touching a treetop with a wheel ends the flight)? A tolerance is a small change. (c) once these pass, do you sign off Phase 3?

**Known issues:** hands-off, the aircraft eventually dives into the ground by itself at low altitude (existing behaviour, not new). The thin sock pole and rubble are approximations. Solids exist only for built tiles (about 2 km round you at Medium).

## Phase 3 checkpoint 3: quality, frame rate and sky (D46)

**Built and tested by the product owner: 75 fps maximum, 65 fps 1% low, worst frame 14 ms at 2059x1020 pixels on Medium (116 calls, 290,000 triangles), so the frame-rate acceptance is met. Both follow-ups (flicker, crashes) are now built, see above.**
- **L cycles graphics quality** Low, Medium, High (remembered in the browser; `?quality=low|medium|high` in the address overrides it). The terrain and clouds rebuild at once.
- **Pixel budget:** the picture is drawn with about 2.1 million pixels (about 1920 x 1080) at Medium, even on a retina screen, then scaled to fit; High draws at the screen's own resolution; Low about 1 million.
- **F3 shows the performance:** frames per second, the 1% low, the worst frame in the last two seconds, draw calls, triangles, quality level, pixels drawn, and terrain tiles.
- **High cirrus** wisps in the sky; the sky colours, sun and haze are in one place for a later time-of-day setting.
- 495 tests pass (plus 15 known deviations); physics untouched.

**Phase 3 acceptance test (the two things in the brief):**
1. **Steady frame rate at 1080p.** Run `npm run dev`, open http://localhost:5173 at your usual window size and press **1** then **F3**. Take off and fly for a minute or two: over the airfield, along the front line (east, about 4.3 km), over villages and through the clouds (climb to 1,500-2,500 m). Read **frames** in the F3 box: you want about 60 fps with a **worst** below about 25 ms. Press **L** to try Low and High and compare. If Medium is not steady, tell me the numbers.
2. **Each aircraft recognisable by its silhouette.** Open http://localhost:5173/hangar.html, press **All four** and **Silhouette** (already confirmed at checkpoint 1; the models have since gained moving control surfaces).

**Known issues:**
- I could not read a real frame rate in the test browser (it pauses animation in hidden tabs), only render timings, so the fps figure is yours to read.
- Switching quality rebuilds the ground around you, which can take a second or two on High.
- Clouds, wind and the control tower are visual extras (no effect on flight).

## Phase 3 checkpoint 2b: airfields and a more detailed landscape (D44), committed

**Done and committed; the product owner flew it and confirmed the ground flicker is gone** (on top of checkpoint 2, committed as c3b90ec).

**Airfields**
- The start field plus about 25 more within 30 km, Allied behind the Allied line and German behind the German line. The nearest from the start: Allied at 5.3 km (bearing 026), 6.7 km (202), 6.8 km (162), 7.9 km (273); German at 7.2 km (093), 9.0 km (123), 9.3 km (062). **F3 now shows the nearest airfield, its distance, compass bearing and side.**
- Each has a striped mown landing ground, **white triangular markers** at the corners and along the edges, a **wind sock** (orange and white, pointing downwind), a **wooden control tower** with a flag, hangars with open doors, tents, lorries and an access road. The wind is visual only (from 340 degrees; there is no wind in the physics).

**More detail**
- **Sharper ground:** a 1 m-per-pixel texture round the aircraft plus fine grain, bare field edges, muddy road verges, water in some craters.
- **Farms:** farmhouse, barns, haystacks, windbreak trees and a track, scattered over the countryside; post windmills.
- **War damage:** sandbags and dugouts along the trenches, wire posts, gun pits and supply dumps behind the lines, raised crater rims, rubble in ruined villages, burnt trunks in shattered woods.

**Numbers:** 481 tests pass (plus 15 known deviations). At Medium, a frame has at most 175 draw calls and 382,000 triangles (at the front line). Physics is untouched.

**Changes after your first flight (D45):** no trees round the hangars or inside buildings; control tower and wind sock 20% bigger; cumulus clouds of random sizes at random places and heights (bases 1,300-2,600 m); and a fix for the ground flicker (far ground tiles no longer overlap close ones, the fallback ground is lower, and the camera depth range is tighter). **Please check whether the flicker is gone, especially while banking.**

**How to look at it:**
1. `npm run dev`, open http://localhost:5173, press **1**, press **F3**. Take off and fly **north** first: the airfield you start on is the biggest; circle it and look at the markers, sock, tower and hangars (they are at the south end).
2. Fly to a neighbouring airfield using the F3 line, then land between the white markers.
3. Fly east to the front (about 4.3 km): low over the trenches look for sandbags, wire posts and craters with rims; fly 500 m behind the lines for gun pits and supply dumps.
4. Fly low over the countryside for the farms, haystacks and windmills, and over the ruined villages near the front for rubble.

**Known issues:**
- **Ground flicker:** the likely cause is fixed (see D45) but I could not see flicker in the test browser, so it needs your eyes. If it is still there, I will add a logarithmic depth buffer.
- Clouds are visual only (no lift, bumps or shadows), and a very small cloud is a few separate lumps.
- The control tower is not a WWI feature (the first tower was at Croydon in 1920); it is a timber watch tower, as you asked.
- Draw cost is highest at the front line (382,000 triangles); checkpoint 3 tunes it and adds the frame-rate readout.
- Wind is visual only. The aircraft do not feel it.
- Ground detail is painted and shaded; there are no individual 3D hedges or fences (not picked).
- The real frame rate has not been measured on your machine yet.

## Phase 3 checkpoint 2: terrain (D42), committed


**What was done:**
- A procedural Western Front on flat ground (`src/world/`), made of pure functions of a seed, with the airfield at the origin and the front line about 4.5 km east.
- Farmland in strips of nine crops with hedges and furrows; villages with a church and houses (ruined near the front); winding roads with poplars; woods; a river with bridges; trenches (front, support, reserve and communication), barbed wire, shell craters, shattered woods.
- Drawn in streamed tiles: close 1 km tiles with trenches, trees and buildings, and coarse 2 km tiles farther out; quality levels via `?quality=low|medium|high`.
- Airfield: a mown field with three hangars, tents and a windsock.
- 402 tests pass, plus 15 known deviations. Physics is untouched.

**Also added since:** the control surfaces now move (ailerons, elevators, rudder; D43) and the joystick throttle default is axis 6. The hangar page has buttons to test the surfaces.

**How to look at it:**
1. `npm run dev`, open http://localhost:5173 and start with **1**, then fly north (take off, climb).
2. Fly **east** (to your right): after about 4.5 km you reach the front line: zigzag trenches, craters and churned ground, with shattered woods.
3. Fly low over the villages, the poplar roads and the woods; cross the river to the south (about 2.4 km south of the airfield).
4. Try `http://localhost:5173/?quality=high` and `?quality=low`, and `?seed=somme` for a different world.

**Known issues:**
- The ground is flat, so there are no hills or valleys (your choice for now).
- Trees, buildings and towers are visual only: you can fly through them.
- Far ground beyond the coarse tiles falls back to the old checked pattern under the haze.
- There are visible seams where the field layout changes direction (every 1.5 km): intended, like different farms.
- Triangle count is near the budget (about 300-430k at Medium); checkpoint 3 tunes it and adds the on-screen frame-rate readout.
- Frame rate could not be measured in the automated browser (it throttles hidden tabs), so please check it on your machine; F3 will show it in checkpoint 3.

## Phase 3 checkpoint 1: aircraft models (D41)

**What was done:**
- Four models built in code from each aircraft's data: Camel (Barker's B6313), SPAD (Brooks's "Smith IV"), Dr.I (Richthofen's red 425/17), Albatros D.Va (Jasta 46, 7161/17).
- Visual proportions sourced where possible (Camel chord, stagger, tailplane, dihedral; Albatros chords; Dr.I chord; SPAD chord) and marked as estimates otherwise; liveries researched and rated in `AIRCRAFT_DATA.md`.
- `hangar.html`: a page for looking at the models.
- 377 tests pass, plus 15 known deviations. Physics is untouched (`git diff` shows no change in `src/physics/`).

**How to look at them:**
1. `npm run dev`, then open http://localhost:5173/hangar.html.
2. Press **All four** and **Side**: the four profiles side by side. Turn **Silhouette** on to see black shapes against the sky. Try **Top** and **Front** (choose one aircraft first for the front view).
3. Drag to orbit, wheel to zoom. Click each aircraft's name for the 3/4 view.
4. Then fly (keys 1-4) and look at each aircraft from the chase view (C) and free-look; the cockpit view should still show the instruments and guns.

**Known issues:**
- Side profiles of WWI biplanes are naturally similar; the top and front views separate them more. The proportions marked "estimate" are the first thing to adjust if a silhouette looks wrong.
- The wings are one colour per surface (no camouflage or lozenge patterns).
- The Dr.I's wing gaps and stagger are estimates (production figures not found).
- The model is now deeper than the old placeholder, so the cockpit view hides the nose parts and shows the cockpit's own decking.

## Phase 2 progress

**Checkpoint 1 (committed 11ce8d3):**
- **Controls (D32):** Insert/Delete and Home/End, plus W/S and T/G; the Mac fn keys work; mouse flying with adjustable sensitivity.
- **Ground handling with an airfield start (D33):** keys 1-4 start on the airfield, Shift+1-4 in the air.
- **Propeller effects (D34):** slipstream swirl, P-factor and propwash.
- **Sourced Camel behaviour tests (D35).**

**Checkpoint 2 (committed d686868):**
- **Cameras (D37):** C cycles chase, free-look and cockpit. In the cockpit, hold the right mouse button or press V to look around; the head eases back forward when you stop. Free-look orbits the aircraft with the mouse; the wheel zooms.
- **Cockpit:** decking, twin guns and an instrument panel, built in code.
- **Instruments (D38):** airspeed, altimeter, rev counter, compass and slip ball, in each side's period units (Camel: mph and feet; the others: km/h and metres). In the outside views, a small readout at the bottom right (J toggles it).
- **Tyre grip fix (D39):** found in the browser check. A landing with a slight sideways drift tripped every aircraft onto a wingtip. Tyre side grip now builds with the slip angle; a new test lands each aircraft drifting 1.5 m/s either way.
- **Results:** 320 tests pass, plus 15 known deviations. The production build works.
- **Browser check (Chrome):** the Camel was flown entirely in the cockpit view through the real keyboard controls: take-off (about a quarter right rudder held; lift-off at about 24 m/s), climb to 50 m, glide, flare, landing and roll-out to a stop. Also checked: all three cameras, look-around, mouse capture, the J readout and the SPAD's metric instruments. No console errors.

**Checkpoint 3 (committed with the Phase 2 sign-off): the Logitech Extreme 3D Pro joystick (D40).** Added at the product owner's request, inside Phase 2.
- **Flying:** stick = pitch and roll; twist handle = rudder; slider = throttle (it takes over only when you move it, so the keyboard and mouse wheel still work); trigger = fire (read, but nothing fires until Phase 4).
- **Views:** the hat looks around in the cockpit: left, right, up, and down looks back over the shoulder (diagonals over a shoulder). Releasing eases the view forward. In free-look the hat orbits the aircraft.
- **Buttons:** 2 camera, 3 and 4 trim down and up (held), 5 instrument readout, 6 centre the mouse stick, 7 pause, 8 restart. 9-12 are unassigned.
- **F2 joystick screen:** shows every axis as a bar, every button lit while pressed and the hat direction. "Learn" assigns a control by moving it, "Flip" reverses an axis, and dead zone and curve have + and - buttons. Everything is saved in the browser.
- **Results:** 353 tests pass, plus 15 known deviations. In Chrome, a **fake** Extreme 3D Pro was flown through a full take-off, circuit and landing in the cockpit view; the hat, buttons, pause, learn and saving all worked. No console errors.
- **Tested on the real stick by the product owner:** it works as expected with the default mapping.

**Known issues:**
- **Joystick:** Chrome only sees the stick after a button is pressed while the game window has focus, and forgets it on every page reload. If a stick was seen before but is missing, a hint appears 5 s after the page loads and the console says what the browser can see; F3 shows the stick's name or "not detected". If the game loop ever fails, the error is shown on screen instead of freezing silently. If a control is reversed or numbered differently on another computer, use F2 (Learn and Flip).
- A scripted pilot with a joystick-style instant rudder drifted off the runway line at the very end of the roll-out (below 10 m/s), the known tail-dragger ground-loop tendency.
- Full power with no rudder swings the nose 28-58 degrees left in 3 s, so right rudder is needed. The strength comes from estimated propeller coefficients; judge it by feel.
- The roll-out needs aileron as well as rudder. Near flying speed the wings carry most of the weight, so a wing that starts to drop keeps going unless you hold the wings level.
- The cockpit is a placeholder: no cut-out in the upper wing (the wing hides the top of the screen), and every aircraft has the same panel layout. Period layouts come with the UI work later.
- The altimeter reads about 5 ft / 1.5 m on the ground (the height of the centre of gravity), not zero.
- Esc must be pressed by you to release the mouse; the browser's automated tests could not check this.
- The Dr.I and Albatros wheel tracks, and every pilot eye position, are estimates.

## Flight model validation (11 Oct 2026)

### Done
- **Peak-lift mismatch fixed:** the stall now peaks exactly at the recorded CLmax (tested). Stall speeds fell by about 8%, to 42-52 mph.
- **Shared physical cause of the climb error found and fixed**, using sourced physics only:
  - Prandtl's multiplane induced drag (NACA TN-182);
  - measured propeller efficiency (Durand and Lesley, NACA Report 30);
  - a realistic loss of engine power with altitude.
  No per-aircraft correction factors.
- **Data errors fixed:**
  - the Dr.I's 103 mph is a 4,000 m speed, not a sea-level one;
  - the Camel is now calibrated to Mason's 117 mph at sea level.
- **New sourced data:**
  - climb tables for all four aircraft;
  - wing spans and gaps;
  - eleven new sources (S22-S32).
  No sourced stall or landing speeds exist.
- **Saved validation:** `npm run validate` prints the tables, and `tests/physics/validation.test.js` checks 41 sourced figures in `npm test`. Of 37 independent checks, 25 pass and 12 are documented known deviations. Before these changes, about 13 passed.
- **New code:** `src/physics/multiplane.js`, `src/physics/performance.js`, `src/physics/validation.js`, `src/aircraft/validationCases.js`, `scripts/calibrateDrag.mjs` (`npm run calibrate`), `scripts/flightValidation.mjs`.
- Full results in `docs/FLIGHT_VALIDATION.md`; decisions D21-D28 in `DECISIONS.md`.
- `npm test`: 225 pass, plus 15 explicit expected failures (12 validation, 3 spin). A deliberately broken reference value was caught by both the validation test and the docs-consistency test.

### Known issues added by this work
1. **SPAD climb depends on an unknown:** which engine the 1921 test aircraft had. With 220 hp (report title) it climbs 21-26% too fast; with 197 hp (article text) everything passes.
2. **German aircraft above 4,000 m:** the Dr.I and Albatros climb more slowly than the manufacturer-derived tables. Those tables have their own inconsistencies (see the report).
3. **Spins:** only the Camel holds a steady spin. The other three enter one and then recover by themselves. (The Phase 1 test missed this because it sampled one instant.)
4. **Camel ceilings:** about 14-17% above the sources, and the SPAD's about 15% at 220 hp.
5. **Estimated gaps:** the Dr.I and Albatros wing gaps are taken from closely related types.
6. **Albatros drag (CD0 0.060)** is about 60% above the others. It is investigated and left as fitted (D30). The likely causes are the unstated test conditions of the source speed and propeller efficiency, not real aerodynamics.

## Phase 1: Core flight model (11 Oct 2026)

### Done
- **Physics core** (`src/physics/`): six-degrees-of-freedom rigid body, International Standard Atmosphere, lift and drag with a stall and post-stall, induced and parasitic drag, engine power versus air density, propeller thrust versus airspeed, control authority that scales with airspeed, rotary-engine torque and gyroscopic effect, trim solver.
- **All four aircraft flyable** from data files (`src/aircraft/`): Camel, SPAD XIII, Fokker Dr.I, Albatros D.V. Press 1 to 4 to switch. Low-poly models generated in code, chase camera, F3 debug overlay.
- **Keyboard flying** with gentle key ramping, pause, restart and a help panel.
- **Data rule enforced by tests:** every number in the aircraft files, and every new physics constant, has a row in `docs/AIRCRAFT_DATA.md` (a source, or an estimate with a reason). A test links the code and the document so they cannot disagree.
- **Closed Phase 0 gaps:** engine rotation direction, propeller sizes, SPAD gear ratio and propeller (see AIRCRAFT_DATA.md; several are estimates).
- 172 automated tests pass, production build succeeds, and the game was flown in Chrome.

### What the model does (checked by tests)
- **Top speed** at sea level is within 3% of the documented figure for every aircraft (Camel -0.6%, SPAD -0.6%, Dr.I -1.2%, Albatros +2.8%).
- **Hands-off** flight holds height and speed for 10 seconds.
- **Stall** comes about 1.7 seconds after full back stick, at idle, and one wing drops (the left one) by 60 to 70 degrees. Stick forward, power on and wings level recovers every aircraft.
- **Spin:** the Camel, SPAD and Albatros enter a sustained left spin (full back stick plus left rudder at idle). All four recover with opposite rudder and stick eased forward. Checked through the real keyboard in the browser for the Camel.
- **Rotary engines:** the Camel and Dr.I nose sits lower in right turns and higher in left turns (about 12 degrees different in the Camel, about 15 in the Dr.I). The SPAD and Albatros turn identically both ways.
- **Stall speeds** at 1 g come out near 43 to 55 mph. **Control authority** is four times larger at double the airspeed.

### Known issues (be aware before you fly it)
1. **The Camel does not turn much faster to the right.** The nose-drop in right turns is there, but sustained turn rate is about the same both ways (see D16 in DECISIONS.md). Sources disagree: one museum says "extremely sharply to the right", a magazine says flight tests found them similar. I did not force it with a fudge factor.
2. **The Fokker Dr.I does not sustain a spin.** It rotates and recovers but does not settle into a steady spin.
3. **Spin behaviour is delicate** and depends on estimated numbers. Expect to tune it after you fly it.
4. **All stability and control numbers are estimates** (no WWI measurements found). Handling feel is my best judgement, not history.
5. **No ground, no damage.** You start at 1,000 m. Hitting the ground (under 1 m) ends the flight, R restarts. There are no speed or g limits yet, so you can dive far past any real aircraft's limit.
6. **Rotary throttle is continuous** (real Camels mostly used a blip switch).
7. **Rotary engines are lightly rigged for torque** (a design choice, flagged in D15) so they fly level hands-off.
8. **Inline engines have no torque or gyro** in this phase.
9. **The first key press needs the page focused.** Click on the game window once before using the keyboard.
10. **Camera** is held at least 2 m above the ground, so it can look odd when you are very low.

11. **Performance check vs sources** (`docs/FLIGHT_MODEL_CHECK.md`, run after Phase 1): top speed is within 3% for all four aircraft, but the Dr.I climb rate and ceiling are about 25% low, the SPAD climb figures cannot yet be compared fairly, no stall speeds are sourced, and the model's effective peak lift is 13 to 15% below the recorded CLmax estimate. Nothing was changed.

### Left to do
- Your sign-off on Phase 1, and flying feedback to tune handling.
- Next phase (not started): your call. Candidates from the spec: ground handling, take-off and landing, structural limits.

## How to test it yourself

Start: in Terminal, in the project folder, run `npm run dev`, open http://localhost:5173, and **click once on the game window**.

### All keys

| Key | Action |
|---|---|
| Down / Up arrow | Stick back (nose up) / forward (nose down). Ramps in about 0.6 s and centres on release. |
| Left / Right arrow | Roll |
| Q / E | Rudder left / right |
| Insert / Delete, or W / S | Throttle up / down (stays where left). Mac: fn+Delete is Delete. The mouse wheel works the throttle too. |
| Page Up / Page Down, or T / G | Trim nose up / down. Mac: fn+Up is Page Up, fn+Down is Page Down. (Home/End until Phase 6.) From Phase 7 every key in this table except Esc and the F keys can be changed in Options > Controls. |
| 1 2 3 4 | Camel, SPAD, Dr.I, Albatros on the airfield, engine idling, chocks in (they come away when you open the throttle) |
| Shift + 1-4 | The same aircraft in the air at 1,000 m, trimmed |
| C | Camera: chase, free-look, cockpit |
| V, or hold the right mouse button | Look around in the cockpit |
| J | Instrument readout on or off (outside views) |
| F2 | Joystick screen: test, learn, flip |
| Click the game / Esc | Fly with the mouse / release the mouse. X centres the mouse stick; , and . change the sensitivity. |
| R | Restart current aircraft |
| P | Pause |
| F3 | Debug numbers |
| F4 | Flight test panel (temporary, development builds only) |
| H | Hide or show the help |
| I | Invert the pitch keys |

### Joystick test (Logitech Extreme 3D Pro)
1. Plug it in, open the game in Chrome, click the window and **press the trigger once**. A notice says "Joystick found".
2. Press **F2**. Move the stick, twist the handle, move the slider and push the hat: the matching bar or label should move (Roll, Pitch, Rudder, Throttle, Hat). Press buttons 1-12: each lights up.
3. If a control is wrong or reversed: click **Learn Roll** (or Pitch, Rudder, Throttle, hat), then move that control; use **Flip** to reverse one. If something else looks odd, tell me what the F2 screen shows.
4. Press F2 again to hide it. Press **1**, then **C** twice (cockpit). Slider fully forward for full throttle; take off, keep straight with the twist handle, fly a circuit and land.
5. Hold the hat left, right, up, down and diagonally: the view should snap round and return when released.
6. Try buttons 2 to 8 as listed above.

### Phase 2 acceptance test
1. Press **1** (Camel on the airfield), then **C** twice for the cockpit. Hide the help with **H**.
2. Open the throttle fully (hold **Insert** or **W**). The nose swings left: hold a little **E** (right rudder) to keep straight. Let the tail rise slightly, then ease back on **Down** at about 50 mph.
3. Climb to about 500 ft. Fly a rectangle: four turns using roll with a little rudder. Watch the slip ball and keep it near the middle with rudder.
4. Turning right, the Camel's nose drops and it whips round; turning left it is slower and the nose rises. That is the sourced "pulls right" behaviour (D35).
5. Line up, close the throttle (**Delete** or **S**), glide at about 60 mph, and just above the ground ease back into the three-point attitude. Keep the wings level with the arrows and straight with Q/E until it stops.
6. Try the other aircraft the same way (keys 2-4).

### F4 flight test panel
Press **F4**, then click a button in the row of the aircraft you want. A "scripted pilot" flies the set-up and the panel shows who has control. **Press any flight key to take over at once.** The panel shows airspeed, altitude, bank, pitch, turn rate, yaw rate, stall %, g and throttle.

| Button | What happens | What to look for |
|---|---|---|
| Level 1000 m | Normal trimmed start, no script | Height and speed steady, 1.00 g |
| Full throttle | 1,000 m at full power; the script holds wings level and height for 60 s | Speed settles near the model's top speed at 1,000 m (Camel about 115 mph) |
| Stall | 1,500 m, idle, full back stick until fully stalled, held 1 s, then control passes to you | Stall reaches 100%, a wing drops; recover with Up, W and level wings |
| Turn left / Turn right | 1,500 m, full power, held at 60 degrees bank with a little back stick for 30 s | About 2 g; turn rate around 20-26 degrees/s. Camel and Dr.I: nose higher in left turns, lower in right turns. SPAD and Albatros: the same both ways. |
| Spin | 2,500 m, idle, full back stick, then full left rudder; held 8 s, then controls centred | Camel keeps spinning (about 2-4 rad/s yaw rate) until you recover with E, taps of Up, and W. The others start to spin, then come out by themselves (known). |

## Decisions

Made on 11 Oct 2026 (see D29 in DECISIONS.md):
- SPAD 1921 test case stays at 220 hp.
- The known deviations stay documented, not tuned.
- The Camel's right-turn nose-drop is enough.

Still open:
1. ~~Phase 2 acceptance~~: approved on 11 Oct 2026, with the joystick.
2. **Phase 3** is in progress (see the status at the top).

## Phase list
- Phase 0: Foundations and research. Done and signed off.
- Phase 1: Core flight model, all four aircraft, plus flight-model validation. Done and signed off (11 Oct 2026), committed d710c03.
- **Phase 2: Controls and cameras.** Done and signed off (11 Oct 2026), including the joystick. Brief from the product owner:
  - Keyboard: arrow keys for bank and pitch; Insert / Delete for throttle up / down; Home / End for trim up / down. W/S and T/G are also kept, because a Mac has no Insert key. Up arrow = nose down.
  - Mouse flight controls with adjustable sensitivity; throttle and trim.
  - Added by the product owner during Phase 2: Logitech Extreme 3D Pro joystick (axes, slider throttle, hat views, trigger, buttons) as the primary controller.
  - Cockpit, chase and free-look cameras.
  - Acceptance: you can take off, fly a circuit and land without the debug panel; the Camel visibly pulls right under power. The product owner decided to research what the Camel really did and follow the sources.
  - This needs ground handling (take-off and landing) and basic instruments, so both are included.
- **Phase 3: World and visuals.** Done and signed off. Procedurally generated Western Front terrain (fields, woods, trench lines), sky and clouds. Low-polygon aircraft models built in code, with no third-party assets. Acceptance: steady frame rate at 1080p on the product owner's machine; each aircraft is recognisable by its silhouette.
- **Phase 4: Weapons and damage.** Done and signed off. Synchronised machine guns firing through the propeller, bullet ballistics with gravity and drag, limited ammunition and gun jams. Component damage to the engine, fuel, pilot, wings and control cables; damage changes the flight model. Acceptance: tests confirm bullet drop and travel time; a damaged wing causes a measurable roll.
- **Phase 5: AI opponents.** Done and signed off. AI pilots on the player's flight model and controls, with patrol, engage, attack, evade and disengage; the six manoeuvres of the spec; Novice, Regular and Ace skill levels plus the Drone. Acceptance: see "Phase 5 checkpoint 3 and acceptance test" above.
- **Phase 6: Game loop, HUD and audio.** Done and signed off. Start menu, mission setup, pause and results; period cockpit instruments and an optional modern HUD; engine, gun, wind and hit sounds. Acceptance: a full mission runs from menu to result screen and back without reloading the page.
- **Phase 7: Controls screen and assists.** Done and signed off. Rebinding of keyboard and joystick controls; options for auto-rudder, stall warning, G warning and structural damage. Proposed acceptance: a key and a joystick button rebound on the Controls screen work in flight and survive a reload, and each of the four options visibly changes the flight when switched on.
- Later phases: not yet defined. Candidates: other gamepads (per the spec); an engine overspeed warning, with engine speed rising in dives and documented rpm limits (product owner, Phase 7: "I will add later").
