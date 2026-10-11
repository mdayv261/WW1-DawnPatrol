// Registry of flyable aircraft. The order matches the 1-4 number keys.

import { camel } from './camel.js';
import { spad13 } from './spad13.js';
import { fokkerDr1 } from './fokkerDr1.js';
import { albatrosDv } from './albatrosDv.js';
import { common } from './common.js';

export const AIRCRAFT_LIST = [camel, spad13, fokkerDr1, albatrosDv];

export const AIRCRAFT = Object.fromEntries(AIRCRAFT_LIST.map((a) => [a.id, a]));

export { common };
