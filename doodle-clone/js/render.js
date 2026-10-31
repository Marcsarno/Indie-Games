// Three.js renderer. Everything is a painted sprite (textured quad) on Z-spaced layers; gameplay sits on z=0.
// Parallax: a layer at 'p' moves p x the camera's motion; depth scale is compensated so layers look natural size.
import * as THREE from 'three';
import { C } from './config.js';
import { platTop } from './sim.js';
import { prepare, frameFor } from './anim.js';

const loader = new THREE.TextureLoader();
function tex(url, { alpha = true, mip = true } = {}) {
  return new Promise((res, rej) => loader.load(url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.premultiplyAlpha = alpha;
    t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.generateMipmaps = mip; t.needsUpdate = true; res(t);
  }, undefined, rej));
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.premultiplyAlpha = true; return t; }
const GEO = new THREE.PlaneGeometry(1, 1);
function sprite(map, ro, { opaque = false, opacity = 1 } = {}) {
  const m = new THREE.MeshBasicMaterial({ map, transparent: !opaque, opacity, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  m.premultipliedAlpha = !opaque && map && map.premultiplyAlpha;
  const mesh = new THREE.Mesh(GEO, m); mesh.renderOrder = ro; mesh.frustumCulled = false; return mesh;
}

export async function createRenderer(canvas, sim) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x120a2a, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 600);
  const R = { sim, renderer, scene, camera, d: 30, viewH: 16, outfit: null, atlases: {}, t: 0 };
  const K = 'assets/kit/', B = 'assets/bg/';
  const T = {};
  const names = { sky_dusk: B + 'sky-dusk.webp', sky_mid: K + 'sky_midnight.webp', sky_aurora: K + 'sky_aurora.webp', stars: K + 'starfield.webp', moon: K + 'full_moon.webp', cloud: K + 'cloud.webp', witch: K + 'witch_silhouette.webp',
    town: B + 'mid-town-start.webp', houses: B + 'fg-houses-start.webp', flat: K + 'platform_standard.webp', slider: K + 'platform_moving.webp', crumbly: K + 'platform_fragile.webp', tramp: K + 'pumpkin_trampoline.webp', candy: K + 'pickup_candy_corn.webp',
    rocketP: 'assets/b3/rocket_pickup.webp', rocketW: 'assets/b3/rocket_worn.webp', bubble: 'assets/b3/rescue_bubble.webp', gold: 'assets/b3/candy_gold.webp', burst: 'assets/b3/burst.webp',
    fog: 'assets/b3/fog_sheet.webp', roofs: 'assets/b3/roofs_tile.webp', wallL: 'assets/b3/wall_left.webp', wallR: 'assets/b3/wall_right.webp', roofL: 'assets/b3/roof_left.webp', roofR: 'assets/b3/roof_right.webp',
    lanP: 'assets/b3/lantern_pumpkin.webp', lanQ: 'assets/b3/lantern_paper.webp', flyBats: 'assets/b3/fly_bats.webp', flyCat: 'assets/b3/fly_cat.webp', flyGhost: 'assets/b3/fly_ghost.webp', flyDragon: 'assets/b3/fly_dragon.webp',
    cr0: 'assets/b3/crumble_0.webp', cr1: 'assets/b3/crumble_1.webp', cr2: 'assets/b3/crumble_2.webp', cr3: 'assets/b3/crumble_3.webp', tr0: 'assets/b3/tramp_0.webp', tr1: 'assets/b3/tramp_1.webp', tr2: 'assets/b3/tramp_2.webp', bat0: 'assets/b3/bat_0.webp', bat1: 'assets/b3/bat_1.webp', bat2: 'assets/b3/bat_2.webp', fl0: 'assets/b3/flame_0.webp', fl1: 'assets/b3/flame_1.webp', fl2: 'assets/b3/flame_2.webp', fl3: 'assets/b3/flame_3.webp',
    fx_sparkle: 'assets/fx/collect_sparkle.webp', fx_puff: 'assets/fx/landing_puff.webp', fx_break: 'assets/fx/platform_break_burst.webp', fx_ring: 'assets/fx/pumpkin_bounce_ring.webp' };
  await Promise.all(Object.entries(names).map(async ([k, u]) => { T[k] = await tex(u, { alpha: !k.startsWith('sky') }); }));
  const aspect = (t) => t.image.width / t.image.height;
  const SH = await (await fetch('assets/b3/sheets.json')).json();
  const optTex = async (url, fb) => { try { return await tex(url); } catch (e) { return fb(); } };   // sprite-sheet cells + frame-0 visible box
  // placeholder rocket pack + flame (drawn, to be replaced by real art)
  T.rocket = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#7a3fd0'; g.beginPath(); g.moveTo(w / 2, 8); g.quadraticCurveTo(w - 14, 80, w - 24, 190); g.lineTo(24, 190); g.quadraticCurveTo(14, 80, w / 2, 8); g.fill();
    g.fillStyle = '#f6e7c8'; g.beginPath(); g.moveTo(w / 2, 8); g.quadraticCurveTo(w - 40, 40, w - 44, 70); g.lineTo(44, 70); g.quadraticCurveTo(40, 40, w / 2, 8); g.fill();
    g.fillStyle = '#ffcc33'; g.beginPath(); g.arc(w / 2, 125, 20, 0, 7); g.fill(); g.fillStyle = '#7a3fd0'; g.beginPath(); g.arc(w / 2 + 8, 120, 17, 0, 7); g.fill();
    g.fillStyle = '#4a2390'; g.fillRect(34, 190, 22, 26); g.fillRect(w - 56, 190, 22, 26);
  });
  T.flame = canvasTex(128, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, 60, 6, w / 2, 100, 100); gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.35, '#ffb02e'); gr.addColorStop(0.7, 'rgba(255,90,40,0.7)'); gr.addColorStop(1, 'rgba(120,40,200,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2 - 38, 0); g.quadraticCurveTo(w / 2 - 50, 140, w / 2, 250); g.quadraticCurveTo(w / 2 + 50, 140, w / 2 + 38, 0); g.fill();
  });
  T.bubbleOld = canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2 - 4); gr.addColorStop(0, 'rgba(180,220,255,0.10)'); gr.addColorStop(0.85, 'rgba(190,210,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0.8)'); g.fillStyle = gr; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 3, 0, 7); g.fill(); });

  // ---- layers (apparent size in world units at z=0; position via place()) ----
  const L = {};
  function place(mesh, x, yApp, w, h, z) { const s = (R.d - z) / R.d; mesh.position.set(x * s, camera.position.y + yApp * s, z); mesh.scale.set(w * s, h * s, 1); }
  L.skyDusk = sprite(T.sky_dusk, 0, { opaque: true }); L.skyMid = sprite(T.sky_mid, 1); L.skyAur = sprite(T.sky_aurora, 2);
  L.stars = sprite(T.stars, 3, { opacity: 0.5 }); L.moon = sprite(T.moon, 4); L.fly = sprite(T.witch, 5, { opacity: 0.55 });
  const FLY = ['witch', 'flyBats', 'flyCat', 'flyGhost', 'flyDragon'];
  L.fogs = [0, 1, 2].map(() => { const m = sprite(T.fog, 7, { opacity: 0.35 }); m.userData = { yl: 0, x: 0, w: 7, vx: 0.2 }; return m; });
  L.roofs = [0, 1, 2].map(() => sprite(T.roofs, 8, { opacity: 0.9 }));
  const GEO_TOP = new THREE.PlaneGeometry(1, 1); GEO_TOP.translate(0, -0.5, 0);   // pivot at the top edge (lanterns swing)
  T.glowO = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(0.25, 'rgba(255,170,60,0.8)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  T.glowP = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(250,230,255,1)'); gr.addColorStop(0.25, 'rgba(190,120,255,0.75)'); gr.addColorStop(1, 'rgba(140,80,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  // fireflies at three depths: far (behind the town), middle (with the fog), near (in front of her, few, bigger, soft)
  L.flies = [];
  for (const [n, z, p, s0, o, ro] of [[14, -40, 0.35, 0.42, 1, 9], [12, -12, 0.65, 0.55, 1, 9], [5, 4, 1.4, 1.2, 0.6, 45]]) for (let i = 0; i < n; i++) {
    const m = sprite(i % 3 ? T.glowO : T.glowP, ro); m.material.blending = THREE.AdditiveBlending;
    m.userData = { z, p, s: s0 * (0.7 + Math.random() * 0.6), o, yl: (Math.random() * 2 - 0.5) * 20, x: (Math.random() * 2 - 1) * 4.6, tw: 1 + Math.random() * 2.5, ph: Math.random() * 6.3 };
    L.flies.push(m);
  }
  for (const m of [...L.fogs, ...L.roofs, ...L.flies]) { m.visible = m.userData.p !== undefined; scene.add(m); }
  // ---- floating backgrounds (round 15, art from Dropbox 'Spooky_Hop_Floating_Backgrounds.zip' -> assets/b5) ----
  const B5 = ['island_house', 'island_graveyard', 'island_tree', 'balloon_pumpkin', 'balloon_ghost', 'moon_giant', 'shooting_star', 'cloud_far_band', 'cloud_near_wisps',
    'cloud_mid_0', 'cloud_mid_1', 'cloud_mid_2', 'island_far_0', 'island_far_1', 'island_far_2', 'island_far_3', 'lantern_sky_0', 'lantern_sky_1', 'lantern_sky_2', 'lantern_sky_3', 'lantern_sky_4'];
  await Promise.all(B5.map(async (n) => { T[n] = await optTex(`assets/b5/${n}.webp`, () => T.cloud); }));
  // scatter layers: pieces placed by slot index k (hash-based, nothing stored), each layer at its own depth and parallax.
  // gap = spacing in screens of layer space; start = metres climbed before the first piece shows.
  const SCAT = [
    { tex: ['cloud_far_band'], p: 0.1, z: -85, ro: 6.2, w: [10, 12], gap: 1.2, start: 30, op: 0.75, xr: 1.5 },
    { tex: ['island_far_0', 'island_far_1', 'island_far_2', 'island_far_3'], p: 0.15, z: -70, ro: 6.4, w: [1.3, 1.9], gap: 0.7, start: 50, op: 0.9, bob: 0.12, xr: 3.6 },
    { tex: ['island_house', 'island_graveyard', 'island_tree'], p: 0.4, z: -28, ro: 8.6, w: [2.8, 3.6], gap: 1.05, start: 60, op: 1, bob: 0.25, xr: 2.8 },
    { tex: ['balloon_pumpkin', 'balloon_ghost'], p: 0.6, z: -14, ro: 9.3, w: [1.4, 1.9], gap: 1.6, start: 100, op: 1, bob: 0.3, xr: 3.2, sway: 0.8 },
    { tex: ['cloud_near_wisps'], p: 1.3, z: 3, ro: 44, w: [10, 13], gap: 1.4, start: 20, op: 0.3, xr: 1.5 },
    { tex: ['lantern_sky_0', 'lantern_sky_1', 'lantern_sky_2', 'lantern_sky_3', 'lantern_sky_4'], p: 1.5, z: 5, ro: 46, w: [0.55, 0.95], gap: 0.75, start: 45, op: 0.85, bob: 0.2, xr: 4.0 },
  ];
  for (const c of SCAT) { c.pool = Array.from({ length: 5 }, () => { const m = sprite(T[c.tex[0]], c.ro, { opacity: c.op }); m.visible = false; scene.add(m); return m; }); }
  const hsh = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  L.moonG = sprite(T.moon_giant, 4); L.star = sprite(T.shooting_star, 4.5); for (const m of [L.moonG, L.star]) { m.visible = false; scene.add(m); }
  L.clouds = [0, 1, 2, 3].map((i) => { const m = sprite(T['cloud_mid_' + (i % 3)], 6, { opacity: 0.75 }); m.userData = { yl: 0, x: 0, w: 3.5, vx: 0.15 }; return m; });
  // ---- OPENING SET PIECE (round 14): you climb the face of a huge castle (near), its towers stand behind (middle), a far keep
  // further back (deep); the city is hidden behind the castle and appears as you clear its top. Real art drops in at
  // assets/b4/castle_front.webp / castle_mid.webp / castle_far.webp; drawn placeholders are used until those exist.
  const lit = (g, x, y, w, h) => { const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#ffd27a'); gr.addColorStop(1, '#f07a12'); g.fillStyle = gr; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.fill(); };
  T.castleF = await optTex('assets/b4/castle_front.webp', () => canvasTex(512, 2048, (g, w, h) => {
    const top = 150, wall = (y0, y1, x0, x1, c0, c1) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0); };
    wall(top, h, 40, w - 40, '#55408a', '#2a1c4c');
    for (let x = 40; x < w - 40; x += 40) wall(top - 28, top, x, x + 24, '#5b4594', '#55408a');         // battlements
    for (const tx of [0, w - 110]) { wall(60, h, tx, tx + 110, '#4a3680', '#22173f'); g.fillStyle = '#3a2468'; g.beginPath(); g.moveTo(tx - 12, 64); g.lineTo(tx + 55, -40 + 40); g.lineTo(tx + 122, 64); g.fill(); g.fillStyle = '#ff9a2e'; g.fillRect(tx + 52, 0, 6, 16); }
    g.strokeStyle = 'rgba(20,10,40,0.35)'; g.lineWidth = 2;
    for (let y = top + 20; y < h; y += 34) { g.beginPath(); g.moveTo(40, y); g.lineTo(w - 40, y); g.stroke(); }
    for (let y = top + 90; y < h - 340; y += 190) for (const x of [150, 236, 322]) lit(g, x, y, 40, 70);
    for (let y = 220; y < h - 300; y += 230) for (const x of [35, w - 75]) lit(g, x, y, 40, 64);
    g.fillStyle = '#1a1030'; g.beginPath(); g.moveTo(170, h); g.lineTo(170, h - 220); g.arc(256, h - 220, 86, Math.PI, 0); g.lineTo(342, h); g.fill();   // gate
    g.fillStyle = 'rgba(255,150,50,0.35)'; g.fillRect(186, h - 200, 140, 200);
    for (const x of [96, w - 128]) { g.fillStyle = '#7a3fd0'; g.fillRect(x, top + 40, 32, 150); g.fillStyle = '#ff9a2e'; g.fillRect(x, top + 40, 32, 18); }
  }));
  T.castleM = await optTex('assets/b4/castle_mid.webp', () => canvasTex(512, 1536, (g, w, h) => {
    for (const [x, tw, ty] of [[30, 110, 260], [200, 120, 80], [380, 100, 330]]) {
      g.fillStyle = '#3c2d6c'; g.fillRect(x, ty, tw, h - ty); g.fillStyle = '#30205a'; g.beginPath(); g.moveTo(x - 14, ty + 4); g.lineTo(x + tw / 2, ty - 170); g.lineTo(x + tw + 14, ty + 4); g.fill();
      for (let y = ty + 70; y < h - 200; y += 200) lit(g, x + tw / 2 - 14, y, 28, 46);
    }
  }));
  T.castleD = await optTex('assets/b4/castle_far.webp', () => canvasTex(384, 1536, (g, w, h) => {
    g.fillStyle = 'rgba(110,92,170,0.8)'; g.fillRect(140, 420, 104, h - 420); g.beginPath(); g.moveTo(124, 424); g.lineTo(192, 60); g.lineTo(260, 424); g.fill();
    g.fillStyle = 'rgba(255,190,90,0.8)'; g.beginPath(); g.arc(192, 560, 14, 0, 7); g.fill();
  }));
  L.castleD = sprite(T.castleD, 7.5); L.castleM = sprite(T.castleM, 9); L.castleF = sprite(T.castleF, 10);
  for (const m of [L.castleD, L.castleM, L.castleF]) scene.add(m);
  L.town = sprite(T.town, 8); L.houses = sprite(T.houses, 40);
  for (const m of [L.skyDusk, L.skyMid, L.skyAur, L.stars, L.moon, L.fly, ...L.clouds, L.town, L.houses]) scene.add(m);
  // gameplay
  const platMat = { flat: T.flat, slider: T.slider, crumbly: T.crumbly };
  const pPool = [], cPool = [], tPool = [], iPool = [];
  const get = (pool, make) => { for (const m of pool) if (!m.visible) { m.visible = true; return m; } const m = make(); pool.push(m); scene.add(m); return m; };
  const mkPlat = () => sprite(T.flat, 20), mkTramp = () => sprite(T.tramp, 21), mkCandy = () => sprite(T.candy, 22), mkItem = () => sprite(T.rocketP, 22);
  const player = sprite(null, 25); scene.add(player);
  const worn = sprite(T.rocketW, 24), flame = sprite(T.flame, 23), bubble = sprite(T.bubble, 26, { opacity: 0.85 }), bat = sprite(T.bat0, 27);
  for (const m of [worn, flame, bubble, bat]) { m.visible = false; scene.add(m); }
  // one-shot effects from the HUD/effects pack: sparkle (candy), puff (landing), ring (trampoline), break (crumbly platform)
  const FX = { sparkle: { tx: 'fx_sparkle', w: 1.3, dur: 0.4, grow: 0.8, rise: 0.8 }, puff: { tx: 'fx_puff', w: 1.9, dur: 0.32, grow: 0.6, rise: 0.15 },
               ring: { tx: 'fx_ring', w: 2.0, dur: 0.4, grow: 1.0, rise: 0 }, break: { tx: 'fx_break', w: 3.0, dur: 0.6, grow: 0.25, rise: -1.2 }, burst: { tx: 'burst', w: 2.6, dur: 0.55, grow: 0.9, rise: 0.3 } };
  const pops = Array.from({ length: 16 }, () => { const m = sprite(T.fx_sparkle, 30); m.visible = false; m.userData = { t: 9 }; scene.add(m); return m; });

  R.resize = () => {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
    R.viewH = C.viewW * h / w; sim.viewH = R.viewH;
    R.d = R.viewH / (2 * Math.tan(THREE.MathUtils.degToRad(15)));
    camera.aspect = w / h; camera.position.z = R.d; camera.far = R.d + 400; camera.updateProjectionMatrix();
  };
  R.resize(); addEventListener('resize', R.resize);

  R.anchor = () => { R.cam0 = sim.cam.y; for (const f of (L.flies || [])) { const u = f.userData; u.yl = u.p * sim.cam.y + (Math.random() - 0.5) * R.viewH * 1.1; u.x = (Math.random() * 2 - 1) * 4.6; } R.flyT = 12; R.pops = 0; for (const m of L.fogs) { m.userData.yl = (Math.random() * 1.6 + 0.3) * R.viewH; m.userData.x = (Math.random() * 2 - 1) * 3; } for (const m of L.clouds) { m.userData.yl = (Math.random() * 1.6 - 0.2) * R.viewH; m.userData.x = (Math.random() * 2 - 1) * 5; m.userData.w = 2.6 + Math.random() * 2; } };
  R.setSim = (s) => { R.sim = s; sim = s; R.resize(); R.anchor(); };
  R.anchor();

  R.loadOutfit = async (id) => {
    if (!R.atlases[id]) {
      const j = prepare(await (await fetch(`assets/outfits/${id}.json`)).json());
      j.tex = await tex(`assets/outfits/${id}.webp`, { alpha: true, mip: false }); R.atlases[id] = j;
    }
    R.outfit = R.atlases[id]; const m = player.material; m.map = R.outfit.tex; m.premultipliedAlpha = true; m.needsUpdate = true;
  };
  const smooth = (h, a, b) => { const t = Math.max(0, Math.min(1, (h - a) / (b - a))); return t * t * (3 - 2 * t); };

  R.fx = (kind, x, y, w) => { const m = pops[R.pops++ % pops.length], f = FX[kind]; m.visible = true; m.material.map = T[f.tx]; m.material.needsUpdate = true; m.userData = { t: 0, x, y, f, w: w || f.w }; };
  R.pop = (x, y) => R.fx('sparkle', x, y);

  R.frame = (dt, mode) => {
    R.sim = sim; R.t += dt; const t = R.t, cy = sim.cam.y, vh = R.viewH, H = sim.height, W = C.viewW;
    camera.position.y = cy;
    const cover = (m, tx, zz, extra = 1.12, driftY = 0) => { const a = aspect(tx); const hApp = Math.max(vh, W / a) * extra; place(m, 0, driftY, hApp * a, hApp, zz); };
    const drift = -0.5 * Math.tanh(H / 500) * vh * 0.06;
    cover(L.skyDusk, T.sky_dusk, -120, 1.12, drift); cover(L.skyMid, T.sky_mid, -119, 1.12, drift); cover(L.skyAur, T.sky_aurora, -118, 1.12, drift);
    L.skyMid.material.opacity = smooth(H, 100, 320); L.skyAur.material.opacity = smooth(H, 750, 1100);
    cover(L.stars, T.stars, -110, 1.12, drift * 1.6); L.stars.material.opacity = (0.25 + 0.55 * smooth(H, 20, 250)) * (0.8 + 0.2 * Math.sin(t * 1.3));
    const ma = aspect(T.moon), mg = smooth(H, 450, 750); L.moon.material.opacity = 1 - mg; L.moon.visible = mg < 0.99; place(L.moon, 2.3, 0.3 * vh - H * 0.004, 3.0, 3.0 / ma, -100);
    L.moonG.visible = mg > 0.01; L.moonG.material.opacity = mg; if (L.moonG.visible) place(L.moonG, 1.6, 0.27 * vh, 4.6, 4.6 / aspect(T.moon_giant), -100);
    R.starT = (R.starT ?? 6) - dt; if (R.starT < -1.1) R.starT = 8 + Math.random() * 9;    // a shooting star every 8-17 s, 1.1 s long
    L.star.visible = R.starT < 0 && mode !== 'title'; if (L.star.visible) { const u = -R.starT / 1.1, sw = 2.4; L.star.material.opacity = Math.sin(u * Math.PI); place(L.star, 5 - u * 9, 0.38 * vh - u * 0.18 * vh, sw, sw / aspect(T.shooting_star), -95); }
    // witch fly-by: every ~30 s, 12 s crossing
    R.flyT += dt; const fp = R.flyT % 24, fi = Math.floor(R.flyT / 24) % FLY.length, ftx = T[FLY[fi]], fa = aspect(ftx);
    if (L.fly.material.map !== ftx) { L.fly.material.map = ftx; L.fly.material.needsUpdate = true; }
    L.fly.visible = fp < 12; if (L.fly.visible) place(L.fly, -7 + fp / 12 * 14, (0.12 + 0.1 * (fi % 3)) * vh + Math.sin(fp * 0.9) * 0.3, 2.8, 2.8 / fa, -90);
    for (const m of L.fogs) { const u = m.userData; u.x += u.vx * dt; if (u.x > 6) u.x = -6; let y = u.yl - 0.6 * cy; if (y < -vh / 2 - 3) { u.yl = 0.6 * cy + vh / 2 + 2 + Math.random() * vh * 1.5; u.x = (Math.random() * 2 - 1) * 3; y = u.yl - 0.6 * cy; } m.visible = true; place(m, u.x, y, u.w, u.w / aspect(T.fog), -12); }
    for (const m of L.clouds) { const u = m.userData; u.x += u.vx * dt; if (u.x > 7) u.x = -7; const y = u.yl - 0.45 * cy; if (y < -vh / 2 - 3) { u.yl = 0.45 * cy + vh / 2 + 2 + Math.random() * vh; u.x = (Math.random() * 2 - 1) * 5; u.w = 2.6 + Math.random() * 2; } place(m, u.x, u.yl - 0.45 * cy, u.w, u.w / aspect(m.material.map), -60); }
    const tH = W / aspect(T.town), p3 = 0.3, hp = 1.25;
    // opening castle: front (near, 0.85), towers (middle, 0.5), keep (deep, 0.2); bottoms anchored to the start view
    const SB = -vh / 2, OP = [[L.castleF, T.castleF, 0.85, -6, W * 1.04, -0.6], [L.castleM, T.castleM, 0.5, -22, W, 0.3 * vh], [L.castleD, T.castleD, 0.2, -60, W * 0.45, 0.75 * vh]];
    for (const [m, tx, p, z, w, lift] of OP) { const h = w / aspect(tx), yl = R.cam0 * p + SB + lift + h / 2, y = yl - p * cy; m.visible = y - h / 2 < vh / 2 + 2 && y + h / 2 > -vh / 2 - 2; if (m.visible) place(m, 0, y, w, h, z); }
    const frontTop = (W * 1.04) / aspect(T.castleF) - 0.6, townLift = p3 * (frontTop / 0.85) - 2.5 + 0.18 * vh;   // city appears just as you clear the castle
    place(L.town, 0, (R.cam0 * p3 - vh / 2 + tH / 2 + townLift) - p3 * cy, W, tH, -30);
    place(L.houses, 0, (R.cam0 * hp - vh / 2 + tH / 2) - hp * cy, W, tH, 6);       // foreground houses in FRONT, scroll away at 1.25
    // repeating rooftop bands (layer 0.3) above the start town, fading out above ~600 m
    const rH = W / aspect(T.roofs), rGap = rH * 1.9, rBase = R.cam0 * p3 - vh / 2 + townLift + tH + rGap * 1.3, ro = 1 - smooth(H, 450, 750);
    { const k0 = Math.max(0, Math.floor((p3 * cy - vh / 2 - rBase) / rGap)); L.roofs.forEach((m, i) => { const k = k0 + i, yl = rBase + k * rGap; m.visible = ro > 0.01; m.material.opacity = 0.9 * ro; place(m, 0, yl - p3 * cy, (k % 2 ? -1 : 1) * W, rH, -30); }); }
    for (const c of SCAT) {
      const sp = c.gap * vh, base = c.p * (R.cam0 + c.start) + vh / 2 + 2, lo = c.p * cy - vh / 2 - 4, hi = c.p * cy + vh / 2 + 4; let n = 0;
      for (let k = Math.max(0, Math.floor((lo - base) / sp) - 1); k <= Math.floor((hi - base) / sp) + 1 && n < c.pool.length; k++) {
        if (k < 0) continue; const id = c.z * 31 + k, yl = base + k * sp + (hsh(id, 1) - 0.5) * sp * 0.5, tx = T[c.tex[Math.floor(hsh(id, 2) * c.tex.length)]];
        const w = c.w[0] + (c.w[1] - c.w[0]) * hsh(id, 3), h = w / aspect(tx), y = yl - c.p * cy + (c.bob || 0) * Math.sin(t * 0.7 + k * 1.7);
        if (y - h / 2 > vh / 2 + 1 || y + h / 2 < -vh / 2 - 1) continue;
        const m = c.pool[n++]; if (m.material.map !== tx) { m.material.map = tx; m.material.needsUpdate = true; }
        const x = (hsh(id, 4) * 2 - 1) * c.xr + (c.sway || 0) * Math.sin(t * 0.12 + k);
        m.visible = true; place(m, x, y, w, h, c.z);
      }
      for (let i = n; i < c.pool.length; i++) c.pool[i].visible = false;
    }
    // side towers REMOVED in round 13 (user didn't like them). Fireflies: glowing dots at 3 depths, each moving at its own parallax.
    for (const f of L.flies) { const u = f.userData; let y = u.yl - u.p * cy;
      if (y < -vh / 2 - 1) { u.yl = u.p * cy + vh / 2 + Math.random() * vh; u.x = (Math.random() * 2 - 1) * 4.6; y = u.yl - u.p * cy; }
      if (y > vh / 2 + vh) { u.yl = u.p * cy - vh / 2 + Math.random() * vh; y = u.yl - u.p * cy; }
      f.material.opacity = u.o * (0.55 + 0.45 * Math.sin(t * u.tw + u.ph));
      place(f, u.x + Math.sin(t * 0.5 + u.ph) * 0.5, y + Math.sin(t * 0.8 + u.ph * 2) * 0.3, u.s, u.s, u.z); }
    // ---- gameplay ----
    for (const m of pPool) m.visible = false; for (const m of cPool) m.visible = false; for (const m of tPool) m.visible = false; for (const m of iPool) m.visible = false;
    for (const p of sim.gen.platforms) {
      if (!p.alive || p.y < cy - vh / 2 - 2 || p.y > cy + vh / 2 + 3 || (mode === 'title' && p.id !== 0)) continue;
      const m = get(pPool, mkPlat), tx = platMat[p.type]; if (m.material.map !== tx) { m.material.map = tx; m.material.needsUpdate = true; }
      const a = aspect(tx), h = p.w / a; let x = p.x, y = p.y + C.platTopFrac * h - h / 2, o = 1;
      if (p.crumbling) {        // art frames: cracks glow (1), splits (2), crumbs fall and fade (3); aligned on frame 0's slab
        const u = p.ct, fr = u < 0.12 ? 1 : u < 0.3 ? 2 : 3, ftx = T['cr' + fr], S = SH.crumble, v = S.vis0, k = p.w / (v[2] - v[0]);
        if (m.material.map !== ftx) { m.material.map = ftx; m.material.needsUpdate = true; }
        const topY = p.y + C.platTopFrac * h, cxW = p.x + (S.cell[0] / 2 - (v[0] + v[2]) / 2) * k;
        m.material.opacity = fr === 3 ? Math.max(0, 1 - (u - 0.3) / 0.6) : 1;
        place(m, cxW, topY - (S.cell[1] / 2 - v[1]) * k - (fr === 3 ? (u - 0.3) * 1.5 : 0) - cy, S.cell[0] * k, S.cell[1] * k, 0);
      } else { m.material.opacity = o; place(m, x, y - cy, p.w * 1.02, h, 0); }
      if (p.tramp) {
        const tm = get(tPool, mkTramp), S = SH.tramp, v = S.vis0, u = p.trampT ?? 9, fr = u < 0.09 ? 1 : u < 0.32 ? 2 : 0, ftx = T['tr' + fr];
        if (tm.material.map !== ftx) { tm.material.map = ftx; tm.material.needsUpdate = true; }
        const k = 1.6 / (v[2] - v[0]), cw = S.cell[0] * k, ch = S.cell[1] * k;   // rest pumpkin 1.6 u wide; frames share the cell, base on the slab
        place(tm, p.x + (S.cell[0] / 2 - (v[0] + v[2]) / 2) * k, p.y - 0.03 - (S.cell[1] - v[3]) * k + ch / 2 - cy, cw, ch, 0.01);
      }
    }
    for (const c of sim.gen.candies) {
      if (mode === 'title') break;
      if (c.taken || c.y < cy - vh / 2 - 1 || c.y > cy + vh / 2 + 1) continue;
      const m = get(cPool, mkCandy), ctx2 = c.gold ? T.gold : T.candy, s = c.gold ? 0.8 : 0.55, a = aspect(ctx2), ph = t * 2.5 + c.id;
      if (m.material.map !== ctx2) { m.material.map = ctx2; m.material.needsUpdate = true; }
      place(m, c.x, c.y + Math.sin(ph) * 0.08 - cy, s * a * (0.8 + 0.2 * Math.cos(ph)), s, 0.02);
    }
    for (const it of sim.gen.items) {
      if (mode === 'title') break;
      if (it.taken || it.y < cy - vh / 2 - 1 || it.y > cy + vh / 2 + 1) continue;
      const m = get(iPool, mkItem), ia = aspect(T.rocketP); place(m, it.x, it.y + Math.sin(t * 3) * 0.12 - cy, 1.2, 1.2 / ia, 0.02);
    }
    for (const m of pops) if (m.visible) { const u = m.userData, f = u.f; u.t += dt; if (u.t > f.dur) { m.visible = false; continue; } const k = u.t / f.dur, s = u.w * (0.7 + f.grow * k), a = aspect(m.material.map); m.material.opacity = 1 - k * k; place(m, u.x, u.y + f.rise * k - cy, s, s / a, 0.03); }
    // player
    const pl = sim.player, o = R.outfit;
    if (o) {
      const fi = mode === 'title' ? 0 : frameFor(o, pl), f = o.frames[fi], upp = C.charH / o.standHeightPx, tx = o.tex;
      const AW = o.atlasSize[0], AH = o.atlasSize[1];
      tx.repeat.set(f.w / AW, f.h / AH); tx.offset.set(f.x / AW, 1 - (f.y + f.h) / AH);
      const flip = pl.face > 0 ? 1 : -1;     // clips look to the right
      const w = f.w * upp, h = f.h * upp, base = pl.y + f.dy * upp;
      player.visible = true; place(player, pl.x + flip * f.dx * upp, base + h / 2 - cy, w * flip, h, 0.05);
    }
    const rk = pl.mode === 'rocket';
    worn.visible = flame.visible = rk;
    if (rk) { const fl = pl.face > 0 ? 1 : -1, ww = 0.75, wh = ww / aspect(T.rocketW), bx = pl.x - fl * 0.32, by = pl.y + 0.95;
      place(worn, bx, by - cy, -fl * ww, wh, 0.04);                                     // straps toward her back
      const ft = T['fl' + (Math.floor(t * 14) % 4)], S = SH.flame, fwid = 0.7, fhgt = fwid * S.cell[1] / S.cell[0], nx = bx - fl * ww * 0.12;   // flame art, 14 fps loop
      if (flame.material.map !== ft) { flame.material.map = ft; flame.material.needsUpdate = true; }
      place(flame, nx, by - wh / 2 - fhgt / 2 + 0.12 - cy, fwid, fhgt * (0.95 + 0.08 * Math.sin(t * 30)), 0.045); }
    bubble.visible = bat.visible = pl.mode === 'rescue';
    if (bubble.visible) { place(bubble, pl.x, pl.y + 0.8 - cy, 2.3, 2.3, 0.06); const bt = T['bat' + (Math.floor(t * 12) % 3)]; if (bat.material.map !== bt) { bat.material.map = bt; bat.material.needsUpdate = true; } place(bat, pl.x, pl.y + 2.35 - cy, 1.3, 1.3 / aspect(bt), 0.07); }
    renderer.render(scene, camera);
  };
  return R;
}
