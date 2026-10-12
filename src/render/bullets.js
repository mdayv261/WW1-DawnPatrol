// Drawing the fight: tracer streaks (flat ribbons that face the camera) and the
// puffs where bullets strike (sparks on an aircraft, dust on the ground, chips off
// a tree or building). Only reads the Combat object; nothing here affects physics.

import {
  BufferGeometry, BufferAttribute, Mesh, MeshBasicMaterial, DoubleSide, Points, ShaderMaterial, Vector3,
} from 'three';
import { BULLETS } from '../aircraft/weapons.js';

const WIDTH = 0.28; // m, width of a tracer streak (wider than real so it shows at 400 m)
const _dir = new Vector3();
const _side = new Vector3();
const _view = new Vector3();

// Tracer streaks, one flat quad each, rebuilt every frame.
export class TracerView {
  constructor(scene) {
    const max = BULLETS.maxAlive;
    this.max = max;
    this.positions = new Float32Array(max * 4 * 3);
    const index = new Uint16Array(max * 6);
    for (let i = 0; i < max; i++) index.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3).setUsage(35048));
    this.geometry.setIndex(new BufferAttribute(index, 1));
    this.geometry.setDrawRange(0, 0);
    this.mesh = new Mesh(this.geometry, new MeshBasicMaterial({ color: 0xffd36b, side: DoubleSide, fog: false, depthWrite: false }));
    this.mesh.frustumCulled = false; // the box is recomputed every frame anyway
    scene.add(this.mesh);
  }

  // bullets: the Combat bullets; camera: where we are looking from (streaks turn to face it).
  update(bullets, camera, alpha, dt) {
    let n = 0;
    const p = this.positions;
    for (const b of bullets) {
      if (!b.tracer || n >= this.max) continue;
      // The bullet has moved on since the last physics step: draw it where it is now.
      const x = b.x + b.vx * dt * alpha;
      const y = b.y + b.vy * dt * alpha;
      const z = b.z + b.vz * dt * alpha;
      const speed = Math.hypot(b.vx, b.vy, b.vz) || 1;
      _dir.set(b.vx / speed, b.vy / speed, b.vz / speed);
      _view.set(x - camera.position.x, y - camera.position.y, z - camera.position.z);
      const dist = _view.length();
      _side.crossVectors(_dir, _view).normalize().multiplyScalar((WIDTH * Math.max(1, dist / 120)) / 2); // a little wider far off
      const tail = Math.min(BULLETS.tracerLength, b.age * speed); // a young bullet has not made a full streak yet
      const o = n * 12;
      p[o] = x - _dir.x * tail - _side.x; p[o + 1] = y - _dir.y * tail - _side.y; p[o + 2] = z - _dir.z * tail - _side.z;
      p[o + 3] = x - _dir.x * tail + _side.x; p[o + 4] = y - _dir.y * tail + _side.y; p[o + 5] = z - _dir.z * tail + _side.z;
      p[o + 6] = x - _side.x; p[o + 7] = y - _side.y; p[o + 8] = z - _side.z;
      p[o + 9] = x + _side.x; p[o + 10] = y + _side.y; p[o + 11] = z + _side.z;
      n++;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.setDrawRange(0, n * 6);
    return n;
  }
}

// Puffs: sparks, dust and chips. A pool of points with their own size, colour and fade.
const KINDS = {
  hit: { life: 0.25, size: 1.6, color: [1, 0.72, 0.3], blend: true }, // sparks and splinters on an aircraft
  down: { life: 0.9, size: 6, color: [1, 0.55, 0.2], blend: true }, // a target shot down: a burst
  ground: { life: 0.8, size: 2.6, color: [0.55, 0.45, 0.33], blend: false }, // dust
  solid: { life: 0.5, size: 1.8, color: [0.62, 0.58, 0.5], blend: false }, // chips off a tree or building
  smoke: { life: 2.6, size: 3.2, color: [0.16, 0.15, 0.15], blend: false }, // a damaged engine's trail
  spray: { life: 1.2, size: 1.7, color: [0.86, 0.86, 0.8], blend: false }, // fuel leaking from a holed tank
};
const POOL = 280;

export class EffectsView {
  constructor(scene) {
    this.puffs = [];
    this.position = new Float32Array(POOL * 3);
    this.size = new Float32Array(POOL);
    this.colour = new Float32Array(POOL * 4);
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(this.position, 3));
    this.geometry.setAttribute('aSize', new BufferAttribute(this.size, 1));
    this.geometry.setAttribute('aColour', new BufferAttribute(this.colour, 4));
    this.geometry.setDrawRange(0, 0);
    const material = new ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: `
        attribute float aSize; attribute vec4 aColour; varying vec4 vColour;
        void main() {
          vColour = aColour;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(aSize * 700.0 / max(1.0, -mv.z), 2.0, 64.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec4 vColour;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          if (d > 1.0) discard;
          gl_FragColor = vec4(vColour.rgb, vColour.a * (1.0 - d * d));
        }`,
    });
    this.points = new Points(this.geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  // Take up the new events from the Combat object (then empty the list), and age the puffs.
  update(events, dt) {
    for (const e of events) {
      const k = KINDS[e.kind];
      if (!k) continue;
      if (this.puffs.length >= POOL) this.puffs.shift();
      this.puffs.push({ x: e.x, y: e.y, z: e.z, age: 0, k });
    }
    events.length = 0;
    let n = 0;
    this.puffs = this.puffs.filter((p) => (p.age += dt) < p.k.life);
    for (const p of this.puffs) {
      const f = p.age / p.k.life;
      this.position[n * 3] = p.x; this.position[n * 3 + 1] = p.y + (p.k.blend ? 0 : f * 3); this.position[n * 3 + 2] = p.z;
      this.size[n] = p.k.size * (p.k.blend ? 1 : 1 + f);
      this.colour.set([...p.k.color, 1 - f], n * 4);
      n++;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aColour.needsUpdate = true;
    this.geometry.setDrawRange(0, n);
  }
}
