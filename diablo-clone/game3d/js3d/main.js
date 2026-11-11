// The 3D layer of Dungeons of Bones. Reads the 2D game's live state (hero, enemies, LV, ...) and draws it with Three.js.
// World units: 1 unit = 1 tile; tile (i, j) covers x i..i+1, z j..j+1; y is up. The camera is the 2D game's own
// projection (orthographic, 30 degrees above the ground, looking along -x -z), so the pixel HUD and effects line up.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { makeFx } from './fx.js';

const TPX = 16 * Math.SQRT2;            // world pixels (1x) per unit along the screen's x
const UPX = TPX * Math.cos(Math.PI / 6); // world pixels per unit of height
const glc = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050406);
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
const CAMDIR = new THREE.Vector3(Math.cos(Math.PI / 6) * Math.SQRT1_2, Math.sin(Math.PI / 6), Math.cos(Math.PI / 6) * Math.SQRT1_2);
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.25; }
const hemi = new THREE.HemisphereLight(0x8fa0d0, 0x2a1c14, 0.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dc, 1.2); sun.castShadow = true; scene.add(sun, sun.target);
{ const s = sun.shadow; const SM = ('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 1024 : 2048; s.mapSize.set(SM, SM); s.camera.left = s.camera.bottom = -11; s.camera.right = s.camera.top = 11; s.camera.near = 1; s.camera.far = 60; s.bias = -0.0015; s.normalBias = 0.03; }
const heroLight = new THREE.PointLight(0xffd9a8, 6, 9, 2); scene.add(heroLight);
const torchLights = []; for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xff9440, 0, 9, 2); scene.add(l); torchLights.push(l); }

const fx = makeFx(renderer, scene, cam);

// ---------------------------------------------------------------- models
// Every model is built by headless Blender from the 2D game's rigs (tools/dump.cjs -> blender/scripts/convert.py).
// models/manifest.json: chars (family + look -> file), props (name -> file), rigs (stairs, by shape), heroes (the hero in
// pieces: body by armour, head by helm, weapon, shield arm), tl (each file's clips on its one timeline: [start, length, loops]).
const loader = new GLTFLoader(), MODELS = {}, LOADING = {}; loader.setMeshoptDecoder(MeshoptDecoder);
let MANIFEST = { chars: {}, props: {}, rigs: {}, heroes: {}, tl: {} };
function prep(g) { g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } }); return g; }
function wantModel(file) {
  if (MODELS[file]) return MODELS[file];
  if (!LOADING[file]) LOADING[file] = loader.loadAsync('models/' + file + '.glb').then(g => { MODELS[file] = prep(g); }).catch(e => { console.error('3d: model ' + file, e); MODELS[file] = null; });
  return null;
}
function whenModel(file) { wantModel(file); return (LOADING[file] || Promise.resolve()).then(() => MODELS[file]); }
// Characters get a soft rim of light on the edges turned away from the camera, so they stand out from a dark room
const rimLight = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ float rim = pow(1.0 - clamp(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 2.6); totalEmissiveRadiance += diffuseColor.rgb * vec3(0.75, 0.85, 1.1) * rim * 0.28; }'); };
function spawnModel(file) {
  const g = MODELS[file], root = SkeletonUtils.clone(g.scene), mats = [];
  const own = m => { const c = m.clone(); c.userData.e0 = c.emissive.getHex(); c.userData.i0 = c.emissiveIntensity; c.onBeforeCompile = rimLight; c.customProgramCacheKey = () => 'rim'; mats.push(c); return c; };
  root.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(own) : own(o.material); });
  let mixer = null, acts = null;
  if (g.animations.length) { mixer = new THREE.AnimationMixer(root); const clip = g.animations[0]; acts = [mixer.clipAction(clip), mixer.clipAction(clip.clone())]; for (const a of acts) { a.play(); a.paused = true; a.setEffectiveWeight(0); } }
  return { root, mixer, acts, cur: 0, tl: MANIFEST.tl[file] || {}, mats };
}

// ---------------------------------------------------------------- the level: floors and walls from LV.map
let levelGroup = null, builtLevel = -1;
const THEME = { crypt: { floor: [0x5a4a3c, 0x66543f, 0x4e4238, 0x6e5b44], wall: [0x4a4040, 0x554844, 0x403838] }, caves: { floor: [0x3e4048, 0x4a4c58, 0x363844], wall: [0x30323a, 0x3a3c46, 0x2a2b33] },
  hell: { floor: [0x4d1c18, 0x6b2a1f, 0x3a1614], wall: [0x341414, 0x4d1c18, 0x2a1010] }, outdoor: { floor: [0x5f7a3a, 0x688442, 0x587236, 0x6f8a46], wall: [0x2e4a2a, 0x355230, 0x284224] } };
function hash2(i, j) { let h = (i * 374761393 + j * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function buildLevel() {
  if (levelGroup) { scene.remove(levelGroup); levelGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); }); if (levelGroup.userData.gtex) levelGroup.userData.gtex.dispose(); for (const k of ['wtex', 'wnorm', 'gnorm']) if (levelGroup.userData[k]) levelGroup.userData[k].dispose(); }
  levelGroup = new THREE.Group(); scene.add(levelGroup);
  const th = LV.outdoor ? THEME.outdoor : THEME[LV.theme || 'crypt'] || THEME.crypt;
  const floors = [], walls = [];
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) { const t = LV.map[j * MW + i]; if (t === FLOOR) floors.push([i, j]); else if (t === WALL) walls.push([i, j, LV.tall[j * MW + i] ? WALL_TALL / UPX : WALL_LOW / UPX]); }
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  // the ground: the 2D game's own painted floor (flagstones, cobbles, grass, paths, moss, cracks ...) laid flat as a texture.
  // Its pixels are in the game's screen layout, which is a straight-line mapping of the tile grid, so one quad carries it.
  const gpx = new Uint8Array(WW * WH * 4);
  for (let k = 0; k < WW * WH; k++) { const v = floorBuf[k] & 127; if (!v) continue; const c = PAL32[v], o = k * 4; gpx[o] = c & 255; gpx[o + 1] = (c >> 8) & 255; gpx[o + 2] = (c >> 16) & 255; gpx[o + 3] = 255; }
  const gtex = new THREE.DataTexture(gpx, WW, WH, THREE.RGBAFormat); gtex.colorSpace = THREE.SRGBColorSpace; gtex.magFilter = THREE.LinearFilter; gtex.minFilter = THREE.LinearMipmapLinearFilter; gtex.generateMipmaps = true; gtex.anisotropy = 4; gtex.needsUpdate = true;
  const ggeo = new THREE.BufferGeometry(), gp = [], guv = [];
  for (const [i, j] of [[0, 0], [MW, 0], [MW, MH], [0, MH]]) { gp.push(i, 0, j); const [x, y] = iso(i, j); guv.push(x / WW, y / WH); }
  ggeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); ggeo.setAttribute('uv', new THREE.Float32BufferAttribute(guv, 2)); ggeo.setIndex([0, 2, 1, 0, 3, 2]); ggeo.computeVertexNormals();
  // relief: the painted floor's own light and dark (seams, cracks, cobble edges) read as height, so lamps rake across it
  const gnorm = reliefMap(gpx, WW, WH, 2, 2.6);
  const gmat = new THREE.MeshStandardMaterial({ map: gtex, normalMap: gnorm, normalScale: new THREE.Vector2(1.1, 1.1), roughness: 0.92, metalness: 0, alphaTest: 0.5 }); addGrain(gmat, 0);
  const ground = new THREE.Mesh(ggeo, gmat); ground.receiveShadow = true; ground.frustumCulled = false;
  levelGroup.userData.gnorm = gnorm;
  levelGroup.userData.gtex = gtex;
  const wm = buildWalls(walls);
  levelGroup.add(ground); if (wm) levelGroup.add(wm);
  // light by place: a warm afternoon sun outdoors, cold moonlight at night, and in the dungeons only a faint cold fill so the torches and the hero's light do the work
  const day = LV.outdoor && !LV.night;
  hemi.intensity = day ? 0.8 : LV.outdoor ? 0.42 : 0.34; hemi.color.setHex(day ? 0xbfd4ff : 0x6f84c8); hemi.groundColor.setHex(day ? 0x54603a : 0x1c1410);
  sun.intensity = day ? 1.75 : LV.outdoor ? 0.6 : 0.5; sun.color.setHex(day ? 0xffe9c4 : 0xa8c0ff);
  scene.background.setHex(LV.outdoor ? 0x1a2a18 : 0x050406);
  R3D_FLOOR.dirty = false; R3D_FLOOR.y0 = 1e9; R3D_FLOOR.y1 = -1;
  levelToken++; buildProps(levelGroup, levelToken); buildRigProps(levelGroup, levelToken); buildGrass(levelGroup, levelToken);
  builtLevel = R3D_LEVEL;
}

// ---------------------------------------------------------------- surfaces
// A normal map from a painted picture: brightness is taken as height (dark seams sink), at 1/step the picture's size.
function reliefMap(rgba, w, h, step, strength) {
  const W2 = Math.floor(w / step), H2 = Math.floor(h / step), hgt = new Float32Array(W2 * H2), out = new Uint8Array(W2 * H2 * 4);
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) { let sum = 0, n = 0; for (let b = 0; b < step; b++) for (let a = 0; a < step; a++) { const o = ((y * step + b) * w + x * step + a) * 4; if (rgba[o + 3]) { sum += 0.3 * rgba[o] + 0.59 * rgba[o + 1] + 0.11 * rgba[o + 2]; n++; } } hgt[y * W2 + x] = n ? sum / n / 255 : -1; }
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    const k = y * W2 + x, c = hgt[k], g = (xx, yy) => { if (xx < 0 || yy < 0 || xx >= W2 || yy >= H2) return c; const v = hgt[yy * W2 + xx]; return v < 0 ? c : v; };
    let nx = 0, ny = 0; if (c >= 0) { nx = (g(x - 1, y) - g(x + 1, y)) * strength; ny = (g(x, y - 1) - g(x, y + 1)) * strength; }
    const l = Math.hypot(nx, ny, 1), o = k * 4; out[o] = (nx / l * 0.5 + 0.5) * 255; out[o + 1] = (ny / l * 0.5 + 0.5) * 255; out[o + 2] = (1 / l * 0.5 + 0.5) * 255; out[o + 3] = 255;
  }
  const t = new THREE.DataTexture(out, W2, H2, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}
// A fine grain (baked in Blender, models/x_detail.png) laid over a surface in world space, so it stays crisp close up.
const grainTex = new THREE.TextureLoader().load('models/x_detail.png'); grainTex.wrapS = grainTex.wrapT = THREE.MirroredRepeatWrapping;
function addGrain(mat, upright) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.grainMap = { value: grainTex };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D grainMap; varying vec3 vWp;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n{ vec2 guv = ' + (upright ? 'vec2(vWp.x + vWp.z, vWp.y)' : 'vWp.xz') + ' * 0.55; float gr = texture2D(grainMap, guv).r * 0.6 + texture2D(grainMap, guv * 3.7).r * 0.4; diffuseColor.rgb *= 0.72 + 0.62 * gr; }');
  };
}
// Wind: grass and leaves lean back and forth (more the higher up the plant)
const WIND = { value: 0 };
function addWind(mat, from, amount) {
  const m = mat.clone();
  m.onBeforeCompile = sh => { sh.uniforms.uWind = WIND;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n{ float sw = max(0.0, position.y - ' + from.toFixed(2) + ') * ' + amount.toFixed(3) + ';\n#ifdef USE_INSTANCING\nvec4 wp = instanceMatrix * vec4(position, 1.0);\n#else\nvec4 wp = vec4(position, 1.0);\n#endif\ntransformed.x += sin(uWind * 1.7 + wp.x * 0.9 + wp.z * 0.7) * sw; transformed.z += cos(uWind * 1.3 + wp.x * 0.5 - wp.z * 0.8) * sw * 0.7; }'); };
  return m;
}
// Grass: tufts (models/x_grass.glb, made in Blender) wherever the painted ground is green, each tinted by the ground under it
function buildGrass(group, token) {
  if (!LV.outdoor) return;
  whenModel('x_grass').then(g => {
    if (!g || token !== levelToken) return; let src = null; g.scene.traverse(o => { if (o.isMesh && !src) src = o; }); if (!src) return;
    const mat = addWind(src.material, 0.02, 0.22); mat.side = THREE.DoubleSide; const chunks = new Map(), CG = 8;
    for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
      if (LV.map[j * MW + i] !== FLOOR) continue;
      for (let n = 0; n < 2; n++) {
        const fi = i + hash2(i * 3 + n, j), fj = j + hash2(j * 5 + n, i + 7), [x, y] = iso(fi, fj), v = floorBuf[Math.round(y) * WW + Math.round(x)] & 127; if (!v) continue;
        const c = PAL32[v], r = c & 255, gg = (c >> 8) & 255, bb = (c >> 16) & 255; if (!(gg > r * 1.06 && gg > bb * 1.25 && gg > 60)) continue;
        const k = Math.floor(i / CG) + ',' + Math.floor(j / CG); (chunks.get(k) || chunks.set(k, []).get(k)).push([fi, fj, r, gg, bb, hash2(i + n * 11, j * 3)]);
      }
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    for (const items of chunks.values()) {
      const im = new THREE.InstancedMesh(src.geometry, mat, items.length); im.receiveShadow = true; im.castShadow = false;
      items.forEach((it, n) => { const s = 0.7 + it[5] * 0.7; m4.compose(p.set(it[0], 0, it[1]), q.setFromAxisAngle(up, it[5] * 6.28), sc.set(s, s * (0.8 + it[5] * 0.5), s)); im.setMatrixAt(n, m4); im.setColorAt(n, col.setRGB(Math.min(1, it[2] / 255 * 1.45), Math.min(1, it[3] / 255 * 1.45), Math.min(1, it[4] / 255 * 1.3), THREE.SRGBColorSpace)); });
      im.computeBoundingSphere(); group.add(im);
    }
  });
}

// ---------------------------------------------------------------- walls
// Each wall block shows three faces to this camera: its top, the face toward +j ('L' in the 2D game) and the face toward +i ('R').
// Their look comes from the game's own wall painter (wallTex), sampled once per block into one texture for the level.
function buildWalls(walls) {
  if (!walls.length) return null;
  const hpx = (i, j) => tileAt(i, j) === WALL ? (LV.tall[j * MW + i] ? WALL_TALL : WALL_LOW) : 0;
  const AW = 2048, cells = walls.map(([i, j]) => ({ i, j, h: hpx(i, j) })).sort((a, b) => b.h - a.h);
  let x = 0, y = 0, rowh = 0; for (const c of cells) { const ch = 16 + 2 * c.h; if (x + 16 > AW) { x = 0; y += rowh; rowh = 0; } c.x = x; c.y = y; x += 16; rowh = Math.max(rowh, ch); }
  let AH = 64; while (AH < y + rowh) AH *= 2;
  const px = new Uint8Array(AW * AH * 4), P = [], N = [], UV = [], IDX = [];
  const put = (X, Y, v) => { v &= 127; if (!v) v = 2; const c = PAL32[v], o = (Y * AW + X) * 4; px[o] = c & 255; px[o + 1] = (c >> 8) & 255; px[o + 2] = (c >> 16) & 255; px[o + 3] = 255; };
  const quad = (pts, n, u0, v0, uw, vh) => { const b = P.length / 3; for (const [X, Y, Z, a, bb] of pts) { P.push(X, Y, Z); N.push(n[0], n[1], n[2]); UV.push((u0 + 0.5 + a * (uw - 1)) / AW, (v0 + 0.5 + bb * (vh - 1)) / AH); } IDX.push(b, b + 1, b + 2, b, b + 2, b + 3); };
  for (const c of cells) {
    const { i, j, h } = c, tex = wallTex(i, j, h === WALL_TALL), H = h / UPX, hL = hpx(i, j + 1), hR = hpx(i + 1, j);
    for (let b = 0; b < 16; b++) for (let a = 0; a < 16; a++) put(c.x + a, c.y + b, tex('top', a + 0.5, b + 0.5));
    quad([[i, H, j, 0, 0], [i, H, j + 1, 0, 1], [i + 1, H, j + 1, 1, 1], [i + 1, H, j, 1, 0]], [0, 1, 0], c.x, c.y, 16, 16);
    if (hL < h) { for (let z = 0; z < h; z++) for (let a = 0; a < 16; a++) put(c.x + a, c.y + 16 + z, tex('L', a + 0.5, z + 0.5));
      quad([[i, 0, j + 1, 0, 0], [i + 1, 0, j + 1, 1, 0], [i + 1, H, j + 1, 1, 1], [i, H, j + 1, 0, 1]], [0, 0, 1], c.x, c.y + 16, 16, h); }
    if (hR < h) { for (let z = 0; z < h; z++) for (let a = 0; a < 16; a++) put(c.x + a, c.y + 16 + h + z, tex('R', a + 0.5, z + 0.5));
      quad([[i + 1, 0, j + 1, 1, 0], [i + 1, 0, j, 0, 0], [i + 1, H, j, 0, 1], [i + 1, H, j + 1, 1, 1]], [1, 0, 0], c.x, c.y + 16 + h, 16, h); }
  }
  const tex = new THREE.DataTexture(px, AW, AH, THREE.RGBAFormat); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); geo.setIndex(IDX);
  const wnorm = reliefMap(px, AW, AH, 1, 3.2), wmat = new THREE.MeshStandardMaterial({ map: tex, normalMap: wnorm, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.9, metalness: 0, side: THREE.DoubleSide }); addGrain(wmat, 1);
  const m = new THREE.Mesh(geo, wmat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
  levelGroup.userData.wtex = tex; levelGroup.userData.wnorm = wnorm; return m;
}
// stairs and doorways: the game builds each from a rig of its own (no name); Blender has built the same shape, found by its hash
function buildRigProps(group, token) {
  const extra = [LV.stairs, LV.down].filter(x => x && x.sp && x.wx !== undefined);   // the stairs down are stamped on the floor in 2D
  for (const pr of [...props, ...extra]) {
    const sp = pr.sp; if (!sp || sp.__name || !sp.__rig) continue;
    if (!sp.__hash) sp.__hash = RD.hash(sp.__rig);
    const file = MANIFEST.rigs[sp.__hash]; if (!file) { missingProps.add('rig ' + sp.__hash); continue; }
    whenModel(file).then(g => { if (!g || token !== levelToken) return; const o = g.scene.clone(), [fi, fj] = groundToTile(pr.wx, pr.wy); o.position.set(fi, 0, fj); o.rotation.y = -(sp.__ryaw || 0); group.add(o); });
  }
}

// the game repaints bits of the floor as you play (blood, scorch marks, cracks): copy those rows into the texture now and then
let floorT = 0;
function syncFloor(dt) {
  floorT -= dt; if (!R3D_FLOOR.dirty || floorT > 0 || !levelGroup || !levelGroup.userData.gtex) return;
  const tex = levelGroup.userData.gtex, gpx = tex.image.data;
  for (let y = Math.max(0, R3D_FLOOR.y0); y <= Math.min(WH - 1, R3D_FLOOR.y1); y++) for (let x = 0, k = y * WW; x < WW; x++, k++) { const v = floorBuf[k] & 127, o = k * 4; if (!v) { gpx[o + 3] = 0; continue; } const c = PAL32[v]; gpx[o] = c & 255; gpx[o + 1] = (c >> 8) & 255; gpx[o + 2] = (c >> 16) & 255; gpx[o + 3] = 255; }
  tex.needsUpdate = true; R3D_FLOOR.dirty = false; R3D_FLOOR.y0 = 1e9; R3D_FLOOR.y1 = -1; floorT = 0.6;
}
// ---------------------------------------------------------------- ground effects and flames
// The ground layer (loot, warning marks, rings): the game's own pixels, laid on the floor where the screen shows them.
let gfx = null;
function syncGroundFx() {
  if (!gfx || gfx.w !== W || gfx.h !== H) {
    if (gfx) { scene.remove(gfx.mesh); gfx.tex.dispose(); gfx.mesh.geometry.dispose(); }
    const data = new Uint8Array(W * H * 4), tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); geo.setIndex([0, 2, 1, 0, 3, 2]);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); mesh.frustumCulled = false; mesh.renderOrder = 2; scene.add(mesh);
    gfx = { w: W, h: H, data, tex, mesh };
  }
  const d = gfx.data; let any = false;
  for (let o = 0, n = W * H; o < n; o++) { const v = scr[o], k = o * 4; if (!v) { d[k + 3] = 0; continue; } const c = PAL32[CYCLE[v & 127] || (v & 127)]; d[k] = c & 255; d[k + 1] = (c >> 8) & 255; d[k + 2] = (c >> 16) & 255; d[k + 3] = 255; any = true; }
  gfx.mesh.visible = any; if (!any) return;
  gfx.tex.needsUpdate = true;
  const pos = gfx.mesh.geometry.attributes.position; [[0, 0], [W, 0], [W, H], [0, H]].forEach(([x, y], n) => { const [fi, fj] = groundToTile(camX + x, camY + y); pos.setXYZ(n, fi, 0.03, fj); }); pos.needsUpdate = true;
}
// The skill-effect layer: the game's own effect pixels for this frame (bridge.js), stretched smooth over the picture and
// bright enough to bloom, so lightning, frost and fire read as light instead of as squares.
let ofx = null;
function syncOverlayFx() {
  if (!ofx || ofx.w !== OW || ofx.h !== OH) {
    if (ofx) { scene.remove(ofx.mesh); ofx.tex.dispose(); }
    const tex = new THREE.DataTexture(new Uint8Array(ov32.buffer), OW, OH, THREE.RGBAFormat); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.flipY = true;
    const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex } }, transparent: true, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'varying vec2 vUv; uniform sampler2D map; void main(){ vec4 c = texture2D(map, vUv); float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c.rgb * (1.0 + 0.45 * l * l), c.a); }' });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); mesh.frustumCulled = false; mesh.renderOrder = 20; scene.add(mesh);
    ofx = { w: OW, h: OH, tex, mesh };
  }
  ofx.tex.needsUpdate = true;
}
// Flames: a soft glowing sprite at every fire the level lists (torches, braziers, campfires, candles).
const flameTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 96; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 62, 2, 32, 56, 34); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.25, 'rgba(255,200,90,0.95)'); g.addColorStop(0.6, 'rgba(255,110,20,0.55)'); g.addColorStop(1, 'rgba(180,40,0,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(32, 2); x.bezierCurveTo(52, 34, 62, 58, 54, 76); x.bezierCurveTo(46, 94, 18, 94, 10, 76); x.bezierCurveTo(2, 58, 12, 34, 32, 2); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const flames = [];
function syncFlames() {
  let n = 0;
  for (const f of fires) {
    const ti = f.tile % MW, tj = Math.floor(f.tile / MW), z = Math.max(0, 8 * (ti + tj + 1.8) + WY0 - f.wy), [fi, fj] = groundToTile(f.wx, f.wy + z);
    if (Math.abs(fi - hero.fi) + Math.abs(fj - hero.fj) > 26) continue;
    let s = flames[n]; if (!s) { s = flames[n] = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); s.renderOrder = 3; scene.add(s); }
    n++; const fl = 0.9 + 0.1 * Math.sin(G.t * 11 + f.seed) + 0.06 * Math.sin(G.t * 27 + f.seed * 3), hh = Math.max(0.28, f.h * 2.1 / UPX) * fl, ww = Math.max(0.2, f.w * 3.4 / TPX);
    s.visible = true; s.material.opacity = 0.7; s.scale.set(ww, hh, 1); s.position.set(fi, z / UPX + hh * 0.38, fj); s.material.color.setHex(f.blue ? 0x66aaff : 0xffffff);
  }
  for (let k = n; k < flames.length; k++) flames[k].visible = false;
}

// ---------------------------------------------------------------- scenery
// Static props: one InstancedMesh per model per 12 x 12 tile block (so blocks off screen are skipped).
// Barrels, chests and cages can change, so each is its own object.
const missingProps = new Set(); let levelToken = 0, unnamedProps = 0;
const CH = 12;
function addInstances(g, list, group, sway = 0) {
  const meshes = []; g.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  const chunks = new Map();
  for (const it of list) { const k = Math.floor(it[0] / CH) + ',' + Math.floor(it[1] / CH); (chunks.get(k) || chunks.set(k, []).get(k)).push(it); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  for (const items of chunks.values()) for (const src of meshes) {
    if (sway && !src.userData.windMat) src.userData.windMat = addWind(src.material, 0.5, sway);
    const im = new THREE.InstancedMesh(src.geometry, sway ? src.userData.windMat : src.material, items.length); im.castShadow = true; im.receiveShadow = true;
    items.forEach((it, n) => { m4.compose(p.set(it[0], 0, it[1]), q.setFromAxisAngle(up, -it[2]), one); im.setMatrixAt(n, m4); });
    im.computeBoundingSphere(); group.add(im);
  }
}
function buildProps(group, token) {
  const by = new Map(); unnamedProps = 0;
  for (const pr of props) { const sp = pr.sp; if (!sp || !sp.__name) { unnamedProps++; continue; } const [fi, fj] = groundToTile(pr.wx, pr.wy); (by.get(sp.__name) || by.set(sp.__name, []).get(sp.__name)).push([fi, fj, sp.__yaw || 0]); }
  for (const d of LV.decor) if (d.kind === 'bones' && d.sp && d.sp.__name) { const [fi, fj] = groundToTile(d.wx, d.wy); (by.get(d.sp.__name) || by.set(d.sp.__name, []).get(d.sp.__name)).push([fi, fj, d.sp.__yaw || 0]); }   // (the game stamps these on the floor)
  for (const [name, list] of by) {
    const file = MANIFEST.props[name]; if (!file) { missingProps.add(name); continue; }
    const sway = /^(pine|oak|autumn)/.test(name) ? 0.035 : /^(bush|fern|crop)/.test(name) ? 0.05 : 0;
    whenModel(file).then(g => { if (g && token === levelToken) addInstances(g, list, group, sway); });
  }
}
const dyn = new Map();   // a barrel / chest / cage -> { obj, name }
function dynSprites(pr) { return pr.kind === 'barrel' ? [PROPS.barrel()] : pr.kind === 'egg' ? [PROPS.egg()] : pr.kind === 'cage' ? [PROPS.cage(pr.open, 'b'), PROPS.cage(pr.open, 'f')] : [PROPS.chest(pr.open)]; }
function syncDyn() {
  for (const pr of dynProps) {
    let d = dyn.get(pr); const sps = dynSprites(pr), name = sps.map(s => s.__name).join('+');
    if (d && d.name !== name) { scene.remove(d.obj); dyn.delete(pr); d = null; }
    if (!d) {
      d = { obj: new THREE.Group(), name }; const [fi, fj] = groundToTile(pr.wx, pr.wy); d.obj.position.set(fi, 0, fj); scene.add(d.obj); dyn.set(pr, d);
      for (const sp of sps) { const file = MANIFEST.props[sp.__name]; if (!file) { missingProps.add(sp.__name); continue; }
        whenModel(file).then(g => { if (!g || dyn.get(pr) !== d) return; const o = g.scene.clone(); o.rotation.y = -(sp.__yaw || 0); d.obj.add(o); }); }
    }
    d.seen = frameNo; d.obj.visible = !pr.broken;
  }
  for (const [pr, d] of dyn) if (d.seen !== frameNo) { scene.remove(d.obj); dyn.delete(pr); }
}

// ---------------------------------------------------------------- characters
const actors = new Map();   // game object -> { root, models: [...], key, ... }
const FAMCOL = { skeleton: 0xd8ceb0, fallen: 0xa0301f, hound: 0x6f6670, spider: 0x45282b, slime: 0x3f6e35, wraith: 0x8fb0ff, treant: 0x56331f, ogre: 0x7a8a4a, shroom: 0xb07a58 };
const phGeo = new THREE.CapsuleGeometry(0.3, 0.8, 4, 10);
// the files that make up a character: one for a monster or villager, up to four pieces for the hero (by what he wears)
function filesFor(c) {
  if (c === hero) {
    const H = MANIFEST.heroes[hero.cls], T = H && (H[c.look.team] || H.red);
    if (T) { const L = c.look, ctx = T.ctx[L.weapon + '|' + L.shield] || T.ctx[L.weapon + '|none'] || T.ctx[T.base.weapon + '|' + T.base.shield], k = ctx[0];
      return [(T.body[L.chest] || T.body[T.base.chest])[k], (T.helm[L.helm] || T.helm.none || [])[k], ctx[1], ctx[2]].filter(Boolean); }
  }
  const f = MANIFEST.chars[RP.keyOf(c.fam, c.look)]; return f ? [f] : [];
}
function makeActor(c, files) {
  const root = new THREE.Group(), ready = files.length > 0 && files.every(f => MODELS[f]); let a;
  if (ready) { const models = files.map(spawnModel); for (const m of models) root.add(m.root); a = { root, models }; }
  else { const mesh = new THREE.Mesh(phGeo, new THREE.MeshStandardMaterial({ color: c.role ? 0x3b62d6 : FAMCOL[c.fam] || 0x888888, roughness: 0.8, transparent: true, opacity: 0.35 })); mesh.position.y = 0.7; root.add(mesh); a = { root, models: [], placeholder: true }; if (!files.length) missingChars.add(RP.keyOf(c.fam, c.look)); }
  a.key = files.join('+'); a.yaw = null; a.clip = null; a.t = 0; a.fade = 1; scene.add(root); actors.set(c, a); return a;
}
const missingChars = new Set();
function clipFor(tl, clip) {
  if (tl[clip]) return clip;
  for (const k of (fallbackOrder[clip] || [])) if (tl[k]) return k;
  return tl.idle ? 'idle' : null;
}
function syncActor(c, dt, visible) {
  let a = actors.get(c); const files = filesFor(c), key = files.join('+');
  if (a && (a.key !== key || a.placeholder)) {   // new gear (or the model was still loading): swap once every piece has arrived, keep the old look until then
    files.forEach(wantModel);
    if (files.length && files.every(f => MODELS[f])) { scene.remove(a.root); actors.delete(c); a = null; }
  }
  if (!a) { files.forEach(wantModel); a = makeActor(c, files); }
  a.seen = frameNo; a.root.visible = visible; if (!visible) return;
  const jit = c.stop > 0 && c !== hero && !(c.dying >= 0) ? (Math.floor(G.t * 33) % 2 ? 0.03 : -0.03) : 0;
  a.root.position.set(c.fi + jit, (c.leapZ || 0) / UPX, c.fj - jit);
  const yaw = -c.dir * Math.PI / 4;
  if (a.yaw === null) a.yaw = yaw; else { let d = yaw - a.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); a.yaw += d * Math.min(1, dt * 16); }
  a.root.rotation.y = a.yaw; a.root.scale.setScalar((c.look && c.look.scale) || 1);
  // how it is hurting: frozen = ice blue, chilled = pale blue, burning = flickering orange, the sting after a hit = red; ash and shatter deaths sink away
  const ash = c.deathKind === 'ash' && c.dying >= 0, shat = c.deathKind === 'shatter' && c.dying >= 0;
  const st = ash || (c.burnT > 0 && Math.floor(G.t * 16 + (c.seed || 0)) % 3 === 0) ? 4 : c.frozen > 0 || shat ? 1 : c.tint > 0 ? 3 : c.slowT > 0 || c.chillT > 0 ? 2 : 0, fl = c.flash > 0 ? 1 : 0;
  if (st !== a.st || fl !== a.fl) { a.st = st; a.fl = fl; const col = [0xffffff, 0x66b8ff, 0xb8dcff, 0xff7060, 0xff9a3a][st];
    for (const m of a.models) for (const mt of m.mats) { mt.color.setHex(col); mt.emissive.setHex(fl ? 0xffffff : mt.userData.e0); mt.emissiveIntensity = fl ? 0.7 : mt.userData.i0; } }
  if (ash || shat) { const k = Math.max(0.02, 1 - Math.min(1, c.dying / (ash ? 0.55 : 0.15))); if (!ash) a.root.scale.multiplyScalar(k); else a.root.position.y -= (1 - k) * 1.2; }
  if (!a.models.length) return;
  // the pose: the game says which clip and which frame; idle and walk run on the game's own continuous clocks
  const name = clipFor(a.models[0].tl, c.clip); if (!name) return;
  let f = frameOf(c);
  if (name === 'idle' && c.clip === 'idle') f = (c.clock / 0.2) % 4; else if (name === 'walk' && c.clip === 'walk') f = ((c.walk % 8) + 8) % 8;
  const L = a.models[0].tl[name][2] ? a.models[0].tl[name][1] : 0, changed = name !== a.clip;
  if (changed) { a.fade = a.clip ? 0 : 1; a.clip = name; a.t = f; }
  else if (L && (name === 'idle' || name === 'walk')) a.t = f;
  else { let d = f - a.t; if (L) d = ((d % L) + L * 1.5) % L - L / 2; a.t += d * Math.min(1, dt * 22); if (L) a.t = ((a.t % L) + L) % L; }
  a.fade = Math.min(1, a.fade + dt / 0.09);
  for (const m of a.models) {
    if (!m.acts) continue; const tc = m.tl[name] || m.tl.idle; if (!tc) continue;
    if (changed) m.cur ^= 1;
    const cur = m.acts[m.cur], prev = m.acts[m.cur ^ 1];
    cur.time = tc[0] + Math.max(0, Math.min(a.t, tc[1])); cur.setEffectiveWeight(a.fade); prev.setEffectiveWeight(1 - a.fade);
    m.mixer.update(0);
  }
  a.hand = null;
}

// ---------------------------------------------------------------- frame
let frameNo = 0, lastT = performance.now(), lastW = 0, lastH = 0;
const V3 = new THREE.Vector3();
// Speed: if frames come slowly the picture is drawn with fewer pixels (and comes back up when there is room)
let quality = Math.min(window.devicePixelRatio || 1, 2), slowT = 0, fastT = 0, avgDt = 1 / 60;
const TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
function adapt(dt) {
  avgDt += (dt - avgDt) * 0.05; const top = Math.min(window.devicePixelRatio || 1, 2);
  if (avgDt > 1 / 45) { slowT += dt; fastT = 0; } else if (avgDt < 1 / 57) { fastT += dt; slowT = 0; } else slowT = fastT = 0;
  if (slowT > 1.5 && quality > 0.75) { quality = Math.max(0.75, quality - 0.25); slowT = 0; lastW = 0; }
  if (fastT > 6 && quality < top) { quality = Math.min(top, quality + 0.25); fastT = 0; lastW = 0; }
}
function fit() {
  const w = parseFloat(cvs.style.width) || cvs.clientWidth, h = parseFloat(cvs.style.height) || cvs.clientHeight;
  if (w === lastW && h === lastH) return; lastW = w; lastH = h;
  renderer.setPixelRatio(quality); renderer.setSize(w, h, false); fx.resize(w, h, quality); glc.style.width = w + 'px'; glc.style.height = h + 'px';
}
function frame(menu) {
  const now = performance.now(), dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; frameNo++;
  fit();
  if (builtLevel !== R3D_LEVEL && LV.rooms) buildLevel();
  // the camera: the ground point under the middle of the frame
  const x1 = (cam2x + OW / 2) / SPX, y1 = (cam2y + OH / 2) / SPX, A = (x1 - WX0) / 16, B = (y1 - WY0) / 8, cf = (A + B) / 2, cj = (B - A) / 2;
  const hw = OW / (2 * TPX * SPX), hh = OH / (2 * TPX * SPX);
  cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh; cam.updateProjectionMatrix();
  cam.position.set(cf, 0, cj).addScaledVector(CAMDIR, 80); cam.lookAt(cf, 0, cj);
  sun.target.position.set(hero.fi, 0, hero.fj); sun.position.set(hero.fi - 7, 14, hero.fj + 5);
  heroLight.position.set(hero.fi + 0.4, 2.6, hero.fj + 0.4); heroLight.intensity = LV.outdoor && !LV.night ? 0 : 5.5;
  // torches: the nearest few of the level's lights
  const near = lights.map(l => { const [fi, fj] = groundToTile(l.x, l.y); return { l, fi, fj, d: Math.hypot(fi - hero.fi, fj - hero.fj) }; }).sort((a, b) => a.d - b.d);
  torchLights.forEach((tl, k) => { const n = near[k]; if (!n || n.d > 16) { tl.intensity = 0; return; } tl.position.set(n.fi, Math.max(0.8, n.l.z / UPX), n.fj); tl.distance = Math.max(5, n.l.r / TPX * 1.4); tl.intensity = 10 * (n.l.i || 1) * (0.88 + 0.12 * Math.sin(G.t * 9 + (n.l.seed || 0))); });
  const visAt = (fi, fj) => LV.vis[Math.max(0, Math.min(MH - 1, Math.floor(fj))) * MW + Math.max(0, Math.min(MW - 1, Math.floor(fi)))];
  syncActor(hero, dt, true);
  for (const e of enemies) syncActor(e, dt, visAt(e.fi, e.fj) > 0.25 && Math.abs(e.fi - cf) + Math.abs(e.fj - cj) < 26);
  for (const n of npcs) syncActor(n, dt, Math.abs(n.fi - cf) + Math.abs(n.fj - cj) < 26);
  for (const [c, a] of actors) if (a.seen !== frameNo) { scene.remove(a.root); actors.delete(c); }
  syncDyn(); syncGroundFx(); syncOverlayFx(); syncFlames(); syncFloor(dt); adapt(dt);
  WIND.value = G.t;
  fx.update(dt, lastW * quality / (2 * hw), heroBlade(), /^(attack|spin|bash)/.test(hero.clip || ''));
  fx.render(quality);
}
// where the hero's weapon is right now (its grip end and its far end, in the world), for the swing trail
const bladeInfo = new Map(), bv = new THREE.Vector3(), bm = new THREE.Matrix4();
function heroBlade() {
  const a = actors.get(hero); if (!a || !a.models.length) return null;
  const k = a.key.split('+').findIndex(f => f.startsWith('hw_')); if (k < 0) return null;
  const m = a.models[k]; let mesh = null; m.root.traverse(o => { if (o.isSkinnedMesh && !mesh) mesh = o; }); if (!mesh) return null;
  const file = a.key.split('+')[k]; let info = bladeInfo.get(file);
  if (info === undefined) {   // once per weapon: the rigid group with the longest reach is the weapon itself; its two ends
    const pos = mesh.geometry.attributes.position, si = mesh.geometry.attributes.skinIndex, per = new Map();
    for (let i = 0; i < pos.count; i++) { const b = si.getX(i); (per.get(b) || per.set(b, []).get(b)).push(i); }
    let best = null;
    for (const [b, list] of per) { if (!/^c\d/.test(mesh.skeleton.bones[b].name)) continue; const c = new THREE.Vector3(); for (const i of list) c.add(bv.fromBufferAttribute(pos, i)); c.multiplyScalar(1 / list.length);
      let v1 = null, d1 = -1; for (const i of list) { const d = bv.fromBufferAttribute(pos, i).distanceTo(c); if (d > d1) { d1 = d; v1 = bv.clone(); } }
      let v2 = null, d2 = -1; for (const i of list) { const d = bv.fromBufferAttribute(pos, i).distanceTo(v1); if (d > d2) { d2 = d; v2 = bv.clone(); } }
      if (!best || d2 > best.len) best = { bone: b, len: d2, p: [v1, v2] }; }
    if (best && best.len > 0.35) { const o = new THREE.Vector3(0, 0.75, 0), [p, q] = best.p; info = p.distanceTo(o) > q.distanceTo(o) ? { bone: best.bone, tip: p, base: q } : { bone: best.bone, tip: q, base: p }; } else info = null;
    bladeInfo.set(file, info);
  }
  if (!info) return null;
  a.root.updateMatrixWorld(true); const bone = mesh.skeleton.bones[info.bone]; bm.multiplyMatrices(bone.matrixWorld, mesh.skeleton.boneInverses[info.bone]);
  return { base: info.base.clone().applyMatrix4(bm), tip: info.tip.clone().applyMatrix4(bm) };
}
try { MANIFEST = Object.assign(MANIFEST, await (await fetch('models/manifest.json')).json()); } catch (e) { console.error('3d: no model list', e); }
window.R3D = { ready: true, get quality() { return quality; }, frame, scene, cam, renderer, actors, THREE, MODELS, missingProps, missingChars, get unnamedProps() { return unnamedProps; }, get manifest() { return MANIFEST; } };
