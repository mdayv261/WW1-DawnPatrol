// Phase 0 scene: sky, sun, haze and a patchwork ground.
// This is rendering only. Nothing in the physics code may import this file.

import * as THREE from 'three';

const HORIZON_COLOUR = 0xc9dcec; // pale haze where sky meets ground
const ZENITH_COLOUR = 0x2f6fb5; // deeper blue straight overhead
const GROUND_SIZE = 60000; // metres across
const FIELD_SIZE = 150; // metres per texture tile
const CAMERA_FAR = 30000; // the haze hides everything beyond 25 km; a shorter depth range means finer depth precision

// Sun direction as a unit vector (up and slightly toward -Z = north).
const SUN_DIRECTION = new THREE.Vector3(0.4, 0.55, -0.7).normalize();

// Sky dome: a big inside-out sphere shaded from horizon colour to zenith
// colour, with a soft glow around the sun.
function createSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      horizon: { value: new THREE.Color(HORIZON_COLOUR) },
      zenith: { value: new THREE.Color(ZENITH_COLOUR) },
      sunDir: { value: SUN_DIRECTION.clone() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 horizon;
      uniform vec3 zenith;
      uniform vec3 sunDir;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(horizon, zenith, pow(h, 0.55));
        float s = max(dot(normalize(vDir), sunDir), 0.0);
        col += vec3(1.0, 0.92, 0.75) * (pow(s, 600.0) * 1.5 + pow(s, 12.0) * 0.12);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(CAMERA_FAR * 0.9, 32, 16), material);
  dome.frustumCulled = false;
  return dome;
}

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
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(HORIZON_COLOUR);
  // Haze: distant ground fades into the horizon colour.
  scene.fog = new THREE.Fog(HORIZON_COLOUR, 3000, 25000);

  scene.add(createSky());
  const ground = createGround();
  scene.add(ground);

  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.copy(SUN_DIRECTION).multiplyScalar(1000);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd8f0, 0x5d7f3a, 1.0));

  // Placeholder viewpoint: 300 m up, looking toward the horizon.
  const camera = new THREE.PerspectiveCamera(60, 1, 1, CAMERA_FAR);
  camera.position.set(0, 300, 0);
  camera.lookAt(0, 270, -1000);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera, ground, groundTile: FIELD_SIZE };
}
