// The development test flights on the number keys (and the F4 test panel): every aircraft
// with a flight model in order (1-4 Late War, 5 the Fokker E.IV, 6 the Nieuport 11), then
// 7, the E.IV with Immelmann's three guns.

import { ALL_AIRCRAFT, AIRCRAFT } from '../aircraft/index.js';
import { withLoadout } from '../weapons/mounts.js';

export const DEV_FLIGHTS = [...ALL_AIRCRAFT, withLoadout(AIRCRAFT.e4, 'immelmann')];
