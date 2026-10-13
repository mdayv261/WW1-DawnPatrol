# Design Decisions

Each entry records what was decided, why, and when. Newest entries go at the bottom.

---

## D1. Toolchain and versions (11 Oct 2026, Phase 0)

**Decision:** Vite 8.3.4 (dev server and build), Three.js 0.186.1 (3D), Vitest 5.0.3 (tests), on Node 25.9.0.
Versions are pinned to exact numbers in `package.json`, with no `^` ranges.

**Why:** The spec fixes the tools. Exact pins mean a later `npm install` cannot silently change behaviour
under a physics simulator whose tests we trust. Upgrades will be deliberate and logged here.

**Licences:** Three.js, Vite and Vitest are all MIT-licensed. No other assets are used. All visuals are generated in code.

## D2. Module map (11 Oct 2026, Phase 0)

```
src/
  core/      fixed-step loop, clock, shared maths helpers          (built in Phase 0)
  render/    Three.js scene, camera, aircraft meshes, effects      (scene built in Phase 0)
  physics/   rigid body, atmosphere (ISA), aerodynamics, engine, propeller, ground contact
  aircraft/  DATA FILES ONLY: one per aircraft, every constant, each traceable to docs/AIRCRAFT_DATA.md
  input/     keyboard, mouse, gamepad -> a ControlInput object
  weapons/   guns, synchronisation, ballistics, ammunition, jams
  damage/    component damage and its effect on the flight model
  ai/        pilot behaviour states and manoeuvres -> a ControlInput object
  world/     terrain, sky, clouds, objects on the ground
  ui/        menus, instruments, HUD, F3 debug overlay
  audio/     Web Audio engine, guns, wind
tests/       one test file per module
```

Only `core` and `render` exist after Phase 0. The others are created when their phase begins, so the repo never contains empty scaffolding.

## D3. Data flow (11 Oct 2026, Phase 0)

```
keyboard/mouse/gamepad ─┐
                        ├─> ControlInput { pitch, roll, yaw, throttle, trim, fire, ... }
AI pilot ───────────────┘            │
                                     v
                  fixed physics step (120 Hz): aerodynamics, engine, damage, ground
                                     │
                                     v
              simulation state (position, quaternion, velocity, angular velocity, ...)
                         │                              │
                         v                              v
        render: interpolates previous and        audio, HUD, debug overlay
        current state, draws the frame           read the same state
```

**Rules that follow from this:**
1. The player and every AI aircraft produce the same `ControlInput` and run through the same physics code.
   This enforces the spec rule that AI gets no extra speed, turn rate or perfect aim.
2. Physics never imports `render`, `ui`, `audio` or touches the DOM. Dependencies point one way: the simulation does not know it is being watched.
3. State flows downward only. Rendering and audio read state; they never change it.

## D4. Fixed physics time step (11 Oct 2026, Phase 0)

**Decision:** Physics runs at 120 Hz (dt = 1/120 s). Each frame, `FixedStepLoop` (`src/core/fixedStepLoop.js`) adds the real elapsed time to an
accumulator and runs as many whole steps as fit. The leftover fraction, `alpha`, goes to the renderer, which blends the previous and
current states for smooth motion at any screen refresh rate. At most 8 steps run per frame. If the limit is hit, the backlog is dropped.

**Why:** Equal small steps keep the numerical integration stable and repeatable. Decoupling from rendering means a slow laptop draws
fewer frames but the aircraft still fly identically. The 8-step cap avoids the "spiral of death", where catching up after a stall makes the
next frame slower still. After a hidden tab or long pause the game simply resumes rather than freezing.

**Determinism:** No wall-clock time and no unseeded random numbers inside physics. Tests then give the same result on every run.

## D5. Units and coordinate frames (11 Oct 2026, Phase 0)

**Decision:** SI units everywhere internally (metres, kilograms, seconds, newtons, radians). Conversion to knots, mph, feet and
degrees happens only in the UI.

- **World frame** (matches Three.js): +Y up, metres. -Z is north, +X is east. Origin at the mission start point.
- **Body frame:** +X forward (nose), +Y up, +Z out of the right wing. Right-handed.
- **Orientation:** unit quaternion (never Euler angles), renormalised each step.
- **Atmosphere:** International Standard Atmosphere, as the spec requires.

**Why:** One system removes a whole class of conversion bugs. Matching Three.js axes means no frame flip between simulation and rendering.

## D6. Use of Three.js maths in physics (11 Oct 2026, Phase 0)

**Decision:** `physics/` may import only the maths classes from Three.js (`Vector3`, `Quaternion`, `Matrix3`, `Matrix4`), nothing that touches rendering.

**Why:** These classes work in plain Node, so tests need no browser, and the same quaternion can be handed straight to the renderer with no translation layer.
We avoid writing and testing our own vector library.

## D7. Aircraft constants live in data files (11 Oct 2026, Phase 0)

**Decision:** Every physical constant sits in `src/aircraft/<name>.js`, with a comment pointing to its row in `docs/AIRCRAFT_DATA.md`. Code never contains a literal like `21.46` for wing area.
These files are created in Phase 1, when the first physics code needs them.

**Why:** The project rule and spec say so. It also lets the product owner see every number in one place, and lets us tune an estimate without touching logic.

## D8. Source policy for aircraft data (11 Oct 2026, Phase 0)

**Decision:** Values come from museum records, government and university publications, and established reference works. Forums and Reddit are excluded. Wikipedia is not cited, and its numbers are not used.
Every value in `docs/AIRCRAFT_DATA.md` carries a unit, a source ID and a confidence rating (high, medium, estimate). Anything not found is listed as an open gap instead of being filled in.
`tests/aircraftData.test.js` enforces this: it fails if a row has a missing field, an unknown source, or an estimate without a reason.

**Why:** The spec makes authenticity the top priority and forbids silent invention. Making the rule a failing test means it cannot erode over time.

**Consequence:** Several museum figures come from reproductions (no original Dr.I survives). They are rated medium, not high. Performance numbers often lack an altitude, so they are rated medium and
treated as tuning targets in Phase 1. The aerodynamic constants the flight model needs (drag, efficiency, maximum lift, inertia) are all estimates for now. They are back-calculated from documented top speeds, and their method is shown beside each value.

## D9. Aircraft variants modelled (11 Oct 2026, Phase 0)

**Decision (confirmed by the product owner):** Camel F.1 with the Clerget 9B 130 hp; SPAD XIII with the Hispano-Suiza 8Be 220 hp.
Defaults chosen for the other two, subject to the product owner's objection: Fokker Dr.I with the Oberursel UR.II 110 hp; Albatros D.V with the Mercedes D.IIIa.

**Why:** The Clerget 9B was the standard Camel engine. The 8Be was the standard production SPAD XIII engine and the one flown by US squadrons. The Camel was built with six rotary engine types and the SPAD with two, and each changes power, weight and torque.

**Note:** The Smithsonian's Albatros is a D.Va, not a D.V. It is a closely related aircraft (stronger wing spars). Its dimensions are used for the D.V and this is flagged in the data file.

## D10. Folder name `docs/` (11 Oct 2026, Phase 0)

**Decision:** The folder was created as `Docs/` (capital D). It was renamed to `docs/`.

**Why:** CLAUDE.md and the spec refer to `docs/`. macOS ignores letter case, so the mismatch was invisible here, but it would break on Linux or in automated builds.

## D11. Phase 0 scene (11 Oct 2026, Phase 0)

**Decision:** The placeholder scene has a shader-based sky dome (horizon-to-zenith gradient with a sun glow), distance haze (fog), a 60 km flat ground with a repeating field-patchwork texture, a sun light plus a sky light, and a camera at 300 m looking at the horizon.

**Why:** It proves the toolchain end to end. The repeating patchwork is deliberately visible: judging speed and altitude by eye needs ground texture, and it will make the first flight tests much easier to read. The real procedural Western Front terrain replaces it in a later phase.

---

# Phase 1 decisions (flight model)

## D12. Integration method (Phase 1)

**Decision:** Semi-implicit (symplectic) Euler at 120 Hz for position and velocity. Orientation advances by rotating the quaternion by the angle turned in each step (the exact result for a constant rate), then renormalising. Rotation uses Euler's equation including the gyroscopic term from the spinning engine: `I dw/dt = M - w x (I w + H)`.

**Why:** Simple, stable at 120 Hz for these time constants, and deterministic. A higher-order method (RK4) was not needed: the tests show orientation stays unit length and angular momentum is conserved to within 2% over 10 seconds of free tumbling. Revisit if a later phase shows drift.

## D13. Coordinate and sign conventions inside the flight model (Phase 1)

**Decision:** `src/physics/aero.js` uses the textbook aeroplane axes (x forward, y right, z down) so its coefficients can be compared with textbooks. `flightModel.js` converts to the game's body axes (D5) at one place. In the aeroplane axes: alpha is positive nose above the wind, beta positive when the wind comes from the right, roll positive right-wing-down, yaw positive nose-right.
Controls: stick back = pull = nose up; stick right = right wing down; right rudder = nose right.

**Why:** Keeping the conversion in one place prevents sign errors. Each sign is covered by a test (for example "stick right rolls right wing down").

## D14. Aerodynamic model (Phase 1)

- **Lift:** straight line below the stall with the slope derived from aspect ratio (Prandtl finite-wing formula with a 0.9 x 2 pi section slope). It is a derived value, not an input.
- **Stall:** a smooth step at `CLmax / slope` from the zero-lift angle, about 1 degree wide. Past it, lift and drag blend to flat-plate values (lift `2 sin a cos a`, drag 1.98 `sin^2 a`), so the model stays sensible at any angle, including tumbling.
- **Drag:** parasitic `CD0` plus induced `CL^2 / (pi e AR)`.
- **Moments:** static stability from a static margin, plus damping and control terms. Control authority scales with dynamic pressure automatically because moments are `q S b C`. No fudge factor.
- **Wing drop and spins:** when stalled, roll damping reverses sign (autorotation) and levels off at high rates; sideslip roll effect reverses; a small fixed left-wing-down bias gives the drop a repeatable direction; yaw is driven toward the dropping wing; elevator loses half its effect; and a nose-down moment appears.

**Why:** The spec asks for wing drop, spins and recoverability. This is the smallest model that produces them. All the shaping numbers are estimates and are listed with reasons in `docs/AIRCRAFT_DATA.md` ("Common flight-model parameters").

## D15. Engine and propeller (Phase 1)

- **Power** is proportional to air density (a stand-in; Gagg and Farrar describe a better method whose constants were not verified).
- **Thrust** comes from power and airspeed with a peak-efficiency speed, joined smoothly to the static (momentum-theory) limit. Static thrust works out to about 50 to 60% of weight, a plausible figure.
- **Rotary engines** (Camel, Dr.I): the whole engine spins, giving angular momentum along the nose (clockwise from the cockpit) for gyroscopic effect, plus a reaction torque that rolls the airframe left.
- **Rigging compensation (design choice, flagged):** the aircraft carry a fixed roll moment cancelling 80% of the engine torque at 60% throttle, standing in for the way rotary aircraft were rigged. Without it the Camel rolled left at about 3 degrees/s hands-off. No source was found for how the Camel was actually rigged.
- **Inline engines** (SPAD, Albatros): no torque or gyro in Phase 1. Their spinning parts are small and no propeller rotation data was found.
- **Throttle:** continuous 0 to 100% for all aircraft, which the spec asks for. Real rotary Camels were mostly flown on a blip switch, not a throttle. Possible later refinement.

## D16. Camel turn behaviour: what the model does and does not show (Phase 1)

**Finding:** With the engine's real angular momentum, the model shows the **nose-attitude** effect strongly: the Camel's nose sits about 12 degrees lower in a right turn than in a left turn at the same stick and bank, and the Dr.I about 15 degrees. Inline aircraft are exactly symmetric.
It does **not** show a markedly **faster right turn**. At the same bank and stick the sustained turn rates differ by only 10 to 15% (and slightly favour the left, because the left turn flies slower with the nose higher). The Flying magazine article (S19) says flight tests found similar sustained turn rates, with the 270-degree-left-turn story a legend, while the Canadian Museum of Flight (S18) says the Camel turned "extremely sharply to the right and very poorly to the left".

**Decision:** Keep the physics-derived behaviour and do not add a fudge factor. The nose-drop in right turns, which the spec lists explicitly, is delivered and tested. The sustained-rate similarity is also tested (within 20%). **Product owner to decide** after flying it whether to bias this further (see PROGRESS.md).

## D17. Input mapping (Phase 1)

**Decision:** Arrow keys for the stick (Down = pull back, Up = push forward, like a real stick; `I` inverts), Q/E rudder, W/S throttle, T/G trim, 1 to 4 choose aircraft, R restart, P pause, F3 debug, H hide help. Key presses ramp the stick gradually (about a second to full travel) and return to centre quickly on release, so a tap is a small input. Mouse, gamepad and rebinding come in the controls phase.

**Why:** A binary key pressed full-on takes a light aeroplane into a stall in about a second. The ramp makes small corrections possible from a keyboard.

## D18. Scope deferred from Phase 1 and why

- **Ground handling, take-off, landing:** the flight starts in the air at 1,000 m at 80% of top speed, trimmed. Touching the ground (under 1 m) ends the flight and R restarts.
- **Structural limits and damage:** no documented limit loads or never-exceed speeds have been found, and we do not invent data. The g-load is shown in F3. The Camel can currently be dived well beyond any historical limit.
- **Mouse, gamepad, rebinding, menus, weapons, AI, terrain, audio, cockpit instruments:** later phases.

## D19. Spin tuning and its sensitivity (Phase 1)

**Decision:** The stall and spin parameters were tuned so that a spin can be entered and recovered, then locked in with tests. With the current values the Camel, SPAD and Albatros each enter a sustained spin to the left (with left rudder, full back stick and the engine at idle), rotating at roughly 2 to 4 rad/s, and all four aircraft recover with opposite rudder and the stick eased forward.
**Known weaknesses:** the Fokker Dr.I rotates (about 0.9 rad/s) but does not sustain a full spin. The behaviour is delicate: changing the pitch damping by 12% broke the SPAD's spin in a test. The spin is only entered when the stick is pulled hard, with rudder, at low power. More tuning is expected once the product owner has flown it.

## D20. How the physics is tested (Phase 1)

**Decision:** Physics tests are headless and deterministic. Scripted "pilots" (`tests/helpers/flight.js`) fly fixed manoeuvres, so results repeat exactly. Behaviour thresholds come from measured runs of the current estimates, so they guard against accidental change, **not against history**: no documented stall speeds or climb rates were found to validate against. Top speed is the one performance figure checked against documented data (within 5%). A test also links `docs/AIRCRAFT_DATA.md` to the aircraft data files and fails if a number differs, or if a number has no row. A check of that test (deliberately breaking three values) confirmed it catches them.

**Development hook:** In development only (not in production builds), `window.__dawn` lets a script advance the game by a number of seconds and draw one frame. It exists because a browser pauses animation in hidden tabs, which blocks automated checks. It is not part of the game.

---

# Flight model validation decisions (11 Oct 2026)

Results: `docs/FLIGHT_VALIDATION.md`.

## D21. Validation policy

**Decision:** The model is checked against sourced performance figures at each source's own weight, power and altitude (`src/aircraft/validationCases.js`, `tests/physics/validation.test.js`). Tolerances were set by the product owner: top speed within 5%, climb and ceiling within 15%. Each aircraft's drag (CD0) is fitted to exactly **one** sourced top speed (its calibration point); everything else is an independent check. Every physics value comes from a source or a formula fed by sourced geometry, **never from fitting to the validation targets**. When a check fails anyway, it stays failing: it is marked as a known deviation (an explicit expected failure, `it.fails`) with a written reason, and is flagged for the product owner.

**Why:** Three adjustable numbers can be made to fit eight data points by luck. Fitting would hide real errors and make the tests meaningless. An expected failure keeps the gap visible, and if the model later starts matching, the test fails so the record gets updated.

## D22. Engine power versus altitude (supersedes the density-only rule in D15)

**Decision:** Power = sea-level power x (1.132 sigma - 0.132), where sigma is the density ratio (Virginia Tech AOE 3104 notes, usually credited to Gagg and Farrar).

**Why:** Unsupercharged engines lose power faster than density falls. The old rule overstated altitude power, and that hid the climb under-prediction, because two errors cancelled in the ceilings.

## D23. Propeller efficiency from measured data

**Decision:** Efficiency against advance ratio J = V/(nD) follows the mean of propellers 1-4 in Durand and Lesley's NACA Report 30, Table III (1917 wooden models, peak 0.79). Each aircraft's propeller is assumed to peak at 0.9 of its documented top speed at rated rpm, and its J is scaled onto the measured curve. At low speed the momentum-theory static limit governs. The curve is zero at zero speed, which at first made static thrust zero; that bug was fixed and is now tested.

**Why:** The old parabola, with a 0.70 peak, gave about 0.62 at climb speed. The measured curve gives about 0.70. Report 30's companion study (NACA TR-220) found flight efficiencies close to model efficiencies.

## D24. Multiplane induced drag (Prandtl)

**Decision:** The induced drag and the lift slope use Prandtl's multiplane factor kappa (NACA TN-182), computed from each aircraft's wing spans and vertical gaps. One general formula covers biplanes and triplanes with unequal spans: kappa = b1^2 / (1^T M^-1 1), with M_ij = sigma_ij / (b_i b_j). It reproduces TN-182's equations (9) and (9a), the worked examples and Tables II and III, and tests check all of these.
- **Stagger is ignored,** which Munk's law permits.
- **Camel:** its lower wing has dihedral, so the mean gap over the span is used.
- **Dr.I and Albatros D.V:** their gaps come from closely related types (MAG-Fokker 90.03 and Oeffag D.III) and are flagged as estimates.
- **Formula correction:** the printed constant "1.05" in TN-182 equation (5) is taken as 1.055, because only that value reproduces the report's own example and table.

**Why:** At climb speed induced drag is about half of all drag. Treating stacked wings as one wing of the upper span overstated it by roughly 20%.

## D25. Peak lift equals CLmax

**Decision:** The centre of the smooth stall is solved (per aircraft, cached) so that the highest point of the blended lift curve equals the recorded CLmax.

**Why:** The smooth stall started cutting lift early, so the effective peak was 13-15% below CLmax and stall speeds were about 8% too high.

## D26. Calibration points chosen per aircraft

| Aircraft | Calibration figure | Why this one |
|---|---|---|
| Camel | 117 mph at sea level, 659 kg (Mason) | Altitude and weight stated, and it matches the model's weight. USAF's 112 mph has no altitude. |
| SPAD | 213 km/h at 1,981 m, 924 kg, 220 hp (McCook Field test) | A measured test with altitude and weight. The engine is uncertain (see FLIGHT_VALIDATION.md). |
| Dr.I | 185 km/h at sea level (Green and Swanborough, Herris, Aviodrome) | The previous 103 mph is the 4,000 m figure. Treating it as a sea-level speed had made the drag far too high. |
| Albatros | 172 km/h, 937 kg, 170 hp (Herris, D.Va) | Weight and engine are stated with the speed. The altitude is not stated, so it is taken as sea level. |

CD0 values are re-derived with `npm run calibrate` whenever the physics changes.

## D27. Spin test checks steadiness (supersedes the spin claim in D19)

**Decision:** A spin counts as steady only if rotation stays above 2 rad/s and the wing stays stalled for the whole 12-20 s window. Only the Camel does so. The SPAD, Dr.I and Albatros spins are transient and are recorded as known deviations. A scan of the shared spin parameters found no setting that made those spins steady while keeping recoveries and wing drop, so the parameters were left unchanged.

**Why:** The Phase 1 test sampled one instant (16 s) and so overstated how many aircraft really spin.

## D28. Performance model location

**Decision:** Steady-state performance (top speed, stall speed, best climb, time to climb, ceilings) lives in `src/physics/performance.js`, using the excess-power method. The validation runner is in `src/physics/validation.js`, and the report script is `npm run validate`.

**Why:** It is reused by the tests, the report, and later by the AI (energy management) and UI.

## D29. Product owner decisions on the validation (11 Oct 2026)

- **SPAD 1921 test engine:** keep the McCook case at 220 hp (the report title) until the original report is found. Its three climb and ceiling deviations stay documented.
- **Known deviations:** the 12 validation deviations and the 3 transient spins stay documented as expected failures, not tuned.
- **Camel turn behaviour (closes the question in D16):** the physics-derived nose-drop in right turns is enough. No extra effect will be added to make right turns tighter.

## D30. Albatros drag left as fitted (11 Oct 2026)

**Decision (product owner):** Keep the Albatros CD0 at 0.0602, fitted to Herris's 172 km/h at 170 hp and 937 kg, with no adjustment.

**Why:** The high value is consistent with Herris's speed and climb data together. The obvious alternatives either make it worse (more engine power raises it) or break the climb agreement (lower drag makes the model climb 15-22% too fast). The real cause cannot be settled without the D.Va's test conditions or propeller data. Full analysis is in FLIGHT_VALIDATION.md, "Why the Albatros drag coefficient is high".

## D31. Temporary F4 flight test panel (11 Oct 2026)

**Decision:** A temporary panel, toggled with F4, starts any aircraft in six test scenarios: level flight at 1,000 m, full-throttle level flight, stall, left turn, right turn and spin. It shows live readouts, including bank and turn rate, which F3 does not show. Code: `src/dev/flightScenarios.js`, `src/ui/testPanel.js`, wired in `src/main.js`.
- **Development builds only.** It is absent from `npm run build`, and this was checked.
- **No physics changes.** Scenarios only set a trimmed starting state and drive a short "scripted pilot" through the normal stick, rudder and throttle inputs.
- **Pilot override.** Any flight key cancels the script.
- **Full-throttle scenario.** It holds wings level and height. The rotary engines' torque is only rigged out at cruise power, so at full throttle the aircraft would otherwise roll away before reaching top speed.
- **Turn rate readout.** It is computed from the aircraft's angular velocity, not from heading changes, so it is correct at any refresh rate.

**Why:** It lets the product owner repeat the same test situations exactly while judging the flight model before Phase 1 sign-off. It is easy to remove, because everything sits behind the development-only switch.

---

# Phase 2 decisions (controls and cameras)

## D32. Keyboard and mouse controls (Phase 2)

**Decision:**
- **Throttle:** Insert/Delete, as the product owner specified. **W/S** also works, because a Mac keyboard has no Insert key.
- **Trim:** Home/End, as specified. **T/G** also works.
- **Mac fn keys:** Insert, Delete, Home and End are recognised by key name, not key position. On a Mac, fn+Left sends "Home" from the Left-arrow key, and must trim, not roll.
- **Unchanged:** Up arrow = nose down, I inverts, and Q/E is the rudder.
- **Mouse flying:**
  - Click the game to capture the pointer; Esc releases it.
  - The mouse moves a virtual stick that stays where you leave it, like a real stick; X recentres it.
  - The wheel moves the throttle by 5% a notch.
  - `,` and `.` step the sensitivity, which is remembered in the browser.
  - A held key takes priority over the mouse on its own axis.
- **Starting:** keys 1-4 start parked on the airfield; Shift+1-4 keeps the 1,000 m air start.

**Not done:** a rotary "blip switch". Only Wikipedia-derived sources mention it for the Camel. Key rebinding comes later, with the menus.

## D33. Ground model (Phase 2)

**Decision:** The ground is a flat field. The aircraft touches it through:
- **Two main wheels and a tailskid:** spring-damper contacts with rolling, sideways and skid friction. There are no brakes and no steerable tailwheel, as in WWI.
- **Crash points:** the propeller tip and the lower wingtips.
- **Undercarriage collapse:** a touchdown sinking faster than 3 m/s.

Wheel height comes from a 25 cm propeller clearance, and skid height from an 11-degree three-point attitude. Only the Camel and SPAD wheel tracks are sourced; the rest are estimates in AIRCRAFT_DATA.md.
- **Chocks:** the aircraft starts chocked. The chocks are pulled when the throttle first passes 30%, standing in for the ground crew.
- **Where the ground acts:** only in the time-stepping (`advance`). `evaluate` stays the free-air model, so the trim solver and every performance and validation result at "sea level" is unchanged.

**Why:** The Phase 2 acceptance (take off, fly a circuit, land) needs it.

**Findings:**
- Like real tail-draggers, these aircraft are directionally unstable on the ground. Careless rudder on the roll-out ground-loops them into a wingtip; firm, well-damped rudder lands all four.
- Take-off: lift-off at 1.13-1.21 x stall speed after 105-160 m.

## D34. Propeller effects and fin rigging (Phase 2, product owner approved)

**Decision:** Added three propeller effects to all four aircraft, with estimated coefficients flagged in AIRCRAFT_DATA.md:
- **Propwash over the tail:** extra dynamic pressure of thrust / disc area, from momentum theory.
- **Slipstream swirl on the fin:** a yaw moment proportional to propeller torque.
- **P-factor:** the thrust centre shifts toward the descending blade.

A fin offset cancels most of the swirl at cruise. Like a small wing, its moment grows with the dynamic pressure at the tail, so it has almost no effect at idle in a stall or spin.

**Why:** Without them, engine torque in the tail-down attitude swung the rotary aircraft RIGHT on the take-off run, and the rudder had no bite at low speed. With them, all four swing left under power and need right rudder, which matches the sources and normal propeller behaviour. The gyroscopic swerve left when raising the tail, and the kick right when raising the nose (Canadian Museum of Flight, S18), are tested.

**Consequences:**
- The Camel's nose-attitude difference between left and right turns fell from about 12 to 8 degrees. It is still clearly in the sourced direction.
- The SPAD and Albatros now differ slightly left to right (under 3 degrees; turn rates within 2%).
- With no rudder at full power the nose swings 28-58 degrees left in 3 s, so the player must be ready with right rudder.
- Validation and performance results are unchanged, because these effects are moments only.

## D35. What "the Camel pulls right" means (Phase 2)

**Decision:** Following the product owner's choice to follow the sources, the acceptance is tested as the sourced behaviour:
- the nose drops in right turns and rises in left turns (Old Rhinebeck Aerodrome, S35; RAeS paper, S33);
- right turns "whipped round" (S33, S34);
- the RAE 1918 trials found steady left spins and jerky right spins (S33);
- the take-off swerves (S18) come from the gyroscopic effect.

The engine rotation (clockwise from the cockpit) is supported by the Shuttleworth chief pilot's explanation of the jerky right spins (S33).

**Not reproduced:** the model's Camel does not turn faster to the right in a sustained turn (D16).

## D36. Spin recovery is tested with two standard techniques (Phase 2)

**Decision:** Each spin must be recoverable by one of two techniques:
- the RAE technique (stick forward, opposite rudder);
- Shuttleworth's "stick forward with rudder central".

The Camel must recover both ways with the RAE technique.

**Why:** With the propeller effects, the Dr.I's right spin turns into a left spin if opposite rudder is held throughout. The RAE recorded the same thing on the Camel. That spin recovers with the rudder central, so every spin remains recoverable, which is what the spec requires.

## D37. Three cameras; a placeholder cockpit (Phase 2)

**Decision:** C cycles three views:
- **Chase:** the existing camera, with the horizon kept level.
- **Free-look:** orbits the aircraft. The mouse turns it and the wheel zooms (6 to 120 m). It never goes below 1 m.
- **Cockpit:** at the pilot's eye, rolling with the aircraft. Hold the right mouse button, or press V, to turn the head (about 150 degrees either side, up to 75 degrees up). The head eases back forward when you let go.

The cockpit is decking, twin guns and an instrument panel, built in code. They are placed so that the guns sit just below the line of sight and the whole panel fits on screen with the 60-degree field of view. The near clipping distance drops from 1 m to 0.05 m in the cockpit only.

**Why:** These are the three views in the brief. Rendering never touches the physics. The pilot's eye positions are estimates (AIRCRAFT_DATA.md).

**Mouse:** while looking around or in free-look, the mouse moves the view instead of the stick. The right button looks around even when the mouse is not captured. In free-look, the wheel zooms instead of working the throttle.

## D38. Instruments in each side's period units (Phase 2)

**Decision:** The cockpit panel shows an airspeed indicator, an altimeter, a rev counter, a compass and a slip ball. It is drawn in code on a canvas and refreshed about ten times a second.
- **Camel:** mph and feet.
- **SPAD, Dr.I and Albatros:** km/h and metres.

The outside views show the same numbers as a one-line readout (J). All the physics stays in SI units; the conversion is only in `src/ui/instrumentMath.js` (tested).

**Why:** The acceptance test must be flown without the debug panel, so the pilot needs speed, height, rpm, heading and balance. The SPAD flew with French and US units. The British units are used for the Camel only.

**Later:** period instrument layouts per aircraft come with the cockpit and UI work in a later phase.

## D39. Tyre side grip builds with the slip angle (Phase 2)

**Decision:** A wheel's sideways friction is μ × load × tanh(slip angle / 0.1 rad). The slip angle is the angle between where the wheel points and where it moves; it is measured against at least 1 m/s of rolling speed. Previously the full grip came at 0.3 m/s of sideways speed, whatever the rolling speed.

**Why:** In the browser check, a landing with a slight drift (about 1.7 m/s sideways at 20 m/s) tripped the aircraft over its wheels and onto a wingtip, even with full opposite aileron. The wheels are about 1.4 m below the centre of gravity, so a sudden full sideways grip rolls the aircraft over. Real tyres build their side force over a few degrees of slip angle. Both new values are estimates (AIRCRAFT_DATA.md).

**Test:** each aircraft lands drifting 1.5 m/s to either side, holding the wings level, and must roll out without hitting a wingtip. This test fails with the old formula.

**Still true:** with no aileron at all on the roll-out, a dropping wing can still go down to the ground. That is the realistic consequence of the wings carrying most of the weight near flying speed.

## D40. Logitech Extreme 3D Pro joystick, added to Phase 2 (checkpoint 3)

**Decision:** The product owner asked for the Logitech Extreme 3D Pro as the primary controller. The spec had joystick support in Phase 7; the product owner chose to do it now, inside Phase 2 (controls and cameras). Gamepads stay in Phase 7.

**Mapping:**
- Stick = pitch and roll (stick back = pull, as with the arrow keys). Twist handle = rudder.
- Throttle slider = throttle. It is an absolute position, but the keyboard and mouse wheel also move the throttle. So the slider only sets the throttle after it has moved (more than 3%), and a slider left anywhere at the start does not slam the throttle to that setting.
- Hat = snap views: left and right look 90 degrees, up looks 55 degrees up, down looks back over the shoulder (diagonals look 135 degrees over a shoulder). Free-look: the hat orbits.
- Trigger = fire. It is only read for now; nothing fires until Phase 4.
- Buttons: 2 camera, 3 and 4 trim down and up (held), 5 readout, 6 centre mouse stick, 7 pause, 8 restart.

**Mixing:** per axis, a held key wins; otherwise the joystick adds to the mouse stick, clamped. The twist handle gives rudder unless Q or E is held.

**Shaping (estimates):** dead zone 0.05 on the stick, 0.12 on the twist handle (twist handles are noisy), and a mild curve (0.3) that softens small movements. Adjustable on the F2 screen; they are control settings, not aircraft data.

**Why a test and learn screen (F2):** the Gamepad API reports this stick's axes and hat differently in different browsers and operating systems (the hat may be one axis with eight values, two axes, or four buttons). I could not check the real stick, so the defaults are a best guess and the hat reader accepts all three layouts. The F2 screen shows what the stick really reports, and Learn reassigns controls without changing code. The mapping is saved in the browser (key `dawnPatrol.joystick`).

**Tests:** fake devices cover the axes, hat layouts, throttle takeover, button edges, learning, saved-mapping repair and mixing. In Chrome, a fake device flew a take-off, circuit and landing. The real stick still needs the product owner's test.

## D41. Aircraft models: one builder per type, sourced shapes, famous schemes (Phase 3, checkpoint 1)

**Decision:**
- Each of the four aircraft has its own model builder in `src/render/models/`, built from the aircraft's documented dimensions: wingspan, length, height, the wing stack, propeller diameter and wheel track. About ten visual-only proportions per aircraft (chord, stagger, tailplane size, fuselage and cowling size) are in a `visual:` block in each aircraft file, with rows in `AIRCRAFT_DATA.md` marked sourced or estimate.
- Model details with no source (curves of the fuselage, strut layout, fin outline) are modelling choices, not data. Strut layouts follow the type descriptions in the sources: the Camel has one bay, the SPAD two, the Dr.I a single strut each side, the Albatros a V-strut.
- The wheels and tailskid are placed at the physics contact points (from `src/physics/ground.js`), and the propeller disc at the physics propeller plane, so a parked aircraft touches the grass where the ground model says it does. Tests check this.
- **Schemes (the product owner's choice for famous aces' schemes):** Barker's B6313 (Camel), Brooks's "Smith IV" (SPAD, the only candidate with full museum documentation), Richthofen's red 425/17 (Dr.I) and the Smithsonian D.Va 7161/17, Jasta 46 (Albatros; the pilot is unknown, so it is documented but not an ace's aircraft). Roy Brown's B7270 Camel was rejected because no source describes its colours. Every element is rated in the "Liveries" section of `AIRCRAFT_DATA.md`; elements the sources do not describe are estimates.
- Markings are flat geometry or canvas lettering, not image files, so nothing is copied from anyone's artwork.
- **Cockpit view:** the model's nose parts (cowling, hump, guns, the fuselage ahead of the eye) are hidden in the cockpit view, where the cockpit draws its own decking, guns and instruments.
- **Hangar page** (`/hangar.html`) shows the models side by side, with views and a silhouette mode, so recognisability can be judged without flying.

**Doubts recorded:** Thetford and Gray say there is now doubt that Richthofen flew a completely scarlet Dr.I. The Dr.I's production wing gaps and stagger are estimates (also in the open research gaps).

## D42. The terrain: a flat, procedural Western Front (Phase 3, checkpoint 2)

**Decision:**
- **Flat ground, all procedural.** The world is an infinite plane at y = 0 made only of pure functions of a seed and world coordinates (`src/world/`), so any piece can be built on its own and neighbouring pieces always join. The default seed is fixed; `?seed=` changes it. Physics is untouched: the ground contact model still sees a flat field.
- **Layout.** The airfield is at the origin. The front line runs north-south about 4.5 km east of it and wanders by up to about 1 km. West of it is the Allied side, east the German side. The land is farmland in rotated strips (parcels of about 70-180 m by 140-400 m in nine crop colours, with hedges and furrows), with a village about every 2.5 km joined by winding roads lined with poplars, woods from low-frequency noise, and an east-west river every 9 km with a bridge where a road crosses it.
- **The front.** Trenches follow the front line either side (front line at 80 m, support line at 260 m, reserve line at 560 m from it), each zigzagging in bays of 24 m, joined by communication trenches. Barbed wire lies 40 m in front of the front lines, craters are densest on the front line and thin out to nothing by 900 m, woods near it are shattered (few trees, mostly stumps), and villages within 1.6 km of it are ruined (no roofs, lower walls).
- **Drawing.**
  - Close 1 km tiles carry a 512-pixel ground texture painted from the layout, plus trenches (a low ribbon mesh), wire, trees and buildings (instanced low-poly shapes).
  - Coarser 2 km tiles reach farther out with a 256-pixel texture and no objects.
  - Tiles are built in small stages, a few milliseconds a frame, and freed when far away.
  - Quality levels (`?quality=low|medium|high`) set the radii and texture sizes.
- **Obstacles were visual only** at this point (product owner's decision then); reversed after the checkpoint 3 flight, see D47.

**Sources and what is estimated:**
- **Sourced:**
  - The trench system had front-line (fire), support and reserve lines joined by communication trenches (IWM, found through a search summary because the page itself returned an access error; LER Museum, "Trench System").
  - No-man's land was "perhaps 25 to 100 metres across" (LER Museum), which matches the 160 m between the two front lines here only loosely.
  - Trenches were about two metres wide and deep (LER Museum).
  - The landscape is farmland and villages, with church towers and canals (Visit Flanders Fields guide).
- **Estimates (no source found):** the spacings of the support and reserve lines, the zigzag bay length, the wire offset, crater density and size, the village spacing and size, parcel sizes, poplar spacing, and the colour palette. The sources do not give them; they are chosen to look right and are easy to change in `layout.js` and `features.js`.
- **A simplification to remember:** the Flanders battlefield has gentle relief ("ridges and low rises", the Visit Flanders Fields guide), and the Somme chalk is hillier. Flat ground was the product owner's choice for now.

**Not done yet:** clouds and the final performance pass (checkpoint 3). Tile counts are about 150 draw calls and about 300-430k triangles at Medium, which is near the planned budget; checkpoint 3 tunes it.

## D43. Moving control surfaces; throttle on axis 6 (Phase 3 / Phase 2 follow-ups)

**Control surfaces (product owner's request):** every model has hinged ailerons, two elevators and a rudder that follow the same control positions as the physics (`deflections()` of `sim.surfaces`, so the trim lever moves the elevators too) at the real travel: 25 degrees of elevator and rudder, 20 degrees of aileron.
- Roll right: the right ailerons go up and the left ones down. Pull back: the elevators' trailing edges go up. Right rudder: the rudder's trailing edge swings right.
- **Which wings have ailerons:** the Camel on both wings (S37, from Bruce); the Dr.I on the upper wing only (Herris and Phillips, S39); the SPAD and Albatros on the upper wing only (an assumption: no source found). Sizes (about half the wing's outer span, a quarter of the chord; elevators 40% of the tailplane chord) are estimates; the cut-outs in the wings are made in code.
- The fin is fixed and the rudder hinged; the Dr.I has no fin, so its whole tail outline is the rudder. Markings on a rudder move with it.
- The hangar page has buttons to move the surfaces to full travel.

**Throttle on axis 6:** the product owner found that the Extreme 3D Pro's slider is axis 6, not axis 3. The default is now 6. A saved mapping from before the change that still has axis 3 for the throttle is corrected automatically (anything chosen with Learn is kept).

**Rudder on axis 5:** the product owner then found that the twist handle is axis 5, not axis 2. Same treatment: the default is 5, and a saved mapping that still has axis 2 for the rudder is corrected automatically (mapping version 3).

## D44. Airfields and a more detailed landscape (Phase 3, checkpoint 2b)

**Why:** the product owner flew the terrain: the flying model "feels natural and realistic", the terrain "looks OK but could be more detailed", and there should be recognisable airfields with visible white triangular markers, a wind sock and a control tower.

**Airfields (`src/world/airfields.js`):**
- The start field at the origin plus more in bands behind each side of the front line (one per band per 5 km of front, kept at least 3 km apart and at least 1.2 km behind the line, off rivers). Allied fields are west of the front, German fields east. From the start, the nearest fields are Allied at 5.3 km (bearing 026), 6.7 km (202), 6.8 km (162) and 7.9 km (273), and German at 7.2 km (093), 9.0 km (123) and 9.3 km (062). F3 shows the nearest field's distance, bearing and side.
- Each field is a rotated rectangle (700-1,100 m by 300-500 m) lined up within 25 degrees of straight into a **visual wind** from 340 degrees (the physics has no wind). The start field stays north-south.
- It has pale mown ground with lengthwise stripes, **white triangular markers** (14 by 8 m) at the corners and every 80 m or less along the edges, pointing into the field and painted into the ground texture too so they show from far away, a **14 m pole with a 7 m orange-and-white sock** pointing downwind, a **14 m wooden tower** with a window band, roof and flag, three to five canvas hangars with open doors, tents, lorries, fuel drums, a worn apron and an access road to the nearest village.
- Roads are bent round landing grounds, and villages within 500 m of one are left out.

**Sources and honesty:**
- **Sourced:** WWI fields were grass; canvas Bessonneau hangars (nine at Bramham Moor, twelve at Swingate) and tents were typical (KipAero Bessonneau note; Swingate history). 
- **Tower:** the first purpose-built control tower was the timber one at Croydon in 1920 (about 15 ft tall, windows all round). So the tower is a period-style timber watch tower at the product owner's request, not a historical WWI feature.
- **Choices, not sourced:** the white triangle markers (the product owner's request), the wind sock design, sizes and layouts.

**Landscape detail:**
- **Sharper ground:** the 3x3 tiles round the aircraft use a 1,024 px texture (1 m per pixel) at Medium and High (512 px at Low); others 512 px. A tile is painted in two steps over two frames. A tiling noise texture is mixed into the ground shader at two scales (about 3 m and 48 m, fading out by 2.5 km) for soil and grass grain. Bare headlands, muddy road verges and water in about 40% of craters are painted.
- **Farms (`src/world/farms.js`):** about 0.8 per km² in open ground: a farmhouse, one to three barns round a yard, haystacks, a windbreak of trees and a track to the nearest road, all lined up with the fields; ruined within 1.6 km of the front. Post windmills facing the wind, about one per 6 km².
- **War works (`src/world/warworks.js`):** sandbags on the enemy-facing lip of the front (every 6 m) and support (every 24 m) trenches, dugout entrances on the support lines, wire posts every 5 m, gun pits 450-650 m behind each side's line, supply dumps behind the reserve lines, raised rims on craters of radius 4 m or more (cap 160 a tile), rubble round the ruined houses, and burnt trunks and stumps in the shattered woods. Trench line spacings, densities and sizes are estimates.
- **Draw calls:** all small things on a tile (house walls and roofs, hangars, sandbags, crates, sock segments, markers, rims) share a handful of instanced meshes (`src/render/terrain/batch.js`).
- **Measured** (render timing in Chrome, Medium): at most 175 draw calls and 382,000 triangles, at the front line; 97-127 draw calls and 16,000-156,000 triangles elsewhere.

## D45. Changes after the product owner's flight: trees, sizes, clouds, ground flicker (Phase 3, checkpoint 2b)

1. **No trees round the hangars.** An airfield's grounds are the landing ground plus the strip 260 m behind its upwind end (where the hangars, tents and vehicles stand), 80 m beyond the far end and 130 m to each side. No woods, roadside poplars or farm trees are put there (`inAirfieldGrounds`).
2. **No trees in buildings.** Every tile's trees (woods, poplars, farm windbreaks) are checked against the footprints of village houses and churches, farm buildings and haystacks, windmills, hangars, tents, vehicles, the tower and the wind sock (`world/obstacles.js`); any tree whose spread would reach one is removed. Tests check this near a village, a farm and several airfields.
3. **Control tower and wind sock 20% bigger:** the tower is 16.8 m tall (was 14) with every part scaled, and the sock pole is 16.8 m with an 8.4 m sock.
4. **Cumulus clouds** (`world/clouds.js`, `render/clouds.js`): one possible cloud per 2.2 km of sky (42% of cells at Medium), at random places, with a random width from 250 m to 1,750 m (mostly smallish, a few big banks), a random base from 1,300 to 2,600 m, built from 5 to about 16 overlapping puffs with a flat base and a domed top. Puffs are soft sprites painted in code, drawn as one instanced draw, sorted far to near about twice a second, melting into the haze with distance and fading as the camera flies into them. About 490 puffs at Medium (9 km radius at Low, 20 km at High). Clouds are visual only: no lift, turbulence or shadows.
5. **Ground flicker.** Suspected cause, not seen directly (the test browser cannot show flicker over time): the coarse 2 km "far" ground tiles overlapped the 1 km close tiles in the same plane, and the fallback ground was also at the same height, so the depth buffer could not tell them apart; the pattern changes with the view angle, which is why it was worst while banking. Fixes:
   - a far tile now draws only the quarters not covered by a painted close tile (and shows them again if that tile goes), so no two ground surfaces share a plane;
   - the fallback ground sits 4 m below the tiles;
   - the camera depth range is shorter (far 30 km instead of 80 km, since the haze hides everything beyond 25 km) and the near distance larger (cockpit 0.1 m instead of 0.05, chase and free-look 2 m instead of 1), which makes depth finer.
   If flicker remains, the next step is a logarithmic depth buffer (costs some speed).

## D46. Quality levels, the pixel budget and the frame-rate readout (Phase 3, checkpoint 3)

- **Quality levels** (`src/render/quality.js`) set how far the detailed ground reaches (3x3, 5x5 or 7x7 close tiles), how far the coarse tiles reach (4, 7 or 10 km), the ground texture sizes, tree density, how far trees, buildings and trenches are built, how many clouds there are, and the pixel budget. **Press L while flying** to cycle Low, Medium and High; the choice is remembered in the browser. `?quality=low|medium|high` in the address overrides it. Medium is the default.
- **Pixel budget:** a retina screen at 1080p would otherwise draw four times the pixels. The picture is drawn with at most 1,000,000 pixels at Low, 2,100,000 (about 1920 x 1080) at Medium and the screen's own resolution (at most twice normal) at High. The screen is scaled up smoothly to fill the window. A small window is never scaled up, and the ratio never goes below 0.5. Example: a 1728 x 1117 retina window at Medium is drawn at about 1.04 times, not 2 times.
- **F3 overlay** now shows frames per second (the last 120 frames), the "1% low" rate (the slowest frame of the last 120, so one hitch shows), the worst frame in the last two seconds, draw calls and triangles for the last frame, the quality level, the pixels drawn and the ratio, and how many ground tiles exist and how many are still being built.
- **Sky** (`src/render/sky.js`): the colours, sun, light, haze and cirrus strength are in one data object (`SKY`), ready for a time-of-day setting later. A high, thin **cirrus layer** (wisps drawn out along the wind) is added in the sky shader at no texture cost.
- **Budget and measurements** (render timing in Chrome with the pixel cap on, a 2560 x 1288 window drawn at 2043 x 1028; the test browser pauses animation in hidden tabs, so these are direct render timings, not frame rates): at most about 150 draw calls and 240,000 triangles at Medium in the places measured (earlier worst case: 382,000 triangles at the front line); about 100 draw calls at Low; the first full load of Medium takes under a second and later ground arrives a few milliseconds a frame. The target is steady 60 frames per second at 1080p on the product owner's machine; **that has to be read off F3 on that machine**.


## D47. Trees and buildings are solid; flat fallback ground (Phase 3 follow-up)

Reverses the "visual only" decision in D42/D44 at the product owner's request ("the aircraft should crash when landing or flying through trees and buildings").

- **Rule:** any hit point of the aircraft inside a solid ends the flight through the existing crash path ("CRASHED: Hit a tree - press R"). There is no damage model yet (Phase 4); the crash is all-or-nothing, like hitting the ground.
- **Solid:** conifers and poplars (cones on a trunk), broadleaf trees (rounded canopy on a trunk, clear air under it), stumps and burnt trunks (thin cylinders), village houses and churches (walls, gabled roof, tower and spire), farmhouses, barns, haystacks, windmills (body, roof and sails), hangars, tents, lorries, the control tower (four legs, cabin, roof) and the wind sock pole. **Not solid:** sandbags, wire posts, rubble, bridges, crater rims, the sock cloth (small or low, and not asked for). The shapes are approximations of the drawn models, a little generous at roofs and eaves (eaves overhang by half a metre).
- **Hit points** (`src/physics/hitpoints.js`, about 25 per aircraft, from the aircraft data files): propeller hub and four blade tips, fuselage top, every wing level's tips (front and rear) and centre leading edge, tailplane tips, tail end, fin top, wheels and tailskid. Tested every 120 Hz step, now and halfway back to the previous step, so a 0.9 m pole cannot be skipped at 60 m/s.
- **Where it lives:** `src/world/solids.js` (pure shapes and `SolidIndex`, a 40 m grid); the terrain registers exactly the trees and structures it draws, per tile and per stage, and removes them when the tile goes, so what you can hit matches what is on screen at the current quality (Low has fewer trees). `Simulation.solidAt(x, y, z)` is an optional hook set by `main.js`; the physics never imports the world.
- **Measured:** about 10 microseconds per physics step with about 6,700 solids loaded (under 0.2% of a frame).
- **Start field:** landing grounds have no trees or buildings (D45), so take-offs and landings are unaffected. The start field's three hangars and tents stand on the centre line 560-590 m south of the field's middle, behind the south end. **Landing from the south (heading north) a low approach crosses the hangars (9 m high); land heading south, or clear them.** Product owner to decide whether to move them off the centre line.
- **Ground flicker, second part:** the fallback ground (visible beyond the coarse tiles, 7 km at Medium) was a 256 px checker repeated every 150 m, which aliases into shimmer at the horizon. It is now one flat colour, the average of the crop colours (`averageCropColour`), 4 m below the tiles. Airfield marker triangles lifted from 0.06 m to 0.1 m. If flicker remains, the next step is a logarithmic depth buffer.
- **Product owner's answers:** hangars stay where they are (land heading south or clear them); crash strictness stays as is (a wheel on a treetop ends the flight); Phase 3 signed off.

## D48. Weapons data and sources (Phase 4, checkpoint 1)

- Gun, cartridge and sight data are in `src/aircraft/weapons.js`; each aircraft file has a `guns` block (type, rounds per gun, muzzle position). Every value has a row in the "Weapons" section of `AIRCRAFT_DATA.md` (new sources S40-S45) and `tests/weaponsData.test.js` checks the code against it.
- **Sourced:** Vickers cyclic rate 450-550 per minute (middle, 500); LMG 08/15 450 (400-500 when synchronised); .303 Mk VII bullet 174 grains at about 2,400 ft/s; 7.92 mm at 2,821 ft/s; belt sizes 250 (Camel), 400 (SPAD), 500 (Dr.I, prototype figure). The standard **G1 drag table** (79 points, published, copied unchanged).
- **Estimates, each with its reason in the data file:** bullet form factor (so the ballistic coefficient), 7.92 mm bullet mass, Albatros belt (copied from the Dr.I), gun positions, propeller blade width at the guns, synchroniser margin, jam chance (1 in 400), time to clear (3 s) and clearing success (70%), tracer spacing.
- **Not found (listed as gaps):** which interrupter gear each aircraft used (except the Camel), measured synchronised rates, fuel tank sizes, strength limits. The Royal Armouries and IWM catalogue pages could not be opened, so two sources are read from search-result summaries only (marked in the source list).
- Guns are parallel to the thrust line (no convergence), so the nose must be pointed with the drop in mind; the gun sight mark shows where a bullet lands at 200 m.

## D49. The synchroniser (Phase 4, checkpoint 1)

The propeller's turning angle is followed from the engine speed the flight model reports. A round may leave only when no blade covers the muzzle (the blade's width at that radius plus a margin each side). Each gun fires at its cyclic rate when it can and otherwise waits for the next gap, so the real rate is a little below the gun's rate and falls with engine speed, and no round ever goes through the disc. The angle is checked eight times a physics step, and a round that left earlier in the step is carried on that far. Tested: never above the cyclic rate, exactly the cyclic rate with the propeller between blades, no rounds with a blade stopped in front, and every shot checked at the moment it leaves.

## D50. Ballistics and hit detection (Phase 4, checkpoint 1)

- Bullets step at the 120 Hz physics rate with the midpoint method: deceleration = air density x speed squared x G1 drag (at the Mach number from the same atmosphere as the flight model) x pi / (8 x ballistic coefficient). A 20-times-finer step changes the position by less than 3 cm after 0.6 s.
- **Numbers (with the estimated form factor):** the .303 bullet takes about 0.30 s and drops about 0.41 m over 200 m, and 0.64 s and 1.83 m over 400 m, arriving at 530 m/s. Thinner air at 5,000 m means less drag.
- **Hit boxes** (`src/weapons/zones.js`): engine, fuel tank, pilot, fuselage, each wing on each side (every level of a biplane or triplane), tailplane and fin, as boxes in the aircraft's own axes from its documented dimensions. Struts and wires are not modelled.
- **A bullet's step is a line,** tested against the boxes at the aircraft's pose at the start and end of the step, so a bullet 6 m a step cannot jump through a 0.4 m wing and a crossing target is not missed. The earliest of ground, tree or building, and aircraft wins, so a wood shields what is behind it.

## D51. Targets, the fight module and the controls (Phase 4, checkpoint 1)

- **Targets are full `Simulation`s** (same flight model, same control inputs) flown by a scripted pilot: straight, a 20 degree circle or a weave of up to 25 degrees. They fly at 65% of their top speed so the player can catch up, hold their height and speed, and never pull into a stall (found necessary for the heavy Albatros). They do not shoot back. Enemies are the other side's aircraft; up to three, 450 m ahead, 90 m apart.
- **Shot down:** at checkpoint 1 this was a count of weighted hits; checkpoint 2 replaced it with real component damage (D52).
- **`src/game/combat.js`** owns the guns, bullets and targets so `main.js` does not grow. Bullets are drawn as camera-facing ribbons (every third round is a tracer), strikes as sparks, dust or chips.
- **Keys:** Space fires (held), B clears a jam, N brings a new target. Joystick: trigger fires, button 9 clears a jam. A sight mark (pipper) is drawn where a bullet lands at 200 m; not in the original plan, but without it aiming is guesswork.
- **Cost:** each target model adds about 50 draw calls (three targets: 146 to 308 calls in my measurement); to be read off F3 on the product owner's machine.

## D52. Component damage (Phase 4, checkpoint 2)

- **State** (`src/physics/damage.js`), one per aircraft, kept on its `Simulation`: left and right wing, engine, fuel tank (leak), pilot, tailplane, fin, the three control cables, and the fuel left. Each part is 0 (sound) to 1 (destroyed). Hits add `energy / reference energy / hits-to-destroy`, so a harder hit hurts more; all the numbers are estimates in `damageModel.js` with reasons in `AIRCRAFT_DATA.md` ("Damage model").
- **Bullets go through fabric to the vital parts:** a bullet passes through wings, tail and fuselage (hurting each, keeping 75% of its energy per part, up to four parts) until it meets the engine, fuel tank or pilot, which stop it. Without this, fire from astern only ever hit the tail. Fire from straight astern kills a pilot in about half a second of exact aim (3 hits); that is how it fell out, and the hit counts can be changed.
- **Effects on the flight model** (`flightModel.js`; with no damage the results are bit-for-bit what they were, and a test checks this for all four aircraft):
  - *Wings:* each wing loses up to 60% of its lift (all of it once it fails) and gains drag. The roll is the lost lift times the lever arm of a half wing's lift (4/(3 pi) of the half span, elliptical loading), and the drag difference yaws the nose toward the damaged side. A stalled aircraft drops the damaged wing first. Measured: a half-damaged right wing gives 15 to 20 degrees a second of roll and about 25 to 31 degrees of bank in 2 s hands-off, and the pilot needs about a fifth of the stick (Camel) to hold it level; a failed wing gives more than 30 degrees a second.
  - *Engine:* power falls to 15% less at full damage and goes to nothing when it seizes. A seized engine drags like a locked propeller disc and loses its gyroscopic effect. A target with a seized engine counts as shot down.
  - *Fuel:* burns with power (0.40 kg per kWh) and leaks through a holed tank (empty in 45 s); at zero the engine stops and the propeller windmills. The aircraft's mass does not change with fuel (a simplification). **No fire is modelled.**
  - *Pilot:* wounded means less and slower control; dead means the controls stay where they were and the guns stop ("PILOT KILLED - press R" on the banner; the aircraft flies on). A killed target tumbles instead.
  - *Tail:* a hurt tailplane or fin gives less elevator or rudder (down to a fifth) and halves the stability.
  - *Cables:* a cut cable leaves its surface where it was.
- **Structure** (spec section 4): beyond the limit load (ultimate load / 1.8) the wings take damage at up to 0.25 per second, and at the ultimate load a wing breaks off at once. Beyond the never-exceed speed (equivalent airspeed, so altitude helps) they take damage, and 25% beyond it a wing breaks. Ultimate loads (Camel 6, SPAD 7, Dr.I 7, Albatros 5.5 g) are **estimates**: the only real figure found is 7.92 for the Dr.I prototype (Weyl). Ordinary flying (a minute of 45 degree turns) never damages anything, but a full pull-up at top speed does.
- **Visuals:** engine smoke and fuel spray (puffs), a broken wing or tailplane is cut off by a clipping plane (`render/damageView.js`), and a cut cable leaves the control surface drawn stuck.
- **F4 test panel** has buttons to hurt your own aircraft. F3 shows each damaged part, the fuel and the worst load factor.
- **Product owner's answers:** keep the structural limits as the spec says; leave the pilot kill at 3 hits; the estimated fuel and strength figures are accepted for now.

## D53. Phase 4 finish (checkpoint 3)

- **Status line:** shows both belts (with JAMMED, CLEARING, EMPTY), the fuel left, a warning for each kind of damage to your own aircraft (ENGINE DAMAGED / SEIZED, FUEL LEAK, OUT OF FUEL, WING FAILED, TAIL FAILED, CABLE CUT, PILOT WOUNDED / KILLED), and targets up and shot down.
- **End-to-end test** (`tests/engagement.test.js`): for each of the four aircraft a scripted pilot flies the real flight model up behind a slower enemy, puts the gun sight on it and fires; the target must be shot down within 60 s with a sensible number of rounds and hits. This checks the guns, ballistics, hit boxes, damage and the target's own flying together.
- **Not changed on purpose** (product owner: no more adjustments): target speed, shoot-down toughness, three-target cap, the structural limits and the estimated figures.
- **Left for later phases:** enemy fire and dogfighting AI, gun convergence, fire, fuel mass, rebinding of the fire and clear-jam keys (Phase 7 controls), a cockpit rounds counter (the status line shows it in every view).

## D54. AI pilots: agents, perception and the pilot's hands (Phase 5, checkpoint 1)

- **No cheating by construction.** An AI aircraft is an `Agent` (`src/game/agents.js`): a full `Simulation` of the same aircraft data the player flies, stepped by the same flight model, with the same damage, structural limits and `ControlInput` (pull, roll, yaw, throttle, trim, fire). The brain only chooses the inputs. Tests check that the aircraft data object is the same one, the inputs have only the player's controls within their ranges, and speed, load and wing damage stay inside the aircraft's limits.
- **Skills are design choices, not historical data** (`src/aircraft/aiData.js`; nothing in `AIRCRAFT_DATA.md`). Reaction time 0.6 / 0.35 / 0.15 s (Novice / Regular / Ace), share of the structural limit load it will pull 0.70 / 0.88 / 1.0, sight range 2 / 3 / 4 km, patrol height 1,200 / 1,500 / 1,800 m and speed 70 / 75 / 80% of top speed. **Drone** keeps the Phase 4 scripted target (it never fights). The numbers are first guesses to be tuned by flying against them.
- **Perception** (`src/ai/perception.js`): other aircraft are recorded 30 times a second and the brain is given the record from one reaction time ago (so a Novice sees a 50 m/s aircraft about 30 m behind where it is), and only within sight range. It reads its own aircraft's state directly. Geometry helpers give range, closing speed, and how far an aircraft is off my nose, off my tail, pointing at me, and whether I am on its tail (used by the fighting states next).
- **The pilot's hands** (`src/ai/steering.js`): given a wanted direction, speed and load share it works out the sideways force needed (proportional to the angle, plus holding the aircraft up), rolls the lift toward that direction with the roll loop the Drone already used, pulls to the load factor with a small PI controller plus pitch-rate damping (gains scaled up at low speed, tuned on all four aircraft; a first version oscillated), keeps the turn coordinated from the sideslip, and holds speed with the throttle. Safety nets any careful pilot has: never ask for more than 88% of what the wing can lift (and push the stick forward at the first sign of a stall); ease a climb off when the engine cannot hold the speed (speed first, height second); flatten a dive near the never-exceed speed; and climb away below 150 m, from a dive that would reach it within 3 s, or from trees and buildings ahead when below 60 m.
- **Patrol:** a circuit of 1,500 m radius round where the player was when the enemy appeared, aiming 0.9 rad ahead round the circle, at the skill's height and speed; the enemy notices the player when he is within sight range (shown in F3). The fighting states come in checkpoint 2.
- **Keys:** `N` new enemy (up to four), `[` and `]` change the skill of new enemies (Drone, Novice, Regular, Ace), `Y` practice mode (enemy fire cannot hurt you); `?enemies=3&skill=ace` in the address sets an air start. The default skill is Drone, the Phase 4 behaviour, until the AI fights.
- **Combat now handles many shooters:** every agent has its own gun belts, bullets carry their owner and never hit it, and the player is a possible victim (damaged by the same `applyHit`, unless practice mode is on). Nobody but the player fires yet.

## D55. AI pilots that fight (Phase 5, checkpoint 2)

- **States** (`src/ai/brain.js`): patrol -> engage when an enemy is within sight range; engage -> attack inside 900 m with the enemy in front; attack or engage -> evade when an enemy is on its tail (inside 500 m, within 29 degrees of its tail, nose pointing at it) and it knows (it always knows after being hit; otherwise it notices with the skill's rear awareness: Novice 25%, Regular 60%, Ace 95% a second); any fighting state -> disengage when it has under 10% of its ammunition, under 12% fuel, or damage at the skill's limit (Novice 0.8, Regular 0.55, Ace 0.4: the better pilot saves his aircraft); disengage flies away toward its own side (Germans east, Allies west) in a shallow dive for 25 s, then back on a new patrol circuit. Enemies never aim at their own side and ignore a player who has crashed.
- **Aiming** (`src/ai/aiming.js`): the lead solution uses the game's own bullet physics (a table of flight time and drop, then two corrections by flying the shot with the real bullet), so against a target flying straight on it is within 0.5 m at up to 400 m. The pilot's error is a slow random wander (1 sigma: Novice 2.0, Regular 1.0, Ace 0.4 degrees). It fires in bursts (Novice 0.8 to 2.2 s, Ace 0.4 to 1.1 s) only when the nose is within its fire cone (Novice 4.3, Regular 2.9, Ace 2.3 degrees) and inside its firing range (280 / 330 / 400 m). It clears jams itself.
- **Fine aim:** steering by banking (the method of checkpoint 1) is good for big turns but could not hold the nose on a target: an Ace's nose swung 5 to 15 degrees either side of the aim point. In the last 7 degrees the pilot now holds the wings near level and puts the nose on with rudder and elevator, as a WWI pilot would; it holds the aim within about 2 degrees. It falls back to banking beyond 13 degrees, near the ground or when diving fast.
- **Energy and safety:** it closes at up to 25 m/s faster than its target, settling about 150 m behind; it eases its turn when slow, and when slow or below 450 m it stops fighting and extends (flies straight to build speed, then climbs). Steering never asks more than the skill's share of the limit load (Novice 68%, Regular 82%, Ace 92%) and takes an overshoot off at once; it pulls out of any dive that nears 88% of the never-exceed speed. These were found necessary in tests (AI pilots bent their own wings in steep dives).
- **The player can be shot:** hits use the Phase 4 damage model; "You are hit!" appears (at most every 2 s) and "YOU WERE SHOT DOWN BY ..." when it is fatal. **Practice mode (Y)** counts the hits but does no damage. F3 shows hits on you.
- **The default skill of new enemies is now Regular** (product owner agreed); `[`/`]` still reach Drone.
- **Measured:** 4 Ace pilots cost about 0.07 ms per physics step (under 1% of a frame). A Regular or Ace Dr.I shoots down a Camel drone in tests; the Albatros is less effective (it flies near its stall speed behind a slow drone).
- **Not yet good:** two AI pilots of equal skill fighting each other often end in a long, drawn-out fight; the brain does not yet choose manoeuvres by energy (checkpoint 3).
- **Product owner's answer:** the difficulty levels are OK as they are.

## D56. Manoeuvres, tactics and skill (Phase 5, checkpoint 3)

- **Manoeuvres** (`src/ai/manoeuvres.js`): climbing turn (turn toward an enemy above while climbing), Immelmann (half loop up, half roll out: reversed, higher, slower), split-S (half roll, half loop down: reversed, lower, faster, throttle closed so it does not overspeed), boom-and-zoom (dive on an enemy below, firing on the way, then zoom-climb away), plus the defensive break and break-away of checkpoint 2. Each is a script over the same steering, so the safety nets (stall, ground, dive speed, load) still apply. Tested on all four aircraft.
- **Choosing** (`src/ai/tactics.js`) by energy height (height + speed squared / 2g) against the enemy's: well above with energy to spare, an Ace dives on him; an enemy well above is approached in a climbing turn; after a head-on pass (flying apart, the enemy's nose away) it reverses with an Immelmann if fast, else a split-S if high; never in the middle of a turning fight. An enemy on its tail: a pilot who knows the split-S and has height uses it 30% of the time instead of the break. After a manoeuvre it waits 8 s before another.
- **The Albatros does not try the Immelmann:** its top speed is only 1.8 times its stall speed (the others about 2.4), and in tests it fell out of the loop. The rule is a speed of at least 2.1 times the stall speed.
- **Repertoire by skill:** Novice: break, turning fight, climbing turn. Regular: also Immelmann and split-S. Ace: also boom-and-zoom. Regular and Ace lead a turning target (they allow for its turn, judged from what they saw a quarter of a second apart); a Novice leads as if it flew straight. Close in, a pilot fires if the shot would pass within 6 / 4.5 / 3.5 m (Novice / Regular / Ace) of the target.
- **Turning fight:** the energy rules are judged against a fighting speed (75% of top speed), not the higher speed it wants for closing in (otherwise even an Ace eased its turn and could not out-turn a Novice), and with the enemy within 450 m it never flies straight to rebuild speed. With the target well off the nose it turns at the full load it allows itself.
- **Skill measured:** against Camel drones flying a weave or a straight path (four starts each, three minutes), a Dr.I flown by an Ace shot down 16 of 18 in a larger run, a Regular 11, a Novice 1; the test (`tests/aiSkill.test.js`) checks Ace > Regular > Novice.
- **Known issue (accepted by the product owner):** two AI pilots who both fight back mostly circle for minutes without a kill, at every pairing of skills. Fighting the player or a drone they shoot and kill. A deeper dogfighting redesign (energy fighting, lag pursuit) is left for a later polish phase.
- **An agent whose wing, tail, engine or pilot fails for any reason** (for example wings shot through and then overstressed in the dive that follows) now counts as down, not as a crash.
- **Product owner's answer:** Phase 5 passes the acceptance test.

## D57. Menus, missions and results (Phase 6, checkpoint 1)

- **Flow** (`src/game/flow.js`): main menu, mission setup, options, flying, paused, results, with only the sensible moves allowed (no flying straight from the menu; options returns to where it was opened). The screens (`src/ui/screens/`) are plain page elements over the 3D view, styled like a squadron order sheet (cream card, serif type), built in code with no assets.
- **Mission settings:** your aircraft; enemy aircraft (one type of the other side, or mixed); 0 to 4 enemies (0 = free flight); skill (Drone, Novice, Regular, Ace); start (on the airfield, or in the air at 1,000, 2,000 or 3,000 m); time of day. Remembered in the browser; bad saved values fall back to the defaults.
- **Where the enemy is** (`src/game/mission.js`): in an air start the AI patrols round the player at the start height (an Ace 300 m above, a Novice 300 m below); in an airfield start it patrols 4 km toward the front (east for an Allied player, west for a German one), so the player takes off and goes to find it; drones fly ahead as before. In a mission, enemies are only removed when 12 km away.
- **A mission ends** on: all enemies down (victory) or gone without a loss (the enemy withdrew), 4 s later so the player can watch; the player shot down (pilot killed, a wing, the tail or the engine finished) or crashed, 4 s later; landing and stopping (under 2 m/s) on a landing ground of the player's own side after having flown (a safe return), 1 s later; or End mission from the pause menu. The results show the outcome, time, enemies shot down, rounds fired, hits and accuracy, hits taken, damage and fuel used.
- **Pause:** Esc or P (or the joystick's pause button) opens the pause menu: Resume, Restart mission, Options, End mission, Quit to main menu. With mouse flying on, the first Esc also releases the mouse (the browser's rule).
- **Behind the menus** the player's aircraft stands on the airfield in the chosen light; the physics does not run while a menu is up. The keys help appears only in flight.
- **Times of day** (`src/render/sky.js`): dawn (sun low in the east, warm and dim), day (as before), dusk (sun low in the west, orange). Sky, haze, sun, sky light and cloud colour all change. Design choices, not sourced.
- **Options:** sound volume (used in checkpoint 3), graphics quality, modern HUD on/off (checkpoint 2), practice mode.
- **Development only:** number keys and Shift+number quick starts, N, `[`/`]`, F4 test panel, `?seed=`, `?enemies=`, `?skill=`. R restarts the mission in any build; Y toggles practice mode.
- **Code:** `main.js` now only builds the page and runs the loop; the flight on screen is `src/game/session.js`.
- **Product owner's answers:** the cream screens are OK; with an airfield start the enemy stays about 4 km away over the front; the results should carry a ranking (D58).

## D58. Career points and period ranks (Phase 6, checkpoint 1)

- **Points for a mission** (`src/game/career.js`): each enemy shot down by its skill (Drone 5, Novice 20, Regular 35, Ace 60), half a point per percent of accuracy if at least 20 rounds were fired, and the ending (safe return +30, victory +20, the enemy withdrew +5, shot down -40, crashed -30). Practice mode earns nothing and is not recorded. Design choices: landing safely is worth the most, because a pilot who comes home fights again.
- **The career** adds up points, victories, missions and losses, remembered in the browser, separately for an Allied and a German pilot (the ranks differ). Points never go below zero.
- **Ranks** at 0, 150, 400 and 900 points: Second Lieutenant, Lieutenant, Captain, Major (Royal Flying Corps / Royal Air Force); Leutnant, Oberleutnant, Hauptmann, Rittmeister (German air service; Richthofen's rank was Rittmeister). The names are period ranks; the thresholds are design choices. "Ace" at five victories, the common usage of the time.
- The results screen shows how the points were earned, the career total, the rank, victories, and a promotion or "now an Ace" line; the main menu shows each side's rank and record.


## D59. 3D cockpits, period instruments and the modern HUD (Phase 6, checkpoint 2)

**Why 3D cockpits.** Checkpoint 2 first gave each aircraft a flat, drawn instrument board. The product owner asked for realistic cockpits. The pictures they had saved were screenshots of commercial flight simulators, which cannot be used (no copyrighted assets), so they chose a detailed 3D cockpit built entirely in code (`src/render/cockpit/`), shaped after museum photographs and the reference pictures they chose (S47, S51, S52, S53; used as visual guides, nothing copied). It replaced the flat board. The outside models stay low-polygon; the cockpit is the exception to the spec's "not photorealistic", at the product owner's request. Each cockpit was then reviewed and adjusted by the product owner, aircraft by aircraft; the result is below.

**How it is built.**
- Data per aircraft in `src/aircraft/cockpits.js` (the opening and rim, decking and hump, panel, guns' breeches and mounts, sights, windscreen, stick, throttle, colours); instruments in `src/aircraft/panels.js`. Visual estimates, with the panel rows in AIRCRAFT_DATA ("Cockpit panels").
- Textures made in code from seeded noise (wood, plywood, stitched leather, doped linen, gunmetal, the Vickers' slotted and the Spandau's perforated jackets, worn paint), each with a bump map. Physically based materials reflect a small picture of the sky in the time of day's colours (`environment.js`).
- On Medium and High quality the sun casts real shadows in the cockpit (a small shadow box that follows the aircraft); Low leaves them off.
- The model's fuselage is split round the cockpit and that section is hidden from the seat; the cockpit draws its own walls, frames, floor, rim and decking in its place.
- The cockpit view is a little wider (65 degrees) and the picture is shifted down (a lens shift, so the eye still looks straight along the guns), so the instrument panel shows at the bottom of the screen.
- Gauges are 3D (case, bezel, live dial face, glass); the stick and throttle move with the controls.

**Common to all four.**
- A narrow padded brown leather rim runs round the opening and arches across the front over the panel, clear of every dial; it follows the fuselage's edge where the opening is wider than the body. No leather crash pads.
- In the cockpit view you aim with the guns' own sights; the drawn gun-sight circle shows only in the outside views. Windscreens have no frame along their top edge, which lay across the view above the sight.
- The pilot's eye sits a little above the top of the guns (the guns were aimed by sighting along them) and far enough back to see the whole panel; each aircraft's eye position is an estimate in AIRCRAFT_DATA.
- A soft light bounced up from the fields (`bounce` in scene.js; pale cream, weaker at dawn and dusk) lights surfaces facing down, so wing undersides show their colours in shade (the Camel's cream, the Dr.I's red); and wing colours are applied face by face, so an underside does not blend into the upper surface's colour. This applies to every aircraft, inside and out.
- The ammunition chutes under the feed blocks are dark metal.

**Per aircraft.**
- **Camel:** the Smithsonian layout (S47): rev counter, compass, airspeed (mph), altimeter (feet), tank air pressure, switches, oil pulsator, on a plywood board under the gun hump. The guns' height was corrected to the top of the cowling (0.645 m; the old 0.56 put the barrels inside the nose), so the barrels lie on top of the nose like the SPAD's; the hump covers the breeches and dies away ahead of them. A small windscreen above the guns and a ring-and-bead sight. Its oil pulsator glass tucks 5 mm under the rim's side (signed off as it is).
- **SPAD XIII:** cream-lettered French dials, with the product owner's lettering: RPM, KM/HR (in the upper half of the airspeed dial) and an altimeter drawn after the French L. Hatot altimeter in the Smithsonian (S51: one turn for 5,000 m, a mercury pressure scale, a knurled setting knob). A single small windscreen above the guns (a two-pane screen in front of them washed them out), green decking, a ring-and-bead sight. In the cockpit view only, its upper wing is drawn shorter from the front (92% of its depth) so that from the seat it ends as far above the sight line as the Camel's, with no sky above it; its struts there have twins that reach into the shortened wing. The flight model and hit boxes are unchanged.
- **Fokker Dr.I:** laid out as a photograph of a flying replica (S52) with old-style German instruments in place of its modern ones, in the product owner's order: fuel gauge (small), altimeter (large; figures 0, 0.5 … 4.5 thousand metres, short hand once round per 5,000 m, long hand per 500 m), airspeed (large), rev counter (small); the compass centred just above the altimeter and airspeed and a slip indicator centred below them, on a varnished wooden panel. The guns stand on light-grey steel posts with a cross bar, 0.17 m each side of centre on top of the cowling (0.59 m; 0.52 had been inside it), each with a ring sight (3.85 cm) and no centre sight. A padded leather cushion block covers the rear of each breech (product owner). Red metal decking with a bolted strip, filler cap and fitting. The cockpit was widened 10% (the fuselage-width estimate 0.62 → 0.68 m, which also widens the outside model and the fuselage's hit box). The Rise of Flight layout (S53: a steel bulkhead, the rev counter between the guns) was tried and replaced; its leather pads on the breeches were kept.
- **Albatros D.V:** the same panel as the Dr.I's (product owner): the same instruments in the same places on the same varnished wood. The period evidence (S49, S50: a rev counter, petrol, oil and tank-pressure gauges, a clock and compass, the airspeed on the strut, no altimeter) stays in AIRCRAFT_DATA. A small windscreen and a ring-and-bead sight.
- **Noses:** the Camel's, Dr.I's and Albatros's are widened 10-20% ahead of the cockpit so they broaden toward the engine as the SPAD's does (they looked too narrow); only the models' shape changes, not the width the hit boxes use.

**Instruments.**
- Dial styles: British (brass bezels, R.P.M., AIR SPEED, HEIGHT), French (nickel bezels, French words) and German (steel bezels, U/min, BENZIN, HÖHE, km/h), all black faces with cream figures; design choices from period photographs in general.
- Instruments the physics does not drive follow display rules (`instrumentBehaviour.js`): fuel from the tank; tank air and fuel pressure fall when the tank is holed and stop with the engine; oil pressure follows engine speed and drops with damage; the pulsator pulses with the engine; the SPAD's water temperature rises with power and damage; the clock starts at 07:00.
- The slip indicator (new) is a curved glass tube, low in the middle, with a ball that rolls to the side the aircraft is slipping to (to the low wing in a slip, to the outside of a skid; right rudder alone sends it left). The Phase 2 slip-ball function had the sign the wrong way round and its test had captured that; both were corrected.
- Two-hand altimeters now space their ten figures evenly round the whole dial (they had been spread over 324 degrees with an eleventh beside the 0, so the hands did not point at the right figures).

**The modern HUD** (`src/ui/hud.js`, numbers in `hudMath.js`) is off by default and turned on with **U** in flight or in Options. It shows speed and height in the aircraft's own units, climb rate, g, a heading tape, the elevator trim (a short scale, nose up at the top, with a marker and "TRIM 25% UP" / "NEUTRAL" / "DOWN"; added in checkpoint 3 at the product owner's request), throttle, fuel, rounds and jams, damage, and a box on each enemy with its type and distance, or an arrow at the screen's edge pointing toward one off screen. Green, like a modern head-up display: clearly not period, which is why it is optional. While it is on, the old status line is hidden. The Options screen shows the current settings each time it opens, so U and Y pressed in flight are reflected there.

## D60. Sound (Phase 6, checkpoint 3)

- **All made in code** with the Web Audio API (`src/audio/`): no sound files, so no licences to track. The settings are in `src/aircraft/sounds.js`; they are design choices to sound right, not measurements, and are expected to be tuned by ear.
- **The engine's pitch is its firing rate.** A four-stroke cylinder fires once every two turns, so the firing frequency is crankshaft rpm / 60 × cylinders / 2 (the Camel's nine-cylinder Clerget: about 94 per second at 1,250 rpm). Cylinder counts are documented per aircraft. The SPAD's propeller is geared down (0.75), so its crankshaft speed is the propeller's divided by that. The voice is a waveform of the firing frequency and its overtones, made rough and uneven for the rotaries (a random wander and a pulse at the crankshaft's own speed) and smoother and deeper for the inlines, through a filter that opens with the throttle. Loudness follows the throttle and engine speed; when the engine stops only the windmilling propeller's swish is left.
- **Wind** is filtered noise whose loudness follows dynamic pressure (the square of the airspeed, less in thin air) and whose brightness rises with speed; the bracing wires hum above 35 m/s.
- **Guns:** a short clip (a crack of filtered noise and a low thump) for each round actually fired, so synchronised fire sounds as uneven as it is; the Vickers is a little lower and fuller than the Spandau. The player's guns peak at four times the engine's loudness at full throttle, with a longer, fuller report, and their clips are saturated so a shot carries far more sound for its peak (over its first 50 ms about five times the engine's average loudness; before saturation a shot that dies away fast carried only about 1.4 times, which is why the earlier increases still sounded soft) (product owner: "50% louder", then "much louder" twice). Saturating a low thump made the shot boom too deep ("the pitch has dropped too low"), so the pitch was raised: the crack moved to 3.6 kHz (Vickers) and 4.3 kHz (Spandau), the thump to 170 and 200 Hz with a smaller share, lifting the sound's centre from about 260 Hz to 1.6 kHz (Vickers) and from 500 Hz to 2.4 kHz (Spandau). Doubling every gun frequency was tried and rejected ("they sound like pop guns"), so the 3.6 / 4.3 kHz settings stand. And the master limiter sits just below full scale (-1 dB) so it does not flatten them.
- **Enemies:** the nearest four engines are heard within 2.5 km, from their direction (left/right), quieter (1/distance) and duller (high notes lost with distance) the farther they are, their pitch raised as they close and lowered as they go away (Doppler). Their gunfire is heard up to 3 km and arrives late at the speed of sound (343 m/s, about 3 s per km).
- **Being shot at:** an enemy bullet passing within 10 m cracks (its shock wave), a hit on the player thuds, and a crash crunches. The fight keeps its own list of sound events (`combat.sounds`), separate from the visual effects list.
- **Mix and controls:** the steady sounds together stay below full scale, and a limiter just below full scale catches the rest. The Options volume sets the level and **M** mutes or unmutes (not remembered between sessions). Sound fades out when paused and in the menus. Browsers allow sound only after a click or key press, so it starts on the first one (the main menu provides it).
- **Trim keys are Page Up (nose up) and Page Down (nose down)**, with T / G kept (product owner, Phase 6; they were Home / End, and End did not work on the product owner's Mac). On a Mac, Page Up and Page Down are fn+Up and fn+Down; the keys are read by name so they trim instead of moving the stick, and an arrow with the Fn flag set is read the same way. The F3 screen shows the last key received.
- **Product owner's answer:** Phase 6 passes the acceptance test (a full mission from the menu to the results and back without reloading).

## D61. Rebinding keys and joystick buttons (Phase 7, checkpoint 1)
- **One list of actions** (`src/input/bindings.js`) for every key the player can change: the stick, rudder, throttle, trim and guns (held) and the one-shot commands (camera, look, HUD, readout, help, quality, pause, restart, mute, practice, invert pitch, centre the mouse stick, mouse sensitivity, clear a jam). Two keys per action. The defaults are the keys the game already had, so nobody's habits change.
- **A key does one thing.** Giving a key to an action takes it from wherever it was, and the screen says which action lost it, rather than refusing or silently keeping both. The same for joystick buttons.
- **Fixed keys:** Esc (pause, menus, cancel), F2 / F3 / F4 (joystick test, debug, test panel), Tab, Command and the other F keys (the browser uses them) cannot be assigned. The development quick starts (numbers, N, [ ]) are fixed but give way to a key the player has assigned.
- **Joystick buttons can carry any one-shot command**, doing exactly what its key does (one handler table, `pressAction` in `keyboard.js`). fire and the two trim buttons stay held actions. A button can be unassigned (null). Mapping version 4 keeps everything the player learned before; the old name "centre" became "recentre".
- **Saved in the browser** (`dawnPatrol.keys`, `dawnPatrol.joystick`), cleaned on load so a corrupt copy can never break the controls; a key or button used twice keeps its first use.
- **The help (H) and messages are written from the player's own keys and buttons.** F2 stays as the quick live test overlay; the Controls screen is the full set-up.

## D62. Auto-rudder, stall / G / overspeed warnings and the structural damage switch (Phase 7, checkpoint 2)
- **Off by default** (the spec: assists off in Realistic mode); structural damage on by default. All four are on the Options screen and saved with the other options. Chosen by the product owner: the G warning comes with a separate switch to turn structural damage off, and warnings are shown on screen and sounded.
- **Auto-rudder works through the same controls.** It only sets the rudder input before the physics step, so the flight model is untouched and the AI is unaffected (player only). The pilot's own rudder (beyond 0.02) overrides it at once. Settings in `src/aircraft/assists.js`.
- **How it works, and why (revised after the product owner found yaw oscillations in hard manoeuvring).** The first version only steered the sideslip to zero (a PID on sideslip). It reacted after the slip had built up and, through its summed part and the rudder's travel time, a little late each time, so in hard reversals it pushed the swings on: about 1.7 times as many side-to-side slip swings as flying without it. Now the main part is a **yaw damper**: rudder against the nose swinging faster or slower than a balanced turn at this bank needs (g sin(bank) cos(pitch) / speed). Next, a small **lead with the roll** (rudder the way the aircraft rolls, against adverse yaw, as a pilot uses stick and rudder together). The **sideslip** part is halved and reads a smoothed sideslip. Its summed part stops building while rolling faster than 0.5 rad/s. It uses at most 70% of the rudder in the air and **lets go in a stall**, where rudder only feeds a spin. Measured in hard reversals (60-degree bank each way every 3 s, stick held back) in all four aircraft: slip swings 70 in all against 78 without auto-rudder (the first version: 133), less time stalled in all, and steady turns within 0.14 degrees of sideslip.
- **Gains follow airspeed.** The rudder bites with dynamic pressure, so the sideslip gains are scaled by (45 m/s / speed)^2, and the damper and roll lead by 45 m/s / speed. A fixed gain made the Camel and Dr.I hunt at high speed.
- **On the ground it damps the swing itself** (rudder per rad/s of yaw rate), from the moment the aircraft rolls. The rotaries' swing starts below 5 m/s, where sideslip means little; without this the Dr.I still ground-looped.
- **Warnings use the aircraft's own documented limits:** the wing's stall angle (as the lift curve uses it), and the structure's limit load (ultimate load / 1.8, where damage starts) and never-exceed speed (equivalent airspeed), exactly as the structural damage does. Design choices: the stall warning 2 degrees early and not below 15 m/s or on the ground; amber caution from 85% of the limit load and 95% of the never-exceed speed; red when damage is happening. Cautions are shown, not sounded; the stall horn (700 Hz square wave, 4 pulses a second) and the damage buzzer (260 Hz, 10 a second) sound. The tone is at level 0.05 so the steady mix still cannot clip.
- **Shown in its own box** at the top centre (below the HUD's heading tape) in every view, so it works with the period cockpit too. These aircraft had no such devices; the warnings are clearly game aids.
- **Structural damage off** skips only the g and speed damage in `stepDamage`; fuel, bullets and everything else are unchanged. Career points are not changed by it (only practice mode changes points).
