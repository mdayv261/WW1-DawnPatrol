// Fixed time step loop.
//
// Physics must advance in equal, small steps (120 per second) no matter how
// fast or slow the screen is redrawing. This class collects real elapsed
// time and tells the caller how many physics steps to run this frame.
// It has no browser code in it, so it can be tested in plain Node.

export const PHYSICS_HZ = 120;
export const PHYSICS_DT = 1 / PHYSICS_HZ; // seconds per physics step
export const MAX_STEPS_PER_FRAME = 8;

export class FixedStepLoop {
  constructor({ dt = PHYSICS_DT, maxSteps = MAX_STEPS_PER_FRAME } = {}) {
    this.dt = dt;
    this.maxSteps = maxSteps;
    this.accumulator = 0; // real time not yet turned into physics steps
  }

  // Add real elapsed seconds and run `step(dt)` the right number of times.
  // Returns { steps, alpha }. alpha (0 to <1) says how far we are between
  // the last two physics states, so the renderer can draw a smooth picture.
  advance(realDt, step) {
    this.accumulator += Math.max(0, realDt);

    let steps = 0;
    while (this.accumulator >= this.dt && steps < this.maxSteps) {
      step(this.dt);
      this.accumulator -= this.dt;
      steps += 1;
    }

    // After a long stall (e.g. the tab was hidden) we hit the step limit.
    // Drop the backlog instead of racing to catch up, which would make the
    // game freeze even longer (the "spiral of death").
    if (steps === this.maxSteps && this.accumulator >= this.dt) {
      this.accumulator = 0;
    }

    return { steps, alpha: this.accumulator / this.dt };
  }
}
