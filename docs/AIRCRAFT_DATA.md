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

Consulted but not used for any value: RAF Museum Camel page (no specifications),
Grace's Guide Camel page (no figures), Smithsonian pages on si.edu (blocked by a bot check, not bypassed),
AIAA Paper 2005-119 (Eberhardt, Museum of Flight WWI fighters; full text not accessible, see Open research gaps).

---

## Sopwith Camel F.1 (Clerget 9B)

| Parameter | Value | Unit | Original figure | Source | Confidence | Notes |
|---|---|---|---|---|---|---|
| Wingspan (upper) | 8.53 | m | 28 ft | S1, S15 | high | S1 gives "28 ft (8.5 m)". Lower-wing span not found (see gaps). |
| Length | 5.72 | m | 18 ft 9 in | S1, S15 | high | |
| Height | 2.59 | m | 8 ft 6 in | S1, S15 | high | |
| Wing area | 21.46 | m² | 231 ft² | S8, S15 | medium | Reproduction and a compilation agree. No original-aircraft museum record gives it. |
| Empty weight | 421.8 | kg | 930 lb | S1 | high | S15 gives 421 kg. Other sources range 889 to 962 lb, depending on equipment and engine. |
| Maximum take-off weight | 659 | kg | 1,453 lb | S8, S15 | medium | Both give 1,453 lb. Treated as loaded weight with pilot, fuel, oil and ammunition. |
| Engine | Clerget 9B 9-cylinder rotary | — | 130 hp Clerget 9B | S1, S4, S11 | high | |
| Engine rated power | 96.9 | kW | 130 hp at 1,250 rpm | S11 | high | Sea-level rating. Power versus altitude still to be researched. |
| Engine rated speed | 1,250 | rpm | 1,250 rpm | S11 | high | |
| Engine bore x stroke | 120 x 160 | mm | 4.72 x 6.3 in | S11 | high | |
| Engine displacement | 16.26 | L | 992.07 in³ | S11 | high | |
| Engine mass | 173 | kg | 381 lb | S11 | high | Bare engine. Installed weight with cowling and mounts is not included. |
| Engine diameter (rotating) | 1.021 | m | 40.2 in | S11 | high | Used for the rotating-mass estimate below. |
| Engine rotation, viewed from the cockpit | clockwise | — | clockwise | S18, S19 | medium | Neither source states the direction outright. It is inferred from the effects they describe: S18 says the Camel turned "extremely sharply to the right and very poorly to the left", which needs forward-pointing engine angular momentum (clockwise from the cockpit). That also matches the product spec. S19 calls the old 270-degree left-turn habit a legend and suggests the practical effect was small, so the size of the effect is disputed. |
| Propeller diameter | 2.59 | m | — | ASSUMPTION | estimate | Only a single collector's reading of a Lang propeller stamp (2,590 mm, for the 130 hp Clerget) was found, on a forum that our source policy excludes. Held as an estimate until a museum record or propeller reference confirms it. |
| Maximum speed | 50.1 | m/s | 112 mph | S4 | medium | The altitude is not stated. S15 gives 115 mph (51.4 m/s). Some listings quote a lower speed at 10,000 ft, so treat this as a target to tune against, not a sea-level fact. |
| Service ceiling | 5,791 | m | 19,000 ft | S4, S15 | medium | The two sources agree, but neither gives the conditions (load, engine state), so a test-flight value may differ. |
| Armament | 2 x Vickers .303 in (7.7 mm), synchronised | — | two Vickers .303 | S1, S4 | high | Ballistics are not recorded yet (see gaps). |
| Zero-lift drag coefficient CD0 | 0.036 | — | — | ASSUMPTION | estimate | Back-calculated: level flight at 50.1 m/s needs thrust = 0.70 x 96.9 kW / 50.1 = 1,356 N. Induced drag (W = 659 kg, e = 0.75, aspect ratio 3.39) is 159 N. The remainder, over q x S (q = 1,535 Pa, S = 21.46 m²), gives 0.036. Assumes the top speed is at sea level and propeller efficiency 0.70. Both are guesses. |
| Oswald efficiency e | 0.75 | — | — | ASSUMPTION | estimate | No measured value located. A typical biplane value with gap/chord near 1. Refine with Munk biplane theory (NACA TR-151) in Phase 1. |
| Maximum lift coefficient CLmax | 1.3 | — | — | ASSUMPTION | estimate | No measured value located. Typical of a thin cambered 1917 wing section. Tune against a documented stall speed once found. |
| Static margin (`aero.staticMargin`) | 0.03 | fraction of chord | — | ASSUMPTION | estimate | No measured value located. Kept small because accounts of the Camel (S18) stress its extreme manoeuvrability, which goes with low pitch stability. A tuning choice to be adjusted by flying it. |
| Weathercock stability Cnβ (`aero.cnBeta`) | 0.07 | per rad | — | ASSUMPTION | estimate | No measured value located. Weathercock stability per radian, set a little lower than the inline aircraft as a design choice. Typical light-aircraft values are of this order. |
| Roll inertia Ixx | 2,997 | kg m² | — | ASSUMPTION | estimate | Loaded 659 kg x (0.25 x span)². No measured WWI inertia data located. |
| Pitch inertia Iyy | 1,941 | kg m² | — | ASSUMPTION | estimate | 659 kg x (0.30 x length)². Likely high for the Camel, whose mass is concentrated in the front. No measured WWI inertia data located, so the radius of gyration is assumed. |
| Yaw inertia Izz | 4,937 | kg m² | — | ASSUMPTION | estimate | Ixx + Iyy (flat-body approximation). No measured WWI inertia data located. |
| Rotating engine inertia about the crankshaft | 22.1 | kg m² | — | ASSUMPTION | estimate | 173 kg x (0.7 x 0.51 m)². Assumes the whole engine rotates with its mass at 70% of the radius. Drives gyroscopic precession (rotation speed at 1,250 rpm is 131 rad/s). |

## SPAD S.XIII (Hispano-Suiza 8Be)

| Parameter | Value | Unit | Original figure | Source | Confidence | Notes |
|---|---|---|---|---|---|---|
| Wingspan | 8.20 | m | 26 ft 11 in | S2, S5 | high | S17 gives 8.02 m for the tested aircraft 17956. |
| Length | 6.30 | m | 20 ft 8 in | S2, S5 | high | S17 gives 6.20 m. |
| Height | 2.41 | m | 7 ft 11 in | S2, S5 | high | |
| Wing area | 21.09 | m² | 227 ft² | S9, S17 | medium | A reproduction and a test article agree. |
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
| Maximum speed | 60.4 | m/s | 135 mph | S5 | medium | The altitude is not stated. |
| Maximum speed, measured (8Ba, 200 hp) | 59.2 | m/s | 213 km/h at 1,981 m | S17 | medium | McCook Field test, engine at 2,040 rpm. A different engine from the one modelled, so a floor for the 8Be, not an exact match. |
| Climb time to 1,981 m (6,500 ft), 8Ba | 390 | s | 6.5 min | S17 | medium | Same test. |
| Climb time to 4,572 m (15,000 ft), 8Ba | 1,380 | s | 23 min | S17 | medium | Same test. |
| Service ceiling | 5,608 | m | 18,400 ft | S17 | medium | Same test. Absolute ceiling 20,000 ft (6,096 m). |
| Armament | 2 x Vickers .303 in (7.7 mm), synchronised, 400 rounds per gun | — | two Vickers, 400 rounds each | S5, S17 | high | |
| Zero-lift drag coefficient CD0 | 0.0365 | — | — | ASSUMPTION | estimate | Same method as the Camel: 0.70 x 164 kW at 60.35 m/s, W = 820 kg, e = 0.75, AR = 3.19, S = 21.09 m², giving D = 1,902 N and induced drag 183 N. The result is sensitive to the altitude of the 135 mph figure. |
| Oswald efficiency e | 0.75 | — | — | ASSUMPTION | estimate | No measured value located. A typical biplane value with gap/chord near 1. Refine with Munk biplane theory (NACA TR-151) in Phase 1. |
| Maximum lift coefficient CLmax | 1.3 | — | — | ASSUMPTION | estimate | No measured value located. Typical of a thin cambered 1917 wing section. Tune against a documented stall speed once found. |
| Static margin (`aero.staticMargin`) | 0.1 | fraction of chord | — | ASSUMPTION | estimate | No measured value located. Set larger than the Camel and Dr.I as a design choice so the four aircraft handle differently. No source on SPAD stability was found. |
| Weathercock stability Cnβ (`aero.cnBeta`) | 0.12 | per rad | — | ASSUMPTION | estimate | No measured value located. A typical light-aircraft weathercock stability, used as the baseline. |
| Roll inertia Ixx | 3,446 | kg m² | — | ASSUMPTION | estimate | 820 kg x (0.25 x 8.20 m)². No measured WWI inertia data located, so the radius of gyration is assumed. |
| Pitch inertia Iyy | 2,929 | kg m² | — | ASSUMPTION | estimate | 820 kg x (0.30 x 6.30 m)². No measured WWI inertia data located, so the radius of gyration is assumed. |
| Yaw inertia Izz | 6,375 | kg m² | — | ASSUMPTION | estimate | Ixx + Iyy (flat-body approximation). No measured WWI inertia data located. |

## Fokker Dr.I (Oberursel UR.II)

No original Dr.I survives (S6), so all geometry and weights come from reproductions built to the original drawings.

| Parameter | Value | Unit | Original figure | Source | Confidence | Notes |
|---|---|---|---|---|---|---|
| Wingspan (upper) | 7.19 | m | 23 ft 7 in | S6, S10 | medium | Reproductions only. S10 gives 23.58 ft. Middle and lower spans not found (see gaps). |
| Length | 5.77 | m | 18 ft 11 in | S6, S7 | medium | S7 gives 5.77 m. |
| Height | 2.95 | m | 9 ft 8 in | S6, S7 | medium | Two reproduction sources agree. No original aircraft survives to measure. |
| Wing area (total, three wings) | 18.70 | m² | 201.5 ft² | S7, S10 | medium | Two reproduction sources agree (S10 converts to 18.72 m²). No original aircraft survives to measure. |
| Empty weight | 405 | kg | 891 lb | S6, S7 | medium | S7 gives 406 kg, S10 gives 893 lb. |
| Loaded weight | 586 | kg | 1,291 lb | S6, S7 | medium | S10 gives 1,289 lb. |
| Engine | Oberursel UR.II 9-cylinder rotary | — | 110 hp Oberursel Ur II | S6, S7, S13 | high | S6 also allows a Le Rhône 110 hp. The UR.II was a licensed Le Rhône 9J copy. |
| Engine rated power | 82.0 | kW | 110 hp at 1,200 rpm | S13 | medium | Some model-maker sources quote about 120 hp. Not used. |
| Engine rated speed | 1,200 | rpm | 1,200 rpm | S13 | medium | A single engine reference. Same rating as the other 110 hp Le Rhône type engines. |
| Engine bore x stroke | 112 x 170 | mm | 4.409 x 6.693 in | S13 | high | |
| Engine displacement | 15.07 | L | 919.87 in³ | S13 | high | |
| Engine rotation, viewed from the cockpit | clockwise | — | — | ASSUMPTION | estimate | Not found. Assumed to match the Clerget because the UR.II copied the Le Rhône 9J (S13) and French-type rotaries generally turned the same way. Needs a source before we rely on it. |
| Propeller diameter | 2.60 | m | — | ASSUMPTION | estimate | Only a forum post (excluded by our source policy) gave 2,600 to 2,620 mm for propellers fitted to the Dr.I with the 110 hp engine. Held as an estimate until a museum record confirms it. |
| Maximum speed | 46.0 | m/s | 103 mph | S6, S10 | medium | S7 gives 185 km/h (51.4 m/s). Altitude not stated. The two figures disagree by 12%. |
| Service ceiling | 6,000 | m | 19,685 ft | S6 | medium | One source only (a reproduction's fact sheet). Conditions not stated. |
| Rate of climb | 5.7 | m/s | 5.7 m/s | S7 | medium | Altitude not stated. |
| Armament | 2 x 7.92 mm LMG 08/15, synchronised | — | two 7.92 mm Spandau LMG 08/15 | S6, S10 | high | S7 says "LMG 08". |
| Zero-lift drag coefficient CD0 | 0.043 | — | — | ASSUMPTION | estimate | Same method as the Camel: 0.70 x 82 kW at 46.0 m/s (103 mph), W = 586 kg, e = 0.75, AR = 2.76, S = 18.70 m². Using the 185 km/h figure would give a much lower CD0. |
| Oswald efficiency e | 0.75 | — | — | ASSUMPTION | estimate | No measured value located. A typical biplane value with gap/chord near 1. Refine with Munk biplane theory (NACA TR-151) in Phase 1. A triplane may be somewhat higher. |
| Maximum lift coefficient CLmax | 1.4 | — | — | ASSUMPTION | estimate | No measured value located. Slightly above the biplanes because the Dr.I used thicker, cantilever wing sections. |
| Static margin (`aero.staticMargin`) | 0.04 | fraction of chord | — | ASSUMPTION | estimate | No measured value located. Kept small as a design choice for the most agile aircraft in the set. A tuning choice to be adjusted by flying it. |
| Weathercock stability Cnβ (`aero.cnBeta`) | 0.08 | per rad | — | ASSUMPTION | estimate | No measured value located. Set a little lower than the inline aircraft as a design choice. Typical light-aircraft values are of this order. |
| Roll inertia Ixx | 1,893 | kg m² | — | ASSUMPTION | estimate | 586 kg x (0.25 x 7.19 m)². No measured WWI inertia data located, so the radius of gyration is assumed. |
| Pitch inertia Iyy | 1,756 | kg m² | — | ASSUMPTION | estimate | 586 kg x (0.30 x 5.77 m)². No measured WWI inertia data located, so the radius of gyration is assumed. |
| Yaw inertia Izz | 3,649 | kg m² | — | ASSUMPTION | estimate | Ixx + Iyy (flat-body approximation). No measured WWI inertia data located. |
| Rotating engine inertia about the crankshaft | 18.8 | kg m² | — | ASSUMPTION | estimate | Engine mass and size were not found. Scaled from the Clerget 9B record (S11): 173 kg for 16.26 L gives 160 kg for the UR.II's 15.07 L (S13), radius 0.49 m, then 160 kg x (0.7 x 0.49 m)². |

## Albatros D.V (Mercedes D.IIIa)

Dimensions and weights come from the Smithsonian's original D.Va (D.7161/17), which the museum says combines parts from more than one Albatros.

| Parameter | Value | Unit | Original figure | Source | Confidence | Notes |
|---|---|---|---|---|---|---|
| Wingspan (upper) | 9.0 | m | 29 ft 6 in | S3, S16 | high | |
| Length | 7.3 | m | 24 ft | S3 | high | S16 gives 7.36 m. |
| Height | 2.8 | m | 9 ft 2 in | S3 | high | S16 gives 2.75 m. |
| Wing area | 20.9 | m² | 225 ft² | S16 | medium | A single compilation. Not in the museum record. |
| Empty weight | 680 | kg | 1,500 lb | S3 | high | S16 gives 717 kg. |
| Gross weight | 915 | kg | 2,017 lb | S3, S16 | high | |
| Engine | Mercedes D.IIIa 6-cylinder inline, water-cooled | — | 180 hp Mercedes D.IIIa | S3 | high | S3 says the D.V began with 160 hp and was later "approximately 180 horsepower". |
| Engine rated power | 130 | kW | 174 hp at 1,400 rpm | S14 | medium | S14 also calls it the "180-hp model". S3 gives 180 hp (134 kW). The ratings are inconsistent between sources. |
| Engine rated speed | 1,400 | rpm | 1,400 rpm | S14 | medium | A single engine reference, which also calls the engine a 180 hp model, so the rating basis is unclear. |
| Engine bore x stroke | 140 x 160 | mm | 5.512 x 6.299 in | S14 | medium | Given for the D.III. S14 says the D.IIIa crankshaft and rods were "practically identical". |
| Engine displacement | 14.78 | L | 901.81 in³ | S14 | medium | Same caveat. |
| Propeller diameter | 2.70 | m | — | ASSUMPTION | estimate | No source found for the D.V. Chosen so the tip speed at the rated 1,400 rpm is about 198 m/s, between the Camel (about 170 m/s) and the SPAD (about 206 m/s), the other aircraft in this set whose figures are recorded here. |
| Maximum speed | 47.2 | m/s | 170 km/h | S16 | medium | S16 pairs it with a 158 hp D.III engine, so a D.Va with the 180 hp D.IIIa should be faster. Altitude not stated. |
| Service ceiling | 5,000 | m | 16,404 ft | S16 | medium | A single compilation with no cited source, and it pairs the figure with a 158 hp D.III engine. |
| Armament | 2 x synchronised machine guns | — | machine guns, calibre not stated | S3 | medium | S3 says bullet damage passed through the right gun mount. Calibre and gun type to be confirmed in Phase 5. |
| Zero-lift drag coefficient CD0 | 0.0505 | — | — | ASSUMPTION | estimate | Same method as the Camel, using the S16 pairing: 0.70 x 118 kW at 47.2 m/s, W = 915 kg, e = 0.75, AR = 3.88, S = 20.9 m². Probably too high because the real aircraft had the stronger engine. |
| Oswald efficiency e | 0.75 | — | — | ASSUMPTION | estimate | No measured value located. A typical biplane value with gap/chord near 1. Refine with Munk biplane theory (NACA TR-151) in Phase 1. |
| Maximum lift coefficient CLmax | 1.3 | — | — | ASSUMPTION | estimate | No measured value located. Typical of a thin cambered 1917 wing section. Tune against a documented stall speed once found. |
| Static margin (`aero.staticMargin`) | 0.08 | fraction of chord | — | ASSUMPTION | estimate | No measured value located. Set larger than the Camel and Dr.I as a design choice. No source on Albatros stability was found. |
| Weathercock stability Cnβ (`aero.cnBeta`) | 0.12 | per rad | — | ASSUMPTION | estimate | No measured value located. A typical light-aircraft weathercock stability, used as the baseline. |
| Roll inertia Ixx | 4,632 | kg m² | — | ASSUMPTION | estimate | 915 kg x (0.25 x 9.0 m)². No measured WWI inertia data located, so the radius of gyration is assumed. |
| Pitch inertia Iyy | 4,388 | kg m² | — | ASSUMPTION | estimate | 915 kg x (0.30 x 7.3 m)². No measured WWI inertia data located, so the radius of gyration is assumed. |
| Yaw inertia Izz | 9,021 | kg m² | — | ASSUMPTION | estimate | Ixx + Iyy (flat-body approximation). No measured WWI inertia data located. |

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
| Torque cancelled by rigging (`common.torqueRigging`) | 0.8 | fraction | — | ASSUMPTION | estimate | Fraction of the rotary engine's reaction torque (at 60% throttle) cancelled by a fixed roll moment standing in for the rigging. Chosen so the rotary aircraft fly roughly level hands-off at cruise, while a change of throttle still disturbs them. No source found on how the Camel was rigged. |
| Peak propeller efficiency (`common.propEfficiencyPeak`) | 0.7 | — | — | ASSUMPTION | estimate | Typical for a fixed-pitch wooden propeller. It is the same value used when back-calculating zero-lift drag, so the two stay consistent. |
| Propeller best-efficiency speed (`common.propDesignSpeedFraction`) | 0.9 | fraction of top speed | — | ASSUMPTION | estimate | Propeller efficiency peaks at this fraction of the documented top speed. A design choice. |
| Propeller figure of merit (static) (`common.propStaticMerit`) | 0.6 | — | — | ASSUMPTION | estimate | Fraction of ideal momentum-theory thrust achieved with the aircraft stationary. A typical value for a fixed-pitch propeller. Gives static thrust of about 50 to 60% of weight. |
| Idle power (`common.idlePowerFraction`) | 0.05 | fraction of rated | — | ASSUMPTION | estimate | No source found. A design choice for the throttle-closed power. |
| Idle engine speed (`common.idleRpmFraction`) | 0.55 | fraction of rated | — | ASSUMPTION | estimate | No source found. A design choice for the throttle-closed engine speed. Sets the gyroscopic angular momentum at low throttle. |
| Flat-plate drag coefficient (stalled wing) (`constants.FLAT_PLATE_CD`) | 1.98 | — | — | ASSUMPTION | estimate | A textbook value for a flat plate broadside to the wind. Not checked against a source in this project. Used for the post-stall drag. |
| Wing section lift slope (`constants.SECTION_LIFT_SLOPE`) | 5.655 | per rad | 0.9 x 2 pi | ASSUMPTION | estimate | Thin-airfoil theory gives 2 pi per radian and real sections reach about 90% of that. A textbook relation. Used to derive each aircraft's finite-wing lift slope. |
| Engine power versus air density | proportional | — | P = P0 x density ratio | ASSUMPTION | estimate | A simple stand-in. Gagg and Farrar (S21) describe a better formula for normally aspirated engines, but their constants were not verified. |

---

---

## Open research gaps (no value recorded; nothing invented)

These are needed in later phases. None is required by Phase 0 acceptance.

| Gap | Needed for | Where to look next |
|---|---|---|
| Propeller pitch and mass for all four aircraft | Thrust and gyroscopic effect | Museum object records |
| Engine mass for Oberursel UR.II and Mercedes D.IIIa | Centre of gravity (Phase 1) | NASM engine records. A related Mercedes D.IIIav (supercharged) is listed at 288 kg, but that is a different engine. |
| Engine power versus altitude for all four engines | Altitude performance | Period engine test reports (Royal Aircraft Establishment, McCook Field). Phase 1 uses power proportional to air density, an estimate (see Common flight-model parameters). Gagg and Farrar (S21) describe a better method; its constants were not verified. |
| Stall speeds, wing loading checks and landing speeds | Tuning CLmax (Phase 1) | Test pilots' reports, McCook Field reports |
| Lower and middle wing spans and chords, gap, stagger, dihedral, incidence | Wing geometry (Phase 1) | Museum drawings, Windsock Datafiles |
| Airfoil sections for each aircraft | Lift and drag curves (Phase 1) | NACA and RAE reports on WWI sections |
| Fuel and oil capacities, fuel consumption | Endurance and weight change (Phases 1 and 5) | Museum object records. S17 gives 83 kg fuel for the SPAD but the wording is ambiguous. |
| Climb performance for Camel, Dr.I and Albatros with altitude | Tuning (Phase 1) | Martlesham or McCook test reports |
| Camel and Dr.I range or endurance (sources disagree) | Fuel model (Phase 1) | As above |
| Vickers Mk.I and LMG 08/15: rate of fire (synchronised), muzzle velocity, bullet mass, jam rates | Weapons (Phase 5) | Royal Armouries, Imperial War Museum, Australian War Memorial |
| Aerodynamic data for the estimates above (CD0, e, CLmax, inertia) | Phase 1 | Eberhardt, AIAA 2005-119 (Museum of Flight WWI fighters), Munk, NACA TR-151 "General Biplane Theory". Neither could be read in Phase 0. |
| Propeller efficiency (0.70 assumed in the CD0 estimates) | Phase 1 | Period propeller tests |
