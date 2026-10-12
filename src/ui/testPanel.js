// TEMPORARY flight test panel (F4, development builds only; D31). Buttons
// start each aircraft in a test scenario; live readouts show the numbers
// needed to judge it, including bank and turn rate, which F3 does not show.

import { SCENARIOS, attitude, turnRate } from '../dev/flightScenarios.js';
import { toMph } from './units.js';
import { TEST_DAMAGE } from '../physics/damage.js';

const DEG = 180 / Math.PI;

const STYLE = `
  position: fixed; top: 52px; right: 10px; z-index: 11; display: none;
  padding: 10px 12px; border-radius: 6px; background: rgba(10, 16, 10, 0.78);
  color: #e8f0e0; font: 12px/1.4 ui-monospace, Menlo, Consolas, monospace;
`;
const BUTTON = `
  margin: 2px; padding: 4px 6px; font: 11px ui-monospace, Menlo, Consolas, monospace;
  background: #2f3d2a; color: #e8f0e0; border: 1px solid #6b7a4a; border-radius: 4px; cursor: pointer;
`;

// aircraftList: the four aircraft; onStart(aircraftIndex, scenarioId); onDamage(kind) damages your own aircraft.
export function createTestPanel(aircraftList, onStart, onDamage = () => {}) {
  const root = document.createElement('div');
  root.style.cssText = STYLE;
  const title = document.createElement('div');
  title.textContent = 'FLIGHT TEST PANEL (F4 to hide) - temporary';
  title.style.marginBottom = '6px';
  root.appendChild(title);

  const table = document.createElement('table');
  aircraftList.forEach((ac, i) => {
    const row = table.insertRow();
    const name = row.insertCell();
    name.textContent = ac.name;
    name.style.paddingRight = '8px';
    for (const s of SCENARIOS) {
      const b = document.createElement('button');
      b.textContent = s.label;
      b.style.cssText = BUTTON;
      b.addEventListener('click', () => {
        b.blur(); // keep keyboard input going to the game
        onStart(i, s.id);
      });
      row.insertCell().appendChild(b);
    }
  });
  root.appendChild(table);

  const damageTitle = document.createElement('div');
  damageTitle.textContent = 'Damage your own aircraft (then fly it):';
  damageTitle.style.margin = '8px 0 2px';
  root.appendChild(damageTitle);
  for (const k of TEST_DAMAGE) {
    const b = document.createElement('button');
    b.textContent = k.label;
    b.style.cssText = BUTTON;
    b.addEventListener('click', () => {
      b.blur();
      onDamage(k.id);
    });
    root.appendChild(b);
  }

  const status = document.createElement('pre');
  status.style.cssText = 'margin: 8px 0 0; white-space: pre;';
  root.appendChild(status);
  document.body.appendChild(root);

  return {
    toggle() {
      root.style.display = root.style.display === 'none' ? 'block' : 'none';
    },
    get visible() {
      return root.style.display !== 'none';
    },
    // Refresh the readouts (call about ten times a second).
    update(sim, runner, label) {
      if (!sim.diag) return;
      const a = attitude(sim.state);
      const d = sim.diag;
      status.textContent = [
        `Scenario:  ${label}`,
        `Control:   ${runner ? runner.phase : 'you have control'}`,
        `Airspeed:  ${toMph(d.speed).toFixed(0)} mph   Altitude: ${d.altitude.toFixed(0)} m`,
        `Bank:      ${(a.bank * DEG).toFixed(0)} deg (+ = right)   Pitch: ${(a.pitch * DEG).toFixed(1)} deg`,
        `Turn rate: ${(turnRate(sim.state) * DEG).toFixed(1)} deg/s (+ = right)   Yaw rate: ${(-sim.state.angularVelocity.y).toFixed(2)} rad/s`,
        `Stall:     ${(d.stall * 100).toFixed(0)} %   g-load: ${d.loadFactor.toFixed(2)}   Throttle: ${(sim.surfaces.throttle * 100).toFixed(0)} %`,
      ].join('\n');
    },
  };
}
