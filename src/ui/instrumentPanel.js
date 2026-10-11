// The cockpit instrument panel, drawn on a canvas that the cockpit model
// shows as a texture: airspeed, altimeter, tachometer, compass and slip
// ball, in the aircraft's period units. A minimal set; full period layouts
// come with the later cockpit work.

import { CanvasTexture, SRGBColorSpace } from 'three';
import { airspeedReading, altimeterReading, tachometerReading, slipBall, compassHeading } from './instrumentMath.js';

const W = 1024;
const H = 320;
const R = 120; // dial radius in pixels

function dial(ctx, cx, cy, label, ticks, angleOf) {
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#8a7a50';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = '#e8e2c8';
  ctx.strokeStyle = '#e8e2c8';
  ctx.lineWidth = 3;
  ctx.font = '22px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of ticks) {
    const a = angleOf(t);
    const s = Math.sin(a);
    const c = -Math.cos(a);
    ctx.beginPath();
    ctx.moveTo(cx + s * (R - 22), cy + c * (R - 22));
    ctx.lineTo(cx + s * (R - 8), cy + c * (R - 8));
    ctx.stroke();
    ctx.fillText(String(t.label ?? t), cx + s * (R - 44), cy + c * (R - 44));
  }
  // Unit label inside the ring of numbers, clear of them.
  ctx.font = '15px serif';
  ctx.fillText(label, cx, cy + R * 0.24);
}

function needle(ctx, cx, cy, angle, length, width, colour = '#f4f0dc') {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(angle) * length, cy - Math.cos(angle) * length);
  ctx.stroke();
}

export function createInstrumentPanel(aircraft) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;

  const sweep = (300 * Math.PI) / 180;
  const speedFull = aircraft.instruments.speed === 'mph' ? 160 : 250;
  const speedStep = aircraft.instruments.speed === 'mph' ? 20 : 50;
  const tachFull = tachometerReading(aircraft, 0).full;

  // update(diag, heading): diag from the physics step, heading in radians.
  function update(diag, heading) {
    ctx.fillStyle = '#5b4632'; // varnished plywood
    ctx.fillRect(0, 0, W, H);
    const speed = airspeedReading(aircraft, diag ? diag.speed : 0);
    const alt = altimeterReading(aircraft, diag ? diag.altitude : 0);
    const tach = tachometerReading(aircraft, diag ? diag.rpm : 0);

    const speedTicks = [];
    for (let v = 0; v <= speedFull; v += speedStep) speedTicks.push(v);
    dial(ctx, 150, 160, aircraft.instruments.speed === 'mph' ? 'MPH' : 'KM/H', speedTicks, (v) => (v / speedFull) * sweep);
    needle(ctx, 150, 160, speed.angle, R - 30, 6);

    const altTicks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ n, label: n }));
    dial(ctx, 410, 160, aircraft.instruments.altitude === 'ft' ? 'FEET x1000' : 'METRES x1000', altTicks, (t) => (t.n / 10) * 2 * Math.PI);
    needle(ctx, 410, 160, alt.shortHand, R - 60, 9);
    needle(ctx, 410, 160, alt.longHand, R - 26, 4);

    const tachTicks = [];
    for (let r = 0; r <= tachFull; r += 400) tachTicks.push({ r, label: r / 100 });
    dial(ctx, 670, 160, 'RPM x100', tachTicks, (t) => (t.r / tachFull) * sweep);
    needle(ctx, 670, 160, tach.angle, R - 30, 6);

    // Compass card and slip ball.
    const hdg = compassHeading(heading);
    ctx.fillStyle = '#111';
    ctx.fillRect(840, 70, 150, 80);
    ctx.fillStyle = '#e8e2c8';
    ctx.font = '40px serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(Math.round(hdg) % 360).padStart(3, '0'), 915, 112);
    ctx.font = '16px serif';
    ctx.fillText('COMPASS', 915, 165);
    ctx.fillStyle = '#111';
    ctx.fillRect(840, 200, 150, 34);
    const ball = slipBall(diag ? diag.beta : 0);
    ctx.fillStyle = '#e8e2c8';
    ctx.beginPath();
    ctx.arc(915 + ball * 60, 217, 13, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = '16px serif';
    ctx.fillText('SLIP', 915, 255);
    texture.needsUpdate = true;
  }

  update(null, 0);
  return { canvas, texture, update };
}
