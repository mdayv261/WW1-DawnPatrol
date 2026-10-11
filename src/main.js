// Entry point. Starts the renderer and the fixed-step loop.
// Phase 0 has no physics yet, so the physics step is an empty placeholder.

import { createScene } from './render/scene.js';
import { FixedStepLoop } from './core/fixedStepLoop.js';

const canvas = document.getElementById('game');
const { renderer, scene, camera } = createScene(canvas);
const loop = new FixedStepLoop();

// Called 120 times per simulated second. Physics goes here from Phase 1.
function physicsStep(_dt) {}

let lastTime = performance.now();

function frame(now) {
  const realDt = (now - lastTime) / 1000;
  lastTime = now;

  const { alpha } = loop.advance(realDt, physicsStep);
  // From Phase 1 the renderer uses alpha to blend the previous and current
  // physics states. Nothing moves yet, so it is unused for now.
  void alpha;

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
