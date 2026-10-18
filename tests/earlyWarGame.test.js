import { describe, it, expect } from 'vitest';
import { Box3 } from 'three';
import { AIRCRAFT, common } from '../src/aircraft/index.js';
import { createAircraftMesh } from '../src/render/aircraftMesh.js';
import { COCKPITS, cockpitId } from '../src/aircraft/cockpits.js';
import { PANELS } from '../src/aircraft/panels.js';
import { GunBank } from '../src/weapons/guns.js';
import { gearGeometry } from '../src/physics/ground.js';

// Phase E1 lets the Early War aircraft be test-flown before their guns (E2), models and
// cockpits (E3) exist: an unarmed Nieuport, a plain stand-in model, and borrowed cockpits.

describe('Early War aircraft before their own models and cockpits (phase E1)', () => {
  for (const id of ['e4', 'n11']) {
    const ac = AIRCRAFT[id];

    it(`${ac.name}: builds a stand-in model of the right size, wheels on the ground`, () => {
      const m = createAircraftMesh(ac);
      m.group.updateMatrixWorld(true);
      const box = new Box3().setFromObject(m.group);
      expect(box.max.z - box.min.z).toBeCloseTo(ac.geometry.wingspan, 0);
      expect(box.min.y).toBeCloseTo(gearGeometry(ac, common).contactY, 1);
      expect(m.prop).toBeTruthy();
      expect(m.stations.length).toBeGreaterThan(3); // the cockpit is fitted into these
    });

    it(`${ac.name}: borrows a Late War cockpit and instrument panel`, () => {
      expect(COCKPITS[ac.id]).toBeUndefined();
      expect(COCKPITS[cockpitId(ac)]).toBeTruthy();
      expect(PANELS[cockpitId(ac)]).toBeTruthy();
    });
  }

  it('the Late War aircraft keep their own cockpits', () => {
    for (const id of ['camel', 'spad13', 'dr1', 'albatros']) expect(cockpitId(AIRCRAFT[id])).toBe(id);
  });

  it('the E.IV gets no ailerons on its stand-in model (wing warping)', () => {
    expect(createAircraftMesh(AIRCRAFT.e4).controls.ailerons).toHaveLength(0);
    expect(createAircraftMesh(AIRCRAFT.n11).controls.ailerons.length).toBeGreaterThan(0);
  });

  it('the E.IV has its sourced twin LMG 08/15 guns', () => {
    const bank = new GunBank(AIRCRAFT.e4, () => 1);
    expect(bank.guns).toHaveLength(2);
    expect(bank.roundsLeft).toEqual([475, 475]);
  });

  it('the Nieuport 11 flies unarmed until phase E2: no guns, no shots, "none" on the screen', () => {
    const bank = new GunBank(AIRCRAFT.n11, () => 1);
    expect(bank.guns).toHaveLength(0);
    expect(bank.update(1 / 120, true, 1200)).toEqual([]);
    expect(bank.statusText()).toBe('none');
    bank.clearJam(); // harmless
  });
});
