import { describe, it, expect } from 'vitest';
import { Box3 } from 'three';
import { AIRCRAFT, common } from '../src/aircraft/index.js';
import { createAircraftMesh, showDrum } from '../src/render/aircraftMesh.js';
import { COCKPITS, cockpitId, BORROWED_COCKPIT } from '../src/aircraft/cockpits.js';
import { PANELS } from '../src/aircraft/panels.js';
import { GunBank } from '../src/weapons/guns.js';
import { withLoadout } from '../src/weapons/mounts.js';
import { gearGeometry } from '../src/physics/ground.js';

// The Early War aircraft's own models and cockpits (phase E3), their liveries and the Nieuport's
// Lewis drum; an aircraft with no model or guns of its own is still handled.

describe('Early War aircraft: models and cockpits', () => {
  for (const id of ['e4', 'n11']) {
    const ac = AIRCRAFT[id];

    it(`${ac.name}: builds its model at the right size, wheels on the ground`, () => {
      const m = createAircraftMesh(ac);
      m.group.updateMatrixWorld(true);
      const box = new Box3().setFromObject(m.group);
      expect(box.max.z - box.min.z).toBeCloseTo(ac.geometry.wingspan, 0);
      expect(box.min.y).toBeCloseTo(gearGeometry(ac, common).contactY, 1);
      expect(m.prop).toBeTruthy();
      expect(m.stations.length).toBeGreaterThan(3); // the cockpit is fitted into these
    });

    it(`${ac.name}: has its own cockpit and instrument panel (phase E3)`, () => {
      expect(COCKPITS[ac.id]).toBeTruthy();
      expect(PANELS[ac.id]).toBeTruthy();
      expect(cockpitId(ac)).toBe(ac.id);
    });
  }

  it('the Late War aircraft keep their own cockpits', () => {
    for (const id of ['camel', 'spad13', 'dr1', 'albatros']) expect(cockpitId(AIRCRAFT[id])).toBe(id);
  });

  it('the E.IV has no ailerons (wing warping)', () => {
    expect(createAircraftMesh(AIRCRAFT.e4).controls.ailerons).toHaveLength(0);
    expect(createAircraftMesh(AIRCRAFT.n11).controls.ailerons.length).toBeGreaterThan(0);
  });

  it('the E.IV has its sourced twin LMG 08/15 guns', () => {
    const bank = new GunBank(AIRCRAFT.e4, () => 1);
    expect(bank.guns).toHaveLength(2);
    expect(bank.roundsLeft).toEqual([475, 475]);
  });

  it('an aircraft without guns has none, fires nothing, and shows "none"', () => {
    const bank = new GunBank({ ...AIRCRAFT.n11, guns: undefined }, () => 1);
    expect(bank.guns).toHaveLength(0);
    expect(bank.update(1 / 120, true, 1200)).toEqual([]);
    expect(bank.statusText()).toBe('none');
    bank.clearJam(); // harmless
    expect(bank.changeDrum()).toBe(false);
  });

  it('an aircraft without a model of its own gets the plain stand-in (with a borrowed cockpit)', () => {
    BORROWED_COCKPIT.unknown = 'spad13';
    try {
      const m = createAircraftMesh({ ...AIRCRAFT.n11, id: 'unknown' });
      expect(m.prop).toBeTruthy();
      expect(m.drum).toBeUndefined(); // the stand-in has no Lewis drum
    } finally {
      delete BORROWED_COCKPIT.unknown;
    }
  });

  it("the Nieuport's Lewis drum is off the gun only while it is being changed", () => {
    const m = createAircraftMesh(AIRCRAFT.n11);
    const bank = new GunBank(AIRCRAFT.n11, () => 1);
    showDrum(m, bank);
    expect(m.drum.visible).toBe(true);
    bank.changeDrum();
    showDrum(m, bank);
    expect(m.drum.visible).toBe(false);
    for (let i = 0; i < 7 * 120; i++) bank.update(1 / 120, false, 1200);
    showDrum(m, bank);
    expect(m.drum.visible).toBe(true);
    // The drum sits over the upper wing, above the propeller's reach.
    m.group.updateMatrixWorld(true);
    expect(new Box3().setFromObject(m.drum).min.y).toBeGreaterThan(AIRCRAFT.n11.propeller.diameter / 2);
  });

  it('the three-gun E.IV model draws three gun barrels', () => {
    const barrels = (ac) => {
      let n = 0;
      createAircraftMesh(ac).group.traverse((o) => { if (o.userData.cockpitHide && o.geometry?.parameters?.width === 0.6) n++; });
      return n;
    };
    expect(barrels(AIRCRAFT.e4)).toBe(2);
    expect(barrels(withLoadout(AIRCRAFT.e4, 'immelmann'))).toBe(3);
  });

  it('each model carries its sourced markings', () => {
    const count = (ac, pred) => {
      let n = 0;
      createAircraftMesh(ac).group.traverse((o) => { if (o.isMesh && pred(o)) n++; });
      return n;
    };
    const colour = (hex) => (o) => o.material?.color?.getHex() === hex;
    expect(count(AIRCRAFT.e4, (o) => o.geometry.type === 'ShapeGeometry')).toBe(8); // crosses pattee: fuselage, wing top and underside, rudder, both sides
    expect(count(AIRCRAFT.e4, colour(0xb52a1e))).toBe(2); // a red third on each wheel cover
    expect(count(AIRCRAFT.n11, colour(0x23408f))).toBe(6); // a blue centre in each of the six roundels
  });
});
