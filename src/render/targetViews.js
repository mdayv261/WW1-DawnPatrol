// The 3D models of the target aircraft: one per Target, made when it appears,
// moved to its physics pose every frame, and taken away when it is gone.

import { createAircraftMesh, setControlSurfaces } from './aircraftMesh.js';
import { deflections } from '../physics/controls.js';
import { damagedDeflections } from '../physics/damage.js';
import { showDamage } from './damageView.js';
import { common } from '../aircraft/index.js';

export class TargetViews {
  constructor(scene) {
    this.scene = scene;
    this.views = new Map(); // target id -> { model, target }
  }

  update(targets, alpha, realDt) {
    const seen = new Set();
    for (const t of targets) {
      seen.add(t.id);
      let v = this.views.get(t.id);
      if (!v) {
        v = { model: createAircraftMesh(t.aircraft), target: t };
        this.scene.add(v.model.group);
        this.views.set(t.id, v);
      }
      const { position, quaternion } = t.sim.interpolate(alpha);
      v.model.group.position.copy(position);
      v.model.group.quaternion.copy(quaternion);
      if (t.sim.surfaces) setControlSurfaces(v.model, damagedDeflections(t.sim.damage, deflections(common, t.sim.surfaces), common));
      showDamage(v.model, t.sim.damage);
      if (t.sim.diag) v.model.prop.rotation.x += (t.sim.diag.rpm / 60) * Math.PI * 2 * realDt * 0.15;
    }
    for (const [id, v] of this.views) {
      if (seen.has(id)) continue;
      this.scene.remove(v.model.group);
      this.views.delete(id);
    }
  }

  clear() {
    this.update([], 0, 0);
  }
}
