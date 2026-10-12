import { describe, it, expect } from 'vitest';
import { AIRCRAFT } from '../src/aircraft/index.js';
import { POINTS, RANKS, ACE_VICTORIES, missionPoints, rankFor, newCareer, loadCareers, saveCareers, recordMission, CAREER_KEY } from '../src/game/career.js';

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

describe('ranks', () => {
  it('period ranks for each side, from the lowest', () => {
    expect(rankFor('allied', 0)).toBe('Second Lieutenant');
    expect(rankFor('allied', 400)).toBe('Captain');
    expect(rankFor('german', 149)).toBe('Leutnant');
    expect(rankFor('german', 2000)).toBe('Rittmeister');
    for (const side of ['allied', 'german']) {
      expect(RANKS[side][0].points).toBe(0);
      for (let i = 1; i < RANKS[side].length; i++) expect(RANKS[side][i].points).toBeGreaterThan(RANKS[side][i - 1].points);
    }
  });
});

describe('the career', () => {
  it('adds up missions on the side the player flew, promotes, and makes an Ace at five victories', () => {
    const careers = { allied: newCareer(), german: newCareer() };
    const r1 = recordMission(careers, AIRCRAFT.camel, result({ kills: 3 }), 'ace');
    expect(r1.total).toBe(r1.points);
    expect(r1.victories).toBe(3);
    expect(r1.ace).toBe(false);
    expect(r1.promoted).toBe('Lieutenant'); // 3 x 60 + 10 + 20 = 210 points, past 150
    expect(careers.german.missions).toBe(0);
    const r2 = recordMission(careers, AIRCRAFT.spad13, result({ kills: 2 }), 'ace');
    expect(r2.victories).toBe(ACE_VICTORIES);
    expect(r2.ace).toBe(true);
    expect(r2.promoted).toBeNull(); // 360 points, not yet Captain (400)
    expect(careers.allied.missions).toBe(2);
    const r3 = recordMission(careers, AIRCRAFT.camel, result({ kills: 1 }), 'regular');
    expect(r3.ace).toBe(false); // already an Ace
    expect(r3.isAce).toBe(true);
  });

  it('never goes below zero points, and counts losses', () => {
    const careers = { allied: newCareer(), german: newCareer() };
    const r = recordMission(careers, AIRCRAFT.dr1, result({ kills: 0, shotsFired: 0, outcome: 'shot down', headline: 'Shot down' }), 'ace');
    expect(r.total).toBe(0);
    expect(careers.german.losses).toBe(1);
  });

  it('a practice mission is not recorded', () => {
    const careers = { allied: newCareer(), german: newCareer() };
    recordMission(careers, AIRCRAFT.camel, result(), 'ace', true);
    expect(careers.allied).toEqual(newCareer());
  });

  it('is remembered in the browser, and a broken saved copy is ignored', () => {
    const s = memory();
    const careers = loadCareers(s);
    recordMission(careers, AIRCRAFT.albatros, result({ kills: 1 }), 'novice');
    saveCareers(s, careers);
    expect(loadCareers(s).german.victories).toBe(1);
    s.setItem(CAREER_KEY, '{bad');
    expect(loadCareers(s)).toEqual({ allied: newCareer(), german: newCareer() });
    s.setItem(CAREER_KEY, JSON.stringify({ allied: { points: -5, victories: 'x' } }));
    expect(loadCareers(s).allied).toEqual(newCareer());
  });
});
