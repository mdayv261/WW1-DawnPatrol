// The numbers behind the sound: pitch, loudness, brightness, delay, Doppler shift and left/right
// placement. Pure maths (tested); the Web Audio graph in audioEngine.js uses them each frame.

import { ENGINE_SOUND, WIND_SOUND, DISTANCE_SOUND as D, MIX, WARNING_SOUND } from '../aircraft/sounds.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// A four-stroke cylinder fires once every two turns of the crankshaft, so the engine's firing
// frequency (Hz) is rpm / 60 x cylinders / 2. (A rotary's cylinders turn with the crankshaft,
// but each still fires once every two turns.)
export function firingFrequency(cylinders, rpm) {
  return (Math.max(0, rpm) / 60) * (cylinders / 2);
}

// How loud the engine is (0 to 1): more with the throttle open, less at low engine speed, silent
// when it has stopped. rpmFraction: engine speed as a share of its rated speed.
export function engineLoudness(throttle, rpmFraction, running) {
  if (!running || rpmFraction <= 0) return 0;
  const t = ENGINE_SOUND.idleLoudness + (1 - ENGINE_SOUND.idleLoudness) * clamp(throttle, 0, 1);
  const r = ENGINE_SOUND.slowLoudness + (1 - ENGINE_SOUND.slowLoudness) * clamp(rpmFraction, 0, 1);
  return t * r;
}

// The engine's brightness (filter, Hz): darker at idle, brighter with the throttle open.
export function engineCutoff(kind, throttle) {
  const f = ENGINE_SOUND[kind].filter;
  return f.closed + (f.open - f.closed) * clamp(throttle, 0, 1);
}

// Rushing air (0 to 1), by dynamic pressure: with the square of the airspeed, less in thin air.
export function windLoudness(speed, densityRatio = 1) {
  const r = Math.max(0, speed) / WIND_SOUND.refSpeed;
  return clamp(r * r * densityRatio, 0, 1);
}

// The wind's brightness (Hz), rising with airspeed.
export function windCutoff(speed) {
  const { slow, fast } = WIND_SOUND.filter;
  return slow + (fast - slow) * clamp(speed / WIND_SOUND.refSpeed, 0, 1);
}

// The bracing wires' hum: { pitch (Hz), loudness (0 to 1) }, silent below wireFrom.
export function wireHum(speed) {
  const { wireFrom, refSpeed, wirePitch } = WIND_SOUND;
  const t = clamp((speed - wireFrom) / (refSpeed - wireFrom), 0, 1.5);
  return { pitch: wirePitch.slow + (wirePitch.fast - wirePitch.slow) * Math.min(1, t), loudness: speed > wireFrom ? Math.min(1, t) : 0 };
}

// Loudness at a distance (0 to 1): full inside `near`, falling as 1/distance, silent beyond `far`.
export function distanceGain(distance, far = D.farGuns) {
  if (distance > far) return 0;
  return D.near / Math.max(D.near, distance);
}

// How much of the high notes survive a distance (a low-pass filter, Hz).
export function distanceCutoff(distance) {
  return Math.max(D.dull, D.clear * 0.5 ** (Math.max(0, distance - D.near) / D.halving));
}

// How long a sound takes to arrive from a distance (s).
export function soundDelay(distance) {
  return Math.max(0, distance) / D.speedOfSound;
}

// The Doppler shift: the pitch heard over the pitch made, for a source closing at `closing` m/s
// (positive when the gap is shrinking). Kept within a factor of 2 either way.
export function dopplerFactor(closing) {
  return clamp(D.speedOfSound / Math.max(1, D.speedOfSound - closing), 0.5, 2);
}

// Left (-1) to right (+1) for a source, from the listener's position and right-hand direction.
// Vectors are { x, y, z }.
export function stereoPan(listener, right, source) {
  const dx = source.x - listener.x;
  const dy = source.y - listener.y;
  const dz = source.z - listener.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  return clamp((dx * right.x + dy * right.y + dz * right.z) / len, -1, 1);
}

// How fast two things are closing (m/s, positive when getting nearer), from their positions and
// velocities.
export function closingSpeed(listener, listenerVelocity, source, sourceVelocity) {
  const dx = source.x - listener.x;
  const dy = source.y - listener.y;
  const dz = source.z - listener.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  const rx = sourceVelocity.x - listenerVelocity.x;
  const ry = sourceVelocity.y - listenerVelocity.y;
  const rz = sourceVelocity.z - listenerVelocity.z;
  return -(dx * rx + dy * ry + dz * rz) / len;
}

// The closest a straight path from a to b comes to point p: { distance, t (0 at a, 1 at b) }.
export function closestApproach(a, b, p) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const vz = b.z - a.z;
  const len2 = vx * vx + vy * vy + vz * vz;
  const t = len2 > 0 ? clamp(((p.x - a.x) * vx + (p.y - a.y) * vy + (p.z - a.z) * vz) / len2, 0, 1) : 0;
  return { distance: Math.hypot(a.x + vx * t - p.x, a.y + vy * t - p.y, a.z + vz * t - p.z), t };
}

// The loudest the steady sounds can add up to (the engine, the wind and its wires, the enemy
// engines and the warning tone all at full), before the player's volume. Kept below 1 so they cannot clip.
export function steadyPeak() {
  return MIX.master * (ENGINE_SOUND.level + WIND_SOUND.level + WIND_SOUND.wireLevel + D.enemyEngineLevel * D.maxEngines + WARNING_SOUND.level);
}
