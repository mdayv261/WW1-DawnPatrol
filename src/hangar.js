// Hangar: a separate page (/hangar.html) for looking at all the aircraft
// models without flying. Drag to orbit, wheel to zoom, buttons for the views,
// "Silhouette" for black shapes against the sky (the recognisability test).

import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, MeshBasicMaterial, DirectionalLight,
  HemisphereLight, Mesh, PlaneGeometry, MeshLambertMaterial, Vector3,
} from 'three';
import { ALL_AIRCRAFT as AIRCRAFT_LIST, common } from './aircraft/index.js'; // every aircraft, Late and Early War
import { gearGeometry } from './physics/ground.js';
import { createAircraftMesh, setControlSurfaces } from './render/aircraftMesh.js';

const SKY = 0xcfe0ee;
const canvas = document.getElementById('view');
const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new Scene();
scene.background = new Color(SKY);
const camera = new PerspectiveCamera(30, 1, 0.1, 500);

const sun = new DirectionalLight(0xfff1d6, 2.4);
sun.position.set(-6, 10, 8);
scene.add(sun, new HemisphereLight(0xbfd8f0, 0x6b7a4a, 1.1));
const floor = new Mesh(new PlaneGeometry(200, 200).rotateX(-Math.PI / 2), new MeshLambertMaterial({ color: 0x6f8a4a }));
scene.add(floor);

// Aircraft: placed on the floor at their wheel height, nose along +X.
const models = AIRCRAFT_LIST.map((ac) => {
  const m = createAircraftMesh(ac);
  m.ac = ac;
  scene.add(m.group);
  return m;
});

let selected = 'all'; // 'all' or an index
let yaw = 0.35; // radians around the target; 0 = from the right-hand side (+Z)
let pitch = 0.18;
let distance = 40;
let silhouette = false;
let spin = true;

const SPACING = 10;
function layout() {
  models.forEach((m, i) => {
    const x = selected === 'all' ? (i - (models.length - 1) / 2) * SPACING : 0;
    m.group.position.set(x, groundHeight(m.ac), 0);
    m.group.visible = selected === 'all' || selected === i;
  });
}
// Height of the centre of gravity above the ground when parked: the wheels
// touch at the physics contact height.
function groundHeight(ac) {
  return -gearGeometry(ac, common).contactY;
}
function target() {
  return selected === 'all' ? new Vector3(0, 1.5, 0) : new Vector3(0, 1.6, 0);
}

function applyMode() {
  scene.overrideMaterial = silhouette ? new MeshBasicMaterial({ color: 0x0a0a0a }) : null;
  floor.visible = !silhouette;
  models.forEach((m) => m.group.traverse((o) => { if (o.userData.isDisc) o.visible = !silhouette; }));
}

function place() {
  const t = target();
  const cp = Math.cos(pitch);
  camera.position.set(t.x + distance * cp * Math.sin(yaw), t.y + distance * Math.sin(pitch), t.z + distance * cp * Math.cos(yaw));
  camera.lookAt(t);
}

function setView(name) {
  const views = { side: [0, 0], front: [Math.PI / 2, 0], top: [0, 1.5], back: [-Math.PI / 2, 0], three: [0.6, 0.3] };
  [yaw, pitch] = views[name];
  distance = selected === 'all' ? 14 * models.length : 18; // far enough back for the whole row, even in a narrow window
  place();
}

// Controls panel.
const panel = document.createElement('div');
panel.style.cssText = 'position:fixed;top:10px;left:10px;padding:8px 10px;border-radius:6px;background:rgba(10,16,10,.8);color:#e8f0e0;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;max-width:520px';
const label = document.createElement('div');
panel.appendChild(label);
const BTN = 'margin:2px;padding:4px 7px;font:11px ui-monospace,Menlo,Consolas,monospace;background:#2f3d2a;color:#e8f0e0;border:1px solid #6b7a4a;border-radius:4px;cursor:pointer';
function button(text, onClick) {
  const b = document.createElement('button');
  b.textContent = text;
  b.style.cssText = BTN;
  b.addEventListener('click', () => { b.blur(); onClick(); });
  panel.appendChild(b);
  return b;
}
function newRow() { panel.appendChild(document.createElement('br')); }
function describe() {
  label.textContent = selected === 'all' ? `All ${models.length} aircraft (side view shows them side by side)` : `${AIRCRAFT_LIST[selected].name}`;
}
button('All', () => { selected = 'all'; layout(); describe(); setView('side'); });
AIRCRAFT_LIST.forEach((ac, i) => button(ac.name, () => { selected = i; layout(); describe(); setView('three'); }));
newRow();
button('Side', () => setView('side'));
button('Front', () => setView('front'));
button('Back', () => setView('back'));
button('Top', () => setView('top'));
button('3/4', () => setView('three'));
newRow();
const sil = button('Silhouette: off', () => { silhouette = !silhouette; sil.textContent = `Silhouette: ${silhouette ? 'on' : 'off'}`; applyMode(); });
const sp = button('Propeller: spinning', () => { spin = !spin; sp.textContent = `Propeller: ${spin ? 'spinning' : 'stopped'}`; });
newRow();
// Control surfaces at full travel (the same angles as in flight).
const FULL = { pull: common.maxPull, roll: common.maxRoll, yaw: common.maxYaw };
const move = (d) => models.forEach((m) => setControlSurfaces(m, { pull: 0, roll: 0, yaw: 0, ...d }));
button('Controls neutral', () => move({}));
button('Roll right', () => move({ roll: FULL.roll }));
button('Roll left', () => move({ roll: -FULL.roll }));
button('Pull back', () => move({ pull: FULL.pull }));
button('Push forward', () => move({ pull: -FULL.pull }));
button('Right rudder', () => move({ yaw: FULL.yaw }));
button('Left rudder', () => move({ yaw: -FULL.yaw }));
const hint = document.createElement('div');
hint.textContent = 'Drag to orbit, wheel to zoom.';
hint.style.opacity = '0.7';
panel.appendChild(hint);
document.body.appendChild(panel);

// Mouse.
let dragging = false;
canvas.addEventListener('mousedown', () => { dragging = true; });
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  yaw -= e.movementX * 0.006;
  pitch = Math.max(-0.2, Math.min(1.5, pitch + e.movementY * 0.006));
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  distance = Math.max(5, Math.min(120, distance * Math.exp(e.deltaY * 0.001)));
}, { passive: false });

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
layout();
describe();
setView('side');
applyMode();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (spin) models.forEach((m) => { m.prop.rotation.x += 40 * dt; });
  place();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__hangar = { move, setView, get state() { return { selected, yaw, pitch, distance, silhouette }; }, select(i) { selected = i; layout(); describe(); }, silhouette(on) { silhouette = on; applyMode(); } };
