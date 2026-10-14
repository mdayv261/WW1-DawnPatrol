# WWI Dogfight Simulator - Game Specification

## 1. Vision
A browser-based World War One air combat simulator. Single-player
dogfights against AI opponents. Authentic flight behaviour is the
top priority; graphics are clean and low-polygon, not photorealistic.

## 2. Technical constraints
- HTML5 + JavaScript (ES2022 modules). No TypeScript, no frameworks
  beyond those listed.
- Three.js for 3D rendering. Vite for dev server and build.
- Vitest for automated tests.
- No paid or copyrighted assets. All models, textures and sounds
  are generated in code or are clearly licensed for free use
  (record the licence in docs/DECISIONS.md).
- Target: 60 fps on a mid-range laptop, Chrome and Firefox.
- Physics runs on a fixed time step (target 120 Hz), decoupled
  from rendering. Use SI units (metres, kg, seconds, newtons)
  internally; convert only for display.

## 3. Aircraft (first release)
| Aircraft          | Side    | Engine type |
| Sopwith Camel F.1 | Allied  | Rotary      |
| SPAD S.XIII       | Allied  | Inline V8   |
| Fokker Dr.I       | Central | Rotary      |
| Albatros D.V      | Central | Inline 6    |

All performance and dimension figures come from documented
historical sources (museum records, aviation reference books,
government or university publications). Record each value in
docs/AIRCRAFT_DATA.md with: value, unit, source, confidence
(high / medium / estimate). Never invent a figure silently.
Avoid forums and Reddit as sources.

## 4. Flight model requirements
- Six degrees of freedom rigid body (position, velocity,
  orientation as quaternion, angular velocity).
- International Standard Atmosphere for air density vs altitude.
- Lift and drag from coefficient curves vs angle of attack,
  including post-stall behaviour and wing drop at the stall.
- Induced drag from aspect ratio; parasitic drag per aircraft.
- Engine power vs altitude; propeller thrust vs airspeed.
- Control surface authority scales with dynamic pressure.
- Rotary engines: engine torque roll and gyroscopic precession
  (Camel turns faster right than left, nose drops in right turns).
- Structural limits: excess g-load or speed damages the airframe.
- Spins and spin recovery must be possible.
- Ground handling: taxi, take-off, landing, nose-over risk.
- Debug overlay toggled with F3: airspeed, altitude, angle of
  attack, sideslip, g-load, thrust, lift, drag.

## 5. Controls
- Keyboard + mouse default; fully rebindable.
- Pitch, roll, yaw, throttle, trim, fire, view controls.
- USB joystick (Logitech Extreme 3D Pro, the primary controller) via the
  Gamepad API: Phase 2, checkpoint 3 (product owner's decision).
  Other gamepads: Phase 7.
- Optional assists: auto-rudder, stall warning. Off by default
  in Realistic mode.

## 6. Weapons and damage
- Period machine guns (e.g. twin Vickers, twin LMG 08/15),
  synchronised through the propeller arc, realistic rate of fire.
- Bullet ballistics: muzzle velocity, gravity, air drag.
- Limited ammunition; gun jams with a clear-jam key.
- Component damage: engine, fuel tank, pilot, wings, tail,
  control cables. Damage feeds back into the flight model.

## 7. AI opponents
- AI pilots use the same flight model and control inputs as the
  player. No extra speed, turn rate or perfect aim.
- Behaviour states: patrol, engage, attack, evade, disengage.
- Manoeuvres: turning fight, climbing turn, Immelmann, split-S,
  boom-and-zoom, defensive break.
- Skill levels change reaction time, aim error, energy
  management and willingness to disengage.

## 8. World
- Procedural Western Front terrain: farmland, woods, villages,
  trench lines, rivers. Sky with sun, haze and clouds.
- Altitude ceiling suitable for period aircraft.

## 9. Game flow and UI
- Main menu, mission setup (player aircraft, enemy type and
  count, skill, start altitude, time of day), pause, results.
- Cockpit instruments matching each aircraft's period layout,
  plus an optional modern HUD.
- Settings: controls, graphics quality, sound volume, assists.

## 10. Audio
- Web Audio API. Engine sound varies with RPM; guns, hits,
  wind noise varying with airspeed.

## 11. Quality rules
- Every physics and AI module has automated tests.
- Code is commented in plain English; functions stay small.
- Physics constants live in data files, never hard-coded.

## 12. Multiplayer (added by the product owner's brief, Oct 2026)
- 2-4 human players in private rooms joined by a six-letter code, Allied against Central; no AI
  aircraft in multiplayer. The single-player game is unchanged.
- An authoritative room server (Cloudflare Workers + Durable Objects) runs the same validated
  flight model for every aircraft and decides every hit (lag-compensated up to 0.4 s).
- Full design: docs/MULTIPLAYER_SPEC.md. Guide for players: docs/MULTIPLAYER_GUIDE.md.

