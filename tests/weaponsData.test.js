import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CARTRIDGES, GUN_TYPES, SYNC, BULLETS } from '../src/aircraft/weapons.js';
import { G1 } from '../src/aircraft/g1Table.js';

// The weapon data in code must match the "Weapons" section of docs/AIRCRAFT_DATA.md,
// and every row there must be complete (value, unit, source, confidence, reason).

const text = readFileSync(new URL('../docs/AIRCRAFT_DATA.md', import.meta.url), 'utf8');
const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

function weaponRows() {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith('## Weapons'));
  const rows = [];
  for (let i = start + 1; i < lines.length && !lines[i].startsWith('## '); i++) {
    if (!lines[i].startsWith('|')) continue;
    const c = cells(lines[i]);
    if (c[0] === 'Parameter' || /^-+$/.test(c[0])) continue;
    rows.push(c);
  }
  return rows;
}

const sourceIds = new Set(text.split('\n').filter((l) => /^\|\s*S\d+\s*\|/.test(l)).map((l) => cells(l)[0]));
const roots = { CARTRIDGES, GUN_TYPES, SYNC, BULLETS };
const rows = weaponRows();
const keyed = rows.filter((r) => /`[A-Z_]+\.[\w.]+`/.test(r[0]));
const get = (path) => path.split('.').reduce((o, k) => o?.[k], roots);
const number = (s) => Number(s.replace(/,/g, '').split(/\s/)[0]);

describe('Weapons section of AIRCRAFT_DATA.md', () => {
  it('has rows, each complete, with a known source or ASSUMPTION, and a real reason for each estimate', () => {
    expect(rows.length).toBeGreaterThan(15);
    for (const r of rows) {
      expect(r.length, r[0]).toBe(7);
      r.forEach((c, i) => expect(c, `"${r[0]}" has an empty column ${i}`).not.toBe(''));
      expect(['high', 'medium', 'estimate']).toContain(r[5]);
      if (r[5] === 'estimate') {
        expect(r[4], r[0]).toBe('ASSUMPTION');
        expect(r[6].length, `${r[0]} needs a reason`).toBeGreaterThanOrEqual(30);
      } else {
        for (const id of r[4].split(',').map((s) => s.trim())) expect(sourceIds.has(id), `${r[0]} cites unknown ${id}`).toBe(true);
      }
    }
  });

  it('every value in a keyed row equals the value in the code', () => {
    expect(keyed.length).toBeGreaterThan(14);
    for (const r of keyed) {
      const path = r[0].match(/`([A-Z_]+\.[\w.]+)`/)[1];
      const code = get(path);
      expect(typeof code, `${path} is not in the code`).toBe('number');
      const doc = number(r[1]);
      expect(Math.abs(code - doc) <= Math.max(Math.abs(doc) * 1e-6, 1e-9), `${path}: code ${code} vs document ${doc}`).toBe(true);
    }
  });

  it('every number in the cartridges and the Vickers type has a row; the LMG 08/15 matches the Vickers where the document says "same"', () => {
    const documented = new Set(keyed.map((r) => r[0].match(/`([A-Z_]+\.[\w.]+)`/)[1]));
    for (const [id, cart] of Object.entries(CARTRIDGES)) {
      for (const [k, v] of Object.entries(cart)) if (typeof v === 'number') expect(documented.has(`CARTRIDGES.${id}.${k}`), `CARTRIDGES.${id}.${k}`).toBe(true);
    }
    for (const [k, v] of Object.entries(GUN_TYPES.vickers)) if (typeof v === 'number') expect(documented.has(`GUN_TYPES.vickers.${k}`), k).toBe(true);
    expect(documented.has('GUN_TYPES.lmg0815.cyclicRate')).toBe(true);
    for (const k of ['jamPerRound', 'clearTime', 'clearSuccess']) expect(GUN_TYPES.lmg0815[k]).toBe(GUN_TYPES.vickers[k]);
    expect(documented.has('SYNC.bladeMargin')).toBe(true);
    expect(documented.has('BULLETS.tracerEvery')).toBe(true);
  });

  it('the cartridges and guns are consistent with each other', () => {
    expect(GUN_TYPES.vickers.cartridge in CARTRIDGES).toBe(true);
    expect(GUN_TYPES.lmg0815.cartridge in CARTRIDGES).toBe(true);
    expect(CARTRIDGES.smk.muzzleVelocity).toBeGreaterThan(CARTRIDGES.mk7.muzzleVelocity); // the German round is the faster
    expect(CARTRIDGES.smk.mass).toBeLessThan(CARTRIDGES.mk7.mass);
  });

  it('the G1 table in the code is the one the document describes', () => {
    expect(G1.mach.length).toBe(79);
    expect(text).toContain('0.2629 at Mach 0');
    expect(text).toContain('0.4805 at Mach 1');
  });
});
