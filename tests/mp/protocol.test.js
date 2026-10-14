import { describe, it, expect } from 'vitest';
import { makeCode, tidyCode, isCode } from '../../src/mp/roomCode.js';
import { parseClientMessage, CLIENT_TYPES, errorMessage, ERRORS } from '../../src/mp/protocol.js';
import { CODE_ALPHABET, CODE_LENGTH, MAX_MESSAGE_BYTES, cleanSettings, DEFAULT_SETTINGS, SETTING_CHOICES } from '../../src/mp/netConfig.js';

describe('room codes', () => {
  it('are six characters from the alphabet without look-alikes', () => {
    for (const c of 'IO01') expect(CODE_ALPHABET).not.toContain(c);
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 200; i++) {
      const code = makeCode(rng);
      expect(code).toHaveLength(CODE_LENGTH);
      expect(isCode(code)).toBe(true);
    }
    expect(makeCode(() => 0.999999)).toBe('999999');
  });

  it('are tidied as typed and checked', () => {
    expect(tidyCode('k7q-pm2')).toBe('K7QPM2');
    expect(tidyCode(' k7q pm2 ')).toBe('K7QPM2');
    expect(isCode('K7QPM2')).toBe(true);
    expect(isCode('K7QPM')).toBe(false); // too short
    expect(isCode('K7QPM0')).toBe(false); // 0 is not used
    expect(isCode('k7qpm2')).toBe(false); // must be tidied first
    expect(isCode(null)).toBe(false);
  });
});

describe('messages from a browser', () => {
  const ok = (m) => parseClientMessage(JSON.stringify(m));

  it('accepts each well-formed message', () => {
    expect(ok({ type: 'hello', v: 1, name: 'Max', token: 'abcdefgh12' }).msg).toEqual({ type: 'hello', v: 1, name: 'Max', token: 'abcdefgh12', team: null });
    expect(ok({ type: 'hello', v: 1, name: 'Max', token: 'abcdefgh12', team: 'central' }).msg.team).toBe('central');
    expect(ok({ type: 'setTeam', team: 'allied' }).msg).toEqual({ type: 'setTeam', team: 'allied' });
    expect(ok({ type: 'setAircraft', aircraft: 'spad13' }).msg.aircraft).toBe('spad13');
    expect(ok({ type: 'setReady', ready: true }).msg.ready).toBe(true);
    expect(ok({ type: 'setSettings', settings: { scoreLimit: 10 } }).msg.settings).toEqual({ scoreLimit: 10 });
    expect(ok({ type: 'ping', t: 12.5 }).msg.t).toBe(12.5);
    for (const type of ['start', 'toLobby', 'leave']) expect(ok({ type }).msg).toEqual({ type });
    expect(CLIENT_TYPES).toHaveLength(9);
  });

  it('keeps only the known fields', () => {
    expect(ok({ type: 'setReady', ready: false, extra: 'x' }).msg).toEqual({ type: 'setReady', ready: false });
  });

  it('refuses anything malformed', () => {
    const bad = [
      { type: 'hello', v: '1', name: 'Max', token: 'abcdefgh12' }, // version not a number
      { type: 'hello', v: 1, name: 'Max', token: 'short' }, // token too short
      { type: 'hello', v: 1, name: 'Max', token: 'has spaces in it' },
      { type: 'hello', v: 1, name: 'x'.repeat(65), token: 'abcdefgh12' },
      { type: 'hello', v: 1, name: 'Max', token: 'abcdefgh12', team: 'french' },
      { type: 'setTeam', team: 'british' },
      { type: 'setReady', ready: 'yes' },
      { type: 'setSettings', settings: [1, 2] },
      { type: 'ping', t: 'now' },
      { type: 'fly' }, // unknown
      { type: 'toString' }, // not one of ours, even if every object has it
      [1, 2, 3],
    ];
    for (const m of bad) expect(ok(m).error, JSON.stringify(m)).toBeTruthy();
    expect(parseClientMessage('{not json').error).toBe('not JSON');
    expect(parseClientMessage(null).error).toBe('not text');
    expect(parseClientMessage(JSON.stringify({ type: 'ping', t: 1, pad: 'x'.repeat(MAX_MESSAGE_BYTES) })).error).toBe('too long');
  });

  it('errors come with words a player understands', () => {
    expect(errorMessage('full')).toEqual({ type: 'error', code: 'full', text: ERRORS.full });
    expect(errorMessage('badName', 'Enter a name').text).toBe('Enter a name');
  });
});

describe('match settings', () => {
  it('keep only allowed values and fall back to the current ones', () => {
    expect(cleanSettings(null)).toEqual(DEFAULT_SETTINGS);
    const s = cleanSettings({ scoreLimit: 10, timeLimit: 7, friendlyFire: 'yes', start: 'airfield', timeOfDay: 'night', other: 1 });
    expect(s).toEqual({ ...DEFAULT_SETTINGS, scoreLimit: 10, start: 'airfield' });
    expect(cleanSettings({ friendlyFire: true }, s)).toEqual({ ...s, friendlyFire: true });
    for (const [key, choices] of Object.entries(SETTING_CHOICES)) expect(choices).toContain(DEFAULT_SETTINGS[key]);
  });

  it('defaults follow the agreed decisions: friendly fire off, structural damage on', () => {
    expect(DEFAULT_SETTINGS.friendlyFire).toBe(false);
    expect(DEFAULT_SETTINGS.structuralDamage).toBe(true);
  });
});
