// Entry point: wires the simulation, input, rendering and overlays together.
// Physics runs at a fixed 120 Hz; drawing happens once per screen refresh.

import { createScene } from './render/scene.js';
import { createAircraftMesh } from './render/aircraftMesh.js';
import { CameraRig } from './render/cameraRig.js';
import { createCockpit } from './render/cockpit.js';
import { createInstrumentPanel } from './ui/instrumentPanel.js';
import { readoutText } from './ui/instrumentMath.js';
import { attitude } from './dev/flightScenarios.js';
import { FixedStepLoop } from './core/fixedStepLoop.js';
import { Simulation } from './core/simulation.js';
import { AIRCRAFT_LIST } from './aircraft/index.js';
import { attachKeyboard } from './input/keyboard.js';
import { attachMouse, mixJoystick } from './input/mouse.js';
import { attachJoystick } from './input/joystick.js';
import { createJoystickPanel } from './ui/joystickPanel.js';
import { createDebugOverlay, createHelp, createBanner, createReadout } from './ui/overlays.js';
import { debugLines, airfieldLine } from './ui/debugText.js';
import { createTestPanel } from './ui/testPanel.js';
import { startScenario, SCENARIOS } from './dev/flightScenarios.js';
import { createWorld } from './world/layout.js';
import { setControlSurfaces } from './render/aircraftMesh.js';
import { deflections } from './physics/controls.js';
import { common } from './aircraft/index.js';
import { seedFrom } from './world/noise.js';
import { Terrain } from './render/terrain/terrain.js';
import { Clouds } from './render/clouds.js';
import { QUALITY_LEVELS, QUALITY_KEY, chooseQuality, nextQuality } from './render/quality.js';
import { FrameStats, perfLines } from './ui/perfStats.js';
import { Vector3 } from 'three';
import { Combat } from './game/combat.js';
import { TracerView, EffectsView } from './render/bullets.js';
import { TargetViews } from './render/targetViews.js';
import { createCombatHud, combatText, combatLines } from './ui/combatHud.js';
import { SKILLS, SKILL_ORDER, stepSkill } from './aircraft/aiData.js';
import { applyTestDamage, damagedDeflections, damageLines, pilotDead } from './physics/damage.js';
import { showDamage } from './render/damageView.js';

const canvas = document.getElementById('game');
// Graphics quality: ?quality= in the address, else the level saved in this browser, else Medium; L changes it.
const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
})();
let qualityName = chooseQuality(window.location.search, storage);
const { renderer, scene, camera, ground, groundTile, view, setMaxPixels } = createScene(canvas, QUALITY_LEVELS[qualityName].maxPixels);
const frameStats = new FrameStats();
const loop = new FixedStepLoop();
const sim = new Simulation();
const rig = new CameraRig(camera);
// The world: a Western Front landscape from a seed (?seed=), drawn at a quality level (?quality=).
const params = new URLSearchParams(window.location.search);
const world = createWorld(params.has('seed') ? seedFrom(params.get('seed')) : undefined);
const terrain = new Terrain(scene, world, QUALITY_LEVELS[qualityName], renderer.capabilities.getMaxAnisotropy());
const clouds = new Clouds(scene, world.seed, QUALITY_LEVELS[qualityName], scene.fog);
// The fight: guns, bullets and target aircraft. Trees and buildings stop bullets too.
const solidAt = (x, y, z) => terrain.solids.hit(x, y, z);
const combat = new Combat({ solidAt });
const tracers = new TracerView(scene);
const effects = new EffectsView(scene);
const targetViews = new TargetViews(scene);
const combatHud = createCombatHud();
const sightPoint = new Vector3();
// Enemies of an air start: ?enemies=3 and ?skill=drone|novice|regular|ace in the address (until the mission screen).
const startEnemies = Math.min(4, Math.max(0, Number.parseInt(new URLSearchParams(window.location.search).get('enemies') ?? '2', 10) || 0));
const askedSkill = new URLSearchParams(window.location.search).get('skill');
if (SKILL_ORDER.includes(askedSkill)) combat.skill = askedSkill;
const debug = createDebugOverlay();
const help = createHelp();
const banner = createBanner();
const readout = createReadout();
let cockpit = null; // cockpit geometry for the current aircraft (shown in the cockpit view)
let panel = null; // its instrument panel

let aircraftIndex = 0;
let airStart = false; // false: start parked on the airfield; true: in the air at 1,000 m
let model = null; // { group, prop } for the current aircraft
let paused = false;
let notice = { text: '', until: 0 }; // short on-screen message
let wasJammed = false; // for the one-off "gun jammed" message

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
  onCamera: () => showNotice(`Camera: ${rig.cycle()}`),
  onLook: () => {
    rig.lookToggle = !rig.lookToggle;
    showNotice(rig.lookToggle ? 'Looking around (mouse moves the view; V again to stop)' : 'Looking ahead');
  },
  onReadout: () => showNotice(readout.toggle() ? 'Instrument readout on' : 'Instrument readout off'),
  onQuality: () => applyQuality(nextQuality(qualityName)),
  onClearJam: () => clearJam(),
  onTarget: () => newAgent(),
  onSkill: (step) => changeSkill(step),
  onPractice: () => togglePractice(),
  onPause: () => { paused = !paused; },
  onDebug: () => debug.toggle(),
  onHelp: () => help.toggle(),
  onTestPanel: () => testPanel?.toggle(),
  onJoystickPanel: () => joystickPanel.toggle(),
});

if (import.meta.env.DEV) testPanel = createTestPanel(AIRCRAFT_LIST, (i, id) => startFlight(i, id), (id) => applyTestDamage(sim.damage, id, sim.surfaces));

const mouse = attachMouse(canvas, {
  onMove: (dx, dy) => {
    if (!rig.wantsMouse()) return false;
    rig.look(dx, dy);
    return true;
  },
  onWheel: (change) => (rig.mode === 'free' ? rig.zoom(-change * 2000) : keyboard.nudgeThrottle(change)),
  onLookButton: (down) => {
    rig.lookButton = down;
  },
  onCapture: (captured) =>
    showNotice(captured ? 'Mouse flying on (Esc to release, X to centre stick)' : 'Mouse released (click the game to fly with the mouse)', 3000),
  invertPitch: () => keyboard.invertPitch,
});

// Switch graphics quality: the terrain and clouds are rebuilt for the new level and the
// screen is redrawn with its pixel budget. Remembered in this browser.
function applyQuality(name) {
  qualityName = name;
  const q = QUALITY_LEVELS[name];
  setMaxPixels(q.maxPixels);
  terrain.setQuality(q);
  clouds.setQuality(q);
  terrain.prime(sim.state.position);
  try {
    storage?.setItem(QUALITY_KEY, name);
  } catch {
    // not remembered (private window)
  }
  showNotice(`Graphics quality: ${name}`, 2500);
}

// USB joystick: buttons call the same actions as the keys.
const joystick = attachJoystick({
  onNotice: (text) => showNotice(text, 3000),
  onCamera: () => showNotice(`Camera: ${rig.cycle()}`),
  onReadout: () => showNotice(readout.toggle() ? 'Instrument readout on' : 'Instrument readout off'),
  onCentre: () => {
    mouse.stick.centre();
    showNotice('Stick centred');
  },
  onPause: () => { paused = !paused; },
  onRestart: () => startFlight(aircraftIndex),
  onClearJam: () => clearJam(),
});
const joystickPanel = createJoystickPanel(joystick);

function clearJam() {
  if (!combat.gunBank) return;
  const jammed = combat.gunBank.guns.some((g) => g.jammed);
  combat.clearJam();
  if (jammed) showNotice('Clearing the jam...', 1500);
}

// Put a new enemy in the fight (a drone ahead of you, or an AI pilot on patrol round you).
function newAgent() {
  const a = combat.spawnAgent(sim);
  showNotice(a ? `Enemy: ${a.aircraft.name} (${SKILLS[a.skill].name}${a.isDrone ? `, ${a.pattern}` : ''})` : 'Four enemies are already up', 2500);
}

// [ and ] step the skill that new enemies get: Drone, Novice, Regular, Ace.
function changeSkill(step) {
  combat.skill = stepSkill(combat.skill, step);
  showNotice(`New enemies: ${SKILLS[combat.skill].name} (N adds one)`, 2500);
}

// Y: practice mode, where enemy fire cannot hurt you.
function togglePractice() {
  combat.practice = !combat.practice;
  showNotice(combat.practice ? 'Practice mode: enemy fire cannot hurt you' : 'Practice mode off: enemy fire is real', 2500);
}

// Start a flight; `scenario` is a test-panel scenario id (normal start if omitted).
function startFlight(index, scenario = null) {
  aircraftIndex = index;
  const ac = AIRCRAFT_LIST[index];
  if (model) scene.remove(model.group);
  model = createAircraftMesh(ac);
  scene.add(model.group);
  panel = createInstrumentPanel(ac);
  cockpit = createCockpit(ac, panel.texture);
  model.group.add(cockpit);
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
  rig.reset();
  terrain.prime(sim.state.position); // the ground around the start, built before the first frame
  combat.reset(ac); // full belts, no enemies
  targetViews.clear();
  if (airStart && !scenario) for (let i = 0; i < startEnemies; i++) combat.spawnAgent(sim); // an air start brings the enemies
  paused = false;
}

// Trees and buildings can be crashed into: the simulation asks the terrain what is at a point.
sim.solidAt = solidAt;

startFlight(aircraftIndex);

let lastOverlay = 0;
let joystickHintAt = performance.now() + 5000; // when to remind the player to wake the joystick
const JOYSTICK_HINT = 'Joystick not detected: click the game window and press the trigger (Chrome shows it only after a button press)';
const drawPosition = { x: 0, z: 0 };

// Read the keys and run as many fixed physics steps as realDt calls for.
// Returns alpha, how far we are between the last two physics states.
function update(realDt) {
  const joy = joystick.poll(); // read even when paused, so the pause button can unpause
  if (paused) return 1;
  const keys = keyboard.update(realDt); // the keyboard's own input object, so throttle and trim changes below carry on
  if (joy) {
    // The slider sets the throttle only while it is being moved; the trim
    // buttons work like the trim keys; the hat turns the view.
    if (joy.throttle !== null) keyboard.setThrottle(joy.throttle);
    keyboard.nudgeTrim((joy.held.has('trimUp') ? 1 : 0) - (joy.held.has('trimDown') ? 1 : 0), realDt);
  }
  rig.hat = joy ? joy.hat : { x: 0, y: 0 };
  // Keyboard, mouse stick and joystick combined into the controls the aircraft feels.
  const held = { pitch: keyboard.pitchKeyHeld(), roll: keyboard.rollKeyHeld(), yaw: keyboard.rudderKeyHeld() };
  const input = { ...keys, ...mixJoystick(keys, mouse.stick, joy, held), fire: Boolean(joy?.fire) || keyboard.isDown('fire') };
  // A flight key or stick movement hands control back from a scripted test pilot.
  if (import.meta.env.DEV && runner && (keyboard.pilotActive() || joy?.pull || joy?.roll || joy?.yaw)) runner.cancel();
  return loop.advance(realDt, (dt) => {
    if (import.meta.env.DEV && runner) runner.apply(input, dt);
    sim.step(dt, input);
    combat.step(dt, sim, input.fire);
  }).alpha;
}

// Draw one frame from the current state.
function draw(realDt, alpha, now) {
  const { position, quaternion } = sim.interpolate(alpha);
  model.group.position.copy(position);
  model.group.quaternion.copy(quaternion);
  setControlSurfaces(model, damagedDeflections(sim.damage, deflections(common, sim.surfaces), common)); // ailerons, elevators and rudder follow the controls (a cut cable leaves one stuck)
  showDamage(model, sim.damage); // a broken wing disappears
  const d = sim.diag;
  if (d) model.prop.rotation.x += (d.rpm / 60) * Math.PI * 2 * realDt * 0.15; // slowed so it reads on screen

  // Keep the ground under the aircraft, in whole texture tiles so it never swims.
  drawPosition.x = Math.round(position.x / groundTile) * groundTile;
  drawPosition.z = Math.round(position.z / groundTile) * groundTile;
  ground.position.set(drawPosition.x, -4, drawPosition.z); // the fallback ground sits well below the tiles so they never share a plane

  terrain.update(camera.position, 3); // new ground, a few milliseconds a frame at most
  clouds.update(camera.position, now / 1000);
  cockpit.visible = rig.mode === 'cockpit';
  for (const part of model.hideInCockpit) part.visible = !cockpit.visible;
  rig.update(sim.aircraft, position, quaternion, realDt);

  // The fight: tracers, strikes, target aircraft, the gun sight and the gun status.
  targetViews.update(combat.agents, alpha, realDt);
  tracers.update(combat.bullets, camera, alpha, 1 / 120);
  effects.update(combat.events, realDt);
  for (const text of combat.messages.splice(0)) showNotice(text, 3000);
  for (const text of sim.damage.events.splice(0)) showNotice(text, 3000); // the player's own damage
  const jammed = Boolean(combat.gunBank?.guns.some((g) => g.jammed));
  if (jammed && !wasJammed) showNotice('Gun jammed: press B (joystick button 9) to clear it', 3500);
  wasJammed = jammed;
  camera.updateMatrixWorld();
  combatHud.update(combat.sightPoint(sim, sightPoint), camera, !sim.crashed && !paused, combatText(combat, sim.damage));

  if (now - lastOverlay > 100) {
    lastOverlay = now;
    const message = now < notice.until ? notice.text : '';
    banner.set(sim.crashed ? `CRASHED: ${sim.crashReason} - press R` : pilotDead(sim.damage) ? 'PILOT KILLED - press R' : paused ? 'PAUSED' : message);
    const stick = joystick.pad;
    // A joystick seen before but missing now: remind how to wake it, and say what the browser can see.
    if (!stick && now > joystickHintAt && joystick.seenBefore) {
      showNotice(JOYSTICK_HINT, 8000);
      console.info(`[Dawn Patrol] ${JOYSTICK_HINT}. ${joystick.describe()}`);
      joystickHintAt = now + 30000;
    }
    if (debug.visible) {
      const nearest = world.nearestAirfield(sim.state.position.x, sim.state.position.z);
      debug.set(debugLines(sim.aircraft, sim.diag, {
        crashed: sim.crashed, paused, joystick: stick ? stick.id : 'not detected', airfield: airfieldLine(nearest),
        extra: [...perfLines(frameStats, renderer.info.render, qualityName, view, terrain.stats()), ...combatLines(combat), ...damageLines(sim.damage, sim.aircraft)],
      }));
    }
    if (import.meta.env.DEV && testPanel?.visible) testPanel.update(sim, runner, scenarioLabel);
    if (joystickPanel.visible) joystickPanel.update();
    const heading = attitude(sim.state).heading;
    if (rig.mode === 'cockpit') panel.update(sim.diag, heading);
    readout.set(readoutText(sim.aircraft, sim.diag, heading), rig.mode !== 'cockpit');
  }
  renderer.render(scene, camera);
}

let lastTime = performance.now();

let errorsShown = 0;
function showError(err) {
  if (errorsShown++ < 3) console.error(err);
  banner.set(`ERROR: ${err?.message ?? err} (press F12 to see the details)`);
}
window.addEventListener('error', (e) => showError(e.error ?? e.message));

function frame(now) {
  requestAnimationFrame(frame); // keep the loop going whatever happens below
  try {
    frameStats.push(now - lastTime, now); // the real time since the last frame, for the F3 readout
    const realDt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    draw(realDt, update(realDt), now);
  } catch (err) {
    showError(err);
  }
}

requestAnimationFrame(frame);

// Development only (removed from production builds): lets an automated test
// drive the game when the browser tab is hidden and not animating.
if (import.meta.env.DEV) {
  window.__dawn = {
    sim,
    terrain,
    clouds,
    applyQuality,
    frameStats,
    world,
    renderer,
    keyboard,
    joystick,
    rig,
    combat,
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
