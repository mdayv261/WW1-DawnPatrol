# Aircraft Data

Research record for the four first-release aircraft. Compiled in Phase 0 (11 Oct 2026).
All values are stored in SI units. The original figure and unit from the source are kept beside it.

## How to read this file

- **Source** column holds source IDs (S1, S2 …) from the list below. Estimates use `ASSUMPTION`.
- **Confidence**
  - `high`: two or more independent sources agree, or a museum record of an original aircraft or engine gives it.
  - `medium`: one source, or sources of reproductions or secondary compilations, or sources disagree
    slightly (the disagreement is written in Notes), or the figure belongs to a close variant.
  - `estimate`: not found in any source. Reason and method are in Notes. Phase 1 must tune these.
- **Rule:** nothing is filled silently. Anything not found is listed under "Open research gaps"
  at the bottom with no value. `tests/aircraftData.test.js` checks every row below.
- Wikipedia and forums were not used as sources. Wikipedia pages surfaced in searches but their numbers were ignored.

## Chosen variants (confirmed with the product owner on 11 Oct 2026)

| Aircraft | Variant modelled |
|---|---|
| Sopwith Camel F.1 | Clerget 9B 130 hp |
| SPAD S.XIII | Hispano-Suiza 8Be 220 hp |
| Fokker Dr.I | Oberursel UR.II 110 hp (default; USAF Museum also lists the Le Rhône 110 hp) |
| Albatros D.V | Mercedes D.IIIa. Dimensions come from the Smithsonian D.Va (stronger wing, otherwise near-identical) |

## Sources

| ID | Source | URL | Type |
|---|---|---|---|
| S1 | Smithsonian NASM, Sopwith F.1 Camel (B6291, Clerget 9B) | https://airandspace.si.edu/collection-objects/sopwith-f1-camel/nasm_A20170105000 | Museum record, original aircraft |
| S2 | Smithsonian NASM, SPAD XIII "Smith IV" (A19200001000) | https://airandspace.si.edu/collection-objects/spad-xiii-smith-iv/nasm_A19200001000 | Museum record, original aircraft |
| S3 | Smithsonian NASM, Albatros D.Va (D.7161/17, A19500092000) | https://airandspace.si.edu/collection-objects/albatros-dva/nasm_A19500092000 | Museum record, original aircraft |
| S4 | National Museum of the USAF, Sopwith F-1 Camel fact sheet | https://www.nationalmuseum.af.mil/Visit/Museum-Exhibits/Fact-Sheets/Display/Article/197401/sopwith-f-1-camel/ | Museum fact sheet, reproduction built 1974 |
| S5 | National Museum of the USAF, SPAD XIII C.1 fact sheet (S/N 16594) | https://www.nationalmuseum.af.mil/Visit/Museum-Exhibits/Fact-Sheets/Display/Article/197399/spad-xiii-c1/ | Museum fact sheet, original aircraft |
| S6 | National Museum of the USAF, Fokker Dr. I fact sheet | https://www.nationalmuseum.af.mil/Visit/Museum-Exhibits/Fact-Sheets/Display/Article/197402/fokker-dr-i/ | Museum fact sheet, reproduction (no original survives) |
| S7 | Aviodrome (Netherlands), Fokker Dr-I collection page | https://www.aviodrome.nl/en/collection/fokker-dr-1 | Museum page (original or replica not stated) |
| S8 | Museum of Flight (Seattle), Sopwith Camel F.1 reproduction (NX6330) | https://www.museumofflight.org/aircraft/sopwith-camel-f1reproduction | Museum page, 1979 reproduction |
| S9 | Museum of Flight, SPAD XIII reproduction (NX3883F) | https://www.museumofflight.org/exhibits-and-events/aircraft/spad-xiii-s13 | Museum page, reproduction |
| S10 | Museum of Flight, Fokker Dr.I reproduction | https://www.museumofflight.org/aircraft/fokker-dri-reproduction | Museum page, 1972 reproduction |
| S11 | Smithsonian NASM, Clerget 9B Rotary 9 engine (A19670083000) | https://airandspace.si.edu/collection-objects/clerget-9b-rotary-9-engine/nasm_A19670083000 | Museum record, original engine |
| S12 | Smithsonian NASM, Hispano-Suiza Model 8 Ca V-8 engine (A19340002000) | https://airandspace.si.edu/es/collection-objects/hispano-suiza-model-8-ca-v-8-engine/nasm_A19340002000 | Museum record, original engine (close variant, see Notes) |
| S13 | AEHS (Aircraft Engine Historical Society), Early Engines: O | https://enginehistory.org/Piston/Before1925/EarlyEngines/O/O.shtml | Engine reference compilation |
| S14 | AEHS, Early Engines: Mercedes D.III / D.IIIa | https://enginehistory.org/Piston/Before1925/EarlyEngines/M/Md.shtml | Engine reference compilation |
| S15 | flugzeuginfo.net, Sopwith Camel F.1 data sheet | https://www.flugzeuginfo.net/acdata_php/acdata_sopwithcamel_en.php | Aviation data compilation (no citations given) |
| S16 | flugzeuginfo.net, Albatros D.V data sheet | https://www.flugzeuginfo.net/acdata_php/acdata_albatros_d5_en.php | Aviation data compilation (no citations given) |
| S17 | This Day in Aviation, SPAD S.XIII C.1 (US Army McCook Field test of S.XIII 17956, Hispano-Suiza 8Ba, 1921) | https://www.thisdayinaviation.com/?p=49509 | Secondary article quoting a flight test record |
| S18 | Canadian Museum of Flight, The Sopwith Camel (2022) | https://canadianmuseumofflight.ca/2022/05/20/the-sopwith-camel/ | Museum article |
| S19 | Flying magazine (P. Garrison), Sopwith Camel article | https://www.flyingmag.com/?p=22991 | Magazine article (body partly paywalled; read as far as visible) |
| S20 | This Day in Aviation, Hispano-Suiza 8B articles (SPAD XIII 27 Oct 1918; McCook test 27 Apr 1921) | https://www.thisdayinaviation.com/tag/hispano-suiza-8b/ | Secondary articles |
| S21 | Gagg and Farrar, Altitude Performance of Aircraft Engines Equipped with Gear-Driven Superchargers, SAE paper 340096 (1934) | https://saemobilus.sae.org/content/340096 | Engineering paper. Only the abstract was read. |
| S22 | F. Mason, The British Fighter since 1912 (Putnam): Camel F.1, 130 hp Clerget, performance and weights, as transcribed on flyingmachines.ru | https://flyingmachines.ru/Site2/Crafts/Craft25445.htm | Reference book (transcription) |
| S23 | H. King, Sopwith Aircraft 1912-1920 (Putnam): Camel F.1, 130 hp Clerget, as transcribed on flyingmachines.ru | https://flyingmachines.ru/Site2/Crafts/Craft25445.htm | Reference book (transcription) |
| S24 | W. Green and G. Swanborough, The Complete Book of Fighters: Camel F.1 (130 hp Clerget 9B) and Fokker Dr.I, as transcribed on flyingmachines.ru | https://flyingmachines.ru/Site2/Crafts/Craft25445.htm and https://flyingmachines.ru/Site2/Crafts/Craft25493.htm | Reference book (transcription) |
| S25 | J. Herris, Albatros Aircraft of WWI, vol. 4: Fighters (Aeronaut Books): D.V and D.Va specification table, as transcribed on flyingmachines.ru | https://flyingmachines.ru/Site2/Arts/Art29083.htm | Reference book (transcription) |
| S26 | J. Herris and T. Phillips, Fokker Aircraft of WWI, vol. 4 (Aeronaut Books): Dr.I spans and Fokker type-description (Baubeschreibung) performance, as transcribed on flyingmachines.ru | https://flyingmachines.ru/Site2/Crafts/Craft25493.htm | Reference book quoting manufacturer data (transcription) |
| S27 | O. Thetford and P. Gray, German Aircraft of the First World War (Putnam): Fokker Dr.I, as transcribed on flyingmachines.ru | https://flyingmachines.ru/Site2/Crafts/Craft25493.htm | Reference book (transcription) |
| S28 | P. Grosz, G. Haddow and P. Schiemer, Austro-Hungarian Army Aircraft of World War One (Flying Machines Press): MAG-Fokker 90.03 gaps; Albatros D.III (Oeffag) gap, as transcribed on flyingmachines.ru | https://flyingmachines.ru/Site2/Crafts/Craft25493.htm and https://flyingmachines.ru/Site2/Crafts/Craft25500.htm | Reference book (transcription) |
| S29 | L. Prandtl, Induced Drag of Multiplanes, NACA Technical Note 182 (1924) | https://ntrs.nasa.gov/citations/19930080964 | Government research report |
| S30 | W.F. Durand and E.P. Lesley, Experimental Research on Air Propellers II, NACA Report 30 (1919), Table III | https://ntrs.nasa.gov/citations/19930091058 | Government research report |
| S31 | Virginia Tech, AOE 3104 Aircraft Performance course notes, "10. Thrust Models" | https://archive.aoe.vt.edu/lutze/AOE3104/thrustmodels.pdf | University course notes |
| S32 | This Day in Aviation, Sopwith Camel (article "21 December 1916"): wing span, chord, gap, stagger, dihedral | https://www.thisdayinaviation.com/tag/gun-machine-vickers-303in-mk-1/ | Secondary article |
| S33 | P. Jarrett, "Spinning the Camel", Journal of Aeronautical History, Paper 2024/05 (Royal Aeronautical Society), reporting RAE Farnborough spinning trials of Camel B2312 (1918) and pilot accounts | https://www.aerosociety.com/media/25508/paper-2024-05-jarrett-spinning-the-camel.pdf | Peer-reviewed historical paper quoting official trials |
| S34 | H. Cowin, Aviation Pioneers (Osprey): Camel handling, as transcribed on flyingmachines.ru | https://flyingmachines.ru/Site2/Crafts/Craft25445.htm | Reference book (transcription) |
| S35 | Old Rhinebeck Aerodrome, Sopwith Camel (reproduction, 160 hp Gnome) | https://oldrhinebeck.org/sopwith-camel/ | Museum page |
| S36 | flyingmachines.ru Camel page, specification section (book not named on the page): wheel track | https://flyingmachines.ru/Site2/Crafts/Craft25445.htm | Transcription, source book not identified |

Transcriptions on flyingmachines.ru reproduce the named books' tables; values from them are rated medium because the transcription itself was not checked against the printed book.

Consulted but not used for any value: RAF Museum Camel page (no specifications),
Grace's Guide Camel page (no figures), Smithsonian pages on si.edu (blocked by a bot check, not bypassed),
AIAA Paper 2005-119 (Eberhardt, Museum of Flight WWI fighters; full text not accessible, see Open research gaps).

---

## Sopwith Camel F.1 (Clerget 9B)

| Parameter | Value | Unit | Original figure | Source | Confidence | Notes |
|---|---|---|---|---|---|---|
| Wingspan (upper) | 8.53 | m | 28 ft | S1, S15 | high | S1 gives "28 ft (8.5 m)". The lower wing has the same span (S32). |
| Length | 5.72 | m | 18 ft 9 in | S1, S15 | high | |
| Height | 2.59 | m | 8 ft 6 in | S1, S15 | high | |
| Wing area | 21.46 | m² | 231 ft² | S8, S15 | medium | Reproduction and a compilation agree. No original-aircraft museum record gives it. |
| Upper wing span, wing stack (`wingStack.0.span`) | 8.534 | m | 28 ft 0 in | S32, S1 | medium | Used for the multiplane induced drag. |
| Lower wing span, wing stack (`wingStack.1.span`) | 8.534 | m | 28 ft 0 in | S32 | medium | Both wings 28 ft 0 in. |
| Mean wing gap (`wingStack.0.height`) | 1.337 | m | 5 ft at the fuselage | S32 | medium | 5 ft (1.524 m) at the fuselage; the lower wing has 5 degrees dihedral and the upper none, so the gap closes to 1.151 m at the tips. Prandtl's theory assumes parallel wings, so the mean over the span is used. Chord 4 ft 6 in, stagger 1 ft 6 in (S32). |
| Empty weight | 421.8 | kg | 930 lb | S1 | high | S15 gives 421 kg. Other sources range 889 to 962 lb, depending on equipment and engine. |
| Maximum take-off weight | 659 | kg | 1,453 lb | S8, S15 | medium | Both give 1,453 lb. Treated as loaded weight with pilot, fuel, oil and ammunition. |
| Engine | Clerget 9B 9-cylinder rotary | — | 130 hp Clerget 9B | S1, S4, S11 | high | |
| Engine rated power | 96.9 | kW | 130 hp at 1,250 rpm | S11 | high | Sea-level rating. Power versus altitude still to be researched. |
| Engine rated speed | 1,250 | rpm | 1,250 rpm | S11 | high | |
| Engine bore x stroke | 120 x 160 | mm | 4.72 x 6.3 in | S11 | high | |
| Engine displacement | 16.26 | L | 992.07 in³ | S11 | high | |
| Engine mass | 173 | kg | 381 lb | S11 | high | Bare engine. Installed weight with cowling and mounts is not included. |
| Engine diameter (rotating) | 1.021 | m | 40.2 in | S11 | high | Used for the rotating-mass estimate below. |
| Engine rotation, viewed from the cockpit | clockwise | — | clockwise | S18, S19, S33, S35 | medium | No source states the direction outright; it follows from the documented effects, which need forward-pointing engine angular momentum: the nose rises in left turns and drops in right turns (S35, S33); right turns 'whipped round' with the nose dropping (S33, S34); and the Shuttleworth chief pilot explains the jerky right spins in the 1918 RAE trials by 'the gyroscopics pitching the nose down' with right yaw (S33). |
| Propeller diameter | 2.59 | m | — | ASSUMPTION | estimate | Only a single collector's reading of a Lang propeller stamp (2,590 mm, for the 130 hp Clerget) was found, on a forum that our source policy excludes. Held as an estimate until a museum record or propeller reference confirms it. |
| Maximum speed | 52.3 | m/s | 117 mph at sea level | S22 | medium | Mason, at 1,453 lb (659 kg): 117 mph at sea level, 113 mph at 10,000 ft. The drag (CD0) is calibrated to this figure. S4 gives 112 mph with no altitude; S15 115 mph; King (S23) lower figures at a heavier weight (see Validation data). |
| Service ceiling | 5,791 | m | 19,000 ft | S4, S15, S22 | medium | Three sources agree, but none gives the conditions (load, engine state). King (S23) gives 18,000 ft. |
| Armament | 2 x Vickers .303 in (7.7 mm), synchronised | — | two Vickers .303 | S1, S4 | high | Ballistics are not recorded yet (see gaps). |
| Zero-lift drag coefficient CD0 | 0.036 | — | — | ASSUMPTION | estimate | Fitted (`npm run calibrate`) so the model's full-throttle level top speed at sea level and 659 kg equals Mason's 117 mph, using the multiplane induced drag (S29), measured propeller curve (S30) and power-altitude law (S31). The Phase 1 value (0.036, from 112 mph with a fixed 0.70 propeller efficiency) happens to come out the same. |
| Oswald efficiency e | 0.75 | — | — | ASSUMPTION | estimate | No measured value located. A typical biplane value with gap/chord near 1. Refine with Munk biplane theory (NACA TR-151) in Phase 1. |
| Maximum lift coefficient CLmax | 1.3 | — | — | ASSUMPTION | estimate | No measured value located. Typical of a thin cambered 1917 wing section. Tune against a documented stall speed once found. |
| Static margin (`aero.staticMargin`) | 0.03 | fraction of chord | — | ASSUMPTION | estimate | No measured value located. Kept small because accounts of the Camel (S18) stress its extreme manoeuvrability, which goes with low pitch stability. A tuning choice to be adjusted by flying it. |
| Weathercock stability Cnβ (`aero.cnBeta`) | 0.07 | per rad | — | ASSUMPTION | estimate | No measured value located. Weathercock stability per radian, set a little lower than the inline aircraft as a design choice. Typical light-aircraft values are of this order. |
| Roll inertia Ixx | 2,997 | kg m² | — | ASSUMPTION | estimate | Loaded 659 kg x (0.25 x span)². No measured WWI inertia data located. |
| Pitch inertia Iyy | 1,941 | kg m² | — | ASSUMPTION | estimate | 659 kg x (0.30 x length)². Likely high for the Camel, whose mass is concentrated in the front. No measured WWI inertia data located, so the radius of gyration is assumed. |
| Yaw inertia Izz | 4,937 | kg m² | — | ASSUMPTION | estimate | Ixx + Iyy (flat-body approximation). No measured WWI inertia data located. |
| Rotating engine inertia about the crankshaft | 22.1 | kg m² | — | ASSUMPTION | estimate | 173 kg x (0.7 x 0.51 m)². Assumes the whole engine rotates with its mass at 70% of the radius. Drives gyroscopic precession (rotation speed at 1,250 rpm is 131 rad/s). |
| Wheel track (`gear.track`) | 1.422 | m | 4 ft 8 in | S36 | medium | Distance between the main wheels. |
| Wheel radius (`gear.wheelRadius`) | 0.33 | m | — | ASSUMPTION | estimate | Not found. Typical of the roughly 700 mm wheels of WWI fighters; only affects the drawn wheels. |
| Main wheel contact ahead of the CG (`gear.mainAhead`) | 0.08 | fraction of length | — | ASSUMPTION | estimate | Not found. Places the wheel contact about 18 degrees ahead of the CG in the level attitude, the usual tail-dragger layout; less would nose over too easily, more would make lifting the tail hard. |
| Tailskid behind the CG (`gear.tailAt`) | 0.62 | fraction of length | — | ASSUMPTION | estimate | Not found. The skid sits near the tail post; matches the drawn model. |
| Three-point ground attitude (`gear.groundAngle`) | 0.192 | rad | about 11 degrees | ASSUMPTION | estimate | Not found. Typical nose-up angle of a WWI tail-dragger at rest. |
| Pilot's eye behind the CG (`cockpit.eyeBehind`) | 0.63 | m | — | ASSUMPTION | estimate | Not found. About 11% of the length behind the CG; used only to place the cockpit camera. |
| Pilot's eye above the CG (`cockpit.eyeAbove`) | 0.6 | m | — | ASSUMPTION | estimate | Not found. Sitting eye height above the fuselage centre line; camera only. |

## SPAD S.XIII (Hispano-Suiza 8Be)

| Parameter | Value | Unit | Original figure | Source | Confidence | Notes |
|---|---|---|---|---|---|---|
| Wingspan | 8.20 | m | 26 ft 11 in | S2, S5 | high | S17 gives 8.02 m for the tested aircraft 17956. |
| Length | 6.30 | m | 20 ft 8 in | S2, S5 | high | S17 gives 6.20 m. |
| Height | 2.41 | m | 7 ft 11 in | S2, S5 | high | |
| Wing area | 21.09 | m² | 227 ft² | S9, S17 | medium | A reproduction and a test article agree. |
| Upper wing span, wing stack (`wingStack.0.span`) | 8.2 | m | 26 ft 11 in | S2, S17 | medium | S17 says the upper and lower wings had equal span and chord. |
| Lower wing span, wing stack (`wingStack.1.span`) | 8.2 | m | equal to upper | S17 | medium | Equal span (S17). S17's test aircraft measured 8.02 m; the museum span (S2) is used. |
| Wing gap (`wingStack.0.height`) | 1.181 | m | 3 ft 10.5 in | S17 | medium | McCook Field test aircraft. Chord 1.400 m, stagger 1.25 degrees, no dihedral (S17). |
| Empty weight | 566 | kg | 1,245 lb | S2 | high | S9 also gives 1,245 lb. S17 gives 664 kg for a fully equipped test aircraft. |
| Gross weight | 820 | kg | 1,808 lb | S2 | high | S5 gives 1,815 lb (823 kg). S17 gives 924 kg for the equipped 8Ba test aircraft. |
| Engine | Hispano-Suiza 8Be V-8, water-cooled | — | 220 hp Hispano-Suiza 8Be | S2, S5 | high | S17 tested an earlier 8Ba, 200 hp. |
| Engine rated power | 164 | kW | 220 hp at 2,100 rpm | S12 | medium | S12 is the record for the "Model 8 Ca". It has the same 220 hp rating and geared drive, but is not named 8Be. |
| Engine rated speed | 2,100 | rpm | 2,100 rpm | S12 | medium | Same caveat as above. |
| Engine bore x stroke | 120 x 130 | mm | 4.72 x 5.12 in | S12 | medium | Same caveat. |
| Engine displacement | 11.8 | L | 719 in³ | S12 | medium | Same caveat. |
| Engine mass | 213 | kg | 470 lb | S12 | medium | Same caveat. Dry engine. |
| Propeller drive | Geared | — | geared propeller drive | S12 | medium | Gear ratio not found (see gaps). |
| Propeller gear ratio | 0.75 | — | 0.75:1 reduction | S20 | medium | Given for the Hispano-Suiza 8B and 8Be. The earlier 8Ba is given as 0.585:1 in the same source, and a geared drive is also stated in S12. |
| Propeller diameter | 2.50 | m | 2.50 m | S20 | medium | The source says the 8Be used 2.50 m or 2.55 m propellers. The smaller is used. Fixed-pitch two-bladed wood. |
| Propeller rotation, viewed from the cockpit | clockwise | — | right-hand | ASSUMPTION | estimate | S17 calls the Hispano-Suiza a left-hand tractor engine; a search summary of S20 says the geared 8B drove a right-hand propeller (the reduction gears reverse it), but that page was not checked. Used for the slipstream and P-factor effects. |
| Maximum speed | 59.17 | m/s | 213 km/h at 1,981 m | S17 | medium | McCook Field test (924 kg, engine at 2,040 rpm). The drag (CD0) is calibrated to this at 924 kg and 220 hp. Which engine the test aircraft had is uncertain: the report title says 220 hp Wright, the article text describes the 197 hp 8Ba (see FLIGHT_VALIDATION.md). |
| Maximum speed altitude (`documented.maxSpeedAltitude`) | 1,981 | m | 6,500 ft | S17 | medium | Altitude of the calibration speed. |
| Maximum speed, USAF fact sheet | 60.35 | m/s | 135 mph | S5 | medium | Altitude not stated; compared at sea level in the validation (model +0.7%). |
| Climb time to 1,981 m (6,500 ft), 8Ba | 390 | s | 6.5 min | S17 | medium | Same test. |
| Climb time to 4,572 m (15,000 ft), 8Ba | 1,380 | s | 23 min | S17 | medium | Same test. |
| Service ceiling | 5,608 | m | 18,400 ft | S17 | medium | Same test. Absolute ceiling 20,000 ft (6,096 m). |
| Armament | 2 x Vickers .303 in (7.7 mm), synchronised, 400 rounds per gun | — | two Vickers, 400 rounds each | S5, S17 | high | |
| Zero-lift drag coefficient CD0 | 0.039 | — | — | ASSUMPTION | estimate | Fitted (`npm run calibrate`) so the model's full-throttle level top speed at 1,981 m, 924 kg and 220 hp equals the McCook 213 km/h. With the 197 hp alternative it would be 0.0343 (see FLIGHT_VALIDATION.md). Phase 1 value: 0.0365. |
| Oswald efficiency e | 0.75 | — | — | ASSUMPTION | estimate | No measured value located. A typical biplane value with gap/chord near 1. Refine with Munk biplane theory (NACA TR-151) in Phase 1. |
| Maximum lift coefficient CLmax | 1.3 | — | — | ASSUMPTION | estimate | No measured value located. Typical of a thin cambered 1917 wing section. Tune against a documented stall speed once found. |
| Static margin (`aero.staticMargin`) | 0.1 | fraction of chord | — | ASSUMPTION | estimate | No measured value located. Set larger than the Camel and Dr.I as a design choice so the four aircraft handle differently. No source on SPAD stability was found. |
| Weathercock stability Cnβ (`aero.cnBeta`) | 0.12 | per rad | — | ASSUMPTION | estimate | No measured value located. A typical light-aircraft weathercock stability, used as the baseline. |
| Roll inertia Ixx | 3,446 | kg m² | — | ASSUMPTION | estimate | 820 kg x (0.25 x 8.20 m)². No measured WWI inertia data located, so the radius of gyration is assumed. |
| Pitch inertia Iyy | 2,929 | kg m² | — | ASSUMPTION | estimate | 820 kg x (0.30 x 6.30 m)². No measured WWI inertia data located, so the radius of gyration is assumed. |
| Yaw inertia Izz | 6,375 | kg m² | — | ASSUMPTION | estimate | Ixx + Iyy (flat-body approximation). No measured WWI inertia data located. |
| Wheel track (`gear.track`) | 1.492 | m | 4 ft 10.75 in | S17 | medium | Distance between the main wheels. |
| Wheel radius (`gear.wheelRadius`) | 0.33 | m | — | ASSUMPTION | estimate | Not found. Typical of the roughly 700 mm wheels of WWI fighters; only affects the drawn wheels. |
| Main wheel contact ahead of the CG (`gear.mainAhead`) | 0.08 | fraction of length | — | ASSUMPTION | estimate | Not found. Places the wheel contact about 18 degrees ahead of the CG in the level attitude, the usual tail-dragger layout; less would nose over too easily, more would make lifting the tail hard. |
| Tailskid behind the CG (`gear.tailAt`) | 0.62 | fraction of length | — | ASSUMPTION | estimate | Not found. The skid sits near the tail post; matches the drawn model. |
| Three-point ground attitude (`gear.groundAngle`) | 0.192 | rad | about 11 degrees | ASSUMPTION | estimate | Not found. Typical nose-up angle of a WWI tail-dragger at rest. |
| Pilot's eye behind the CG (`cockpit.eyeBehind`) | 0.69 | m | — | ASSUMPTION | estimate | Not found. About 11% of the length behind the CG; used only to place the cockpit camera. |
| Pilot's eye above the CG (`cockpit.eyeAbove`) | 0.6 | m | — | ASSUMPTION | estimate | Not found. Sitting eye height above the fuselage centre line; camera only. |

## Fokker Dr.I (Oberursel UR.II)

No original Dr.I survives (S6), so all geometry and weights come from reproductions built to the original drawings.

| Parameter | Value | Unit | Original figure | Source | Confidence | Notes |
|---|---|---|---|---|---|---|
| Wingspan (upper) | 7.19 | m | 23 ft 7 in | S6, S10, S26 | medium | S10 gives 23.58 ft; Herris (S26) gives 7.190 m. Middle and lower spans 6.225 m and 5.725 m (S26). |
| Length | 5.77 | m | 18 ft 11 in | S6, S7 | medium | S7 gives 5.77 m. |
| Height | 2.95 | m | 9 ft 8 in | S6, S7 | medium | Two reproduction sources agree. No original aircraft survives to measure. |
| Wing area (total, three wings) | 18.70 | m² | 201.5 ft² | S7, S10 | medium | Two reproduction sources agree (S10 converts to 18.72 m²). No original aircraft survives to measure. |
| Upper wing span, wing stack (`wingStack.0.span`) | 7.19 | m | 7.190 m | S26 | medium | Herris. |
| Middle wing span (`wingStack.1.span`) | 6.225 | m | 6.225 m | S26 | medium | Herris. |
| Lower wing span (`wingStack.2.span`) | 5.725 | m | 5.725 m | S26 | medium | Herris. |
| Upper wing height above lower wing (`wingStack.0.height`) | 1.74 | m | 0.88 m + 0.86 m | ASSUMPTION | estimate | The production Dr.I gaps were not found. The closely related MAG-Fokker 90.03 (a lengthened Dr.I derivative) had an upper gap of 0.88 m and a lower gap of 0.86 m (S28); their sum is used. |
| Middle wing height above lower wing (`wingStack.1.height`) | 0.86 | m | 0.86 m | ASSUMPTION | estimate | Lower gap of the MAG-Fokker 90.03 (S28), as above. |
| Empty weight | 405 | kg | 891 lb | S6, S7 | medium | S7 gives 406 kg, S10 gives 893 lb. |
| Loaded weight | 586 | kg | 1,291 lb | S6, S7 | medium | S10 gives 1,289 lb. |
| Engine | Oberursel UR.II 9-cylinder rotary | — | 110 hp Oberursel Ur II | S6, S7, S13 | high | S6 also allows a Le Rhône 110 hp. The UR.II was a licensed Le Rhône 9J copy. |
| Engine rated power | 82.0 | kW | 110 hp at 1,200 rpm | S13 | medium | Some model-maker sources quote about 120 hp. Not used. |
| Engine rated speed | 1,200 | rpm | 1,200 rpm | S13 | medium | A single engine reference. Same rating as the other 110 hp Le Rhône type engines. |
| Engine bore x stroke | 112 x 170 | mm | 4.409 x 6.693 in | S13 | high | |
| Engine displacement | 15.07 | L | 919.87 in³ | S13 | high | |
| Engine rotation, viewed from the cockpit | clockwise | — | — | ASSUMPTION | estimate | Not found. Assumed to match the Clerget because the UR.II copied the Le Rhône 9J (S13) and French-type rotaries generally turned the same way. Needs a source before we rely on it. |
| Propeller diameter | 2.60 | m | — | ASSUMPTION | estimate | Only a forum post (excluded by our source policy) gave 2,600 to 2,620 mm for propellers fitted to the Dr.I with the 110 hp engine. Held as an estimate until a museum record confirms it. |
| Maximum speed | 51.39 | m/s | 185 km/h at sea level | S24, S7, S26 | medium | Green and Swanborough (S24) give 185 km/h at sea level and 165 km/h at 4,000 m; Thetford and Gray (S27) also give 165 km/h (103 mph) at 4,000 m. So the 103 mph of S6 and S10 is the 4,000 m figure, not a sea-level one, and the two figures are not in conflict. The drag (CD0) is calibrated to 185 km/h. Herris (S26) gives 185 km/h from Fokker's own data. |
| Service ceiling | 6,000 | m | 19,685 ft | S6, S26 | medium | One source only (a reproduction's fact sheet). Conditions not stated. |
| Rate of climb | 5.7 | m/s | 5.7 m/s | S7 | medium | Altitude not stated. |
| Armament | 2 x 7.92 mm LMG 08/15, synchronised | — | two 7.92 mm Spandau LMG 08/15 | S6, S10 | high | S7 says "LMG 08". |
| Zero-lift drag coefficient CD0 | 0.0356 | — | — | ASSUMPTION | estimate | Fitted (`npm run calibrate`) so the model's full-throttle level top speed at sea level equals 185 km/h. The Phase 1 value 0.043 was wrong because 103 mph, a 4,000 m figure, was treated as a sea-level speed. |
| Oswald efficiency e | 0.75 | — | — | ASSUMPTION | estimate | No measured value located. A typical biplane value with gap/chord near 1. Refine with Munk biplane theory (NACA TR-151) in Phase 1. A triplane may be somewhat higher. |
| Maximum lift coefficient CLmax | 1.4 | — | — | ASSUMPTION | estimate | No measured value located. Slightly above the biplanes because the Dr.I used thicker, cantilever wing sections. |
| Static margin (`aero.staticMargin`) | 0.04 | fraction of chord | — | ASSUMPTION | estimate | No measured value located. Kept small as a design choice for the most agile aircraft in the set. A tuning choice to be adjusted by flying it. |
| Weathercock stability Cnβ (`aero.cnBeta`) | 0.08 | per rad | — | ASSUMPTION | estimate | No measured value located. Set a little lower than the inline aircraft as a design choice. Typical light-aircraft values are of this order. |
| Roll inertia Ixx | 1,893 | kg m² | — | ASSUMPTION | estimate | 586 kg x (0.25 x 7.19 m)². No measured WWI inertia data located, so the radius of gyration is assumed. |
| Pitch inertia Iyy | 1,756 | kg m² | — | ASSUMPTION | estimate | 586 kg x (0.30 x 5.77 m)². No measured WWI inertia data located, so the radius of gyration is assumed. |
| Yaw inertia Izz | 3,649 | kg m² | — | ASSUMPTION | estimate | Ixx + Iyy (flat-body approximation). No measured WWI inertia data located. |
| Rotating engine inertia about the crankshaft | 18.8 | kg m² | — | ASSUMPTION | estimate | Engine mass and size were not found. Scaled from the Clerget 9B record (S11): 173 kg for 16.26 L gives 160 kg for the UR.II's 15.07 L (S13), radius 0.49 m, then 160 kg x (0.7 x 0.49 m)². |
| Wheel track (`gear.track`) | 1.25 | m | — | ASSUMPTION | estimate | Not found. Scaled from the span with the average track/span ratio of the Camel and SPAD (0.174). |
| Wheel radius (`gear.wheelRadius`) | 0.33 | m | — | ASSUMPTION | estimate | Not found. Typical of the roughly 700 mm wheels of WWI fighters; only affects the drawn wheels. |
| Main wheel contact ahead of the CG (`gear.mainAhead`) | 0.08 | fraction of length | — | ASSUMPTION | estimate | Not found. Places the wheel contact about 18 degrees ahead of the CG in the level attitude, the usual tail-dragger layout; less would nose over too easily, more would make lifting the tail hard. |
| Tailskid behind the CG (`gear.tailAt`) | 0.62 | fraction of length | — | ASSUMPTION | estimate | Not found. The skid sits near the tail post; matches the drawn model. |
| Three-point ground attitude (`gear.groundAngle`) | 0.192 | rad | about 11 degrees | ASSUMPTION | estimate | Not found. Typical nose-up angle of a WWI tail-dragger at rest. |
| Pilot's eye behind the CG (`cockpit.eyeBehind`) | 0.63 | m | — | ASSUMPTION | estimate | Not found. About 11% of the length behind the CG; used only to place the cockpit camera. |
| Pilot's eye above the CG (`cockpit.eyeAbove`) | 0.6 | m | — | ASSUMPTION | estimate | Not found. Sitting eye height above the fuselage centre line; camera only. |

## Albatros D.V (Mercedes D.IIIa)

Dimensions and weights come from the Smithsonian's original D.Va (D.7161/17), which the museum says combines parts from more than one Albatros.

| Parameter | Value | Unit | Original figure | Source | Confidence | Notes |
|---|---|---|---|---|---|---|
| Wingspan (upper) | 9.0 | m | 29 ft 6 in | S3, S16 | high | |
| Length | 7.3 | m | 24 ft | S3 | high | S16 gives 7.36 m. |
| Height | 2.8 | m | 9 ft 2 in | S3 | high | S16 gives 2.75 m. |
| Wing area | 20.9 | m² | 225 ft² | S16 | medium | A single compilation. Not in the museum record. |
| Upper wing span, wing stack (`wingStack.0.span`) | 9.0 | m | 9.00 m | S3, S25 | medium | Herris gives 9.00 m. |
| Lower wing span (`wingStack.1.span`) | 8.73 | m | 8.73 m | S25 | medium | Herris. Chords 1.5 m upper and 1.0 m lower. |
| Wing gap (`wingStack.0.height`) | 1.47 | m | 1.47 m | ASSUMPTION | estimate | The D.V gap was not found. The Oeffag-built Albatros D.III has the same 9.00 m and 8.73 m spans and a 1.47 m gap in two books (S28, S25); that value is used. |
| Empty weight | 680 | kg | 1,500 lb | S3 | high | S16 gives 717 kg. |
| Gross weight | 915 | kg | 2,017 lb | S3, S16 | high | |
| Engine | Mercedes D.IIIa 6-cylinder inline, water-cooled | — | 180 hp Mercedes D.IIIa | S3 | high | S3 says the D.V began with 160 hp and was later "approximately 180 horsepower". |
| Engine rated power | 130 | kW | 174 hp at 1,400 rpm | S14 | medium | S14 also calls it the "180-hp model". S3 gives 180 hp (134 kW). The ratings are inconsistent between sources. |
| Engine rated speed | 1,400 | rpm | 1,400 rpm | S14 | medium | A single engine reference, which also calls the engine a 180 hp model, so the rating basis is unclear. |
| Engine bore x stroke | 140 x 160 | mm | 5.512 x 6.299 in | S14 | medium | Given for the D.III. S14 says the D.IIIa crankshaft and rods were "practically identical". |
| Engine displacement | 14.78 | L | 901.81 in³ | S14 | medium | Same caveat. |
| Propeller diameter | 2.70 | m | — | ASSUMPTION | estimate | No source found for the D.V. Chosen so the tip speed at the rated 1,400 rpm is about 198 m/s, between the Camel (about 170 m/s) and the SPAD (about 206 m/s), the other aircraft in this set whose figures are recorded here. |
| Propeller rotation, viewed from the cockpit | clockwise | — | — | ASSUMPTION | estimate | Not found. Assumed clockwise; used only for the small slipstream and P-factor effects. |
| Maximum speed | 47.78 | m/s | 172 km/h | S25 | medium | Herris: D.Va with the 170 hp Mercedes D.IIIa at 937 kg; altitude not stated, taken as sea level. The drag (CD0) is calibrated to this at those conditions. S16's 170 km/h belongs to the D.V with the 160 hp D.III (also in S25). |
| Service ceiling | 5,800 | m | 5,800 m | S25 | medium | Herris, D.Va. S16 gives 5,000 m (a compilation pairing it with the D.III engine). |
| Armament | 2 x synchronised machine guns | — | machine guns, calibre not stated | S3 | medium | S3 says bullet damage passed through the right gun mount. Calibre and gun type to be confirmed in Phase 5. |
| Zero-lift drag coefficient CD0 | 0.0602 | — | — | ASSUMPTION | estimate | Fitted (`npm run calibrate`) so the model's full-throttle level top speed at sea level, 937 kg and 170 hp equals Herris's 172 km/h. High compared with the others; the source speed's altitude is not stated. Phase 1 value: 0.0505. |
| Oswald efficiency e | 0.75 | — | — | ASSUMPTION | estimate | No measured value located. A typical biplane value with gap/chord near 1. Refine with Munk biplane theory (NACA TR-151) in Phase 1. |
| Maximum lift coefficient CLmax | 1.3 | — | — | ASSUMPTION | estimate | No measured value located. Typical of a thin cambered 1917 wing section. Tune against a documented stall speed once found. |
| Static margin (`aero.staticMargin`) | 0.08 | fraction of chord | — | ASSUMPTION | estimate | No measured value located. Set larger than the Camel and Dr.I as a design choice. No source on Albatros stability was found. |
| Weathercock stability Cnβ (`aero.cnBeta`) | 0.12 | per rad | — | ASSUMPTION | estimate | No measured value located. A typical light-aircraft weathercock stability, used as the baseline. |
| Roll inertia Ixx | 4,632 | kg m² | — | ASSUMPTION | estimate | 915 kg x (0.25 x 9.0 m)². No measured WWI inertia data located, so the radius of gyration is assumed. |
| Pitch inertia Iyy | 4,388 | kg m² | — | ASSUMPTION | estimate | 915 kg x (0.30 x 7.3 m)². No measured WWI inertia data located, so the radius of gyration is assumed. |
| Yaw inertia Izz | 9,021 | kg m² | — | ASSUMPTION | estimate | Ixx + Iyy (flat-body approximation). No measured WWI inertia data located. |
| Wheel track (`gear.track`) | 1.57 | m | — | ASSUMPTION | estimate | Not found. Scaled from the span with the average track/span ratio of the Camel and SPAD (0.174). |
| Wheel radius (`gear.wheelRadius`) | 0.33 | m | — | ASSUMPTION | estimate | Not found. Typical of the roughly 700 mm wheels of WWI fighters; only affects the drawn wheels. |
| Main wheel contact ahead of the CG (`gear.mainAhead`) | 0.08 | fraction of length | — | ASSUMPTION | estimate | Not found. Places the wheel contact about 18 degrees ahead of the CG in the level attitude, the usual tail-dragger layout; less would nose over too easily, more would make lifting the tail hard. |
| Tailskid behind the CG (`gear.tailAt`) | 0.62 | fraction of length | — | ASSUMPTION | estimate | Not found. The skid sits near the tail post; matches the drawn model. |
| Three-point ground attitude (`gear.groundAngle`) | 0.192 | rad | about 11 degrees | ASSUMPTION | estimate | Not found. Typical nose-up angle of a WWI tail-dragger at rest. |
| Pilot's eye behind the CG (`cockpit.eyeBehind`) | 0.8 | m | — | ASSUMPTION | estimate | Not found. About 11% of the length behind the CG; used only to place the cockpit camera. |
| Pilot's eye above the CG (`cockpit.eyeAbove`) | 0.6 | m | — | ASSUMPTION | estimate | Not found. Sitting eye height above the fuselage centre line; camera only. |

## Common flight-model parameters

Shared by all four aircraft. Every value is an estimate: no measured WWI stability, control or stall data was found. `tests/aircraftCode.test.js` checks that each row matches the value in `src/aircraft/common.js` or `src/core/constants.js`, so the code and this table cannot disagree. A value may only change together with its row here.

| Parameter | Value | Unit | Original figure | Source | Confidence | Notes |
|---|---|---|---|---|---|---|
| Zero-lift angle of attack (`common.alphaZeroLift`) | -0.0524 | rad | -3 degrees | ASSUMPTION | estimate | Typical of a lightly cambered thin wing section. No measured WWI wing section data was found (see gaps). |
| Stall sharpness (`common.stallWidth`) | 0.0175 | rad | about 1 degree | ASSUMPTION | estimate | Sets how abruptly lift falls past the stall angle. Chosen so lift is lost over 1 to 2 degrees, a sharp stall that gives a clear wing drop. A tuning choice. |
| Autorotation gain (`common.autorotationGain`) | 1.5 | — | — | ASSUMPTION | estimate | Makes roll damping change sign when fully stalled (net roll damping goes from -0.4 to +0.6). This is the essential cause of wing drop and spins. The size was chosen so spins can form (see the behaviour tests). |
| Stalled yaw damping loss (`common.stallYawDampingLoss`) | 0.3 | fraction | — | ASSUMPTION | estimate | Fraction of yaw damping lost when fully stalled. Tuned together with the roll-to-yaw coupling so steady spin rates come out around 2 to 4 rad/s, the range typical of light-aircraft spins. |
| Stalled dihedral-effect reversal (`common.stallDihedralFlip`) | 3 | — | — | ASSUMPTION | estimate | Makes the roll caused by sideslip reverse sign when stalled, as it does on real stalled wings. A modelling device, tuned. |
| Autorotation roll-rate limit (`common.autorotationRate`) | 0.32 | p b/2V | — | ASSUMPTION | estimate | Non-dimensional roll rate at which autorotation fades. Chosen so steady autorotation settles near p b/2V = 0.25, instead of the roll rate growing without limit. |
| Stalled nose-down pitching moment (`common.stallNoseDown`) | 0.2 | per unit sin(alpha) | — | ASSUMPTION | estimate | Flat-plate theory (centre of pressure 25% of chord behind the centre of gravity) suggests 0.5. Reduced to 0.2 because the tail contributes, and because at 0.5 the aircraft pitched out of the stall too readily for a spin to form. A tuning choice. |
| Stalled wing-drop bias (left wing down) (`common.stallWingDropBias`) | -0.03 | roll coefficient | — | ASSUMPTION | estimate | A small fixed left-wing-down moment when stalled, standing in for the small rigging asymmetries real aircraft have. It gives the wing drop a repeatable direction. Left chosen to agree with the rotary engine torque. |
| Stalled roll-to-yaw coupling (`common.stallRollYaw`) | 0.1 | per unit p b/2V | — | ASSUMPTION | estimate | Yaw toward the dropping wing when stalled, because that wing has more drag. Tuned together with the stalled yaw damping loss. |
| Stalled elevator loss (`common.stallElevatorLoss`) | 0.5 | fraction | — | ASSUMPTION | estimate | Elevator loses half its effect when fully stalled, as the tail sits in disturbed air. A tuning choice. |
| Side force from sideslip Cyβ (`common.cyBeta`) | -0.35 | per rad | — | ASSUMPTION | estimate | Typical order of magnitude for a fuselage and fin of a small aeroplane. No measured WWI value located. |
| Dihedral effect Clβ (`common.clBeta`) | -0.07 | per rad | — | ASSUMPTION | estimate | Typical order of magnitude for a biplane with some dihedral. No measured WWI value located. |
| Roll damping Clp (`common.clP`) | -0.4 | per unit p b/2V | — | ASSUMPTION | estimate | Typical order of magnitude for straight wings of this aspect ratio. No measured WWI value located. |
| Roll from yaw rate Clr (`common.clR`) | 0.1 | per unit r b/2V | — | ASSUMPTION | estimate | Typical order of magnitude. No measured WWI value located. |
| Pitch damping Cmq (`common.cmQ`) | -8 | per unit q c/2V | — | ASSUMPTION | estimate | Typical order of magnitude for a small aeroplane with a small tail. No measured WWI value located. Tail geometry was not found. |
| Yaw damping Cnr (`common.cnR`) | -0.12 | per unit r b/2V | — | ASSUMPTION | estimate | Typical order of magnitude for a small aeroplane. No measured WWI value located. |
| Elevator effectiveness (`common.cmDeltaPull`) | 1.2 | per rad | — | ASSUMPTION | estimate | Nose-up pitching moment coefficient per radian of stick-back elevator. Typical order of magnitude. Strong enough that full back stick reaches the stall in about a second at cruise. Tuned by feel. |
| Aileron effectiveness (`common.clDeltaRoll`) | 0.2 | per rad | — | ASSUMPTION | estimate | Roll moment coefficient per radian of aileron. Typical order of magnitude. With the roll damping it gives a steady roll rate near 115 degrees/s at cruise speed for the Camel. Tuned by feel. |
| Rudder effectiveness (`common.cnDeltaYaw`) | 0.08 | per rad | — | ASSUMPTION | estimate | Nose-right moment coefficient per radian of rudder. Typical order of magnitude. Tuned by feel. |
| Adverse yaw from aileron (`common.cnDeltaRoll`) | -0.02 | per rad | — | ASSUMPTION | estimate | Yaw opposite to the roll command. Typical small value. No measured WWI value located. |
| Elevator travel (`common.maxPull`) | 0.44 | rad | 25 degrees | ASSUMPTION | estimate | No source on control travel found. Typical of the period's layout. Tuned by feel. |
| Aileron travel (`common.maxRoll`) | 0.35 | rad | 20 degrees | ASSUMPTION | estimate | No source on control travel found. Typical of the period's layout. Tuned by feel. |
| Rudder travel (`common.maxYaw`) | 0.44 | rad | 25 degrees | ASSUMPTION | estimate | No source on control travel found. Typical of the period's layout. Tuned by feel. |
| Control surface speed (`common.surfaceRate`) | 4 | travel/s | — | ASSUMPTION | estimate | How fast the surfaces move toward the commanded position (full travel in a quarter second). No measured value. A design choice so key presses feel immediate but not instant. |
| Trim lever authority (`common.trimAuthority`) | 0.4 | fraction of elevator travel | — | ASSUMPTION | estimate | How much elevator the trim lever can add. A design choice. It is enough to trim all four aircraft across their speed range. |
| Torque cancelled by rigging (`common.torqueRigging`) | 0.8 | fraction | — | ASSUMPTION | estimate | Fraction of the rotary engine's reaction torque (at 60% throttle) cancelled by a fixed roll moment standing in for the rigging. Chosen so the rotary aircraft fly roughly level hands-off at cruise, while a change of throttle still disturbs them. No source found on how the Camel was rigged. The same fraction sets the fin offset that cancels the slipstream swirl at cruise; the fin's moment grows with the dynamic pressure at the tail. |
| Propwash on the tail (`common.tailWashFraction`) | 0.5 | fraction | — | ASSUMPTION | estimate | Share of the slipstream's extra dynamic pressure (thrust / disc area, momentum theory) felt by the elevator and rudder. About half the tail sits in the slipstream. Gives rudder control at low speed under power. |
| Slipstream swirl on the fin (`common.swirlYaw`) | 0.5 | fraction of propeller torque | — | ASSUMPTION | estimate | Momentum theory gives a fin yaw moment of roughly the propeller torque times fin area, lift slope and arm over twice the disc area times radius, about 1 for these aircraft; halved because only part of the fin sits in the swirl. |
| P-factor (`common.pFactor`) | 0.4 | propeller radius per rad | — | ASSUMPTION | estimate | Shift of the thrust centre toward the descending blade per radian of angle of attack. Gives about 0.1 m at the 11 degree ground attitude. A typical textbook order; no WWI data. |
| Propeller clearance (`common.propClearance`) | 0.25 | m | — | ASSUMPTION | estimate | Height of the propeller tip above the ground in the level (tail-up) attitude; sets the main wheel height. |
| Undercarriage compression (`common.gearStaticDeflection`) | 0.06 | m | — | ASSUMPTION | estimate | Tyre and rubber-cord compression under the weight; sets the spring stiffness. |
| Tailskid compression (`common.skidStaticDeflection`) | 0.04 | m | — | ASSUMPTION | estimate | Sets the tailskid spring stiffness. |
| Undercarriage damping (`common.gearDampingRatio`) | 0.5 | fraction of critical | — | ASSUMPTION | estimate | Enough to stop bouncing in about one cycle, as bungee-sprung gear did. |
| Wheel rolling resistance on grass (`common.wheelRollingFriction`) | 0.06 | times load | — | ASSUMPTION | estimate | Typical for narrow wheels on a grass field. |
| Tyre sideways grip (`common.wheelSideFriction`) | 0.8 | times load | — | ASSUMPTION | estimate | Typical sideways friction of a tyre on grass. |
| Tyre slip angle for side grip (`common.tyreSlipAngle`) | 0.1 | rad | — | ASSUMPTION | estimate | About 6 degrees: tyres reach most of their side grip over a few degrees of slip angle (the angle between where the wheel points and where it moves). Replaced a grip that built up over 0.3 m/s of sideways speed, which tripped every aircraft onto a wingtip after a landing with a slight drift. |
| Tyre slip reference speed (`common.tyreSlipRefSpeed`) | 1 | m/s | — | ASSUMPTION | estimate | Keeps the slip angle meaningful when nearly stopped, so a parked or taxiing aircraft still resists sliding sideways. |
| Tailskid friction (`common.skidFriction`) | 0.5 | times load | — | ASSUMPTION | estimate | A skid dragging on grass; the WWI substitute for brakes. |
| Undercarriage collapse sink rate (`common.crashSinkRate`) | 3 | m/s | — | ASSUMPTION | estimate | About 600 ft/min; a touchdown faster than this counts as a crash. No structural data for these undercarriages was found. |
| Chocks pulled at throttle (`common.chockReleaseThrottle`) | 0.3 | fraction | — | ASSUMPTION | estimate | Game rule: the aircraft starts chocked and the chocks are pulled when the throttle first passes 30%, standing in for the mechanics who held WWI aircraft until the pilot waved them away. |
| Propeller best-efficiency speed (`common.propDesignSpeedFraction`) | 0.9 | fraction of top speed | — | ASSUMPTION | estimate | The fixed-pitch propeller is assumed to reach its peak on the measured efficiency curve (S30) at this fraction of the documented top speed at rated rpm. A design choice; no WWI propeller pitch data was found. |
| Propeller figure of merit (static) (`common.propStaticMerit`) | 0.6 | — | — | ASSUMPTION | estimate | Fraction of ideal momentum-theory thrust achieved with the aircraft stationary. A typical value for a fixed-pitch propeller. Gives static thrust of about 50 to 60% of weight. |
| Idle power (`common.idlePowerFraction`) | 0.05 | fraction of rated | — | ASSUMPTION | estimate | No source found. A design choice for the throttle-closed power. |
| Idle engine speed (`common.idleRpmFraction`) | 0.55 | fraction of rated | — | ASSUMPTION | estimate | No source found. A design choice for the throttle-closed engine speed. Sets the gyroscopic angular momentum at low throttle. |
| Flat-plate drag coefficient (stalled wing) (`constants.FLAT_PLATE_CD`) | 1.98 | — | — | ASSUMPTION | estimate | A textbook value for a flat plate broadside to the wind. Not checked against a source in this project. Used for the post-stall drag. |
| Wing section lift slope (`constants.SECTION_LIFT_SLOPE`) | 5.655 | per rad | 0.9 x 2 pi | ASSUMPTION | estimate | Thin-airfoil theory gives 2 pi per radian and real sections reach about 90% of that. A textbook relation. Used to derive each aircraft's finite-wing lift slope. |

---

## Physics constants from sources

Values that come from published research rather than estimates. `tests/aircraftCode.test.js` checks each row against `src/core/constants.js`.

| Parameter | Value | Unit | Original figure | Source | Confidence | Notes |
|---|---|---|---|---|---|---|
| Prandtl sigma constant A (`constants.PRANDTL.SIGMA_A`) | 0.66 | — | 0.66 | S29 | high | TN-182 equation (5): sigma = (1 - A g)/(B + C g), g = gap/span. |
| Prandtl sigma constant B (`constants.PRANDTL.SIGMA_B`) | 1.055 | — | 1.05 (printed) | S29 | medium | The scan prints 1.05, but the report's worked example (p.8) and Table I are only reproduced with 1.055. Tests check both. |
| Prandtl sigma constant C (`constants.PRANDTL.SIGMA_C`) | 3.7 | — | 3.7 | S29 | high | TN-182 equation (5). |
| Engine power lapse constant A (`constants.ENGINE_LAPSE.A`) | 1.132 | — | 1.132 | S31 | medium | Power = sea-level power x (A sigma - B) for an unsupercharged engine. Usually credited to Gagg and Farrar (S21). |
| Engine power lapse constant B (`constants.ENGINE_LAPSE.B`) | 0.132 | — | 0.132 | S31 | medium | B = A - 1. |
| Propeller best advance ratio (`constants.PROPELLER_EFFICIENCY.PEAK_J`) | 0.825 | V/(nD) | 0.80 to 0.85 | S30 | medium | The averaged curve peaks (0.790) between J = 0.80 and 0.85; the midpoint is used. |
| Propeller efficiency at J = 0.20 (`constants.PROPELLER_EFFICIENCY.ETA.0`) | 0.342 | — | J = 0.20 | S30 | high | Mean of propellers No. 1-4 in Table III (wooden models, 1917, retested 1918). |
| Propeller efficiency at J = 0.30 (`constants.PROPELLER_EFFICIENCY.ETA.1`) | 0.4775 | — | J = 0.30 | S30 | high | Mean of propellers No. 1-4 in Table III (wooden models, 1917, retested 1918). |
| Propeller efficiency at J = 0.40 (`constants.PROPELLER_EFFICIENCY.ETA.2`) | 0.587 | — | J = 0.40 | S30 | high | Mean of propellers No. 1-4 in Table III (wooden models, 1917, retested 1918). |
| Propeller efficiency at J = 0.45 (`constants.PROPELLER_EFFICIENCY.ETA.3`) | 0.627 | — | J = 0.45 | S30 | high | Mean of propellers No. 1-4 in Table III (wooden models, 1917, retested 1918). |
| Propeller efficiency at J = 0.50 (`constants.PROPELLER_EFFICIENCY.ETA.4`) | 0.6668 | — | J = 0.50 | S30 | high | Mean of propellers No. 1-4 in Table III (wooden models, 1917, retested 1918). |
| Propeller efficiency at J = 0.55 (`constants.PROPELLER_EFFICIENCY.ETA.5`) | 0.7003 | — | J = 0.55 | S30 | high | Mean of propellers No. 1-4 in Table III (wooden models, 1917, retested 1918). |
| Propeller efficiency at J = 0.60 (`constants.PROPELLER_EFFICIENCY.ETA.6`) | 0.729 | — | J = 0.60 | S30 | high | Mean of propellers No. 1-4 in Table III (wooden models, 1917, retested 1918). |
| Propeller efficiency at J = 0.65 (`constants.PROPELLER_EFFICIENCY.ETA.7`) | 0.7528 | — | J = 0.65 | S30 | high | Mean of propellers No. 1-4 in Table III (wooden models, 1917, retested 1918). |
| Propeller efficiency at J = 0.70 (`constants.PROPELLER_EFFICIENCY.ETA.8`) | 0.771 | — | J = 0.70 | S30 | high | Mean of propellers No. 1-4 in Table III (wooden models, 1917, retested 1918). |
| Propeller efficiency at J = 0.75 (`constants.PROPELLER_EFFICIENCY.ETA.9`) | 0.7838 | — | J = 0.75 | S30 | high | Mean of propellers No. 1-4 in Table III (wooden models, 1917, retested 1918). |
| Propeller efficiency at J = 0.80 (`constants.PROPELLER_EFFICIENCY.ETA.10`) | 0.79 | — | J = 0.80 | S30 | high | Mean of propellers No. 1-4 in Table III (wooden models, 1917, retested 1918). |
| Propeller efficiency at J = 0.85 (`constants.PROPELLER_EFFICIENCY.ETA.11`) | 0.789 | — | J = 0.85 | S30 | high | Mean of propellers No. 1-4 in Table III (wooden models, 1917, retested 1918). |
| Propeller efficiency at J = 0.90 (`constants.PROPELLER_EFFICIENCY.ETA.12`) | 0.7755 | — | J = 0.90 | S30 | high | Mean of propellers No. 1-4 in Table III (wooden models, 1917, retested 1918). |
| Propeller efficiency at J = 0.95 (`constants.PROPELLER_EFFICIENCY.ETA.13`) | 0.7433 | — | J = 0.95 | S30 | high | Mean of propellers No. 1-4 in Table III (wooden models, 1917, retested 1918). |
| Propeller efficiency at J = 1.00 (`constants.PROPELLER_EFFICIENCY.ETA.14`) | 0.685 | — | J = 1.00 | S30 | high | Mean of propellers No. 1-4 in Table III (wooden models, 1917, retested 1918). |

## Validation data

Sourced performance figures the model is tested against (`src/aircraft/validationCases.js`, `tests/physics/validation.test.js`). Results: `docs/FLIGHT_VALIDATION.md`. `tests/aircraftCode.test.js` checks every row against the code.

| Parameter | Value | Unit | Original figure | Source | Confidence | Notes |
|---|---|---|---|---|---|---|
| camel-mason: mass (`validation.camel-mason.mass`) | 659 | kg | 659 kg | S22 | medium | Conditions of this source's figures. Mason, The British Fighter since 1912 (130 hp Clerget, 1,453 lb). |
| camel-mason: top speed at 0 m (`validation.camel-mason.topSpeed@0`) | 52.30 | m/s | 117.0 mph / 188 km/h | S22 | medium | Calibration point: the drag is fitted to it. Mason, The British Fighter since 1912 (130 hp Clerget, 1,453 lb). |
| camel-mason: top speed at 3048 m (`validation.camel-mason.topSpeed@3048`) | 50.52 | m/s | 113.0 mph / 182 km/h | S22 | medium | Independent check of the model. Mason, The British Fighter since 1912 (130 hp Clerget, 1,453 lb). |
| camel-mason: time to climb to 3048 m (`validation.camel-mason.climbTime@3048`) | 635 | s | 10 min 35 s | S22 | medium | Independent check of the model. Mason, The British Fighter since 1912 (130 hp Clerget, 1,453 lb). |
| camel-mason: service ceiling (`validation.camel-mason.serviceCeiling`) | 5791 | m | 19,000 ft | S22 | medium | Independent check of the model. Mason, The British Fighter since 1912 (130 hp Clerget, 1,453 lb). |
| camel-king: mass (`validation.camel-king.mass`) | 672 | kg | 672 kg | S23 | medium | Conditions of this source's figures. King, Sopwith Aircraft 1912-1920 (130 hp Clerget, 1,482 lb). |
| camel-king: top speed at 3048 m (`validation.camel-king.topSpeed@3048`) | 46.72 | m/s | 104.5 mph / 168 km/h | S23 | medium | Independent check of the model. King, Sopwith Aircraft 1912-1920 (130 hp Clerget, 1,482 lb). |
| camel-king: top speed at 4572 m (`validation.camel-king.topSpeed@4572`) | 43.59 | m/s | 97.5 mph / 157 km/h | S23 | medium | Independent check of the model. King, Sopwith Aircraft 1912-1920 (130 hp Clerget, 1,482 lb). |
| camel-king: time to climb to 3048 m (`validation.camel-king.climbTime@3048`) | 705 | s | 11 min 45 s | S23 | medium | Independent check of the model. King, Sopwith Aircraft 1912-1920 (130 hp Clerget, 1,482 lb). |
| camel-king: time to climb to 4572 m (`validation.camel-king.climbTime@4572`) | 1395 | s | 23 min 15 s | S23 | medium | Independent check of the model. King, Sopwith Aircraft 1912-1920 (130 hp Clerget, 1,482 lb). |
| camel-king: service ceiling (`validation.camel-king.serviceCeiling`) | 5486 | m | 18,000 ft | S23 | medium | Independent check of the model. King, Sopwith Aircraft 1912-1920 (130 hp Clerget, 1,482 lb). |
| camel-green: mass (`validation.camel-green.mass`) | 659 | kg | 659 kg | S24 | medium | Conditions of this source's figures. Green and Swanborough, The Complete Book of Fighters (130 hp Clerget 9B). |
| camel-green: top speed at 1981 m (`validation.camel-green.topSpeed@1981`) | 51.41 | m/s | 115.0 mph / 185 km/h | S24 | medium | Independent check of the model. Green and Swanborough, The Complete Book of Fighters (130 hp Clerget 9B). |
| camel-green: time to climb to 1981 m (`validation.camel-green.climbTime@1981`) | 360 | s | 6 min 00 s | S24 | medium | Independent check of the model. Green and Swanborough, The Complete Book of Fighters (130 hp Clerget 9B). |
| spad-mccook: mass (`validation.spad-mccook.mass`) | 924 | kg | 924 kg | S17 | medium | Conditions of this source's figures. McCook Field test of S.XIII 17956, 1921, at 924 kg. Titled "220 h.p. Wright engine"; the as-modelled 220 hp is used. |
| spad-mccook: top speed at 1981 m (`validation.spad-mccook.topSpeed@1981`) | 59.17 | m/s | 132.4 mph / 213 km/h | S17 | medium | Calibration point: the drag is fitted to it. McCook Field test of S.XIII 17956, 1921, at 924 kg. Titled "220 h.p. Wright engine"; the as-modelled 220 hp is used. |
| spad-mccook: time to climb to 1981 m (`validation.spad-mccook.climbTime@1981`) | 390 | s | 6 min 30 s | S17 | medium | Independent check of the model. McCook Field test of S.XIII 17956, 1921, at 924 kg. Titled "220 h.p. Wright engine"; the as-modelled 220 hp is used. |
| spad-mccook: time to climb to 4572 m (`validation.spad-mccook.climbTime@4572`) | 1380 | s | 23 min 00 s | S17 | medium | Independent check of the model. McCook Field test of S.XIII 17956, 1921, at 924 kg. Titled "220 h.p. Wright engine"; the as-modelled 220 hp is used. |
| spad-mccook: service ceiling (`validation.spad-mccook.serviceCeiling`) | 5608 | m | 18,400 ft | S17 | medium | Independent check of the model. McCook Field test of S.XIII 17956, 1921, at 924 kg. Titled "220 h.p. Wright engine"; the as-modelled 220 hp is used. |
| spad-mccook: absolute ceiling (`validation.spad-mccook.absoluteCeiling`) | 6096 | m | 20,000 ft | S17 | medium | Independent check of the model. McCook Field test of S.XIII 17956, 1921, at 924 kg. Titled "220 h.p. Wright engine"; the as-modelled 220 hp is used. |
| spad-usaf: top speed at 0 m (`validation.spad-usaf.topSpeed@0`) | 60.35 | m/s | 135.0 mph / 217 km/h | S5 | medium | Independent check of the model. USAF Museum fact sheet, 135 mph; altitude not stated, compared at sea level. |
| dr1-green: top speed at 0 m (`validation.dr1-green.topSpeed@0`) | 51.39 | m/s | 115.0 mph / 185 km/h | S24 | medium | Calibration point: the drag is fitted to it. Green and Swanborough: 185 km/h at sea level, 165 km/h at 4,000 m. |
| dr1-green: top speed at 4000 m (`validation.dr1-green.topSpeed@4000`) | 45.83 | m/s | 102.5 mph / 165 km/h | S24 | medium | Independent check of the model. Green and Swanborough: 185 km/h at sea level, 165 km/h at 4,000 m. |
| dr1-thetford: time to climb to 1000 m (`validation.dr1-thetford.climbTime@1000`) | 174 | s | 2 min 54 s | S27 | medium | Independent check of the model. Thetford and Gray, German Aircraft of the First World War. |
| dr1-thetford: service ceiling (`validation.dr1-thetford.serviceCeiling`) | 6096 | m | 20,000 ft | S27 | medium | Independent check of the model. Thetford and Gray, German Aircraft of the First World War. |
| dr1-herris: mass (`validation.dr1-herris.mass`) | 571 | kg | 571 kg | S26 | medium | Conditions of this source's figures. Herris, Fokker Aircraft of WWI vol. 4: Fokker type description (Baubeschreibung) figures at 571 kg; manufacturer data. |
| dr1-herris: time to climb to 1000 m (`validation.dr1-herris.climbTime@1000`) | 174 | s | 2 min 54 s | S26 | medium | Independent check of the model. Herris, Fokker Aircraft of WWI vol. 4: Fokker type description (Baubeschreibung) figures at 571 kg; manufacturer data. |
| dr1-herris: time to climb to 2000 m (`validation.dr1-herris.climbTime@2000`) | 330 | s | 5 min 30 s | S26 | medium | Independent check of the model. Herris, Fokker Aircraft of WWI vol. 4: Fokker type description (Baubeschreibung) figures at 571 kg; manufacturer data. |
| dr1-herris: time to climb to 3000 m (`validation.dr1-herris.climbTime@3000`) | 558 | s | 9 min 18 s | S26 | medium | Independent check of the model. Herris, Fokker Aircraft of WWI vol. 4: Fokker type description (Baubeschreibung) figures at 571 kg; manufacturer data. |
| dr1-herris: time to climb to 4000 m (`validation.dr1-herris.climbTime@4000`) | 834 | s | 13 min 54 s | S26 | medium | Independent check of the model. Herris, Fokker Aircraft of WWI vol. 4: Fokker type description (Baubeschreibung) figures at 571 kg; manufacturer data. |
| dr1-herris: time to climb to 5000 m (`validation.dr1-herris.climbTime@5000`) | 1314 | s | 21 min 54 s | S26 | medium | Independent check of the model. Herris, Fokker Aircraft of WWI vol. 4: Fokker type description (Baubeschreibung) figures at 571 kg; manufacturer data. |
| dr1-herris: service ceiling (`validation.dr1-herris.serviceCeiling`) | 6000 | m | 19,685 ft | S26 | medium | Independent check of the model. Herris, Fokker Aircraft of WWI vol. 4: Fokker type description (Baubeschreibung) figures at 571 kg; manufacturer data. |
| dr1-aviodrome: climb rate at 0 m (`validation.dr1-aviodrome.climbRate@0`) | 5.70 | m/s | — | S7 | medium | Independent check of the model. Aviodrome: rate of climb 5.7 m/s, altitude not stated (taken as sea level). |
| albatros-dva-herris: mass (`validation.albatros-dva-herris.mass`) | 937 | kg | 937 kg | S25 | medium | Conditions of this source's figures. Herris, Albatros Aircraft of WWI vol. 4: D.Va, 170 hp Mercedes D.IIIa, 937 kg. Speed altitude not stated (taken as sea level). |
| albatros-dva-herris: power (`validation.albatros-dva-herris.power`) | 126769 | W | 170 hp | S25 | medium | Conditions of this source's figures. Herris, Albatros Aircraft of WWI vol. 4: D.Va, 170 hp Mercedes D.IIIa, 937 kg. Speed altitude not stated (taken as sea level). |
| albatros-dva-herris: top speed at 0 m (`validation.albatros-dva-herris.topSpeed@0`) | 47.78 | m/s | 106.9 mph / 172 km/h | S25 | medium | Calibration point: the drag is fitted to it. Herris, Albatros Aircraft of WWI vol. 4: D.Va, 170 hp Mercedes D.IIIa, 937 kg. Speed altitude not stated (taken as sea level). |
| albatros-dva-herris: time to climb to 1000 m (`validation.albatros-dva-herris.climbTime@1000`) | 240 | s | 4 min 00 s | S25 | medium | Independent check of the model. Herris, Albatros Aircraft of WWI vol. 4: D.Va, 170 hp Mercedes D.IIIa, 937 kg. Speed altitude not stated (taken as sea level). |
| albatros-dva-herris: time to climb to 2000 m (`validation.albatros-dva-herris.climbTime@2000`) | 528 | s | 8 min 48 s | S25 | medium | Independent check of the model. Herris, Albatros Aircraft of WWI vol. 4: D.Va, 170 hp Mercedes D.IIIa, 937 kg. Speed altitude not stated (taken as sea level). |
| albatros-dva-herris: time to climb to 3000 m (`validation.albatros-dva-herris.climbTime@3000`) | 887 | s | 14 min 47 s | S25 | medium | Independent check of the model. Herris, Albatros Aircraft of WWI vol. 4: D.Va, 170 hp Mercedes D.IIIa, 937 kg. Speed altitude not stated (taken as sea level). |
| albatros-dva-herris: time to climb to 4000 m (`validation.albatros-dva-herris.climbTime@4000`) | 1365 | s | 22 min 45 s | S25 | medium | Independent check of the model. Herris, Albatros Aircraft of WWI vol. 4: D.Va, 170 hp Mercedes D.IIIa, 937 kg. Speed altitude not stated (taken as sea level). |
| albatros-dva-herris: time to climb to 5000 m (`validation.albatros-dva-herris.climbTime@5000`) | 2100 | s | 35 min 00 s | S25 | medium | Independent check of the model. Herris, Albatros Aircraft of WWI vol. 4: D.Va, 170 hp Mercedes D.IIIa, 937 kg. Speed altitude not stated (taken as sea level). |
| albatros-dva-herris: service ceiling (`validation.albatros-dva-herris.serviceCeiling`) | 5800 | m | 19,029 ft | S25 | medium | Independent check of the model. Herris, Albatros Aircraft of WWI vol. 4: D.Va, 170 hp Mercedes D.IIIa, 937 kg. Speed altitude not stated (taken as sea level). |
| albatros-dv-herris: mass (`validation.albatros-dv-herris.mass`) | 915 | kg | 915 kg | S25 | medium | Conditions of this source's figures. Herris: D.V, 160 hp Mercedes D.III, 915 kg. Speed altitude not stated (taken as sea level). |
| albatros-dv-herris: power (`validation.albatros-dv-herris.power`) | 119312 | W | 160 hp | S25 | medium | Conditions of this source's figures. Herris: D.V, 160 hp Mercedes D.III, 915 kg. Speed altitude not stated (taken as sea level). |
| albatros-dv-herris: top speed at 0 m (`validation.albatros-dv-herris.topSpeed@0`) | 47.22 | m/s | 105.6 mph / 170 km/h | S25 | medium | Independent check of the model. Herris: D.V, 160 hp Mercedes D.III, 915 kg. Speed altitude not stated (taken as sea level). |
| albatros-dv-herris: time to climb to 1000 m (`validation.albatros-dv-herris.climbTime@1000`) | 260 | s | 4 min 20 s | S25 | medium | Independent check of the model. Herris: D.V, 160 hp Mercedes D.III, 915 kg. Speed altitude not stated (taken as sea level). |
| albatros-dv-herris: time to climb to 2000 m (`validation.albatros-dv-herris.climbTime@2000`) | 530 | s | 8 min 50 s | S25 | medium | Independent check of the model. Herris: D.V, 160 hp Mercedes D.III, 915 kg. Speed altitude not stated (taken as sea level). |
| albatros-dv-herris: time to climb to 3000 m (`validation.albatros-dv-herris.climbTime@3000`) | 870 | s | 14 min 30 s | S25 | medium | Independent check of the model. Herris: D.V, 160 hp Mercedes D.III, 915 kg. Speed altitude not stated (taken as sea level). |
| albatros-dv-herris: time to climb to 4000 m (`validation.albatros-dv-herris.climbTime@4000`) | 1360 | s | 22 min 40 s | S25 | medium | Independent check of the model. Herris: D.V, 160 hp Mercedes D.III, 915 kg. Speed altitude not stated (taken as sea level). |
| albatros-dv-herris: time to climb to 5000 m (`validation.albatros-dv-herris.climbTime@5000`) | 2100 | s | 35 min 00 s | S25 | medium | Independent check of the model. Herris: D.V, 160 hp Mercedes D.III, 915 kg. Speed altitude not stated (taken as sea level). |

---

---

## Open research gaps (no value recorded; nothing invented)

Updated after the flight-model validation (see `docs/FLIGHT_VALIDATION.md`).

| Gap | Needed for | Where to look next |
|---|---|---|
| Stall and landing speeds for all four aircraft | Validating the stall model (CLmax) | Only unsourced web listings were found (Camel "48 mph", Dr.I "72 km/h"); not used. Martlesham Heath / RAE / McCook test reports, or the printed Bruce and Mason books. |
| Which engine the 1921 McCook SPAD test aircraft had (220 hp Wright or 197 hp 8Ba) | SPAD climb validation | The Air Service Information Circular and McCook Field report for project P-154 |
| Wing gap of the production Dr.I and of the Albatros D.V | Multiplane induced drag (currently estimates from related types) | Windsock Datafiles, factory drawings |
| Engine power against altitude for these specific engines (rotaries, over-compressed Mercedes D.IIIa) | Altitude performance above about 4,000 m | Period engine test reports (RAE, McCook Field, Adlershof) |
| Propeller pitch and mass for all four aircraft | Propeller efficiency curve placement; gyroscopic effect | Museum object records |
| Engine mass for Oberursel UR.II and Mercedes D.IIIa | Centre of gravity | NASM engine records. A related Mercedes D.IIIav (supercharged) is listed at 288 kg, but that is a different engine. |
| Airfoil sections for each aircraft | Lift and drag curves | NACA and RAE reports on WWI sections |
| Fuel and oil capacities, fuel consumption | Endurance and weight change | Museum object records. S17 gives 83 kg fuel for the SPAD but the wording is ambiguous. |
| Camel and Dr.I range or endurance (sources disagree) | Fuel model | As above |
| Vickers Mk.I and LMG 08/15: rate of fire (synchronised), muzzle velocity, bullet mass, jam rates | Weapons | Royal Armouries, Imperial War Museum, Australian War Memorial |
| Measured stability and control data (damping, control power, inertia) | Handling | Eberhardt, AIAA 2005-119 (Museum of Flight WWI fighters), not yet accessible |
| Printed originals of the transcribed book tables (S22-S28) | Raising those values from medium confidence | Library copies of the books |

Resolved by the validation work: lower and middle wing spans (Camel, SPAD, Dr.I, Albatros), Camel and SPAD wing gaps, climb performance for all four aircraft, power against altitude (general law, S31), propeller efficiency (S30), multiplane theory (S29), and the meaning of the two Dr.I top-speed figures (sea level vs 4,000 m).
