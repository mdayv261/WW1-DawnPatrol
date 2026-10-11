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

// Tachometer: engine rpm, full scale a little above the rated speed.
export function tachometerReading(aircraft, rpm) {
  const full = Math.ceil((aircraft.engine.ratedRpm * 1.25) / 100) * 100;
  return { value: rpm, full, angle: Math.min(1, Math.max(0, rpm / full)) * SWEEP };
}

// Slip ball: -1 (full left) to +1 (full right), from the sideslip angle.
// Wind from the right (positive sideslip) pushes the ball left.
export function slipBall(sideslip) {
  return Math.max(-1, Math.min(1, -sideslip / 0.2));
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
