// The modern HUD's numbers and geometry, with no drawing (tested): readouts in the aircraft's
// own units, the heading tape, and where to put a marker for an enemy on or off the screen.

import { airspeedReading, altimeterReading, compassHeading } from './instrumentMath.js';
import { damageLines } from '../physics/damage.js';

const pad = (n) => String(Math.round(n)).padStart(3, '0');

// The readouts: { speed, altitude, climb, g, heading, throttle, fuel, guns, warnings }.
export function hudReadouts({ aircraft, diag, velocityY = 0, heading = 0, throttle = 0, damage, gunText = '' }) {
  const s = airspeedReading(aircraft, diag ? diag.speed : 0);
  const a = altimeterReading(aircraft, diag ? diag.altitude : 0);
  const feet = a.unit === 'ft';
  const climb = feet ? velocityY * 196.85 : velocityY; // ft/min or m/s
  return {
    speed: `${Math.round(s.value)} ${s.unit === 'mph' ? 'MPH' : 'KM/H'}`,
    altitude: `${Math.round(a.value).toLocaleString('en-GB')} ${feet ? 'FT' : 'M'}`,
    climb: feet ? `${climb >= 0 ? '+' : ''}${Math.round(climb / 10) * 10} FT/MIN` : `${climb >= 0 ? '+' : ''}${climb.toFixed(1)} M/S`,
    g: `${(diag ? diag.loadFactor : 1).toFixed(1)} G`,
    heading: pad(compassHeading(heading) % 360),
    throttle: `THR ${Math.round(throttle * 100)}%`,
    fuel: `FUEL ${Math.round((damage ? damage.fuel : 1) * 100)}%`,
    guns: gunText,
    warnings: damage ? damageLines(damage, aircraft)[0].replace(/^damage\s+/, '').toUpperCase() : 'NONE',
  };
}

// The heading tape: ticks every 10 degrees within `span` degrees either side of the heading.
// Returns [{ offset (-1 to 1 across the tape), label ('N', '030' ... or '' for minor ticks) }].
export function headingTape(headingDegrees, span = 45) {
  const out = [];
  const first = Math.ceil((headingDegrees - span) / 10) * 10;
  for (let d = first; d <= headingDegrees + span; d += 10) {
    const deg = ((d % 360) + 360) % 360;
    const label = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[deg] ?? (deg % 30 === 0 ? pad(deg) : '');
    out.push({ offset: (d - headingDegrees) / span, label });
  }
  return out;
}

// Where to draw a marker for a point given its normalised device coordinates (x, y from -1 to 1,
// z > 1 when behind the camera). On screen: a box at the point. Off screen (or behind): an arrow
// at the edge of the screen (`margin` in from it), pointing toward the point.
// Returns { onScreen, x, y (0 to 1 across and down the screen), angle (radians, 0 = up) }.
export function markerFor(ndc, margin = 0.05) {
  const behind = ndc.z > 1;
  let { x, y } = ndc;
  if (behind) {
    x = -x;
    y = -y;
  }
  const onScreen = !behind && Math.abs(x) <= 1 && Math.abs(y) <= 1;
  if (onScreen) return { onScreen, x: (x + 1) / 2, y: (1 - y) / 2, angle: 0 };
  // Push it out along its direction from the centre until it meets the edge (minus the margin).
  const lim = 1 - 2 * margin;
  const k = lim / Math.max(Math.abs(x), Math.abs(y), 1e-6);
  const ex = x * k;
  const ey = y * k;
  return { onScreen, x: (ex + 1) / 2, y: (1 - ey) / 2, angle: Math.atan2(x, y) };
}

// The words under an enemy marker: its type and how far away it is.
export function enemyLabel(name, metres) {
  return `${name}  ${metres < 1000 ? `${Math.round(metres / 10) * 10} m` : `${(metres / 1000).toFixed(1)} km`}`;
}
