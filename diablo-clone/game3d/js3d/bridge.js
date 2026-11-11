'use strict';
// The bridge between the 2D game's code (loaded unchanged before this file) and the 3D layer (js3d/main.js).
// It replaces render(): the world, characters and props are drawn by Three.js on the canvas underneath;
// this canvas keeps the HUD and, for now, the effects that are still drawn as pixels.
const render2d = render;
let R3D_LEVEL = 0;   // bumped whenever a level is (re)built, so the 3D scene rebuilds
{ const _start = startLevel; startLevel = function (...a) { const r = _start.apply(this, a); R3D_LEVEL++; return r; }; }
// Scenery: the 2D game draws each prop from a small rig, by name. Here nothing is drawn (the sprite is an empty stand-in);
// the name and the direction it faces are kept so the 3D layer can place the matching model.
const R3D_PROPS = {};   // name -> the function that builds its rig (for the exporter)
{ const _prop = propSprite;
  propSprite = function (name, build, size, yaw = 0) {
    const k = name + '|' + yaw;
    if (!propCache[k]) { const sp = propCache[k] = { w: 1, h: 1, ax: 0, ay: 0, data: new Uint8Array(1), z: new Uint8Array(1) }; sp.__name = name; sp.__yaw = yaw; R3D_PROPS[name] = build; }
    return propCache[k];
  }; }
// anything else the game renders from a rig (stairs, doorways): keep the rig with the sprite so the 3D layer can build it
{ const _rr = renderRig; renderRig = function (rig, yaw, ...rest) { const sp = _rr(rig, yaw, ...rest); sp.__rig = rig; sp.__ryaw = yaw; return sp; }; }
// The 2D picture of the world is never shown, so nothing is baked into it: no prop or corpse stamps, no light maps.
// (The painted floor itself, floorBuf, is still made: it is the 3D ground's texture.)
const R3D_FLOOR = { dirty: false, y0: 1e9, y1: -1 };
{ blitWorld = function () {}; bakeLightMaps = function () {}; bakeAO = function () {};
  if (typeof build2Runs === 'function') build2Runs = function () {};
  setFloor = function (k, v) { floorBuf[k] = v; R3D_FLOOR.dirty = true; const y = (k / WW) | 0; if (y < R3D_FLOOR.y0) R3D_FLOOR.y0 = y; if (y > R3D_FLOOR.y1) R3D_FLOOR.y1 = y; };
  const _gs = getSprite, stub = { w: 1, h: 1, ax: 0, ay: 0, data: new Uint8Array(1), z: new Uint8Array(1), px: 1 };
  getSprite = function (fam, look, dir, clip, f, ent, px = SPX) { return clip === 'death' && px === 1 && f === 5 ? stub : _gs(fam, look, dir, clip, f, ent, px); };   // (the corpse stamp)
  warmStep = function () {}; }   // (no character sprites are needed ahead of time)
// ---- world mode (window.R3D_MODE = 'world', the third-person game). Three things the 2D code assumes about the overhead view:
const R3D_TP = window.R3D_MODE === 'world';
if (R3D_TP) {
  // 1. the stick. The 2D game reads it as screen directions of the overhead view; here "up" means away from the camera.
  const _update = update, KEYS = [['a', -1, 0], ['arrowleft', -1, 0], ['d', 1, 0], ['arrowright', 1, 0], ['w', 0, -1], ['arrowup', 0, -1], ['s', 0, 1], ['arrowdown', 0, 1]];
  update = function (dt) {
    const R = window.R3D; if (!R || !R.ready || G.mode !== 'play') return _update(dt);
    const rx = input.mx, ry = input.my, held = []; let sx = rx, sy = ry;
    for (const [k, dx, dy] of KEYS) if (input.keys.has(k)) { sx += dx; sy += dy; held.push(k); input.keys.delete(k); }
    if (input.keys.has('[')) R.CAM.drag = (R.CAM.drag || 0) - dt * 2.2; if (input.keys.has(']')) R.CAM.drag = (R.CAM.drag || 0) + dt * 2.2;
    const l = Math.hypot(sx, sy), m = Math.min(1, l);
    if (l > 0.01) { const yaw = R.CAM.yaw, fx = Math.cos(yaw), fz = Math.sin(yaw), ux = sx / l, uy = sy / l, dx = -uy * fx - ux * fz, dz = -uy * fz + ux * fx; input.mx = (dx - dz) / Math.SQRT2 * m; input.my = (dx + dz) / Math.SQRT2 * m; }
    else { input.mx = 0; input.my = 0; }
    try { _update(dt); } finally { input.mx = rx; input.my = ry; for (const k of held) input.keys.add(k); }
  };
  // 2. everything the HUD pins to a spot in the world (name tags, loot names, door signs) finds that spot with iso(). While
  // the HUD is drawn, iso() answers with where the spot is on screen in THIS camera. (The build makes iso replaceable.)
  const _drawHud = drawHud, isoFlat = iso, F3 = [];
  drawHud = function () {
    const R = window.R3D; if (!R || !R.ready || !R.project) return _drawHud();
    const keep = [camX, camY, cam2x, cam2y, hx, hy]; camX = camY = cam2x = cam2y = hx = hy = 0;
    const hp = R.project(hero.fi, hero.fj, 0) || [W / 2, H * 0.6];
    iso = (fi, fj) => { const d = Math.hypot(fi - hero.fi, fj - hero.fj), p = d < 42 ? R.project(fi, fj, 0) : null;
      if (!p) { const s = R.screenDir(fi, fj); return [hp[0] + s[0] * 900, hp[1] + s[1] * 900]; }
      const top = R.project(fi, fj, 1.55); return [p[0], top ? top[1] + 30 : p[1]]; };   // (tags are drawn a little above this point: lift it to head height)
    try { _drawHud();
      for (const f of F3) { const p = R.project(f.fi, f.fj, f.y); if (!p) continue; if (f.t < 0.3 && BAYER[(Math.round(p[0]) & 3) + ((Math.round(p[1]) & 3) << 2)] > f.t / 0.3) continue; textC(f.text, Math.round(p[0]), Math.round(p[1]), f.col, f.size || 1); }
    } finally { iso = isoFlat; [camX, camY, cam2x, cam2y, hx, hy] = keep; }
  };
  // damage numbers: kept as spots in the world that drift up, drawn by the HUD pass above
  floater = function (text, fi, fj, z, col, size = 1) { F3.push({ text, fi, fj, y: 0.9 + z / 19.6, t: size > 1 ? 1.1 : 0.9, col, size }); };
  { const _u2 = update; update = function (dt) { for (const f of F3) { f.t -= dt; f.y += dt * 0.9; } for (let k = F3.length - 1; k >= 0; k--) if (F3[k].t <= 0) F3.splice(k, 1); return _u2(dt); }; }
  // 3. the quest arrow is drawn in the world (an arrow on the ground at the hero's feet), not as a ring on the screen
  drawStoryMark = function () {};
  // 5. new buildings this version adds to the open country: a chapel and two cottages by the camp, a second farmhouse by the
  // farm. Each looks for clear ground near where it belongs (no path, no person, no door, nothing of the level's own but
  // trees), turns its door toward the place it serves, and makes its footprint solid so nothing walks through it.
  { const _sl = startLevel, FLORA = /^(pine|oak|autumn|bush|fern|rock|shroom)\d/;
    const SHAPE = { chapel: [-2.4, 2.4, -3.3, 4.6], cottage: [-1.6, 1.6, -1.6, 1.6], cottage2: [-1.6, 1.6, -1.6, 1.6] };   // footprint around the model's origin (x0, x1, z0, z1); the door looks to +z
    const rectOf = (name, fi, fj, th) => { const [x0, x1, z0, z1] = SHAPE[name], c = Math.round(Math.cos(th)), sn = Math.round(Math.sin(th)), xs = [], zs = [];
      for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) { xs.push(fi + x * c + z * sn); zs.push(fj - x * sn + z * c); } return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]; };
    const green = (fi, fj) => { const [x, y] = isoFlat(fi, fj), X = Math.round(x), Y = Math.round(y); if (X < 0 || Y < 0 || X >= WW || Y >= WH) return false; const v = floorBuf[Y * WW + X] & 127; if (!v) return false; const c = PAL32[v], r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255; return g > r * 1.06 && g > b * 1.25; };
    function site(name, wantI, wantJ, faceI, faceJ, taken) {
      const busy = [];   // things a building must keep clear of: [fi, fj, how far]
      busy.push([hero.fi, hero.fj, 5]); for (const n of npcs) busy.push([n.fi, n.fj, 3]); for (const e of enemies) busy.push([e.fi, e.fj, 2.5]);
      try { for (const z of exitZones()) busy.push([z.fi, z.fj, z.r + 4]); } catch (e) { /* no exits yet */ }
      for (const pr of [...props, ...dynProps]) { const nm = pr.sp && pr.sp.__name; if (nm && FLORA.test(nm)) continue; const [fi, fj] = pr.fi !== undefined ? [pr.fi, pr.fj] : groundToTile(pr.wx, pr.wy); if (isFinite(fi)) busy.push([fi, fj, 2.2]); }
      for (const d of LV.decor || []) if (d.fi !== undefined && d.kind === 'lantern') busy.push([d.fi, d.fj, 1.5]);
      const cand = []; for (let dj = -9; dj <= 9; dj++) for (let di = -9; di <= 9; di++) cand.push([wantI + di, wantJ + dj, Math.hypot(di, dj)]); cand.sort((a, b) => a[2] - b[2]);
      for (const [ci, cj] of cand) {
        const fi = Math.floor(ci) + 0.5, fj = Math.floor(cj) + 0.5, th = Math.round(Math.atan2(faceI - fi, faceJ - fj) / (Math.PI / 2)) * (Math.PI / 2), R = rectOf(name, fi, fj, th);
        const i0 = Math.floor(R[0]), i1 = Math.floor(R[1]), j0 = Math.floor(R[2]), j1 = Math.floor(R[3]); let ok = i0 >= 4 && j0 >= 4 && i1 < MW - 4 && j1 < MH - 4;
        for (let j = j0 - 1; ok && j <= j1 + 1; j++) for (let i = i0 - 1; i <= i1 + 1; i++) { const k = j * MW + i; if (LV.map[k] !== FLOOR || (LV.reserve && LV.reserve[k]) || !green(i + 0.5, j + 0.5)) { ok = false; break; } }
        if (ok) for (const [bi, bj, r] of busy) if (bi > R[0] - r && bi < R[1] + r && bj > R[2] - r && bj < R[3] + r) { ok = false; break; }
        if (ok) for (const t of taken) if (R[0] < t.rect[1] + 2 && R[1] > t.rect[0] - 2 && R[2] < t.rect[3] + 2 && R[3] > t.rect[2] - 2) { ok = false; break; }
        if (!ok) continue;
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) LV.solid[j * MW + i] = 1;
        taken.push({ name, fi, fj, yaw: -th, rect: [i0, i1 + 1, j0, j1 + 1] }); return;
      }
    }
    startLevel = function () { const r = _sl.apply(this, arguments); const out = window.R3D_EXTRA = [];
      R3D_SAFE('extra buildings', () => { if (!LV.outdoor) return;
        if (LV.plaza) { const c = LV.plaza; site('chapel', c.x - 13, c.y + 1, c.x, c.y, out); site('cottage2', c.x + 1, c.y - 14, c.x, c.y, out); site('cottage', c.x - 9, c.y - 12, c.x, c.y, out); }
        const cab = props.find(pr => pr.sp && pr.sp.__name === 'cabin'); if (cab) { const [fi, fj] = groundToTile(cab.wx, cab.wy); site('cottage2', fi + 7, fj + 1, fi, fj + 6, out); }
      }); return r; }; }
  // 4. touch. The stick is the bottom-left corner and the buttons are bottom-right, as before; a finger dragged anywhere
  // else turns the camera (left/right) and tilts it (up/down). A quick tap on a person walks over to talk to them.
  { const look = { id: null, x: 0, y: 0, x0: 0, y0: 0, t: 0 };
    const onUi = p => { const cs = [UI.bag, UI.sound, UI.map, UI.portal, UI.potion, UI.attack, ...(UI.skills || [])]; if (ULTS[hero.cls]) cs.push(UI.ult);
      for (const c of cs) if (c && hitCircle(p, c, 8)) return true;
      const rs = [UI.tpPrompt, showMap && UI.lightBtn, ...(UI.h3 || [])]; if (UI.act && actionTarget()) rs.push(UI.act);
      for (const r of rs) if (r && inRect(p, r)) return true; return false; };
    window.addEventListener('pointerdown', e => {
      const R = window.R3D; if (!R || !R.ready || e.target !== cvs || G.mode !== 'play' || G.paused || hero.dead || guideFrozen() || look.id !== null) return;
      const p = toNative(e); if (onUi(p) || (p[0] < W * 0.5 && p[1] > H * 0.52)) return;
      e.stopPropagation(); e.preventDefault(); audioInit(); capture(e); look.id = e.pointerId; look.x = look.x0 = p[0]; look.y = look.y0 = p[1]; look.t = performance.now();
    }, true);
    window.addEventListener('pointermove', e => { if (e.pointerId !== look.id) return; const p = toNative(e), R = window.R3D;
      R.CAM.drag = (R.CAM.drag || 0) + (p[0] - look.x) * 0.0125; R.CAM.dpitch = (R.CAM.dpitch || 0) + (p[1] - look.y) * 0.006; look.x = p[0]; look.y = p[1]; }, true);
    const end = e => { if (e.pointerId !== look.id) return; look.id = null; const R = window.R3D;
      if (e.type === 'pointerup' && performance.now() - look.t < 320 && Math.hypot(look.x - look.x0, look.y - look.y0) < 5) {
        let best = null, bd = 26; for (const n of npcs) { const q = R.project(n.fi, n.fj, 0.9); if (!q) continue; const d = Math.hypot(q[0] - look.x, q[1] - look.y); if (d < bd) { bd = d; best = n; } }
        if (best) { hero.goTalk = best; hero.goTalkT = 6; } } };
    window.addEventListener('pointerup', end, true); window.addEventListener('pointercancel', end, true); }
}
const R3D_SAFE = (name, fn) => { try { fn(); } catch (e) { if (!R3D_SAFE.seen[name]) { R3D_SAFE.seen[name] = 1; console.error('3d: ' + name, e); } } };
R3D_SAFE.seen = {};
render = function () {
  const R = window.R3D;
  if ((G.mode === 'inv' || G.mode === 'skills') && G.fade <= 0) { ov32.fill(0); if (R && R.ready) R.frame(true); drawHudLayer(); return; }
  const t = G.t;
  const [kx, ky] = screenOf(hero), [vx0, vy0] = G.camAt ? screenOf(G.camAt) : [kx, ky];
  const sh = G.trauma * G.trauma * 5;
  const shx = Math.round(sh * (Math.sin(t * 61) * 0.6 + Math.sin(t * 97 + 1) * 0.4)), shy = Math.round(sh * (Math.sin(t * 73 + 2) * 0.6 + Math.sin(t * 89 + 3) * 0.4));
  const kx2 = G.kick && SHAKE ? Math.round(G.kick[0]) : 0, ky2 = G.kick && SHAKE ? Math.round(G.kick[1]) : 0;
  cam2x = Math.round((vx0 - W / 2) * SPX) + shx * SPX + kx2; cam2y = Math.round((vy0 - H * 0.47) * SPX) + shy * SPX + ky2;
  camX = Math.floor(cam2x / SPX); camY = Math.floor(cam2y / SPX); hx = cam2x - camX * SPX; hy = cam2y - camY * SPX;
  ov32.fill(0); levB.fill(L_ID); scr.fill(0); tbuf.fill(-1);
  // the ground layer: loot, warning marks, rings and scorches. The game paints these on the floor before the bodies; here they
  // go into the same buffer (cleared), which the 3D layer lays on the ground under the characters.
  { const base = [];
    for (const g of groundItems) {
      const [x, y] = iso(g.fi, g.fj), bounce = g.t < 0.4 ? Math.round(Math.sin(g.t / 0.4 * Math.PI) * 8) : 0, tile = tIdx(Math.floor(g.fi), Math.floor(g.fj));
      base.push({ depth: g.fi + g.fj - 0.3, draw: () => { if (g.gold) return drawGold(x, y - bounce, tile); if (g.gem) return drawGem(x, y - bounce, tile, g.gem); if (g.item.rarity !== 'normal' && g.t > 0.4) drawBeam(x, y, RARITY_COL[g.item.rarity], tile, g.item.id, g.item.rarity === 'legend'); blit(itemIcon(g.item), x, y - bounce + 4, false, 0, tile); } });
    }
    R3D_SAFE('shrines', () => shrineCrystals(base));
    R3D_SAFE('heroRing', () => heroRing(kx, ky + 1));
    base.sort((a, b) => a.depth - b.depth);
    for (const d of base) R3D_SAFE('ground item', d.draw);
    for (const [n, f] of [['telegraph', drawTelegraph], ['impactFx', drawImpactFx], ['rocks', drawRocks], ['rangerGround', drawRangerGround], ['eliteGround', drawEliteGround], ['meteors', drawMeteors], ['lichFx', drawLichFx], ['warriorFx', drawWarriorFx]]) R3D_SAFE(n, f);
  }
  // the skill effects the game still paints itself (lightning, frost, slam waves, chains, rings, the portal, exit marks):
  // painted into the frame buffer as before, then handed to the 3D layer, which draws them soft and glowing in the scene
  if (!R3D_TP) {   // (these are painted for the overhead view; world mode draws its own marks in the scene)
    R3D_SAFE('exitPads', drawExitPads);
    if (G.tp) R3D_SAFE('portal', drawPortal);
    R3D_SAFE('eliteFx', drawEliteFx);
    R3D_SAFE('impactFlashes', drawImpactFlashes);
  }
  if (R && R.ready) { R.frame(false); ov32.fill(0); }
  else { ov32.fill(0xff06070a); }
  drawHudLayer();
};
