// Registry of flyable aircraft.
//
// AIRCRAFT_LIST: the aircraft offered in the menus and the multiplayer lobby (the Late War
// four, in the order of the 1-4 number keys). The Early War aircraft join it when era
// selection arrives (phases E4 and E5).
// ALL_AIRCRAFT: every aircraft with a flight model, in number-key order (5 and 6 are the
// Early War pair, for test flights). AIRCRAFT: all of them by id.

import { camel } from './camel.js';
import { spad13 } from './spad13.js';
import { fokkerDr1 } from './fokkerDr1.js';
import { albatrosDv } from './albatrosDv.js';
import { fokkerE4 } from './fokkerE4.js';
import { nieuport11 } from './nieuport11.js';
import { common } from './common.js';

export const AIRCRAFT_LIST = [camel, spad13, fokkerDr1, albatrosDv];

export const ALL_AIRCRAFT = [...AIRCRAFT_LIST, fokkerE4, nieuport11];

export const AIRCRAFT = Object.fromEntries(ALL_AIRCRAFT.map((a) => [a.id, a]));

export { common };
