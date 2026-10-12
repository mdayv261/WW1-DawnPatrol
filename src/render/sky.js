// The sky and its lighting, defined in one place (so a time-of-day setting can
// change it later): the horizon and zenith colours, the sun, the haze and a
// high, thin cirrus layer drawn in the sky shader. Rendering only.

import { Color, Vector2, Vector3, Mesh, SphereGeometry, ShaderMaterial, BackSide } from 'three';

export const SKY = {
  horizon: 0xc9dcec, // pale haze where sky meets ground
  zenith: 0x2f6fb5, // deeper blue straight overhead
  sunDirection: [0.4, 0.55, -0.7], // up and slightly toward -Z (north)
  sunColour: 0xfff1d6,
  sunIntensity: 2.2,
  skyLight: 0xbfd8f0, // the soft light from the sky...
  groundLight: 0x5d7f3a, // ...and bounced up from the ground
  ambientIntensity: 1.0,
  hazeNear: 3000, // m: where the haze starts to hide the ground
  hazeFar: 25000, // m: where it hides everything
  cirrus: 0.8, // 0 = none, 1 = a lot of high wispy cloud
  cirrusWind: [0.7, 0.2], // which way the wisps are drawn out
  cloudTint: 0xffffff, // the colour the clouds are lit with
};

export const sunDirection = () => new Vector3(...SKY.sunDirection).normalize();

// Times of day: each replaces the SKY values it names. Design choices (no source: the look of a
// low morning or evening sun over the Western Front), recorded in docs/DECISIONS.md. The front
// runs north-south with the Germans to the east, so dawn sun is in the east and dusk sun in the west.
export const TIME_OF_DAY = {
  day: {},
  dawn: {
    horizon: 0xe6c3a6, zenith: 0x4b6ea3, sunDirection: [0.92, 0.14, -0.2], sunColour: 0xffc890, sunIntensity: 1.6,
    skyLight: 0xc8b8c4, groundLight: 0x4e5a34, ambientIntensity: 0.75, hazeNear: 2200, hazeFar: 21000, cirrus: 0.6, cloudTint: 0xf2d6c2,
  },
  dusk: {
    horizon: 0xe2a47c, zenith: 0x34507e, sunDirection: [-0.9, 0.12, 0.3], sunColour: 0xff9c5c, sunIntensity: 1.4,
    skyLight: 0xb89ca8, groundLight: 0x46502c, ambientIntensity: 0.65, hazeNear: 2500, hazeFar: 22000, cirrus: 0.7, cloudTint: 0xe8b090,
  },
};

// The sky values for a time of day (the day values with the preset's changes).
export function skyFor(time) {
  return { ...SKY, ...(TIME_OF_DAY[time] ?? {}) };
}

// Change the lighting to a time of day. parts: { scene, sun, hemisphere, sky, clouds } from createScene().
export function applyTimeOfDay(parts, time) {
  const s = skyFor(time);
  parts.scene.background.set(s.horizon);
  parts.scene.fog.color.set(s.horizon);
  parts.scene.fog.near = s.hazeNear;
  parts.scene.fog.far = s.hazeFar;
  const dir = new Vector3(...s.sunDirection).normalize();
  parts.sun.color.set(s.sunColour);
  parts.sun.intensity = s.sunIntensity;
  parts.sun.position.copy(dir).multiplyScalar(1000);
  parts.hemisphere.color.set(s.skyLight);
  parts.hemisphere.groundColor.set(s.groundLight);
  parts.hemisphere.intensity = s.ambientIntensity;
  const u = parts.sky.material.uniforms;
  u.horizon.value.set(s.horizon);
  u.zenith.value.set(s.zenith);
  u.sunDir.value.copy(dir);
  u.cirrus.value = s.cirrus;
  parts.clouds?.setHaze(s.horizon, s.hazeNear, s.hazeFar, s.cloudTint);
  return s;
}

const FRAGMENT = `
  uniform vec3 horizon;
  uniform vec3 zenith;
  uniform vec3 sunDir;
  uniform float cirrus;
  uniform vec2 cirrusWind;
  varying vec3 vDir;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 col = mix(horizon, zenith, pow(h, 0.55));
    // High cirrus: wisps drawn out along the wind, thinning toward the horizon and the zenith.
    if (vDir.y > 0.03 && cirrus > 0.0) {
      vec2 uv = vDir.xz / (vDir.y + 0.12);
      uv = vec2(dot(uv, normalize(cirrusWind)) * 0.35, dot(uv, vec2(-cirrusWind.y, cirrusWind.x) / length(cirrusWind)) * 1.7);
      float n = fbm(uv * 2.2);
      float streak = smoothstep(0.5, 0.82, n);
      col = mix(col, vec3(1.0), streak * cirrus * smoothstep(0.03, 0.3, vDir.y) * 0.5);
    }
    float s = max(dot(normalize(vDir), sunDir), 0.0);
    col += vec3(1.0, 0.92, 0.75) * (pow(s, 600.0) * 1.5 + pow(s, 12.0) * 0.12);
    gl_FragColor = vec4(col, 1.0);
  }`;

// The sky dome: an inside-out sphere of radius `radius`.
export function createSky(radius) {
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      horizon: { value: new Color(SKY.horizon) },
      zenith: { value: new Color(SKY.zenith) },
      sunDir: { value: sunDirection() },
      cirrus: { value: SKY.cirrus },
      cirrusWind: { value: new Vector2(...SKY.cirrusWind) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: FRAGMENT,
  });
  const dome = new Mesh(new SphereGeometry(radius, 32, 16), material);
  dome.frustumCulled = false;
  return dome;
}
