// The two eras a mission can be set in, and which aircraft belong to each (each aircraft's own
// `era` field). Late War: Camel, SPAD, Dr.I, Albatros. Early War: Nieuport 11, Fokker E.IV.

import { ALL_AIRCRAFT } from './index.js';

export const ERAS = [
  { id: 'late', label: 'Late War (1917-1918)' },
  { id: 'early', label: 'Early War (1916)' },
];

export const DEFAULT_ERA = 'late';

// The aircraft of an era; of one side only ('Allied' or 'Central') when `side` is given.
export function aircraftOfEra(era, side = null) {
  return ALL_AIRCRAFT.filter((a) => a.era === era && (!side || a.side === side));
}
