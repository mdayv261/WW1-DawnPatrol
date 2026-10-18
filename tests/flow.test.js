import { describe, it, expect } from 'vitest';
import { Flow, STATES, STARTS, TIMES, DEFAULT_CONFIG, cleanConfig, enemyChoices, loadConfig, saveConfig, CONFIG_KEY } from '../src/game/flow.js';
import { DEFAULT_OPTIONS, cleanOptions, loadOptions, saveOptions } from '../src/game/options.js';

// The screens and how they lead to each other; the mission settings and options remembered.

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), m };
};

describe('the flow between screens', () => {
  it('starts at the main menu and goes menu -> setup -> flying -> paused -> flying -> results -> menu', () => {
    const f = new Flow();
    expect(f.state).toBe('menu');
    for (const to of ['setup', 'flying', 'paused', 'flying', 'results', 'menu']) f.go(to);
    expect(f.state).toBe('menu');
  });

  it('refuses ways the game cannot go (no flying straight from the menu, no results from setup)', () => {
    const f = new Flow();
    expect(() => f.go('flying')).toThrow();
    f.go('setup');
    expect(() => f.go('results')).toThrow();
    expect(f.state).toBe('setup');
  });

  it('options goes back to where it was opened: the menu or the pause screen', () => {
    const f = new Flow();
    f.go('options');
    expect(f.back()).toBe('menu');
    f.go('setup');
    f.go('flying');
    f.go('paused');
    f.go('options');
    expect(f.back()).toBe('paused');
  });

  it('the pause menu can resume, end the mission (results) or quit to the menu; results can fly again or change the mission', () => {
    for (const to of ['flying', 'results', 'menu', 'options']) {
      const f = new Flow('paused');
      expect(f.can(to)).toBe(true);
    }
    for (const to of ['flying', 'setup', 'menu']) expect(new Flow('results').can(to)).toBe(true);
    expect(new Flow('results').can('paused')).toBe(false);
  });

  it('multiplayer: menu > Multiplayer > lobby > flying and back; leaving goes back to Multiplayer', () => {
    const f = new Flow('menu');
    for (const to of ['multiplayer', 'lobby', 'mpFlying', 'mpEsc', 'mpFlying', 'lobby', 'multiplayer', 'mpFlying', 'multiplayer', 'menu']) f.go(to);
    expect(f.state).toBe('menu');
    expect(new Flow('lobby').can('flying')).toBe(false); // a room never leads into a single-player flight
    expect(new Flow('mpFlying').can('paused')).toBe(false); // nor into the single-player pause menu
    expect(new Flow('mpFlying').can('results')).toBe(false);
    for (const s of ['multiplayer', 'lobby', 'mpFlying', 'mpEsc']) expect(STATES).toContain(s);
  });

  it('a match never pauses: its Esc menu keeps the aircraft flying; Options returns to it', () => {
    const f = new Flow('mpFlying');
    expect(f.flying && f.simulating && f.multiplayer).toBe(true);
    f.togglePause();
    expect(f.state).toBe('mpEsc');
    expect(f.flying).toBe(false); // the controls are the menu's
    expect(f.simulating).toBe(true); // but the aircraft flies on
    f.go('options');
    expect(f.multiplayer).toBe(true);
    expect(f.back()).toBe('mpEsc');
    f.togglePause();
    expect(f.state).toBe('mpFlying');
    const sp = new Flow('flying');
    sp.togglePause();
    expect(sp.state).toBe('paused');
    expect(sp.simulating).toBe(false); // a mission does pause
    expect(sp.multiplayer).toBe(false);
  });

  it('tells its listeners each change, with where it came from', () => {
    const f = new Flow();
    const seen = [];
    f.onChange((to, from) => seen.push(`${from}>${to}`));
    f.go('setup');
    f.go('menu');
    f.force('flying'); // development quick start
    expect(seen).toEqual(['menu>setup', 'setup>menu', 'menu>flying']);
    expect(f.flying).toBe(true);
    expect(STATES).toContain(f.state);
  });
});

describe('mission settings', () => {
  it('the enemy choices are the other side\'s aircraft (and mixed)', () => {
    expect(enemyChoices('camel')).toEqual(['mixed', 'dr1', 'albatros']);
    expect(enemyChoices('albatros')).toEqual(['mixed', 'camel', 'spad13']);
  });

  it('bad or unknown values fall back to the defaults; an enemy of your own side is not allowed', () => {
    expect(cleanConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(cleanConfig({ aircraft: 'zeppelin', enemyCount: 9, skill: 'god', start: 'moon', timeOfDay: 'midnight' })).toEqual(DEFAULT_CONFIG);
    expect(cleanConfig({ aircraft: 'camel', enemyType: 'spad13' }).enemyType).toBe('mixed');
    expect(cleanConfig({ aircraft: 'dr1', enemyType: 'spad13', enemyCount: '3', skill: 'ace', start: 'airfield', timeOfDay: 'dusk' }))
      .toEqual({ era: 'late', aircraft: 'dr1', loadout: 'standard', enemyType: 'spad13', enemyCount: 3, skill: 'ace', start: 'airfield', timeOfDay: 'dusk' });
    expect(cleanConfig({ enemyCount: 0 }).enemyCount).toBe(0); // free flight
  });

  it('are remembered in the browser, and a broken saved copy is ignored', () => {
    const s = memory();
    expect(loadConfig(s)).toEqual(DEFAULT_CONFIG);
    saveConfig(s, { aircraft: 'spad13', enemyCount: 4, skill: 'novice', timeOfDay: 'dawn' });
    expect(loadConfig(s)).toMatchObject({ aircraft: 'spad13', enemyCount: 4, skill: 'novice', timeOfDay: 'dawn' });
    s.setItem(CONFIG_KEY, '{not json');
    expect(loadConfig(s)).toEqual(DEFAULT_CONFIG);
    expect(loadConfig(null)).toEqual(DEFAULT_CONFIG);
  });

  it('offers the four starts and three times of day', () => {
    expect(STARTS.map((s) => s.altitude)).toEqual([0, 1000, 2000, 3000]);
    expect(TIMES.map((t) => t.id)).toEqual(['dawn', 'day', 'dusk']);
  });
});

describe('options', () => {
  it('clean, save and load: volume 0 to 1, HUD and practice on or off', () => {
    expect(cleanOptions({ volume: 5, hud: 'yes', practice: true })).toEqual({ ...DEFAULT_OPTIONS, volume: 1, practice: true });
    const s = memory();
    saveOptions(s, { volume: 0.25, hud: true, practice: false });
    expect(loadOptions(s)).toEqual({ ...DEFAULT_OPTIONS, volume: 0.25, hud: true, practice: false });
    expect(loadOptions(null)).toEqual(DEFAULT_OPTIONS);
  });
});
