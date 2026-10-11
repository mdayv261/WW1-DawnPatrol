// International Standard Atmosphere: temperature, pressure, density and
// speed of sound as a function of altitude. Valid from below sea level up to
// 20 km, well above any WWI aircraft's ceiling.

import { G, ISA } from '../core/constants.js';

const MIN_ALT = -1000;
const MAX_ALT = 20000;

// Pressure at the top of the troposphere (computed once).
const TROPO_TEMP = ISA.T0 - ISA.LAPSE * ISA.TROPOPAUSE;
const P_TROPOPAUSE =
  ISA.P0 * Math.pow(TROPO_TEMP / ISA.T0, G / (ISA.R * ISA.LAPSE));

// altitude: metres above sea level. Returns { temperature, pressure, density, soundSpeed }.
export function atmosphere(altitude) {
  const h = Math.min(MAX_ALT, Math.max(MIN_ALT, altitude));
  let temperature;
  let pressure;
  if (h <= ISA.TROPOPAUSE) {
    temperature = ISA.T0 - ISA.LAPSE * h;
    pressure = ISA.P0 * Math.pow(temperature / ISA.T0, G / (ISA.R * ISA.LAPSE));
  } else {
    temperature = ISA.T_STRATO;
    pressure = P_TROPOPAUSE * Math.exp((-G * (h - ISA.TROPOPAUSE)) / (ISA.R * temperature));
  }
  const density = pressure / (ISA.R * temperature);
  const soundSpeed = Math.sqrt(ISA.GAMMA * ISA.R * temperature);
  return { temperature, pressure, density, soundSpeed };
}

// Air density relative to sea level (the "sigma" used for engine power).
export function densityRatio(altitude) {
  return atmosphere(altitude).density / ISA.RHO0;
}
