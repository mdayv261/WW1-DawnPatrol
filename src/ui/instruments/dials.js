// Drawing the period instruments on a 2D canvas: dials with numbered rings and needles, the
// compass card, small gauges, the oil pulsator glass, a clock and the magneto switches. Three
// house styles: British, French and German (lettering in the language of the instruments).

import { drawHatotAltimeter } from './hatot.js';
import { twoHandAltimeter } from '../instrumentMath.js';

const SWEEP = (300 * Math.PI) / 180;
const FACE = 0.88; // the face's radius inside the bezel, as a share of r (see face())
const LINE = 0.13 * 1.2; // one line of the small lettering (its font is 0.13 r)

export const STYLES = {
  british: { wood: '#6e4c2a', grain: '#5a3d22', bezel: '#a8894a', face: '#151515', ink: '#ece6cf', needle: '#f4efd8', serif: 'serif' },
  french: { wood: '#7b5434', grain: '#684629', bezel: '#b4b4b0', face: '#121212', ink: '#efe9d6', needle: '#ffffff', serif: 'serif' },
  german: { wood: '#5d4a32', grain: '#4c3c28', bezel: '#7d7d78', face: '#141414', ink: '#e6e2d2', needle: '#f0ecdc', serif: 'sans-serif' },
};

// Words on the dials, by style.
export const WORDS = {
  british: { tachometer: 'R.P.M.', airspeed: 'AIR SPEED', altimeter: 'HEIGHT', airPressure: 'AIR', fuelPressure: 'PETROL', oilPressure: 'OIL', waterTemp: 'WATER', fuelGauge: 'PETROL', clock: '', ft: 'FEET', m: 'METRES' },
  french: { tachometer: 'TOURS', airspeed: 'VITESSE', altimeter: 'ALTITUDE', airPressure: 'AIR', fuelPressure: 'ESSENCE', oilPressure: 'HUILE', waterTemp: 'EAU', fuelGauge: 'ESSENCE', clock: '', ft: 'PIEDS', m: 'MÈTRES' },
  german: { tachometer: 'U/min', airspeed: 'km/St', altimeter: 'HÖHE', airPressure: 'LUFT', fuelPressure: 'BENZIN', oilPressure: 'ÖL', waterTemp: 'WASSER', fuelGauge: 'BENZIN', clock: '', ft: 'FUSS', m: 'METER' },
};

export function background(ctx, w, h, style) {
  const s = STYLES[style];
  ctx.fillStyle = s.wood;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = s.grain; // a little wood grain
  ctx.lineWidth = 2;
  for (let y = 6; y < h; y += 13) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 64) ctx.lineTo(x, y + Math.sin(x * 0.013 + y) * 3);
    ctx.stroke();
  }
}

function face(ctx, cx, cy, r, s) {
  ctx.fillStyle = s.bezel;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = s.face;
  ctx.beginPath();
  ctx.arc(cx, cy, r * FACE, 0, 2 * Math.PI);
  ctx.fill();
}

function needle(ctx, cx, cy, angle, length, width, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - Math.sin(angle) * length * 0.15, cy + Math.cos(angle) * length * 0.15);
  ctx.lineTo(cx + Math.sin(angle) * length, cy - Math.cos(angle) * length);
  ctx.stroke();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(2, width), 0, 2 * Math.PI);
  ctx.fill();
}

// A numbered dial: values from 0 to `full` swept over `sweep` radians from the top-left.
function scale(ctx, cx, cy, r, s, { full, step, label, divisor = 1, sweep = SWEEP, start = -sweep / 2, format = (v) => String(Math.round(v / divisor)) }) {
  ctx.strokeStyle = s.ink;
  ctx.fillStyle = s.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(r * 0.2)}px ${s.serif}`;
  const wholeTurn = sweep >= 2 * Math.PI - 1e-9; // a full circle: the last figure would sit on the first
  for (let v = 0; v <= full + 1e-9 - (wholeTurn ? step : 0); v += step) {
    const a = start + (v / full) * sweep;
    const sx = Math.sin(a);
    const cyy = -Math.cos(a);
    ctx.lineWidth = Math.max(1, r * 0.025);
    ctx.beginPath();
    ctx.moveTo(cx + sx * r * 0.72, cy + cyy * r * 0.72);
    ctx.lineTo(cx + sx * r * 0.84, cy + cyy * r * 0.84);
    ctx.stroke();
    ctx.fillText(format(v), cx + sx * r * 0.57, cy + cyy * r * 0.57);
  }
  ctx.font = `${Math.round(r * 0.13)}px ${s.serif}`;
  if (label) ctx.fillText(label, cx, cy + r * 0.32);
  return (v) => start + (Math.min(full, Math.max(0, v)) / full) * sweep;
}

// One instrument. inst: { kind, x, y, r } (from PANELS) in pixels already; value: its reading.
// labels: an aircraft's own dial lettering where it differs from its style's (PANELS[id].labels),
// and the instrument's own `face` and `range` when it has a special dial (face 'hatot': hatot.js):
// { tachometer, altimeter } replace those words; airspeedUnitsTop: the airspeed's units (written
// `airspeedUnits`, default km/h) go in the upper half of the dial, one line below half way between
// the needle's centre and the bezel.
export function drawInstrument(ctx, kind, cx, cy, r, value, styleName, aircraft, labels = {}) {
  const s = STYLES[styleName];
  const words = WORDS[styleName];
  switch (kind) {
    case 'tachometer': {
      face(ctx, cx, cy, r, s);
      const full = value.full;
      const angle = scale(ctx, cx, cy, r, s, { full, step: full > 1600 ? 400 : 200, label: labels.tachometer ?? words.tachometer, divisor: 100 });
      needle(ctx, cx, cy, angle(value.value), r * 0.7, r * 0.05, s.needle);
      break;
    }
    case 'airspeed': {
      face(ctx, cx, cy, r, s);
      const mph = value.unit === 'mph';
      const unitsTop = !mph && labels.airspeedUnitsTop;
      const label = mph ? words.airspeed : unitsTop ? words.airspeed : `${words.airspeed === 'km/St' ? '' : words.airspeed} km/h`.trim();
      const angle = scale(ctx, cx, cy, r, s, { full: mph ? 160 : 250, step: mph ? 20 : 50, label });
      if (unitsTop) ctx.fillText(labels.airspeedUnits ?? 'km/h', cx, cy - r * FACE * 0.5 + r * LINE); // one line below half way from the centre to the bezel (the face's edge)
      needle(ctx, cx, cy, angle(value.value), r * 0.7, r * 0.05, s.needle);
      break;
    }
    case 'altimeter': {
      if (labels.face === 'hatot') {
        drawHatotAltimeter(ctx, cx, cy, r * FACE, value, labels.range, labels.altimeter);
        break;
      }
      face(ctx, cx, cy, r, s);
      // With a turn of its own (labels.turn, the Dr.I's 5,000 m) the figures are 0, 0.5, 1 ... thousands of metres.
      const turn = labels.turn;
      scale(ctx, cx, cy, r, s, {
        full: 10, step: 1, sweep: 2 * Math.PI, start: 0, // ten figures evenly round the dial, as the hands go round
        label: labels.altimeter ?? `${words.altimeter} x1000 ${value.unit === 'ft' ? words.ft : words.m}`,
        format: turn ? (v) => String((v * turn) / 10000) : undefined,
      });
      const hands = turn ? twoHandAltimeter(value.value, turn) : value;
      needle(ctx, cx, cy, hands.shortHand, r * 0.42, r * 0.07, s.needle);
      needle(ctx, cx, cy, hands.longHand, r * 0.72, r * 0.035, s.needle);
      break;
    }
    case 'compass': {
      // A card seen through a window: the heading in the middle, the points of the compass going by.
      ctx.fillStyle = s.bezel;
      ctx.fillRect(cx - r * 1.3, cy - r * 0.75, r * 2.6, r * 1.5);
      ctx.fillStyle = '#0d2a1c';
      ctx.fillRect(cx - r * 1.15, cy - r * 0.6, r * 2.3, r * 1.2);
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - r * 1.15, cy - r * 0.6, r * 2.3, r * 1.2);
      ctx.clip();
      ctx.fillStyle = s.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.round(r * 0.55)}px ${s.serif}`;
      const pxPerDeg = (r * 2.3) / 60; // 60 degrees across the window
      for (let d = 0; d < 360; d += 30) {
        let off = ((d - value.heading + 540) % 360) - 180;
        if (Math.abs(off) > 40) continue;
        const label = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[d] ?? String(d / 10);
        ctx.fillText(label, cx + off * pxPerDeg, cy + r * 0.05);
      }
      ctx.restore();
      ctx.strokeStyle = '#d04a2a';
      ctx.lineWidth = Math.max(2, r * 0.05);
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.6);
      ctx.lineTo(cx, cy + r * 0.6);
      ctx.stroke();
      break;
    }
    case 'fuelGauge':
    case 'airPressure':
    case 'fuelPressure':
    case 'oilPressure': {
      face(ctx, cx, cy, r, s);
      const word = words[kind];
      const sweep = Math.PI;
      const angle = scale(ctx, cx, cy, r, s, { full: 4, step: 1, sweep, start: -sweep / 2, label: word, divisor: 1 });
      needle(ctx, cx, cy, angle(value.fraction * 4), r * 0.7, r * 0.06, s.needle);
      break;
    }
    case 'waterTemp': {
      face(ctx, cx, cy, r, s);
      const sweep = Math.PI * 1.3;
      const angle = scale(ctx, cx, cy, r, s, { full: 100, step: 20, sweep, start: -sweep / 2, label: `${words.waterTemp} °C` });
      needle(ctx, cx, cy, angle(value.celsius), r * 0.7, r * 0.06, s.needle);
      break;
    }
    case 'clock': {
      face(ctx, cx, cy, r, s);
      scale(ctx, cx, cy, r, s, { full: 12, step: 3, sweep: 2 * Math.PI * (9 / 12), start: 0, label: '' });
      const h = value.hours;
      needle(ctx, cx, cy, (h / 12) * 2 * Math.PI, r * 0.45, r * 0.07, s.needle);
      needle(ctx, cx, cy, ((h % 1) * 2 * Math.PI), r * 0.7, r * 0.04, s.needle);
      break;
    }
    case 'pulsator': {
      // A glass dome: oil in it pulses with the engine.
      ctx.fillStyle = s.bezel;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.fill();
      const level = value.level;
      ctx.fillStyle = `rgba(${Math.round(150 + 80 * level)}, ${Math.round(110 + 50 * level)}, 40, 0.95)`;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.75, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.2, 0, 2 * Math.PI);
      ctx.fill();
      break;
    }
    case 'slip': {
      // An oblong window onto a curved glass tube; a black ball rolls along it with the sideslip,
      // between two centre marks. The window is 3.2 r wide and 1.1 r tall.
      ctx.fillStyle = '#121212';
      ctx.fillRect(cx - r * 1.6, cy - r * 0.55, r * 3.2, r * 1.1);
      const tubeY = (u) => cy - r * 0.1 + r * 0.3 * (1 - u * u); // u from -1 to 1 along the tube; low in the middle, curving up at the ends
      ctx.strokeStyle = 'rgba(214, 228, 206, 0.9)';
      ctx.lineCap = 'round';
      ctx.lineWidth = r * 0.42;
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const u = -1 + i / 10;
        const x = cx + u * r * 1.3;
        if (i === 0) ctx.moveTo(x, tubeY(u));
        else ctx.lineTo(x, tubeY(u));
      }
      ctx.stroke();
      ctx.strokeStyle = '#121212';
      ctx.lineWidth = Math.max(1, r * 0.04);
      for (const u of [-0.25, 0.25]) {
        ctx.beginPath();
        ctx.moveTo(cx + u * r * 1.3, tubeY(u) - r * 0.24);
        ctx.lineTo(cx + u * r * 1.3, tubeY(u) + r * 0.24);
        ctx.stroke();
      }
      const u = Math.max(-1, Math.min(1, value.ball)) * 0.85;
      ctx.fillStyle = '#0b0b0b';
      ctx.beginPath();
      ctx.arc(cx + u * r * 1.3, tubeY(u), r * 0.17, 0, 2 * Math.PI);
      ctx.fill();
      break;
    }
    case 'switches': {
      for (const dx of [-0.7, 0.7]) {
        ctx.fillStyle = '#b08a3e';
        ctx.beginPath();
        ctx.arc(cx + dx * r, cy, r * 0.6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#3a2a10';
        ctx.lineWidth = r * 0.15;
        ctx.beginPath();
        ctx.moveTo(cx + dx * r, cy);
        ctx.lineTo(cx + dx * r + (value.on ? 0.4 : -0.4) * r, cy - 0.45 * r);
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }
  void aircraft;
}
