// Entry point: wires the simulation, input, rendering and overlays together.
// Physics runs at a fixed 120 Hz; drawing happens once per screen refresh.

import { createScene } from './render/scene.js';
import { createAircraftMesh } from './render/aircraftMesh.js';
import { ChaseCamera } from './render/chaseCamera.js';
import { FixedStepLoop } from './core/fixedStepLoop.js';
import { Simulation } from './core/simulation.js';
import { AIRCRAFT_LIST } from './aircraft/index.js';
import { attachKeyboard } from './input/keyboard.js';
import { attachMouse, mixStick } from './input/mouse.js';
import { createDebugOverlay, createHelp, createBanner } from './ui/overlays.js';
import { debugLines } from './ui/debugText.js';
import { createTestPanel } from './ui/testPanel.js';
import { startScenario, SCENARIOS } from './dev/flightScenarios.js';

const canvas = document.getElementById('game');
const { renderer, scene, camera, ground, groundTile } = createScene(canvas);
const loop = new FixedStepLoop();
const sim = new Simulation();
const chase = new ChaseCamera(camera);
const debug = createDebugOverlay();
const help = createHelp();
const banner = createBanner();

let aircraftIndex = 0;
let airStart = false; // false: start parked on the airfield; true: in the air at 1,000 m
let model = null; // { group, prop } for the current aircraft
let paused = false;
let notice = { text: '', until: 0 }; // short on-screen message

function showNotice(text, ms = 2000) {
  notice = { text, until: performance.now() + ms };
}
// Temporary flight-test panel (development builds only, D31).
let testPanel = null;
let runner = null; // scripted test pilot for the current scenario, if any
let scenarioLabel = 'normal start';

// Choose the starting aircraft from ?aircraft=camel|spad13|dr1|albatros.
const requested = new URLSearchParams(window.location.search).get('aircraft');
const found = AIRCRAFT_LIST.findIndex((a) => a.id === requested);
if (found >= 0) aircraftIndex = found;

const keyboard = attachKeyboard({
  onSelect: (i, shift) => {
    if (i < AIRCRAFT_LIST.length) {
      airStart = shift;
      startFlight(i);
    }
  },
  onRestart: () => startFlight(aircraftIndex),
  onRecentre: () => {
    mouse.stick.centre();
    showNotice('Stick centred');
  },
  onSensitivity: (step) => showNotice(`Mouse sensitivity x${mouse.adjust(step)}`),
  onPause: () => { paused = !paused; },
  onDebug: () => debug.toggle(),
  onHelp: () => help.toggle(),
  onTestPanel: () => testPanel?.toggle(),
});

if (import.meta.env.DEV) testPanel = createTestPanel(AIRCRAFT_LIST, (i, id) => startFlight(i, id));

const mouse = attachMouse(canvas, {
  onWheel: (change) => keyboard.nudgeThrottle(change),
  onCapture: (captured) =>
    showNotice(captured ? 'Mouse flying on (Esc to release, X to centre stick)' : 'Mouse released (click the game to fly with the mouse)', 3000),
  invertPitch: () => keyboard.invertPitch,
});

// Start a flight; `scenario` is a test-panel scenario id (normal start if omitted).
function startFlight(index, scenario = null) {
  aircraftIndex = index;
  const ac = AIRCRAFT_LIST[index];
  if (model) scene.remove(model.group);
  model = createAircraftMesh(ac);
  scene.add(model.group);
  if (import.meta.env.DEV && scenario) {
    const s = startScenario(sim, ac, scenario);
    keyboard.reset(s.input);
    runner = s.runner;
    scenarioLabel = `${ac.name}: ${SCENARIOS.find((x) => x.id === scenario).label}`;
  } else {
    keyboard.reset(airStart ? sim.start(ac) : sim.startOnGround(ac));
    runner = null;
    scenarioLabel = `${ac.name}: ${airStart ? 'air start' : 'airfield start'}`;
  }
  mouse?.stick.centre();
  chase.reset();
  paused = false;
}

startFlight(aircraftIndex);

let lastOverlay = 0;
const drawPosition = { x: 0, z: 0 };

// Read the keys and run as many fixed physics steps as realDt calls for.
// Returns alpha, how far we are between the last two physics states.
function update(realDt) {
  if (paused) return 1;
  const keys = keyboard.update(realDt);
  // Keyboard and mouse stick combined into the controls the aircraft feels.
  const input = { ...keys, ...mixStick(keys, mouse.stick, keyboard.pitchKeyHeld(), keyboard.rollKeyHeld()) };
  // A flight key hands control back from a scripted test pilot.
  if (import.meta.env.DEV && runner && keyboard.pilotActive()) runner.cancel();
  return loop.advance(realDt, (dt) => {
    if (import.meta.env.DEV && runner) runner.apply(input, dt);
    sim.step(dt, input);
  }).alpha;
}

// Draw one frame from the current state.
function draw(realDt, alpha, now) {
  const { position, quaternion } = sim.interpolate(alpha);
  model.group.position.copy(position);
  model.group.quaternion.copy(quaternion);
  const d = sim.diag;
  if (d) model.prop.rotation.x += (d.rpm / 60) * Math.PI * 2 * realDt * 0.15; // slowed so it reads on screen

  // Keep the ground under the aircraft, in whole texture tiles so it never swims.
  drawPosition.x = Math.round(position.x / groundTile) * groundTile;
  drawPosition.z = Math.round(position.z / groundTile) * groundTile;
  ground.position.set(drawPosition.x, 0, drawPosition.z);

  chase.update(position, quaternion, realDt);

  if (now - lastOverlay > 100) {
    lastOverlay = now;
    const message = now < notice.until ? notice.text : '';
    banner.set(sim.crashed ? `CRASHED: ${sim.crashReason} - press R` : paused ? 'PAUSED' : message);
    if (debug.visible) debug.set(debugLines(sim.aircraft, sim.diag, { crashed: sim.crashed, paused }));
    if (import.meta.env.DEV && testPanel?.visible) testPanel.update(sim, runner, scenarioLabel);
  }
  renderer.render(scene, camera);
}

let lastTime = performance.now();

function frame(now) {
  const realDt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  draw(realDt, update(realDt), now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Development only (removed from production builds): lets an automated test
// drive the game when the browser tab is hidden and not animating.
if (import.meta.env.DEV) {
  window.__dawn = {
    sim,
    keyboard,
    debug,
    testPanel,
    startFlight,
    // Run `seconds` of game time in 1/60 s frames, then draw one frame.
    advance(seconds) {
      const frames = Math.round(seconds * 60);
      for (let i = 0; i < frames; i++) update(1 / 60);
      draw(1 / 60, loop.accumulator / loop.dt, performance.now() + 1000);
    },
  };
}
