// What each cockpit instrument shows, as plain numbers (no drawing), from the flight model's
// readings and the damage state. Airspeed, altimeter, tachometer, compass and slip come from
// instrumentMath.js (tested in Phase 2). The others are simple behaviours chosen to look right:
// fuel contents from the tank, the fuel tank's air pressure (lost through a holed tank), oil
// pressure and the rotary's oil pulsator following the engine, the water temperature of a
// water-cooled engine, and a clock.

import { airspeedReading, altimeterReading, tachometerReading, compassHeading, slipBall } from '../instrumentMath.js';
import { INSTRUMENTS as I } from '../../aircraft/instrumentBehaviour.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// state: { aircraft, diag (or null), heading (rad), damage, throttle (0-1), time (s) }.
// Returns a map from instrument kind to its reading.
export function readings({ aircraft, diag, heading = 0, damage, throttle = 0, time = 0 }) {
  const rpm = diag ? diag.rpm : 0;
  const rated = aircraft.engine.ratedRpm * aircraft.propeller.gearRatio;
  const running = damage ? damage.engine < 1 && damage.fuel > 0 : true;
  const engineHurt = damage ? damage.engine : 0;
  const leaking = damage ? damage.tank : 0;
  const fuel = damage ? damage.fuel : 1;
  const power = diag && diag.power ? diag.power / aircraft.engine.ratedPower : 0;
  const speedish = diag ? clamp01(diag.speed / aircraft.documented.maxSpeed) : 0;
  return {
    airspeed: airspeedReading(aircraft, diag ? diag.speed : 0),
    altimeter: altimeterReading(aircraft, diag ? diag.altitude : 0),
    tachometer: tachometerReading(aircraft, rpm),
    compass: { heading: compassHeading(heading) },
    // The slip indicator's ball: -1 (full left) to +1 (full right), from the sideslip (instrumentMath.js).
    slip: { ball: slipBall(diag ? diag.beta ?? 0 : 0) },
    fuelGauge: { fraction: fuel },
    // The fuel tank is pressurised (a pump keeps it at its working pressure); a hole lets it out.
    airPressure: { fraction: fuel > 0 && running ? clamp01(I.airPressure * (1 - leaking)) : 0 },
    fuelPressure: { fraction: fuel > 0 && running ? clamp01(I.fuelPressure * (1 - 0.8 * leaking)) : 0 },
    oilPressure: { fraction: running ? clamp01((rpm / rated) * I.oilPressure * (1 - 0.6 * engineHurt)) : 0 },
    // The pulsator glass shows a pulse of oil per stroke of the oil pump; it stops when the engine does.
    pulsator: { level: running && rpm > 0 ? 0.5 + 0.5 * Math.sin(time * (rpm / 60) * I.pulsatorStrokes * 2 * Math.PI / 20) : 0.1 },
    // A water-cooled engine runs hotter with more power and less cooling air, and much hotter when damaged.
    waterTemp: { celsius: I.waterBase + I.waterPerPower * power - I.waterPerSpeed * speedish + I.waterDamaged * engineHurt },
    clock: { hours: (I.missionStartHour + time / 3600) % 12 },
    switches: { on: running },
  };
}
