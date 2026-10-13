import { describe, it, expect } from 'vitest';
import { POINTS, RANKS, ACE_VICTORIES, missionPoints, rankFor, newCareer, loadCareers, recordMission, CAREER_KEY } from '../src/game/career.js';

// Points, ranks and the career.

const result = (over) => ({ outcome: 'victory', headline: 'Victory', kills: 2, shotsFired: 100, accuracy: 20, ...over });
const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
};

describe('points for a mission', () => {
  it('kills by the enemy\'s skill, accuracy, and how it ended', () => {
    const p = missionPoints(result(), 'regular');
    expect(p.total).toBe(2 * POINTS.kill.regular + 10 + POINTS.outcome.victory);
    expect(p.lines.length).toBe(3);
  });

  it('an Ace is worth more than a Novice; a drone very little', () => {
    expect(missionPoints(result(), 'ace').total).toBeGreaterThan(missionPoints(result(), 'novice').total);
    expect(POINTS.kill.drone).toBeLessThan(POINTS.kill.novice);
  });

  it('no accuracy points for a handful of rounds; being shot down or crashing costs points', () => {
    expect(missionPoints(result({ kills: 0, shotsFired: 5, outcome: 'ended', headline: 'Mission ended' }), 'ace').total).toBe(0);
    expect(missionPoints(result({ kills: 0, shotsFired: 0, outcome: 'shot down', headline: 'Shot down' }), 'ace').total).toBe(POINTS.outcome['shot down']);
    expect(POINTS.outcome.crashed).toBeLessThan(0);
    expect(POINTS.outcome.landed).toBeGreaterThan(POINTS.outcome.victory); // coming home safe is valued most
  });

  it('practice mode earns nothing', () => {
    expect(missionPoints(result(), 'ace', true).total).toBe(0);
  });
});

describe('ranks (by victories; product owner, the Roll Call)', () => {
  it('period ranks for each side, from the lowest, rising at 3, 8 and 15 victories', () => {
    expect(rankFor('allied', 0)).toBe('Second Lieutenant');
    expect(rankFor('allied', 2)).toBe('Second Lieutenant');
    expect(rankFor('allied', 3)).toBe('Lieutenant');
    expect(rankFor('allied', 8)).toBe('Captain');
    expect(rankFor('allied', 15)).toBe('Major');
    expect(rankFor('german', 0)).toBe('Leutnant');
    expect(rankFor('german', 7)).toBe('Oberleutnant');
    expect(rankFor('german', 40)).toBe('Rittmeister');
    for (const side of ['allied', 'german']) {
      expect(RANKS[side][0].victories).toBe(0);
      for (let i = 1; i < RANKS[side].length; i++) expect(RANKS[side][i].victories).toBeGreaterThan(RANKS[side][i - 1].victories);
    }
  });
});

const pilot = (side = 'allied') => ({ id: 'p1', name: 'Test', side, victories: 0, drones: 0, missions: 0, losses: 0, score: 0 });

describe("a pilot's record", () => {
  it('adds up missions, promotes at three victories, and makes an Ace at five', () => {
    const p = pilot();
    const r1 = recordMission(p, result({ kills: 3 }), 'ace');
    expect(r1.total).toBe(r1.points);
    expect(r1.victories).toBe(3);
    expect(r1.promoted).toBe('Lieutenant');
    expect(r1.ace).toBe(false);
    const r2 = recordMission(p, result({ kills: 2 }), 'novice');
    expect(r2.victories).toBe(ACE_VICTORIES);
    expect(r2.ace).toBe(true);
    expect(r2.promoted).toBeNull();
    expect(p.missions).toBe(2);
    const r3 = recordMission(p, result({ kills: 1 }), 'regular');
    expect(r3.ace).toBe(false); // already an Ace
    expect(r3.isAce).toBe(true);
  });

  it('drones are counted apart and do not promote', () => {
    const p = pilot('german');
    const r = recordMission(p, result({ kills: 4 }), 'drone');
    expect(p.victories).toBe(0);
    expect(p.drones).toBe(4);
    expect(r.promoted).toBeNull();
    expect(r.rank).toBe('Leutnant');
    expect(p.score).toBeGreaterThan(0); // they still earn a few points
  });

  it('the score never goes below zero, and losses are counted', () => {
    const p = pilot('german');
    const r = recordMission(p, result({ kills: 0, shotsFired: 0, outcome: 'shot down', headline: 'Shot down' }), 'ace');
    expect(r.total).toBe(0);
    expect(p.losses).toBe(1);
  });

  it('a practice mission is not recorded', () => {
    const p = pilot();
    recordMission(p, result(), 'ace', true);
    expect(p).toEqual(pilot());
  });
});

describe('the old careers (before the Roll Call)', () => {
  it('are read from the browser, and a broken saved copy is ignored', () => {
    const s = memory();
    s.setItem(CAREER_KEY, JSON.stringify({ allied: { points: 210, victories: 3, missions: 2, losses: 1 } }));
    expect(loadCareers(s).allied).toEqual({ points: 210, victories: 3, missions: 2, losses: 1 });
    expect(loadCareers(s).german).toEqual(newCareer());
    s.setItem(CAREER_KEY, '{bad');
    expect(loadCareers(s)).toEqual({ allied: newCareer(), german: newCareer() });
    s.setItem(CAREER_KEY, JSON.stringify({ allied: { points: -5, victories: 'x' } }));
    expect(loadCareers(s).allied).toEqual(newCareer());
  });
});
