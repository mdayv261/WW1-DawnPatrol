# Progress

Read this at the start of every session.

## Current status: Phase 3 (world and visuals) in progress, checkpoint 2 committed; airfields and more detail (2b) under way

Phases 0, 1 and 2 are signed off (Phase 2 on 11 Oct 2026, including the joystick). Phase 3 has three checkpoints; each is committed only with the product owner's permission:
1. **Aircraft models**: done and committed (48df111); the product owner confirmed all four are recognisable by silhouette.
2. **Terrain**: done and committed (fields, woods, villages, roads, a river, trench lines). Product owner's feedback: the flying model feels natural and realistic, the terrain looks OK but could be more detailed, and there should be recognisable airfields with white triangle markers, a wind sock and a control tower. That is checkpoint 2b, in progress.
3. **Sky, clouds, quality levels and the frame-rate pass.**

## Phase 3 checkpoint 2: terrain (D42)

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
| Home / End, or T / G | Trim nose up / down. Mac: fn+Left is Home, fn+Right is End. |
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
- **Phase 3: World and visuals.** In progress (checkpoint 1 built). Procedurally generated Western Front terrain (fields, woods, trench lines), sky and clouds. Low-polygon aircraft models built in code, with no third-party assets. Acceptance: steady frame rate at 1080p on the product owner's machine; each aircraft is recognisable by its silhouette.
- **Phase 4: Weapons and damage.** Synchronised machine guns firing through the propeller, bullet ballistics with gravity and drag, limited ammunition and gun jams. Component damage to the engine, fuel, pilot, wings and control cables; damage changes the flight model. Acceptance: tests confirm bullet drop and travel time; a damaged wing causes a measurable roll.
- Later phases: not yet defined (Phase 7 includes gamepad and joystick support, per the spec).
