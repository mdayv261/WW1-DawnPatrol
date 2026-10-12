// The fighting display: the gun sight mark (pipper) where the bullets will be
// at 200 m, and a status line with rounds left, stoppages and the score.

import { Vector3 } from 'three';
import { SKILLS } from '../aircraft/aiData.js';

const _p = new Vector3();

export function createCombatHud() {
  const pipper = document.createElement('div');
  pipper.style.cssText = `
    position: fixed; width: 34px; height: 34px; margin: -17px 0 0 -17px; z-index: 9; display: none;
    border: 2px solid rgba(255, 244, 150, 0.9); border-radius: 50%; pointer-events: none;
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.6);`;
  const dot = document.createElement('div');
  dot.style.cssText = 'position: absolute; left: 14px; top: 14px; width: 4px; height: 4px; border-radius: 50%; background: rgba(255, 244, 150, 0.95);';
  pipper.appendChild(dot);
  document.body.appendChild(pipper);

  const status = document.createElement('pre');
  status.style.cssText = `
    position: fixed; left: 50%; transform: translateX(-50%); bottom: 10px; margin: 0; padding: 4px 12px; z-index: 10;
    font: 13px/1.4 ui-monospace, Menlo, Consolas, monospace; color: #f4ecc8; background: rgba(10, 16, 10, 0.55);
    border-radius: 6px; white-space: pre; pointer-events: none; text-align: center;`;
  document.body.appendChild(status);

  return {
    // point: the sight point in the world; camera: the view; show: draw the pipper at all.
    update(point, camera, show, text) {
      status.textContent = text;
      if (!show) {
        pipper.style.display = 'none';
        return;
      }
      _p.copy(point).project(camera);
      const visible = _p.z > -1 && _p.z < 1 && Math.abs(_p.x) < 1.1 && Math.abs(_p.y) < 1.1;
      pipper.style.display = visible ? 'block' : 'none';
      if (visible) {
        pipper.style.left = `${((_p.x + 1) / 2) * window.innerWidth}px`;
        pipper.style.top = `${((1 - _p.y) / 2) * window.innerHeight}px`;
      }
    },
  };
}

// "GUNS 250 | 250   FUEL 87%   ENEMIES 2 (Regular)   DOWN 1" for the status line, with warnings
// ("ENGINE SEIZED", "FUEL LEAK") when the player's own aircraft is hurt.
export function combatText(combat, damage = null) {
  if (!combat.gunBank) return '';
  const parts = [`GUNS  ${combat.gunBank.statusText()}`];
  if (damage) {
    parts.push(`FUEL ${Math.round(damage.fuel * 100)}%`);
    const warnings = [];
    if (damage.pilot >= 1) warnings.push('PILOT KILLED');
    else if (damage.pilot > 0) warnings.push('PILOT WOUNDED');
    if (damage.failed.L || damage.failed.R) warnings.push('WING FAILED');
    if (damage.failed.tailplane) warnings.push('TAIL FAILED');
    if (damage.engine >= 1) warnings.push('ENGINE SEIZED');
    else if (damage.fuel <= 0) warnings.push('OUT OF FUEL');
    else if (damage.engine > 0) warnings.push('ENGINE DAMAGED');
    if (damage.tank > 0 && damage.fuel > 0) warnings.push('FUEL LEAK');
    if (Object.values(damage.cables).some((c) => c !== null)) warnings.push('CABLE CUT');
    if (warnings.length) parts.push(warnings.join(', '));
  }
  if (combat.agents.length || combat.kills) parts.push(`ENEMIES ${combat.agents.filter((t) => !t.crashed).length}`, `DOWN ${combat.kills}`);
  parts.push(`NEW ENEMIES: ${SKILLS[combat.skill].name.toUpperCase()}${combat.practice ? '     PRACTICE MODE' : ''}`);
  return parts.join('     ');
}

// Extra lines for the F3 panel.
export function combatLines(combat) {
  if (!combat.gunBank) return [];
  const acc = combat.shotsFired ? Math.round((100 * combat.hitsOnTargets) / combat.shotsFired) : 0;
  return [
    `guns      ${combat.gunBank.statusText()}`,
    `fired     ${combat.shotsFired}   hits ${combat.hitsOnTargets} (${acc}%)   in flight ${combat.bullets.length}`,
    `enemies   ${combat.agents.length}   shot down ${combat.kills}   (new: ${SKILLS[combat.skill].name}${combat.practice ? ', practice mode' : ''})`,
    ...combat.agents.map((a, i) => `  ${i + 1}. ${a.describe()}`),
  ];
}
