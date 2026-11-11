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
  R3D_SAFE('exitPads', drawExitPads);
  if (G.tp) R3D_SAFE('portal', drawPortal);
  R3D_SAFE('eliteFx', drawEliteFx);
  R3D_SAFE('impactFlashes', drawImpactFlashes);
  if (R && R.ready) { R.frame(false); ov32.fill(0); }
  else { ov32.fill(0xff06070a); }
  drawHudLayer();
};
