import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const NAMES = ['soldier', 'zombie', 'brute', 'minigun', 'rocket', 'gate', 'pedestal', 'pine', 'crate', 'barrel', 'tires', 'barrier', 'lamp'];

/** Loads the Blender GLBs. Each file is one mesh with COLOR_0 plus the custom _part/_tint attributes. */
export async function loadModels(base = 'assets/models/', embedded = window.__MODELS__) {
  const loader = new GLTFLoader();
  const out = {};
  await Promise.all(NAMES.map(async name => {
    const gltf = embedded && embedded[name]
      ? await loader.parseAsync(embedded[name], '')
      : await loader.loadAsync(`${base}${name}.glb`);
    let geo = null;
    gltf.scene.traverse(o => { if (o.isMesh && !geo) geo = o.geometry; });
    geo = geo.clone();
    // COLOR_0 arrives as vec4 (uint16 normalised); drop alpha so three uses the plain vec3 path
    const c = geo.getAttribute('color');
    if (c && c.itemSize === 4) {
      const a = new Float32Array(c.count * 3);
      for (let i = 0; i < c.count; i++) { a[i * 3] = c.getX(i); a[i * 3 + 1] = c.getY(i); a[i * 3 + 2] = c.getZ(i); }
      geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    }
    out[name] = geo;
  }));
  return out;
}

export const timeUniform = { value: 0 };

/**
 * Vertex-shader walk cycle. `_part` picks which part swings (1/2 legs, 3/4 arms) and `aPhase` desyncs
 * instances; `_tint` marks vertices (zombie shirts) that take the per-instance colour `aTint`.
 */
export function animatedMaterial({ hip = 0.3, shoulder = 0.54, legSwing = 0.75, armSwing = 0.0, speed = 9, bob = 0.04, tinted = false, flat = true }) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0, flatShading: flat });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = timeUniform;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float _part; attribute float _tint; attribute float aPhase; attribute vec3 aTint; attribute float aFlash;
        uniform float uTime; varying float vFlash;`)
      .replace('#include <color_vertex>', `#include <color_vertex>
        ${tinted ? 'vColor = mix(vColor, vColor * aTint, _tint);' : ''}
        vFlash = aFlash;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float s = sin(uTime * ${speed.toFixed(2)} + aPhase);
        float ang = 0.0; float piv = ${hip.toFixed(3)};
        if (_part > 0.5 && _part < 1.5) ang = s * ${legSwing.toFixed(3)};
        else if (_part > 1.5 && _part < 2.5) ang = -s * ${legSwing.toFixed(3)};
        else if (_part > 2.5 && _part < 3.5) { ang = -s * ${armSwing.toFixed(3)}; piv = ${shoulder.toFixed(3)}; }
        else if (_part > 3.5) { ang = s * ${armSwing.toFixed(3)}; piv = ${shoulder.toFixed(3)}; }
        float cs = cos(ang), sn = sin(ang);
        float py = transformed.y - piv;
        transformed.y = py * cs - transformed.z * sn + piv;
        transformed.z = py * sn + transformed.z * cs;
        transformed.y += abs(s) * ${bob.toFixed(3)};`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFlash;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), vFlash * 0.7);');
  };
  return m;
}

/** InstancedMesh with per-instance phase / tint / flash, filled each frame through add(). */
export class Crowd {
  constructor(geometry, material, max, scene) {
    this.max = max;
    this.geo = geometry.clone();
    this.phase = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    this.tint = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.flash = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    for (const a of [this.phase, this.tint, this.flash]) a.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('aPhase', this.phase);
    this.geo.setAttribute('aTint', this.tint);
    this.geo.setAttribute('aFlash', this.flash);
    this.mesh = new THREE.InstancedMesh(this.geo, material, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.count = 0;
    this.n = 0;
    scene.add(this.mesh);
    this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._m = new THREE.Matrix4();
    this._up = new THREE.Vector3(0, 1, 0);
  }
  begin() { this.n = 0; }
  add(x, y, z, rotY, scale, phase, r = 1, g = 1, b = 1, flash = 0) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this._q.setFromAxisAngle(this._up, rotY);
    this._m.compose(this._p.set(x, y, z), this._q, this._s.set(scale, scale, scale));
    this._m.toArray(this.mesh.instanceMatrix.array, i * 16);
    this.phase.array[i] = phase;
    this.tint.array[i * 3] = r; this.tint.array[i * 3 + 1] = g; this.tint.array[i * 3 + 2] = b;
    this.flash.array[i] = flash;
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.phase.needsUpdate = this.tint.needsUpdate = this.flash.needsUpdate = true;
  }
}
