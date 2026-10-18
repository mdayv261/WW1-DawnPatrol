// Pilot controls. A ControlInput is what the keyboard (or, later, the AI)
// asks for; "surfaces" are where the control surfaces actually are.
// All values are normalised: pull, roll, yaw in [-1, 1] (pull = stick back,
// roll = stick right, yaw = right rudder), throttle in [0, 1], trim in [-1, 1].

export function createInput() {
  return { pull: 0, roll: 0, yaw: 0, throttle: 1, trim: 0, fire: false };
}

export function createSurfaces() {
  return { pull: 0, roll: 0, yaw: 0, throttle: 1, trim: 0 };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function moveToward(current, target, maxStep) {
  const d = target - current;
  return Math.abs(d) <= maxStep ? target : current + Math.sign(d) * maxStep;
}

// Move the surfaces toward the commanded input, limited by the travel rate. An aircraft
// may have a slower roll control (`rollRate`, e.g. wing warping); otherwise all three
// axes move at the shared `surfaceRate`.
export function updateSurfaces(surfaces, input, common, dt) {
  const step = common.surfaceRate * dt;
  const rollStep = common.rollRate ? common.rollRate * dt : step;
  surfaces.pull = moveToward(surfaces.pull, clamp(input.pull, -1, 1), step);
  surfaces.roll = moveToward(surfaces.roll, clamp(input.roll, -1, 1), rollStep);
  surfaces.yaw = moveToward(surfaces.yaw, clamp(input.yaw, -1, 1), step);
  surfaces.throttle = clamp(input.throttle, 0, 1);
  surfaces.trim = clamp(input.trim, -1, 1);
  return surfaces;
}

// Surface positions in radians as the aerodynamics sees them. The trim lever
// adds to the elevator.
export function deflections(common, surfaces) {
  const pull = clamp(surfaces.pull + surfaces.trim * common.trimAuthority, -1, 1);
  return {
    pull: pull * common.maxPull,
    roll: surfaces.roll * common.maxRoll,
    yaw: surfaces.yaw * common.maxYaw,
  };
}
