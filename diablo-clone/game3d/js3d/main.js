// The 3D layer of Dungeons of Bones. Reads the 2D game's live state (hero, enemies, LV, ...) and draws it with Three.js.
// World units: 1 unit = 1 tile; tile (i, j) covers x i..i+1, z j..j+1; y is up. The camera is the 2D game's own
// projection (orthographic, 30 degrees above the ground, looking along -x -z), so the pixel HUD and effects line up.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

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
const loader = new GLTFLoader(), MODELS = {};
async function loadModel(name) { const g = await loader.loadAsync('models/' + name + '.glb'); g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } }); MODELS[name] = g; return g; }
function spawnModel(name) {
  const g = MODELS[name], root = SkeletonUtils.clone(g.scene), mixer = new THREE.AnimationMixer(root), actions = {};
  for (const a of g.animations) actions[a.name] = mixer.clipAction(a);
  return { root, mixer, actions, cur: null };
}

// ---------------------------------------------------------------- the level: floors and walls from LV.map
let levelGroup = null, builtLevel = -1;
const THEME = { crypt: { floor: [0x5a4a3c, 0x66543f, 0x4e4238, 0x6e5b44], wall: [0x4a4040, 0x554844, 0x403838] }, caves: { floor: [0x3e4048, 0x4a4c58, 0x363844], wall: [0x30323a, 0x3a3c46, 0x2a2b33] },
  hell: { floor: [0x4d1c18, 0x6b2a1f, 0x3a1614], wall: [0x341414, 0x4d1c18, 0x2a1010] }, outdoor: { floor: [0x5f7a3a, 0x688442, 0x587236, 0x6f8a46], wall: [0x2e4a2a, 0x355230, 0x284224] } };
function hash2(i, j) { let h = (i * 374761393 + j * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function buildLevel() {
  if (levelGroup) { scene.remove(levelGroup); levelGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  levelGroup = new THREE.Group(); scene.add(levelGroup);
  const th = LV.outdoor ? THEME.outdoor : THEME[LV.theme || 'crypt'] || THEME.crypt;
  const floors = [], walls = [];
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) { const t = LV.map[j * MW + i]; if (t === FLOOR) floors.push([i, j]); else if (t === WALL) walls.push([i, j, LV.tall[j * MW + i] ? WALL_TALL / UPX : WALL_LOW / UPX]); }
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  const fgeo = new THREE.BoxGeometry(0.97, 0.12, 0.97), fmat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  const fm = new THREE.InstancedMesh(fgeo, fmat, floors.length); fm.receiveShadow = true;
  floors.forEach(([i, j], n) => { m4.makeTranslation(i + 0.5, -0.06 + (hash2(i, j) - 0.5) * 0.02, j + 0.5); fm.setMatrixAt(n, m4); fm.setColorAt(n, col.setHex(th.floor[Math.floor(hash2(j, i) * th.floor.length)])); });
  const ggeo = new THREE.PlaneGeometry(MW, MH); ggeo.rotateX(-Math.PI / 2); const ground = new THREE.Mesh(ggeo, new THREE.MeshStandardMaterial({ color: LV.outdoor ? 0x23381f : 0x0b0909, roughness: 1 })); ground.position.set(MW / 2, -0.07, MH / 2); ground.receiveShadow = true;
  const wgeo = new THREE.BoxGeometry(1, 1, 1), wmat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  const wm = new THREE.InstancedMesh(wgeo, wmat, walls.length); wm.castShadow = true; wm.receiveShadow = true;
  const sc = new THREE.Vector3(), q = new THREE.Quaternion(), p = new THREE.Vector3();
  walls.forEach(([i, j, h], n) => { m4.compose(p.set(i + 0.5, h / 2, j + 0.5), q, sc.set(1, h, 1)); wm.setMatrixAt(n, m4); wm.setColorAt(n, col.setHex(th.wall[Math.floor(hash2(i, j) * th.wall.length)])); });
  fm.frustumCulled = wm.frustumCulled = false;
  levelGroup.add(ground, fm, wm);
  hemi.intensity = LV.outdoor ? (LV.night ? 0.5 : 1.1) : 0.5; sun.intensity = LV.outdoor ? (LV.night ? 0.5 : 2.2) : 0.9; sun.color.setHex(LV.outdoor && !LV.night ? 0xfff2d8 : 0xc8d4ff);
  scene.background.setHex(LV.outdoor ? 0x1a2a18 : 0x050406);
  builtLevel = R3D_LEVEL;
}

// ---------------------------------------------------------------- characters
const actors = new Map();   // game object -> { root, mixer, actions, cur, yaw }
const FAMCOL = { skeleton: 0xd8ceb0, fallen: 0xa0301f, hound: 0x6f6670, spider: 0x45282b, slime: 0x3f6e35, wraith: 0x8fb0ff, treant: 0x56331f, ogre: 0x7a8a4a, shroom: 0xb07a58 };
const phGeo = new THREE.CapsuleGeometry(0.32, 0.9, 6, 12);
function makeActor(c) {
  let a;
  if (c === hero && MODELS.warrior) { a = spawnModel('warrior'); a.root.scale.setScalar(1.22); }
  else {
    const mesh = new THREE.Mesh(phGeo, new THREE.MeshStandardMaterial({ color: c.role ? 0x3b62d6 : FAMCOL[c.fam] || 0x888888, roughness: 0.8 }));
    const s = c.def ? Math.max(0.5, (c.def.chest || 20) / 22) * ((c.look && c.look.scale) || 1) : 1; mesh.position.y = 0.77 * s; mesh.scale.setScalar(s); mesh.castShadow = true;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.4), mesh.material); nose.position.set(0, 0.25, 0.3); mesh.add(nose);
    const root = new THREE.Group(); root.add(mesh); a = { root, mixer: null, actions: {}, cur: null };
  }
  a.yaw = null; scene.add(a.root); actors.set(c, a); return a;
}
const CLIPMAP = { idle: 'idle', walk: 'walk', attack: 'attack' };
function syncActor(c, dt, visible) {
  let a = actors.get(c) || makeActor(c);
  a.seen = frameNo; a.root.visible = visible; if (!visible) return;
  a.root.position.set(c.fi, (c.leapZ || 0) / UPX, c.fj);
  const ang = c.dir * Math.PI / 4, yaw = Math.atan2(Math.cos(ang), Math.sin(ang));
  if (a.yaw === null) a.yaw = yaw; else { let d = yaw - a.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); a.yaw += d * Math.min(1, dt * 14); }
  a.root.rotation.y = a.yaw;
  if (a.mixer) {
    let want = CLIPMAP[c.clip] || (a.actions[c.clip] ? c.clip : 'idle'); if (want === 'walk' && c === hero && hero.runT > 0.35 && a.actions.run) want = 'run';
    const act = a.actions[want] || a.actions.idle;
    if (act !== a.cur) { act.reset().fadeIn(0.1).play(); if (a.cur) a.cur.fadeOut(0.1); a.cur = act; }
    a.mixer.update(c.stop > 0 ? 0 : dt);
  }
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
  for (const e of enemies) syncActor(e, dt, !e.corpse && visAt(e.fi, e.fj) > 0.25 && Math.abs(e.fi - cf) + Math.abs(e.fj - cj) < 26);
  for (const n of npcs) syncActor(n, dt, Math.abs(n.fi - cf) + Math.abs(n.fj - cj) < 26);
  for (const [c, a] of actors) if (a.seen !== frameNo) { scene.remove(a.root); actors.delete(c); }
  renderer.render(scene, cam);
}
await loadModel('warrior');
window.R3D = { ready: true, frame, scene, cam, renderer, actors, THREE };
