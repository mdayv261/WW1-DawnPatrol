import { describe, it, expect } from 'vitest';
import {
  newRoster, enlist, rename, retire, select, activePilot, checkName, importOldCareer, cleanRoster, loadRoster, saveRoster,
  pilotTitle, tidyName, ROSTER_KEY, NAME_MAX, MAX_PILOTS,
} from '../src/game/pilots.js';
import { cleanConfig, aircraftFor, Flow } from '../src/game/flow.js';
import { typingIn } from '../src/input/keyboard.js';

// The Pilot Roll Call: named pilots, one side each, rising in rank with victories.

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
};

describe('enlisting', () => {
  it('a new pilot starts at the lowest rank and is the one flying', () => {
    const { roster, pilot } = enlist(newRoster(), '  James   Bigglesworth ', 'allied');
    expect(pilot.name).toBe('James Bigglesworth');
    expect(pilot).toMatchObject({ side: 'allied', victories: 0, drones: 0, missions: 0, losses: 0, score: 0 });
    expect(activePilot(roster)).toBe(pilot);
    expect(pilotTitle(pilot)).toBe('Second Lieutenant James Bigglesworth (RFC/RAF)');
    const g = enlist(roster, 'Werner Voss', 'german');
    expect(pilotTitle(g.pilot)).toBe('Leutnant Werner Voss (German air service)');
    expect(g.roster.pilots).toHaveLength(2);
    expect(g.roster.active).toBe(g.pilot.id);
  });

  it('refuses a missing, too long, oddly lettered or duplicate name (ignoring case), saying why', () => {
    const { roster } = enlist(newRoster(), 'Albert Ball', 'allied');
    expect(checkName(roster, '   ')).toMatch(/Enter a name/);
    expect(checkName(roster, 'x'.repeat(NAME_MAX + 1))).toMatch(/at most/);
    expect(checkName(roster, 'Ace<script>')).toMatch(/letters, numbers/);
    expect(checkName(roster, 'albert  ball')).toMatch(/already/);
    expect(checkName(roster, "Mick O'Mannock-Jr.")).toBeNull();
    expect(checkName(roster, 'Ernst Udet')).toBeNull();
    expect(checkName(roster, 'Manfred von Richthofen')).toBeNull();
    const r = enlist(roster, 'ALBERT BALL', 'allied');
    expect(r.error).toMatch(/already/);
    expect(r.roster).toBe(roster);
    expect(enlist(roster, 'Someone', 'french').error).toMatch(/side/);
  });

  it('the Roll Call has room for a squadron, not without end', () => {
    let roster = newRoster();
    for (let i = 0; i < MAX_PILOTS; i++) roster = enlist(roster, `Pilot ${i}`, 'allied').roster;
    expect(enlist(roster, 'One more', 'allied').error).toMatch(/retire one/);
  });
});

describe('rename, retire and choose', () => {
  it('renames (keeping the record), retires, and chooses who flies', () => {
    let { roster, pilot } = enlist(newRoster(), 'Arthur Roy Brown', 'allied');
    const voss = enlist(roster, 'Werner Voss', 'german');
    roster = voss.roster;
    roster.pilots[0].victories = 4;
    roster = rename(roster, pilot.id, 'Roy Brown').roster;
    expect(roster.pilots[0]).toMatchObject({ name: 'Roy Brown', victories: 4 });
    expect(rename(roster, pilot.id, 'werner voss').error).toMatch(/already/);
    expect(rename(roster, voss.pilot.id, 'Werner Voss').error).toBeUndefined(); // its own name is fine
    roster = select(roster, pilot.id);
    expect(activePilot(roster).name).toBe('Roy Brown');
    roster = retire(roster, pilot.id);
    expect(roster.pilots.map((p) => p.name)).toEqual(['Werner Voss']);
    expect(activePilot(roster)).toBeNull(); // the pilot flying retired
    expect(select(roster, 'nobody')).toBe(roster);
  });
});

describe('the old record (one unnamed career per side) becomes pilots to name', () => {
  const old = { allied: { points: 210, victories: 3, missions: 4, losses: 1 }, german: { points: 0, victories: 0, missions: 0, losses: 0 } };

  it('one pilot for each side that flew, with its record, waiting for a name; only once', () => {
    const r = importOldCareer(newRoster(), old);
    expect(r.pilots).toHaveLength(1);
    expect(r.pilots[0]).toMatchObject({ side: 'allied', name: '', needsName: true, victories: 3, missions: 4, losses: 1, score: 210 });
    expect(activePilot(r)).toBeNull();
    expect(select(r, r.pilots[0].id)).toBe(r); // must be named first
    expect(importOldCareer(r, old)).toBe(r); // not again
    const named = rename(r, r.pilots[0].id, 'Old Hand').roster;
    expect(named.pilots[0].needsName).toBe(false);
    expect(activePilot(select(named, named.pilots[0].id)).name).toBe('Old Hand');
    expect(importOldCareer(newRoster(), null).pilots).toHaveLength(0);
  });
});

describe('remembered in the browser', () => {
  it('saves and loads; a broken copy, bad pilots and bad numbers are ignored', () => {
    const s = memory();
    let { roster } = enlist(newRoster(), 'Albert Ball', 'allied');
    roster.pilots[0].victories = 7;
    saveRoster(s, roster);
    expect(loadRoster(s)).toEqual(roster);
    s.setItem(ROSTER_KEY, '{bad');
    expect(loadRoster(s)).toEqual(newRoster());
    const junk = {
      active: 'p9',
      pilots: [
        { id: 'p1', name: 'Good', side: 'german', victories: -3, missions: 'x', score: 12.7 },
        { id: 'p1', name: 'Same id', side: 'german' },
        { id: 'p2', name: 'good', side: 'allied' },
        { id: 'p3', name: '', side: 'allied' },
        { id: 'p4', name: 'No side' },
        null,
      ],
    };
    const c = cleanRoster(junk);
    expect(c.pilots).toEqual([{ id: 'p1', name: 'Good', side: 'german', victories: 0, drones: 0, missions: 0, losses: 0, score: 12 }]);
    expect(c.active).toBeNull();
    expect(tidyName(' a  b ')).toBe('a b');
  });
});

describe('a pilot flies their own side', () => {
  it('only their side\'s aircraft are offered, and the other side\'s fall back to theirs', () => {
    expect(aircraftFor('allied').map((a) => a.id)).toEqual(['camel', 'spad13']);
    expect(aircraftFor('german').map((a) => a.id)).toEqual(['dr1', 'albatros']);
    expect(aircraftFor(null)).toHaveLength(4);
    expect(cleanConfig({ aircraft: 'dr1' }, 'allied').aircraft).toBe('camel');
    expect(cleanConfig({ aircraft: 'spad13' }, 'allied').aircraft).toBe('spad13');
    expect(cleanConfig({ aircraft: 'camel' }, 'german').aircraft).toBe('dr1');
    expect(cleanConfig({ aircraft: 'camel', enemyType: 'dr1' }, 'german').enemyType).toBe('mixed'); // a German pilot's enemies are Allied
  });

  it('the Roll Call opens from the main menu and goes back to it', () => {
    const f = new Flow();
    f.go('roster');
    expect(f.can('setup')).toBe(false);
    f.go('menu');
    expect(f.state).toBe('menu');
  });

  it('typing a name is typing: the game does not take the keys', () => {
    expect(typingIn({ tagName: 'INPUT', type: 'text' })).toBe(true);
    expect(typingIn({ tagName: 'TEXTAREA' })).toBe(true);
    expect(typingIn({ tagName: 'INPUT', type: 'range' })).toBe(false);
    expect(typingIn({ tagName: 'BUTTON' })).toBe(false);
    expect(typingIn(null)).toBe(false);
  });
});
