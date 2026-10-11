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
- **Obstacles are visual only** (product owner's decision): flying through trees and buildings does nothing yet.

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

