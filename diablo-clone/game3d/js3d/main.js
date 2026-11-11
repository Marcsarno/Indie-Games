// The 3D layer of Dungeons of Bones. Reads the 2D game's live state (hero, enemies, LV, ...) and draws it with Three.js.
// World units: 1 unit = 1 tile; tile (i, j) covers x i..i+1, z j..j+1; y is up. The camera is the 2D game's own
// projection (orthographic, 30 degrees above the ground, looking along -x -z), so the pixel HUD and effects line up.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { buildModel } from './rigbuild.js';

const TPX = 16 * Math.SQRT2;            // world pixels (1x) per unit along the screen's x
const UPX = TPX * Math.cos(Math.PI / 6); // world pixels per unit of height
const glc = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050406);
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
const CAMDIR = new THREE.Vector3(Math.cos(Math.PI / 6) * Math.SQRT1_2, Math.sin(Math.PI / 6), Math.cos(Math.PI / 6) * Math.SQRT1_2);
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.25; }
const hemi = new THREE.HemisphereLight(0x8fa0d0, 0x2a1c14, 0.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dc, 1.2); sun.castShadow = true; scene.add(sun, sun.target);
{ const s = sun.shadow; s.mapSize.set(2048, 2048); s.camera.left = s.camera.bottom = -11; s.camera.right = s.camera.top = 11; s.camera.near = 1; s.camera.far = 60; s.bias = -0.0015; s.normalBias = 0.03; }
const heroLight = new THREE.PointLight(0xffd9a8, 6, 9, 2); scene.add(heroLight);
const torchLights = []; for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xff9440, 0, 9, 2); scene.add(l); torchLights.push(l); }

// ---------------------------------------------------------------- models
// Characters are converted from the 2D game's rigs by Blender (tools/dump.cjs + blender/scripts/convert.py).
// models/manifest.json maps a character's key (family + look) to its file; a model loads the first time it is needed.
const loader = new GLTFLoader(), MODELS = {}, LOADING = {}; loader.setMeshoptDecoder(MeshoptDecoder);
let MANIFEST = {};
function prep(g) { g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } }); return g; }
function wantModel(file) {
  if (MODELS[file]) return MODELS[file];
  if (!LOADING[file]) LOADING[file] = loader.loadAsync('models/' + file + '.glb').then(g => { MODELS[file] = prep(g); }).catch(e => { console.error('3d: model ' + file, e); MODELS[file] = null; });
  return null;
}
function whenModel(file) { wantModel(file); return (LOADING[file] || Promise.resolve()).then(() => MODELS[file]); }
function spawnModel(file) {
  const g = MODELS[file], root = SkeletonUtils.clone(g.scene), mixer = new THREE.AnimationMixer(root), actions = {}, mats = [];
  const own = m => { const c = m.clone(); c.userData.e0 = c.emissive.getHex(); c.userData.i0 = c.emissiveIntensity; mats.push(c); return c; };
  root.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(own) : own(o.material); });
  for (const a of g.animations) { const act = mixer.clipAction(a); act.play(); act.paused = true; act.setEffectiveWeight(0); actions[a.name] = act; }
  return { root, mixer, actions, mats, cur: null, prev: null, fade: 1, t: 0 };
}

// ---------------------------------------------------------------- the level: floors and walls from LV.map
let levelGroup = null, builtLevel = -1;
const THEME = { crypt: { floor: [0x5a4a3c, 0x66543f, 0x4e4238, 0x6e5b44], wall: [0x4a4040, 0x554844, 0x403838] }, caves: { floor: [0x3e4048, 0x4a4c58, 0x363844], wall: [0x30323a, 0x3a3c46, 0x2a2b33] },
  hell: { floor: [0x4d1c18, 0x6b2a1f, 0x3a1614], wall: [0x341414, 0x4d1c18, 0x2a1010] }, outdoor: { floor: [0x5f7a3a, 0x688442, 0x587236, 0x6f8a46], wall: [0x2e4a2a, 0x355230, 0x284224] } };
function hash2(i, j) { let h = (i * 374761393 + j * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function buildLevel() {
  if (levelGroup) { scene.remove(levelGroup); levelGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); }); if (levelGroup.userData.gtex) levelGroup.userData.gtex.dispose(); if (levelGroup.userData.wtex) levelGroup.userData.wtex.dispose(); }
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
  const ground = new THREE.Mesh(ggeo, new THREE.MeshStandardMaterial({ map: gtex, roughness: 1, metalness: 0, alphaTest: 0.5 })); ground.receiveShadow = true; ground.frustumCulled = false;
  levelGroup.userData.gtex = gtex;
  const wm = buildWalls(walls);
  levelGroup.add(ground); if (wm) levelGroup.add(wm);
  buildRigProps(levelGroup);
  hemi.intensity = LV.outdoor ? (LV.night ? 0.5 : 1.1) : 0.5; sun.intensity = LV.outdoor ? (LV.night ? 0.5 : 2.2) : 0.9; sun.color.setHex(LV.outdoor && !LV.night ? 0xfff2d8 : 0xc8d4ff);
  scene.background.setHex(LV.outdoor ? 0x1a2a18 : 0x050406);
  levelToken++; buildProps(levelGroup, levelToken);
  builtLevel = R3D_LEVEL;
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
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0, side: THREE.DoubleSide })); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
  levelGroup.userData.wtex = tex; return m;
}
// stairs and doorways: the game builds each from a rig of its own (no name), so the model is made here
const rigModels = new WeakMap();
function buildRigProps(group) {
  for (const pr of props) {
    const sp = pr.sp; if (!sp || sp.__name || !sp.__rig) continue;
    let g = rigModels.get(sp);
    if (g === undefined) { try { g = buildModel(RD.build('rig', [{ clip: 'idle', t: 0, rig: sp.__rig }], { low: true })); prep(g); } catch (e) { console.error('3d: stairs', e); g = null; } rigModels.set(sp, g); }
    if (!g) continue;
    const o = SkeletonUtils.clone(g.scene), [fi, fj] = groundToTile(pr.wx, pr.wy); o.position.set(fi, 0, fj); o.rotation.y = -(sp.__ryaw || 0); group.add(o);
  }
}

// ---------------------------------------------------------------- ground effects and flames
// The ground layer (loot, warning marks, rings): the game's own pixels, laid on the floor where the screen shows them.
let gfx = null;
function syncGroundFx() {
  if (!gfx || gfx.w !== W || gfx.h !== H) {
    if (gfx) { scene.remove(gfx.mesh); gfx.tex.dispose(); gfx.mesh.geometry.dispose(); }
    const data = new Uint8Array(W * H * 4), tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
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
    s.visible = true; s.scale.set(ww, hh, 1); s.position.set(fi, z / UPX + hh * 0.38, fj); s.material.color.setHex(f.blue ? 0x66aaff : 0xffffff);
  }
  for (let k = n; k < flames.length; k++) flames[k].visible = false;
}

// ---------------------------------------------------------------- scenery
// Static props: one InstancedMesh per model per 12 x 12 tile block (so blocks off screen are skipped).
// Barrels, chests and cages can change, so each is its own object.
const missingProps = new Set(); let levelToken = 0, unnamedProps = 0;
const CH = 12;
function addInstances(g, list, group) {
  const meshes = []; g.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  const chunks = new Map();
  for (const it of list) { const k = Math.floor(it[0] / CH) + ',' + Math.floor(it[1] / CH); (chunks.get(k) || chunks.set(k, []).get(k)).push(it); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  for (const items of chunks.values()) for (const src of meshes) {
    const im = new THREE.InstancedMesh(src.geometry, src.material, items.length); im.castShadow = true; im.receiveShadow = true;
    items.forEach((it, n) => { m4.compose(p.set(it[0], 0, it[1]), q.setFromAxisAngle(up, -it[2]), one); im.setMatrixAt(n, m4); });
    im.computeBoundingSphere(); group.add(im);
  }
}
function buildProps(group, token) {
  const by = new Map(); unnamedProps = 0;
  for (const pr of props) { const sp = pr.sp; if (!sp || !sp.__name) { unnamedProps++; continue; } const [fi, fj] = groundToTile(pr.wx, pr.wy); (by.get(sp.__name) || by.set(sp.__name, []).get(sp.__name)).push([fi, fj, sp.__yaw || 0]); }
  for (const [name, list] of by) {
    const file = MANIFEST['prop|' + name]; if (!file) { missingProps.add(name); continue; }
    whenModel(file).then(g => { if (g && token === levelToken) addInstances(g, list, group); });
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
      for (const sp of sps) { const file = MANIFEST['prop|' + sp.__name]; if (!file) { missingProps.add(sp.__name); continue; }
        whenModel(file).then(g => { if (!g || dyn.get(pr) !== d) return; const o = g.scene.clone(); o.rotation.y = -(sp.__yaw || 0); d.obj.add(o); }); }
    }
    d.seen = frameNo; d.obj.visible = !pr.broken;
  }
  for (const [pr, d] of dyn) if (d.seen !== frameNo) { scene.remove(d.obj); dyn.delete(pr); }
}

// ---------------------------------------------------------------- characters
const actors = new Map();   // game object -> { root, mixer, actions, ... }
const FAMCOL = { skeleton: 0xd8ceb0, fallen: 0xa0301f, hound: 0x6f6670, spider: 0x45282b, slime: 0x3f6e35, wraith: 0x8fb0ff, treant: 0x56331f, ogre: 0x7a8a4a, shroom: 0xb07a58 };
const phGeo = new THREE.CapsuleGeometry(0.3, 0.8, 4, 10);
const LOOPS = { idle: 4, walk: 8, storm: 4 };
function placeholder(c) {
  const mesh = new THREE.Mesh(phGeo, new THREE.MeshStandardMaterial({ color: c.role ? 0x3b62d6 : FAMCOL[c.fam] || 0x888888, roughness: 0.8 }));
  mesh.position.y = 0.7; mesh.castShadow = true; const root = new THREE.Group(); root.add(mesh);
  return { root, mixer: null, actions: {}, mats: [mesh.material], placeholder: true };
}
// a look with no Blender-built file is built here from the same rig data, one per frame at most
const buildQueue = [], queued = new Set();
function buildNext() {
  const job = buildQueue.shift(); if (!job) return; const [key, fam, look] = job;
  try { const data = RP.model(fam, look, 'built'); MODELS['built:' + key] = prep(buildModel(data)); } catch (e) { console.error('3d: could not build ' + key, e); MODELS['built:' + key] = null; }
}
function makeActor(c) {
  const key = RP.keyOf(c.fam, c.look); let file = MANIFEST[key];
  if (!file || MODELS[file] === null) { file = 'built:' + key; if (MODELS[file] === undefined && !queued.has(key)) { queued.add(key); buildQueue.push([key, c.fam, c.look]); } }
  const g = file.startsWith('built:') ? MODELS[file] : wantModel(file);
  const a = g ? spawnModel(file) : placeholder(c);
  a.key = key; a.file = file; a.yaw = null; scene.add(a.root); actors.set(c, a); return a;
}
function clipFor(a, clip) {
  if (a.actions[clip]) return clip;
  for (const k of (fallbackOrder[clip] || [])) if (a.actions[k]) return k;
  return a.actions.idle ? 'idle' : null;
}
function syncActor(c, dt, visible) {
  let a = actors.get(c);
  if (a && (a.key !== RP.keyOf(c.fam, c.look) || (a.placeholder && a.file && MODELS[a.file]))) { scene.remove(a.root); actors.delete(c); a = null; }   // new gear, or its model has arrived
  if (!a) a = makeActor(c);
  a.seen = frameNo; a.root.visible = visible; if (!visible) return;
  const jit = c.stop > 0 && c !== hero && !(c.dying >= 0) ? (Math.floor(G.t * 33) % 2 ? 0.03 : -0.03) : 0;
  a.root.position.set(c.fi + jit, (c.leapZ || 0) / UPX, c.fj - jit);
  const yaw = -c.dir * Math.PI / 4;
  if (a.yaw === null) a.yaw = yaw; else { let d = yaw - a.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); a.yaw += d * Math.min(1, dt * 16); }
  a.root.rotation.y = a.yaw; a.root.scale.setScalar((c.look && c.look.scale) || 1);
  const fl = c.flash > 0 ? 1 : 0;
  if (fl !== a.fl) { a.fl = fl; for (const m of a.mats) { if (m.userData.e0 === undefined) continue; m.emissive.setHex(fl ? 0xffffff : m.userData.e0); m.emissiveIntensity = fl ? 0.7 : m.userData.i0; } }
  if (!a.mixer) return;
  // the pose: the game says which clip and which frame; idle and walk run on the game's own continuous clocks
  const name = clipFor(a, c.clip); if (!name) return;
  let f = frameOf(c);
  if (name === 'idle' && c.clip === 'idle') f = (c.clock / 0.2) % 4; else if (name === 'walk' && c.clip === 'walk') f = ((c.walk % 8) + 8) % 8;
  const act = a.actions[name], L = LOOPS[name];
  if (act !== a.cur) { a.prev = a.cur; a.cur = act; a.fade = a.prev ? 0 : 1; a.t = f; }
  else if (L && (name === 'idle' || name === 'walk')) a.t = f;
  else { let d = f - a.t; if (L) { d = ((d % L) + L * 1.5) % L - L / 2; } a.t += d * Math.min(1, dt * 22); if (L) a.t = ((a.t % L) + L) % L; }
  a.fade = Math.min(1, a.fade + dt / 0.09);
  act.time = Math.min(a.t, act.getClip().duration); act.setEffectiveWeight(a.fade);
  if (a.prev) { a.prev.setEffectiveWeight(1 - a.fade); if (a.fade >= 1) a.prev = null; }
  a.mixer.update(0);
}

// ---------------------------------------------------------------- frame
let frameNo = 0, lastT = performance.now(), lastW = 0, lastH = 0;
const V3 = new THREE.Vector3();
function fit() {
  const w = parseFloat(cvs.style.width) || cvs.clientWidth, h = parseFloat(cvs.style.height) || cvs.clientHeight;
  if (w === lastW && h === lastH) return; lastW = w; lastH = h;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false); glc.style.width = w + 'px'; glc.style.height = h + 'px';
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
  heroLight.position.set(hero.fi + 0.4, 2.6, hero.fj + 0.4); heroLight.intensity = LV.outdoor && !LV.night ? 0 : 6;
  // torches: the nearest few of the level's lights
  const near = lights.map(l => { const [fi, fj] = groundToTile(l.x, l.y); return { l, fi, fj, d: Math.hypot(fi - hero.fi, fj - hero.fj) }; }).sort((a, b) => a.d - b.d);
  torchLights.forEach((tl, k) => { const n = near[k]; if (!n || n.d > 16) { tl.intensity = 0; return; } tl.position.set(n.fi, Math.max(0.8, n.l.z / UPX), n.fj); tl.distance = Math.max(5, n.l.r / TPX * 1.4); tl.intensity = 14 * (n.l.i || 1) * (0.88 + 0.12 * Math.sin(G.t * 9 + (n.l.seed || 0))); });
  const visAt = (fi, fj) => LV.vis[Math.max(0, Math.min(MH - 1, Math.floor(fj))) * MW + Math.max(0, Math.min(MW - 1, Math.floor(fi)))];
  syncActor(hero, dt, true);
  for (const e of enemies) syncActor(e, dt, visAt(e.fi, e.fj) > 0.25 && Math.abs(e.fi - cf) + Math.abs(e.fj - cj) < 26);
  for (const n of npcs) syncActor(n, dt, Math.abs(n.fi - cf) + Math.abs(n.fj - cj) < 26);
  for (const [c, a] of actors) if (a.seen !== frameNo) { scene.remove(a.root); actors.delete(c); }
  syncDyn(); buildNext(); syncGroundFx(); syncFlames();
  renderer.render(scene, cam);
}
try { MANIFEST = await (await fetch('models/manifest.json')).json(); } catch (e) { console.error('3d: no model list', e); }
window.R3D = { ready: true, frame, scene, cam, renderer, actors, THREE, MODELS, missingProps, get unnamedProps() { return unnamedProps; }, get manifest() { return MANIFEST; } };
