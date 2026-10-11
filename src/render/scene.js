// Phase 0 scene: sky, sun, haze and a patchwork ground.
// This is rendering only. Nothing in the physics code may import this file.

import * as THREE from 'three';
import { SKY, createSky, sunDirection } from './sky.js';
import { pixelRatioFor } from './quality.js';

const GROUND_SIZE = 60000; // metres across
const FIELD_SIZE = 150; // metres per texture tile
const CAMERA_FAR = 30000; // the haze hides everything beyond 25 km; a shorter depth range means finer depth precision

// A small canvas of green and brown patches, repeated across the ground so
// that speed and altitude are easy to judge by eye.
function createFieldTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const palette = ['#5d7f3a', '#6b8c40', '#7a9547', '#8a9a50', '#6d6a3a', '#4f7236'];
  const cells = 4;
  const cell = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = palette[(x * 3 + y * 5 + ((x * y) % 3)) % palette.length];
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  // Thin hedge lines between fields.
  ctx.fillStyle = '#3d5a2a';
  for (let i = 0; i <= cells; i++) {
    ctx.fillRect(i * cell - 1, 0, 2, size);
    ctx.fillRect(0, i * cell - 1, size, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(GROUND_SIZE / FIELD_SIZE, GROUND_SIZE / FIELD_SIZE);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createGround() {
  const geometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
  geometry.rotateX(-Math.PI / 2); // lay it flat, facing up
  const material = new THREE.MeshLambertMaterial({ map: createFieldTexture() });
  return new THREE.Mesh(geometry, material);
}

// Builds everything and returns what main.js needs to draw frames.
// maxPixels: most pixels drawn per frame (see quality.js); change it with setMaxPixels().
export function createScene(canvas, maxPixels = Infinity) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  let pixelBudget = maxPixels;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY.horizon);
  // Haze: distant ground fades into the horizon colour.
  scene.fog = new THREE.Fog(SKY.horizon, SKY.hazeNear, SKY.hazeFar);

  scene.add(createSky(CAMERA_FAR * 0.9));
  const ground = createGround();
  scene.add(ground);

  const sun = new THREE.DirectionalLight(SKY.sunColour, SKY.sunIntensity);
  sun.position.copy(sunDirection()).multiplyScalar(1000);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(SKY.skyLight, SKY.groundLight, SKY.ambientIntensity));

  // Placeholder viewpoint: 300 m up, looking toward the horizon.
  const camera = new THREE.PerspectiveCamera(60, 1, 1, CAMERA_FAR);
  camera.position.set(0, 300, 0);
  camera.lookAt(0, 270, -1000);

  const view = { width: 1, height: 1, pixelRatio: 1 }; // for the F3 overlay
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ratio = pixelRatioFor(pixelBudget, window.devicePixelRatio, w, h);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    Object.assign(view, { width: w, height: h, pixelRatio: ratio });
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    renderer, scene, camera, ground, groundTile: FIELD_SIZE, view,
    setMaxPixels(n) {
      pixelBudget = n;
      resize();
    },
  };
}
