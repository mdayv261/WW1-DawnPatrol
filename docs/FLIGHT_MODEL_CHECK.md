# Flight Model Check: Simulated vs Sourced Performance

> **Superseded** by `docs/FLIGHT_VALIDATION.md`. Kept as the "before" snapshot of the Phase 1 model.

Date: 11 Oct 2026. Model state: Phase 1 as committed (`a4e9aa7`). No code or data was changed to produce this report.

## Summary

- **Tests:** all 172 pass (107 in `tests/physics`). The existing tests check only top speed against the documented figure (within 5%). They do not check stall speed, climb or ceiling, so those were measured separately for this report.
- **Top speed matches** its primary source within 3% for all four aircraft. That is a consistency check, not independent evidence, because the drag was back-calculated from those same speeds.
- **Flagged (outside 10%):** the Fokker Dr.I climb rate and service ceiling (both about 25% low), the SPAD climb times and service ceiling (depending on conditions, see below), and the Dr.I top speed against its second source.
- **Stall speed cannot be checked.** No sourced stall speed exists for any aircraft.
- **Only the SPAD has sourced climb times.** The Dr.I has a sourced climb rate. The Camel and Albatros have no sourced climb data.

All sourced values are medium confidence. The sources rarely state conditions (altitude, load, engine speed, or what "ceiling" means). The source IDs (S4, S7 and so on) refer to `docs/AIRCRAFT_DATA.md`.

## How the simulated values were measured

| Quantity | Method |
|---|---|
| Top speed | The fastest level-flight speed the model can hold at sea level without full throttle. |
| Stall speed | The 1 g level stall at sea level, loaded weight, from the model's own peak lift coefficient (power effects ignored). |
| Climb rate | Best steady climb rate with full throttle at each altitude: net force along the flight path times speed, divided by weight. Only states where lift balances weight within 3% count. |
| Service ceiling | The altitude where the best climb rate falls to 0.508 m/s (100 ft/min). |
| Climb time | The climb rate integrated over height, at the best climb speed for each altitude. This ignores acceleration and pilot technique. |

The numbers come from a one-off measurement script that is not saved in the repository, so this report cannot yet be regenerated automatically. A first run of that script had a fault (it counted near-stalled states that cannot hold level flight) and gave ceilings of 16,000 to 18,000 m. It was corrected before any figure here was taken.

## Sopwith Camel F.1 (Clerget 9B)

| Quantity | Sourced | Simulated | Diff | Flag |
|---|---|---|---|---|
| Top speed | 50.1 m/s (112 mph, S4) | 49.9 m/s | -0.3% | |
| Stall speed | none found | 21.0 m/s (47 mph) | n/a | no source |
| Climb time | none found | 457 s to 1,981 m | n/a | no source |
| Service ceiling | 5,791 m (19,000 ft, S4, S15) | 5,906 m | +2.0% | |

A second source (S15) gives 115 mph (51.4 m/s) for top speed, which would be -2.9%.

## SPAD S.XIII (Hispano-Suiza 8Be)

The only sourced climb data is a 1921 McCook Field flight test (S17) of a SPAD with the earlier 8Ba engine (about 197 hp) at an equipped weight of 924 kg. So two simulated columns are shown: **as modelled** (8Be, 220 hp, 820 kg) and **test conditions** (the model set to the test aircraft's engine power and weight).

| Quantity | Sourced | As modelled | Diff | Test conditions | Diff | Flag |
|---|---|---|---|---|---|---|
| Top speed | 60.4 m/s (135 mph, S5) | 60.0 m/s | -0.6% | | | |
| Top speed at 1,981 m | 59.2 m/s (213 km/h, S17) | 58.9 m/s | -0.5% | 55.2 m/s | -6.6% | |
| Stall speed | none found | 23.6 m/s (53 mph) | n/a | | | no source |
| Climb to 1,981 m (6,500 ft) | 390 s (S17) | 312 s | -20.0% | 494 s | +26.7% | FLAG |
| Climb to 4,572 m (15,000 ft) | 1,380 s (S17) | 988 s | -28.4% | 1,956 s | +41.7% | FLAG |
| Service ceiling | 5,608 m (18,400 ft, S17) | 6,846 m | +22.1% | 5,007 m | -10.7% | FLAG |

The model is slower than the test under test conditions and faster than the test as modelled. The real 8Be aircraft should sit between the two, but the data does not say where.

## Fokker Dr.I (Oberursel UR.II)

| Quantity | Sourced | Simulated | Diff | Flag |
|---|---|---|---|---|
| Top speed | 46.0 m/s (103 mph, S6, S10) | 45.7 m/s | -0.8% | |
| Top speed, second source | 51.4 m/s (185 km/h, S7) | 45.7 m/s | -11.2% | FLAG |
| Stall speed | none found | 20.3 m/s (45 mph) | n/a | no source |
| Climb rate (sea level) | 5.7 m/s (S7) | 4.3 m/s | -24.8% | FLAG |
| Service ceiling | 6,000 m (19,685 ft, S6) | 4,483 m | -25.3% | FLAG |

The two sources for Dr.I top speed disagree with each other by 12%, so the model cannot match both. No sourced Dr.I climb time exists, so the climb rate is compared as a rate. Its altitude is not stated and is assumed to be sea level. The simulated climb to 1,981 m is 593 s, for reference only.

## Albatros D.V (Mercedes D.IIIa)

| Quantity | Sourced | Simulated | Diff | Flag |
|---|---|---|---|---|
| Top speed | 47.2 m/s (170 km/h, S16) | 48.6 m/s | +3.1% | |
| Stall speed | none found | 25.2 m/s (56 mph) | n/a | no source |
| Climb time | none found | 546 s to 1,981 m | n/a | no source |
| Service ceiling | 5,000 m (S16) | 4,835 m | -3.3% | |

The sourced speed and ceiling are paired in S16 with a 158 hp D.III engine. The model uses the 130 kW (174 hp) D.IIIa rating from S14.

## Findings

1. **Dr.I performance is too low.** Climb rate and ceiling are both about 25% below their sources. The Dr.I has the highest zero-lift drag estimate after the Albatros and the lowest power, so possible causes are the drag estimate, the propeller thrust model, or the 82 kW rating. These are hypotheses and have not been investigated.
2. **SPAD climb is not yet testable fairly.** The sourced test used different conditions from the modelled aircraft. A fair comparison needs the real 8Be climb performance, which is not in the data.
3. **Peak lift is lower than its input.** The stall starts cutting lift before the stall angle is reached, so the peak is 13 to 15% below the input. The model's effective peak lift coefficient is 1.10 to 1.22, against the 1.3 to 1.4 recorded in `AIRCRAFT_DATA.md`. Stall speeds are therefore about 8% higher than that input implies. Changing it would affect the tuned stall and spin behaviour.
4. **Altitude performance uses a stand-in.** Engine power is proportional to air density (D15 in `DECISIONS.md`). Ceilings land close to the sources for the Camel and Albatros, but that may be partly luck. It has not been validated against engine altitude data.

## What would improve this check

- Sourced stall speeds for each aircraft (the largest gap).
- Climb data for the Camel and Albatros, and the Dr.I climb altitude.
- Engine power against altitude for each engine.
- The real performance of a SPAD XIII with the 8Be engine, not the 8Ba.
- A saved version of the measurement script, so this report can be regenerated.
