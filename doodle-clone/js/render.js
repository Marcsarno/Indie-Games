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
    town: B + 'mid-town-start.webp', houses: B + 'fg-houses-start.webp', flat: K + 'platform_standard.webp', slider: K + 'platform_moving.webp', crumbly: K + 'platform_fragile.webp', tramp: K + 'pumpkin_trampoline.webp', candy: K + 'pickup_candy_corn.webp' };
  await Promise.all(Object.entries(names).map(async ([k, u]) => { T[k] = await tex(u, { alpha: !k.startsWith('sky') }); }));
  const aspect = (t) => t.image.width / t.image.height;
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
  T.bubble = canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2 - 4); gr.addColorStop(0, 'rgba(180,220,255,0.10)'); gr.addColorStop(0.85, 'rgba(190,210,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0.8)'); g.fillStyle = gr; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 3, 0, 7); g.fill(); });

  // ---- layers (apparent size in world units at z=0; position via place()) ----
  const L = {};
  function place(mesh, x, yApp, w, h, z) { const s = (R.d - z) / R.d; mesh.position.set(x * s, camera.position.y + yApp * s, z); mesh.scale.set(w * s, h * s, 1); }
  L.skyDusk = sprite(T.sky_dusk, 0, { opaque: true }); L.skyMid = sprite(T.sky_mid, 1); L.skyAur = sprite(T.sky_aurora, 2);
  L.stars = sprite(T.stars, 3, { opacity: 0.5 }); L.moon = sprite(T.moon, 4); L.fly = sprite(T.witch, 5, { opacity: 0.55 });
  L.clouds = [0, 1, 2, 3].map((i) => { const m = sprite(T.cloud, 6, { opacity: 0.5 }); m.userData = { yl: 0, x: 0, w: 3.5, vx: 0.15 }; return m; });
  L.town = sprite(T.town, 8); L.houses = sprite(T.houses, 40);
  for (const m of [L.skyDusk, L.skyMid, L.skyAur, L.stars, L.moon, L.fly, ...L.clouds, L.town, L.houses]) scene.add(m);
  // gameplay
  const platMat = { flat: T.flat, slider: T.slider, crumbly: T.crumbly };
  const pPool = [], cPool = [], tPool = [], iPool = [];
  const get = (pool, make) => { for (const m of pool) if (!m.visible) { m.visible = true; return m; } const m = make(); pool.push(m); scene.add(m); return m; };
  const mkPlat = () => sprite(T.flat, 20), mkTramp = () => sprite(T.tramp, 21), mkCandy = () => sprite(T.candy, 22), mkItem = () => sprite(T.rocket, 22);
  const player = sprite(null, 25); scene.add(player);
  const worn = sprite(T.rocket, 24), flame = sprite(T.flame, 23), bubble = sprite(T.bubble, 26, { opacity: 0.9 });
  for (const m of [worn, flame, bubble]) { m.visible = false; scene.add(m); }
  const pops = Array.from({ length: 10 }, () => { const m = sprite(T.candy, 30); m.visible = false; m.userData = { t: 9 }; scene.add(m); return m; });

  R.resize = () => {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
    R.viewH = C.viewW * h / w; sim.viewH = R.viewH;
    R.d = R.viewH / (2 * Math.tan(THREE.MathUtils.degToRad(15)));
    camera.aspect = w / h; camera.position.z = R.d; camera.far = R.d + 400; camera.updateProjectionMatrix();
  };
  R.resize(); addEventListener('resize', R.resize);

  R.anchor = () => { R.cam0 = sim.cam.y; R.flyT = 12; R.pops = 0; for (const m of L.clouds) { m.userData.yl = (Math.random() * 1.6 - 0.2) * R.viewH; m.userData.x = (Math.random() * 2 - 1) * 5; m.userData.w = 2.6 + Math.random() * 2; } };
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

  R.pop = (x, y) => { const m = pops[R.pops++ % pops.length]; m.visible = true; m.userData = { t: 0, x, y }; };

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
    R.flyT += dt; const fp = R.flyT % 30, fa = aspect(T.witch);
    L.fly.visible = fp < 12; if (L.fly.visible) place(L.fly, -7 + fp / 12 * 14, 0.18 * vh + Math.sin(fp * 0.9) * 0.3, 2.8, 2.8 / fa, -90);
    for (const m of L.clouds) { const u = m.userData; u.x += u.vx * dt; if (u.x > 7) u.x = -7; const y = u.yl - 0.45 * cy; if (y < -vh / 2 - 3) { u.yl = 0.45 * cy + vh / 2 + 2 + Math.random() * vh; u.x = (Math.random() * 2 - 1) * 5; u.w = 2.6 + Math.random() * 2; } place(m, u.x, u.yl - 0.45 * cy, u.w, u.w / aspect(T.cloud), -60); }
    const tH = W / aspect(T.town), p3 = 0.3, hp = 1.25;
    place(L.town, 0, (R.cam0 * p3 - vh / 2 + tH / 2) - p3 * cy, W, tH, -30);        // start-of-run town, scrolls away at 0.3
    place(L.houses, 0, (R.cam0 * hp - vh / 2 + tH / 2) - hp * cy, W, tH, 6);       // foreground houses in FRONT, scroll away at 1.25
    // ---- gameplay ----
    for (const m of pPool) m.visible = false; for (const m of cPool) m.visible = false; for (const m of tPool) m.visible = false; for (const m of iPool) m.visible = false;
    for (const p of sim.gen.platforms) {
      if (!p.alive || p.y < cy - vh / 2 - 2 || p.y > cy + vh / 2 + 3 || (mode === 'title' && p.id !== 0)) continue;
      const m = get(pPool, mkPlat), tx = platMat[p.type]; if (m.material.map !== tx) { m.material.map = tx; m.material.needsUpdate = true; }
      const a = aspect(tx), h = p.w / a; let x = p.x, y = p.y + C.platTopFrac * h - h / 2, o = 1;
      if (p.crumbling) { const u = p.ct; if (u < 0.45) x += Math.sin(u * 70) * 0.05; else { const f = u - 0.45; y -= 6 * f * f; o = Math.max(0, 1 - f / 0.8); } }
      m.material.opacity = o; place(m, x, y - cy, p.w * 1.02, h, 0);
      if (p.tramp) {
        const tm = get(tPool, mkTramp), ta2 = aspect(T.tramp), tw = 1.6, th = tw / ta2; let sy = 1;
        if (p.trampT !== undefined && p.trampT < 0.5) { const u = p.trampT; sy = u < 0.1 ? 1 - 0.35 * (u / 0.1) : 1 + 0.18 * Math.sin((u - 0.1) * 12) * Math.exp(-(u - 0.1) * 6) - 0.35 * Math.max(0, 1 - (u - 0.1) * 6); }
        place(tm, p.x, p.y - cy + th * sy / 2 - 0.03, tw, th * sy, 0.01);
      }
    }
    for (const c of sim.gen.candies) {
      if (mode === 'title') break;
      if (c.taken || c.y < cy - vh / 2 - 1 || c.y > cy + vh / 2 + 1) continue;
      const m = get(cPool, mkCandy), s = 0.55, a = aspect(T.candy), ph = t * 2.5 + c.id;
      place(m, c.x, c.y + Math.sin(ph) * 0.08 - cy, s * a * (0.8 + 0.2 * Math.cos(ph)), s, 0.02);
    }
    for (const it of sim.gen.items) {
      if (mode === 'title') break;
      if (it.taken || it.y < cy - vh / 2 - 1 || it.y > cy + vh / 2 + 1) continue;
      const m = get(iPool, mkItem); place(m, it.x, it.y + Math.sin(t * 3) * 0.12 - cy, 0.7, 1.4, 0.02);
    }
    for (const m of pops) if (m.visible) { const u = m.userData; u.t += dt; if (u.t > 0.35) { m.visible = false; continue; } const s = 0.55 * (1 + u.t * 3); m.material.opacity = 1 - u.t / 0.35; place(m, u.x, u.y + u.t * 2 - cy, s * aspect(T.candy), s, 0.03); }
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
    if (rk) { const fl = pl.face > 0 ? 1 : -1; place(worn, pl.x - fl * 0.28, pl.y + 0.85 - cy, 0.5, 1.0, 0.04); const fh = 1.1 + Math.sin(t * 40) * 0.25; place(flame, pl.x - fl * 0.28, pl.y + 0.35 - fh / 2 - cy, 0.5, fh, 0.045); }
    bubble.visible = pl.mode === 'rescue'; if (bubble.visible) place(bubble, pl.x, pl.y + 0.8 - cy, 2.2, 2.2, 0.06);
    renderer.render(scene, camera);
  };
  return R;
}
