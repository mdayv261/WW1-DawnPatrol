# Progress

Read this at the start of every session.

## Current status: Phase 1 built, waiting for product owner sign-off

Phase 0 (foundations and research) was signed off. Phase 1 is the core flight model with all four aircraft flyable. Phase 2 has not been started.

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

### Left to do
- Your sign-off on Phase 1, and flying feedback to tune handling.
- Next phase (not started): your call. Candidates from the spec: ground handling, take-off and landing, structural limits.

## How to test Phase 1 yourself (about 10 minutes)

Start it: in Terminal, in the project folder, run `npm run dev`, open http://localhost:5173, **click once on the game window**, and press **F3** to see the numbers. Press **H** to hide the controls help.

Keys: **Down arrow** pulls back (nose up), **Up arrow** pushes forward, **Left/Right** roll, **Q/E** rudder, **W/S** throttle, **T/G** trim, **1-4** pick the aircraft, **R** restart, **P** pause, **I** invert pitch.

1. **Level flight.** Touch nothing for 10 seconds. You should stay level at about 1,000 m, 1.0 g, no stall. Try each aircraft with keys 1 to 4. The red triplane is the Dr.I.
2. **Turn.** Hold Right arrow for about 0.7 seconds to bank, then tap Down arrow to hold height. Release roll to stop rolling. Tap Left to roll back. In the Camel, compare a right turn with a left turn: the nose should sit lower in the right turn and rise in the left. In the SPAD they should look the same.
3. **Stall and wing drop.** Hold Down arrow for 1.5 to 2 seconds. F3 should show STALLED, and the left wing drops. Recover: hold Up arrow briefly, hold W for power, and level the wings.
4. **Spin and recovery.** Hold S for 2 seconds (idle). Hold Down arrow, and after about 2 seconds also hold Q (left rudder). The Camel should spin to the left, 100% stalled and falling. Recover: hold E (right rudder), tap Up arrow a few times, hold W. Within a second or two it should stop spinning and dive out.
5. **Check the F3 numbers** make sense: speed in mph and km/h, height, angle of attack, sideslip, g-load, thrust, lift, drag, stall.

## Decisions I need from you

1. **Camel right turn.** After flying it: is the nose-drop enough, or do you want right turns made noticeably tighter than left (which means adding a tuned effect rather than pure physics)?
2. **Next phase.** What should Phase 2 be? I'd suggest ground handling and take-off/landing, with structural limits. But it is your call.
3. **Keyboard feel.** If pitch feels too sensitive or the Up/Down mapping is wrong for you, tell me, or press I to invert.

## Phase list
- Phase 0: Foundations and research. Done and signed off.
- Phase 1: Core flight model, all four aircraft. Built, awaiting sign-off.
- Phase 2 onward: not started. (Phase 7 includes gamepad and joystick support per the spec.)
