# Progress

Read this at the start of every session.

## Current status: Phase 0 complete, waiting for product owner sign-off

Phase 1 has not been started and will not start until Phase 0 is confirmed.

## Phase 0: Foundations and research (11 Oct 2026)

### Done
- Vite, Three.js and Vitest set up with pinned versions (see D1 in DECISIONS.md).
- `npm run dev` shows a placeholder scene: blue sky fading to haze at the horizon, a sun, and a green patchwork ground.
  Checked in Chrome with no console errors.
- Fixed 120 Hz physics loop (`src/core/fixedStepLoop.js`) with 8 automated tests. Nothing uses it for physics yet; it runs empty each frame.
- Architecture plan written: modules, data flow, fixed time step, units and frames (D2 to D6).
- Aircraft research for all four aircraft recorded in `docs/AIRCRAFT_DATA.md`: 17 sources, 20 to 25 rows per aircraft,
  each with a unit, a source and a confidence rating.
- `tests/aircraftData.test.js` (27 tests) checks that rule automatically, so the acceptance condition cannot quietly break.
- `npm test`: 35 of 35 pass. `npm run build`: succeeds.
- Folder renamed `Docs/` to `docs/` (D10). First git commit made.

### How the aircraft data stands (plain English)
- **Solid (high):** sizes and empty weights for the Camel, SPAD and Albatros come from Smithsonian records of real aircraft. Clerget 9B and Oberursel engine sizes are well documented.
- **Fair (medium):** all four Dr.I figures (no original aircraft survives, so these are from reproductions), most top speeds and ceilings (sources rarely say at what altitude), and some engine ratings (sources disagree by about 10 hp).
- **Estimates:** the aerodynamic numbers the flight model needs (drag, lift limit, wing efficiency, moments of inertia, rotating engine mass). No period measurements were found.
  I worked them out from documented top speeds and said exactly how in the table. They are starting points to tune in Phase 1 and should not be quoted as history.
- **Not found (left blank on purpose):** the list at the bottom of AIRCRAFT_DATA.md. The most important for Phase 1: which way each rotary engine spins,
  propeller sizes, stall speeds, and engine power at altitude.

### Known issues
- The 8Be power, weight and size figures come from a Smithsonian record titled "Model 8 Ca" (same 220 hp rating). Rated medium.
- The SPAD flight-test figures (speed at altitude, climb times) are for an earlier 200 hp engine. They are recorded as a floor, not an exact match.
- Smithsonian's `si.edu` pages blocked automated reading with a bot check, which I did not bypass. The same museum records were read through `airandspace.si.edu`, except where listed in AIRCRAFT_DATA.md.
- The AIAA paper on Museum of Flight WWI fighters (Eberhardt, 2005) looked like the best source for drag and efficiency figures, but its text could not be reached. Worth getting a copy.
- Production build warns that the bundle is over 500 kB. This is just Three.js and is not a problem.

### Left to do
- Your sign-off on Phase 0.
- Nothing else in Phase 0.

## How to check Phase 0 yourself

1. In Terminal, in the project folder, run `npm run dev`, then open the address it prints (normally http://localhost:5173).
2. You should see a blue sky getting paler toward the horizon, a bright sun glow, and a green patchwork ground running to the horizon with haze in the distance. Nothing moves.
3. Resize the window. The picture should stay undistorted.
4. Press F12, open Console. There should be no red errors.
5. Run `npm test`. Expect "35 passed".
6. Open `docs/AIRCRAFT_DATA.md` and skim a couple of aircraft sections. Check that every row has a source and a confidence, and that estimates say why.

## Decisions I need from you

1. **Engines for the other two aircraft.** I assumed Oberursel UR.II 110 hp for the Fokker Dr.I and Mercedes D.IIIa for the Albatros D.V. OK, or do you want something different?
2. **Albatros D.V or D.Va?** The only original with museum figures is a D.Va (almost identical). I used its dimensions for the D.V. OK?
3. **Before Phase 1, do you want a research top-up?** Phase 1 (the flight model) will work with the estimates, but the open gaps (engine spin direction, propeller sizes, stall speeds) matter a lot for the
   Camel's famous handling. Options: (a) start Phase 1 now and tune the estimates against documented behaviour, or (b) spend one more session on those gaps first. I recommend (a) for engine direction and propeller sizes only, which I can look up as Phase 1 begins,
   and tuning the rest.

## Phase list
- Phase 0: Foundations and research. Done, awaiting sign-off.
- Phase 1 onward: not started. (Phase 7 includes gamepad and joystick support per the spec.)
