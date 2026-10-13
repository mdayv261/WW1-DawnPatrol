// The shape of each cockpit as the pilot sees it: the opening and its padded rim, the decking
// ahead, where the instrument board, gun breeches, windscreen, sight, stick and throttle are,
// and the colours of the inside. Visual only (no effect on the flight). Body axes from the
// centre of gravity: +X nose, +Y up, +Z right; metres. Every figure is an estimate made to
// match museum photographs of the real cockpits (rows in docs/AIRCRAFT_DATA.md, "Cockpit
// panels"); the instruments themselves are in panels.js.
//
// opening: back and front edge (x), half width, rim height at the back and at the front, and
//   the radius of the padded rim.
// decking: the top of the fuselage ahead of the opening, up to x `to`, at most `halfWidth` each
//   side; `hump` raises it in the middle over the gun breeches (the Camel's hump) by `height`
//   across `halfWidth` (with `fade: [x0, x1]` it dies away between those x).
// panel: the instrument board's front-to-back position (x), the height of its top edge, and how
//   far its top leans forward (rad). Its size is PANELS[id].size.
// breechX: the rear face of the gun breeches (the guns themselves come from the aircraft's `guns`).
// windscreen: 'small' (one curved pane), 'twoPane' (a V of two panes) or null; x, half width,
//   height above `baseY`.
// sight: the ring sight's x (at eye height) and the bead's x out along the guns; or kind 'gunRings'
//   (a small ring sight on top of each gun at x). gunPosts: steel posts under the guns, with a cross bar;
//   crossBar: just the cross tube. gunPads: a leather pad on the back of each breech.
// panel.board: 'steel' makes the board a riveted steel bulkhead (default plywood).
// opening.frontArch: the rim closes across the front, arching over the panel to this height.
// strutGauge: { along } puts a strut-mounted dial that far up the right-hand rear cabane strut
//   (the model's `cabaneRear` strut); without it, the Albatros's place on its strut is used.
// crashPad: false leaves out the leather pad above the panel. deckFittings: bolted strip, filler cap
//   and a round fitting on the decking.
// stick: x of the control column's foot; throttle: the lever's pivot on the left wall.
// upperWingChord: in the cockpit view only, the upper wing is drawn this share of its depth
//   front to back, keeping its trailing edge (nearest the pilot) in place. Optional; 1 when absent.

export const COCKPITS = {
  camel: {
    // A narrow padded rim that also runs across the front, arching over the panel under the hump's lip (product owner).
    opening: { back: -1.08, front: -0.16, halfWidth: 0.25, rimY: 0.42, rimFrontY: 0.47, rimRadius: 0.018, frontArch: 0.53 },
    floorY: -0.2,
    decking: { to: 1.45, halfWidth: 0.45, hump: { height: 0.07, halfWidth: 0.22, fade: [0.3, 0.7] } }, // the hump over the breeches, dying away ahead
    // of them so the barrels lie on the nose, as on the SPAD (product owner)
    panel: { x: -0.14, topY: 0.49, tilt: 0.1 },
    crashPad: false, // no leather pad above the panel (product owner)
    breechX: -0.1,
    windscreen: { kind: 'small', x: 0.12, halfWidth: 0.12, baseY: 0.69, height: 0.11 }, // above the guns, so the glass is not in front of them
    sight: { ringX: 0.32, beadX: 1.35 },
    stick: { x: -0.32 },
    throttle: { x: -0.52, z: -0.215, y: 0.3 },
    style: {
      leather: 0x6e4428, walls: 'linen', wallColour: 0xcbb68c, frame: 'wood', decking: 0x7a4b2c, // a mid brown leather rim
      bezel: 0x2a2a2a, plywood: [0x9c6c3c, 0x6a4424],
    },
  },
  spad13: {
    upperWingChord: 0.92, // product owner: look like the Camel's from the seat. Its leading edge is then 6.0 degrees above
    // the sight line, as the Camel's is, and its trailing edge stays above the top of the view (no sky above it)
    // As the Camel's: a narrow padded rim running across the front, arching over the panel (product owner).
    opening: { back: -1.12, front: -0.22, halfWidth: 0.27, rimY: 0.38, rimFrontY: 0.43, rimRadius: 0.018, frontArch: 0.485 },
    floorY: -0.2,
    decking: { to: 1.6, halfWidth: 0.32, hump: { height: 0.05, halfWidth: 0.26 } },
    panel: { x: -0.2, topY: 0.44, tilt: 0.12 },
    crashPad: false, // as the Camel (product owner)
    breechX: -0.18,
    windscreen: { kind: 'small', x: 0.1, halfWidth: 0.13, baseY: 0.57, height: 0.1 }, // above the guns, as on the Camel, so the glass is not in front of them
    sight: { ringX: 0.25, beadX: 1.5 },
    stick: { x: -0.36 },
    throttle: { x: -0.55, z: -0.235, y: 0.28 },
    style: {
      leather: 0x6e4428, walls: 'linen', wallColour: 0xc8b48a, frame: 'wood', decking: 0x56633a, // brown leather as the Camel's; the body's green (spadModel.js)
      bezel: 0xb4b4b0, plywood: [0xa8743e, 0x6e4626],
    },
  },
  // The Dr.I follows a photograph of a flying replica (S52): a varnished wooden panel under the rim's arch,
  // the guns high on steel posts with a cross bar and a ring sight on each, red metal decking with a bolted
  // strip and a filler cap. The instruments are old-style German ones (panels.js), product owner's choice.
  dr1: {
    // As the SPAD's: a narrow padded brown rim running across the front, arching over the panel (product owner).
    opening: { back: -1.22, front: -0.42, halfWidth: 0.308, rimY: 0.4, rimFrontY: 0.45, rimRadius: 0.018, frontArch: 0.5 }, // 10% wider (product owner)
    floorY: -0.2,
    decking: { to: 1.4, halfWidth: 0.45, hump: { height: 0.03, halfWidth: 0.25 } },
    panel: { x: -0.41, topY: 0.47, tilt: 0.05 },
    crashPad: false,
    breechX: -0.48, // the breeches overhang the rim
    gunPads: true, // a padded leather cushion block on each breech's rear cover (product owner)
    gunPosts: { x: -0.45, bottomY: 0.05, barY: 0.27, barHalfWidth: 0.24 }, // the posts the guns stand on, and their cross bar
    windscreen: null,
    sight: { kind: 'gunRings', x: 1.43, ringRadius: 0.0385 }, // a ring sight on top of each gun, no centre sight; enlarged twice (product owner)
    deckFittings: { boltStripX: -0.36, fillerCap: [-0.15, -0.1], rearFitting: -0.37 },
    stick: { x: -0.6 },
    throttle: { x: -0.75, z: -0.215, y: 0.3 },
    style: {
      leather: 0x6e4428, walls: 'linen', wallColour: 0xbfae86, frame: 'tube', frameColour: 0x9aa3a8,
      decking: 0xb3261b, deckingPattern: 'paint', deckingGloss: true,
      bezel: 0x7d7d78, plywood: [0xc06a2c, 0x8a4418],
    },
  },
  albatros: {
    // As the SPAD's: a narrow padded brown rim running across the front, arching over the panel (product owner).
    opening: { back: -1.28, front: -0.34, halfWidth: 0.29, rimY: 0.44, rimFrontY: 0.48, rimRadius: 0.018, frontArch: 0.51 }, // wide enough to clear the panel's small dials
    floorY: -0.2,
    decking: { to: 1.7, halfWidth: 0.45, hump: null },
    panel: { x: -0.33, topY: 0.48, tilt: 0.08 },
    crashPad: false, // as the SPAD (product owner)
    breechX: -0.3,
    windscreen: { kind: 'small', x: -0.15, halfWidth: 0.16, baseY: 0.51, height: 0.1 },
    sight: { ringX: 0.15, beadX: 1.6 },
    stick: { x: -0.5 },
    throttle: { x: -0.7, z: -0.245, y: 0.32 },
    style: {
      leather: 0x6e4428, walls: 'plywood', wallColour: 0xb08850, frame: 'wood', decking: 0xa98c5e, deckingPattern: 'plywood',
      bezel: 0x7d7d78, plywood: [0xc06a2c, 0x8a4418], // the Dr.I's varnished panel (product owner)
    },
  },
};
