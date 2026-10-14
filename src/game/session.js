// One flight on screen: the player's aircraft and its model and cockpit, the fight, the
// mission watcher, and drawing each frame. Built once by main.js; a new mission (or the
// idle aircraft behind the menus) replaces everything from the last one, so nothing is
// left over between missions. In a multiplayer match `s.net` (src/net/netFlight.js) takes the
// physics steps and supplies the other players' aircraft; everything else is the same.

import { Vector3 } from 'three';
import { createAircraftMesh, setControlSurfaces, setUpperWingChord } from '../render/aircraftMesh.js';
import { COCKPITS } from '../aircraft/cockpits.js';
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
import { damagedDeflections, damageLines, pilotDead, engineSeized, fuelOut } from '../physics/damage.js';
import { showDamage } from '../render/damageView.js';
import { perfLines } from '../ui/perfStats.js';
import { startMission } from './mission.js';
import { enemyLabel } from '../ui/hudMath.js';
import { applyTimeOfDay, skyFor } from '../render/sky.js';
import { skyEnvironment } from '../render/cockpit/environment.js';
import { setEnvironment } from '../render/cockpit/materials.js';
import { QUALITY_LEVELS } from '../render/quality.js';
import { createAutoRudder } from '../physics/assists.js';
import { warnings, warningLines, warningSound } from './warnings.js';

const JOYSTICK_HINT = 'Joystick not detected: click the game window and press the trigger (Chrome shows it only after a button press)';

// ctx: { parts (createScene's result), world, terrain, clouds, rig, keyboard, mouse, joystick,
//        overlays: { debug, banner, readout, combatHud, testPanel, joystickPanel }, notice(text, ms),
//        frameStats, quality(), hudOn(), audio (createAudio()), keyHint(action): its key and button in words,
//        options(): the player's options (the assists) }
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
  const autoRudder = createAutoRudder();
  const noWarnings = { stall: false, load: null, speed: null, structure: true };
  const drawPosition = { x: 0, z: 0 };

  const s = {
    sim,
    combat,
    config: null, // the mission being flown
    watcher: null, // its watcher (null for the idle aircraft behind the menus)
    result: null, // set when the mission has ended
    model: null,
    cockpit: null, // { group, materials, animate }
    panel: null,
    sky: skyFor('day'), // the time of day's colours and sun
    env: null, // the sky picture the cockpit's metal and glass reflect
    shadowSize: 0, // the sun's shadow map size in use (0 = no shadows)
    runner: null, // development: a scripted test pilot
    scenarioLabel: '',
    wasJammed: false,
    wasCrashed: false, // for the crash sound
    lastOverlay: 0,
    joystickHintAt: performance.now() + 5000,
    net: null, // a multiplayer match (NetFlight), or null
  };

  // The aircraft model, its cockpit and instrument panel.
  function buildAircraft(ac) {
    if (s.model) scene.remove(s.model.group);
    s.model = createAircraftMesh(ac);
    scene.add(s.model.group);
    s.panel = createInstrumentPanel(ac, ctx.quality() === 'high' ? 512 : 256);
    s.cockpit = createCockpit(ac, s.panel, s.model);
    s.model.group.add(s.cockpit.group);
    // Shadows on the cockpit come from the cockpit itself and the wings and struts above it.
    s.model.group.traverse((o) => { if (o.isMesh) o.castShadow = !o.material.transparent; });
    if (!s.env) s.env = skyEnvironment(renderer, s.sky);
    setEnvironment(s.cockpit.materials, s.env);
  }

  // The light of the mission's time of day, and the sky the cockpit reflects.
  function setTimeOfDay(time) {
    s.sky = applyTimeOfDay({ ...parts, clouds }, time);
    s.env?.dispose();
    s.env = skyEnvironment(renderer, s.sky);
    setEnvironment(s.cockpit.materials, s.env);
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
    s.wasCrashed = false;
    combat.sounds.length = 0;
    autoRudder.reset();
  }

  // Leave multiplayer mode: back to single-player physics (the terrain's own trees and buildings).
  function offline() {
    s.net = null;
    sim.solidAt = solidAt;
  }

  // Start a mission from its settings (or, with watch = false, the idle aircraft behind the menus).
  s.startMission = (config, watch = true) => {
    offline();
    s.config = config;
    s.runner = null;
    const ac = AIRCRAFT_LIST.find((a) => a.id === config.aircraft) ?? AIRCRAFT_LIST[0];
    buildAircraft(ac);
    const { input, watcher } = startMission(config, { sim, combat, world });
    s.watcher = watch ? watcher : null;
    setTimeOfDay(config.timeOfDay);
    s.scenarioLabel = `${ac.name}: mission`;
    afterStart(ac, input);
  };

  s.restart = () => {
    if (s.config) s.startMission(s.config, Boolean(s.watcher));
  };

  // Development only: the old quick starts (number keys, the F4 test panel's scenarios).
  s.startDev = (index, airStart, scenario = null) => {
    offline();
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

  // A multiplayer match: `net` flies the player's aircraft (it is put where the server has it
  // when the first snapshot arrives) and supplies the others.
  s.startNet = (ac, timeOfDay, net) => {
    s.config = null;
    s.watcher = null;
    s.runner = null;
    buildAircraft(ac);
    combat.reset(ac); // guns and sight (no AI aircraft in a match)
    s.net = net;
    net.attach(sim, ac);
    setTimeOfDay(timeOfDay);
    s.scenarioLabel = `${ac.name}: multiplayer`;
    afterStart(ac, sim.startInput);
  };
  s.stopNet = () => offline();

  // The pilot's controls back to a fresh aircraft's (a match's start or a respawn).
  s.resetControls = (input) => {
    keyboard.reset(input);
    mouse.stick.centre();
    autoRudder.reset();
    terrain.prime(sim.state.position);
  };

  // The pause menu's End mission.
  s.endMission = () => {
    if (s.watcher) s.result = s.watcher.end(sim, combat);
    return s.result;
  };

  // What the auto-rudder needs to know of the aircraft's motion (body rates and attitude).
  const motion = (state) => {
    const a = attitude(state);
    return { yawRate: -state.angularVelocity.y, rollRate: state.angularVelocity.x, bank: a.bank, pitch: a.pitch };
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
    const o = ctx.options?.() ?? {};
    // Options: g and overspeed break the wings (in a match the host's setting, the same for all).
    sim.structuralDamage = s.net ? s.net.settings.structuralDamage : o.structuralDamage !== false;
    if (!o.autoRudder) autoRudder.reset();
    return loop.advance(realDt * (s.net ? s.net.timeScale : 1), (dt) => {
      if (import.meta.env.DEV && s.runner) s.runner.apply(input, dt);
      // Auto-rudder (Options) works the rudder only, through the same flight model.
      const hands = o.autoRudder ? autoRudder.apply(input, sim.diag, dt, motion(sim.state)) : input;
      if (s.net) return s.net.step(dt, hands); // a match: the step is predicted and sent
      sim.step(dt, hands);
      combat.step(dt, sim, input.fire);
      if (s.watcher && !s.result) s.result = s.watcher.update(dt, sim, combat);
    }).alpha;
  };

  // The sound for this frame: the player's engine and the wind, the enemies' engines, and the
  // fight's one-shot sounds (gunfire, near misses, hits), heard from the camera.
  const _right = new Vector3();
  const crankRpm = (ac, propRpm) => propRpm / (ac.propeller.gearRatio || 1);
  function feedAudio(paused, warning) {
    const ac = sim.aircraft;
    const d = sim.diag;
    const crashed = sim.crashed && !s.wasCrashed;
    s.wasCrashed = sim.crashed;
    if (paused) {
      combat.sounds.length = 0;
      return;
    }
    _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    ctx.audio.update({
      player: {
        kind: ac.engine.kind, cylinders: ac.engine.cylinders, ratedRpm: ac.engine.ratedRpm,
        rpm: d ? crankRpm(ac, d.rpm) : 0, propRpm: d ? d.rpm : 0,
        throttle: sim.surfaces?.throttle ?? 0,
        running: !sim.crashed && !engineSeized(sim.damage) && !fuelOut(sim.damage),
        speed: sim.crashed ? 0 : d ? d.speed : 0, density: d ? d.density : 1, velocity: sim.state.velocity,
      },
      listener: { position: camera.position, right: _right },
      enemies: others().filter((a) => !a.crashed && a.sim.diag).map((a) => ({
        id: a.id, kind: a.aircraft.engine.kind, cylinders: a.aircraft.engine.cylinders,
        rpm: crankRpm(a.aircraft, a.sim.diag.rpm), position: a.position ?? a.state.position, velocity: a.velocity ?? a.state.velocity,
      })),
      sounds: combat.sounds,
      crashed,
      warning,
    });
  }

  // Sun shadows in the cockpit view (Medium and High quality): the sun's shadow camera is a small
  // box round the cockpit, moved with the aircraft (a directional light's position only sets its direction).
  const sunDir = new Vector3();
  function cockpitShadows(inCockpit, position) {
    const size = QUALITY_LEVELS[ctx.quality()]?.shadowMap ?? 0;
    const on = inCockpit && size > 0;
    renderer.shadowMap.autoUpdate = on;
    if (s.shadowSize !== size) { // the quality changed: a new shadow map, or none
      s.shadowSize = size;
      parts.sun.castShadow = size > 0;
      if (size > 0) parts.sun.shadow.mapSize.set(size, size);
      parts.sun.shadow.map?.dispose();
      parts.sun.shadow.map = null;
    }
    if (!on) return;
    sunDir.set(...s.sky.sunDirection).normalize();
    parts.sun.target.position.copy(position);
    parts.sun.position.copy(position).addScaledVector(sunDir, 6);
  }

  // The other aircraft: the AI's, or in a match the other players'.
  const others = () => (s.net ? s.net.views() : combat.agents);
  const TEAM_NAMES = { allied: 'Allied', central: 'Central' };

  // Draw one frame. paused: the game is paused or a menu is up (no gun sight, no messages).
  s.draw = (realDt, alpha, now, paused) => {
    if (s.net) s.net.frame(realDt);
    const { position, quaternion } = sim.interpolate(alpha);
    if (s.net) s.net.smoothOwn(position, quaternion); // a correction from the server is faded, not jumped
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
    const inCockpit = rig.mode === 'cockpit';
    s.cockpit.group.visible = inCockpit;
    for (const part of model.hideInCockpit) part.visible = !inCockpit;
    for (const part of model.showInCockpit) part.visible = inCockpit;
    setUpperWingChord(model, inCockpit ? (COCKPITS[sim.aircraft.id].upperWingChord ?? 1) : 1);
    if (inCockpit) s.cockpit.animate(sim.surfaces, s.panel.values);
    cockpitShadows(inCockpit, position);
    rig.update(sim.aircraft, position, quaternion, realDt);

    // The fight: tracers, strikes, enemy aircraft, the gun sight and the gun status.
    targetViews.update(others(), alpha, realDt);
    tracers.update(combat.bullets, camera, alpha, 1 / 120);
    effects.update(combat.events, paused ? 0 : realDt);
    for (const text of combat.messages.splice(0)) notice(text, 3000);
    for (const text of sim.damage.events.splice(0)) notice(text, 3000); // the player's own damage
    const jammed = Boolean(combat.gunBank?.guns.some((g) => g.jammed));
    if (jammed && !s.wasJammed) notice(`Gun jammed: press ${ctx.keyHint('clearJam')} to clear it`, 3500);
    s.wasJammed = jammed;
    camera.updateMatrixWorld();
    // The stall, G and overspeed warnings (Options), on screen and as a sound.
    const o = ctx.options?.() ?? {};
    const live = !paused && !sim.crashed && !pilotDead(sim.damage);
    const w = live ? warnings(sim.aircraft, common, sim.diag, { stall: o.stallWarning, g: o.gWarning }, sim.structuralDamage) : noWarnings;
    overlays.warnings?.set(warningLines(w));
    if (ctx.audio) feedAudio(paused, warningSound(w));
    const hudOn = ctx.hudOn() && !paused;
    overlays.hud.show(hudOn);
    // With the modern HUD on, it carries the guns, fuel and damage, so the status line is hidden.
    // In the cockpit you aim with the guns' own ring-and-bead sight, so the drawn gun sight is only shown outside.
    overlays.combatHud.update(combat.sightPoint(sim, sightPoint), camera, !sim.crashed && !paused && !inCockpit, paused || hudOn ? '' : combatText(combat, sim.damage));

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
          extra: [...perfLines(ctx.frameStats, renderer.info.render, ctx.quality(), parts.view, terrain.stats()), ...(s.net ? s.net.debugLines() : combatLines(combat)), ...damageLines(sim.damage, sim.aircraft), `last key  ${keyboard.lastKey || '-'}   trim ${((sim.surfaces?.trim ?? 0) * 100).toFixed(0)}%`],
        }));
      }
      if (import.meta.env.DEV && overlays.testPanel?.visible) overlays.testPanel.update(sim, s.runner, s.scenarioLabel);
      if (overlays.joystickPanel.visible) overlays.joystickPanel.update();
      const heading = attitude(sim.state).heading;
      if (hudOn) {
        const me = sim.state.position;
        overlays.hud.update({
          aircraft: sim.aircraft, diag: sim.diag, velocityY: sim.state.velocity.y, heading, throttle: sim.surfaces?.throttle ?? 0, trim: sim.surfaces?.trim ?? 0, damage: sim.damage,
          gunText: combat.gunBank ? `GUNS ${combat.gunBank.statusText()}` : '', camera,
          enemies: others().filter((a) => !a.crashed).map((a) => {
            const at = a.position ?? a.state.position;
            return { position: at, label: enemyLabel(a.name ? `${a.name} (${TEAM_NAMES[a.team]}, ${a.aircraft.name})` : a.aircraft.name, at.distanceTo(me)) };
          }),
        });
      }
      if (inCockpit) s.panel.update({ diag: sim.diag, heading, damage: sim.damage, throttle: sim.surfaces?.throttle ?? 0, time: sim.time });
      overlays.readout.set(paused ? '' : readoutText(sim.aircraft, sim.diag, heading), !inCockpit);
    }
    renderer.render(scene, camera);
  };

  return s;
}
