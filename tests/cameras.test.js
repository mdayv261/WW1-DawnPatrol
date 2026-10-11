import { describe, it, expect } from 'vitest';
import { PerspectiveCamera, Vector3, Quaternion } from 'three';
import { CameraRig, MODES, hatLookTarget } from '../src/render/cameraRig.js';
import { eyePosition } from '../src/render/cockpit.js';
import { readoutText } from '../src/ui/instrumentMath.js';
import { AIRCRAFT, AIRCRAFT_LIST } from '../src/aircraft/index.js';

// Cameras (Phase 2): rendering only, so these are pure geometry checks.

const rig = () => new CameraRig(new PerspectiveCamera(70, 1.6, 1, 10000));
const forward = (cam) => new Vector3(0, 0, -1).applyQuaternion(cam.quaternion);

describe('camera rig', () => {
  it('C cycles chase -> free -> cockpit -> chase', () => {
    const r = rig();
    expect(r.mode).toBe('chase');
    expect([r.cycle(), r.cycle(), r.cycle()]).toEqual(['free', 'cockpit', 'chase']);
    expect(MODES).toHaveLength(3);
  });

  it('the pilot sits behind and above the centre of gravity in every aircraft', () => {
    for (const ac of AIRCRAFT_LIST) {
      const e = eyePosition(ac);
      expect(e.x).toBeLessThan(0);
      expect(e.y).toBeGreaterThan(0);
      expect(e.z).toBe(0);
    }
  });

  it('cockpit view: camera at the eye, looking along the nose, rolling with the aircraft', () => {
    const r = rig();
    r.mode = 'cockpit';
    const pos = new Vector3(0, 500, 0);
    // Banked 30 degrees right (about the nose, +X).
    const q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 6);
    r.update(AIRCRAFT.camel, pos, q, 1 / 60);
    const e = eyePosition(AIRCRAFT.camel);
    const expected = new Vector3(e.x, e.y, e.z).applyQuaternion(q).add(pos);
    expect(r.camera.position.distanceTo(expected)).toBeLessThan(1e-6);
    expect(forward(r.camera).x).toBeCloseTo(1, 6);
    // The camera's up follows the aircraft's up, so the horizon tilts.
    const up = new Vector3(0, 1, 0).applyQuaternion(r.camera.quaternion);
    expect(up.distanceTo(new Vector3(0, 1, 0).applyQuaternion(q))).toBeLessThan(1e-6);
    expect(r.camera.near).toBeLessThanOrEqual(0.1); // close enough to see the instrument panel, no closer than the depth buffer needs
  });

  it('mouse moves the view only while looking around (right button or V) or in free-look', () => {
    const r = rig();
    r.mode = 'cockpit';
    expect(r.wantsMouse()).toBe(false);
    r.lookButton = true;
    expect(r.wantsMouse()).toBe(true);
    r.lookButton = false;
    r.lookToggle = true;
    expect(r.wantsMouse()).toBe(true);
    r.mode = 'chase';
    expect(r.wantsMouse()).toBe(false);
    r.mode = 'free';
    expect(r.wantsMouse()).toBe(true);
  });

  it('head turn is limited, and eases back forward when you stop looking', () => {
    const r = rig();
    r.mode = 'cockpit';
    r.lookButton = true;
    r.look(1e6, -1e6);
    expect(r.lookYaw).toBeCloseTo(2.6);
    expect(r.lookPitch).toBeCloseTo(1.3);
    const q = new Quaternion();
    r.update(AIRCRAFT.camel, new Vector3(0, 500, 0), q, 1 / 60);
    // Looking over the right shoulder and up: the view points right-ish and up.
    expect(forward(r.camera).z).toBeGreaterThan(0);
    expect(forward(r.camera).y).toBeGreaterThan(0.5);
    r.lookButton = false;
    for (let i = 0; i < 120; i++) r.update(AIRCRAFT.camel, new Vector3(0, 500, 0), q, 1 / 60);
    expect(Math.abs(r.lookYaw)).toBeLessThan(0.01);
    expect(forward(r.camera).x).toBeCloseTo(1, 3);
  });

  it('free-look orbits at the zoom distance, never below the ground', () => {
    const r = rig();
    r.mode = 'free';
    const pos = new Vector3(10, 2, -5);
    r.update(AIRCRAFT.spad13, pos, new Quaternion(), 1 / 60);
    expect(r.camera.position.distanceTo(pos)).toBeCloseTo(18, 3);
    r.zoom(1e6);
    expect(r.orbitDistance).toBe(120);
    r.zoom(-1e6);
    expect(r.orbitDistance).toBe(6);
    r.look(0, 1e6); // try to look from under the ground
    r.update(AIRCRAFT.spad13, pos, new Quaternion(), 1 / 60);
    expect(r.camera.position.y).toBeGreaterThanOrEqual(1);
  });

  it('the chase camera keeps the horizon level after leaving the cockpit', () => {
    const r = rig();
    r.mode = 'cockpit';
    const q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -1);
    r.update(AIRCRAFT.camel, new Vector3(0, 500, 0), q, 1 / 60);
    r.cycle(); // chase
    r.update(AIRCRAFT.camel, new Vector3(0, 500, 0), q, 1 / 60);
    expect(r.camera.up.y).toBe(1);
    expect(r.camera.near).toBe(2);
  });
});

describe('outside-view readout', () => {
  const diag = { speed: 40, altitude: 1000, rpm: 1180.4 };
  it("uses the aircraft's own period units", () => {
    // Heading 45 degrees (east of north).
    expect(readoutText(AIRCRAFT.camel, diag, Math.PI / 4)).toBe('89 mph   3,281 ft   1180 rpm   HDG 045');
    expect(readoutText(AIRCRAFT.dr1, diag, -Math.PI / 2)).toBe('144 km/h   1,000 m   1180 rpm   HDG 270');
  });
  it('is empty before the first physics step', () => {
    expect(readoutText(AIRCRAFT.camel, null, 0)).toBe('');
  });
});

describe('joystick hat', () => {
  const D = Math.PI / 180;
  it('left and right look 90 degrees, up looks up, down looks back over the shoulder', () => {
    expect(hatLookTarget({ x: 0, y: 0 })).toBeNull();
    expect(hatLookTarget({ x: -1, y: 0 })).toEqual({ yaw: -90 * D, pitch: 0 });
    expect(hatLookTarget({ x: 1, y: 0 })).toEqual({ yaw: 90 * D, pitch: 0 });
    expect(hatLookTarget({ x: 0, y: 1 }).pitch / D).toBeCloseTo(55, 0);
    expect(hatLookTarget({ x: 0, y: -1 })).toEqual({ yaw: 180 * D, pitch: 0 });
    expect(hatLookTarget({ x: 1, y: -1 }).yaw / D).toBeCloseTo(135);
    expect(hatLookTarget({ x: -1, y: -1 }).yaw / D).toBeCloseTo(-135);
    expect(hatLookTarget({ x: -1, y: 1 })).toMatchObject({ yaw: -90 * D });
  });
  it('in the cockpit the head follows the hat, then eases back forward when released', () => {
    const r = rig();
    r.mode = 'cockpit';
    const q = new Quaternion();
    const pos = new Vector3(0, 500, 0);
    r.hat = { x: 0, y: -1 }; // look back
    for (let i = 0; i < 120; i++) r.update(AIRCRAFT.camel, pos, q, 1 / 60);
    expect(forward(r.camera).x).toBeLessThan(-0.99); // looking at the tail
    r.hat = { x: 0, y: 0 };
    for (let i = 0; i < 180; i++) r.update(AIRCRAFT.camel, pos, q, 1 / 60);
    expect(forward(r.camera).x).toBeGreaterThan(0.99);
  });
  it('the hat does not turn the head in the chase view, and orbits in free-look', () => {
    const r = rig();
    r.hat = { x: 1, y: 0 };
    r.update(AIRCRAFT.camel, new Vector3(0, 500, 0), new Quaternion(), 1 / 60);
    expect(r.lookYaw).toBe(0);
    r.mode = 'free';
    const before = r.orbitYaw;
    r.update(AIRCRAFT.camel, new Vector3(0, 500, 0), new Quaternion(), 1);
    expect(r.orbitYaw).toBeGreaterThan(before);
    r.hat = { x: 0, y: 1 };
    const p = r.orbitPitch;
    r.update(AIRCRAFT.camel, new Vector3(0, 500, 0), new Quaternion(), 0.1);
    expect(r.orbitPitch).toBeGreaterThan(p);
  });
});
