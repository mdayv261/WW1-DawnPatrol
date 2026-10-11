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
