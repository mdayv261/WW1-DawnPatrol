// The live faces of an aircraft's instruments (src/aircraft/panels.js): one small canvas per
// dial, drawn by instruments/dials.js in the aircraft's period style, which the 3D cockpit
// (render/cockpit/) shows on its gauges. Outside a browser (the tests) there are no canvases,
// but the readings are still worked out.

import { CanvasTexture, SRGBColorSpace } from 'three';
import { PANELS } from '../aircraft/panels.js';
import { cockpitId } from '../aircraft/cockpits.js';
import { readings } from './instruments/readings.js';
import { drawInstrument, STYLES } from './instruments/dials.js';

const FACE_FILL = 0.88; // dials.js draws the face inside 0.88 of the radius (the rest is its flat bezel)

// The canvas size of each face (width, height) as multiples of `px`: the compass and the slip indicator are windows.
const SHAPES = { compass: [2.3, 1.2], slip: [3.2, 1.1] };
const shape = (kind) => SHAPES[kind] ?? [2, 2];

function makeFace(kind, px) {
  if (typeof document === 'undefined' || kind === 'switches') return null;
  const [w, h] = shape(kind);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((w / 2) * px);
  canvas.height = Math.round((h / 2) * px);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, ctx: canvas.getContext('2d'), texture };
}

// px: pixels across a round dial's face.
export function createInstrumentPanel(aircraft, px = 256) {
  const panel = PANELS[cockpitId(aircraft)];
  const faces = panel.instruments.map((inst) => makeFace(inst.kind, px));
  let values = readings({ aircraft });

  // state: { diag, heading, damage, throttle, time }. Returns the readings (for the switches).
  function update(state = {}) {
    values = readings({ aircraft, ...state });
    panel.instruments.forEach((inst, i) => {
      const f = faces[i];
      if (!f) return;
      const { width, height } = f.canvas;
      f.ctx.fillStyle = STYLES[panel.style].face;
      f.ctx.fillRect(0, 0, width, height);
      // Drawn larger than the canvas so the face fills it (its flat bezel falls outside: the 3D one replaces it).
      const r = SHAPES[inst.kind] ? height / SHAPES[inst.kind][1] : width / 2 / FACE_FILL;
      drawInstrument(f.ctx, inst.kind, width / 2, height / 2, r, values[inst.kind], panel.style, aircraft, { ...panel.labels, face: inst.face, range: inst.range, turn: inst.turn });
      f.texture.needsUpdate = true;
    });
    return values;
  }

  update({});
  return {
    instruments: panel.instruments,
    style: panel.style,
    size: panel.size,
    faces: faces.map((f) => f?.texture ?? null),
    update,
    get values() {
      return values;
    },
  };
}
