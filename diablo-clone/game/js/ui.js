'use strict';
// HUD, inventory, overlays, touch/keyboard input and the main loop. The UI is drawn in the same
// palette into the frame after lighting (unlit), with the 3x5 pixel font from core.js.

function put(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) out32[y * W + x] = PAL32[c]; }
function fillRect(x0, y0, w, h, c) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y, c); }
function frame(x0, y0, w, h, c0 = 6, c1 = 3) {
  for (let x = x0; x < x0 + w; x++) { put(x, y0, c0); put(x, y0 + h - 1, c1); }
  for (let y = y0; y < y0 + h; y++) { put(x0, y, c0); put(x0 + w - 1, y, c1); }
}
function text(s, x, y, col, z = 1, shadow = true) {
  s = String(s).toUpperCase();
  for (let n = 0; n < s.length; n++) {
    const g = FONT[s[n]] || FONT['?'];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '1') {
      for (let a = 0; a < z; a++) for (let b = 0; b < z; b++) {
        const px = x + (n * 4 + c) * z + b, py = y + r * z + a;
        if (shadow) put(px + 1, py + 1, BLK);
        put(px, py, col);
      }
    }
  }
}
const textC = (s, cx, y, col, z = 1) => text(s, Math.round(cx - textWidth(String(s), z) / 2), y, col, z);
function sprite(sp, x, y, z = 1, L = 4) {
  for (let yy = 0; yy < sp.h; yy++) for (let xx = 0; xx < sp.w; xx++) {
    const v = sp.data[yy * sp.w + xx]; if (!v) continue;
    const c = (v & EMIS) ? v & 127 : LTAB[L][v];
    for (let a = 0; a < z; a++) for (let b = 0; b < z; b++) put(x + (xx - sp.ax) * z + b, y + (yy - sp.ay) * z + a, c);
  }
}

// ---------------------------------------------------------------- layout
const UI = {};
function uiResize() {
  UI.orbL = [34, H - 34]; UI.orbR = [W - 34, H - 34]; UI.orbR0 = 24;
  UI.attack = [W - 48, H - 100, 21]; UI.skill = [W - 96, H - 72, 13]; UI.potion = [W / 2, H - 22, 12];
  UI.bag = [W - 15, 15, 11]; UI.map = [W - 40, 15, 11];
  UI.stickHome = [52, H - 104];
}
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const press = { attack: null, skill: false };
let showMap = false;
const hitCircle = (p, c, pad = 4) => Math.hypot(p[0] - c[0], p[1] - c[1]) <= c[2] + pad;

// orbs are cached per fill step and wave step (they redraw thousands of pixels otherwise)
const orbCache = new Map();
let orbScratch = null;
function drawOrb(cx, cy, r, ramp, fill, t) {
  const key = `${cx},${cy},${ramp[0]},${Math.round(clamp(fill, 0, 1) * 48)},${Math.floor(t / 0.12) % 26}`;
  let px = orbCache.get(key);
  if (!px) {
    if (orbCache.size > 600) orbCache.clear();
    px = []; const target = out32;
    if (!orbScratch || orbScratch.length !== W * H) orbScratch = new Uint32Array(W * H);
    const tmp = orbScratch, Y0 = Math.floor(cy - r - 14), Y1 = Math.ceil(cy + r + 6), X0 = Math.floor(cx - r - 6), X1 = Math.ceil(cx + r + 6);
    for (let y = Math.max(0, Y0); y <= Math.min(H - 1, Y1); y++) tmp.fill(0, y * W + Math.max(0, X0), y * W + Math.min(W, X1 + 1));
    out32 = tmp;
    drawOrbRaw(cx, cy, r, ramp, Math.round(clamp(fill, 0, 1) * 48) / 48, Math.floor(t / 0.12) * 0.12);
    out32 = target;
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { if (x < 0 || y < 0 || x >= W || y >= H) continue; const v = tmp[y * W + x]; if (v) px.push(y * W + x, v); }
    orbCache.set(key, px);
  }
  for (let i = 0; i < px.length; i += 2) out32[px[i]] = px[i + 1];
}
function drawOrbRaw(cx, cy, r, ramp, fill, t) {
  for (const s of [-1, 1]) for (let k = 0; k < 7; k++) {
    const x = cx + s * (r * 0.62 + k * 0.7), y = cy - r * 0.78 - k * 1.1 - (k > 4 ? (k - 4) * 0.6 : 0), wd = Math.max(0, 2 - k * 0.3);
    for (let a = -wd - 1; a <= wd + 1; a++) put(x + a, y, BLK);
    for (let a = -wd; a <= wd; a++) put(x + a, y, a < 0 ? S[6] : S[4]);
  }
  const R1 = r + 4;
  for (let y = Math.floor(cy - R1 - 1); y <= cy + R1 + 1; y++) for (let x = Math.floor(cx - R1 - 1); x <= cx + R1 + 1; x++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d > R1 + 1) continue;
    if (d > R1) { put(x, y, BLK); continue; }
    if (d > r + 0.5) {
      const ang = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI) * 14, lit = (-dx - dy) / d;
      let tone = 4 + (lit > 0.35 ? 2 : lit < -0.35 ? -1 : 0);
      if (ang - Math.floor(ang) < 0.1) tone = 1;
      if (d > R1 - 0.8) tone -= 1;
      if (Math.abs(d - (r + 2.3)) < 0.9 && (ang % 3.5) < 0.6) { put(x, y, lit > 0 ? BONE[1] : BONE[0]); continue; }
      put(x, y, S[clamp(tone, 0, 8)]); continue;
    }
    if (d > r - 0.5) { put(x, y, BLK); continue; }
    const nx = dx / r, ny = dy / r, surf = cy + r - 2 * r * fill + Math.sin(x * 0.35 + t * 2.5) * 0.8;
    const bay = BAYER[((y & 3) << 2) | (x & 3)];
    if (y < surf) put(x, y, (-nx - ny) * 0.5 + bay * 0.5 > 0.65 ? K2 : K1);
    else {
      const l = -0.45 * nx - 0.55 * ny + 0.75 * Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      put(x, y, y < surf + 1 ? ramp[3] : ramp[clamp(Math.floor(l * 3 + bay - 0.1), 0, 3)]);
    }
    if ((nx + 0.36) ** 2 + (ny + 0.42) ** 2 < 0.03 || (nx + 0.1) ** 2 + (ny + 0.62) ** 2 < 0.006) put(x, y, 27);
  }
}
function drawButton(c, ramp, active, glyph) {
  const [cx, cy, r] = c;
  for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d > r + 1.5) continue;
    if (d > r) { put(x, y, BLK); continue; }
    if (d > r - 2) { put(x, y, (-dx - dy) > 0 ? S[6] : S[3]); continue; }
    const l = (-dx - dy) / r * 0.5 + BAYER[((y & 3) << 2) | (x & 3)] * 0.6 + (active ? 0.6 : 0);
    put(x, y, ramp[clamp(Math.floor(l + 1), 0, ramp.length - 1)]);
  }
  if (glyph) glyph(cx, cy, r);
}
// a little sword / star / bag / map glyph for the buttons, drawn with lines
function line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1; for (let s = 0; s <= n; s++) put(x0 + (x1 - x0) * s / n, y0 + (y1 - y0) * s / n, c); }
const glyphSword = (cx, cy) => { for (let k = -1; k <= 1; k++) line(cx - 8 + k, cy + 8, cx + 8 + k, cy - 8, k ? 31 : 27); line(cx - 6, cy + 2, cx - 2, cy + 6, 50); line(cx - 9, cy + 9, cx - 6, cy + 6, 35); };
const glyphBolt = (cx, cy) => { for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; line(cx, cy, cx + Math.cos(t) * 7, cy + Math.sin(t) * 7, a % 2 ? 50 : 51); } put(cx, cy, 27); };
const glyphBag = (cx, cy) => { fillRect(cx - 5, cy - 3, 11, 9, 35); frame(cx - 5, cy - 3, 11, 9, 36, 33); line(cx - 3, cy - 3, cx - 1, cy - 6, 36); line(cx + 3, cy - 3, cx + 1, cy - 6, 36); fillRect(cx - 1, cy, 3, 2, 50); };
const glyphMap = (cx, cy) => { fillRect(cx - 6, cy - 5, 13, 11, 26); frame(cx - 6, cy - 5, 13, 11, 27, 24); line(cx - 4, cy + 3, cx - 1, cy - 1, 22); line(cx - 1, cy - 1, cx + 4, cy + 2, 22); put(cx + 4, cy - 3, 22); };

function drawHud() {
  const t = G.t;
  if (G.mode === 'title') return drawTitle();
  // minimap (automap of explored tiles)
  if (showMap) drawAutomap();
  drawOrb(UI.orbL[0], UI.orbL[1], UI.orbR0, [19, 20, 22, 23], hero.hp / STAT.maxHp, t);
  drawOrb(UI.orbR[0], UI.orbR[1], UI.orbR0, [37, 38, 39, 40], hero.mana / STAT.maxMana, t + 1);
  textC(`${Math.ceil(hero.hp)}`, UI.orbL[0], UI.orbL[1] - 2, 27);
  textC(`${Math.floor(hero.mana)}`, UI.orbR[0], UI.orbR[1] - 2, 27);
  // xp bar between the orbs
  const x0 = 66, x1 = W - 66, yb = H - 6, f = hero.xp / xpFor(hero.lvl);
  for (let x = x0; x <= x1; x++) { put(x, yb - 1, BLK); put(x, yb + 1, BLK); put(x, yb, x - x0 < (x1 - x0) * f ? 50 : 3); }
  textC(`LV ${hero.lvl}`, W / 2, yb - 8, 25);
  drawButton(UI.potion, [19, 20, 21, 22], false, (cx, cy) => { sprite(itemIcon({ base: 'heal' }), cx, cy + 4, 1, 4); });
  text(`${hero.potions}`, UI.potion[0] + 9, UI.potion[1] + 4, 27);
  drawButton(UI.attack, [28, 29, 30, 31], !!press.attack, glyphSword);
  drawButton(UI.skill, [48, 49, 50, 51], press.skill, glyphBolt);
  drawButton(UI.bag, [33, 34, 35], false, glyphBag);
  drawButton(UI.map, [4, 5, 6, 7], showMap, glyphMap);
  // movement stick: floating where the thumb lands, ghosted at home otherwise
  const [sx, sy] = stick.id !== null ? [stick.ox, stick.oy] : UI.stickHome;
  for (let a = 0; a < 48; a++) { const t2 = a / 48 * 6.283; put(sx + Math.cos(t2) * 20, sy + Math.sin(t2) * 20, a % 2 ? 30 : 29); }
  if (stick.id !== null) {
    const kx = stick.x, ky = stick.y;
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const d = Math.hypot(x, y); if (d <= 6) put(kx + x, ky + y, d > 5 ? 28 : (-x - y) > 2 ? 31 : 30); }
  }
  // top line: level and gold
  text(`CRYPT ${LV.level}`, 4, 4, 26);
  text(`${hero.gold} GOLD`, 4, 11, 50);
  // floor item labels near the hero (Diablo shows names over loot)
  for (const g of groundItems) {
    if (g.gold || Math.hypot(g.fi - hero.fi, g.fj - hero.fj) > 5) continue;
    const [x, y] = iso(g.fi, g.fj), sx2 = Math.round(x - camX), sy2 = Math.round(y - camY) - 14;
    if (!LV.vis[tIdx(Math.floor(g.fi), Math.floor(g.fj))]) continue;
    const name = itemName(g.item);
    textC(name, sx2, sy2, RARITY_COL[g.item.rarity]);
  }
  // floating damage numbers
  for (const fl of floaters) {
    const sx2 = Math.round(fl.x - camX), sy2 = Math.round(fl.y - camY);
    if (fl.t < 0.3 && BAYER[(sx2 & 3) + ((sy2 & 3) << 2)] > fl.t / 0.3) continue;
    textC(fl.text, sx2, sy2, fl.col);
  }
  G.msg.forEach((m, n) => textC(m.text, W / 2, 34 + n * 8, m.col));
  if (hero.dead > 1.2) {
    textC('YOU HAVE DIED', W / 2, H * 0.32, 22, 2);
    if (hero.dead > 2) textC('TAP TO RISE AGAIN', W / 2, H * 0.32 + 18, 26);
  }
  if (G.mode === 'inv') drawInventory();
  if (G.paused) { fade(0.6); textC('PAUSED', W / 2, H * 0.4, 26, 2); textC('TAP TO RESUME', W / 2, H * 0.4 + 16, 25); }
  if (G.fade > 0) fade(G.fade);
  if (params.get('fps') === '1') text(`${fpsShown} FPS ${spriteBuilds} SPR`, 4, 20, 31);
}
function fade(a) {
  for (let y = 0, o = 0; y < H; y++) for (let x = 0; x < W; x++, o++) if (BAYER[((y & 3) << 2) | (x & 3)] < a) out32[o] = PAL32[BLK];
}
function drawAutomap() {
  const s = 3, ox = W / 2, oy = 70;
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    const k = tIdx(i, j); if (!LV.seen[k] || LV.map[k] !== WALL) continue;
    const x = ox + (i - j) * s - (hero.fi - hero.fj) * s, y = oy + (i + j) * s / 2 - (hero.fi + hero.fj) * s / 2;
    put(x, y, LV.vis[k] > 0 ? 26 : 25); put(x + 1, y, 25);
  }
  const st = LV.stairs;
  if (LV.seen[tIdx(st.i, st.j)]) { const x = ox + (st.i - st.j) * s - (hero.fi - hero.fj) * s, y = oy + (st.i + st.j) * s / 2 - (hero.fi + hero.fj) * s / 2; fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, 40); }
  fillRect(Math.round(ox) - 1, Math.round(oy) - 1, 3, 3, 23);
}
function drawTitle() {
  fade(0.55);
  textC('DUNGEON', W / 2, H * 0.2, 22, 4);
  textC('OF BONES', W / 2, H * 0.2 + 26, 26, 2);
  const save = loadSave();
  UI.titleBtns = [];
  const btn = (label, y, on) => { const w = 120, x = W / 2 - w / 2; fillRect(x, y, w, 20, 5); frame(x, y, w, 20, 8, 2); textC(label, W / 2, y + 7, 27); UI.titleBtns.push({ x, y, w, h: 20, on }); };
  if (save) btn(`CONTINUE (CRYPT ${save.level})`, H * 0.52, () => beginGame(true));
  btn('NEW GAME', H * 0.52 + 28, () => beginGame(false));
  textC('LEFT THUMB MOVES. RIGHT BUTTONS FIGHT.', W / 2, H * 0.78, 25);
  textC('ALL ART IS DRAWN IN CODE', W / 2, H * 0.78 + 8, 24);
}

// ---------------------------------------------------------------- inventory
const INV = { sel: null };   // {item, from: 'bag'|'equip', slot}
const SLOTS = ['helm', 'chest', 'weapon', 'shield'];
function invLayout() {
  const L = { slots: {}, bag: [], btns: [] };
  SLOTS.forEach((s, n) => L.slots[s] = { x: 14, y: 30 + n * 34, w: 30, h: 30 });
  for (let n = 0; n < BAG_SIZE; n++) L.bag.push({ x: 15 + (n % 6) * 41, y: 176 + Math.floor(n / 6) * 34, w: 34, h: 30 });
  L.close = { x: W - 30, y: 6, w: 24, h: 14 };
  L.color = { x: W - 66, y: 150, w: 54, h: 14 };
  return L;
}
function drawInventory() {
  fillRect(0, 0, W, H, 2);
  for (let y = 0; y < H; y += 2) for (let x = (y >> 1) & 1; x < W; x += 4) put(x, y, 3);
  const L = invLayout();
  textC('INVENTORY', W / 2, 8, 26, 2);
  frame(L.close.x, L.close.y, L.close.w, L.close.h, 8, 3); textC('X', L.close.x + 12, L.close.y + 5, 27);
  // paper doll: the real hero sprite at 2x, so gear changes show here too
  const doll = getSprite('hero', hero.look, 1, 'idle', Math.floor(G.t / 0.2) % 4, hero);
  sprite(doll, 150, 148, 2, 4);
  const nm = { helm: 'HEAD', chest: 'BODY', weapon: 'HAND', shield: 'OFF' };
  for (const s of SLOTS) {
    const r = L.slots[s], it = hero.equip[s];
    fillRect(r.x, r.y, r.w, r.h, 4); frame(r.x, r.y, r.w, r.h, INV.sel && INV.sel.slot === s ? 51 : 8, 3);
    if (it) sprite(itemIcon(it), r.x + 15, r.y + 21, 1, 4); else textC(nm[s], r.x + 15, r.y + 13, 6);
    if (it) put(r.x + 2, r.y + 2, RARITY_COL[it.rarity]);
  }
  text(`DMG ${STAT.dmg[0]}-${STAT.dmg[1]}`, 54, 34, 26); text(`ARMOR ${STAT.armor}`, 54, 42, 26);
  text(`LIFE ${STAT.maxHp}`, 54, 50, 22); text(`MANA ${STAT.maxMana}`, 54, 58, 39);
  text(`LEVEL ${hero.lvl}`, 54, 66, 51); text(`GOLD ${hero.gold}`, 54, 74, 50);
  frame(L.color.x, L.color.y, L.color.w, L.color.h, 8, 3); textC('COLOR', L.color.x + 27, L.color.y + 5, hero.team === 'red' ? 22 : 39);
  L.bag.forEach((r, n) => {
    const it = hero.bag[n];
    fillRect(r.x, r.y, r.w, r.h, 4); frame(r.x, r.y, r.w, r.h, INV.sel && INV.sel.item === it && it ? 51 : 6, 3);
    if (it) { sprite(itemIcon(it), r.x + 17, r.y + 21, 1, 4); put(r.x + 2, r.y + 2, RARITY_COL[it.rarity]); put(r.x + 3, r.y + 2, RARITY_COL[it.rarity]); }
  });
  // detail panel
  const py = 176 + 3 * 34 + 6;
  if (INV.sel && INV.sel.item) {
    const it = INV.sel.item, b = ITEM_BASES[it.base];
    text(itemName(it), 12, py, RARITY_COL[it.rarity]);
    itemLines(it).forEach((l, n) => text(l, 12, py + 9 + n * 7, 25));
    const cur = INV.sel.from === 'bag' ? hero.equip[b.slot] : null;
    if (cur) text(`WORN: ${itemName(cur)}`, 12, py + 9 + 7 * itemLines(it).length + 3, 24);
    L.btns = [];
    const bw = 70, by = Math.min(H - 26, py + 64);
    const mk = (label, x, on) => { fillRect(x, by, bw, 18, 5); frame(x, by, bw, 18, 8, 2); textC(label, x + bw / 2, by + 6, 27); L.btns.push({ x, y: by, w: bw, h: 18, on }); };
    if (INV.sel.from === 'bag') mk('EQUIP', 12, () => { equipItem(it); INV.sel = null; });
    else mk('REMOVE', 12, () => { unequip(INV.sel.slot); INV.sel = null; });
    mk('DROP', 92, () => {
      if (INV.sel.from === 'bag') hero.bag.splice(hero.bag.indexOf(it), 1); else { hero.equip[INV.sel.slot] = null; recalcHero(); }
      groundItems.push({ item: it, fi: hero.fi + 0.4, fj: hero.fj + 0.4, t: 0 }); INV.sel = null;
    });
    UI.invBtns = L.btns;
  } else { textC('TAP AN ITEM', W / 2, py + 6, 24); UI.invBtns = []; }
}
const inRect = (p, r) => p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h;
function invTap(p) {
  const L = invLayout();
  for (const b of UI.invBtns || []) if (inRect(p, b)) { b.on(); return; }
  if (inRect(p, L.close)) { G.mode = 'play'; INV.sel = null; return; }
  if (inRect(p, L.color)) { hero.team = hero.team === 'red' ? 'blue' : 'red'; recalcHero(); prewarmHero(); return; }
  for (const s of SLOTS) if (inRect(p, L.slots[s])) { INV.sel = hero.equip[s] ? { item: hero.equip[s], from: 'equip', slot: s } : null; return; }
  for (let n = 0; n < L.bag.length; n++) if (inRect(p, L.bag[n])) { INV.sel = hero.bag[n] ? { item: hero.bag[n], from: 'bag' } : null; return; }
}

// ---------------------------------------------------------------- input
function toNative(e) { const r = cvs.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
function capture(e) { try { cvs.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or already-ended pointer */ } }
function clearInput() { stick.id = null; input.mx = input.my = 0; input.attack = false; press.attack = null; press.skill = false; input.keys.clear(); }
cvs.addEventListener('pointerdown', e => {
  e.preventDefault();
  const p = toNative(e);
  if (G.paused) { G.paused = false; last = performance.now(); return; }
  if (G.mode === 'title') { for (const b of UI.titleBtns || []) if (inRect(p, b)) b.on(); return; }
  if (G.mode === 'inv') { invTap(p); return; }
  if (hero.dead > 2) { respawn(); return; }
  if (hitCircle(p, UI.bag)) { G.mode = 'inv'; clearInput(); return; }
  if (hitCircle(p, UI.map)) { showMap = !showMap; return; }
  if (hitCircle(p, UI.potion)) { drinkPotion(); return; }
  if (hitCircle(p, UI.skill, 6)) { press.skill = true; heroCast(); return; }
  if (hitCircle(p, UI.attack, 10) || (p[0] > W * 0.55 && p[1] > H * 0.3)) { press.attack = e.pointerId; input.attack = true; heroAttack(); capture(e); return; }
  if (p[0] < W * 0.55 && stick.id === null) { stick.id = e.pointerId; stick.ox = p[0]; stick.oy = p[1]; stick.x = p[0]; stick.y = p[1]; capture(e); }
}, { passive: false });
cvs.addEventListener('pointermove', e => {
  if (e.pointerId !== stick.id) return;
  const [x, y] = toNative(e);
  let dx = x - stick.ox, dy = y - stick.oy; const l = Math.hypot(dx, dy), R = 20;
  if (l > R) { stick.ox += dx * (1 - R / l); stick.oy += dy * (1 - R / l); dx = x - stick.ox; dy = y - stick.oy; }
  stick.x = x; stick.y = y; input.mx = dx / R; input.my = dy / R;
});
const endPointer = e => {
  if (e.pointerId === stick.id) { stick.id = null; input.mx = input.my = 0; }
  if (e.pointerId === press.attack) { press.attack = null; input.attack = false; }
  press.skill = false;
};
cvs.addEventListener('pointerup', endPointer);
cvs.addEventListener('pointercancel', endPointer);
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (G.mode === 'title' && (k === 'enter' || k === ' ')) { beginGame(!!loadSave()); return; }
  input.keys.add(k);
  if (k === ' ' || k === 'j') input.attack = true;
  if (k === 'k') heroCast();
  if (k === 'q') drinkPotion();
  if (k === 'i' || k === 'b') { G.mode = G.mode === 'inv' ? 'play' : 'inv'; INV.sel = null; }
  if (k === 'm' || k === 'tab') showMap = !showMap;
  if (k === 'c') { hero.team = hero.team === 'red' ? 'blue' : 'red'; recalcHero(); prewarmHero(); }
  if (k === 'escape' && G.mode === 'inv') G.mode = 'play';
  if (hero.dead > 2 && k === 'enter') respawn();
  if (k.startsWith('arrow') || k === ' ' || k === 'tab') e.preventDefault();
});
addEventListener('keyup', e => { const k = e.key.toLowerCase(); input.keys.delete(k); if (k === ' ' || k === 'j') input.attack = false; });
// backgrounding: pause, drop held input, save (the OS may kill a hidden tab)
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); if (G.mode !== 'title') { G.paused = true; saveGame(); } } });
addEventListener('blur', clearInput);
addEventListener('pagehide', saveGame);

// ---------------------------------------------------------------- loop
function fitCanvas() {
  const aspect = innerHeight / Math.max(1, innerWidth);
  const h = clamp(Math.round(270 * aspect), 420, 600);
  if (h !== H || !scr) allocBuffers(270, h);
  let s = Math.min(innerWidth / W, innerHeight / H);
  if (s >= 2) s = Math.floor(s);
  cvs.style.width = (W * s) + 'px'; cvs.style.height = (H * s) + 'px';
}
let last = performance.now(), fpsN = 0, fpsT = 0, fpsShown = 0;
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  fpsN++; fpsT += dt; if (fpsT > 1) { fpsShown = fpsN; fpsN = 0; fpsT = 0; }
  update(dt);
  warmStep(G.mode === 'play' ? 2 : 10);
  if (G.mode === 'title' && !LV.rooms.length) titleScene();
  render();
  requestAnimationFrame(tick);
}
// the title screen shows a real level behind it
function titleScene() { newHero(); startLevel(1, 4242); G.msg = []; }
addEventListener('resize', fitCanvas);
fitCanvas();
requestAnimationFrame(tick);
