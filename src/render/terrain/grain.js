// Fine soil-and-grass grain for the ground. A small tiling noise texture is
// sampled in the ground shader at two scales (about 3 m and 48 m), so the
// ground keeps crisp detail at any height without larger textures. Fades out
// with distance in the shader.

import { DataTexture, RGBAFormat, RepeatWrapping, LinearFilter, LinearMipmapLinearFilter, MeshLambertMaterial } from 'three';
import { hash } from '../../world/noise.js';

// Value noise that wraps every `period` lattice steps, so the texture tiles.
function periodicNoise(seed, x, y, period) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const s = (t) => t * t * (3 - 2 * t);
  const fx = s(x - x0);
  const fy = s(y - y0);
  const at = (i, j) => hash(seed, ((i % period) + period) % period, ((j % period) + period) % period);
  const a = at(x0, y0);
  const b = at(x0 + 1, y0);
  const c = at(x0, y0 + 1);
  const d = at(x0 + 1, y0 + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

export function createGrainTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const octaves = [[8, 0.35], [16, 0.3], [32, 0.2], [64, 0.15]]; // [lattice cells across, weight]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      octaves.forEach(([cells, weight], i) => {
        v += weight * periodicNoise(900 + i, (x / size) * cells, (y / size) * cells, cells);
      });
      const b = Math.max(0, Math.min(255, Math.round(v * 255)));
      const o = (y * size + x) * 4;
      data[o] = b;
      data[o + 1] = b;
      data[o + 2] = b;
      data[o + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

let sharedGrain = null;

// A ground material: the tile's painted map, multiplied by the grain near the camera.
export function groundMaterial(map, offset) {
  sharedGrain ??= createGrainTexture();
  const material = new MeshLambertMaterial({ map, polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.grainMap = { value: sharedGrain };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGrainUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrainUv = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D grainMap;\nvarying vec2 vGrainUv;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float grainFade = 1.0 - smoothstep(250.0, 2500.0, length(vViewPosition));
        float fine = texture2D(grainMap, vGrainUv * 0.33).r;
        float coarse = texture2D(grainMap, vGrainUv * 0.021).r;
        diffuseColor.rgb *= 1.0 + grainFade * ((fine - 0.5) * 0.7 + (coarse - 0.5) * 0.45);`);
  };
  material.customProgramCacheKey = () => 'dawn-ground-grain';
  return material;
}
