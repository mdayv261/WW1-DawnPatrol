// A small picture of the surroundings for the cockpit's metal and glass to reflect: the sky
// (zenith to horizon, with a bright patch where the sun is) over a dark ground, in the current
// time of day's colours. Made once per mission with three.js's PMREM generator.

import { Scene, Mesh, SphereGeometry, ShaderMaterial, BackSide, PMREMGenerator, Color, Vector3 } from 'three';

const VERTEX = `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = `
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform vec3 ground;
  uniform vec3 sunColour;
  uniform vec3 sunDir;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    vec3 sky = mix(horizon, zenith, pow(max(d.y, 0.0), 0.6));
    vec3 c = d.y >= 0.0 ? sky : mix(horizon * 0.6, ground, min(1.0, -d.y * 4.0));
    c += sunColour * pow(max(dot(d, sunDir), 0.0), 64.0) * 4.0;
    gl_FragColor = vec4(c, 1.0);
  }
`;

// renderer: the WebGLRenderer; sky: skyFor(time) from render/sky.js. Returns a texture (dispose it when replaced).
export function skyEnvironment(renderer, sky) {
  const scene = new Scene();
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: BackSide,
    uniforms: {
      zenith: { value: new Color(sky.zenith) },
      horizon: { value: new Color(sky.horizon) },
      ground: { value: new Color(sky.groundLight).multiplyScalar(0.5) },
      sunColour: { value: new Color(sky.sunColour) },
      sunDir: { value: new Vector3(...sky.sunDirection).normalize() },
    },
  });
  scene.add(new Mesh(new SphereGeometry(10, 32, 16), material));
  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  material.dispose();
  return target.texture;
}
