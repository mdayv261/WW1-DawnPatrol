// Instrument readings and needle angles, in each aircraft's period units
// (British: mph and feet; French and German: km/h and metres). Plain maths,
// no drawing, so it can be tested. Angles are radians clockwise from the
// top of the dial.

import { toMph, toKmh, toFeet } from './units.js';

// Dial ranges: full scale sweeps 300 degrees.
const SWEEP = (300 * Math.PI) / 180;
const SPEED_FULL = { mph: 160, kmh: 250 };

export function airspeedReading(aircraft, metresPerSecond) {
  const unit = aircraft.instruments.speed;
  const value = unit === 'mph' ? toMph(metresPerSecond) : toKmh(metresPerSecond);
  return { value, unit, angle: Math.min(1, Math.max(0, value / SPEED_FULL[unit])) * SWEEP };
}

// Altimeter: the long hand goes round once per 1,000 ft (or 1,000 m), the
// short hand once per 10,000.
export function altimeterReading(aircraft, metres) {
  const unit = aircraft.instruments.altitude;
  const value = unit === 'ft' ? toFeet(metres) : metres;
  const turn = 2 * Math.PI;
  return {
    value,
    unit,
    longHand: ((((value / 1000) % 1) + 1) % 1) * turn,
    shortHand: ((((value / 10000) % 1) + 1) % 1) * turn,
  };
}

// A one-turn altimeter (the French Hatot type): the single needle goes round once over the
// dial's range, anticlockwise as height rises, and stops just short of a full turn at the top
// of the range. Returns the needle angle (radians clockwise from the top, so negative).
export function oneTurnAltimeterAngle(metres, range) {
  const h = Math.min(range * 0.985, Math.max(0, metres));
  return -(h / range) * 2 * Math.PI;
}

// Tachometer: engine rpm, full scale a little above the rated speed.
export function tachometerReading(aircraft, rpm) {
  const full = Math.ceil((aircraft.engine.ratedRpm * 1.25) / 100) * 100;
  return { value: rpm, full, angle: Math.min(1, Math.max(0, rpm / full)) * SWEEP };
}

// Slip ball: -1 (full left) to +1 (full right), from the sideslip angle (positive when the
// aircraft moves sideways to its right). The ball rolls to the side the aircraft is slipping to:
// to the low wing in a slip, to the outside of a skidding turn (so right rudder alone, wings
// level, sends it left: "step on the ball"). Corrected in Phase 6; it had the sign the wrong way.
export function slipBall(sideslip) {
  return Math.max(-1, Math.min(1, sideslip / 0.2));
}

// A two-hand altimeter with its own turn: the short hand goes round once per `turn` metres and the
// long hand ten times as fast (the Dr.I's: 5,000 m and 500 m). Angles clockwise from the top.
export function twoHandAltimeter(metres, turn) {
  const frac = (v) => ((v % 1) + 1) % 1;
  return { shortHand: frac(metres / turn) * 2 * Math.PI, longHand: frac((metres * 10) / turn) * 2 * Math.PI };
}

// Compass heading in degrees 0-360 (0 = north), from the game's heading
// angle (radians, positive turning right from north).
export function compassHeading(heading) {
  return ((((heading * 180) / Math.PI) % 360) + 360) % 360;
}

// One-line readout for the outside views, e.g. "92 mph  3,281 ft  1,180 rpm  HDG 045".
export function readoutText(aircraft, diag, heading) {
  if (!diag) return '';
  const s = airspeedReading(aircraft, diag.speed);
  const a = altimeterReading(aircraft, diag.altitude);
  const unit = s.unit === 'mph' ? 'mph' : 'km/h';
  const hdg = String(Math.round(compassHeading(heading)) % 360).padStart(3, '0');
  return `${Math.round(s.value)} ${unit}   ${Math.round(a.value).toLocaleString('en-GB')} ${a.unit}   ${Math.round(diag.rpm)} rpm   HDG ${hdg}`;
}
