// One flight on screen: the player's aircraft and its model and cockpit, the fight, the
// mission watcher, and drawing each frame. Built once by main.js; a new mission (or the
// idle aircraft behind the menus) replaces everything from the last one, so nothing is
// left over between missions.

import { Vector3 } from 'three';
import { createAircraftMesh, setControlSurfaces } from '../render/aircraftMesh.js';
import { createCockpit } from '../render/cockpit.js';
import { createInstrumentPanel } from '../ui/instrumentPanel.js';
import { readoutText } from '../ui/instrumentMath.js';
import { attitude, startScenario, SCENARIOS } from '../dev/flightScenarios.js';
import { FixedStepLoop } from '../core/fixedStepLoop.js';
import { Simulation } from '../core/simulation.js';
import { AIRCRAFT_LIST, common } from '../aircraft/index.js';
import { mixJoystick } from '../input/mouse.js';
import { debugLines, airfieldLine } from '../ui/debugText.js';
import { deflections } from '../physics/controls.js';
import { Combat } from './combat.js';
import { TracerView, EffectsView } from '../render/bullets.js';
import { TargetViews } from '../render/targetViews.js';
import { combatText, combatLines } from '../ui/combatHud.js';
import { damagedDeflections, damageLines, pilotDead } from '../physics/damage.js';
import { showDamage } from '../render/damageView.js';
import { perfLines } from '../ui/perfStats.js';
import { startMission } from './mission.js';
import { applyTimeOfDay } from '../render/sky.js';

const JOYSTICK_HINT = 'Joystick not detected: click the game window and press the trigger (Chrome shows it only after a button press)';

// ctx: { parts (createScene's result), world, terrain, clouds, rig, keyboard, mouse, joystick,
//        overlays: { debug, banner, readout, combatHud, testPanel, joystickPanel }, notice(text, ms),
//        frameStats, quality() }
export function createSession(ctx) {
  const { parts, world, terrain, clouds, rig, keyboard, mouse, joystick, overlays, notice } = ctx;
  const { scene, camera, renderer, ground, groundTile } = parts;
  const solidAt = (x, y, z) => terrain.solids.hit(x, y, z);
  const sim = new Simulation();
  sim.solidAt = solidAt; // trees and buildings can be crashed into
  const combat = new Combat({ solidAt });
  const loop = new FixedStepLoop();
  const tracers = new TracerView(scene);
  const effects = new EffectsView(scene);
  const targetViews = new TargetViews(scene);
  const sightPoint = new Vector3();
  const drawPosition = { x: 0, z: 0 };

  const s = {
    sim,
    combat,
    config: null, // the mission being flown
    watcher: null, // its watcher (null for the idle aircraft behind the menus)
    result: null, // set when the mission has ended
    model: null,
    cockpit: null,
    panel: null,
    runner: null, // development: a scripted test pilot
    scenarioLabel: '',
    wasJammed: false,
    lastOverlay: 0,
    joystickHintAt: performance.now() + 5000,
  };

  // The aircraft model, its cockpit and instrument panel.
  function buildAircraft(ac) {
    if (s.model) scene.remove(s.model.group);
    s.model = createAircraftMesh(ac);
    scene.add(s.model.group);
    s.panel = createInstrumentPanel(ac);
    s.cockpit = createCockpit(ac, s.panel.texture);
    s.model.group.add(s.cockpit);
  }

  function afterStart(ac, input) {
    keyboard.reset(input);
    mouse.stick.centre();
    rig.reset();
    terrain.prime(sim.state.position); // the ground around the start, built before the first frame
    targetViews.clear();
    effects.update(combat.events, 0);
    s.result = null;
    s.wasJammed = false;
  }

  // Start a mission from its settings (or, with watch = false, the idle aircraft behind the menus).
  s.startMission = (config, watch = true) => {
    s.config = config;
    s.runner = null;
    const ac = AIRCRAFT_LIST.find((a) => a.id === config.aircraft) ?? AIRCRAFT_LIST[0];
    buildAircraft(ac);
    const { input, watcher } = startMission(config, { sim, combat, world });
    s.watcher = watch ? watcher : null;
    applyTimeOfDay({ ...parts, clouds }, config.timeOfDay);
    s.scenarioLabel = `${ac.name}: mission`;
    afterStart(ac, input);
  };

  s.restart = () => {
    if (s.config) s.startMission(s.config, Boolean(s.watcher));
  };

  // Development only: the old quick starts (number keys, the F4 test panel's scenarios).
  s.startDev = (index, airStart, scenario = null) => {
    const ac = AIRCRAFT_LIST[index];
    s.config = null;
    s.watcher = null;
    buildAircraft(ac);
    let input;
    if (scenario) {
      const sc = startScenario(sim, ac, scenario);
      input = sc.input;
      s.runner = sc.runner;
      s.scenarioLabel = `${ac.name}: ${SCENARIOS.find((x) => x.id === scenario).label}`;
    } else {
      input = airStart ? sim.start(ac) : sim.startOnGround(ac);
      s.runner = null;
      s.scenarioLabel = `${ac.name}: ${airStart ? 'air start' : 'airfield start'}`;
    }
    combat.reset(ac);
    afterStart(ac, input);
    return ac;
  };

  // The pause menu's End mission.
  s.endMission = () => {
    if (s.watcher) s.result = s.watcher.end(sim, combat);
    return s.result;
  };

  // Read the controls and run as many fixed physics steps as realDt calls for (only while
  // flying). Returns alpha, how far we are between the last two physics states.
  s.update = (realDt, flying) => {
    const joy = joystick.poll(); // read even when paused, so the pause button works
    if (!flying) return 1;
    const keys = keyboard.update(realDt); // the keyboard's own input object, so throttle and trim changes below carry on
    if (joy) {
      // The slider sets the throttle only while it is being moved; the trim buttons work like the trim keys.
      if (joy.throttle !== null) keyboard.setThrottle(joy.throttle);
      keyboard.nudgeTrim((joy.held.has('trimUp') ? 1 : 0) - (joy.held.has('trimDown') ? 1 : 0), realDt);
    }
    rig.hat = joy ? joy.hat : { x: 0, y: 0 };
    const held = { pitch: keyboard.pitchKeyHeld(), roll: keyboard.rollKeyHeld(), yaw: keyboard.rudderKeyHeld() };
    const input = { ...keys, ...mixJoystick(keys, mouse.stick, joy, held), fire: Boolean(joy?.fire) || keyboard.isDown('fire') };
    if (import.meta.env.DEV && s.runner && (keyboard.pilotActive() || joy?.pull || joy?.roll || joy?.yaw)) s.runner.cancel();
    return loop.advance(realDt, (dt) => {
      if (import.meta.env.DEV && s.runner) s.runner.apply(input, dt);
      sim.step(dt, input);
      combat.step(dt, sim, input.fire);
      if (s.watcher && !s.result) s.result = s.watcher.update(dt, sim, combat);
    }).alpha;
  };

  // Draw one frame. paused: the game is paused or a menu is up (no gun sight, no messages).
  s.draw = (realDt, alpha, now, paused) => {
    const { position, quaternion } = sim.interpolate(alpha);
    const model = s.model;
    model.group.position.copy(position);
    model.group.quaternion.copy(quaternion);
    setControlSurfaces(model, damagedDeflections(sim.damage, deflections(common, sim.surfaces), common)); // a cut cable leaves one stuck
    showDamage(model, sim.damage); // a broken wing disappears
    const d = sim.diag;
    if (d && !paused) model.prop.rotation.x += (d.rpm / 60) * Math.PI * 2 * realDt * 0.15; // slowed so it reads on screen

    // Keep the ground under the aircraft, in whole tiles so it never swims.
    drawPosition.x = Math.round(position.x / groundTile) * groundTile;
    drawPosition.z = Math.round(position.z / groundTile) * groundTile;
    ground.position.set(drawPosition.x, -4, drawPosition.z);

    terrain.update(camera.position, 3); // new ground, a few milliseconds a frame at most
    clouds.update(camera.position, now / 1000);
    s.cockpit.visible = rig.mode === 'cockpit';
    for (const part of model.hideInCockpit) part.visible = !s.cockpit.visible;
    rig.update(sim.aircraft, position, quaternion, realDt);

    // The fight: tracers, strikes, enemy aircraft, the gun sight and the gun status.
    targetViews.update(combat.agents, alpha, realDt);
    tracers.update(combat.bullets, camera, alpha, 1 / 120);
    effects.update(combat.events, paused ? 0 : realDt);
    for (const text of combat.messages.splice(0)) notice(text, 3000);
    for (const text of sim.damage.events.splice(0)) notice(text, 3000); // the player's own damage
    const jammed = Boolean(combat.gunBank?.guns.some((g) => g.jammed));
    if (jammed && !s.wasJammed) notice('Gun jammed: press B (joystick button 9) to clear it', 3500);
    s.wasJammed = jammed;
    camera.updateMatrixWorld();
    overlays.combatHud.update(combat.sightPoint(sim, sightPoint), camera, !sim.crashed && !paused, paused ? '' : combatText(combat, sim.damage));

    if (now - s.lastOverlay > 100) {
      s.lastOverlay = now;
      const message = now < ctx.noticeUntil() ? ctx.noticeText() : '';
      overlays.banner.set(paused ? '' : sim.crashed ? `CRASHED: ${sim.crashReason}` : pilotDead(sim.damage) ? 'PILOT KILLED' : message);
      const stick = joystick.pad;
      if (!stick && now > s.joystickHintAt && joystick.seenBefore) {
        notice(JOYSTICK_HINT, 8000);
        console.info(`[Dawn Patrol] ${JOYSTICK_HINT}. ${joystick.describe()}`);
        s.joystickHintAt = now + 30000;
      }
      if (overlays.debug.visible) {
        const nearest = world.nearestAirfield(sim.state.position.x, sim.state.position.z);
        overlays.debug.set(debugLines(sim.aircraft, sim.diag, {
          crashed: sim.crashed, paused, joystick: stick ? stick.id : 'not detected', airfield: airfieldLine(nearest),
          extra: [...perfLines(ctx.frameStats, renderer.info.render, ctx.quality(), parts.view, terrain.stats()), ...combatLines(combat), ...damageLines(sim.damage, sim.aircraft)],
        }));
      }
      if (import.meta.env.DEV && overlays.testPanel?.visible) overlays.testPanel.update(sim, s.runner, s.scenarioLabel);
      if (overlays.joystickPanel.visible) overlays.joystickPanel.update();
      const heading = attitude(sim.state).heading;
      if (rig.mode === 'cockpit') s.panel.update(sim.diag, heading);
      overlays.readout.set(paused ? '' : readoutText(sim.aircraft, sim.diag, heading), rig.mode !== 'cockpit');
    }
    renderer.render(scene, camera);
  };

  return s;
}
