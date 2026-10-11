import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { AIRCRAFT_LIST, common } from '../src/aircraft/index.js';
import * as constants from '../src/core/constants.js';
import { VALIDATION_CASES } from '../src/aircraft/validationCases.js';
import { checkKey } from '../src/physics/validation.js';

// Links the code to docs/AIRCRAFT_DATA.md. Every physics number in the
// aircraft data files, the shared parameters, the sourced constants and the
// validation figures must appear in the document with the same value, so the
// two can never drift apart (project rule: constants live in the data files,
// and each is cited or marked as an estimate with a reason).

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

const number = (s) => Number(s.replace(/,/g, '').split(/\s/)[0]);
const KEY = /`([A-Za-z0-9_.@-]+)`/;
const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
const close = (a, b, rel = 0.01) => Math.abs(a - b) <= Math.max(Math.abs(b) * rel, 1e-9);

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

// Which code path (and unit scale) a document row describes, if any.
function rowPath(row) {
  const key = row[0].match(KEY);
  if (key) return [key[1], 1];
  const m = MAPPED.find(([re]) => re.test(row[0]));
  return m ? [m[1], m[2]] : null;
}

describe('aircraft data files match docs/AIRCRAFT_DATA.md', () => {
  for (const ac of AIRCRAFT_LIST) {
    describe(ac.name, () => {
      const rows = sectionRows(SECTION[ac.id]);

      it('every documented figure equals the value in the code', () => {
        for (const r of rows) {
          const p = rowPath(r);
          if (!p) continue;
          const codeValue = get(ac, p[0]);
          if (typeof codeValue !== 'number') continue;
          const doc = number(r[1]);
          if (Number.isNaN(doc)) continue;
          expect(close(codeValue, doc * p[1]), `${ac.id} ${p[0]}: code ${codeValue} vs doc ${doc * p[1]}`).toBe(true);
        }
      });

      it('every number in the aircraft file has a row in the document', () => {
        const covered = new Set(rows.map(rowPath).filter(Boolean).map((p) => p[0]));
        for (const [path, value] of leaves(ac)) {
          if (typeof value !== 'number' || ['wings', 'engine.rotationSign'].includes(path)) continue;
          // Zero means "none" or "reference" (no rotating mass on an inline
          // engine, the lowest wing's height, a sea-level calibration speed),
          // and a gear ratio of 1 means direct drive; both are explained in prose.
          if (value === 0) continue;
          if (path === 'propeller.gearRatio' && value === 1) continue;
          expect(covered.has(path), `${ac.id}: ${path} has no row in AIRCRAFT_DATA.md`).toBe(true);
        }
      });
    });
  }
});

describe('shared parameters and sourced constants match the document', () => {
  const rows = [...sectionRows('Common flight-model parameters'), ...sectionRows('Physics constants from sources')];
  const byKey = new Map();
  for (const r of rows) {
    const m = r[0].match(/`((common|constants)\.[A-Za-z0-9_.]+)`/);
    if (m) byKey.set(m[1], number(r[1]));
  }
  const codeKeys = [
    ...Object.keys(common).map((k) => `common.${k}`),
    'constants.FLAT_PLATE_CD',
    'constants.SECTION_LIFT_SLOPE',
    ...Object.keys(constants.PRANDTL).map((k) => `constants.PRANDTL.${k}`),
    ...Object.keys(constants.ENGINE_LAPSE).map((k) => `constants.ENGINE_LAPSE.${k}`),
    'constants.PROPELLER_EFFICIENCY.PEAK_J',
    ...constants.PROPELLER_EFFICIENCY.ETA.map((_, i) => `constants.PROPELLER_EFFICIENCY.ETA.${i}`),
  ];
  const resolve = (key) => {
    const [root, ...rest] = key.split('.');
    return get(root === 'common' ? common : constants, rest.join('.'));
  };

  it('has a row for every value in common.js and constants.js, with the same number', () => {
    for (const key of codeKeys) {
      expect(byKey.has(key), `${key} has no row in AIRCRAFT_DATA.md`).toBe(true);
      expect(close(byKey.get(key), resolve(key)), `${key}: code ${resolve(key)} vs doc ${byKey.get(key)}`).toBe(true);
    }
  });

  it('documents nothing that is not in the code', () => {
    for (const key of byKey.keys()) expect(resolve(key), `${key} is documented but not in the code`).toBeTypeOf('number');
  });

  it('the propeller curve rows give the right advance ratio for each value', () => {
    for (const r of rows) {
      const m = r[0].match(/J = ([0-9.]+) \(`constants\.PROPELLER_EFFICIENCY\.ETA\.(\d+)`\)/);
      if (m) expect(Number(m[1])).toBeCloseTo(constants.PROPELLER_EFFICIENCY.J[Number(m[2])], 6);
    }
  });
});

describe('validation figures match the document', () => {
  const rows = sectionRows('Validation data');
  const byKey = new Map();
  for (const r of rows) {
    const m = r[0].match(/`validation\.([^`]+)`/);
    if (m) byKey.set(m[1], number(r[1]));
  }

  it('every validation figure and condition has a row with the same value and source', () => {
    for (const c of VALIDATION_CASES) {
      const expected = [
        ...Object.entries(c.conditions).map(([k, v]) => [`${c.id}.${k}`, v]),
        ...c.checks.map((k) => [`${c.id}.${checkKey(k)}`, k.value]),
      ];
      for (const [key, value] of expected) {
        expect(byKey.has(key), `${key} has no row in AIRCRAFT_DATA.md`).toBe(true);
        expect(close(byKey.get(key), value), `${key}: code ${value} vs doc ${byKey.get(key)}`).toBe(true);
        const row = rows.find((r) => r[0].includes(`\`validation.${key}\``));
        expect(row[4], `${key} source`).toBe(c.source);
      }
    }
  });

  it('documents no validation figure that is not in the code', () => {
    const codeKeys = new Set(
      VALIDATION_CASES.flatMap((c) => [
        ...Object.keys(c.conditions).map((k) => `${c.id}.${k}`),
        ...c.checks.map((k) => `${c.id}.${checkKey(k)}`),
      ]),
    );
    for (const key of byKey.keys()) expect(codeKeys.has(key), `${key} is documented but not in the code`).toBe(true);
  });
});
