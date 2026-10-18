// The cockpit instrument panel of each aircraft: which instruments it had and roughly where.
// Every instrument is a row in docs/AIRCRAFT_DATA.md ("Cockpit panels"), sourced or marked as an
// estimate with a reason. Positions are fractions of the panel drawing (x across from the left,
// y down from the top) and r is the dial's radius as a fraction of the panel's height; they were
// read off photographs where there are any (approximate), else chosen to look like the period.
// `mount: 'strut'` puts an instrument on the right-hand wing strut, outside the cockpit.
// The panel's size in metres is for the cockpit model.

export const PANELS = {
  camel: {
    style: 'british',
    size: [0.5, 0.2], // m (E)
    instruments: [
      { kind: 'tachometer', x: 0.27, y: 0.38, r: 0.3 }, // "R.P.M." upper left (S47)
      { kind: 'compass', x: 0.5, y: 0.27, r: 0.18 }, // upper centre (S47)
      { kind: 'airspeed', x: 0.73, y: 0.38, r: 0.3 }, // "AIR SPEED" upper right, mph (S47)
      { kind: 'altimeter', x: 0.5, y: 0.73, r: 0.22 }, // "HEIGHT" lower centre (S47)
      { kind: 'airPressure', x: 0.86, y: 0.72, r: 0.14 }, // "AIR" fuel tank pressure, lower right (S47)
      { kind: 'switches', x: 0.25, y: 0.82, r: 0.12 }, // two brass switches, lower left (S47)
      { kind: 'pulsator', x: 0.07, y: 0.7, r: 0.1 }, // glass fitting far left: the rotary's oil pulsator (E)
    ],
  },
  spad13: {
    style: 'french',
    // Dial lettering the product owner chose for the SPAD, in place of the French words (TOURS, ALTITUDE).
    labels: { tachometer: 'RPM', altimeter: 'Height x 1000 m', airspeedUnitsTop: true, airspeedUnits: 'KM/HR' },
    size: [0.46, 0.18],
    instruments: [
      { kind: 'tachometer', x: 0.3, y: 0.45, r: 0.32 }, // Jaeger type AM (S48)
      { kind: 'airspeed', x: 0.68, y: 0.45, r: 0.28 }, // km/h (E)
      { kind: 'altimeter', x: 0.88, y: 0.4, r: 0.2, face: 'hatot', range: 5000 }, // metres (E); dial after the L. Hatot French altimeter, 0-5,000 m in one turn (S51)
      { kind: 'waterTemp', x: 0.1, y: 0.4, r: 0.16 }, // water-cooled Hispano-Suiza (E)
      { kind: 'fuelPressure', x: 0.12, y: 0.8, r: 0.12 }, // (E)
      { kind: 'compass', x: 0.5, y: 0.82, r: 0.14 }, // (E)
    ],
  },
  dr1: {
    style: 'german',
    size: [0.506, 0.18], // (E) the wooden panel in a photograph of a replica (S52), 10% wider with the cockpit (product owner)
    // Laid out as in that photograph, with old-style German instruments in place of its modern ones, in the
    // product owner's order from left to right: fuel gauge (small), altimeter (large), airspeed (large), rev
    // counter (small); the compass centred just above the altimeter and airspeed, the slip indicator centred
    // between and below them.
    instruments: [
      { kind: 'fuelGauge', x: 0.056, y: 0.66, r: 0.2 }, // (E) small; as close to the altimeter as the gun post allows, clear of the rim
      { kind: 'altimeter', x: 0.335, y: 0.55, r: 0.32, turn: 5000 }, // (E) large; figures 0, 0.5 ... 4.5 (km): short hand once round per 5,000 m, long hand per 500 m (product owner)
      { kind: 'compass', x: 0.5, y: 0.17, r: 0.13 }, // (E) centred, just above the altimeter and airspeed
      { kind: 'airspeed', x: 0.665, y: 0.55, r: 0.32 }, // (E) large
      { kind: 'slip', x: 0.5, y: 0.85, r: 0.1 }, // (E) centred between and below the altimeter and airspeed
      { kind: 'tachometer', x: 0.944, y: 0.66, r: 0.2 }, // (E) small, as the fuel gauge
    ],
  },
  // The product owner asked for the Albatros panel to be the same as the Dr.I's (Phase 6): the same
  // old-style German instruments in the same places. (The period evidence for the Albatros, S49 and S50,
  // was a rev counter, petrol, oil and tank-pressure gauges, a clock and compass, the airspeed on the
  // strut and no altimeter; AIRCRAFT_DATA keeps it.)
  albatros: {
    style: 'german',
    size: [0.506, 0.18], // (E) as the Dr.I's
    instruments: [
      { kind: 'fuelGauge', x: 0.056, y: 0.66, r: 0.2 }, // petrol gauge (S50); small, placed as on the Dr.I (E)
      { kind: 'altimeter', x: 0.335, y: 0.55, r: 0.32, turn: 5000 }, // (E) as the Dr.I's (product owner); none was fitted to the AWM aircraft (S50)
      { kind: 'compass', x: 0.5, y: 0.17, r: 0.13 }, // (S50, "probably"); placed as on the Dr.I (E)
      { kind: 'airspeed', x: 0.665, y: 0.55, r: 0.32 }, // (S49 had it on the strut); on the panel as on the Dr.I (E)
      { kind: 'slip', x: 0.5, y: 0.85, r: 0.1 }, // (E) as on the Dr.I
      { kind: 'tachometer', x: 0.944, y: 0.66, r: 0.2 }, // Morell (S49, S50); small, placed as on the Dr.I (E)
    ],
  },
  // Fokker E.IV: Herris and Scott (S54) place a fuel gauge between the guns (Boelcke's 123/15), an
  // altimeter on the port side of the cockpit, and an airspeed vane on the port wing (Parschau's
  // 122/15). A rev counter on a small board is an estimate. Old-style German dials.
  e4: {
    style: 'german',
    size: [0.24, 0.12], // (E) a small board for the rev counter
    instruments: [
      { kind: 'tachometer', x: 0.5, y: 0.5, r: 0.4 }, // (E) not described, but every rotary-engined fighter had one
      { kind: 'fuelGauge', mount: 'free', at: [-0.3, 0.6, 0], radius: 0.045 }, // between the guns (S54)
      { kind: 'altimeter', mount: 'free', at: [-0.95, 0.32, -0.27], radius: 0.05, turn: 5000 }, // port side of the cockpit (S54)
      { kind: 'airspeed', mount: 'free', at: [-0.25, 0.26, -0.75], radius: 0.06 }, // on the port wing root (S54)
    ],
  },
  // Nieuport 11: no source describes its instruments. French dials as on the SPAD (estimates).
  n11: {
    style: 'french',
    size: [0.34, 0.15], // (E)
    instruments: [
      { kind: 'tachometer', x: 0.3, y: 0.5, r: 0.36 }, // (E) TOURS
      { kind: 'altimeter', x: 0.72, y: 0.5, r: 0.3, face: 'hatot', range: 5000 }, // (E) the French Hatot type (S51)
      { kind: 'fuelGauge', x: 0.92, y: 0.75, r: 0.14 }, // (E)
    ],
  },
};

// Instruments the aircraft did NOT have, said here so it is clear they are left out on purpose.
export const NOT_FITTED = {
};
