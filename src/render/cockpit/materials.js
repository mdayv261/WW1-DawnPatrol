// The cockpit's materials: physically based (they reflect a picture of the sky, see
// environment.js), with the code-made textures from textures.js. Outside a browser (the tests)
// they are plain colours.

import { MeshStandardMaterial, DoubleSide, FrontSide } from 'three';
import { patternTextures } from './textures.js';

function standard(colour, { pattern = null, options = {}, roughness = 0.7, metalness = 0, bump = 0.002, side = FrontSide, ...extra } = {}) {
  const tex = pattern ? patternTextures(pattern, options) : null;
  return new MeshStandardMaterial({
    color: tex ? 0xffffff : colour,
    map: tex?.map ?? null,
    bumpMap: tex?.bumpMap ?? null,
    bumpScale: tex ? bump : 1,
    roughness,
    metalness,
    side,
    ...extra,
  });
}

// style: one entry of COCKPITS (src/aircraft/cockpits.js), for its colours.
export function cockpitMaterials(style) {
  const m = {
    leather: standard(style.leather, { pattern: 'leather', options: { colour: style.leather }, roughness: 0.55, bump: 0.004 }),
    wood: standard(0x8a5a30, { pattern: 'wood', roughness: 0.45, bump: 0.0015 }),
    plywood: standard(0xb08850, { pattern: 'plywood', options: style.plywood ? { light: style.plywood[0], dark: style.plywood[1] } : {}, roughness: 0.55, bump: 0.001 }),
    walls: style.walls === 'plywood'
      ? standard(0xb08850, { pattern: 'plywood', roughness: 0.6, bump: 0.001, vertexColors: true })
      : standard(style.wallColour, { pattern: 'linen', options: { colour: style.wallColour }, roughness: 0.85, bump: 0.0006, vertexColors: true }),
    frame: style.frame === 'tube'
      ? standard(style.frameColour, { pattern: 'paint', options: { colour: style.frameColour }, roughness: 0.6, metalness: 0.3, vertexColors: true })
      : standard(0x8a5a30, { pattern: 'wood', roughness: 0.5, bump: 0.001, vertexColors: true }),
    floor: standard(0x5a3d22, { pattern: 'plywood', options: { light: 0x6a4a2a, dark: 0x3e2a16 }, roughness: 0.8, vertexColors: true }),
    decking: standard(style.decking, { pattern: style.deckingPattern ?? 'linen', options: { colour: style.decking }, roughness: style.deckingGloss ? 0.32 : 0.75, metalness: style.deckingGloss ? 0.25 : 0, bump: 0.0008 }),
    bulkhead: standard(style.bulkhead ?? 0x3a3d40, { pattern: 'paint', options: { colour: style.bulkhead ?? 0x3a3d40 }, roughness: 0.5, metalness: 0.5 }),
    paintedSteel: standard(style.frameColour ?? 0x9aa3a8, { pattern: 'paint', options: { colour: style.frameColour ?? 0x9aa3a8 }, roughness: 0.45, metalness: 0.3 }),
    gunmetal: standard(0x2b2d30, { pattern: 'gunmetal', roughness: 0.42, metalness: 0.85, bump: 0.0008 }),
    louvred: standard(0x2b2d30, { pattern: 'louvred', roughness: 0.42, metalness: 0.85, bump: 0.003 }),
    perforated: standard(0x2b2d30, { pattern: 'perforated', roughness: 0.42, metalness: 0.85, bump: 0.003 }),
    bezel: standard(style.bezel, { roughness: 0.3, metalness: 1 }),
    brass: standard(0xb08a3e, { roughness: 0.3, metalness: 1 }),
    steel: standard(0x9a9ea3, { roughness: 0.35, metalness: 1 }),
    black: standard(0x151515, { roughness: 0.6 }),
    grip: standard(0x7a4a24, { pattern: 'wood', options: { light: 0x8c5a2e, dark: 0x4e2e14, seed: 11 }, roughness: 0.4 }),
    glass: new MeshStandardMaterial({ color: 0xdfe8ee, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.14, depthWrite: false, side: DoubleSide }),
    gaugeGlass: new MeshStandardMaterial({ color: 0xffffff, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.1, depthWrite: false }),
  };
  return m;
}

// Give every material in the set the sky picture to reflect (null removes it).
export function setEnvironment(materials, envMap) {
  for (const mat of Object.values(materials)) {
    mat.envMap = envMap;
    mat.envMapIntensity = 0.8;
    mat.needsUpdate = true;
  }
}
