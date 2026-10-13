// The Pilot Roll Call: the player's named pilots, each serving one side, with their records, and
// which one is flying now. Pure (tested); remembered in the browser. The screen is
// src/ui/screens/rollCall.js; ranks and mission points are in career.js.

import { rankFor, SERVICE } from './career.js';

export const ROSTER_KEY = 'dawnPatrol.pilots';
export const ROSTER_VERSION = 1;
export const NAME_MAX = 24;
export const MAX_PILOTS = 20;
const NAME_OK = /^[\p{L}\p{N} '.-]+$/u; // letters (any alphabet), numbers, spaces, ' - .

const SIDES = ['allied', 'german'];
const COUNTS = ['victories', 'drones', 'missions', 'losses', 'score'];

export function newRoster() {
  return { version: ROSTER_VERSION, active: null, imported: false, pilots: [] };
}

// A name tidied up: spaces at the ends removed, runs of spaces made one.
export const tidyName = (name) => String(name ?? '').trim().replace(/\s+/g, ' ');

// Why a name cannot be used, or null if it can. `except`: the id of a pilot being renamed.
export function checkName(roster, name, except = null) {
  const n = tidyName(name);
  if (!n) return 'Enter a name';
  if (n.length > NAME_MAX) return `A name can be at most ${NAME_MAX} letters long`;
  if (!NAME_OK.test(n)) return "Use letters, numbers, spaces and ' - . only";
  if (roster.pilots.some((p) => p.id !== except && p.name.toLowerCase() === n.toLowerCase())) return `There is already a pilot called ${n}`;
  return null;
}

const newId = (roster) => {
  let i = roster.pilots.length + 1;
  while (roster.pilots.some((p) => p.id === `p${i}`)) i++;
  return `p${i}`;
};

function blankPilot(id, name, side) {
  return { id, name, side, victories: 0, drones: 0, missions: 0, losses: 0, score: 0 };
}

// Enlist a new pilot at the lowest rank; they become the pilot flying now. Returns
// { roster, pilot } or { roster, error } (the roster unchanged).
export function enlist(roster, name, side) {
  const error = checkName(roster, name) ?? (SIDES.includes(side) ? null : 'Choose a side');
  if (error) return { roster, error };
  if (roster.pilots.length >= MAX_PILOTS) return { roster, error: `The Roll Call holds ${MAX_PILOTS} pilots: retire one first` };
  const pilot = blankPilot(newId(roster), tidyName(name), side);
  return { roster: { ...roster, active: pilot.id, pilots: [...roster.pilots, pilot] }, pilot };
}

// Rename a pilot (also names a pilot imported from the old record). Returns { roster } or { roster, error }.
export function rename(roster, id, name) {
  const error = checkName(roster, name, id);
  if (error) return { roster, error };
  return { roster: { ...roster, pilots: roster.pilots.map((p) => (p.id === id ? { ...p, name: tidyName(name), needsName: false } : p)) } };
}

// Retire a pilot: their record is removed. If they were flying, no pilot is flying now.
export function retire(roster, id) {
  return { ...roster, active: roster.active === id ? null : roster.active, pilots: roster.pilots.filter((p) => p.id !== id) };
}

// Choose the pilot flying now (a pilot still waiting for a name cannot fly).
export function select(roster, id) {
  const p = roster.pilots.find((x) => x.id === id);
  return p && !p.needsName ? { ...roster, active: id } : roster;
}

export function activePilot(roster) {
  return roster.pilots.find((p) => p.id === roster.active && !p.needsName) ?? null;
}

// "Lieutenant James Bigglesworth (RFC/RAF)".
export function pilotTitle(p) {
  return `${rankFor(p.side, p.victories)} ${p.name} (${SERVICE[p.side]})`;
}

// The old careers (one unnamed record per side, before the Roll Call) become pilots waiting for
// a name, one for each side that flew missions. Only once: later calls change nothing.
export function importOldCareer(roster, careers) {
  if (roster.imported) return roster;
  let r = { ...roster, imported: true, pilots: [...roster.pilots] };
  for (const side of SIDES) {
    const c = careers?.[side];
    if (!c || !(c.missions > 0)) continue;
    const p = blankPilot(newId(r), '', side);
    Object.assign(p, { victories: c.victories, missions: c.missions, losses: c.losses, score: c.points, needsName: true });
    r = { ...r, pilots: [...r.pilots, p] };
  }
  return r;
}

// ---- remembered in the browser ---------------------------------------------------------------

// A clean roster from anything (a saved copy): bad pilots dropped, bad numbers made zero.
export function cleanRoster(raw) {
  const out = newRoster();
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.pilots)) return out;
  out.imported = raw.imported === true;
  const ids = new Set();
  const names = new Set();
  for (const p of raw.pilots.slice(0, MAX_PILOTS)) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || ids.has(p.id) || !SIDES.includes(p.side)) continue;
    const name = tidyName(p.name);
    const waiting = p.needsName === true && name === '';
    if (!waiting && (checkName({ pilots: [] }, name) || names.has(name.toLowerCase()))) continue;
    const pilot = blankPilot(p.id, name, p.side);
    for (const k of COUNTS) {
      const v = Number(p[k]);
      if (Number.isFinite(v) && v >= 0) pilot[k] = Math.floor(v);
    }
    if (waiting) pilot.needsName = true;
    ids.add(p.id);
    if (name) names.add(name.toLowerCase());
    out.pilots.push(pilot);
  }
  out.active = out.pilots.some((p) => p.id === raw.active && !p.needsName) ? raw.active : null;
  return out;
}

export function loadRoster(storage) {
  try {
    return cleanRoster(JSON.parse(storage?.getItem(ROSTER_KEY) ?? 'null'));
  } catch {
    return newRoster();
  }
}

export function saveRoster(storage, roster) {
  try {
    storage?.setItem(ROSTER_KEY, JSON.stringify(roster));
  } catch {
    // not remembered (private window)
  }
}
