// Propeller effects on the airframe besides thrust (estimates, see
// docs/AIRCRAFT_DATA.md "Common flight-model parameters"):
//   - propwash over the tail: momentum theory says the slipstream's dynamic
//     pressure exceeds the free stream's by thrust / disc area, so under
//     power the elevator and rudder work even at low speed;
//   - slipstream swirl: the spiralling wash pushes sideways on the fin,
//     giving a yaw moment proportional to the propeller's torque;
//   - P-factor: with the propeller axis inclined to the airflow, the
//     descending blade takes a bigger bite and the thrust centre moves
//     toward it.
// For a propeller turning clockwise as seen from the cockpit
// (rotationSign +1), swirl and P-factor both yaw the nose LEFT.

// Extra dynamic pressure in the slipstream (Pa): thrust / disc area.
export function slipstreamPressure(ac, thrust) {
  const area = (Math.PI * ac.propeller.diameter * ac.propeller.diameter) / 4;
  return Math.max(0, thrust) / area;
}

// Moments (aeroplane axes: roll positive right wing down, pitch nose up,
// yaw nose right; N m) from the slipstream and P-factor.
//   thrust (N), shaftTorque (N m, propeller torque), alpha (rad),
//   defl: control deflections (rad), w: wingConstants.
export function propellerMoments(ac, common, { thrust, shaftTorque, alpha, defl, w }) {
  const dq = common.tailWashFraction * slipstreamPressure(ac, thrust);
  const sign = ac.engine.rotationSign;
  const radius = ac.propeller.diameter / 2;
  return {
    pitch: dq * w.S * w.chord * common.cmDeltaPull * defl.pull,
    yaw:
      dq * w.S * w.b * common.cnDeltaYaw * defl.yaw -
      sign * common.swirlYaw * shaftTorque -
      sign * common.pFactor * radius * alpha * thrust,
  };
}
