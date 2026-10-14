// Entry point: builds the page (scene, world, input, overlays, screens) and runs the frame
// loop. The screens and how they lead to each other are in src/game/flow.js; the flight on
// screen (aircraft, fight, mission, drawing) is in src/game/session.js. Physics runs at a
// fixed 120 Hz; drawing happens once per screen refresh.

import { createScene } from './render/scene.js';
import { CameraRig } from './render/cameraRig.js';
import { AIRCRAFT_LIST } from './aircraft/index.js';
import { attachKeyboard, pressAction } from './input/keyboard.js';
import { loadBindings, saveBindings, defaultBindings, helpText, keysText } from './input/bindings.js';
import { BUTTON_LABELS } from './input/joystickMapping.js';
import { attachMouse } from './input/mouse.js';
import { attachJoystick } from './input/joystick.js';
import { createJoystickPanel } from './ui/joystickPanel.js';
import { createDebugOverlay, createHelp, createBanner, createReadout } from './ui/overlays.js';
import { createTestPanel } from './ui/testPanel.js';
import { createWorld } from './world/layout.js';
import { seedFrom } from './world/noise.js';
import { Terrain } from './render/terrain/terrain.js';
import { Clouds } from './render/clouds.js';
import { QUALITY_LEVELS, QUALITY_KEY, chooseQuality, nextQuality } from './render/quality.js';
import { FrameStats } from './ui/perfStats.js';
import { createCombatHud } from './ui/combatHud.js';
import { createHud } from './ui/hud.js';
import { createWarningBox } from './ui/warningBox.js';
import { createAudio } from './audio/audioEngine.js';
import { SKILLS, SKILL_ORDER, stepSkill } from './aircraft/aiData.js';
import { applyTestDamage } from './physics/damage.js';
import { Flow, loadConfig, saveConfig, cleanConfig } from './game/flow.js';
import { loadOptions, saveOptions } from './game/options.js';
import { createSession } from './game/session.js';
import { loadCareers, recordMission } from './game/career.js';
import { loadRoster, saveRoster, importOldCareer, activePilot, pilotTitle, enlist, rename, retire, select } from './game/pilots.js';
import { createMainMenu, createSetup, createOptions, createControls, createPause, createResults } from './ui/screens/screens.js';
import { createRollCall } from './ui/screens/rollCall.js';
import { attachMultiplayer } from './net/attachMultiplayer.js';

const DEV = import.meta.env.DEV;
const canvas = document.getElementById('game');
const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
})();
const params = new URLSearchParams(window.location.search);
let qualityName = chooseQuality(window.location.search, storage);
const parts = createScene(canvas, QUALITY_LEVELS[qualityName].maxPixels);
const { renderer, camera } = parts;
const frameStats = new FrameStats();
const rig = new CameraRig(camera);
// The world: a Western Front landscape from a seed (?seed= in development).
const world = createWorld(DEV && params.has('seed') ? seedFrom(params.get('seed')) : undefined);
const terrain = new Terrain(parts.scene, world, QUALITY_LEVELS[qualityName], renderer.capabilities.getMaxAnisotropy());
const clouds = new Clouds(parts.scene, world.seed, QUALITY_LEVELS[qualityName], parts.scene.fog);
const overlays = { debug: createDebugOverlay(), help: createHelp(), banner: createBanner(), readout: createReadout(), combatHud: createCombatHud(), hud: createHud(), warnings: createWarningBox() };
let notice = { text: '', until: 0 };
const showNotice = (text, ms = 2000) => { notice = { text, until: performance.now() + ms }; };

let config = loadConfig(storage);
let options = loadOptions(storage);
// The Pilot Roll Call. The old unnamed careers (before named pilots) are brought in once, as
// pilots waiting for a name.
let roster = importOldCareer(loadRoster(storage), loadCareers(storage));
saveRoster(storage, roster);
const pilotSide = () => activePilot(roster)?.side ?? null;
let rosterMessage = ''; // a line for the Roll Call when it opens (e.g. "Enlist a pilot first")
let lastRecord = null; // the career record of the mission just ended
const flow = new Flow('menu');

// ---- input ---------------------------------------------------------------------------------

// Sound. Browsers allow it only after a click or key press, so it starts on the first one.
const audio = createAudio();
audio.setVolume(options.volume);
for (const kind of ['pointerdown', 'keydown']) window.addEventListener(kind, () => audio.start(), { capture: true });

// The player's keys (Options > Controls), and a key and button in words for the messages.
let bindings = loadBindings(storage);
const keyHint = (action) => {
  const b = joystick.pad ? joystick.mapping.buttons[action] : null;
  const k = keysText(bindings, action);
  return `${k === '-' ? 'its key' : k}${b !== null && b !== undefined ? ` (joystick button ${b + 1})` : ''}`;
};

// What each key and joystick button does (the one-shot commands; held keys go to the InputMapper).
const keyHandlers = {
  onSelect: (i, shift) => { if (DEV && i < AIRCRAFT_LIST.length) devStart(i, shift); },
  onRestart: () => { if (flow.state === 'flying') session.restart(); }, // not in a match
  onRecentre: () => {
    mouse.stick.centre();
    showNotice('Stick centred');
  },
  onSensitivity: (step) => showNotice(`Mouse sensitivity x${mouse.adjust(step)}`),
  onCamera: () => showNotice(`Camera: ${rig.cycle()}`),
  onLook: () => {
    rig.lookToggle = !rig.lookToggle;
    showNotice(rig.lookToggle ? `Looking around (mouse moves the view; ${keyHint('look')} again to stop)` : 'Looking ahead');
  },
  onReadout: () => showNotice(overlays.readout.toggle() ? 'Instrument readout on' : 'Instrument readout off'),
  onQuality: () => applyQuality(nextQuality(qualityName)),
  onClearJam: () => clearJam(),
  onTarget: () => { if (DEV && !flow.multiplayer) newAgent(); },
  onSkill: (step) => { if (DEV) changeSkill(step); },
  onPractice: () => setOptions({ ...options, practice: !options.practice }, true),
  onMute: () => {
    audio.setMuted(!audio.muted);
    showNotice(audio.muted ? `Sound off (${keyHint('mute')} to turn it back on)` : 'Sound on', 2000);
  },
  onHud: () => {
    if (!flow.flying) return;
    setOptions({ ...options, hud: !options.hud });
    showNotice(options.hud ? `Modern HUD on (${keyHint('hud')} to hide)` : 'Modern HUD off', 2000);
  },
  onPause: () => togglePause(),
  onEscape: () => togglePause(),
  onDebug: () => overlays.debug.toggle(),
  onHelp: () => overlays.help.toggle(),
  onTestPanel: () => overlays.testPanel?.toggle(),
  onJoystickPanel: () => overlays.joystickPanel.toggle(),
  onInvert: (on) => showNotice(on ? 'Pitch inverted' : 'Pitch normal'),
};
const keyboard = attachKeyboard(keyHandlers, bindings);

const mouse = attachMouse(canvas, {
  onMove: (dx, dy) => {
    if (!rig.wantsMouse()) return false;
    rig.look(dx, dy);
    return true;
  },
  onWheel: (change) => (rig.mode === 'free' ? rig.zoom(-change * 2000) : keyboard.nudgeThrottle(change)),
  onLookButton: (down) => { rig.lookButton = down; },
  onCapture: (captured) =>
    showNotice(captured ? `Mouse flying on (Esc to release, ${keyHint('recentre')} to centre stick)` : 'Mouse released (click the game to fly with the mouse)', 3000),
  invertPitch: () => keyboard.invertPitch,
});

const joystick = attachJoystick({
  onNotice: (text) => showNotice(text, 3000),
  onAction: (action) => pressAction(action, keyHandlers, keyboard), // a button does what its key does
});
overlays.joystickPanel = createJoystickPanel(joystick);

// ---- the flight on screen ----------------------------------------------------------------

const session = createSession({
  parts, world, terrain, clouds, rig, keyboard, mouse, joystick, overlays, frameStats,
  notice: showNotice, noticeText: () => notice.text, noticeUntil: () => notice.until, quality: () => qualityName,
  hudOn: () => options.hud, audio, keyHint, options: () => options,
});
if (DEV) overlays.testPanel = createTestPanel(AIRCRAFT_LIST, (i, id) => devStart(i, false, id), (id) => applyTestDamage(session.sim.damage, id, session.sim.surfaces));

function applyQuality(name) {
  qualityName = name;
  const q = QUALITY_LEVELS[name];
  parts.setMaxPixels(q.maxPixels);
  terrain.setQuality(q);
  clouds.setQuality(q);
  terrain.prime(session.sim.state.position);
  try {
    storage?.setItem(QUALITY_KEY, name);
  } catch {
    // not remembered (private window)
  }
  showNotice(`Graphics quality: ${name}`, 2500);
}

function setOptions(next, announce = false) {
  options = next;
  saveOptions(storage, options);
  audio.setVolume(options.volume);
  session.combat.practice = options.practice;
  if (announce) showNotice(options.practice ? 'Practice mode: enemy fire cannot hurt you' : 'Practice mode off: enemy fire is real', 2500);
}

// New keys from the Controls screen: used at once, saved, and shown in the help.
function setBindings(b) {
  bindings = b;
  keyboard.setBindings(b);
  saveBindings(storage, b);
  updateHelp();
}

function updateHelp() {
  overlays.help.setText(helpText(bindings, joystick.mapping, BUTTON_LABELS));
}

function clearJam() {
  if (!session.combat.gunBank) return;
  const jammed = session.combat.gunBank.guns.some((g) => g.jammed);
  session.combat.clearJam();
  if (jammed) showNotice('Clearing the jam...', 1500);
}

// ---- pilots --------------------------------------------------------------------------------

// Apply a Roll Call change ({ roster, error }) and save it. Returns the error text or null.
function changeRoster({ roster: next, error }) {
  if (error) return error;
  roster = next;
  saveRoster(storage, roster);
  return null;
}

// The main menu's line: who is flying, or what to do first.
function pilotLine() {
  const p = activePilot(roster);
  if (p) return `Flying as ${pilotTitle(p)}, ${p.victories} ${p.victories === 1 ? 'victory' : 'victories'} in ${p.missions} missions`;
  return roster.pilots.length ? 'Choose who flies on the Pilot Roll Call' : 'Enlist a pilot on the Pilot Roll Call to begin';
}

// Fly a mission needs a pilot: without one, the Roll Call opens first.
function flyOrEnlist() {
  if (activePilot(roster)) return flow.go('setup');
  const ready = roster.pilots.some((p) => !p.needsName);
  rosterMessage = ready ? 'Choose a pilot first (Fly as)' : roster.pilots.length ? 'Name your earlier record (Name), or enlist a new pilot' : 'Enlist a pilot first';
  flow.go('roster');
}

// ---- screens -------------------------------------------------------------------------------

function fly(cfg) {
  config = cleanConfig(cfg, pilotSide());
  saveConfig(storage, config);
  session.startMission(config);
  session.combat.practice = options.practice;
  flow.go('flying');
}

const screens = {
  menu: createMainMenu({ onFly: () => flyOrEnlist(), onRoster: () => flow.go('roster'), onOptions: () => flow.go('options'), onMultiplayer: () => flow.go('multiplayer') }),
  setup: createSetup({ config, getSide: pilotSide, onFly: (cfg) => fly(cfg), onBack: () => flow.go('menu') }),
  roster: createRollCall({
    getRoster: () => roster,
    actions: {
      onEnlist: (name, side) => changeRoster(enlist(roster, name, side)),
      onRename: (id, name) => changeRoster(rename(roster, id, name)),
      onRetire: (id) => changeRoster({ roster: retire(roster, id) }),
      onSelect: (id) => changeRoster({ roster: select(roster, id) }),
    },
    onBack: () => flow.go('menu'),
  }),
  options: createOptions({
    getOptions: () => options, quality: qualityName,
    onChange: (o) => setOptions(o),
    onQuality: (q) => applyQuality(q),
    onControls: () => flow.go('controls'),
    onBack: () => flow.back(),
  }),
  controls: createControls({
    keys: {
      getBindings: () => bindings,
      onBindings: (b) => setBindings(b),
      captureNext: (f) => keyboard.captureNext(f),
      onReset: () => setBindings(defaultBindings()),
    },
    joystick,
    onBack: () => flow.go('options'),
  }),
  paused: createPause({
    onResume: () => flow.go('flying'),
    onRestart: () => {
      session.restart();
      session.combat.practice = options.practice;
      flow.go('flying');
    },
    onOptions: () => flow.go('options'),
    onEnd: () => {
      session.endMission();
      flow.go('results');
    },
    onQuit: () => flow.go('menu'),
  }),
  results: createResults({
    onAgain: () => fly(config),
    onChange: () => flow.go('setup'),
    onMenu: () => flow.go('menu'),
  }),
};
attachMultiplayer({ flow, screens, session, idle: () => idle(), notice: showNotice, pilot: () => activePilot(roster) }); // the Multiplayer, lobby and match screens

function togglePause() {
  flow.togglePause(); // a mission pauses; a match only opens its menu
}

flow.onChange((to, from) => {
  audio.setActive(flow.flying); // sound only while flying: it fades out when paused and in the menus
  for (const [name, screen] of Object.entries(screens)) if (name !== to) screen.hide();
  if (to === 'results' && session.result) {
    const pilot = activePilot(roster);
    lastRecord = pilot ? { ...recordMission(pilot, session.result, config.skill, options.practice), pilot: pilot.name } : null;
    saveRoster(storage, roster);
    screens.results.show(session.result, lastRecord);
  } else if (to === 'menu') screens.menu.show(pilotLine());
  else if (to === 'roster') {
    screens.roster.show(rosterMessage);
    rosterMessage = '';
  }
  else if (screens[to]) screens[to].show();
  if (!flow.flying && document.pointerLockElement) document.exitPointerLock(); // the mouse is for the menus now
  overlays.help.allow(flow.flying); // the keys help only in flight
  if (from === 'controls') updateHelp(); // the joystick's buttons may have changed too
  // Leaving a mission for the menu: the idle aircraft goes back on the airfield behind the menus.
  if (to === 'menu' && (from === 'paused' || from === 'results')) idle();
});

// The aircraft parked on the airfield behind the menus (the mission settings' aircraft, no enemies).
function idle() {
  session.startMission({ ...config, enemyCount: 0, start: 'airfield' }, false);
}

// ---- development quick starts ----------------------------------------------------------------

function devStart(index, airStart, scenario = null) {
  if (flow.multiplayer) return; // never in the middle of a match
  session.startDev(index, airStart, scenario);
  session.combat.practice = options.practice;
  if (airStart && !scenario) {
    const n = Math.min(4, Math.max(0, Number.parseInt(params.get('enemies') ?? '2', 10) || 0));
    for (let i = 0; i < n; i++) session.combat.spawnAgent(session.sim);
  }
  flow.force('flying');
}

function newAgent() {
  const a = session.combat.spawnAgent(session.sim);
  showNotice(a ? `Enemy: ${a.aircraft.name} (${SKILLS[a.skill].name}${a.isDrone ? `, ${a.pattern}` : ''})` : 'Four enemies are already up', 2500);
}

function changeSkill(step) {
  session.combat.skill = stepSkill(session.combat.skill, step);
  showNotice(`New enemies: ${SKILLS[session.combat.skill].name} (N adds one)`, 2500);
}

// ---- the frame loop ------------------------------------------------------------------------

idle();
updateHelp();
if (DEV && SKILL_ORDER.includes(params.get('skill'))) session.combat.skill = params.get('skill');
screens.menu.show(pilotLine());
overlays.help.allow(false);

let lastTime = performance.now();
let errorsShown = 0;
function showError(err) {
  if (errorsShown++ < 3) console.error(err);
  overlays.banner.set(`ERROR: ${err?.message ?? err} (press F12 to see the details)`);
}
window.addEventListener('error', (e) => showError(e.error ?? e.message));

let controlsShownAt = 0;
function step(realDt, now) {
  const alpha = session.update(realDt, flow.simulating);
  if (flow.state === 'controls' && now - controlsShownAt > 100) { // the joystick tab's live bars
    controlsShownAt = now;
    screens.controls.update();
  }
  if (flow.flying && session.result) flow.go('results'); // the mission is over
  session.draw(realDt, alpha, now, !flow.flying);
}

function frame(now) {
  requestAnimationFrame(frame); // keep the loop going whatever happens below
  try {
    frameStats.push(now - lastTime, now);
    const realDt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    step(realDt, now);
  } catch (err) {
    showError(err);
  }
}
requestAnimationFrame(frame);

// Development only (removed from production builds): lets an automated test drive the game
// when the browser tab is hidden and not animating.
if (DEV) {
  window.__dawn = {
    session, flow, screens, world, terrain, clouds, renderer, keyboard, joystick, rig, frameStats, audio,
    debug: overlays.debug, testPanel: overlays.testPanel, applyQuality, fly, devStart,
    get sim() { return session.sim; },
    get combat() { return session.combat; },
    startFlight: (i) => devStart(i, false),
    // Run `seconds` of game time in 1/60 s frames, then draw one frame.
    advance(seconds) {
      const frames = Math.round(seconds * 60);
      for (let i = 0; i < frames; i++) {
        session.update(1 / 60, flow.flying);
        if (flow.flying && session.result) flow.go('results');
      }
      session.draw(1 / 60, 1, performance.now() + 1000, !flow.flying);
    },
  };
}
