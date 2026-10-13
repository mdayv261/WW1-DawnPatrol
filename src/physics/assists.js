// Auto-rudder: an optional assist (Options screen) that works the rudder to keep the sideslip
// at zero, as a pilot's feet keep the slip ball centred: in turns, and against a rotary's
// torque swing. It only changes the rudder input, so the aircraft still flies by the same
// flight model. The pilot's own rudder takes over at once. Settings: AUTO_RUDDER in
// src/aircraft/assists.js. Pure (tested); session.js uses it for the player only.
//
// It damps the nose's swing (a yaw damper) and leads the roll with a little rudder, rather than
// only chasing the sideslip after it has built up, which set up yaw oscillations in hard
// manoeuvring. It also stops building its steady (summed) rudder while the aircraft rolls fast,
// uses only part of the rudder in the air, and lets go as the wing stalls (rudder in a stall
// only feeds a spin).

import { AUTO_RUDDER } from '../aircraft/assists.js';
import { G } from '../core/constants.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createAutoRudder(cfg = AUTO_RUDDER) {
  let sum = 0; // the sideslip summed over time (holds steady rudder against a steady swing)
  let smooth = null; // the smoothed sideslip
  let lastSmooth = null;

  return {
    // Forget the summed rudder (a new flight, or the assist switched off).
    reset() {
      sum = 0;
      smooth = null;
      lastSmooth = null;
    },

    // The input with the auto-rudder's yaw, for one physics step of dt seconds. diag: the
    // flight model's last diagnostics (sideslip `beta`, speed, onGround, stall 0-1); motion:
    // { yawRate (nose swinging right), rollRate (rolling right), both rad/s, bank (right wing
    // down) and pitch, radians }. Returns the input unchanged while the pilot is using the rudder.
    apply(input, diag, dt, motion = {}) {
      const { yawRate = 0, rollRate = 0, bank = 0, pitch = 0 } = motion;
      if (!diag || Math.abs(input.yaw) > cfg.override) {
        this.reset();
        return input;
      }
      if (diag.speed < cfg.minSpeed) {
        this.reset();
        // Rolling slowly on the ground: only check a swing (the sideslip means little yet).
        return diag.onGround ? { ...input, yaw: clamp(-cfg.groundRateGain * yawRate, -1, 1) } : input;
      }
      // Smoothed sideslip and its rate of change (no chasing of quick wobbles).
      const a = 1 - Math.exp(-dt / cfg.smoothing);
      smooth = smooth === null ? diag.beta : smooth + a * (diag.beta - smooth);
      const rate = lastSmooth === null ? 0 : (smooth - lastSmooth) / dt;
      lastSmooth = smooth;
      const k = clamp((cfg.refSpeed / diag.speed) ** 2, cfg.minScale, cfg.maxScale); // firmer slow, softer fast
      // The steady part builds only in steady flight: not while rolling fast or stalling.
      const stall = diag.stall ?? 0;
      const limit = cfg.integralLimit / (cfg.integralGain * k);
      if (Math.abs(rollRate) < cfg.rollRateHold && stall < 0.3) sum = clamp(sum + smooth * dt, -limit, limit);
      let yaw = k * (cfg.slipGain * smooth + cfg.integralGain * sum + cfg.rateGain * rate);
      if (diag.onGround) yaw -= cfg.groundRateGain * yawRate; // on the take-off run, also check the swing itself
      else {
        // The yaw rate a balanced turn at this bank has, and the damper and roll lead (they need
        // less rudder the faster the aircraft goes: x refSpeed / speed).
        const balanced = (G * Math.sin(bank) * Math.cos(pitch)) / diag.speed;
        const s = cfg.refSpeed / diag.speed;
        yaw += s * (cfg.rollLead * rollRate - cfg.yawDamping * (yawRate - balanced));
        yaw = clamp(yaw, -cfg.authority, cfg.authority) * (1 - stall); // gentle in the air; lets go in a stall
      }
      return { ...input, yaw: clamp(yaw, -1, 1) };
    },
  };
}
