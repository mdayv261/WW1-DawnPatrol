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
| S37 | flyingmachines.ru Camel page, specification table (Mason / King / Flight 1918 as quoted): chord, gap, stagger, dihedral, tailplane span and area; Thetford caption on Barker's B6313; German translation of Flight, Sept 1918, on B.6290 colours | https://flyingmachines.ru/Site2/Crafts/Craft25445.htm | Transcription of books and a 1918 journal |
| S38 | Aeronautical conservancy / NASM, fabric from Fokker Dr.I 425/17 (Richthofen's aircraft): paint layers | https://www.aeroconservancy.com/fokker-dr-i-425-17-fabric-richthofe | Museum conservation record |
| S39 | flyingmachines.ru Fokker Dr.I page: Thetford and Gray (doubt that Richthofen flew an all-scarlet Dr.I; serials), Herris and Phillips and Weyl (wing chord, markings of early aircraft) | https://flyingmachines.ru/Site2/Crafts/Craft25493.htm | Transcription of books |
| S40 | Vickers MG Collection and Research Association blog, ".303 inch Mk I": cyclic rate 450-550 rpm, 250-round belt, weight | https://vickersmg.blog/the-guns/303-inch-mk-i/ | Specialist reference site (not a forum) |
| S41 | Royal Armouries, Vickers-Maxim Mk I record (rate of fire 550 rpm) and IWM record that the Vickers was fitted to Allied aircraft from 1916 once synchronisation was developed | https://collections.royalarmouries.org/object/rac-object-50943 and https://www.iwm.org.uk/collections/item/object/30034908 | Museum records (read through search-result summaries only; the pages themselves could not be opened) |
| S42 | The Vintage Aviator (NZ), "The Spandau LMG 08/15": 400-500 rpm depending on synchroniser and engine speed, 2,821 ft/s, 7.92 x 57 mm | https://thevintageaviator.co.nz/projects/reproduction-guns/luftgekult-maschinen-gewehr-08-15-machine-gun | Museum-quality reproduction maker's page |
| S43 | Royal Armouries, Maxim MG 08/15 (rate 450 rpm) and Australian War Memorial MG 08/15 record (up to 450 rpm) | https://collections.royalarmouries.org/first-world-war/type/rac-narrative-63.html and https://www.awm.gov.au/collection/C154473 | Museum records (read through search-result summaries only) |
| S44 | Western Front Association, "The .303 Cartridge" (2008): 174 grains, about 2,400 ft/s | https://www.westernfrontassociation.com/world-war-i-articles/2008/may/the-303-cartridge/ | Society article |
| S45 | JBM Ballistics: G1 drag function tabulated by R. McCoy (mcg1.txt), from E. Lowry, Exterior Ballistics of Small Arms Projectiles (Winchester-Western, 1965) | https://jbmballistics.com/downloads.html | Published standard drag table |
| S46 | H. Weyl, Fokker: The Creative Years (Putnam), as quoted on the flyingmachines.ru Dr.I page: Dr.I V.4 prototype wing load test (ultimate load factor 7.92), acceptance fuel, and von Tutschek's claimed dive speed | https://flyingmachines.ru/Site2/Crafts/Craft25493.htm | Reference book (transcription) |
| S47 | Smithsonian National Air and Space Museum, photograph "Cockpit of the Sopwith F.1 Camel" (B6291), CC0: R.P.M. upper left, compass upper centre, AIR SPEED upper right, HEIGHT lower centre, AIR (tank pressure) gauge lower right, two brass switches lower left | https://airandspace.si.edu/multimedia-gallery/image/nasm2017-02779-sjpg | Museum photograph of an original aircraft |
| S48 | National Museum of the US Air Force image gallery, "SPAD XIII tachometer, Jaeger Paris Type AM" | https://www.nationalmuseum.af.mil/Upcoming/Photos/igphoto/2001067343/ (and igphoto 2001067342) | Museum record (read through a search-result summary only) |
| S49 | The Vintage Aviator (NZ), Albatros D.Va page: airspeed anemometer on the right-hand wing strut (km/h), tachometer in front of the pilot, small fuel tank air pressure gauge, a fuel gauge; no oil pressure or temperature indication | https://www.thevintageaviator.co.nz/node/232 | Museum-quality reproduction maker's page (their replica, built from originals) |
| S50 | Australian War Memorial, Albatros D.Va D.5390/17 (captured 1917): Morell tachometer, petrol and oil pressure gauges (Maximall); a British airspeed indicator fitted later and removed; no altimeter mountings found; the watch and probably the compass souvenired at capture | https://www.awm.gov.au/articles/blog/conservation-of-the-albatros-dva and https://www.awm.gov.au/articles/blog/capturing-albatros | Museum conservation articles (read through search-result summaries only) |
| S51 | Smithsonian National Air and Space Museum, "Simple Altimeter, Adjustable, French", L. Hatot, ca. 1917 (A19570033000): range 0-5,000 m in one turn, black outer ring with figures 0-4, silver dial with a barometer scale in cm of mercury, "AVIATION MILITAIRE", "BAROMÈTRE ALTIMÈTRE COMPENSÉ", single needle, knurled setting knob | https://airandspace.si.edu/collection-objects/simple-altimeter-adjustable-french/nasm_A19570033000 | Museum object record and photograph |
| S52 | Alamy stock photograph "The cockpit and guns on a WWI German Fokker DR1 fighter Triplane in a hanger at the Military Aviation Museum in Virginia Beach" (image ID FW7A0H): a flying replica with modern instruments. Used only as a visual reference for the 3D cockpit (the padded rim arching over a wooden panel, the guns on steel posts with a ring sight on each, the red metal decking); nothing from it is copied into the game | https://www.alamy.com/stock-photo-the-cockpit-and-guns-on-a-wwi-german-fokker-dr1-fighter-triplane-in-101575281.html | Photograph of a modern replica (low confidence for period detail) |
| S53 | Rise of Flight (a commercial flight simulator), store page for its Fokker Dr.I, cockpit picture: the guns close together over the centre with a leather pad on each breech and a ring sight on each gun, a riveted steel bulkhead with the rev counter between the breeches, dials on the right-hand wall, a thin leather rim, dark steel tubes, a plank floor | https://riseofflight.ru/store/aircraft/fokker-dri/ | A game's rendering, chosen by the product owner as the look of the Dr.I cockpit; used only as a visual reference, nothing copied; not historical evidence |
| S54 | J. Herris and J. Scott, Fokker Aircraft of WWI, vol. 2: Eindeckers (Aeronaut Books): E.IV specification table (span 10.05 m, chord 1.81 m, area 16 m², 466/724 kg, 160 km/h), climb 1-4 km, production orders, armament (designed for three guns), U.III rebuild every 20 hours, colour captions, as transcribed on flyingmachines.ru | https://flyingmachines.ru/Site2/Crafts/Craft25489.htm | Reference book (transcription) |
| S55 | O. Thetford and P. Gray, German Aircraft of the First World War, and W. Green and G. Swanborough, The Complete Book of Fighters: Fokker E.IV dimensions, weights, speed, ceiling; all-moving comma rudder and elevators with no fixed surfaces; Immelmann's three-gun aircraft, as transcribed on flyingmachines.ru | https://flyingmachines.ru/Site2/Crafts/Craft25489.htm | Reference books (transcription) |
| S56 | H. Weyl, Fokker: The Creative Years (Putnam), Fokker E.IV: Parschau test report (13 Nov 1915) climbs and speed; Boelcke's report (24 Mar 1916); U.III loss of 40-50 rpm at altitude when new, 100 or more after use; force needed for warping in steep turns, as quoted on flyingmachines.ru | https://flyingmachines.ru/Site2/Crafts/Craft25489.htm | Reference book (transcription) |
| S57 | V. Kondratyev, Samolety pervoy mirovoy voyny (Russian): Fokker E.IV and Nieuport 11 data and text, as given on flyingmachines.ru | https://flyingmachines.ru/Site2/Crafts/Craft25489.htm and https://flyingmachines.ru/Site2/Crafts/Craft25458.htm | Reference book (Russian original text on the page) |
| S58 | J. Davilla and A. Soltan, French Aircraft of the First World War (Flying Machines Press): Nieuport 11 specification (7.52 m, 13.3 m², 320/480 kg, 162 km/h at 2,000 m, climbs, ceiling), wing chords 1.20 m and 0.70 m, lower wing 6 degrees dihedral, stagger 0.60 m, tailplane span, wheel track, 97-cartridge drum, lower wing fractures, as transcribed on flyingmachines.ru | https://flyingmachines.ru/Site2/Crafts/Craft25458.htm | Reference book (transcription) |
| S59 | W. Green and G. Swanborough, The Complete Book of Fighters, and O. Thetford, British Naval Aircraft since 1912 (Putnam): Nieuport 11 speeds, climbs, ceiling, dimensions; lower wing half the upper wing's area and prone to twist and break, as transcribed on flyingmachines.ru | https://flyingmachines.ru/Site2/Crafts/Craft25458.htm | Reference books (transcription) |
| S60 | J. Bruce, Nieuport Fighters (Albatros Productions), R. Gentilli (Italian Aviation Units, Aeronaut), O. Cowin (Aviation Pioneers, Osprey), A. Sheps and V. Shavrov: Nieuport 11 drums (47 rounds RNAS; 97 rounds Italian), gun mounts, colour schemes, V-strut weakness, licence-built variants, as transcribed on flyingmachines.ru | https://flyingmachines.ru/Site2/Crafts/Craft25458.htm | Reference books (transcription) |
| S61 | Deutsches Museum, Flugwerft Schleissheim, Oberursel U III: 14-cylinder two-row rotary, 118 kW (160 hp) at 1,200 rpm, bore 124 mm, stroke 140 mm, 23.7 L, 193 kg | https://www.deutsches-museum.de/en/flugwerft-schleissheim/ausstellung/flugantriebe-und-raketen/oberursel-u-iii | Museum record, original engine |
| S62 | Smithsonian NASM, Le Rhone Model C 9-cylinder rotary (A19200011000; also A19820090000): 80 hp at 1,200 rpm, 105 x 140 mm, 10.9 L, 109 kg (115 kg for the second engine); and Australian War Memorial C111373, Le Rhône 9C: 80 hp at 1,200 rpm, 11 L, diameter 940 mm | https://si.edu/object/le-rhone-model-c-9-cylinder-rotary-engine:nasm_A19200011000 and https://www.awm.gov.au/collection/C111373 | Museum records, original engines (Smithsonian read through search-result summaries only, the page blocks automated reading) |
| S63 | Heugh Battery Museum, .303 Lewis Gun 1914 Pattern Mk I record: 500-600 rounds a minute, 47- or 97-round magazine | https://museumdata.uk/objects/6d361fb8-3764-34c8-a32a-fa0551350199 | Museum record |

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
| Cylinders (`engine.cylinders`) | 9 | — | 9-cylinder rotary | S1, S4, S11 | high | Sets the engine sound's firing rate (Phase 6). |
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
| Rounds carried per gun (`guns.rounds`) | 250 | rounds | — | S23 | medium | King (S23): 250 rounds per gun at first, "later increased"; the same page gives a total of 600 for the two guns. The first figure is used. |
| Gun muzzle ahead of the CG (`guns.muzzleX`) | 1.72 | m | — | ASSUMPTION | estimate | Not found. About 0.30 of the length, just behind the propeller plane; places the guns on top of the nose as the sources describe. Shots are timed so they pass between the propeller blades. |
| Gun muzzle above the CG (`guns.muzzleY`) | 0.645 | m | — | ASSUMPTION | estimate | Not found. On top of the cowling, above the engine: the cowling's top is 0.60 m (centre 0.05 m + radius 0.55 m), plus the barrel jacket's radius. Was 0.56, which put the barrels inside the nose (Phase 6, found when the product owner asked for the guns to show as on the SPAD). |
| Gun muzzle each side of the centre line (`guns.muzzleZ`) | 0.13 | m | — | ASSUMPTION | estimate | Not found. The two guns are mounted on top of the nose, a few inches apart (S22, S23 for the Camel); the guns are parallel to the aircraft's axis. |
| Fuel carried (`fuel.capacity`) | 78 | kg | — | ASSUMPTION | estimate | The tank size was not found. S22 and S24 give an endurance of about 2.5 hours; 78 kg is 2.5 hours at this model's cruise fuel use (80% of rated power at 0.40 kg per kWh, 31 kg an hour). Only the burn time depends on it; the aircraft's mass does not change as fuel burns. |
| Ultimate load factor (`structure.ultimateLoad`) | 6 | g | — | ASSUMPTION | estimate | No strength test or design load found for the Camel. A typical design figure for a WWI fighter, a little below the Fokker prototype's tested 7.92 (S46) because the Camel is lighter built. Tune by flying. |
| Never-exceed speed (`structure.neverExceedSpeed`) | 70 | m/s | about 157 mph | ASSUMPTION | estimate | No diving limit found. 1.35 times the documented top speed (52.3 m/s). Wings begin to take damage above it and fail 25% above it. |
| Propeller blades (`propeller.blades`) | 2 | — | two-bladed | S1, S2 | high | All four aircraft had two-bladed wooden propellers (museum records). |
| Propeller blade chord at the guns (`propeller.chord`) | 0.17 | m | — | ASSUMPTION | estimate | Not found. As drawn on the model (0.17 to 0.18 m, a typical blade width at a third of the radius); used by the synchroniser to know when a blade covers a gun. |
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
| Pilot's eye behind the CG (`cockpit.eyeBehind`) | 0.72 | m | — | ASSUMPTION | estimate | Not found. Was 0.63 (about 11% of the length); moved back in Phase 6 when the guns and eye were raised, so the whole instrument board stays in view below the guns while the upper wing still fills the top of the view. Camera, 3D cockpit and the pilot's hit box. |
| Pilot's eye above the CG (`cockpit.eyeAbove`) | 0.76 | m | — | ASSUMPTION | estimate | Not found. A little above the top of the guns (their centre line is `guns.muzzleY`), because the pilot aimed by sighting along them through the ring sight. Camera and 3D cockpit only. Was 0.6 before the 3D cockpit (Phase 6), then 0.7; raised with the guns. |
| Wing chord (`visual.chord`) | 1.37 | m | 4 ft 6 in | S32, S37 | medium | Both wings. S37 (Flight, 1918, quoted on the page) gives 1.37 m. |
| Wing stagger (`visual.stagger`) | 0.457 | m | 18 in | S32, S37 | medium | Upper wing ahead of the lower, at the fuselage. |
| Lower wing dihedral (`visual.lowerDihedral`) | 0.0873 | rad | 5 degrees | S37 | medium | The upper wing has no dihedral (S37). |
| Tailplane span (`visual.tailSpan`) | 2.5 | m | 8 ft 2.5 in | S37 | medium | One source (the page's specification table). |
| Tailplane chord (`visual.tailChord`) | 0.52 | m | tailplane 14 sq ft | S37 | medium | Derived: tailplane area 14 sq ft (1.30 m²) divided by its span. |
| Fin and rudder height (`visual.finHeight`) | 0.85 | m | — | ASSUMPTION | estimate | S37 gives only the areas (fin 3 sq ft, rudder 4.9 sq ft, together 0.73 m²). 0.85 m assumes a mean chord near 0.85 m. |
| Greatest fuselage depth (`visual.fuselageDepth`) | 1.0 | m | — | ASSUMPTION | estimate | No source gives the fuselage size. Scaled from the cockpit and the 1.0 m rotary engine (S11); camera and looks only. |
| Greatest fuselage width (`visual.fuselageWidth`) | 0.62 | m | — | ASSUMPTION | estimate | Not found. Chosen narrower than the engine cowling and wide enough for a pilot's shoulders. |
| Engine cowling diameter (`visual.cowlingDiameter`) | 1.1 | m | — | ASSUMPTION | estimate | The Clerget 9B is 1.021 m across (S11); 1.1 m adds an assumed cowling thickness. |

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
| Cylinders (`engine.cylinders`) | 8 | — | V-8 | S2, S5, S12 | high | Sets the engine sound's firing rate (Phase 6). |
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
| Rounds carried per gun (`guns.rounds`) | 400 | rounds | — | S5, S17 | high | As in the Armament row. |
| Gun muzzle ahead of the CG (`guns.muzzleX`) | 1.89 | m | — | ASSUMPTION | estimate | Not found. About 0.30 of the length, just behind the propeller plane; places the guns on top of the nose as the sources describe. Shots are timed so they pass between the propeller blades. |
| Gun muzzle above the CG (`guns.muzzleY`) | 0.5 | m | — | ASSUMPTION | estimate | Not found. On top of the cowling, above the engine, as drawn on the model. |
| Gun muzzle each side of the centre line (`guns.muzzleZ`) | 0.16 | m | — | ASSUMPTION | estimate | Not found. Position chosen to look right on the model and to cross the propeller disc, so the synchroniser matters; the guns are parallel to the aircraft's axis. |
| Fuel carried (`fuel.capacity`) | 83 | kg | — | ASSUMPTION | estimate | S17 gives 83 kg of fuel, but its wording is ambiguous (see the gaps table), so it is held as an estimate. |
| Ultimate load factor (`structure.ultimateLoad`) | 7 | g | — | ASSUMPTION | estimate | No strength test found. S2 says only that the SPAD was noted for robust construction, so it is set a little above the Camel's. |
| Never-exceed speed (`structure.neverExceedSpeed`) | 80 | m/s | about 179 mph | ASSUMPTION | estimate | No diving limit found. 1.35 times the documented top speed (59.17 m/s). |
| Propeller blades (`propeller.blades`) | 2 | — | two-bladed | S1, S2 | high | All four aircraft had two-bladed wooden propellers (museum records). |
| Propeller blade chord at the guns (`propeller.chord`) | 0.18 | m | — | ASSUMPTION | estimate | Not found. As drawn on the model (0.17 to 0.18 m, a typical blade width at a third of the radius); used by the synchroniser to know when a blade covers a gun. |
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
| Pilot's eye above the CG (`cockpit.eyeAbove`) | 0.64 | m | — | ASSUMPTION | estimate | Not found. A little above the top of the guns (their centre line is `guns.muzzleY`), because the pilot aimed by sighting along them through the ring sight. Camera and 3D cockpit only. Was 0.6 before the 3D cockpit (Phase 6). |
| Wing chord (`visual.chord`) | 1.4 | m | 1.400 m | S17 | medium | Both wings, from the McCook Field test aircraft (S17). |
| Wing stagger (`visual.stagger`) | 0.4 | m | — | ASSUMPTION | estimate | S17 gives the stagger only as an angle of 1.25 degrees, which is not a length. 0.4 m is assumed from drawings of the type; model shape only. |
| Tailplane span (`visual.tailSpan`) | 2.6 | m | — | ASSUMPTION | estimate | Not found. About a third of the wingspan, as on the other three types. |
| Tailplane chord (`visual.tailChord`) | 0.7 | m | — | ASSUMPTION | estimate | Not found. Assumed from the span and a typical tailplane area. |
| Fin and rudder height (`visual.finHeight`) | 0.8 | m | — | ASSUMPTION | estimate | Not found. Assumed from the overall height of 2.41 m (S2). |
| Greatest fuselage depth (`visual.fuselageDepth`) | 0.9 | m | — | ASSUMPTION | estimate | Not found. Sized from the V8 engine and a seated pilot. |
| Greatest fuselage width (`visual.fuselageWidth`) | 0.62 | m | — | ASSUMPTION | estimate | Not found. Chosen to fit a seated pilot's shoulders. |
| Engine cowling diameter (`visual.cowlingDiameter`) | 0.8 | m | — | ASSUMPTION | estimate | Not found. A V8 is a narrow engine, so a narrow nose; sized to the engine block width. |

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
| Cylinders (`engine.cylinders`) | 9 | — | 9-cylinder rotary | S6, S7, S13 | high | Sets the engine sound's firing rate (Phase 6). |
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
| Rounds carried per gun (`guns.rounds`) | 500 | rounds | — | S26 | medium | Herris and Phillips (S26): each LMG 08/15 "carried 500 rounds" on the prototype V.5; taken to apply to production aircraft. |
| Gun muzzle ahead of the CG (`guns.muzzleX`) | 1.73 | m | — | ASSUMPTION | estimate | Not found. About 0.30 of the length, just behind the propeller plane; places the guns on top of the nose as the sources describe. Shots are timed so they pass between the propeller blades. |
| Gun muzzle above the CG (`guns.muzzleY`) | 0.59 | m | — | ASSUMPTION | estimate | Not found. On top of the cowling, above the engine: the cowling's top is 0.54 m (centre 0.02 m + radius 0.52 m), plus the barrel jacket's radius; the guns stood on posts above the decking, as in a photograph of a replica (S52). Was 0.52, inside the cowling (Phase 6). |
| Gun muzzle each side of the centre line (`guns.muzzleZ`) | 0.17 | m | — | ASSUMPTION | estimate | Not found. The spacing in a photograph of a replica's cockpit (S52), about a third of a metre apart. Was 0.14 (Phase 6). |
| Fuel carried (`fuel.capacity`) | 54 | kg | 75 litres | S26 | medium | Herris and Phillips give a 75 litre tank for the V.5 prototype. Converted at 0.72 kg per litre, an assumed petrol density. |
| Ultimate load factor (`structure.ultimateLoad`) | 7 | g | 7.92 on the V.4 prototype | ASSUMPTION | estimate | Weyl (S46) reports an ultimate load factor of 7.92 for the V.4 prototype's wing test. Production aircraft are assumed 12% lower, because early production Dr.Is lost wings in service. |
| Never-exceed speed (`structure.neverExceedSpeed`) | 69 | m/s | about 154 mph | ASSUMPTION | estimate | No diving limit found. 1.35 times the documented top speed (51.39 m/s). Von Tutschek's claimed dive of over 240 km/h (67 m/s) is called possible but unlikely by Weyl (S46). |
| Propeller blades (`propeller.blades`) | 2 | — | two-bladed | S1, S2 | high | All four aircraft had two-bladed wooden propellers (museum records). |
| Propeller blade chord at the guns (`propeller.chord`) | 0.17 | m | — | ASSUMPTION | estimate | Not found. As drawn on the model (0.17 to 0.18 m, a typical blade width at a third of the radius); used by the synchroniser to know when a blade covers a gun. |
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
| Pilot's eye behind the CG (`cockpit.eyeBehind`) | 1 | m | — | ASSUMPTION | estimate | Not found. The pilot sat behind the middle wing; the eye is placed so the whole instrument panel shows below the raised guns (0.63 before Phase 6). Camera, 3D cockpit and the pilot's hit box. |
| Pilot's eye above the CG (`cockpit.eyeAbove`) | 0.72 | m | — | ASSUMPTION | estimate | Not found. A little above the top of the guns (their centre line is `guns.muzzleY`), level with their ring sights. Camera and 3D cockpit only. Was 0.6 before the 3D cockpit, then 0.66 (Phase 6). |
| Wing chord (`visual.chord`) | 1.0 | m | 980 mm, then 1000 mm | S39 | medium | All three wings. The chord was changed from 980 mm (prototype) to 1000 mm for production aircraft (S39). |
| Wing stagger (`visual.stagger`) | 0.15 | m | — | ASSUMPTION | estimate | The production Dr.I stagger was not found; the MAG-Fokker 90.03 (a different machine) had 0.23 to 0.26 m (S28). A smaller value is used for the shorter Dr.I. |
| Tailplane span (`visual.tailSpan`) | 2.6 | m | — | ASSUMPTION | estimate | Not found. About a third of the 7.19 m wingspan, as on the other types. |
| Tailplane chord (`visual.tailChord`) | 0.7 | m | — | ASSUMPTION | estimate | Not found. Assumed from the span and a typical tailplane area. |
| Rudder height (`visual.finHeight`) | 0.9 | m | — | ASSUMPTION | estimate | Not found. The Dr.I has no fixed fin, only a comma-shaped rudder (S39); the height is assumed from the overall height of 2.95 m. |
| Greatest fuselage depth (`visual.fuselageDepth`) | 0.85 | m | — | ASSUMPTION | estimate | Not found. A short, slab-sided fuselage (S39) sized to a seated pilot. |
| Greatest fuselage width (`visual.fuselageWidth`) | 0.68 | m | — | ASSUMPTION | estimate | Not found. Chosen to fit a seated pilot's shoulders (0.62), then widened 10% in Phase 6 at the product owner's request for a roomier cockpit. Also sets the width of the fuselage's hit box. |
| Engine cowling diameter (`visual.cowlingDiameter`) | 1.04 | m | engine 960 mm | ASSUMPTION | estimate | The Oberursel UR.II is 960 mm across (S39); 1.04 m adds an assumed cowling thickness. |

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
| Cylinders (`engine.cylinders`) | 6 | — | 6-cylinder inline | S3, S14 | high | Sets the engine sound's firing rate (Phase 6). |
| Engine rated power | 130 | kW | 174 hp at 1,400 rpm | S14 | medium | S14 also calls it the "180-hp model". S3 gives 180 hp (134 kW). The ratings are inconsistent between sources. |
| Engine rated speed | 1,400 | rpm | 1,400 rpm | S14 | medium | A single engine reference, which also calls the engine a 180 hp model, so the rating basis is unclear. |
| Engine bore x stroke | 140 x 160 | mm | 5.512 x 6.299 in | S14 | medium | Given for the D.III. S14 says the D.IIIa crankshaft and rods were "practically identical". |
| Engine displacement | 14.78 | L | 901.81 in³ | S14 | medium | Same caveat. |
| Propeller diameter | 2.70 | m | — | ASSUMPTION | estimate | No source found for the D.V. Chosen so the tip speed at the rated 1,400 rpm is about 198 m/s, between the Camel (about 170 m/s) and the SPAD (about 206 m/s), the other aircraft in this set whose figures are recorded here. |
| Propeller rotation, viewed from the cockpit | clockwise | — | — | ASSUMPTION | estimate | Not found. Assumed clockwise; used only for the small slipstream and P-factor effects. |
| Maximum speed | 47.78 | m/s | 172 km/h | S25 | medium | Herris: D.Va with the 170 hp Mercedes D.IIIa at 937 kg; altitude not stated, taken as sea level. The drag (CD0) is calibrated to this at those conditions. S16's 170 km/h belongs to the D.V with the 160 hp D.III (also in S25). |
| Service ceiling | 5,800 | m | 5,800 m | S25 | medium | Herris, D.Va. S16 gives 5,000 m (a compilation pairing it with the D.III engine). |
| Armament | 2 x synchronised machine guns | — | machine guns, calibre not stated | S3 | medium | S3 says bullet damage passed through the right gun mount. Calibre and gun type to be confirmed in Phase 5. |
| Rounds carried per gun (`guns.rounds`) | 500 | rounds | — | ASSUMPTION | estimate | Not found for the D.V (S25 says only that all were armed with two machine guns). Copied from the Dr.I, which used the same gun and a similar belt box. |
| Gun muzzle ahead of the CG (`guns.muzzleX`) | 2.19 | m | — | ASSUMPTION | estimate | Not found. About 0.30 of the length, just behind the propeller plane; places the guns on top of the nose as the sources describe. Shots are timed so they pass between the propeller blades. |
| Gun muzzle above the CG (`guns.muzzleY`) | 0.5 | m | — | ASSUMPTION | estimate | Not found. On top of the cowling, above the engine, as drawn on the model. |
| Gun muzzle each side of the centre line (`guns.muzzleZ`) | 0.18 | m | — | ASSUMPTION | estimate | Not found. Position chosen to look right on the model and to cross the propeller disc, so the synchroniser matters; the guns are parallel to the aircraft's axis. |
| Fuel carried (`fuel.capacity`) | 70 | kg | — | ASSUMPTION | estimate | Not found. S3 mentions only an emergency tank. 70 kg is about 1.6 hours at this model's cruise fuel use for the 130 kW engine. |
| Ultimate load factor (`structure.ultimateLoad`) | 5.5 | g | — | ASSUMPTION | estimate | No strength test found. Set below the others because S3 and S25 record upper wing spar failures soon after the D.V's introduction and weak lower wing attachments. |
| Never-exceed speed (`structure.neverExceedSpeed`) | 60 | m/s | about 134 mph | ASSUMPTION | estimate | No diving limit found. Only 1.25 times the documented top speed (47.78 m/s), because lower wings failed in dives (S3, S25). |
| Propeller blades (`propeller.blades`) | 2 | — | two-bladed | S1, S2 | high | All four aircraft had two-bladed wooden propellers (museum records). |
| Propeller blade chord at the guns (`propeller.chord`) | 0.18 | m | — | ASSUMPTION | estimate | Not found. As drawn on the model (0.17 to 0.18 m, a typical blade width at a third of the radius); used by the synchroniser to know when a blade covers a gun. |
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
| Pilot's eye above the CG (`cockpit.eyeAbove`) | 0.64 | m | — | ASSUMPTION | estimate | Not found. A little above the top of the guns (their centre line is `guns.muzzleY`), because the pilot aimed by sighting along them through the ring sight. Camera and 3D cockpit only. Was 0.6 before the 3D cockpit (Phase 6). |
| Upper wing chord (`visual.chord`) | 1.49 | m | 1.49 m (D.Va) | S25 | medium | Herris: 1.5 m for the D.V and 1.49 m for the D.Va; the D.Va figure is used, as the dimensions follow the Smithsonian D.Va (S3). |
| Lower wing chord (`visual.lowerChord`) | 1.0 | m | 1.0 m | S25 | medium | The narrow lower wing makes the Albatros a sesquiplane (S3, S25). |
| Wing stagger (`visual.stagger`) | 0.3 | m | — | ASSUMPTION | estimate | Not found for the D.V. Assumed from the small stagger of the V-strutter type. |
| Tailplane span (`visual.tailSpan`) | 3.0 | m | — | ASSUMPTION | estimate | Not found. About a third of the 9.0 m wingspan, as on the other types. |
| Tailplane chord (`visual.tailChord`) | 0.85 | m | — | ASSUMPTION | estimate | Not found. Assumed from the span and a typical tailplane area. |
| Fin and rudder height (`visual.finHeight`) | 0.9 | m | — | ASSUMPTION | estimate | Not found. Assumed from the overall height of 2.8 m (S3). |
| Greatest fuselage depth (`visual.fuselageDepth`) | 1.0 | m | — | ASSUMPTION | estimate | Not found. The D.V fuselage is a deep elliptical section (S25); the depth is assumed to suit a pilot seated inside it. |
| Greatest fuselage width (`visual.fuselageWidth`) | 0.7 | m | — | ASSUMPTION | estimate | Not found. Assumed from the Mercedes D.IIIa engine width and the elliptical section (S25). |
| Engine cowling diameter (`visual.cowlingDiameter`) | 0.78 | m | — | ASSUMPTION | estimate | Not found. A six-cylinder inline is a narrow engine; sized to the Mercedes block and the large spinner. |

## Liveries (Phase 3)

Schemes chosen by the product owner on 11 Oct 2026 from the sourced candidates. The model shows the parts the sources describe; anything they do not describe is marked as an estimate. Colours are drawn in code (no copyrighted artwork) and simplified: the Albatros lozenge fabric is one blended colour, and camouflage patterns are one colour per surface.

| Aircraft | Element | What the model shows | Source | Confidence | Notes |
|---|---|---|---|---|---|
| Camel (Barker's B6313, No. 139 Sqn) | Fuselage markings | Seven white stripes aft of the roundel on each side | S37 | medium | Thetford caption: Barker's Camel "carried seven, rather than the unit's normal four fuselage white stripes aft of the roundel". The aircraft was repainted several times; this is one stage of its life. |
| Camel | Serial | "B6313" on the rear fuselage | S37 | medium | Photo captions identify the aircraft as B6313 of 139 Squadron. |
| Camel | Body and top surface colour | Reddish-brown | S37 | estimate | Taken from a 1918 report on a different Camel, B.6290 ("top surface, as well as the body fabric, painted a redish brown"). Not stated for B6313 itself. |
| Camel | Wing undersides | Cream | S37 | estimate | Same 1918 report on B.6290 ("cream coloured underneath"); not stated for B6313. |
| Camel | Roundels | Blue, white and red-centre roundels on the fuselage sides, upper wing top and lower wing underside | S1 | estimate | S1 shows round British insignia but does not describe their colours or positions. The standard RAF colour order and the usual wing positions are assumed. |
| Camel | Cowling | Dark grey | ASSUMPTION | estimate | No source describes the cowling colour of B6313. |
| SPAD (Brooks's "Smith IV", 22nd Aero Sqn) | Colours | Green upper surfaces and body, grey undersurfaces | S2 | high | Smithsonian: "Green and brown camouflage finish upper surfaces. Gray and gray-green under surfaces." The brown patches are not drawn. |
| SPAD | Fuselage markings | Blue shooting-star roundel, red "20", "Smith" in brown, small black cross badges | S2 | medium | From the Smithsonian gallery captions: "Blue shooting star roundel and '20' in red lettering on body", "'Smith' in brown lettering", "small square black cross badges on body". The star's shape and all positions are estimates. |
| SPAD | Tail | Red, white and blue stripes on the rudder | S2 | medium | "Red, white, and blue stripes and black numbers on tail". The stripe order and the black numbers are not drawn. |
| Fokker Dr.I (Richthofen's 425/17) | Colour | Vermilion red overall | S38 | medium | The fabric from 425/17 at the Smithsonian is vermilion red over turquoise over light-blue dope. Which surfaces were red is not stated, and S39 (Thetford and Gray) says there is doubt that Richthofen ever flew a completely scarlet Dr.I. Painted overall red as the product owner chose. |
| Fokker Dr.I | Crosses | Black crosses with a white border on the fuselage sides, upper wing and lower wing | ASSUMPTION | estimate | No source describes the cross style or positions on 425/17. |
| Albatros D.Va (7161/17, Jasta 46) | Colours | Natural wood fuselage; green nose and spinner; green fin with a yellow band | S3 | medium | Smithsonian: green nose, natural wood fuselage, tail with green and yellow stripes (the caption mentioning a "yellow body" conflicts). The exact stripe layout is an estimate. |
| Albatros D.Va | Wings and tailplane | One blended mauve-green lozenge colour on top, pale underneath | S3, S25 | estimate | S3: multicolour lozenge camouflage; S25: mauve and dark green. The pattern is not drawn; the colour is a blend. |
| Albatros D.Va | Crosses and name | Black crosses on the wings (and, as an estimate, the fuselage sides), "Stropp" in black on the fuselage | S3 | medium | Smithsonian: black crosses appear on the wings; personal marking "Stropp" in black lettering. The fuselage crosses are assumed. |

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

## Weapons (Phase 4)

Shared by the four aircraft. The code is in `src/aircraft/weapons.js` and `src/aircraft/g1Table.js`; `tests/aircraftCode.test.js` checks the numbers against these rows.

| Parameter | Value | Unit | Original figure | Source | Confidence | Notes |
|---|---|---|---|---|---|---|
| .303 Mk VII bullet mass (`CARTRIDGES.mk7.mass`) | 0.011275 | kg | 174 grains | S44 | medium | One source for the weight; the figure is the standard Mark VII ball load. |
| .303 Mk VII muzzle velocity (`CARTRIDGES.mk7.muzzleVelocity`) | 731.5 | m/s | about 2,400 ft/s | S44 | medium | Other quotations of the 1929 Textbook of Small Arms give 2,440 ft/s (744 m/s), 2% higher. The article's rounded figure is used. |
| .303 bullet diameter (`CARTRIDGES.mk7.diameter`) | 0.00786 | m | 0.3095 in | ASSUMPTION | estimate | Not found in an allowed source. The bore of the .303 in rifle is 0.303 in; British bullets were about 0.311 in across the grooves. Used only to turn the form factor into a drag. |
| .303 bullet form factor (`CARTRIDGES.mk7.formFactor`) | 0.56 | — | — | ASSUMPTION | estimate | No measured WWI ballistic coefficient found. G1 form factors of spitzer rifle bullets of the period are about 0.5 to 0.65 (ballistic coefficient = mass / (form factor x diameter squared)); 0.56 gives a coefficient near 0.46 in lb/in² for this bullet, the usual quoted value. Bullet drop at 400 m depends on it by a few percent. |
| 7.92 mm S bullet mass (`CARTRIDGES.smk.mass`) | 0.0099 | kg | about 153 grains | ASSUMPTION | estimate | Not found in an allowed source (the Imperial War Museum records opened gave no weights). The S (spitzer) bullet of 1905-1915 is commonly given as about 9.9 g; heavier 12.8 g bullets came in 1915 and are not modelled. |
| 7.92 mm bullet diameter (`CARTRIDGES.smk.diameter`) | 0.00792 | m | 7.92 mm | S42 | high | The cartridge is 7.92 x 57 mm. |
| 7.92 mm S muzzle velocity (`CARTRIDGES.smk.muzzleVelocity`) | 859.9 | m/s | 2,821 ft/s | S42 | medium | The Royal Armouries gives 878 m/s (2,881 ft/s) for the Gewehr 98 rifle, whose barrel is longer; the machine gun figure is used. |
| 7.92 mm bullet form factor (`CARTRIDGES.smk.formFactor`) | 0.56 | — | — | ASSUMPTION | estimate | No measured value found, same reasoning as the .303: a spitzer rifle bullet of the period, form factor 0.5 to 0.65. |
| Vickers cyclic rate (`GUN_TYPES.vickers.cyclicRate`) | 500 | rounds/min | 450 to 550 | S40, S41 | medium | The gun's own rate. The Royal Armouries gives 550 for the ground Mk I. Synchronised, the rate is lower and follows the engine speed (the model does this: shots wait for a gap between blades). |
| LMG 08/15 cyclic rate (`GUN_TYPES.lmg0815.cyclicRate`) | 450 | rounds/min | 400 to 500, 450 | S42, S43 | medium | Two museum records say 450; one reproduction maker says 400 to 500 depending on the synchroniser and engine speed. |
| Chance of a stoppage per round (`GUN_TYPES.vickers.jamPerRound`) | 0.0025 | per round | — | ASSUMPTION | estimate | No rate was found. Period accounts say stoppages were common, and that the synchronised gun could not be cleared normally because it was out of reach (S42). About one per 400 rounds is noticeable but not constant. Same value for both guns. |
| Time to clear a stoppage (`GUN_TYPES.vickers.clearTime`) | 3 | s | — | ASSUMPTION | estimate | Not found. The pilot hammers the cocking handle and re-cocks; a few seconds is a gameplay choice. Same for both guns. |
| Chance one clearing attempt works (`GUN_TYPES.vickers.clearSuccess`) | 0.7 | — | — | ASSUMPTION | estimate | Not found; many stoppages (a bulged case, a broken belt) could not be cleared in the air. A gameplay choice. Same for both guns. |
| Synchroniser safety margin (`SYNC.bladeMargin`) | 0.08 | rad | — | ASSUMPTION | estimate | Not found. The angle each side of the blade where the gear will not fire; the real gears fired in a window between blades. About 4.6 degrees. |
| Tracer spacing (`BULLETS.tracerEvery`) | 3 | rounds | — | ASSUMPTION | estimate | Period belts mixed ball, tracer and incendiary rounds; the mix is not documented. Every third round is drawn, so the stream can be seen. |
| G1 standard drag function | 79 points | Mach 0 to 5 | table | S45 | high | The standard small-arms drag curve (drag coefficient 0.2629 at Mach 0, 0.4805 at Mach 1, 0.6625 at Mach 1.4, 0.4988 at Mach 5). Copied unchanged into `src/aircraft/g1Table.js`. |

## Damage model (Phase 4)

Shared by the four aircraft. The code is `src/aircraft/damageModel.js` and `src/physics/damage.js`; `tests/weaponsData.test.js` checks the numbers against these rows. Nothing here was found in a source: they are design choices, set so the effects are clear and plausible. Each is meant to be tuned by flying.

| Parameter | Value | Unit | Original figure | Source | Confidence | Notes |
|---|---|---|---|---|---|---|
| Reference hit energy (`DAMAGE.energyRef`) | 1800 | J | — | ASSUMPTION | estimate | About the energy of a .303 bullet at 300 m (half of 11.3 g at 560 m/s squared). A hit with this energy counts as one hit; harder hits count more. |
| Hits to destroy a wing panel (`DAMAGE.hitsToDestroy.wing`) | 20 | hits | — | ASSUMPTION | estimate | A rifle-calibre bullet makes a small hole in fabric, and a spar must be struck to weaken it. A burst of 20 hits on one panel is about a second and a half of one gun. |
| Hits to destroy the engine (`DAMAGE.hitsToDestroy.engine`) | 15 | hits | — | ASSUMPTION | estimate | A rotary engine was hardy but had many exposed parts and the fuel and oil lines. A gameplay choice. |
| Hits to destroy the fuel tank (`DAMAGE.hitsToDestroy.tank`) | 6 | hits | — | ASSUMPTION | estimate | One hole leaks, six make the tank drain at the full rate. Fire is not modelled. |
| Hits to kill the pilot (`DAMAGE.hitsToDestroy.pilot`) | 3 | hits | — | ASSUMPTION | estimate | One hit wounds (a third), three kill. A gameplay choice. |
| Hits to destroy the tailplane (`DAMAGE.hitsToDestroy.tailplane`) | 15 | hits | — | ASSUMPTION | estimate | A gameplay choice, smaller than a wing panel's because the tail structure is lighter. |
| Hits to destroy the fin (`DAMAGE.hitsToDestroy.fin`) | 12 | hits | — | ASSUMPTION | estimate | A gameplay choice, as for the tailplane. |
| Energy kept after passing a part (`DAMAGE.passLoss`) | 0.75 | fraction | — | ASSUMPTION | estimate | A bullet goes through fabric, wood and wire (wing, tail, fuselage) and carries on to the next part, with this share of its energy, until it reaches the engine, fuel tank or pilot, which stop it. Not measured. |
| Chance a hit cuts a control cable (`DAMAGE.cableCutChance`) | 0.03 | per hit | — | ASSUMPTION | estimate | Cables are thin and few. A wing hit may cut the aileron cable; a fuselage, tail or fin hit the elevator or rudder cable. |
| Lift lost by a damaged wing (`DAMAGE.wingLiftLoss`) | 0.6 | fraction | — | ASSUMPTION | estimate | At full damage (before it fails) one wing loses this much lift. A failed wing loses all of it. Chosen so a badly hurt wing is a clear roll that the ailerons can nearly hold. |
| Extra drag of a damaged wing (`DAMAGE.wingDragGain`) | 0.5 | fraction | — | ASSUMPTION | estimate | At full damage one wing makes this much more drag, so the aircraft yaws toward it. |
| Stall roll toward the damaged wing (`DAMAGE.wingStallBias`) | 0.05 | moment coefficient | — | ASSUMPTION | estimate | A stalled aircraft drops the hurt wing first. The undamaged model's own stall bias is 0.03. |
| Centre of lift of a half wing (`DAMAGE.liftArm`) | 0.424413 | half spans | 4 / (3 pi) | ASSUMPTION | estimate | The textbook result for an elliptical lift distribution (lifting-line theory), not a figure from a WWI source. It is the lever arm of a half wing's lift. |
| Power lost at full engine damage (`DAMAGE.enginePowerLoss`) | 0.85 | fraction | — | ASSUMPTION | estimate | A damaged engine runs rough and weak; the last 15% is lost only when it seizes, which is at full damage. |
| Locked propeller drag (`DAMAGE.seizedPropDrag`) | 0.35 | drag coefficient on the disc | — | ASSUMPTION | estimate | A stopped propeller is a flat obstacle; 0.35 is a moderate value for a two-bladed disc. A seized engine therefore slows the aircraft a lot. |
| Windmilling propeller drag (`DAMAGE.windmillPropDrag`) | 0.12 | drag coefficient on the disc | — | ASSUMPTION | estimate | A propeller turning freely makes less drag than a locked one. Used when the fuel runs out. |
| Windmilling speed (`DAMAGE.windmillRpmFraction`) | 0.5 | fraction of rated | — | ASSUMPTION | estimate | A windmilling propeller at top speed turns at about half the engine's rated speed; it is slower at lower airspeed. Matters to the gun synchroniser. |
| Elevator or rudder lost with tail damage (`DAMAGE.tailAuthorityLoss`) | 0.8 | fraction | — | ASSUMPTION | estimate | At full tailplane (or fin) damage the control has a fifth of its effect. |
| Stability lost with tail damage (`DAMAGE.tailStabilityLoss`) | 0.5 | fraction | — | ASSUMPTION | estimate | At full damage the aircraft's pitch (or yaw) stability is halved. |
| Control lost with a wounded pilot (`DAMAGE.pilotAuthorityLoss`) | 0.5 | fraction | — | ASSUMPTION | estimate | A pilot who is fully wounded (just short of dead) moves the stick and rudder half as far. |
| Control speed lost with a wounded pilot (`DAMAGE.pilotSlowing`) | 0.5 | fraction | — | ASSUMPTION | estimate | The same pilot also moves the controls at half the normal speed (a gameplay choice). |
| Fuel used per joule (`DAMAGE.specificFuelConsumption`) | 1.11e-7 | kg per joule | 0.40 kg per kWh | ASSUMPTION | estimate | No measured value found. 0.40 kg per kWh with the Camel's 78 kg gives its documented endurance of about 2.5 hours (S22, S24). |
| Fuel leak rate (`DAMAGE.leakRate`) | 0.0222 | tank per second | about 45 s to empty | ASSUMPTION | estimate | A badly holed tank empties in under a minute; a gameplay choice. |
| Safety factor (`DAMAGE.safetyFactor`) | 1.8 | — | — | ASSUMPTION | estimate | Limit load is the ultimate load divided by this. Nothing damages the structure below the limit load. A figure of 1.8 to 2.0 was proposed in French writing of 1911, as reported secondhand in a DTIC history of safety factors (the paper itself could not be opened). |
| Wing damage rate at the ultimate load (`DAMAGE.overloadRate`) | 0.25 | per second | — | ASSUMPTION | estimate | Between the limit and the ultimate load the wings are damaged at a rate rising from zero to this; at the ultimate load a wing fails at once. |
| Over-speed margin (`DAMAGE.overspeedMargin`) | 0.25 | fraction | — | ASSUMPTION | estimate | Wings begin to be damaged above the never-exceed speed and fail when the speed is this much above it. |

## Cockpit panels (Phase 6)

Which instruments each aircraft's panel has and roughly where. The code is `src/aircraft/panels.js`; `tests/panels.test.js` checks every instrument there has a row here. Positions are fractions of the panel drawing (across from the left, down from the top) and were read off photographs where a source has one; they are approximate either way. Panel sizes in metres are estimates for all four (chosen to fill the space between the cockpit sides).

| Aircraft | Instrument | Where | Units | Source | Confidence | Notes |
|---|---|---|---|---|---|---|
| camel | tachometer | upper left | rpm | S47 | high | Marked "R.P.M." in the NASM photograph. |
| camel | compass | upper centre | degrees | S47 | high | A small compass set into the top of the panel. |
| camel | airspeed | upper right | mph | S47 | high | Marked "AIR SPEED". |
| camel | altimeter | lower centre | feet | S47 | high | Marked "HEIGHT". |
| camel | airPressure | lower right | share of scale | S47 | high | Marked "AIR": the fuel tank's air pressure. |
| camel | switches | lower left | on/off | S47 | high | Two brass ignition switches. |
| camel | pulsator | far left | — | ASSUMPTION | estimate | Rotary engines had a glass oil pulsator so the pilot could see the oil flowing; its place on this panel is not clear in the photograph. |
| spad13 | tachometer | centre left | tours/min | S48 | medium | A Jaeger type AM tachometer is in the US Air Force Museum's SPAD XIII. Position estimated. |
| spad13 | airspeed | centre right | km/h | ASSUMPTION | estimate | No source for the SPAD's panel layout was found. French fighters carried an airspeed indicator in km/h. |
| spad13 | altimeter | right | metres | S51 (dial); ASSUMPTION (fitted to the SPAD, position) | estimate | Drawn after the French L. Hatot altimeter in the Smithsonian (S51), chosen by the product owner: 0-5,000 m in one turn, rising anticlockwise; it stops at the top of its range. That this type was fitted to the SPAD XIII was not found in a source. Its centre line reads "Height x 1000 m" (product owner's wording) where the original reads "BAROMÈTRE ALTIMÈTRE". |
| spad13 | waterTemp | left | °C | ASSUMPTION | estimate | The Hispano-Suiza is water-cooled; a radiator thermometer is expected. |
| spad13 | fuelPressure | lower left | share of scale | ASSUMPTION | estimate | The SPAD's fuel was pressure-fed; a gauge is expected. |
| spad13 | compass | lower centre | degrees | ASSUMPTION | estimate | As above. |
| dr1 | fuelGauge | panel, left (small) | share of tank | ASSUMPTION | estimate | No original Dr.I survives (San Diego Air & Space Museum page), so the whole panel is an estimate. Laid out as a photograph of a flying replica (S52), whose modern instruments are replaced by old-style German ones in the product owner's order, left to right: fuel gauge, altimeter, airspeed, rev counter; the compass centred just above the altimeter and airspeed and the slip indicator centred below them. |
| dr1 | altimeter | panel, left of centre (large) | metres | ASSUMPTION | estimate | As above; the product owner's choice (earlier the Dr.I had none, by analogy with the Albatros). |
| dr1 | airspeed | panel, right of centre (large) | km/h | ASSUMPTION | estimate | As above; on the panel by the product owner's choice (German fighters often had it on a strut, S49). |
| dr1 | slip | panel, centred between and below the altimeter and airspeed | — | ASSUMPTION | estimate | As above: a curved glass tube with a ball, where the replica photograph has a small instrument under its airspeed dial. |
| dr1 | tachometer | panel, right (small) | U/min | ASSUMPTION | estimate | As above. A rev counter is the one instrument every German fighter had. |
| dr1 | compass | panel, centred just above the altimeter and airspeed | degrees | ASSUMPTION | estimate | As above; placed there by the product owner. |
| albatros | fuelGauge | panel, left (small) | share of tank | S50 | medium | Petrol gauge (Maximall). The Albatros panel is laid out the same as the Dr.I's at the product owner's request (Phase 6); the period evidence is in the notes. S49 says the fuel gauge was inaccurate. |
| albatros | altimeter | panel, left of centre (large) | metres | ASSUMPTION | estimate | Product owner's choice, to match the Dr.I. No altimeter mounting was found on the Australian War Memorial's aircraft (S50). |
| albatros | compass | panel, centred just above the altimeter and airspeed | degrees | S50 | estimate | "Probably" souvenired from the AWM aircraft at capture (S50). Placed as on the Dr.I. |
| albatros | airspeed | panel, right of centre (large) | km/h | ASSUMPTION | estimate | Product owner's choice, to match the Dr.I. The period instrument was an anemometer-type indicator on the right-hand wing strut (S49). |
| albatros | slip | panel, centred between and below the altimeter and airspeed | — | ASSUMPTION | estimate | Product owner's choice, to match the Dr.I. Not found in S49 or S50. |
| albatros | tachometer | panel, right (small) | U/min | S49, S50 | high | Morell tachometer. Placed as on the Dr.I. (The oil and tank-pressure gauges and the clock of S49 and S50 were left out to match the Dr.I's panel.) |

Not fitted: nothing at present. (The Albatros had no altimeter, as on the AWM aircraft (S50), and the Dr.I none by analogy, until the product owner chose the same panel of period instruments for both in Phase 6.) The modern HUD shows the height for any aircraft.

How the instruments not driven by the physics behave (fuel tank pressure, oil pressure, the pulsator, the water temperature, the clock) is a set of display choices in `src/aircraft/instrumentBehaviour.js`, recorded in DECISIONS.md (D59). They do not affect the flight.

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
| Fuel tank capacities and consumption (only the Dr.I prototype's 75 litres was found) | Fuel leak and endurance (Phase 4) | Museum object records. S17 gives 83 kg fuel for the SPAD but the wording is ambiguous. The mass does not fall as fuel burns (a simplification). |
| Strength: load factors and diving speeds of the production aircraft (only the Dr.I V.4 prototype's 7.92 was found) | Structural limits (Phase 4) | RAE and Air Board strength-test reports; Windsock Datafiles; Cross and Cockade articles |
| Camel and Dr.I range or endurance (sources disagree) | Fuel model | As above |
| Vickers and LMG 08/15: synchronised rate of fire at a given engine speed, 7.92 mm S bullet mass, ballistic coefficients, jam rates, type of interrupter gear on each aircraft | Weapons | Royal Armouries and Imperial War Museum catalogue pages could not be opened (blocked); try the printed Textbook of Small Arms 1929 and the Constantinesco gear booklet at the IWM |
| Fuel tank capacity and consumption of the Camel, SPAD and Albatros; strength (load factor) limits of all four | Fuel leaks and structural limits (Phase 4 checkpoint 2) | Dr.I prototype: 75 l tank (S26). Strength: ultimate load factor 7.92 for the Dr.I V.4 prototype (Weyl, as transcribed on the Dr.I page); nothing else found. Estimates will be marked |
| Measured stability and control data (damping, control power, inertia) | Handling | Eberhardt, AIAA 2005-119 (Museum of Flight WWI fighters), not yet accessible |
| Printed originals of the transcribed book tables (S22-S28) | Raising those values from medium confidence | Library copies of the books |

Resolved by the validation work: lower and middle wing spans (Camel, SPAD, Dr.I, Albatros), Camel and SPAD wing gaps, climb performance for all four aircraft, power against altitude (general law, S31), propeller efficiency (S30), multiplane theory (S29), and the meaning of the two Dr.I top-speed figures (sea level vs 4,000 m).
