// The frequent flight messages, packed as bytes (JSON would be three times larger):
//   inputs    browser -> server, 30 a second: a few ticks of the player's controls
//   snapshot  server -> browser, 30 a second: your own aircraft in full, the others compactly
// Also the "full state" of a Simulation as a list of numbers, used both to send your own
// aircraft exactly and to keep the browser's history for replaying corrections.

import { createDamage } from '../physics/damage.js';

export const MSG_INPUTS = 1;
export const MSG_SNAPSHOT = 2;
const MAX_INPUTS = 16;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 0));
const S16 = 32767;
const U16 = 65535;

// ---- controls ----------------------------------------------------------------------------

// Controls rounded to the steps they are sent in. The browser flies its own prediction with
// exactly these values, so its aircraft and the server's get identical inputs. Rounding an
// already rounded input changes nothing.
export function quantiseInput(i) {
  return {
    pull: Math.round(clamp(i.pull, -1, 1) * S16) / S16,
    roll: Math.round(clamp(i.roll, -1, 1) * S16) / S16,
    yaw: Math.round(clamp(i.yaw, -1, 1) * S16) / S16,
    throttle: Math.round(clamp(i.throttle, 0, 1) * U16) / U16,
    trim: Math.round(clamp(i.trim, -1, 1) * S16) / S16,
    fire: Boolean(i.fire),
    clearJam: Boolean(i.clearJam),
  };
}

// inputs: one per tick from firstTick on. viewTick: the tick of the other aircraft on screen.
const INPUT_BYTES = 11;
export function encodeInputs(firstTick, viewTick, inputs) {
  const buf = new ArrayBuffer(10 + inputs.length * INPUT_BYTES);
  const d = new DataView(buf);
  d.setUint8(0, MSG_INPUTS);
  d.setUint32(1, firstTick);
  d.setUint8(5, inputs.length);
  d.setUint32(6, Math.max(0, viewTick));
  inputs.forEach((i, k) => {
    const o = 10 + k * INPUT_BYTES;
    d.setInt16(o, Math.round(clamp(i.pull, -1, 1) * S16));
    d.setInt16(o + 2, Math.round(clamp(i.roll, -1, 1) * S16));
    d.setInt16(o + 4, Math.round(clamp(i.yaw, -1, 1) * S16));
    d.setUint16(o + 6, Math.round(clamp(i.throttle, 0, 1) * U16));
    d.setInt16(o + 8, Math.round(clamp(i.trim, -1, 1) * S16));
    d.setUint8(o + 10, (i.fire ? 1 : 0) | (i.clearJam ? 2 : 0));
  });
  return buf;
}

// { firstTick, viewTick, inputs } or null if the bytes are not a well-formed inputs message.
export function decodeInputs(buf) {
  if (!(buf instanceof ArrayBuffer) || buf.byteLength < 10) return null;
  const d = new DataView(buf);
  const n = d.getUint8(5);
  if (d.getUint8(0) !== MSG_INPUTS || n < 1 || n > MAX_INPUTS || buf.byteLength !== 10 + n * INPUT_BYTES) return null;
  const inputs = [];
  for (let k = 0; k < n; k++) {
    const o = 10 + k * INPUT_BYTES;
    const b = d.getUint8(o + 10);
    inputs.push({
      pull: clamp(d.getInt16(o) / S16, -1, 1),
      roll: clamp(d.getInt16(o + 2) / S16, -1, 1),
      yaw: clamp(d.getInt16(o + 4) / S16, -1, 1),
      throttle: d.getUint16(o + 6) / U16,
      trim: clamp(d.getInt16(o + 8) / S16, -1, 1),
      fire: Boolean(b & 1),
      clearJam: Boolean(b & 2),
    });
  }
  return { firstTick: d.getUint32(1), viewTick: d.getUint32(6), inputs };
}

// ---- a Simulation's full state as numbers --------------------------------------------------

// Everything the next physics step depends on, in a fixed order.
export const FULL_LENGTH = 35;
const CABLES = ['aileron', 'elevator', 'rudder'];

export function captureState(sim, out = new Float64Array(FULL_LENGTH)) {
  const s = sim.state;
  const u = sim.surfaces;
  const d = sim.damage;
  out.set([
    s.position.x, s.position.y, s.position.z, s.velocity.x, s.velocity.y, s.velocity.z,
    s.quaternion.x, s.quaternion.y, s.quaternion.z, s.quaternion.w,
    s.angularVelocity.x, s.angularVelocity.y, s.angularVelocity.z,
    u.pull, u.roll, u.yaw, u.throttle, u.trim,
    d.wing.L, d.wing.R, d.engine, d.tank, d.pilot, d.tailplane, d.fin, d.fuel, d.overload,
    ...CABLES.map((c) => (d.cables[c] === null ? NaN : d.cables[c])),
    d.failed.L ? 1 : 0, d.failed.R ? 1 : 0, d.failed.tailplane ? 1 : 0,
    sim.crashed ? 1 : 0, s.chocked ? 1 : 0,
  ]);
  return out;
}

// Put a captured state back into a Simulation (its previous pose too, so nothing is drawn
// halfway to where it was).
export function restoreState(sim, a, crashReason = 'Crashed') {
  const s = sim.state;
  s.position.set(a[0], a[1], a[2]);
  s.velocity.set(a[3], a[4], a[5]);
  s.quaternion.set(a[6], a[7], a[8], a[9]);
  s.angularVelocity.set(a[10], a[11], a[12]);
  Object.assign(sim.surfaces, { pull: a[13], roll: a[14], yaw: a[15], throttle: a[16], trim: a[17] });
  const d = sim.damage;
  Object.assign(d, { engine: a[20], tank: a[21], pilot: a[22], tailplane: a[23], fin: a[24], fuel: a[25], overload: a[26] });
  d.wing.L = a[18];
  d.wing.R = a[19];
  CABLES.forEach((c, k) => { d.cables[c] = Number.isNaN(a[27 + k]) ? null : a[27 + k]; });
  Object.assign(d.failed, { L: a[30] === 1, R: a[31] === 1, tailplane: a[32] === 1 });
  const crashed = a[33] === 1;
  if (crashed && !sim.crashed) sim.crashReason = crashReason;
  sim.crashed = crashed;
  if (!crashed) sim.crashReason = null;
  s.chocked = a[34] === 1;
  sim.previous.position.copy(s.position);
  sim.previous.quaternion.copy(s.quaternion);
}

// ---- snapshots ------------------------------------------------------------------------------

// One snapshot for one player: { tick, lead (ticks their controls arrived early), you
// ({ slot, spawn, state, guns: [{ rounds, state }] }: their own aircraft in full, or null),
// others: [compact] }. A gun's state: 'ready', 'jammed', 'clearing' or 'empty'.
// A compact aircraft: { slot, spawn, crashed, down, position, quaternion, velocity, rates,
// surfaces: { pull, roll, yaw, throttle }, rpm, damage: { wingL, wingR, engine, tank, tailplane,
// fin, failedL, failedR, failedTail }, shots (rounds fired since the last snapshot) }.
const HEAD = 11;
const GUN_STATES = ['ready', 'jammed', 'clearing', 'empty'];
const GUNS_BYTES = 6;
const FULL_BYTES = 3 + FULL_LENGTH * 8 + GUNS_BYTES;
const COMPACT_BYTES = 50;

// A GunBank's two guns as the snapshot carries them.
export const gunsOf = (bank) => bank.guns.map((g) => ({ rounds: g.rounds, state: g.state }));

export function compactOf(slot, spawn, sim, down = false, shots = 0) {
  const s = sim.state;
  const d = sim.damage;
  return {
    slot, spawn, crashed: sim.crashed, down, shots,
    position: [s.position.x, s.position.y, s.position.z],
    quaternion: [s.quaternion.x, s.quaternion.y, s.quaternion.z, s.quaternion.w],
    velocity: [s.velocity.x, s.velocity.y, s.velocity.z],
    rates: [s.angularVelocity.x, s.angularVelocity.y, s.angularVelocity.z],
    surfaces: { pull: sim.surfaces.pull, roll: sim.surfaces.roll, yaw: sim.surfaces.yaw, throttle: sim.surfaces.throttle },
    rpm: sim.diag ? sim.diag.rpm : 0,
    damage: { wingL: d.wing.L, wingR: d.wing.R, engine: d.engine, tank: d.tank, tailplane: d.tailplane, fin: d.fin, failedL: d.failed.L, failedR: d.failed.R, failedTail: d.failed.tailplane },
  };
}

export function encodeSnapshot({ tick, lead, you, others }) {
  const buf = new ArrayBuffer(HEAD + (you ? FULL_BYTES : 0) + others.length * COMPACT_BYTES);
  const d = new DataView(buf);
  d.setUint8(0, MSG_SNAPSHOT);
  d.setUint32(1, tick);
  d.setInt16(5, clamp(Math.round(lead), -32768, 32767));
  d.setUint16(7, you ? you.slot : 0);
  d.setUint8(9, others.length);
  d.setUint8(10, 0);
  let o = HEAD;
  if (you) {
    d.setUint16(o, you.slot);
    d.setUint8(o + 2, you.spawn & 255);
    for (let k = 0; k < FULL_LENGTH; k++) d.setFloat64(o + 3 + k * 8, you.state[k]);
    const g = o + 3 + FULL_LENGTH * 8;
    (you.guns ?? []).slice(0, 2).forEach((gun, k) => {
      d.setUint16(g + k * 3, clamp(gun.rounds, 0, U16));
      d.setUint8(g + k * 3 + 2, Math.max(0, GUN_STATES.indexOf(gun.state)));
    });
    o += FULL_BYTES;
  }
  for (const c of others) {
    d.setUint16(o, c.slot);
    d.setUint8(o + 2, c.spawn & 255);
    d.setUint8(o + 3, (c.crashed ? 1 : 0) | (c.down ? 2 : 0));
    c.position.forEach((v, k) => d.setFloat32(o + 4 + k * 4, v));
    c.quaternion.forEach((v, k) => d.setInt16(o + 16 + k * 2, Math.round(clamp(v, -1, 1) * S16)));
    c.velocity.forEach((v, k) => d.setInt16(o + 24 + k * 2, Math.round(clamp(v * 100, -32768, 32767))));
    c.rates.forEach((v, k) => d.setInt16(o + 30 + k * 2, Math.round(clamp(v * 1000, -32768, 32767))));
    ['pull', 'roll', 'yaw'].forEach((key, k) => d.setInt8(o + 36 + k, Math.round(clamp(c.surfaces[key], -1, 1) * 127)));
    d.setUint8(o + 39, Math.round(clamp(c.surfaces.throttle, 0, 1) * 255));
    d.setUint16(o + 40, Math.round(clamp(c.rpm, 0, U16)));
    const g = c.damage;
    ['wingL', 'wingR', 'engine', 'tank', 'tailplane', 'fin'].forEach((key, k) => d.setUint8(o + 42 + k, Math.round(clamp(g[key], 0, 1) * 255)));
    d.setUint8(o + 48, (g.failedL ? 1 : 0) | (g.failedR ? 2 : 0) | (g.failedTail ? 4 : 0));
    d.setUint8(o + 49, clamp(c.shots ?? 0, 0, 255));
    o += COMPACT_BYTES;
  }
  return buf;
}

export function decodeSnapshot(buf) {
  if (!(buf instanceof ArrayBuffer) || buf.byteLength < HEAD) return null;
  const d = new DataView(buf);
  if (d.getUint8(0) !== MSG_SNAPSHOT) return null;
  const yourSlot = d.getUint16(7);
  const n = d.getUint8(9);
  if (buf.byteLength !== HEAD + (yourSlot ? FULL_BYTES : 0) + n * COMPACT_BYTES) return null;
  const out = { tick: d.getUint32(1), lead: d.getInt16(5), you: null, others: [] };
  let o = HEAD;
  if (yourSlot) {
    const state = new Float64Array(FULL_LENGTH);
    for (let k = 0; k < FULL_LENGTH; k++) state[k] = d.getFloat64(o + 3 + k * 8);
    const g = o + 3 + FULL_LENGTH * 8;
    const guns = [0, 1].map((k) => ({ rounds: d.getUint16(g + k * 3), state: GUN_STATES[d.getUint8(g + k * 3 + 2)] ?? 'ready' }));
    out.you = { slot: d.getUint16(o), spawn: d.getUint8(o + 2), state, guns };
    o += FULL_BYTES;
  }
  for (let i = 0; i < n; i++) {
    const flags = d.getUint8(o + 3);
    const q = [0, 1, 2, 3].map((k) => d.getInt16(o + 16 + k * 2) / S16);
    const len = Math.hypot(...q) || 1;
    const fl = d.getUint8(o + 48);
    out.others.push({
      slot: d.getUint16(o), spawn: d.getUint8(o + 2), crashed: Boolean(flags & 1), down: Boolean(flags & 2),
      position: [0, 1, 2].map((k) => d.getFloat32(o + 4 + k * 4)),
      quaternion: q.map((v) => v / len),
      velocity: [0, 1, 2].map((k) => d.getInt16(o + 24 + k * 2) / 100),
      rates: [0, 1, 2].map((k) => d.getInt16(o + 30 + k * 2) / 1000),
      surfaces: { pull: d.getInt8(o + 36) / 127, roll: d.getInt8(o + 37) / 127, yaw: d.getInt8(o + 38) / 127, throttle: d.getUint8(o + 39) / 255, trim: 0 },
      rpm: d.getUint16(o + 40),
      damage: {
        wingL: d.getUint8(o + 42) / 255, wingR: d.getUint8(o + 43) / 255, engine: d.getUint8(o + 44) / 255, tank: d.getUint8(o + 45) / 255,
        tailplane: d.getUint8(o + 46) / 255, fin: d.getUint8(o + 47) / 255, failedL: Boolean(fl & 1), failedR: Boolean(fl & 2), failedTail: Boolean(fl & 4),
      },
      shots: d.getUint8(o + 49),
    });
    o += COMPACT_BYTES;
  }
  return out;
}

// A full damage record (as the drawing code expects) from a compact summary.
export function damageFromSummary(g, out = createDamage()) {
  out.wing.L = g.wingL;
  out.wing.R = g.wingR;
  Object.assign(out, { engine: g.engine, tank: g.tank, tailplane: g.tailplane, fin: g.fin });
  Object.assign(out.failed, { L: g.failedL, R: g.failedR, tailplane: g.failedTail });
  return out;
}

// What kind of message these bytes are (MSG_INPUTS, MSG_SNAPSHOT), or 0.
export const messageKind = (buf) => (buf instanceof ArrayBuffer && buf.byteLength > 0 ? new DataView(buf).getUint8(0) : 0);
