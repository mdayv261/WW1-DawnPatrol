# Flight Model Validation

Date: 11 Oct 2026. Regenerate the result tables with `npm run validate`; the checks run in `npm test` (`tests/physics/validation.test.js`).
This supersedes the first check in `FLIGHT_MODEL_CHECK.md`, which is kept as the "before" snapshot.

## Summary

- **41 sourced checks** across the four aircraft, at each source's own weight, power and altitude. Four are calibration points: each aircraft's drag (CD0) is fitted to one sourced top speed, so those match by construction.
- **Of the 37 independent checks, 25 pass** the tolerances (top speed within 5%, climb and ceiling within 15%). The other **12 are known deviations**, each explained below and marked in the test as an expected failure with its reason. With the Phase 1 model, about 13 of the same 37 were within tolerance.
- **The shared physical cause of the climb error** has three parts, all taken from sources and none fitted to targets:
  1. Biplane and triplane induced drag (Prandtl's multiplane theory, NACA TN-182). The model had treated each aircraft as a single wing.
  2. Measured propeller efficiency against advance ratio (Durand and Lesley, NACA Report 30). The guessed curve was too pessimistic at climb speed.
  3. A realistic loss of engine power with altitude (Virginia Tech notes, the Gagg and Farrar law). The old rule lost too little power, which had hidden part of the error.
- **Two data errors were found and fixed.**
  - The Dr.I's "103 mph" is its speed at 4,000 m, not at sea level (Thetford and Gray; Green and Swanborough). The model had been calibrated as if it were a sea-level speed, which made the Dr.I's drag far too high. This was the biggest cause of its 25% climb shortfall.
  - The Camel is now calibrated to Mason's 117 mph at sea level, a figure with a stated altitude and weight, instead of the USAF Museum's 112 mph with no altitude.
- **Peak lift now matches CLmax exactly**, as the stall-angle test checks. Stall speeds fell by about 8%, to 42-52 mph.
- **Still unresolved:** no sourced stall or landing speeds exist for any aircraft. The SPAD test aircraft's engine is uncertain. The German aircraft climb too slowly above about 4,000 m against the manufacturer-derived tables.
- **Spin check made stricter:** only the Camel holds a steady spin. The other three enter a spin and then recover by themselves. This was true before these changes as well, but the old test missed it.

## What changed in the model

| Change | Source | Effect |
|---|---|---|
| Induced drag and lift slope use Prandtl's multiplane factor kappa, computed from each aircraft's wing spans and gaps | S29 (NACA TN-182, equations 3, 5, 6, 7, 9, 10) | Camel kappa 0.774, SPAD 0.785, Albatros 0.789, Dr.I 0.815 (its lower wings are shorter, so less benefit). Induced drag about 20% lower. |
| Propeller efficiency follows the measured curve (mean of propellers 1-4, Table III), peak 0.79 | S30 (NACA Report 30) | Efficiency at climb speed about 0.70 instead of 0.62. |
| Engine power = sea-level power x (1.132 sigma - 0.132) | S31 (VT AOE 3104 notes) | Power at 3,000 m is 0.71 of sea level instead of 0.74. |
| Stall centre placed so the curve's peak equals CLmax | Internal consistency | Stall angle about 23-28 degrees past zero lift; stall speeds about 8% lower. |
| CD0 re-fitted to one sourced top speed per aircraft, at that source's conditions (`npm run calibrate`) | S22, S17, S24, S25 | Camel 0.036 (unchanged), SPAD 0.039, Dr.I 0.0356 (was 0.043), Albatros 0.0602. |
| Static thrust fix | Bug found during the work | The measured efficiency curve is zero at zero speed, which made thrust zero when stationary. Fixed and tested. |

The plan's diagnosis used trial factors (0.80 biplane, 0.70 triplane, peak efficiency 0.78). The sourced values came out at 0.77-0.79 for the biplanes, 0.815 for the triplane, and 0.79 peak efficiency. The triplane benefit is much smaller than the trial value. The Dr.I improvement comes mostly from correcting its top-speed altitude and from the propeller curve.

## Method

The `src/physics/performance.js` model uses the classic excess-power method. At each speed it finds the angle of attack that holds level flight at full throttle, and the spare thrust times speed, divided by weight, gives the steady climb rate. The best climb rate is found by a search over speed, from 2% above the stall speed upward, at each 250 m of altitude. Climb time is the integral of height divided by climb rate, so it ignores acceleration and pilot technique. Service ceiling is where the best climb rate falls to 0.508 m/s (100 ft/min). Top speed is the fast side where the spare thrust reaches zero. Stall speed is the 1 g speed at which the wing's peak lift equals weight.

Each case is flown at its source's own weight and power (`src/aircraft/validationCases.js`). For example, the SPAD McCook test case is flown at 924 kg, King's Camel at 672 kg, and the Albatros D.V case at 160 hp.

## Results: before (Phase 1 model) and after

### Sopwith Camel F.1

| Case (source) | Quantity | Sourced | Before: simulated | Before: diff | After: simulated | After: diff | Result |
|---|---|---|---|---|---|---|---|
| camel-mason (S22) | Top speed at 0 m | 52.3 m/s (117 mph) | 49.9 m/s (112 mph) | -4.5% | 52.3 m/s (117 mph) | +0.0% | calibration |
| camel-mason (S22) | Top speed at 3048 m | 50.5 m/s (113 mph) | 47.9 m/s (107 mph) | -5.1% | 50.3 m/s (113 mph) | -0.3% | pass |
| camel-mason (S22) | Climb to 3048 m | 10 min 35 s | 13 min 06 s | +23.8% | 10 min 37 s | +0.3% | pass |
| camel-mason (S22) | Service ceiling | 5791 m | 5928 m | +2.4% | 6583 m | +13.7% | pass |
| camel-king (S23) | Top speed at 3048 m | 46.7 m/s (104 mph) | 47.7 m/s (107 mph) | +2.2% | 50.2 m/s (112 mph) | +7.5% | known deviation |
| camel-king (S23) | Top speed at 4572 m | 43.6 m/s (97 mph) | 45.5 m/s (102 mph) | +4.4% | 48.3 m/s (108 mph) | +10.8% | known deviation |
| camel-king (S23) | Climb to 3048 m | 11 min 45 s | 13 min 42 s | +16.6% | 11 min 00 s | -6.4% | pass |
| camel-king (S23) | Climb to 4572 m | 23 min 15 s | 26 min 47 s | +15.2% | 20 min 36 s | -11.4% | pass |
| camel-king (S23) | Service ceiling | 5486 m | 5751 m | +4.8% | 6443 m | +17.4% | known deviation |
| camel-green (S24) | Top speed at 1981 m | 51.4 m/s (115 mph) | 48.8 m/s (109 mph) | -5.0% | 51.3 m/s (115 mph) | -0.3% | pass |
| camel-green (S24) | Climb to 1981 m | 6 min 00 s | 7 min 29 s | +24.9% | 6 min 08 s | +2.3% | pass |

### SPAD S.XIII

| Case (source) | Quantity | Sourced | Before: simulated | Before: diff | After: simulated | After: diff | Result |
|---|---|---|---|---|---|---|---|
| spad-mccook (S17) | Top speed at 1981 m | 59.2 m/s (132 mph) | 58.1 m/s (130 mph) | -1.9% | 59.2 m/s (132 mph) | +0.0% | calibration |
| spad-mccook (S17) | Climb to 1981 m | 6 min 30 s | 6 min 26 s | -0.9% | 5 min 10 s | -20.5% | known deviation |
| spad-mccook (S17) | Climb to 4572 m | 23 min 00 s | 22 min 20 s | -2.9% | 16 min 56 s | -26.4% | known deviation |
| spad-mccook (S17) | Service ceiling | 5608 m | 5798 m | +3.4% | 6451 m | +15.0% | known deviation |
| spad-mccook (S17) | Absolute ceiling | 6096 m | 6342 m | +4.0% | 6955 m | +14.1% | pass |
| spad-usaf (S5) | Top speed at 0 m | 60.4 m/s (135 mph) | 60.0 m/s (134 mph) | -0.5% | 60.8 m/s (136 mph) | +0.7% | pass |

### Fokker Dr.I

| Case (source) | Quantity | Sourced | Before: simulated | Before: diff | After: simulated | After: diff | Result |
|---|---|---|---|---|---|---|---|
| dr1-green (S24) | Top speed at 0 m | 51.4 m/s (115 mph) | 45.7 m/s (102 mph) | -11.1% | 51.4 m/s (115 mph) | +0.0% | calibration |
| dr1-green (S24) | Top speed at 4000 m | 45.8 m/s (103 mph) | 40.6 m/s (91 mph) | -11.5% | 47.3 m/s (106 mph) | +3.2% | pass |
| dr1-thetford (S27) | Climb to 1000 m | 2 min 54 s | 4 min 15 s | +46.4% | 3 min 14 s | +11.5% | pass |
| dr1-thetford (S27) | Service ceiling | 6096 m | 4510 m | -26.0% | 5504 m | -9.7% | pass |
| dr1-herris (S26) | Climb to 1000 m | 2 min 54 s | 4 min 00 s | +38.0% | 3 min 05 s | +6.6% | pass |
| dr1-herris (S26) | Climb to 2000 m | 5 min 30 s | 9 min 06 s | +65.5% | 6 min 54 s | +25.3% | known deviation |
| dr1-herris (S26) | Climb to 3000 m | 9 min 18 s | 16 min 05 s | +72.9% | 11 min 47 s | +26.7% | known deviation |
| dr1-herris (S26) | Climb to 4000 m | 13 min 54 s | 27 min 03 s | +94.6% | 18 min 33 s | +33.4% | known deviation |
| dr1-herris (S26) | Climb to 5000 m | 21 min 54 s | 54 min 16 s | +147.8% | 29 min 26 s | +34.4% | known deviation |
| dr1-herris (S26) | Service ceiling | 6000 m | 4752 m | -20.8% | 5700 m | -5.0% | pass |
| dr1-aviodrome (S7) | Climb rate at 0 m | 5.70 m/s | 4.39 m/s | -22.9% | 5.68 m/s | -0.3% | pass |

### Albatros D.V

| Case (source) | Quantity | Sourced | Before: simulated | Before: diff | After: simulated | After: diff | Result |
|---|---|---|---|---|---|---|---|
| albatros-dva-herris (S25) | Top speed at 0 m | 47.8 m/s (107 mph) | 48.1 m/s (108 mph) | +0.7% | 47.8 m/s (107 mph) | -0.0% | calibration |
| albatros-dva-herris (S25) | Climb to 1000 m | 4 min 00 s | 4 min 24 s | +9.9% | 3 min 37 s | -9.5% | pass |
| albatros-dva-herris (S25) | Climb to 2000 m | 8 min 48 s | 10 min 05 s | +14.5% | 8 min 11 s | -7.1% | pass |
| albatros-dva-herris (S25) | Climb to 3000 m | 14 min 47 s | 18 min 04 s | +22.2% | 14 min 16 s | -3.5% | pass |
| albatros-dva-herris (S25) | Climb to 4000 m | 22 min 45 s | 31 min 27 s | +38.2% | 23 min 23 s | +2.8% | pass |
| albatros-dva-herris (S25) | Climb to 5000 m | 35 min 00 s | 92 min 18 s | +163.7% | 41 min 33 s | +18.7% | known deviation |
| albatros-dva-herris (S25) | Service ceiling | 5800 m | 4465 m | -23.0% | 5064 m | -12.7% | pass |
| albatros-dv-herris (S25) | Top speed at 0 m | 47.2 m/s (106 mph) | 47.1 m/s (105 mph) | -0.2% | 47.0 m/s (105 mph) | -0.5% | pass |
| albatros-dv-herris (S25) | Climb to 1000 m | 4 min 20 s | 4 min 44 s | +9.2% | 3 min 52 s | -10.6% | pass |
| albatros-dv-herris (S25) | Climb to 2000 m | 8 min 50 s | 10 min 56 s | +23.7% | 8 min 47 s | -0.5% | pass |
| albatros-dv-herris (S25) | Climb to 3000 m | 14 min 30 s | 19 min 50 s | +36.8% | 15 min 27 s | +6.6% | pass |
| albatros-dv-herris (S25) | Climb to 4000 m | 22 min 40 s | 35 min 40 s | +57.4% | 25 min 41 s | +13.3% | pass |
| albatros-dv-herris (S25) | Climb to 5000 m | 35 min 00 s | n/a | n/a | 48 min 23 s | +38.2% | known deviation |

"Before" is the committed Phase 1 model with its own drag calibration. The Albatros D.V 5,000 m climb could not be reached at all.

## Known deviations (expected failures, with reasons)

The product owner accepted these on 11 Oct 2026, to stay documented rather than tuned.

| Case | What happens | Why it is not tuned away |
|---|---|---|
| Camel, King (S23): top speeds and ceiling | Model is 7.5% and 10.8% faster than King's speeds and 17% above his ceiling | King's speeds are about 8% below Mason's (S22) for the same engine, at a weight only 2% heavier. No model can match both. The model matches Mason within 0.3% at 10,000 ft. |
| SPAD, McCook (S17): climbs and service ceiling | With 220 hp the model climbs 21-26% too fast and its ceiling is 15.0% high | The test aircraft's engine is uncertain. The report title says "220 h.p. Wright engine", while the article text describes the 197 hp 8Ba. Re-fitting the drag with 197 hp makes every SPAD check pass (climbs -9% and -13%, ceilings +8%, USAF speed +3.8%). Choosing the engine that passes would be fitting to the target. **Product owner decision (11 Oct 2026): keep 220 hp** until the original McCook report is found. |
| Dr.I, Herris (S26): climb to 2,000-5,000 m | Model is 25-34% slower above 1,000 m | This is Fokker's own type-description data, and it is internally inconsistent. It implies the second kilometre was climbed faster (6.4 m/s) than the first (5.7 m/s), which an unsupercharged engine cannot do. The model matches the same source's 1,000 m time (+7%), the independent Thetford and Gray 1,000 m time (+12%), the Aviodrome climb rate (-0.3%) and both ceilings (-5% and -10%). |
| Albatros D.Va and D.V, Herris (S25): climb to 5,000 m | Model is 19% and 38% slower to 5,000 m, though within 13% up to 4,000 m | The source gives the same 35 min for both versions despite their different engines and weights, which is suspicious. The real cause may also be engine-specific: the D.IIIa's over-compressed versions held power better at altitude (S14). That needs engine altitude data (see gaps). |

## Spin behaviour

- **Before:** the Phase 1 test checked the yaw rate at a single instant, 16 s.
- **Now:** the test checks a window from 12 to 20 s.
  - The Camel holds a steady left spin at 2.8-3.8 rad/s, 100% stalled.
  - The SPAD, Dr.I and Albatros start rotating, then recover by themselves.
- **Scan:** I tried small changes to the shared stall and spin parameters. None gave steady spins for the other three, so the parameters were left unchanged.
- **Unchanged:** all four aircraft still recover from a spin and from a stall, and all still drop a wing at the stall.

## Why the Albatros drag coefficient is high (0.060)

The Albatros's fitted CD0 is about 60% above the other three (drag area 1.26 m² against 0.67-0.82 m²), despite its streamlined fuselage. Investigated on 11 Oct 2026; **kept as is by product owner decision (D30)**.

- **CD0 is a catch-all.** It is fitted so the model reaches one sourced top speed (Herris: 172 km/h, 170 hp, 937 kg). Any shortfall in thrust, or any doubt about the test conditions, appears as extra drag.
- **The altitude of the speed figure matters most.** It is not stated and was taken as sea level. If it was measured at 1,000 / 2,000 / 3,000 / 4,000 m, CD0 would be 0.057 / 0.054 / 0.050 / 0.045.
- **More engine power raises the fitted CD0.** At 180 hp it is 0.064, and at 200 hp 0.072. Weight and propeller diameter make almost no difference.
- **Herris's climb table supports a high value.** With CD0 0.060 the D.Va climbs match within -10% to +3% up to 4,000 m. Lower values (0.050, or 0.043 from an uncited 186 km/h figure) make the model climb 15-22% too fast.
- **Likely causes (not proven):**
  - Herris's figures may be conservative, or measured at altitude.
  - The model assumes every propeller is equally well matched; the Albatros's slow-turning direct-drive propeller may have been less efficient.
  - Real drag sources such as the exposed cylinder heads and the radiator (qualitative only). The water-cooled SPAD fits at 0.039, so water cooling alone does not explain it.
- **Engine power check.** Sourced D.IIIa ratings are 170 hp (Herris, probably German metric hp, about 168 hp), 174 hp at 1,400 rpm (S14), and 180 hp (S3, and The Vintage Aviator). The high-compression D.IIIaü was rated 180-200 hp. The 170 hp in the calibration case is therefore at the low end. The 160 hp in the D.V case is correct for its D.III engine.

## Questions answered

- **Do the two Dr.I top speeds come from different altitudes?** Yes. 185 km/h is at sea level, and 165 km/h (103 mph) is at 4,000 m (Green and Swanborough; Thetford and Gray). The USAF Museum's 103 mph is the 4,000 m figure. The model now gives 51.4 m/s at sea level (the calibration point) and 47.3 m/s at 4,000 m, which is +3.2%.
- **Sourced climb data:** found for all four aircraft (Mason, King, Green and Swanborough, Herris, Thetford and Gray, and the McCook test).
- **Sourced stall and landing speeds:** none found from acceptable sources. Web listings give Camel "48 mph" and Dr.I "72 km/h" with no source, and they were not used. The model's 1 g stall speeds are Camel 44 mph, SPAD 49 mph, Dr.I 42 mph and Albatros 52 mph: about 8% and 6% below those unverified listings. That cannot be validated.

## Sources added

S22-S32 in `AIRCRAFT_DATA.md`:
- Mason; King; Green and Swanborough; Herris (two volumes); Thetford and Gray; Grosz, Haddow and Schiemer. All were read through flyingmachines.ru transcriptions, so they are rated medium.
- Prandtl, NACA TN-182, and Durand and Lesley, NACA Report 30. Both scanned reports were read page by page.
- Virginia Tech AOE 3104 notes.
- This Day in Aviation's Camel article, for the wing geometry.

Two items were not used because they could not be verified: a "Weyl, Fokker: The Creative Years" Adlershof test extract, and the web stall speeds.

## Remaining gaps that would improve this

The table "Open research gaps" in `AIRCRAFT_DATA.md` lists them. The most useful are:
- sourced stall speeds;
- the McCook SPAD engine;
- the production Dr.I and Albatros D.V wing gaps, which are currently taken from related types;
- engine power against altitude for these specific engines;
- printed copies of the transcribed book tables.


## Early War aircraft: Fokker E.IV and Nieuport 11 (phase E1, 18 Oct 2026)

**The sources are fewer and weaker than for the Late War four, and they conflict.**
- No E.IV survives, and no museum record of either aircraft was found. Every figure comes from reference books read through transcriptions (S54-S60), so all are medium at best.
- The E.IV's top speed (160 km/h, in three books) has no altitude; it is taken as sea level, as for the Albatros.
- The Nieuport's three top speeds disagree by 7%.
- Only the engines come from museum records of original engines (S61, S62).

**Method:** unchanged. One calibration point per aircraft fixes its drag; every other figure is an independent check at the same tolerances (top speed 5%, climb and ceiling 15%).
- E.IV: 160 km/h at sea level, 724 kg, 160 hp.
- Nieuport 11: 162 km/h at 2,000 m, 480 kg (Davilla and Soltan).

**The Late War results are unchanged.** `tests/physics/lateWarFrozen.test.js` checks that their tables match, character for character, the copy saved before this work began (`tests/fixtures/validation-baseline-late-war.md`).

### Fokker E.IV

| Case (source) | Quantity | Sourced | Simulated | Diff | Tolerance | Result |
|---|---|---|---|---|---|---|
| e4-herris (S54) | Top speed at 0 m | 44.4 m/s (99 mph) | 44.4 m/s (99 mph) | -0.0% | ±5% | calibration |
| e4-herris (S54) | Climb to 1000 m | 3 min 00 s | 2 min 42 s | -10.0% | ±15% | pass |
| e4-herris (S54) | Climb to 2000 m | 8 min 00 s | 6 min 01 s | -24.7% | ±15% | KNOWN DEVIATION |
| e4-herris (S54) | Climb to 3000 m | 15 min 00 s | 10 min 17 s | -31.5% | ±15% | KNOWN DEVIATION |
| e4-herris (S54) | Climb to 4000 m | 25 min 00 s | 16 min 08 s | -35.4% | ±15% | KNOWN DEVIATION |
| e4-weyl (S56) | Climb to 2000 m | 7 min 00 s | 6 min 01 s | -13.9% | ±15% | pass |
| e4-weyl (S56) | Climb to 3000 m | 15 min 00 s | 10 min 17 s | -31.5% | ±15% | KNOWN DEVIATION |
| e4-weyl (S56) | Climb to 4000 m | 28 min 30 s | 16 min 08 s | -43.4% | ±15% | KNOWN DEVIATION |
| e4-thetford (S55) | Service ceiling | 4115 m | 5755 m | +39.9% | ±15% | KNOWN DEVIATION |
| e4-green (S55) | Service ceiling | 4500 m | 5741 m | +27.6% | ±15% | KNOWN DEVIATION |

### Nieuport 11

| Case (source) | Quantity | Sourced | Simulated | Diff | Tolerance | Result |
|---|---|---|---|---|---|---|
| n11-davilla (S58) | Top speed at 2000 m | 45.0 m/s (101 mph) | 45.0 m/s (101 mph) | +0.0% | ±5% | calibration |
| n11-davilla (S58) | Climb to 2000 m | 8 min 30 s | 7 min 59 s | -6.0% | ±15% | pass |
| n11-davilla (S58) | Climb to 3000 m | 15 min 00 s | 13 min 43 s | -8.6% | ±15% | pass |
| n11-davilla (S58) | Service ceiling | 5000 m | 5491 m | +9.8% | ±15% | pass |
| n11-green (S59) | Top speed at 0 m | 46.4 m/s (104 mph) | 46.2 m/s (103 mph) | -0.3% | ±5% | pass |
| n11-green (S59) | Climb to 3000 m | 15 min 00 s | 13 min 43 s | -8.6% | ±15% | pass |
| n11-thetford (S59) | Top speed at 0 m | 43.4 m/s (97 mph) | 46.2 m/s (103 mph) | +6.6% | ±5% | KNOWN DEVIATION |
| n11-thetford (S59) | Climb to 1000 m | 5 min 00 s | 3 min 34 s | -28.5% | ±15% | KNOWN DEVIATION |
| n11-thetford (S59) | Climb to 2987 m | 18 min 00 s | 13 min 38 s | -24.3% | ±15% | KNOWN DEVIATION |
| n11-thetford (S59) | Service ceiling | 5486 m | 5491 m | +0.1% | ±15% | pass |

### Summary: 20 sourced checks, two of them calibration points

- **Nieuport 11: 7 of 9 independent checks pass.**
  - Davilla and Soltan: all checks pass.
  - Green and Swanborough: both checks pass. Their sea-level speed (167 km/h) is matched within 0.3%, independently of the calibration.
  - Thetford's RNAS figures: the speed and both climbs are slower than the other two books, so they are known deviations (a source conflict, like King against Mason for the Camel). His ceiling matches.
- **Fokker E.IV: 2 of 9 independent checks pass** (the 1,000 m climb, and Weyl's 2,000 m).
  - At the sourced 160 hp rating, the model climbs 25-43% faster than every source and its ceiling is 28-40% too high.
  - The books say the Oberursel U.III gave less than its rating in service:
    - low compression and poor feed, losing revs at height (Weyl);
    - "lacked the reliability or flexibility" of the smaller rotaries (Thetford and Gray);
    - Boelcke reported the climb "inadequate" above 3,000 m (Weyl).
  - None gives a figure. A check (not used) shows that an effective 120 hp, with the drag re-fitted to the same top speed, would match every climb and ceiling within 10%, Thetford and Gray's ceiling aside (+20%).
  - **Product owner decision (18 Oct 2026): keep the sourced 160 hp** and document the seven checks, as was done for the SPAD's engine.
  - Consequence in play: the E.IV out-climbs the Nieuport (3,000 m in 10.3 min against 13.7), the reverse of what Boelcke reported.
- **The E.IV's fitted drag is high** (CD0 0.096, drag area 1.54 m²). Like the Albatros's, it absorbs any shortfall of the engine below its rating at the calibration speed.

### Handling checks (`tests/physics/earlyWar.test.js`, `behaviour.test.js`)

- **E.IV roll (wing warping):** about 46 degrees per second at cruise, against 72-88 for the Albatros, the Nieuport and the Camel. In a fast dive it rolls only about 15% faster, where the aileron aircraft roll about 60% faster, because the pilot can no longer hold full warp. Every warping value is an estimate. The first set gave 26 degrees per second, which the product owner found too heavy after a test flight; it was lightened (18 Oct 2026).
- **E.IV pitch (all-moving tail):** pitches about 25% faster for the same stick than the Albatros.
- **Stalls:** both new aircraft stall within 1 to 3 seconds, drop a wing and recover.
  - **The E.IV must not be held stick-forward.** Its strong all-moving elevator and near-neutral stability bunt it over into an inverted stall (angle of attack about -150 degrees) if the stick stays forward as the speed builds. Eased back to trim once the wing flies, it recovers within about 5 s. The test uses that technique for the E.IV and checks the bunt-over happens when it does not. This fits Thetford and Gray's "continual vigilance"; no source describes the E.IV's stall itself.
- **Spins:** both recover, as the spec requires.
  - The Nieuport recovers within 14 s in both directions.
  - The E.IV's left spin takes up to 40 s to recover, about three times longer than any other aircraft.
- **Corrected estimate:** a first estimate of the E.IV's weathercock stability (0.05, lower for having no fixed fin) left it unable to recover from a stall. It was inconsistent with the Dr.I, which also has a rudder and no fin and uses 0.08, so it was set to 0.08.
- **Nieuport ground handling:** at full power from a standstill it does not nose over as the other five do. It only just lifts its tail, and the engine torque rolls it onto a wingtip first. This depends on undercarriage estimates; it is a known issue (PROGRESS.md).
