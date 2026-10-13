// The optional modern HUD (U, or Options): speed, height, climb, g, a heading tape, throttle,
// fuel, guns and damage, and markers on the enemy aircraft (a box when it is on screen, an arrow
// at the edge when it is not). Plain DOM over the 3D view. The numbers are worked out in hudMath.js.

import { Vector3 } from 'three';
import { hudReadouts, headingTape, markerFor } from './hudMath.js';

const GREEN = 'rgba(140, 255, 160, 0.92)';
const BASE = `position: fixed; z-index: 12; pointer-events: none; color: ${GREEN};
  font: 15px/1.3 ui-monospace, Menlo, Consolas, monospace; text-shadow: 0 0 3px rgba(0,0,0,0.9);`;

const box = (css) => {
  const e = document.createElement('div');
  e.style.cssText = BASE + css;
  document.body.appendChild(e);
  return e;
};

const _p = new Vector3();

export function createHud() {
  const left = box('left: 18%; top: 42%; text-align: right; white-space: pre;');
  const right = box('right: 18%; top: 42%; white-space: pre;');
  const tape = box('left: 50%; top: 26px; width: 420px; height: 24px; margin-left: -210px; border-bottom: 1px solid ' + GREEN + ';');
  const bottom = box('left: 50%; bottom: 44px; transform: translateX(-50%); text-align: center; white-space: pre;');
  const markers = [];
  let visible = false;

  function marker(i) {
    if (!markers[i]) markers[i] = box('');
    return markers[i];
  }

  function show(on) {
    visible = on;
    for (const e of [left, right, tape, bottom, ...markers]) e.style.display = on ? 'block' : 'none';
  }
  show(false);

  return {
    get visible() {
      return visible;
    },
    show,
    // state: { aircraft, diag, velocityY, heading (rad), throttle, damage, gunText, enemies: [{ position, label }], camera }
    update(state) {
      if (!visible) return;
      const r = hudReadouts(state);
      left.textContent = `${r.speed}\n${r.g}`;
      right.textContent = `${r.altitude}\n${r.climb}`;
      tape.replaceChildren(...headingTape(Number(r.heading)).flatMap((t) => {
        const tick = document.createElement('div');
        tick.style.cssText = `position: absolute; left: ${50 + t.offset * 50}%; bottom: 0; width: 0; height: ${t.label ? 8 : 4}px;
          border-left: 1px solid ${GREEN};`;
        if (!t.label) return [tick];
        const label = document.createElement('div');
        label.style.cssText = `position: absolute; left: ${50 + t.offset * 50}%; bottom: 9px; transform: translateX(-50%); font-size: 11px;`;
        label.textContent = t.label;
        return [tick, label];
      }));
      const centre = document.createElement('div');
      centre.style.cssText = 'position: absolute; left: 50%; top: -18px; transform: translateX(-50%); font-weight: bold;';
      centre.textContent = r.heading;
      tape.appendChild(centre);
      bottom.textContent = `${r.throttle}   ${r.fuel}   ${r.guns}\n${r.warnings === 'NONE' ? '' : r.warnings}`;

      // Enemy markers.
      const enemies = state.enemies ?? [];
      enemies.forEach((en, i) => {
        const m = marker(i);
        m.style.display = 'block';
        _p.copy(en.position).project(state.camera);
        const k = markerFor(_p);
        if (k.onScreen) {
          m.style.cssText = BASE + `left: ${k.x * 100}%; top: ${k.y * 100}%; width: 28px; height: 28px; margin: -14px 0 0 -14px;
            border: 1.5px solid ${GREEN}; font-size: 11px;`;
          m.textContent = '';
          const label = document.createElement('div');
          label.style.cssText = 'position: absolute; top: 30px; left: 50%; transform: translateX(-50%); white-space: nowrap;';
          label.textContent = en.label;
          m.appendChild(label);
        } else {
          m.style.cssText = BASE + `left: ${k.x * 100}%; top: ${k.y * 100}%; width: 0; height: 0; margin: -10px 0 0 -8px;
            border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 20px solid ${GREEN};
            transform: rotate(${k.angle}rad);`;
          m.textContent = '';
        }
      });
      for (let i = enemies.length; i < markers.length; i++) markers[i].style.display = 'none';
    },
  };
}
