// The game's screens and how one leads to another, with no drawing: the main menu, mission
// setup, options (and its controls screen), the Pilot Roll Call, flying, paused and results,
// and the multiplayer screens (Multiplayer, the room's lobby, flying in a match and its Esc menu,
// under which the match flies on). Also the mission settings the player chooses,
// cleaned up and remembered in the browser. The screens themselves are in src/ui/screens/.

import { AIRCRAFT_LIST } from '../aircraft/index.js';
import { SKILL_ORDER } from '../aircraft/aiData.js';

export const STATES = ['menu', 'setup', 'options', 'controls', 'roster', 'flying', 'paused', 'results', 'multiplayer', 'lobby', 'mpFlying', 'mpEsc', 'mpResults'];
const MULTIPLAYER = ['multiplayer', 'lobby', 'mpFlying', 'mpEsc', 'mpResults'];
const PAUSE = { flying: 'paused', paused: 'flying', mpFlying: 'mpEsc', mpEsc: 'mpFlying' }; // what Esc does

// Where each screen may go next.
const NEXT = {
  menu: ['setup', 'options', 'roster', 'multiplayer'],
  roster: ['menu'],
  setup: ['menu', 'flying'],
  options: ['menu', 'paused', 'mpEsc', 'controls'], // options goes back to where it was opened from
  controls: ['options'],
  flying: ['paused', 'results'],
  paused: ['flying', 'options', 'results', 'menu'],
  results: ['flying', 'setup', 'menu'],
  multiplayer: ['menu', 'lobby', 'mpFlying', 'mpResults'], // into a room (or back into a match or its results after a reload)
  lobby: ['multiplayer', 'mpFlying', 'mpResults'], // leaving, or refused / lost, goes back to Multiplayer
  mpFlying: ['mpEsc', 'mpResults', 'lobby', 'multiplayer'], // the match ends (results) or the room is lost
  mpEsc: ['mpFlying', 'options', 'mpResults', 'lobby', 'multiplayer'],
  mpResults: ['lobby', 'multiplayer'],
};

export class Flow {
  constructor(state = 'menu') {
    this.state = state;
    this.optionsFrom = 'menu'; // where options returns to
    this.listeners = [];
  }

  can(to) {
    return NEXT[this.state].includes(to);
  }

  // Move to another screen (throws if that is not a way the game can go).
  go(to) {
    if (!this.can(to)) throw new Error(`Cannot go from ${this.state} to ${to}`);
    const from = this.state;
    if (to === 'options' && from !== 'controls') this.optionsFrom = from; // back from controls keeps it
    this.state = to;
    for (const f of this.listeners) f(to, from);
    return to;
  }

  // Jump straight to a screen without the usual route (development quick starts only).
  force(to) {
    const from = this.state;
    this.state = to;
    for (const f of this.listeners) f(to, from);
  }

  // Back from options to the screen it was opened from.
  back() {
    return this.go(this.optionsFrom);
  }

  onChange(f) {
    this.listeners.push(f);
  }

  // Flying with the controls (single-player or a match).
  get flying() {
    return this.state === 'flying' || this.state === 'mpFlying';
  }

  // The aircraft is moving: flying, or a match's Esc menu (a match never pauses).
  get simulating() {
    return this.flying || this.state === 'mpEsc';
  }

  get multiplayer() {
    return MULTIPLAYER.includes(this.state) || (this.state === 'options' && this.optionsFrom === 'mpEsc') || (this.state === 'controls' && this.optionsFrom === 'mpEsc');
  }

  // Esc / P: pause and resume a mission; open and close a match's menu.
  togglePause() {
    if (PAUSE[this.state]) this.go(PAUSE[this.state]);
  }
}

// ---- mission settings -------------------------------------------------------

export const STARTS = [
  { id: 'airfield', label: 'On the airfield', altitude: 0 },
  { id: '1000', label: 'In the air, 1,000 m', altitude: 1000 },
  { id: '2000', label: 'In the air, 2,000 m', altitude: 2000 },
  { id: '3000', label: 'In the air, 3,000 m', altitude: 3000 },
];
export const TIMES = [
  { id: 'dawn', label: 'Dawn' },
  { id: 'day', label: 'Day' },
  { id: 'dusk', label: 'Dusk' },
];
export const MAX_ENEMIES = 4;

export const DEFAULT_CONFIG = { aircraft: 'camel', enemyType: 'mixed', enemyCount: 2, skill: 'regular', start: '1000', timeOfDay: 'day' };
export const CONFIG_KEY = 'dawnPatrol.mission';

// The enemy types for a player's aircraft: the other side's (or 'mixed', all of them in turn).
export function enemyChoices(aircraftId) {
  const mine = AIRCRAFT_LIST.find((a) => a.id === aircraftId) ?? AIRCRAFT_LIST[0];
  return ['mixed', ...AIRCRAFT_LIST.filter((a) => a.side !== mine.side).map((a) => a.id)];
}

// The aircraft a pilot of `side` ('allied' or 'german') may fly; all of them with no side.
export function aircraftFor(side) {
  if (!side) return AIRCRAFT_LIST;
  return AIRCRAFT_LIST.filter((a) => (a.side === 'Allied') === (side === 'allied'));
}

// A clean config from anything (a saved copy, a form): unknown or bad values fall back to the
// defaults. side: the pilot's side; an aircraft of the other side becomes the first of theirs.
export function cleanConfig(raw, side = null) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const c = { ...DEFAULT_CONFIG };
  const allowed = aircraftFor(side);
  c.aircraft = allowed.some((a) => a.id === r.aircraft) ? r.aircraft : allowed.some((a) => a.id === c.aircraft) ? c.aircraft : allowed[0].id;
  if (enemyChoices(c.aircraft).includes(r.enemyType)) c.enemyType = r.enemyType;
  const n = Number(r.enemyCount);
  if (Number.isInteger(n) && n >= 0 && n <= MAX_ENEMIES) c.enemyCount = n;
  if (SKILL_ORDER.includes(r.skill)) c.skill = r.skill;
  if (STARTS.some((s) => s.id === r.start)) c.start = r.start;
  if (TIMES.some((t) => t.id === r.timeOfDay)) c.timeOfDay = r.timeOfDay;
  return c;
}

export function loadConfig(storage) {
  try {
    return cleanConfig(JSON.parse(storage?.getItem(CONFIG_KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(storage, config) {
  try {
    storage?.setItem(CONFIG_KEY, JSON.stringify(cleanConfig(config)));
  } catch {
    // not remembered (private window)
  }
}
