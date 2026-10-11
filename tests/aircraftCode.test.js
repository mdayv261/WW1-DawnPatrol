import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { AIRCRAFT_LIST, common } from '../src/aircraft/index.js';
import * as constants from '../src/core/constants.js';

// Links the code to docs/AIRCRAFT_DATA.md. Every physics number in the
// aircraft data files must appear in the document with the same value, so
// the two can never drift apart (project rule: constants live in the data
// files, and each is cited or marked as an estimate with a reason).

const text = readFileSync(new URL('../docs/AIRCRAFT_DATA.md', import.meta.url), 'utf8');

function cells(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

function sectionRows(heading) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith('## ') && l.slice(3).startsWith(heading));
  const rows = [];
  for (let i = start + 1; i < lines.length && !lines[i].startsWith('## '); i++) {
    if (!lines[i].startsWith('|')) continue;
    const c = cells(lines[i]);
    if (c[0] === 'Parameter' || /^-+$/.test(c[0])) continue;
    rows.push(c);
  }
  return rows;
}

const number = (s) => Number(s.replace(/,/g, '').replace(/^[−-]/, (m) => '-'));

// Headline figures: doc row name (prefix) -> where it lives in an aircraft file.
const MAPPED = [
  [/^Wingspan/, 'geometry.wingspan', 1],
  [/^Length/, 'geometry.length', 1],
  [/^Height/, 'geometry.height', 1],
  [/^Wing area/, 'geometry.wingArea', 1],
  [/^(Maximum take-off weight|Loaded weight|Gross weight)/, 'mass.loaded', 1],
  [/^Roll inertia/, 'mass.ixx', 1],
  [/^Pitch inertia/, 'mass.iyy', 1],
  [/^Yaw inertia/, 'mass.izz', 1],
  [/^Engine rated power/, 'engine.ratedPower', 1000],
  [/^Engine rated speed/, 'engine.ratedRpm', 1],
  [/^Rotating engine inertia/, 'engine.rotatingInertia', 1],
  [/^Propeller diameter/, 'propeller.diameter', 1],
  [/^Propeller gear ratio/, 'propeller.gearRatio', 1],
  [/^Zero-lift drag coefficient/, 'aero.cd0', 1],
  [/^Oswald efficiency/, 'aero.oswald', 1],
  [/^Maximum lift coefficient/, 'aero.clMax', 1],
  [/^Maximum speed$/, 'documented.maxSpeed', 1],
  [/^Service ceiling/, 'documented.serviceCeiling', 1],
];

const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);

// Paths in an aircraft file that do not need their own row (identity or
// "not modelled" zero values, explained elsewhere).
const EXEMPT = new Set(['wings', 'engine.rotationSign', 'engine.kind']);

function leaves(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? leaves(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]],
  );
}

const SECTION = {
  camel: 'Sopwith Camel F.1',
  spad13: 'SPAD S.XIII',
  dr1: 'Fokker Dr.I',
  albatros: 'Albatros D.V',
};

describe('aircraft data files match docs/AIRCRAFT_DATA.md', () => {
  for (const ac of AIRCRAFT_LIST) {
    describe(ac.name, () => {
      const rows = sectionRows(SECTION[ac.id]);
      const covered = new Set();

      it('every documented headline figure equals the value in the code', () => {
        for (const r of rows) {
          // Rows with an explicit `path` key (backticks) take priority.
          const key = r[0].match(/`([a-zA-Z.]+)`/);
          let path = key ? key[1] : null;
          let scale = 1;
          if (!path) {
            const m = MAPPED.find(([re]) => re.test(r[0]));
            if (!m) continue;
            [, path, scale] = m;
          }
          const codeValue = get(ac, path);
          if (typeof codeValue !== 'number') continue;
          const doc = number(r[1].split(/\s/)[0]);
          if (Number.isNaN(doc)) continue;
          const expected = doc * scale;
          const tolerance = Math.max(Math.abs(expected) * 0.01, 1e-9); // docs round values
          expect(Math.abs(codeValue - expected), `${ac.id} ${path}: code ${codeValue} vs doc ${expected}`).toBeLessThanOrEqual(tolerance);
          covered.add(path);
        }
      });

      it('every number in the aircraft file has a row in the document', () => {
        // Re-run the matching to know which paths are covered.
        for (const r of rows) {
          const key = r[0].match(/`([a-zA-Z.]+)`/);
          const m = key ? [null, key[1]] : MAPPED.find(([re]) => re.test(r[0]));
          if (m) covered.add(key ? key[1] : m[1]);
        }
        for (const [path, value] of leaves(ac)) {
          if (['id', 'name', 'side', 'engine.kind'].includes(path) || EXEMPT.has(path)) continue;
          if (typeof value !== 'number') continue;
          // Inline engines have no rotating inertia and direct-drive rotaries gear ratio 1: documented in prose.
          if (path === 'engine.rotatingInertia' && value === 0) continue;
          if (path === 'propeller.gearRatio' && value === 1) continue;
          expect(covered.has(path), `${ac.id}: ${path} has no row in AIRCRAFT_DATA.md`).toBe(true);
        }
      });
    });
  }
});

describe('common flight-model parameters match the document', () => {
  const rows = sectionRows('Common flight-model parameters');

  it('has a row for every value in common.js and constants.js, with the same number', () => {
    const byKey = new Map();
    for (const r of rows) {
      const m = r[0].match(/`(common|constants)\.([A-Za-z_]+)`/);
      if (m) byKey.set(`${m[1]}.${m[2]}`, number(r[1]));
    }
    const code = [
      ...Object.entries(common).map(([k, v]) => [`common.${k}`, v]),
      ...['FLAT_PLATE_CD', 'SECTION_LIFT_SLOPE'].map((k) => [`constants.${k}`, constants[k]]),
    ];
    for (const [key, value] of code) {
      expect(byKey.has(key), `${key} has no row in AIRCRAFT_DATA.md`).toBe(true);
      const doc = byKey.get(key);
      const tolerance = Math.max(Math.abs(value) * 0.01, 1e-9);
      expect(Math.abs(doc - value), `${key}: code ${value} vs doc ${doc}`).toBeLessThanOrEqual(tolerance);
    }
  });

  it('documents nothing that is not in the code', () => {
    for (const r of rows) {
      const m = r[0].match(/`(common|constants)\.([A-Za-z_]+)`/);
      if (!m) continue;
      const source = m[1] === 'common' ? common : constants;
      expect(m[2] in source, `${m[0]} is documented but not in the code`).toBe(true);
    }
  });
});
