// Materials: toon for hero food and characters (soft stepped ramp + warm rim light), Lambert for the
// background, unlit "glow" for the sky, flames and the oven window. Everything is vertex-coloured.
import * as THREE from 'three';

let ramp: THREE.DataTexture | null = null;
function gradientMap() {
  if (ramp) return ramp;
  // soft 5-step ramp; nearest filtering keeps the steps crisp (the plan's pitfall list)
  const steps = [132, 172, 212, 242, 255];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  ramp = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
}

export const rimUniform = { value: new THREE.Color(1.0, 0.72, 0.42).multiplyScalar(0.3) };

/** Jelly wobble uniforms. uWob = lean x, lean z (attribute units at the top), bulge. uWobA = base y, height, centre x, centre z. */
export interface WobbleUniforms {
  uWob: { value: THREE.Vector3 };
  uWobA: { value: THREE.Vector4 };
}
function wobbleChunk(shader: { uniforms: Record<string, any>; vertexShader: string }, wob: WobbleUniforms) {
  shader.uniforms.uWob = wob.uWob;
  shader.uniforms.uWobA = wob.uWobA;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform vec3 uWob;\nuniform vec4 uWobA;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      float wh = clamp((transformed.y - uWobA.x) / uWobA.y, 0.0, 1.0);
      transformed.xz = uWobA.zw + (transformed.xz - uWobA.zw) * (1.0 + uWob.z * sin(wh * 3.14159));
      transformed.xz += uWob.xy * wh * wh;`);
}

export interface ToonOpts {
  color?: THREE.ColorRepresentation;
  wobble?: boolean; // jelly lean in the vertex shader (the cranberry log)
  gloss?: number;   // strength of a hard toon highlight (glazed, wet or metal things)
}

/** Toon material. Each call makes its own instance so colours can be tweened per object. */
export function toonMaterial(opts: ToonOpts = {}) {
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap(), color: opts.color ?? 0xffffff });
  const wob: WobbleUniforms = { uWob: { value: new THREE.Vector3(0, 0, 0) }, uWobA: { value: new THREE.Vector4(0, 1, 0, 0) } };
  m.userData.wobble = wob;
  const gloss = { value: opts.gloss ?? 0 };
  m.userData.gloss = gloss;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = rimUniform;
    if (opts.wobble) wobbleChunk(shader, wob);
    shader.uniforms.uGloss = gloss;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;\nuniform float uGloss;')
      .replace('#include <opaque_fragment>', `vec3 nrm = normalize(normal);
        float rimF = pow(1.0 - saturate(dot(nrm, normalize(vViewPosition))), 3.0);
        outgoingLight += uRim * rimF * diffuseColor.rgb * 1.6;
        float glossF = smoothstep(0.9, 0.935, dot(nrm, normalize(vec3(-0.42, 0.62, 0.66))));
        outgoingLight += vec3(1.0, 0.97, 0.9) * glossF * uGloss;
        #include <opaque_fragment>`);
  };
  m.userData.wobbleOn = !!opts.wobble;
  m.customProgramCacheKey = () => 'toon' + (opts.wobble ? '-wob' : '');
  return m;
}

let lambert: THREE.MeshLambertMaterial | null = null;
export function lambertMaterial() {
  if (!lambert) lambert = new THREE.MeshLambertMaterial({ vertexColors: true });
  return lambert;
}

export function glowMaterial(color: THREE.ColorRepresentation, useVertex = false) {
  return new THREE.MeshBasicMaterial({ color, vertexColors: useVertex, toneMapped: false });
}

// ---- outlines: a back-face shell sharing the mesh's geometry, pushed out along the normal in view space
// by a width that scales with depth, so it stays about the same number of pixels wide on screen.
export const outlineUniform = { value: 0.0026 };
const outlineMats = new Map<string, THREE.MeshBasicMaterial>();
function outlineMaterial(skinned: boolean, wob?: WobbleUniforms) {
  const key = wob ? 'w' : skinned ? 's' : 'r';
  let m = wob ? undefined : outlineMats.get(key);
  if (m) return m;
  m = new THREE.MeshBasicMaterial({ color: 0x3b2630, side: THREE.BackSide, toneMapped: false });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uOutline = outlineUniform;
    if (wob) wobbleChunk(shader, wob);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uOutline;\nattribute float _noline;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_SKINNING
          vec3 oN = normalize(transformedNormal);
          #ifdef FLIP_SIDED
            oN = -oN; // three flips transformedNormal for back-side materials; the shell must still grow outward
          #endif
        #else
          vec3 oN = normalize(normalMatrix * normal);
        #endif
        mvPosition.xyz += oN * uOutline * max(0.8, -mvPosition.z) * (1.0 - _noline);
        gl_Position = projectionMatrix * mvPosition;`);
  };
  m.customProgramCacheKey = () => 'outline-' + key;
  if (!wob) outlineMats.set(key, m);
  return m;
}

export function addOutline(mesh: THREE.Mesh) {
  let shell: THREE.Mesh;
  if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
    const sk = mesh as THREE.SkinnedMesh;
    const s = new THREE.SkinnedMesh(sk.geometry, outlineMaterial(true));
    s.bind(sk.skeleton, sk.bindMatrix);
    shell = s;
  } else {
    const wob = (mesh.material as THREE.Material).userData.wobbleOn ? ((mesh.material as THREE.Material).userData.wobble as WobbleUniforms) : undefined;
    shell = new THREE.Mesh(mesh.geometry, outlineMaterial(false, wob));
  }
  if (mesh.morphTargetInfluences) {
    shell.morphTargetInfluences = mesh.morphTargetInfluences;
    shell.morphTargetDictionary = mesh.morphTargetDictionary;
  }
  shell.name = mesh.name + '__outline';
  shell.userData.isOutline = true;
  shell.raycast = () => {};
  shell.castShadow = shell.receiveShadow = false;
  shell.frustumCulled = mesh.frustumCulled;
  mesh.add(shell);
  return shell;
}
