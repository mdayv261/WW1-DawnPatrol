// The AI pilot's head. Every step it reads what it knows (its own instruments, and
// what it saw of the others a reaction time ago), decides what to do, and gives the
// pilot's hands (steering.js) a direction and a speed to fly. The result is a
// ControlInput like a person's. States: patrol, engage, attack, evade, disengage;
// this checkpoint has patrol, which flies a circuit at a set height and notices the
// enemy (the fighting states follow). Settings are in src/aircraft/aiData.js.

import { Vector3 } from 'three';
import { SKILLS, PATROL } from '../aircraft/aiData.js';
import { Observer, geometry } from './perception.js';
import { Pilot } from './steering.js';

const _to = new Vector3();

export class AiBrain {
  // aircraft: the aircraft data; skill: a key of SKILLS; centre: { x, z } the middle of its patrol circuit.
  constructor(aircraft, skillName, centre) {
    this.aircraft = aircraft;
    this.skillName = skillName;
    this.skill = SKILLS[skillName];
    this.pilot = new Pilot(aircraft);
    this.observer = new Observer(this.skill);
    this.centre = { x: centre.x, z: centre.z };
    this.state = 'patrol';
    this.manoeuvre = null; // the named manoeuvre in progress (later checkpoints)
    this.contacts = []; // what it can see now: [{ id, range, geometry }]
    this.time = 0;
    this.lastInput = null;
  }

  // The point on the circuit the aircraft aims at: a little way round from where it is.
  patrolDirection(position) {
    const dx = position.x - this.centre.x;
    const dz = position.z - this.centre.z;
    const here = Math.atan2(dz, dx);
    const ahead = here + PATROL.waypointAhead; // round the circuit (anticlockwise seen from above)
    const aim = { x: this.centre.x + PATROL.radius * Math.cos(ahead), z: this.centre.z + PATROL.radius * Math.sin(ahead) };
    _to.set(aim.x - position.x, 0, aim.z - position.z);
    const run = Math.max(_to.length(), 1);
    const slope = Math.max(-PATROL.climbSlope, Math.min(PATROL.climbSlope, (this.skill.patrolAltitude - position.y) / (run * 0.5)));
    return new Vector3(_to.x / run, slope, _to.z / run).normalize();
  }

  // Look at the others: which can it see (within its sight range), and what is the geometry.
  look(self, others) {
    this.observer.record(this.time, others);
    this.contacts.length = 0;
    for (const o of others) {
      const seen = this.observer.view(o.id, this.time);
      if (!seen) continue;
      const g = geometry(self.state, seen);
      if (g.range <= this.skill.sightRange) this.contacts.push({ id: o.id, side: o.side, range: g.range, geometry: g });
    }
  }

  // One step: self is the agent's Simulation, others the aircraft it may see:
  // [{ id, side, state }]. Returns the ControlInput.
  think(dt, sim, others, solidAt = null) {
    this.time += dt;
    this.look(sim, others);
    const vmax = this.aircraft.documented.maxSpeed;
    const want = {
      dir: this.patrolDirection(sim.state.position),
      speed: this.skill.patrolSpeed * vmax,
      gShare: this.skill.gLimit,
    };
    this.lastInput = this.pilot.steer(sim, want, dt, solidAt);
    return this.lastInput;
  }

  // One line for the F3 panel.
  describe() {
    const seen = this.contacts.length ? `sees ${this.contacts.length} (nearest ${Math.round(Math.min(...this.contacts.map((c) => c.range)))} m)` : 'sees nothing';
    return `${this.skill.name} ${this.state}${this.manoeuvre ? ` / ${this.manoeuvre}` : ''}, ${seen}`;
  }
}

