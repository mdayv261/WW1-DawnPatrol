import { describe, it, expect } from 'vitest';
import { scoreLineText, clockText } from '../../src/ui/scoreLine.js';
import { resultHeadline, resultRows } from '../../src/ui/screens/mpResults.js';
import { Flow } from '../../src/game/flow.js';

const settings = { scoreLimit: 5, timeLimit: 10 };

describe('the score line', () => {
  it('shows the team scores, the time left and the target', () => {
    expect(scoreLineText({ teams: { allied: 2, central: 1 } }, 138, settings)).toBe('ALLIED 2 – 1 CENTRAL   7:42   First to 5');
    expect(scoreLineText(null, 0, settings)).toBe('ALLIED 0 – 0 CENTRAL   10:00   First to 5');
  });

  it('counts down and never below 0:00', () => {
    expect(clockText(61.2)).toBe('1:02');
    expect(clockText(9)).toBe('0:09');
    expect(clockText(-3)).toBe('0:00');
  });
});

describe('the results', () => {
  const players = [
    { id: 'p1', name: 'Max', team: 'central', aircraft: 'dr1', kills: 1, deaths: 3, shots: 0, hits: 0 },
    { id: 'p2', name: 'Albert', team: 'allied', aircraft: 'camel', kills: 3, deaths: 1, shots: 400, hits: 37 },
    { id: 'p3', name: 'Georges', team: 'allied', aircraft: 'spad13', kills: 0, deaths: 0, shots: 120, hits: 6 },
  ];

  it('say who won and why, in words', () => {
    expect(resultHeadline({ winner: 'allied', reason: 'score', scoreLimit: 3 })).toEqual({ title: 'Allied victory', detail: 'First to 3 victories' });
    expect(resultHeadline({ winner: 'central', reason: 'score', scoreLimit: 1 }).detail).toBe('First to 1 victory');
    expect(resultHeadline({ winner: 'draw', reason: 'time' })).toEqual({ title: 'A draw', detail: 'Time is up' });
    expect(resultHeadline({ winner: 'central', reason: 'left', leftTeam: 'allied' })).toEqual({ title: 'Central victory', detail: 'The Allied team left' });
    expect(resultHeadline({ winner: 'draw', reason: 'host' }).detail).toBe('Ended by the host');
  });

  it('list every pilot, the winners first, with accuracy, and mark you', () => {
    const rows = resultRows({ winner: 'allied', players }, 'p1');
    expect(rows.map((r) => r.name)).toEqual(['Albert', 'Georges', 'Max']);
    expect(rows[0]).toMatchObject({ team: 'Allied', aircraft: 'Sopwith Camel F.1', kills: 3, deaths: 1, hits: '37 / 400', accuracy: '9%', you: false });
    expect(rows[2]).toMatchObject({ accuracy: '-', you: true }); // no rounds fired: no accuracy
  });
});

describe('the flow around the results', () => {
  it('flying or the Esc menu lead to the results, and the results to the lobby', () => {
    for (const from of ['mpFlying', 'mpEsc', 'lobby', 'multiplayer']) expect(new Flow(from).can('mpResults')).toBe(true);
    const f = new Flow('mpResults');
    expect(f.multiplayer).toBe(true);
    expect(f.flying).toBe(false);
    expect(f.simulating).toBe(false);
    expect(f.can('lobby') && f.can('multiplayer')).toBe(true);
    expect(f.can('flying') || f.can('menu')).toBe(false);
  });
});
