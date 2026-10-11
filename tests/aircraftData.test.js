import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Checks docs/AIRCRAFT_DATA.md against the project rule: every value has a
// unit, a cited source (or is marked as an estimate with a reason), and a
// confidence rating. Nothing may be filled in silently.

const FILE = new URL('../docs/AIRCRAFT_DATA.md', import.meta.url);
const text = readFileSync(FILE, 'utf8');

const AIRCRAFT = ['Sopwith Camel F.1', 'SPAD S.XIII', 'Fokker Dr.I', 'Albatros D.V'];
const CONFIDENCE = ['high', 'medium', 'estimate'];
const COLUMNS = ['Parameter', 'Value', 'Unit', 'Original figure', 'Source', 'Confidence', 'Notes'];

// Split a markdown table row into trimmed cells.
function cells(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

// Return the markdown text of each "## heading" section, keyed by heading.
function sections() {
  const out = {};
  let current = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^## (.+)$/);
    if (m) { current = m[1]; out[current] = []; } else if (current) out[current].push(line);
  }
  return out;
}

// Data rows of the first table in a section that has the standard header.
function dataRows(lines) {
  const rows = [];
  let inTable = false;
  for (const line of lines) {
    if (!line.trim().startsWith('|')) { if (inTable) break; continue; }
    const c = cells(line);
    if (!inTable) {
      if (c[0] === 'Parameter') inTable = true;
      continue;
    }
    if (/^-+$/.test(c[0])) continue; // the |---|---| separator line
    rows.push(c);
  }
  return rows;
}

// Source IDs (S1, S2 ...) listed in the Sources table.
function knownSourceIds() {
  const lines = sections().Sources;
  return new Set(lines.filter((l) => /^\|\s*S\d+\s*\|/.test(l)).map((l) => cells(l)[0]));
}

const secs = sections();
const sourceIds = knownSourceIds();

describe('AIRCRAFT_DATA.md', () => {
  it('has a source list', () => {
    expect(sourceIds.size).toBeGreaterThanOrEqual(10);
  });

  it('has a section for each of the four aircraft', () => {
    for (const name of AIRCRAFT) {
      const key = Object.keys(secs).find((h) => h.startsWith(name));
      expect(key, `missing section for ${name}`).toBeTruthy();
    }
  });

  it('lists open research gaps instead of inventing values', () => {
    expect(Object.keys(secs).some((h) => h.startsWith('Open research gaps'))).toBe(true);
  });

  for (const name of AIRCRAFT) {
    describe(name, () => {
      const key = Object.keys(secs).find((h) => h.startsWith(name));
      const rows = key ? dataRows(secs[key]) : [];

      it('has a full set of rows', () => {
        expect(rows.length).toBeGreaterThanOrEqual(20);
      });

      it('has every required column filled in, with a valid confidence', () => {
        for (const r of rows) {
          expect(r.length, `wrong column count in row "${r[0]}"`).toBe(COLUMNS.length);
          COLUMNS.forEach((col, i) => {
            // Notes may be blank only for high-confidence rows (sources agree).
            if (col === 'Notes' && r[5] === 'high') return;
            expect(r[i], `"${r[0]}" has an empty ${col}`).not.toBe('');
          });
          expect(CONFIDENCE, `bad confidence in "${r[0]}"`).toContain(r[5]);
        }
      });

      it('cites a known source for every non-estimate, or ASSUMPTION for estimates', () => {
        for (const r of rows) {
          const [param, , , , source, confidence] = r;
          if (confidence === 'estimate') {
            expect(source, `estimate "${param}" must say ASSUMPTION`).toBe('ASSUMPTION');
          } else {
            const ids = source.split(',').map((s) => s.trim());
            for (const id of ids) {
              expect(sourceIds.has(id), `"${param}" cites unknown source ${id}`).toBe(true);
            }
          }
        }
      });

      it('gives a real reason for every estimate', () => {
        for (const r of rows.filter((x) => x[5] === 'estimate')) {
          expect(r[6].length, `estimate "${r[0]}" needs a reason in Notes`).toBeGreaterThanOrEqual(30);
        }
      });

      it('has no zero or negative numbers', () => {
        for (const r of rows) {
          const first = r[1].replace(/,/g, '').split(/\s/)[0];
          const n = Number(first);
          if (!Number.isNaN(n)) expect(n, `"${r[0]}" must be positive`).toBeGreaterThan(0);
        }
      });

      it('includes the core figures the flight model needs', () => {
        const names = rows.map((r) => r[0].toLowerCase());
        for (const needed of ['wingspan', 'length', 'wing area', 'empty weight', 'engine rated power', 'maximum speed', 'zero-lift drag']) {
          expect(names.some((n) => n.startsWith(needed)), `missing "${needed}"`).toBe(true);
        }
      });
    });
  }
});

describe('Common flight-model parameters section', () => {
  const key = Object.keys(secs).find((h) => h.startsWith('Common flight-model parameters'));
  const rows = key ? dataRows(secs[key]) : [];

  it('exists and has a full set of rows', () => {
    expect(key).toBeTruthy();
    expect(rows.length).toBeGreaterThanOrEqual(30);
  });

  it('every row is an estimate with an ASSUMPTION source and a real reason', () => {
    for (const r of rows) {
      expect(r.length).toBe(COLUMNS.length);
      COLUMNS.forEach((col, i) => expect(r[i], `"${r[0]}" has an empty ${col}`).not.toBe(''));
      expect(r[5], `"${r[0]}" must be an estimate`).toBe('estimate');
      expect(r[4]).toBe('ASSUMPTION');
      expect(r[6].length, `"${r[0]}" needs a reason`).toBeGreaterThanOrEqual(30);
    }
  });
});

// The two research sections (sourced constants, validation figures) follow
// the same row rules as the aircraft sections.
for (const heading of ['Physics constants from sources', 'Validation data']) {
  describe(`${heading} section`, () => {
    const key = Object.keys(secs).find((h) => h.startsWith(heading));
    const rows = key ? dataRows(secs[key]) : [];

    it('exists and has rows', () => {
      expect(key).toBeTruthy();
      expect(rows.length).toBeGreaterThan(5);
    });

    it('every row is complete, with a valid confidence and a known source (or ASSUMPTION for estimates)', () => {
      for (const r of rows) {
        expect(r.length, r[0]).toBe(COLUMNS.length);
        COLUMNS.forEach((col, i) => expect(r[i], `"${r[0]}" has an empty ${col}`).not.toBe(''));
        expect(CONFIDENCE).toContain(r[5]);
        if (r[5] === 'estimate') expect(r[4]).toBe('ASSUMPTION');
        else for (const id of r[4].split(',').map((s) => s.trim())) expect(sourceIds.has(id), `${r[0]} cites ${id}`).toBe(true);
      }
    });
  });
}
