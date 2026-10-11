# Progress

Read this at the start of every session.

## Current status: Phase 2 (controls and cameras) in progress

Phase 0 and Phase 1 are signed off. The product owner approved Phase 1 on 11 Oct 2026, after testing the flight model in the browser with the F4 test panel. Phase 1 included the core flight model for all four aircraft and its validation against sourced performance data (below). Phase 2 has not been started; its scope still needs to be agreed.

## Phase 2 progress (in progress)

**Checkpoint 1 done:**
- **Controls (D32):** Insert/Delete and Home/End, plus W/S and T/G; the Mac fn keys work; mouse flying with adjustable sensitivity.
- **Ground handling with an airfield start (D33):** keys 1-4 start on the airfield, Shift+1-4 in the air.
- **Propeller effects (D34):** slipstream swirl, P-factor and propwash.
- **Sourced Camel behaviour tests (D35).**
- 301 tests pass, plus 15 known deviations.

**Next:**
- cockpit, chase and free-look cameras (C cycles; V or the right mouse button to look around);
- cockpit instruments, and a J readout in the outside views;
- docs and browser verification.

**Known issues so far:**
- Full power with no rudder swings the nose 28-58 degrees left in 3 s, so right rudder is needed. The strength comes from estimated propeller coefficients; judge it by feel.
- Careless rudder on the landing roll-out ground-loops into a wingtip.
- The Dr.I and Albatros wheel tracks are estimates.

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

## How to test Phase 1 yourself

Start: in Terminal, in the project folder, run `npm run dev`, open http://localhost:5173, and **click once on the game window**.

### All keys

| Key | Action |
|---|---|
| Down / Up arrow | Stick back (nose up) / forward (nose down). Ramps in about 0.6 s and centres on release. |
| Left / Right arrow | Roll |
| Q / E | Rudder left / right |
| W / S | Throttle up / down (50% per second; stays where left) |
| T / G | Trim nose up / down (slow; stays where left) |
| 1 2 3 4 | Camel, SPAD, Dr.I, Albatros (normal start: 1,000 m, trimmed, 80% of top speed) |
| R | Restart current aircraft |
| P | Pause |
| F3 | Debug numbers: airspeed, altitude, angle of attack, sideslip, g, thrust, lift, drag, engine, stall % |
| F4 | Flight test panel (temporary, development builds only) |
| H | Hide or show the help |
| I | Invert the pitch keys |

You can also choose the starting aircraft in the web address: `?aircraft=camel`, `spad13`, `dr1` or `albatros`.

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
1. ~~Phase 1 sign-off~~: approved on 11 Oct 2026.
2. **Phase 2 scope:** to be decided after sign-off. Suggestion: ground handling, take-off and landing, structural limits.
3. **Commit:** the validation work is not committed yet.

## Phase list
- Phase 0: Foundations and research. Done and signed off.
- Phase 1: Core flight model, all four aircraft, plus flight-model validation. Done and signed off (11 Oct 2026), committed d710c03.
- **Phase 2: Controls and cameras.** In progress. Brief from the product owner:
  - Keyboard: arrow keys for bank and pitch; Insert / Delete for throttle up / down; Home / End for trim up / down. W/S and T/G are also kept, because a Mac has no Insert key. Up arrow = nose down.
  - Mouse flight controls with adjustable sensitivity; throttle and trim.
  - Cockpit, chase and free-look cameras.
  - Acceptance: you can take off, fly a circuit and land without the debug panel; the Camel visibly pulls right under power. The product owner decided to research what the Camel really did and follow the sources.
  - This needs ground handling (take-off and landing) and basic instruments, so both are included.
- **Phase 3: World and visuals.** Procedurally generated Western Front terrain (fields, woods, trench lines), sky and clouds. Low-polygon aircraft models built in code, with no third-party assets. Acceptance: steady frame rate at 1080p on the product owner's machine; each aircraft is recognisable by its silhouette.
- **Phase 4: Weapons and damage.** Synchronised machine guns firing through the propeller, bullet ballistics with gravity and drag, limited ammunition and gun jams. Component damage to the engine, fuel, pilot, wings and control cables; damage changes the flight model. Acceptance: tests confirm bullet drop and travel time; a damaged wing causes a measurable roll.
- Later phases: not yet defined (Phase 7 includes gamepad and joystick support, per the spec).
