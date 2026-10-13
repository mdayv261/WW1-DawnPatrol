// How the period instruments behave where no physics drives them directly. Display behaviour
// only (no effect on the flight); design choices, recorded in docs/DECISIONS.md.

export const INSTRUMENTS = {
  airPressure: 0.6, // normal fuel tank air pressure, as a share of the gauge's scale
  fuelPressure: 0.55, // normal fuel pressure, share of the scale
  oilPressure: 0.75, // oil pressure at rated engine speed, share of the scale
  pulsatorStrokes: 1, // oil pump strokes per engine turn (the glass is drawn at a twentieth of that rate so it can be seen)
  waterBase: 62, // degrees C, a water-cooled engine idling in cool air
  waterPerPower: 22, // degrees C more at full power
  waterPerSpeed: 8, // degrees C less at top speed (more cooling air)
  waterDamaged: 35, // degrees C more with the engine fully damaged
  missionStartHour: 7, // the clock's hour at the start of a mission
};
