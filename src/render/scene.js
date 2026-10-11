// Phase 0 scene: sky, sun, haze and a patchwork ground.
// This is rendering only. Nothing in the physics code may import this file.

import * as THREE from 'three';
import { SKY, createSky, sunDirection } from './sky.js';
import { pixelRatioFor } from './quality.js';
import { averageCropColour } from '../world/layout.js';

const GROUND_SIZE = 60000; // metres across
const FIELD_SIZE = 150; // m: the fallback ground is moved in steps of this size
const CAMERA_FAR = 30000; // the haze hides everything beyond 25 km; a shorter depth range means finer depth precision

// The ground beyond the detailed tiles: one flat colour, the average of the
// farmland, fading into the haze. It used to carry a fine field pattern, but a
// regular pattern seen at 10-25 km shimmers (moire) as the view moves, worst at
// the horizon when banking; a flat colour has nothing to shimmer. It lies well
// below the tiles, so it only shows through cracks and past their edge.
function createGround() {
  const geometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
  geometry.rotateX(-Math.PI / 2); // lay it flat, facing up
  const material = new THREE.MeshLambertMaterial({ color: averageCropColour() });
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
