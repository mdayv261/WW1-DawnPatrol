// Draws the cumulus clouds of world/clouds.js: every puff is a soft sprite
// from a small atlas painted in code (four lumpy puffs, white on top and
// grey-blue underneath), turned to face the camera in the shader. All puffs
// are one instanced draw, sorted far to near every so often so the soft edges
// blend properly. Puffs fade out as the camera enters them, so you can fly
// through a cloud, and melt into the haze with distance. Rendering only.

import {
  InstancedBufferGeometry, InstancedBufferAttribute, PlaneGeometry, ShaderMaterial, Mesh, CanvasTexture,
  SRGBColorSpace, Color, Vector3,
} from 'three';
import { cloudsNear } from '../world/clouds.js';
import { hash } from '../world/noise.js';

const CAPACITY = 5000; // most puffs drawn at once
const REBUILD_DISTANCE = 250; // m the camera moves before the cloud list is rebuilt
const REBUILD_SECONDS = 0.6; // and the puffs are re-sorted at least this often

// Paint the four puff pictures into a 2 x 2 atlas.
function paintAtlas(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cell = size / 2;
  for (let n = 0; n < 4; n++) {
    const ox = (n % 2) * cell;
    const oy = Math.floor(n / 2) * cell;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, cell, cell);
    ctx.clip();
    // A lumpy ball made of overlapping soft discs, fading to nothing at the edge.
    for (let k = 0; k < 16; k++) {
      const a = hash(77, n, k, 1) * Math.PI * 2;
      const d = Math.sqrt(hash(77, n, k, 2)) * cell * 0.24;
      const r = cell * (0.16 + 0.14 * hash(77, n, k, 3));
      const cx = ox + cell / 2 + Math.cos(a) * d;
      const cy = oy + cell / 2 + Math.sin(a) * d * 0.8 + cell * 0.03;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.6)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }
    // Shade the underside grey-blue, keep the top white.
    ctx.globalCompositeOperation = 'source-atop';
    const shade = ctx.createLinearGradient(0, oy + cell * 0.2, 0, oy + cell * 0.85);
    shade.addColorStop(0, 'rgba(255,255,255,0)');
    shade.addColorStop(1, 'rgba(150,162,184,0.7)');
    ctx.fillStyle = shade;
    ctx.fillRect(ox, oy, cell, cell);
    ctx.restore();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

const VERTEX = `
  attribute vec3 aOffset;
  attribute vec4 aSprite; // x scale (m), y rotation, z atlas cell 0-3, w shade
  uniform float fogNear;
  uniform float fogFar;
  varying vec2 vUv;
  varying float vShade;
  varying float vFade;
  varying float vFog;
  void main() {
    vec4 mv = viewMatrix * vec4(aOffset, 1.0);
    float c = cos(aSprite.y);
    float s = sin(aSprite.y);
    mv.xy += vec2(c * position.x - s * position.y, s * position.x + c * position.y) * aSprite.x;
    float dist = length(mv.xyz);
    vFade = smoothstep(aSprite.x * 0.3, aSprite.x * 1.0, dist); // melts away as you fly into it
    vFog = smoothstep(fogNear, fogFar, dist);
    vec2 cell = vec2(mod(aSprite.z, 2.0), floor(aSprite.z / 2.0));
    vUv = (cell + uv) * 0.5;
    vShade = aSprite.w;
    gl_Position = projectionMatrix * mv;
  }`;

const FRAGMENT = `
  uniform sampler2D atlas;
  uniform vec3 fogColor;
  varying vec2 vUv;
  varying float vShade;
  varying float vFade;
  varying float vFog;
  void main() {
    vec4 t = texture2D(atlas, vUv);
    vec3 col = t.rgb * vShade;
    col = mix(col, fogColor, vFog * 0.75);
    float a = t.a * vFade * (1.0 - vFog * 0.5);
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }`;

export class Clouds {
  // quality: { cloudRadius (m), cloudDensity (0-1) }; fog: the scene's THREE.Fog.
  constructor(scene, seed, quality, fog) {
    this.seed = seed;
    this.quality = quality;
    this.last = null; // camera position at the last rebuild
    this.lastTime = -1e9;
    const geometry = new InstancedBufferGeometry();
    const plane = new PlaneGeometry(1, 1);
    geometry.index = plane.index;
    geometry.setAttribute('position', plane.attributes.position);
    geometry.setAttribute('uv', plane.attributes.uv);
    this.offsets = new Float32Array(CAPACITY * 3);
    this.sprites = new Float32Array(CAPACITY * 4);
    this.offsetAttr = new InstancedBufferAttribute(this.offsets, 3).setUsage(35048); // dynamic draw
    this.spriteAttr = new InstancedBufferAttribute(this.sprites, 4).setUsage(35048);
    geometry.setAttribute('aOffset', this.offsetAttr);
    geometry.setAttribute('aSprite', this.spriteAttr);
    geometry.instanceCount = 0;
    this.material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        atlas: { value: paintAtlas() },
        fogColor: { value: new Color(fog?.color ?? 0xc9dcec) },
        fogNear: { value: fog?.near ?? 3000 },
        fogFar: { value: fog?.far ?? 25000 },
      },
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10; // after the ground and aircraft, so they hide the clouds correctly
    scene.add(this.mesh);
    this.count = 0;
  }

  // Change how far and how thickly the sky is filled (graphics quality).
  setQuality(quality) {
    this.quality = quality;
    this.last = null; // rebuild on the next update
  }

  // Rebuild the puff list round the camera and sort it far to near.
  rebuild(camera) {
    const q = this.quality;
    const list = [];
    for (const c of cloudsNear(this.seed, camera.x, camera.z, q.cloudRadius, q.cloudDensity)) {
      for (const p of c.puffs) {
        const dx = p.x - camera.x;
        const dy = p.y - camera.y;
        const dz = p.z - camera.z;
        list.push({ p, d2: dx * dx + dy * dy + dz * dz });
      }
    }
    list.sort((a, b) => b.d2 - a.d2); // far first, so nearer puffs blend over them
    const n = Math.min(list.length, CAPACITY);
    const skip = list.length - n; // if there are too many, drop the farthest
    for (let i = 0; i < n; i++) {
      const { p } = list[skip + i];
      this.offsets.set([p.x, p.y, p.z], i * 3);
      this.sprites.set([p.r * 2.2, p.rot, p.tex, p.shade], i * 4);
    }
    this.count = n;
    this.mesh.geometry.instanceCount = n;
    this.offsetAttr.needsUpdate = true;
    this.spriteAttr.needsUpdate = true;
    this.last = new Vector3().copy(camera);
  }

  // Call each frame with the camera position and the time in seconds.
  update(camera, seconds) {
    if (!this.last || this.last.distanceTo(camera) > REBUILD_DISTANCE || seconds - this.lastTime > REBUILD_SECONDS) {
      this.rebuild(camera);
      this.lastTime = seconds;
    }
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.uniforms.atlas.value.dispose();
    this.material.dispose();
    this.mesh.parent?.remove(this.mesh);
  }
}
