// What players would see on different connections: `npm run mp:netreport`.
// Runs the headless 3-player match (tests/mp/netMeasure.js) through the network simulator at
// each ping, jitter and loss, and prints a table. Up to 150 ms and 2% loss is the brief; 250 ms
// and 5% are "beyond the brief", to see how it degrades.

import { measure } from '../tests/mp/netMeasure.js';

const rows = [];
for (const [ping, loss] of [[0, 0], [50, 0], [50, 2], [100, 0], [100, 2], [150, 0], [150, 1], [150, 2], [250, 2], [150, 5], [250, 5]]) {
  const jitter = Math.round(ping / 7);
  const r = measure({ ping, jitter, loss }, { seconds: 40 });
  rows.push({
    connection: `${ping} ms, ${jitter} ms jitter, ${loss}% loss${ping > 150 || loss > 2 ? ' (beyond the brief)' : ''}`,
    'others off their path (m)': r.worst.remoteError.toFixed(2),
    'others frame jump (m)': r.worst.frameJump.toFixed(2),
    'own largest correction (cm)': (r.largest * 100).toFixed(1),
    'own corrections /min': Math.round(r.corrections),
  });
}
console.log('Each line: a 40 s three-player match, worst over every frame of every window.');
console.table(rows);
