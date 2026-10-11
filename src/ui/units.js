// Unit conversion for display only. The simulation always uses SI units.

export const toKnots = (metresPerSecond) => metresPerSecond * 1.943844;
export const toMph = (metresPerSecond) => metresPerSecond * 2.236936;
export const toKmh = (metresPerSecond) => metresPerSecond * 3.6;
export const toFeet = (metres) => metres * 3.280840;
export const toDegrees = (radians) => (radians * 180) / Math.PI;
