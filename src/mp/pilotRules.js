// What the controls of an aircraft that has been shot down do: the server, the pilot's own
// browser and its replays all use this same rule, so a falling aircraft falls the same way
// everywhere (and needs no corrections). Shot down means destroyedReason() (pilot killed, a wing
// or the tail gone, the engine seized): then throttle off, stick back and full rudder, as a
// shot-down AI pilot falls in single-player; the trim stays where it was and the guns fall silent.

import { destroyedReason } from '../physics/damage.js';

export const FALLING = { pull: 1, roll: 0, yaw: 1, throttle: 0, fire: false, clearJam: false };

export function controlsFor(sim, input) {
  return destroyedReason(sim.damage) ? { ...input, ...FALLING } : input;
}
