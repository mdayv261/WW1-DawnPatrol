import { describe, it, expect } from 'vitest';
import { RoomCore, aircraftOfTeam, loadoutAllowed } from '../../src/mp/roomCore.js';
import { PROTOCOL_VERSION, DEFAULT_SETTINGS, cleanSettings } from '../../src/mp/netConfig.js';
import { parseClientMessage } from '../../src/mp/protocol.js';
import { encodeInputs, decodeInputs, encodeSnapshot, decodeSnapshot, captureState, restoreState, gunsOf } from '../../src/mp/binary.js';
import { Simulation } from '../../src/core/simulation.js';
import { AIRCRAFT } from '../../src/aircraft/index.js';
import { GunBank } from '../../src/weapons/guns.js';
import { withLoadout } from '../../src/weapons/mounts.js';

// Phase E5: the host chooses the era (and mixed eras) in the lobby; players choose that era's
// aircraft and loadouts; the drum change, the gun count and the lower wing travel to and from
// the room server (protocol version 4).

const hello = (name) => ({ type: 'hello', v: PROTOCOL_VERSION, name, token: `token-${name}-xyz` });
const T0 = 1_000_000;
const ids = (list) => list.map((a) => a.id);
const sent = (room, type) => room.outbox.filter((o) => o.msg.type === type);

function room(...names) {
  const r = new RoomCore('K7QPM2');
  const pids = names.map((n) => r.join(hello(n), T0).id);
  r.outbox.length = 0;
  return { r, pids };
}

describe('the era in the lobby', () => {
  it('is protocol version 4, with Late War and mixed eras off by default', () => {
    expect(PROTOCOL_VERSION).toBe(4);
    expect(DEFAULT_SETTINGS.era).toBe('late');
    expect(DEFAULT_SETTINGS.mixedEras).toBe(false);
    expect(cleanSettings({ era: 'early', mixedEras: true })).toMatchObject({ era: 'early', mixedEras: true });
    expect(cleanSettings({ era: 'modern', mixedEras: 'yes' })).toMatchObject({ era: 'late', mixedEras: false });
  });

  it('offers each team only the chosen era\'s aircraft, or both eras\' with mixed eras on', () => {
    expect(ids(aircraftOfTeam('allied'))).toEqual(['camel', 'spad13']);
    expect(ids(aircraftOfTeam('allied', { era: 'early', mixedEras: false }))).toEqual(['n11']);
    expect(ids(aircraftOfTeam('central', { era: 'early', mixedEras: false }))).toEqual(['e4']);
    expect(ids(aircraftOfTeam('allied', { era: 'early', mixedEras: true }))).toEqual(['camel', 'spad13', 'n11']);
  });

  it('when the host changes the era, players on aircraft no longer offered are moved and un-readied', () => {
    const { r, pids: [host, b] } = room('Max', 'Jean');
    r.handle(b, { type: 'setReady', ready: true }, T0);
    r.handle(host, { type: 'setSettings', settings: { era: 'early' } }, T0);
    for (const id of [host, b]) {
      const p = r.players.get(id);
      expect(['n11', 'e4']).toContain(p.aircraft);
      expect(p.ready).toBe(false);
    }
    expect(sent(r, 'notice').some((m) => /changed the era/.test(m.msg.text))).toBe(true);
  });

  it('refuses an aircraft of the other era, and will not start with one', () => {
    const { r, pids: [host, b] } = room('Max', 'Jean');
    r.handle(host, { type: 'setSettings', settings: { era: 'early' } }, T0);
    const before = r.players.get(host).aircraft;
    r.handle(host, { type: 'setAircraft', aircraft: 'camel' }, T0);
    expect(r.players.get(host).aircraft).toBe(before);
    // Mixed eras on, a Late War aircraft chosen, then mixed eras off: it is moved back to Early War.
    r.handle(host, { type: 'setSettings', settings: { mixedEras: true } }, T0);
    const team = r.players.get(host).team;
    const late = team === 'allied' ? 'camel' : 'dr1';
    r.handle(host, { type: 'setAircraft', aircraft: late }, T0);
    expect(r.players.get(host).aircraft).toBe(late);
    r.handle(host, { type: 'setSettings', settings: { mixedEras: false } }, T0);
    expect(r.players.get(host).aircraft).not.toBe(late);
    expect(r.canStart().ok).toBe(false); // no one is ready yet; and every aircraft is now allowed
    for (const id of [host, b]) r.handle(id, { type: 'setReady', ready: true }, T0);
    expect(r.canStart().ok).toBe(true);
  });

  it('a loadout is accepted only for the aircraft that has it, and travels in the player list', () => {
    expect(loadoutAllowed('e4', 'immelmann')).toBe(true);
    expect(loadoutAllowed('n11', 'immelmann')).toBe(false);
    expect(loadoutAllowed('camel', 'standard')).toBe(true);
    const { r, pids: [host, b] } = room('Max', 'Jean');
    r.handle(host, { type: 'setSettings', settings: { era: 'early' } }, T0);
    const german = [host, b].find((id) => r.players.get(id).team === 'central');
    const allied = [host, b].find((id) => r.players.get(id).team === 'allied');
    r.handle(german, { type: 'setAircraft', aircraft: 'e4', loadout: 'immelmann' }, T0);
    expect(r.players.get(german).loadout).toBe('immelmann');
    r.handle(allied, { type: 'setAircraft', aircraft: 'n11', loadout: 'immelmann' }, T0);
    expect(r.players.get(allied).loadout).toBe('standard');
    expect(r.playerList().find((p) => p.id === german).loadout).toBe('immelmann');
  });

  it('the setAircraft message takes an optional loadout', () => {
    const ok = (m) => parseClientMessage(JSON.stringify(m)).msg ?? null;
    expect(ok({ type: 'setAircraft', aircraft: 'e4' })).toEqual({ type: 'setAircraft', aircraft: 'e4', loadout: 'standard' });
    expect(ok({ type: 'setAircraft', aircraft: 'e4', loadout: 'immelmann' }).loadout).toBe('immelmann');
    expect(ok({ type: 'setAircraft', aircraft: 'e4', loadout: 42 })).toBe(null);
  });
});

describe('protocol 4 messages', () => {
  it('the controls carry the drum change', () => {
    const base = { pull: 0, roll: 0, yaw: 0, throttle: 1, trim: 0, fire: false, clearJam: false };
    const back = decodeInputs(encodeInputs(10, 9, [{ ...base, changeDrum: true }, base]));
    expect(back.inputs.map((i) => i.changeDrum)).toEqual([true, false]);
  });

  it('your own aircraft carries one, two or three guns with their drum states and spares', () => {
    const sim = new Simulation();
    sim.start(AIRCRAFT.n11);
    for (const ac of [AIRCRAFT.n11, AIRCRAFT.camel, withLoadout(AIRCRAFT.e4, 'immelmann')]) {
      const bank = new GunBank(ac, () => 1);
      if (bank.drumFed) bank.changeDrum();
      const guns = gunsOf(bank);
      const snap = decodeSnapshot(encodeSnapshot({ tick: 5, lead: 0, you: { slot: 1, spawn: 1, state: captureState(sim), guns }, others: [] }));
      expect(snap.you.guns).toEqual(guns);
    }
    const drum = gunsOf(new GunBank(AIRCRAFT.n11, () => 1))[0];
    expect(drum).toEqual({ rounds: 97, state: 'ready', spares: 3 });
  });

  it('the full state carries the Nieuport\'s lower wing, so the prediction matches the server', () => {
    const a = new Simulation();
    a.start(AIRCRAFT.n11);
    a.damage.lower.R = 0.4;
    a.damage.lower.L = 1;
    a.damage.lowerFailed.L = true;
    const b = new Simulation();
    b.start(AIRCRAFT.n11);
    restoreState(b, captureState(a));
    expect(b.damage.lower).toEqual({ L: 1, R: 0.4 });
    expect(b.damage.lowerFailed).toEqual({ L: true, R: false });
  });
});
