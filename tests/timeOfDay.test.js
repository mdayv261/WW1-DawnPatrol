import { describe, it, expect } from 'vitest';
import { Scene, Color, Fog, DirectionalLight, HemisphereLight } from 'three';
import { SKY, TIME_OF_DAY, skyFor, applyTimeOfDay, createSky } from '../src/render/sky.js';
import { TIMES } from '../src/game/flow.js';

// Dawn, day and dusk.

describe('times of day', () => {
  it('there is a preset for every time the setup screen offers, and day is the old sky', () => {
    for (const t of TIMES) expect(TIME_OF_DAY[t.id]).toBeTruthy();
    expect(skyFor('day')).toEqual(SKY);
    expect(skyFor('nonsense')).toEqual(SKY);
  });

  it('dawn has the sun low in the east, dusk low in the west; both dimmer and warmer than day', () => {
    const dawn = skyFor('dawn');
    const dusk = skyFor('dusk');
    expect(dawn.sunDirection[0]).toBeGreaterThan(0.5); // east is +x
    expect(dusk.sunDirection[0]).toBeLessThan(-0.5);
    for (const s of [dawn, dusk]) {
      expect(s.sunDirection[1]).toBeLessThan(0.2);
      expect(s.sunIntensity).toBeLessThan(SKY.sunIntensity);
      expect(new Color(s.sunColour).b).toBeLessThan(new Color(SKY.sunColour).b); // redder
    }
  });

  it('applying one changes the background, haze, sun, sky light, sky dome and clouds', () => {
    const scene = new Scene();
    scene.background = new Color(SKY.horizon);
    scene.fog = new Fog(SKY.horizon, SKY.hazeNear, SKY.hazeFar);
    const parts = { scene, sun: new DirectionalLight(), hemisphere: new HemisphereLight(), sky: createSky(1000), clouds: { setHaze: (...a) => { parts.haze = a; } } };
    applyTimeOfDay(parts, 'dusk');
    const d = skyFor('dusk');
    expect(scene.background.getHex()).toBe(d.horizon);
    expect(scene.fog.color.getHex()).toBe(d.horizon);
    expect(scene.fog.near).toBe(d.hazeNear);
    expect(parts.sun.intensity).toBe(d.sunIntensity);
    expect(parts.sun.position.x).toBeLessThan(0);
    expect(parts.hemisphere.intensity).toBe(d.ambientIntensity);
    expect(parts.sky.material.uniforms.zenith.value.getHex()).toBe(d.zenith);
    expect(parts.haze[0]).toBe(d.horizon);
    expect(parts.haze[3]).toBe(d.cloudTint);
    applyTimeOfDay(parts, 'day'); // and back
    expect(scene.background.getHex()).toBe(SKY.horizon);
  });
});
