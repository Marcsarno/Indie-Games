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
  const SH = await (await fetch('assets/b3/sheets.json')).json();   // sprite-sheet cells + frame-0 visible box
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
  L.walls = Array.from({ length: 10 }, () => sprite(T.wallL, 40)); L.caps = Array.from({ length: 6 }, () => sprite(T.roofL, 41));
  L.lans = Array.from({ length: 6 }, () => { const m = sprite(T.lanP, 42); m.geometry = GEO_TOP; return m; });
  for (const m of [...L.fogs, ...L.roofs, ...L.walls, ...L.caps, ...L.lans]) { m.visible = false; scene.add(m); }
  L.clouds = [0, 1, 2, 3].map((i) => { const m = sprite(T.cloud, 6, { opacity: 0.5 }); m.userData = { yl: 0, x: 0, w: 3.5, vx: 0.15 }; return m; });
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

  R.anchor = () => { R.cam0 = sim.cam.y; R.flyT = 12; R.pops = 0; for (const m of L.fogs) { m.userData.yl = (Math.random() * 1.6 + 0.3) * R.viewH; m.userData.x = (Math.random() * 2 - 1) * 3; } for (const m of L.clouds) { m.userData.yl = (Math.random() * 1.6 - 0.2) * R.viewH; m.userData.x = (Math.random() * 2 - 1) * 5; m.userData.w = 2.6 + Math.random() * 2; } };
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
    const ma = aspect(T.moon); place(L.moon, 2.3, 0.3 * vh - H * 0.004, 3.0, 3.0 / ma, -100);
    // witch fly-by: every ~30 s, 12 s crossing
    R.flyT += dt; const fp = R.flyT % 24, fi = Math.floor(R.flyT / 24) % FLY.length, ftx = T[FLY[fi]], fa = aspect(ftx);
    if (L.fly.material.map !== ftx) { L.fly.material.map = ftx; L.fly.material.needsUpdate = true; }
    L.fly.visible = fp < 12; if (L.fly.visible) place(L.fly, -7 + fp / 12 * 14, (0.12 + 0.1 * (fi % 3)) * vh + Math.sin(fp * 0.9) * 0.3, 2.8, 2.8 / fa, -90);
    for (const m of L.fogs) { const u = m.userData; u.x += u.vx * dt; if (u.x > 6) u.x = -6; let y = u.yl - 0.6 * cy; if (y < -vh / 2 - 3) { u.yl = 0.6 * cy + vh / 2 + 2 + Math.random() * vh * 1.5; u.x = (Math.random() * 2 - 1) * 3; y = u.yl - 0.6 * cy; } m.visible = true; place(m, u.x, y, u.w, u.w / aspect(T.fog), -12); }
    for (const m of L.clouds) { const u = m.userData; u.x += u.vx * dt; if (u.x > 7) u.x = -7; const y = u.yl - 0.45 * cy; if (y < -vh / 2 - 3) { u.yl = 0.45 * cy + vh / 2 + 2 + Math.random() * vh; u.x = (Math.random() * 2 - 1) * 5; u.w = 2.6 + Math.random() * 2; } place(m, u.x, u.yl - 0.45 * cy, u.w, u.w / aspect(T.cloud), -60); }
    const tH = W / aspect(T.town), p3 = 0.3, hp = 1.25;
    place(L.town, 0, (R.cam0 * p3 - vh / 2 + tH / 2) - p3 * cy, W, tH, -30);        // start-of-run town, scrolls away at 0.3
    place(L.houses, 0, (R.cam0 * hp - vh / 2 + tH / 2) - hp * cy, W, tH, 6);       // foreground houses in FRONT, scroll away at 1.25
    // repeating rooftop bands (layer 0.3) above the start town, fading out above ~600 m
    const rH = W / aspect(T.roofs), rGap = rH * 1.9, rBase = R.cam0 * p3 - vh / 2 + tH + rGap * 0.4, ro = 1 - smooth(H, 450, 750);
    { const k0 = Math.max(0, Math.floor((p3 * cy - vh / 2 - rBase) / rGap)); L.roofs.forEach((m, i) => { const k = k0 + i, yl = rBase + k * rGap; m.visible = ro > 0.01; m.material.opacity = 0.9 * ro; place(m, 0, yl - p3 * cy, (k % 2 ? -1 : 1) * W, rH, -30); }); }
    // foreground walls (layer 1.25, in FRONT): spans of tiles at each edge, roof cap on top, swinging lanterns; dim when she is near that edge
    { const wW = 1.25, wTop = R.cam0 * hp - vh / 2 + tH; let wi = 0, ci = 0, li = 0;
      const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
      const has = (j, side) => j >= 2 && hash(Math.floor(j / 3), side) < 0.55 && hash(j, side + 7) < 0.85;
      const nearEdge = (side) => (side ? sim.player.x > 2.4 : sim.player.x < -2.4) ? 0.45 : 1;
      for (const side of [0, 1]) {
        const tx = side ? T.wallR : T.wallL, th = wW / aspect(tx), j0 = Math.floor((hp * cy - vh / 2 - wTop) / th) - 1;
        for (let j = Math.max(0, j0); j < j0 + Math.ceil(vh / th) + 3; j++) {
          if (!has(j, side)) continue;
          const yl = wTop + j * th, x = side ? W / 2 - wW / 2 : -W / 2 + wW / 2, op = nearEdge(side), m = L.walls[wi++ % L.walls.length];
          if (m.material.map !== tx) { m.material.map = tx; m.material.needsUpdate = true; }
          m.visible = true; m.material.opacity = op; place(m, x, yl + th / 2 - hp * cy, wW, th, 6);
          if (!has(j + 1, side)) { const ct = side ? T.roofR : T.roofL, cw = 1.9, ch = cw / aspect(ct), c = L.caps[ci++ % L.caps.length];
            if (c.material.map !== ct) { c.material.map = ct; c.material.needsUpdate = true; } c.visible = true; c.material.opacity = op;
            place(c, side ? W / 2 - cw / 2 : -W / 2 + cw / 2, yl + th + ch / 2 - 0.35 - hp * cy, cw, ch, 6); }
          if (hash(j, side + 3) < 0.6) { const lt = hash(j, side + 5) < 0.5 ? T.lanP : T.lanQ, lw = 0.95, l = L.lans[li++ % L.lans.length];
            if (l.material.map !== lt) { l.material.map = lt; l.material.needsUpdate = true; } l.visible = true; l.material.opacity = op;
            place(l, side ? W / 2 - wW - lw * 0.35 : -W / 2 + wW + lw * 0.35, yl + th * (0.3 + 0.4 * hash(j, side + 9)) - hp * cy, (side ? -1 : 1) * lw, lw / aspect(lt), 6.1);
            l.rotation.z = Math.sin(t * 1.7 + j * 1.3 + side) * 0.12; }
        }
      }
      for (let i = wi; i < L.walls.length; i++) L.walls[i].visible = false; for (let i = ci; i < L.caps.length; i++) L.caps[i].visible = false; for (let i = li; i < L.lans.length; i++) L.lans[i].visible = false; }
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
