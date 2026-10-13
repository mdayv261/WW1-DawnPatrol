// The French Hatot altimeter's dial (Smithsonian NASM A19570033000, S51): a black outer ring with
// large orange figures 0 to 4 (thousands of metres, one turn for 5,000 m, rising anticlockwise)
// and orange ticks, a silver inner dial with a barometer scale in centimetres of mercury, the maker's
// lettering, and a single copper needle with a crescent tail. Drawn on a canvas at (cx, cy); the
// face fills `F` (the radius inside the bezel).

import { altitudeForPressure } from '../../physics/atmosphere.js';
import { oneTurnAltimeterAngle } from '../instrumentMath.js';

const ORANGE = '#e0892e';
const SILVER_LIGHT = '#eceae2';
const SILVER_DARK = '#bdbab1';
const INK = '#26231f';
const COPPER = '#a85a26';
const CM_HG = 1333.22; // pascals in one centimetre of mercury

// Text centred at angle a (radians clockwise from the top), radius rad, turned to read along the circle.
function radialText(ctx, text, cx, cy, rad, a, font, colour) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(a);
  ctx.font = font;
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, -rad);
  ctx.restore();
}

// Words along an arc, centred on the top of the dial, reading left to right.
function arcText(ctx, text, cx, cy, rad, font, colour) {
  ctx.save();
  ctx.font = font;
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((s, w) => s + w, 0);
  let a = -total / rad / 2;
  [...text].forEach((ch, i) => {
    const step = widths[i] / rad;
    radialText(ctx, ch, cx, cy, rad, a + step / 2, font, colour);
    a += step;
  });
  ctx.restore();
}

// The angle of a height on this dial (radians clockwise from the top).
const angleFor = (metres, range) => -(metres / range) * 2 * Math.PI;

// value: the altimeter reading ({ value } in metres); centre: the line across the middle.
export function drawHatotAltimeter(ctx, cx, cy, F, value, range, centre = 'BAROMÈTRE ALTIMÈTRE') {
  // The black ring with its orange scale.
  ctx.fillStyle = '#121212';
  ctx.beginPath();
  ctx.arc(cx, cy, F, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = ORANGE;
  ctx.lineCap = 'butt';
  for (let h = 0; h < range; h += 100) {
    const a = angleFor(h, range);
    const len = h % 1000 === 0 ? 0.2 : h % 500 === 0 ? 0.13 : 0.08;
    ctx.lineWidth = Math.max(1, F * (h % 1000 === 0 ? 0.022 : 0.014));
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(a) * F * 0.97, cy - Math.cos(a) * F * 0.97);
    ctx.lineTo(cx + Math.sin(a) * F * (0.97 - len), cy - Math.cos(a) * F * (0.97 - len));
    ctx.stroke();
  }
  for (let k = 0; k * 1000 < range; k++) {
    const a = angleFor(k * 1000, range);
    radialText(ctx, String(k), cx, cy, F * 0.83, a + 0.13, `bold ${Math.round(F * 0.2)}px serif`, ORANGE);
    radialText(ctx, String(k * 1000 || range), cx, cy, F * 0.9, a - 0.13, `${Math.round(F * 0.055)}px serif`, '#d8d4c8');
  }

  // The silver inner dial.
  const inner = F * 0.68;
  const g = ctx.createRadialGradient(cx - inner * 0.3, cy - inner * 0.3, inner * 0.1, cx, cy, inner);
  g.addColorStop(0, SILVER_LIGHT);
  g.addColorStop(1, SILVER_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
  ctx.fill();

  // The barometer scale (cm of mercury), at the height each pressure has in the standard atmosphere.
  // 72-80 (low down) go in a band of their own at the top, outside 38-44 which share those angles.
  ctx.strokeStyle = INK;
  for (let p = 38; p <= 80; p++) {
    const h = altitudeForPressure(p * CM_HG);
    const a = angleFor(h, range);
    const band = p >= 72;
    const rad = band ? inner * 0.97 : inner * 0.8;
    ctx.lineWidth = Math.max(1, F * 0.008);
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(a) * rad, cy - Math.cos(a) * rad);
    ctx.lineTo(cx + Math.sin(a) * (rad - inner * (p % 2 ? 0.04 : 0.07)), cy - Math.cos(a) * (rad - inner * (p % 2 ? 0.04 : 0.07)));
    ctx.stroke();
    if (p % 2 === 0) radialText(ctx, String(p), cx, cy, rad - inner * 0.14, a, `${Math.round(F * 0.07)}px serif`, INK);
  }
  const top = [72, 80].map((p) => angleFor(altitudeForPressure(p * CM_HG), range));
  ctx.lineWidth = Math.max(1, F * 0.008);
  for (const rad of [inner * 0.97, inner * 0.76]) {
    ctx.beginPath();
    ctx.arc(cx, cy, rad, top[0] - Math.PI / 2, top[1] - Math.PI / 2);
    ctx.stroke();
  }

  // The maker's lettering.
  arcText(ctx, 'AVIATION MILITAIRE', cx, cy, inner * 0.42, `${Math.round(F * 0.07)}px serif`, INK);
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(F * 0.06)}px serif`;
  ctx.fillText('HATOT', cx, cy - inner * 0.22);
  ctx.font = `${Math.round(F * 0.04)}px serif`;
  ctx.fillText('PARIS', cx, cy - inner * 0.13);
  ctx.font = `${Math.round(F * 0.065)}px serif`;
  ctx.fillText(centre, cx, cy + inner * 0.2);
  ctx.font = `${Math.round(F * 0.045)}px serif`;
  ctx.fillText('COMPENSÉ', cx, cy + inner * 0.32);

  // The needle: thin, copper, with a crescent tail.
  const a = oneTurnAltimeterAngle(value.value, range);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(a);
  ctx.fillStyle = COPPER;
  ctx.strokeStyle = COPPER;
  ctx.beginPath();
  ctx.moveTo(-F * 0.014, 0);
  ctx.lineTo(0, -F * 0.86);
  ctx.lineTo(F * 0.014, 0);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, F * 0.018);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, F * 0.3);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, F * 0.024);
  ctx.beginPath();
  ctx.arc(0, F * 0.36, F * 0.06, -Math.PI * 0.15, Math.PI * 1.15, true); // the crescent, open toward the tip
  ctx.stroke();
  ctx.fillStyle = '#c08a3a';
  ctx.beginPath();
  ctx.arc(0, 0, F * 0.035, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}
