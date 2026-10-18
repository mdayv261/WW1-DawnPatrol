// Builds an aircraft's 3D cockpit from its layout (src/aircraft/cockpits.js), its fuselage
// shape (the model's stations) and its instruments (ui/instrumentPanel.js). Shown only in the
// cockpit view; the model hides the fuselage section it replaces.

import { Group, Mesh, Shape, ShapeGeometry, CapsuleGeometry } from 'three';
import { COCKPITS, cockpitId } from '../../aircraft/cockpits.js';
import { gunMounts } from '../../weapons/mounts.js';
import { wingPlan, cockpitSpan } from '../models/layout.js';
import { fuselageAt } from '../models/parts.js';
import { cockpitMaterials } from './materials.js';
import { coaming, walls, frames, decking, gun, ringSight, windscreen, stick, throttle, deckHeight, scaleUV, rod, archHeight } from './parts.js';
import { gunPosts, gunRing, deckFittings, gunPad, rivets } from './fittings.js';
import { gauge } from './gauges.js';

const named = (name, object) => {
  object.name = name;
  return object;
};

const STICK_PULL = 0.28; // rad the stick tilts back at full pull (and forward at full push)
const STICK_ROLL = 0.3; // rad it tilts sideways at full roll
const THROTTLE_SWEEP = 0.9; // rad the throttle lever travels from closed to open

// eye: { x, y, z }; stations: the fuselage stations of the model; panel: createInstrumentPanel();
// struts: the model's right-hand rear cabane strut ends [a, b], for a strut-mounted dial (or null).
// Returns { group, materials, animate(surfaces, values) }.
export function buildCockpit(aircraft, eye, stations, panel, strut = null) {
  const c = COCKPITS[cockpitId(aircraft)];
  const m = cockpitMaterials(c.style);
  const group = new Group();
  const german = aircraft.guns?.type === 'lmg0815';
  const { opening } = c;

  group.add(named('coaming', coaming(stations, opening, m.leather)));
  // The walls run on to the end of the fuselage section the model hides (just ahead of the board).
  const section = { ...opening, front: cockpitSpan(aircraft)[1] };
  group.add(walls(stations, section, c.floorY, m.walls, m.decking, m.floor));
  group.add(frames(stations, opening, c.floorY, m.frame, m.steel, c.style.frame === 'tube'));
  // The decking starts at the opening, or just ahead of the panel where the rim arches over the panel
  // (otherwise its back edge would cut across the tops of the dials).
  const deckFrom = opening.frontArch !== undefined ? Math.max(opening.front - 0.01, c.panel.x + 0.005) : opening.front - 0.01;
  group.add(decking(stations, deckFrom, c.decking.to, c.decking.halfWidth, c.decking.hump, m.decking));

  // The instrument board: a plywood bulkhead across the front of the opening, leaning forward,
  // with the instruments where panels.js puts them.
  const [pw, ph] = panel.size;
  const board = named('board', new Group());
  board.position.set(c.panel.x, c.panel.topY, 0);
  board.rotation.z = -c.panel.tilt;
  // Its outline fills the fuselage under the decking (or under the rim's front arch, where the rim
  // closes across the front): straight sides, an arched top.
  const outline = new Shape();
  const hw = opening.halfWidth + 0.02;
  const bottom = c.floorY - c.panel.topY;
  const topAt = opening.frontArch !== undefined
    ? (z) => archHeight(stations, opening, Math.min(Math.abs(z), opening.halfWidth)) - opening.rimRadius * 0.5
    : (z) => deckHeight(stations, c.panel.x, z, c.decking.hump) - 0.004;
  outline.moveTo(-hw, bottom);
  for (let i = 0; i <= 16; i++) {
    const z = -hw + (2 * hw * i) / 16;
    outline.lineTo(z, topAt(z) - c.panel.topY);
  }
  outline.lineTo(hw, bottom);
  const plateGeometry = new ShapeGeometry(outline);
  plateGeometry.rotateY(-Math.PI / 2); // the outline's x becomes z, facing -X (toward the pilot)
  scaleUV(plateGeometry, 2, 2);
  const steel = c.panel.board === 'steel';
  const plate = new Mesh(plateGeometry, steel ? m.bulkhead : m.plywood);
  plate.position.x = 0.002;
  board.add(plate);
  if (steel) { // rows of rivets along the top and across, and a seam down the middle
    const points = [];
    for (let z = -hw + 0.03; z <= hw - 0.03; z += 0.035) for (const y of [-0.06, -0.24, -0.42]) points.push([-0.001, y, z]);
    for (let y = -0.1; y > bottom + 0.05; y -= 0.035) points.push([-0.001, y, 0]);
    board.add(rivets(points, m.steel));
  }
  const levers = [];
  panel.instruments.forEach((inst, i) => {
    if (inst.mount === 'strut') return;
    const free = inst.mount === 'free';
    const g = gauge(inst.kind, free ? inst.radius : inst.r * ph, panel.faces[i], m, { hatot: inst.face === 'hatot' });
    named('gauge', g.group);
    if (free) {
      // At its own place in the cockpit, turned to face the pilot's eye.
      const holder = new Group();
      holder.position.set(...inst.at);
      holder.lookAt(eye.x, eye.y, eye.z); // the holder's +Z now points at the eye
      g.group.rotation.y = Math.PI / 2; // and the gauge's face (-X) along it
      holder.add(g.group);
      group.add(holder);
    } else {
      g.group.position.set(-0.001, -inst.y * ph, (inst.x - 0.5) * pw);
      board.add(g.group);
    }
    levers.push(...g.levers);
  });
  group.add(board);

  // A padded leather crash pad on the decking's edge above the board, between the breeches.
  if (c.crashPad !== false) {
    const padY = deckHeight(stations, c.panel.x, 0, c.decking.hump);
    const pad = new Mesh(new CapsuleGeometry(0.025, 0.12, 6, 12).rotateX(Math.PI / 2), m.leather);
    pad.position.set(c.panel.x - 0.01, padY - 0.01, 0);
    group.add(pad);
  }

  // The guns on the decking, from the aircraft's own gun data (one per mount: two, or three with
  // the E.IV's loadout), on posts where the cockpit has them. An over-wing gun (the Nieuport's
  // Lewis) is up on the wing, drawn with the aircraft's model, not here.
  const { muzzleY, muzzleZ } = aircraft.guns ?? {};
  const overWing = aircraft.guns?.count === 1;
  if (!overWing) for (const mount of gunMounts(aircraft)) group.add(gun(aircraft.guns.type, c.breechX, mount.x, mount.y, mount.z, m));
  const pair = aircraft.guns && !overWing; // the cockpit fittings below belong to a pair of guns on the decking
  if (c.gunPosts && pair) group.add(named('gunPosts', gunPosts(c.gunPosts, muzzleY, muzzleZ, german ? 0.12 : 0.11, m.paintedSteel)));
  if (c.crossBar) group.add(named('crossBar', rod([c.crossBar.x, c.crossBar.y, -c.crossBar.halfWidth], [c.crossBar.x, c.crossBar.y, c.crossBar.halfWidth], 0.012, m.paintedSteel, 10)));
  if (c.gunPads && pair) for (const s of [-1, 1]) group.add(named('gunPad', gunPad(c.breechX, muzzleY, s * muzzleZ, m.leather)));
  const deckAt = (x, z = 0) => deckHeight(stations, x, z, c.decking.hump);
  if (c.sight.kind === 'gunRings') {
    const sight = named('sight', new Group());
    const jacket = german ? 0.047 : 0.044;
    for (const s of [-1, 1]) sight.add(gunRing(c.sight.x, muzzleY + jacket, s * muzzleZ, m, c.sight.ringRadius));
    group.add(sight);
  } else {
    group.add(named('sight', ringSight(eye.y, c.sight.ringX, c.sight.beadX, deckAt(c.sight.ringX), deckAt(c.sight.beadX), m)));
  }
  if (c.deckFittings) {
    const across = Math.min(c.decking.halfWidth, fuselageAt(stations, c.deckFittings.boltStripX).w / 2) * 0.75;
    group.add(deckFittings(c.deckFittings, deckAt, across, m, m.decking));
  }
  if (c.windscreen) group.add(named('windscreen', windscreen(c.windscreen, m)));

  const column = stick(c.stick.x, c.floorY, 0.4, german, m);
  group.add(column.group);
  const lever = throttle(c.throttle, m);
  group.add(lever.group);

  // An instrument on the right-hand wing strut (the German airspeed indicators), turned toward the pilot.
  const onStrut = panel.instruments.findIndex((i) => i.mount === 'strut');
  if (onStrut >= 0) {
    const upper = wingPlan(aircraft)[0];
    const inst = panel.instruments[onStrut];
    const g = gauge(inst.kind, 0.06, panel.faces[onStrut], m);
    let x = upper.x + 0.12;
    let y = 0.35 * (aircraft.visual.fuselageDepth / 2) + 0.65 * upper.y;
    let z = 0.42;
    if (c.strutGauge && strut) { // up the cabane strut, just on the pilot's side of it
      const [a, b] = strut;
      const t = c.strutGauge.along;
      [x, y, z] = [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * t);
      x -= 0.06;
    }
    named('strutGauge', g.group).position.set(x, y, z);
    g.group.rotation.y = -Math.atan2(z - eye.z, x - eye.x);
    group.add(g.group);
    group.add(rod([x + 0.03, y - 0.03, z + 0.02], [x + 0.03, y + 0.03, z + 0.02], 0.008, m.steel, 6)); // its clamp
  }

  group.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = !o.material.transparent;
    o.receiveShadow = true;
  });

  // Each frame: the stick and throttle follow the controls; the switches show the ignition.
  function animate(surfaces, values) {
    if (surfaces) {
      column.pivot.rotation.z = (surfaces.pull ?? 0) * STICK_PULL;
      column.pivot.rotation.x = (surfaces.roll ?? 0) * STICK_ROLL;
      lever.lever.rotation.z = (0.5 - (surfaces.throttle ?? 0)) * THROTTLE_SWEEP;
    }
    const on = values?.switches?.on ?? true;
    for (const l of levers) l.rotation.z = on ? 0 : Math.PI;
  }
  animate(null, null);

  return { group, materials: m, animate, stick: column.pivot, throttle: lever.lever };
}
