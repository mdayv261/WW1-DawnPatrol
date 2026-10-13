// The game's sound, through the Web Audio API, all made in code: the player's engine, the rushing
// wind and the wires' hum, a windmilling propeller, the nearest enemy engines, and one-shot clips
// for gunfire, hits, passing bullets and a crash. The numbers come from soundMath.js and the
// settings from src/aircraft/sounds.js. Browsers allow sound only after a click or key press, so
// nothing is made until start() is called from one. Without Web Audio (the tests) it does nothing.

import { ENGINE_SOUND, WIND_SOUND, CLIPS, DISTANCE_SOUND as D, MIX } from '../aircraft/sounds.js';
import {
  firingFrequency, engineLoudness, engineCutoff, windLoudness, windCutoff, wireHum,
  distanceGain, distanceCutoff, soundDelay, dopplerFactor, stereoPan, closingSpeed,
} from './soundMath.js';
import { clip, noise } from './synth.js';

const SMOOTH = 0.05; // s: how quickly the steady sounds follow changes (no zipper noise)

export function createAudio() {
  let ctx = null;
  let master = null;
  let parts = null;
  let volume = 0.7;
  let muted = false;
  let active = false;

  const set = (param, value) => param.setTargetAtTime(value, ctx.currentTime, SMOOTH);

  function wave(kind) {
    const h = ENGINE_SOUND[kind].harmonics;
    const real = new Float32Array(h.length + 1);
    const imag = new Float32Array(h.length + 1);
    h.forEach((a, i) => { imag[i + 1] = a; });
    return ctx.createPeriodicWave(real, imag);
  }

  function noiseSource(seconds, seed) {
    const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
    buffer.copyToChannel(noise(buffer.length, seed), 0);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start();
    return src;
  }

  // An engine voice: a waveform at the firing frequency, its loudness wobbling with the crankshaft
  // and at random (rough for a rotary), through a filter, into a gain (and a pan, for enemies).
  function engineVoice(kind, destination, level) {
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(wave(kind));
    const body = ctx.createGain();
    const wobble = ctx.createOscillator(); // the crankshaft's own pulse
    const wobbleDepth = ctx.createGain();
    wobbleDepth.gain.value = ENGINE_SOUND[kind].crankWobble;
    wobble.connect(wobbleDepth).connect(body.gain);
    const rough = noiseSource(2, kind === 'rotary' ? 11 : 13); // slow random wander of the loudness
    const roughFilter = ctx.createBiquadFilter();
    roughFilter.type = 'lowpass';
    roughFilter.frequency.value = 25;
    const roughDepth = ctx.createGain();
    roughDepth.gain.value = ENGINE_SOUND[kind].roughness * 3;
    rough.connect(roughFilter).connect(roughDepth).connect(body.gain);
    body.gain.value = 1;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = ENGINE_SOUND[kind].filter.q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const pan = ctx.createStereoPanner();
    osc.connect(body).connect(filter).connect(gain).connect(pan).connect(destination);
    osc.start();
    wobble.start();
    return { kind, osc, wobble, filter, gain, pan, level };
  }

  function build() {
    master = ctx.createGain();
    master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor(); // a safety net against clipping
    limiter.threshold.value = MIX.limiter;
    limiter.ratio.value = 20;
    master.connect(limiter).connect(ctx.destination);
    const bus = ctx.createGain();
    bus.gain.value = MIX.master;
    bus.connect(master);

    const wind = noiseSource(3, 3);
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    wind.connect(windFilter).connect(windGain).connect(bus);
    const wire = ctx.createOscillator();
    wire.type = 'triangle';
    const wireGain = ctx.createGain();
    wireGain.gain.value = 0;
    wire.connect(wireGain).connect(bus);
    wire.start();
    // The windmilling propeller: wind-like noise pulsing at the blade-passing rate.
    const prop = noiseSource(2, 5);
    const propFilter = ctx.createBiquadFilter();
    propFilter.type = 'bandpass';
    propFilter.frequency.value = 500;
    const propPulse = ctx.createGain();
    const propLfo = ctx.createOscillator();
    const propDepth = ctx.createGain();
    propDepth.gain.value = 0.5;
    propLfo.connect(propDepth).connect(propPulse.gain);
    propLfo.start();
    const propGain = ctx.createGain();
    propGain.gain.value = 0;
    prop.connect(propFilter).connect(propPulse).connect(propGain).connect(bus);

    const clips = {};
    for (const name of Object.keys(CLIPS)) {
      const data = clip(name, ctx.sampleRate);
      const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
      buffer.copyToChannel(data, 0);
      clips[name] = buffer;
    }
    parts = { master, bus, windFilter, windGain, wire, wireGain, propLfo, propGain, clips, player: null, enemies: [] };
  }

  // A clip once: from a distance (quieter, duller, later) and placed left or right.
  function play(name, { gain = 1, pan = 0, delay = 0, cutoff = 20000, rate = 1 } = {}) {
    if (gain <= 0.002) return;
    const src = ctx.createBufferSource();
    src.buffer = parts.clips[name];
    src.playbackRate.value = rate;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.value = gain * CLIPS[name].level;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    src.connect(filter).connect(g).connect(p).connect(parts.bus);
    src.start(ctx.currentTime + delay);
  }

  function applyMaster() {
    if (!ctx) return;
    const target = active && !muted ? volume : 0;
    master.gain.setTargetAtTime(target, ctx.currentTime, MIX.fade / 3);
  }

  return {
    // Make the sound graph (from a click or key press). Safe to call again.
    start() {
      const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!AC) return;
      if (!ctx) {
        ctx = new AC();
        build();
        applyMaster();
      }
      if (ctx.state === 'suspended') ctx.resume();
    },
    get running() {
      return Boolean(ctx) && ctx.state === 'running';
    },
    get context() {
      return ctx;
    },
    get parts() {
      return parts;
    },
    setVolume(v) {
      volume = Math.min(1, Math.max(0, v));
      applyMaster();
    },
    setMuted(m) {
      muted = m;
      applyMaster();
    },
    get muted() {
      return muted;
    },
    // Heard only while flying (fades out when paused or in the menus).
    setActive(a) {
      active = a;
      applyMaster();
    },

    // Each frame. s: { player: { kind, cylinders, rpm (crankshaft), propRpm, ratedRpm, throttle, running,
    // speed, density (ratio to sea level), velocity }, listener: { position, right }, enemies: [{ id, kind, cylinders, rpm, position,
    // velocity }], sounds: combat sound events (emptied here), crashed: true on the frame the player crashes }.
    update(s) {
      if (!ctx || !parts) {
        if (s.sounds) s.sounds.length = 0;
        return;
      }
      const p = s.player;
      // The player's engine (rebuilt when the aircraft changes kind).
      if (!parts.player || parts.player.kind !== p.kind) {
        parts.player?.osc.stop();
        parts.player?.wobble.stop();
        parts.player = engineVoice(p.kind, parts.bus, ENGINE_SOUND.level);
      }
      const v = parts.player;
      set(v.osc.frequency, Math.max(1, firingFrequency(p.cylinders, p.rpm)));
      set(v.wobble.frequency, Math.max(0.5, p.rpm / 60));
      set(v.filter.frequency, engineCutoff(p.kind, p.throttle));
      set(v.gain.gain, ENGINE_SOUND.level * engineLoudness(p.throttle, p.rpm / p.ratedRpm, p.running));
      // Wind, wires and (with the engine stopped) the windmilling propeller.
      set(parts.windFilter.frequency, windCutoff(p.speed));
      set(parts.windGain.gain, WIND_SOUND.level * windLoudness(p.speed, p.density));
      const hum = wireHum(p.speed);
      set(parts.wire.frequency, hum.pitch);
      set(parts.wireGain.gain, WIND_SOUND.wireLevel * hum.loudness);
      set(parts.propLfo.frequency, Math.max(0.5, (p.propRpm / 60) * 2)); // two blades
      set(parts.propGain.gain, !p.running && p.propRpm > 30 ? ENGINE_SOUND.windmillLevel * windLoudness(p.speed, p.density) : 0);

      // The nearest enemy engines, each from its direction, quieter and duller with distance, its
      // pitch shifted as it comes and goes.
      const L = s.listener;
      const near = (s.enemies ?? [])
        .map((e) => ({ e, d: Math.hypot(e.position.x - L.position.x, e.position.y - L.position.y, e.position.z - L.position.z) }))
        .filter((x) => x.d < D.farEngine)
        .sort((a, b) => a.d - b.d)
        .slice(0, D.maxEngines);
      while (parts.enemies.length < near.length) parts.enemies.push(null);
      parts.enemies.forEach((voice, i) => {
        const n = near[i];
        if (!n) {
          if (voice) set(voice.gain.gain, 0);
          return;
        }
        if (!voice || voice.kind !== n.e.kind) {
          voice?.osc.stop();
          voice?.wobble.stop();
          voice = engineVoice(n.e.kind, parts.bus, D.enemyEngineLevel);
          parts.enemies[i] = voice;
        }
        const shift = dopplerFactor(closingSpeed(L.position, p.velocity, n.e.position, n.e.velocity));
        set(voice.osc.frequency, Math.max(1, firingFrequency(n.e.cylinders, n.e.rpm) * shift));
        set(voice.wobble.frequency, Math.max(0.5, n.e.rpm / 60));
        set(voice.filter.frequency, Math.min(engineCutoff(n.e.kind, 1), distanceCutoff(n.d)));
        set(voice.gain.gain, D.enemyEngineLevel * distanceGain(n.d, D.farEngine));
        set(voice.pan.pan, stereoPan(L.position, L.right, n.e.position));
      });

      // One-shot sounds from the fight.
      for (const e of s.sounds ?? []) {
        if (e.kind === 'shot' && e.player) play(e.gun, { rate: 0.95 + Math.random() * 0.1 });
        else if (e.kind === 'shot') {
          const d = Math.hypot(e.x - L.position.x, e.y - L.position.y, e.z - L.position.z);
          play(e.gun, { gain: distanceGain(d), cutoff: distanceCutoff(d), delay: soundDelay(d), pan: stereoPan(L.position, L.right, e) });
        } else if (e.kind === 'nearMiss') play('crack', { gain: Math.min(1, 4 / Math.max(1, e.distance)), pan: stereoPan(L.position, L.right, e) });
        else if (e.kind === 'hitPlayer') play('hit', { rate: 0.9 + Math.random() * 0.2 });
      }
      if (s.sounds) s.sounds.length = 0;
      if (s.crashed) play('crash');
    },
  };
}
