// fx.js: the effects of the 3D game, drawn as real 3D (lights, glows, particles, trails), driven by the 2D game's own state:
// its particle pool, its projectiles, its flashes and blasts, and the hero's weapon as it swings.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const TPX = 16 * Math.SQRT2, UPX = TPX * Math.cos(Math.PI / 6);
const hexOf = v => { const c = PAL32[CYCLE[v & 127] || (v & 127)] || 0xffffffff; return ((c & 255) << 16) | (((c >> 8) & 255) << 8) | ((c >> 16) & 255); };
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.75)'); g.addColorStop(0.6, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();

export function makeFx(renderer, scene, cam, persp = false) {
  // ---- glow: bright things bleed light (flames, magic, sparks, lit windows)
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 2 }));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.26, 0.45, 0.92);
  // the grade: a little more contrast and colour, warm lights against cool shadows, the corners of the screen drawn down
  const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, vig: { value: 0.42 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float vig;
      void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(.3, .59, .11));
        c.rgb = mix(vec3(l), c.rgb, 1.14); c.rgb *= mix(vec3(.94, .98, 1.08), vec3(1.06, 1.0, .93), smoothstep(0., .6, l));
        c.rgb = (c.rgb - .5 * l) * 1.06 + .5 * l; vec2 d = vUv - .5; c.rgb *= 1. - vig * smoothstep(.25, .85, dot(d, d) * 2.2); gl_FragColor = c; }` });
  composer.addPass(new RenderPass(scene, cam)); composer.addPass(bloom); composer.addPass(grade); composer.addPass(new OutputPass());
  let useBloom = true;
  function resize(w, h, ratio) { composer.setPixelRatio(ratio); composer.setSize(w, h); }
  function render(quality) { useBloom = quality >= 1; if (useBloom) composer.render(); else renderer.render(scene, cam); }

  // ---- a few lights that jump to whatever is brightest this frame (missiles, explosions, flashes)
  const dyn = []; for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffffff, 0, 8, 2); scene.add(l); dyn.push(l); }
  let dynN = 0;
  const light = (x, y, z, hex, power, dist) => { if (dynN >= dyn.length) return; const l = dyn[dynN++]; l.position.set(x, y, z); l.color.setHex(hex); l.intensity = power; l.distance = dist; };

  // ---- particles: the game's own pool (sparks, embers, blood, bone chips, dust motes), as soft round points in the world
  const PMAX = 600, mkPoints = additive => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PMAX * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PMAX * 3), 3)); g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(PMAX), 1));
    const m = new THREE.ShaderMaterial({ uniforms: { px: { value: 40 }, map: { value: glowTex } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: 'attribute float size; attribute vec3 color; varying vec3 vC; uniform float px; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = size * px' + (persp ? ' / max(0.2, -mv.z)' : '') + '; }',
      fragmentShader: additive ? 'varying vec3 vC; uniform sampler2D map; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vC * a * 1.3, a); }'
        : 'varying vec3 vC; void main(){ vec2 d = gl_PointCoord - .5; float r = dot(d, d); if (r > .25) discard; gl_FragColor = vec4(vC * (1. - r * 1.6), 1.); }' });
    const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 4; scene.add(p); return p; };
  const glowPts = mkPoints(true), solidPts = mkPoints(false), col = new THREE.Color();
  function particles(pxPerUnit) {
    let ng = 0, ns = 0; const gp = glowPts.geometry.attributes, sp = solidPts.geometry.attributes;
    for (let k = 0; k < PN; k++) {
      const kind = pkind[k]; if (!kind) continue;
      const [fi, fj] = groundToTile(px_[k], py_[k]), y = Math.max(0.02, pz_[k] / UPX), glow = kind === 2 || kind === 3 || kind === 4 || kind === 9;
      col.setHex(hexOf(kind === 1 && pcol[k] === 22 ? RED[3] : pcol[k]));
      const A = glow ? gp : sp, n = glow ? ng++ : ns++; if (n >= PMAX) continue;
      A.position.setXYZ(n, fi, y, fj); A.color.setXYZ(n, col.r, col.g, col.b);
      A.size.setX(n, (kind === 6 ? 0.2 : kind === 7 ? 0.16 : kind === 8 || kind === 9 ? 0.1 * Math.min(1, plife[k] * 2) : glow ? 0.26 : 0.11) * (persp ? 0.42 : 1));
    }
    for (const [P, n] of [[glowPts, ng], [solidPts, ns]]) { P.geometry.setDrawRange(0, Math.min(n, PMAX)); for (const k of ['position', 'color', 'size']) P.geometry.attributes[k].needsUpdate = true; P.material.uniforms.px.value = pxPerUnit; }
  }

  // ---- projectiles: a glowing heart, a fading tail, and their own light on the walls
  const PCOL = { missile: 0x9a8cff, hfire: 0xff8a2a, fire: 0xff7a22, frostbolt: 0x8fd8ff, holy: 0xffe27a };
  const sprite = (hex, order = 5) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: hex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.renderOrder = order; scene.add(s); return s; };
  const shots = new Map(), arrowGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.7, 5).rotateZ(Math.PI / 2), arrowMat = new THREE.MeshStandardMaterial({ color: 0xb08a58, roughness: 0.7 }), tipMat = new THREE.MeshStandardMaterial({ color: 0xcfd6dc, metalness: 0.8, roughness: 0.3 });
  function projectilesFx(dt) {
    for (const p of projectiles) {
      let s = shots.get(p);
      if (!s) {
        s = { trail: [], seen: 0 };
        if (p.kind === 'arrow') { s.mesh = new THREE.Group(); const shaft = new THREE.Mesh(arrowGeo, arrowMat), tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6).rotateZ(-Math.PI / 2), tipMat); tip.position.x = 0.4; s.mesh.add(shaft, tip); scene.add(s.mesh); if (p.bolt) s.core = sprite(0xbfe8ff); }
        else { s.core = sprite(PCOL[p.kind] || 0xffffff); s.halo = sprite(PCOL[p.kind] || 0xffffff); s.tail = []; for (let i = 0; i < 7; i++) s.tail.push(sprite(PCOL[p.kind] || 0xffffff, 4)); }
        shots.set(p, s);
      }
      s.seen = frame; const x = p.fi, y = Math.max(0.15, (p.z || 0) / UPX), z = p.fj, big = p.big ? 1.7 : 1;
      if (s.mesh) { s.mesh.position.set(x, y, z); s.mesh.rotation.y = -Math.atan2(p.vy || 0, p.vx || 1); if (s.core) { s.core.position.set(x, y, z); s.core.scale.setScalar(0.5 + (p.bolt || 1) * 0.12); } continue; }
      const base = p.kind === 'hfire' ? 0.85 : p.kind === 'missile' ? 0.5 : 0.6, fl = 1 + 0.12 * Math.sin(G.t * 40 + p.fi);
      s.core.position.set(x, y, z); s.core.scale.setScalar(base * big * fl); s.halo.position.set(x, y, z); s.halo.scale.setScalar(base * big * 2.6); s.halo.material.opacity = 0.2;
      s.trail.unshift([x, y, z]); if (s.trail.length > 16) s.trail.pop();
      s.tail.forEach((t, i) => { const q = s.trail[Math.min(s.trail.length - 1, (i + 1) * 2)]; t.position.set(q[0], q[1], q[2]); const k = 1 - (i + 1) / 8; t.scale.setScalar(base * big * k * 0.9); t.material.opacity = k * 0.7; });
      light(x, y + 0.2, z, PCOL[p.kind] || 0xffffff, p.kind === 'hfire' ? 5 * big : 3, p.kind === 'hfire' ? 6 : 4.5);
    }
    for (const [p, s] of shots) if (s.seen !== frame) { for (const o of [s.core, s.halo, s.mesh, ...(s.tail || [])]) if (o) scene.remove(o); shots.delete(p); }
  }

  // ---- flashes and blasts: light thrown on the room, and a ball of fire (or frost) that swells and thins away
  const TINT = [0xfff0d0, 0xff8a30, 0x9fdcff, 0xa48cff], shellGeo = new THREE.IcosahedronGeometry(1, 2), shells = new Map();
  function blastsFx() {
    for (const f of G.flashes) light(f.fi, 1.2, f.fj, TINT[f.tint || 0], 7 * f.t / f.t0 * (f.r / 90), Math.max(5, f.r / TPX * 1.6));
    for (const b of G.blasts) {
      let s = shells.get(b);
      if (!s) { s = { mesh: new THREE.Mesh(shellGeo, new THREE.MeshBasicMaterial({ color: b.cold ? 0x9fdcff : 0xff9a3a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })), glow: sprite(b.cold ? 0xbfe8ff : 0xffb060) }; s.mesh.renderOrder = 5; scene.add(s.mesh); shells.set(b, s); }
      s.seen = frame; const u = 1 - b.t / b.t0, R = b.r * (0.35 + 0.75 * Math.min(1, u * 2.2)), rise = b.cold ? 0 : u * 0.8;
      s.mesh.position.set(b.fi, 0.3 + rise, b.fj); s.mesh.scale.set(R, R * (b.cold ? 0.35 : 0.8), R); s.mesh.material.opacity = Math.max(0, 0.38 * (1 - u) * (1 - u));
      s.mesh.material.color.setHex(b.cold ? 0x9fdcff : u < 0.3 ? 0xffe0a0 : u < 0.6 ? 0xff8a2a : 0xb03a12);
      s.glow.position.set(b.fi, 0.6 + rise, b.fj); s.glow.scale.setScalar(R * 3.2); s.glow.material.opacity = Math.max(0, 0.45 * (1 - u));
    }
    for (const [b, s] of shells) if (s.seen !== frame) { scene.remove(s.mesh); scene.remove(s.glow); shells.delete(b); }
  }

  // ---- swing trails: a ribbon of light swept by the weapon while it moves fast
  const TR = 14, trGeo = new THREE.BufferGeometry(); trGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TR * 2 * 3), 3)); trGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TR * 2 * 3), 3));
  { const idx = []; for (let i = 0; i < TR - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); trGeo.setIndex(idx); }
  const trMesh = new THREE.Mesh(trGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); trMesh.frustumCulled = false; trMesh.renderOrder = 6; scene.add(trMesh);
  const hist = []; let lastTip = null;
  function trail(dt, blade, swinging) {   // blade = { base: Vector3, tip: Vector3 } in the world, or null
    for (const h of hist) h.age += dt; while (hist.length && (hist[hist.length - 1].age > 0.16 || hist.length > TR)) hist.pop();
    if (blade) { const sp = lastTip ? blade.tip.distanceTo(lastTip) / Math.max(dt, 1e-3) : 0; lastTip = blade.tip.clone(); if (swinging && sp > 5) hist.unshift({ a: blade.base.clone().lerp(blade.tip, 0.35), b: blade.tip.clone(), age: 0 }); } else lastTip = null;
    const P = trGeo.attributes.position, C = trGeo.attributes.color, n = hist.length;
    for (let i = 0; i < TR; i++) { const h = hist[Math.min(i, n - 1)] || { a: new THREE.Vector3(), b: new THREE.Vector3(), age: 1 }, k = n > 1 && i < n ? Math.max(0, 1 - h.age / 0.16) * (1 - i / n) : 0;
      P.setXYZ(i * 2, h.a.x, h.a.y, h.a.z); P.setXYZ(i * 2 + 1, h.b.x, h.b.y, h.b.z); C.setXYZ(i * 2, 0.3 * k, 0.36 * k, 0.45 * k); C.setXYZ(i * 2 + 1, 0.62 * k, 0.62 * k, 0.6 * k); }
    P.needsUpdate = C.needsUpdate = true; trMesh.visible = n > 1;
  }

  let frame = 0;
  function update(dt, pxPerUnit, blade, swinging) { frame++; dynN = 0; particles(pxPerUnit); projectilesFx(dt); blastsFx(); trail(dt, blade, swinging); for (let i = dynN; i < dyn.length; i++) dyn[i].intensity = 0; }
  return { update, render, resize };
}
