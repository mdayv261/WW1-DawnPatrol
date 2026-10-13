import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PANELS, NOT_FITTED } from '../src/aircraft/panels.js';
import { INSTRUMENTS } from '../src/aircraft/instrumentBehaviour.js';
import { readings } from '../src/ui/instruments/readings.js';
import { drawInstrument } from '../src/ui/instruments/dials.js';
import { oneTurnAltimeterAngle, twoHandAltimeter } from '../src/ui/instrumentMath.js';
import { altitudeForPressure, atmosphere } from '../src/physics/atmosphere.js';
import { AIRCRAFT, AIRCRAFT_LIST } from '../src/aircraft/index.js';
import { createDamage } from '../src/physics/damage.js';

// Cockpit panels (Phase 6): the data matches the research, and each needle behaves.

const doc = readFileSync(new URL('../docs/AIRCRAFT_DATA.md', import.meta.url), 'utf8');
const section = doc.slice(doc.indexOf('## Cockpit panels'), doc.indexOf('## Open research gaps'));
const rows = new Set(section.split('\n').filter((l) => l.startsWith('| ')).map((l) => l.split('|').slice(1, 3).map((c) => c.trim()).join(' ')));

describe('panel data', () => {
  it('every aircraft has a panel with a style and a size', () => {
    for (const ac of AIRCRAFT_LIST) {
      const p = PANELS[ac.id];
      expect(p, ac.id).toBeTruthy();
      expect(['british', 'french', 'german']).toContain(p.style);
      expect(p.size[0]).toBeGreaterThan(p.size[1]);
    }
  });

  it('every instrument is a row in AIRCRAFT_DATA.md, and every row is an instrument', () => {
    let count = 0;
    for (const [id, p] of Object.entries(PANELS)) {
      for (const ins of p.instruments) {
        expect(rows.has(`${id} ${ins.kind}`), `${id} ${ins.kind} has no row`).toBe(true);
        count++;
      }
    }
    expect(rows.size - 1).toBe(count); // less the table's header row
  });

  it('instruments sit on the panel (or at a point in the cockpit), and only the airspeed indicator goes on a strut', () => {
    for (const p of Object.values(PANELS)) {
      for (const ins of p.instruments) {
        if (ins.mount === 'free') {
          expect(ins.at).toHaveLength(3);
          expect(ins.radius).toBeGreaterThan(0.01);
          continue;
        }
        expect(ins.x).toBeGreaterThan(0);
        expect(ins.x).toBeLessThan(1);
        expect(ins.y).toBeGreaterThan(0);
        expect(ins.y).toBeLessThan(1);
        if (ins.mount) expect([ins.mount, ins.kind]).toEqual(['strut', 'airspeed']);
      }
    }
  });

  it('the instruments said not to be fitted are not on the panel', () => {
    for (const [id, kinds] of Object.entries(NOT_FITTED)) {
      for (const k of kinds) expect(PANELS[id].instruments.some((i) => i.kind === k)).toBe(false);
    }
  });

  it('the period units: the Camel in mph and feet, the others in km/h and metres', () => {
    const diag = { speed: 50, altitude: 1000, rpm: 1100, power: 0 };
    expect(readings({ aircraft: AIRCRAFT.camel, diag }).airspeed.unit).toBe('mph');
    for (const id of ['spad13', 'dr1', 'albatros']) expect(readings({ aircraft: AIRCRAFT[id], diag }).airspeed.unit).toBe('kmh');
  });
});

describe('instrument readings', () => {
  const ac = AIRCRAFT.albatros;
  const diag = { speed: 45, altitude: 1500, rpm: ac.engine.ratedRpm * ac.propeller.gearRatio, power: ac.engine.ratedPower * 0.9 };

  it('the fuel gauge follows the tank', () => {
    const d = createDamage();
    expect(readings({ aircraft: ac, diag, damage: d }).fuelGauge.fraction).toBe(1);
    d.fuel = 0.4;
    expect(readings({ aircraft: ac, diag, damage: d }).fuelGauge.fraction).toBeCloseTo(0.4);
  });

  it('a holed tank loses its air pressure; an empty one shows none', () => {
    const d = createDamage();
    const whole = readings({ aircraft: ac, diag, damage: d }).airPressure.fraction;
    expect(whole).toBeCloseTo(INSTRUMENTS.airPressure);
    d.tank = 0.5;
    expect(readings({ aircraft: ac, diag, damage: d }).airPressure.fraction).toBeLessThan(whole);
    d.fuel = 0;
    expect(readings({ aircraft: ac, diag, damage: d }).airPressure.fraction).toBe(0);
  });

  it('oil pressure rises with engine speed, falls with engine damage and is gone when it seizes', () => {
    const d = createDamage();
    const full = readings({ aircraft: ac, diag, damage: d }).oilPressure.fraction;
    expect(full).toBeCloseTo(INSTRUMENTS.oilPressure);
    expect(readings({ aircraft: ac, diag: { ...diag, rpm: diag.rpm / 2 }, damage: d }).oilPressure.fraction).toBeCloseTo(full / 2);
    d.engine = 0.5;
    expect(readings({ aircraft: ac, diag, damage: d }).oilPressure.fraction).toBeLessThan(full);
    d.engine = 1;
    expect(readings({ aircraft: ac, diag, damage: d }).oilPressure.fraction).toBe(0);
    expect(readings({ aircraft: ac, diag, damage: d }).switches.on).toBe(false);
  });

  it('the rotary pulsator pulses while the engine runs and stops when it does not', () => {
    const camel = AIRCRAFT.camel;
    const d = createDamage();
    const at = (t, dd = d) => readings({ aircraft: camel, diag: { ...diag, rpm: 1100 }, damage: dd, time: t }).pulsator.level;
    const levels = [0, 0.1, 0.2, 0.3, 0.4, 0.5].map((t) => at(t));
    expect(Math.max(...levels) - Math.min(...levels)).toBeGreaterThan(0.3);
    d.engine = 1;
    expect(at(0.1)).toBe(at(0.3));
  });

  it('the SPAD water temperature: hotter at full power, cooler at speed, much hotter when damaged', () => {
    const spad = AIRCRAFT.spad13;
    const d = createDamage();
    const t = (dg, dd = d) => readings({ aircraft: spad, diag: dg, damage: dd }).waterTemp.celsius;
    const idle = { speed: 0, altitude: 0, rpm: 600, power: 0 };
    const climb = { speed: 30, altitude: 500, rpm: 1900, power: spad.engine.ratedPower };
    expect(t(idle)).toBeCloseTo(INSTRUMENTS.waterBase);
    expect(t(climb)).toBeGreaterThan(t(idle));
    expect(t({ ...climb, speed: spad.documented.maxSpeed })).toBeLessThan(t(climb));
    d.engine = 0.8;
    expect(t(climb)).toBeGreaterThan(t(climb, createDamage()) + 20);
  });

  it('the clock starts at the mission hour and keeps time', () => {
    expect(readings({ aircraft: ac, diag, time: 0 }).clock.hours).toBe(INSTRUMENTS.missionStartHour);
    expect(readings({ aircraft: ac, diag, time: 1800 }).clock.hours).toBeCloseTo(INSTRUMENTS.missionStartHour + 0.5);
  });

  it('before the first physics step every reading is still a number', () => {
    const r = readings({ aircraft: ac, diag: null });
    expect(r.airspeed.value).toBe(0);
    expect(Number.isFinite(r.waterTemp.celsius)).toBe(true);
    expect(r.oilPressure.fraction).toBe(0);
  });
});

describe('dial lettering', () => {
  // A stand-in for a canvas that records the words drawn and where.
  const recorder = () => {
    const words = [];
    const ctx = new Proxy({}, {
      get: (target, key) => (key === 'fillText' ? (text, x, y) => words.push({ text, x, y }) : key in target ? target[key] : () => {}),
      set: (target, key, value) => { target[key] = value; return true; },
    });
    return { ctx, words };
  };
  const draw = (id, kind, value) => {
    const { ctx, words } = recorder();
    drawInstrument(ctx, kind, 100, 100, 50, value, PANELS[id].style, AIRCRAFT[id], PANELS[id].labels);
    return words;
  };

  it('the SPAD: RPM, "Height x 1000 m", and KM/HR one line below half way up from the needle centre to the bezel', () => {
    expect(draw('spad13', 'tachometer', { value: 1000, full: 2400 }).map((w) => w.text)).toContain('RPM');
    expect(draw('spad13', 'altimeter', { shortHand: 0, longHand: 0, unit: 'm' }).map((w) => w.text)).toContain('Height x 1000 m');
    const air = draw('spad13', 'airspeed', { value: 100, unit: 'kmh' });
    const units = air.find((w) => w.text === 'KM/HR');
    expect(units.x).toBe(100);
    expect(units.y).toBeCloseTo(100 - 50 * 0.88 * 0.5 + 50 * 0.13 * 1.2, 6); // the face's edge is 0.88 of r; a line is 1.2 x the 0.13 r font
    expect(units.y).toBeLessThan(100); // still in the upper half
    expect(air.find((w) => w.text === 'VITESSE').y).toBeGreaterThan(100); // the word stays below the centre
  });

  it('the other aircraft keep their own lettering', () => {
    expect(draw('camel', 'tachometer', { value: 1000, full: 1600 }).map((w) => w.text)).toContain('R.P.M.');
    expect(draw('albatros', 'airspeed', { value: 100, unit: 'kmh' }).find((w) => w.text === 'km/h').y).toBeGreaterThan(100);
  });
});

describe('the SPAD altimeter (after the French Hatot, S51)', () => {
  it('goes round once for 5,000 m, anticlockwise, and stops just short of a full turn', () => {
    expect(oneTurnAltimeterAngle(0, 5000)).toBeCloseTo(0, 9);
    expect(oneTurnAltimeterAngle(1250, 5000)).toBeCloseTo(-Math.PI / 2, 9); // a quarter turn to the left
    expect(oneTurnAltimeterAngle(2500, 5000)).toBeCloseTo(-Math.PI, 9);
    expect(oneTurnAltimeterAngle(6500, 5000)).toBeGreaterThan(-2 * Math.PI); // pinned at its stop
    expect(oneTurnAltimeterAngle(-50, 5000)).toBe(-0);
    const spad = PANELS.spad13.instruments.find((i) => i.kind === 'altimeter');
    expect(spad).toMatchObject({ face: 'hatot', range: 5000 });
  });

  it("its barometer scale is placed by the standard atmosphere (76 cm of mercury at sea level)", () => {
    expect(altitudeForPressure(101325)).toBeCloseTo(0, 6);
    for (const h of [500, 2000, 5000]) expect(altitudeForPressure(atmosphere(h).pressure)).toBeCloseTo(h, 3);
  });

  it('draws the Hatot dial: figures 0 to 4, the maker\'s words and the centre line', () => {
    const words = [];
    const ctx = new Proxy({}, {
      get: (t, k) => (k === 'fillText' ? (text) => words.push(text) : k === 'measureText' ? () => ({ width: 5 }) : k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}),
      set: (t, k, v) => { t[k] = v; return true; },
    });
    const inst = PANELS.spad13.instruments.find((i) => i.kind === 'altimeter');
    drawInstrument(ctx, 'altimeter', 100, 100, 50, { value: 1200, unit: 'm' }, 'french', AIRCRAFT.spad13, { ...PANELS.spad13.labels, face: inst.face, range: inst.range });
    for (const w of ['0', '1', '2', '3', '4', 'HATOT', 'COMPENSÉ', 'Height x 1000 m']) expect(words).toContain(w);
    expect(words.join('')).toContain('AVIATION MILITAIRE'); // drawn a letter at a time round the arc
  });
});

describe('the Dr.I panel (the product owner\'s order, old-style German instruments)', () => {
  const inst = PANELS.dr1.instruments.filter((i) => !i.mount);
  const by = (kind) => inst.find((i) => i.kind === kind);

  it('from left to right: fuel gauge, altimeter, airspeed, rev counter; compass centred above and slip indicator centred below the middle pair', () => {
    const row = inst.filter((i) => i.kind !== 'slip' && i.kind !== 'compass').sort((a, b) => a.x - b.x).map((i) => i.kind);
    expect(row).toEqual(['fuelGauge', 'altimeter', 'airspeed', 'tachometer']);
    const middle = (by('altimeter').x + by('airspeed').x) / 2;
    for (const k of ['slip', 'compass']) expect(by(k).x).toBeCloseTo(middle, 6);
    expect(by('compass').y).toBeLessThan(by('altimeter').y); // above (y runs down the panel)
    expect(by('slip').y).toBeGreaterThan(by('altimeter').y); // below
    expect(by('altimeter').y).toBeCloseTo(by('airspeed').y, 6);
  });

  it('the altimeter and airspeed are large, the fuel gauge and rev counter small, and nothing overlaps', () => {
    for (const big of ['altimeter', 'airspeed']) for (const small of ['fuelGauge', 'tachometer']) expect(by(big).r).toBeGreaterThan(by(small).r);
    const [pw, ph] = PANELS.dr1.size;
    const round = inst.filter((i) => i.kind !== 'slip' && i.kind !== 'compass');
    for (let a = 0; a < round.length; a++) {
      for (let b = a + 1; b < round.length; b++) {
        const d = Math.hypot((round[a].x - round[b].x) * pw, (round[a].y - round[b].y) * ph);
        expect(d, `${round[a].kind} and ${round[b].kind}`).toBeGreaterThan((round[a].r + round[b].r) * ph * 1.12);
      }
    }
    // The oblong slip and compass cases stay clear of the two big bezels.
    const clear = (kind, halfW, halfH) => {
      const b = by(kind);
      for (const big of ['altimeter', 'airspeed']) {
        const d = by(big);
        const dz = Math.max(0, Math.abs((b.x - d.x) * pw) - halfW * b.r * ph);
        const dy = Math.max(0, Math.abs((b.y - d.y) * ph) - halfH * b.r * ph);
        expect(Math.hypot(dz, dy), `${kind} and ${big}`).toBeGreaterThan(d.r * ph * 1.12);
      }
    };
    clear('slip', 1.7, 0.65);
    clear('compass', 1.3, 0.75);
  });

  it('has the six instruments asked for, and none marked as not fitted', () => {
    expect(PANELS.dr1.instruments.map((i) => i.kind).sort()).toEqual(['airspeed', 'altimeter', 'compass', 'fuelGauge', 'slip', 'tachometer']);
    expect(NOT_FITTED.dr1).toBeUndefined();
  });

  it('the slip ball sits in the middle in balanced flight and rolls to the side the aircraft slips to', () => {
    const r = (beta) => readings({ aircraft: AIRCRAFT.dr1, diag: { speed: 40, altitude: 500, rpm: 1100, beta } }).slip.ball;
    expect(r(0)).toBe(0);
    expect(r(0.05)).toBeGreaterThan(0);
    expect(r(-0.05)).toBeLessThan(0);
  });

  it('the slip indicator draws its ball where the reading puts it', () => {
    const arcs = [];
    const ctx = new Proxy({}, {
      get: (t, k) => (k === 'arc' ? (x, y, rad) => arcs.push({ x, rad }) : k in t ? t[k] : () => {}),
      set: (t, k, v) => { t[k] = v; return true; },
    });
    const ballX = (ball) => {
      arcs.length = 0;
      drawInstrument(ctx, 'slip', 100, 50, 20, { ball }, 'german', AIRCRAFT.dr1, {});
      return arcs[arcs.length - 1].x;
    };
    expect(ballX(0)).toBeCloseTo(100, 6);
    expect(ballX(1)).toBeGreaterThan(115);
    expect(ballX(-1)).toBeLessThan(85);
  });
});

describe('the Dr.I altimeter (figures 0, 0.5 ... 4.5 thousand metres)', () => {
  it('the short hand goes round once per 5,000 m and the long hand once per 500 m', () => {
    expect(twoHandAltimeter(2500, 5000).shortHand).toBeCloseTo(Math.PI, 9);
    expect(twoHandAltimeter(250, 5000).longHand).toBeCloseTo(Math.PI, 9);
    expect(twoHandAltimeter(1000, 5000).shortHand).toBeCloseTo((2 * Math.PI) / 5, 9); // 1 km: at the figure "1"
    expect(PANELS.dr1.instruments.find((i) => i.kind === 'altimeter').turn).toBe(5000);
  });

  it('its figures read 0, 0.5, 1 ... 4.5', () => {
    const words = [];
    const ctx = new Proxy({}, {
      get: (t, k) => (k === 'fillText' ? (text) => words.push(text) : k in t ? t[k] : () => {}),
      set: (t, k, v) => { t[k] = v; return true; },
    });
    const inst = PANELS.dr1.instruments.find((i) => i.kind === 'altimeter');
    drawInstrument(ctx, 'altimeter', 100, 100, 50, { value: 1000, unit: 'm' }, 'german', AIRCRAFT.dr1, { turn: inst.turn });
    expect(words.slice(0, 10)).toEqual(['0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5']);
  });

  it('the slip indicator\'s tube is lowest in the middle, so the ball rests there', () => {
    const ys = [];
    const ctx = new Proxy({}, {
      get: (t, k) => (k === 'lineTo' || k === 'moveTo' ? (x, y) => ys.push({ x, y }) : k in t ? t[k] : () => {}),
      set: (t, k, v) => { t[k] = v; return true; },
    });
    drawInstrument(ctx, 'slip', 100, 50, 20, { ball: 0 }, 'german', AIRCRAFT.dr1, {});
    const tube = ys.slice(0, 21); // the tube's centre line, left to right
    expect(tube[10].y).toBeGreaterThan(tube[0].y); // canvas y runs down: the middle is lower
    expect(tube[10].y).toBeGreaterThan(tube[20].y);
  });
});

describe('two-hand altimeter dials', () => {
  it('space their ten figures evenly round the whole dial, so each hand points at the right figure', () => {
    const marks = [];
    const ctx = new Proxy({}, {
      get: (t, k) => (k === 'fillText' ? (text, x, y) => marks.push({ text, x, y }) : k in t ? t[k] : () => {}),
      set: (t, k, v) => { t[k] = v; return true; },
    });
    drawInstrument(ctx, 'altimeter', 100, 100, 50, { value: 0, unit: 'm', shortHand: 0, longHand: 0 }, 'german', AIRCRAFT.albatros, {});
    const figures = marks.slice(0, 10);
    expect(figures.map((m) => m.text)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    expect(marks.some((m) => m.text === '10')).toBe(false);
    for (let i = 0; i < 10; i++) {
      const angle = Math.atan2(figures[i].x - 100, 100 - figures[i].y); // clockwise from the top
      expect(((angle + 2 * Math.PI) % (2 * Math.PI))).toBeCloseTo((i / 10) * 2 * Math.PI, 6);
    }
  });
});

