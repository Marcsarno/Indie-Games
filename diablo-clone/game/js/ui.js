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
  UI.attack = [W - 48, H - 100, 21]; UI.skills = [[W - 96, H - 70, 12], [W - 104, H - 110, 12], [W - 88, H - 146, 12], [W - 50, H - 158, 12]]; UI.potion = [W / 2, H - 22, 12];
  UI.bag = [W - 15, 15, 11]; UI.map = [W - 40, 15, 11]; UI.sound = [W - 65, 15, 11]; UI.portal = [W - 90, 15, 11];
  UI.stickHome = [52, H - 104];
}
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const press = { attack: null, skill: -1 };
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
const glyphBash = (cx, cy) => { for (let y = -5; y <= 5; y++) { const hw = y < 2 ? 4 : 4 - (y - 1) * 1.2; for (let x = -hw; x <= hw; x++) put(cx + x, cy + y, Math.abs(x) > hw - 1.2 || y === -5 ? 50 : 22); } };
const glyphWhirl = (cx, cy) => { for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 3.2, r = 1.5 + a * 0.16; put(cx + Math.cos(t) * r, cy + Math.sin(t) * r * 0.9, a > 30 ? 27 : 31); } };
const glyphCry = (cx, cy) => { for (const r of [3, 5.5, 8]) for (let a = -0.7; a <= 0.7; a += 0.12) put(cx - 3 + Math.cos(a) * r, cy + Math.sin(a) * r, r > 6 ? 49 : 51); fillRect(cx - 6, cy - 2, 3, 5, 27); };
const glyphFire = (cx, cy) => { for (let y = -6; y <= 5; y++) { const hw = y > 1 ? 5 - (y - 1) * 0.9 : (y + 7) * 0.62; for (let x = -hw; x <= hw; x++) put(cx + x, cy + y, Math.abs(x) < hw * 0.45 && y > -2 ? 18 : y < -3 ? 15 : 16); } };
const glyphFrost = (cx, cy) => { for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3; line(cx, cy, cx + Math.cos(t) * 7, cy + Math.sin(t) * 7, 118); line(cx + Math.cos(t) * 4, cy + Math.sin(t) * 4, cx + Math.cos(t + 0.5) * 5.5, cy + Math.sin(t + 0.5) * 5.5, 117); } put(cx, cy, 27); };
const glyphMeteor = (cx, cy) => { for (let k = 0; k < 7; k++) line(cx - 8 + k * 0.4, cy - 8 + k, cx + 1, cy + 1, k < 3 ? 15 : 16); for (let b = -3; b <= 3; b++) for (let a = -3; a <= 3; a++) if (a * a + b * b <= 9) put(cx + 2 + a, cy + 2 + b, a * a + b * b <= 2 ? 18 : 17); };
const glyphMissile = (cx, cy) => { for (const [ox, oy] of [[-5, 4], [0, -1], [5, -6]]) { line(cx + ox - 5, cy + oy + 5, cx + ox, cy + oy, 39); for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (a * a + b * b <= 1) put(cx + ox + a, cy + oy + b, a || b ? 40 : 27); } };
const SKILL_GLYPH = [null, glyphBash, glyphWhirl, glyphCry];
// per skill: button ramp and glyph (the warrior's by slot, the mage's by spell)
const glyphCone = (cx, cy) => { for (let k = 0; k < 9; k++) { const a = -0.55 + k * 0.1375; line(cx - 7, cy + 6, cx - 7 + Math.cos(a - 0.785) * 15, cy + 6 + Math.sin(a - 0.785) * 15, k % 2 ? 117 : 118); } put(cx - 7, cy + 6, 27); };
const glyphBlink = (cx, cy) => { for (let b = -3; b <= 3; b++) for (let a = -3; a <= 3; a++) if (a * a + b * b <= 9) put(cx + 3 + a, cy - 3 + b, a * a + b * b <= 2 ? 27 : 40); for (let k = 0; k < 4; k++) put(cx - 3 - k * 1.6, cy + 3 + k * 1.6, k % 2 ? 39 : 40); for (const [a, b] of [[-6, -1], [0, 5], [-2, -5]]) put(cx + a, cy + b, 39); };
const glyphSlam = (cx, cy) => {   // a weapon driven into cracked ground
  line(cx - 1, cy - 8, cx + 1, cy + 1, 31); line(cx, cy - 8, cx + 2, cy + 1, 27); fillRect(cx - 3, cy - 6, 7, 2, 50);
  for (const [a, b] of [[-7, 6], [-3, 7], [3, 7], [7, 6]]) line(cx + 1, cy + 3, cx + a, cy + b, 16);
  line(cx - 8, cy + 4, cx + 9, cy + 4, 35);
};
const glyphHook = (cx, cy) => {   // a chain running up to a barbed hook
  for (let k = 0; k < 4; k++) { const x = cx - 7 + k * 2.2, y = cy + 7 - k * 2.2; put(x, y, 31); put(x + 1, y, 29); }
  line(cx + 1, cy - 7, cx + 1, cy + 2, 27); line(cx + 2, cy - 7, cx + 2, cy + 2, 31);   // shank
  for (let a = 0; a <= 12; a++) { const t = Math.PI * a / 12; put(cx + 4.5 - Math.cos(t) * 3.5, cy + 2 + Math.sin(t) * 3.2, 27); put(cx + 4.5 - Math.cos(t) * 2.5, cy + 2 + Math.sin(t) * 2.4, 31); }   // the bend
  line(cx + 8, cy + 2, cx + 7, cy - 1, 27); line(cx + 8, cy + 2, cx + 6, cy + 1, 27);   // barb
  fillRect(cx, cy - 8, 4, 2, 50);   // the ring the chain hangs from
};
const glyphLeap = (cx, cy) => {   // an arc up and down, landing in a burst
  for (let a = 0; a <= 16; a++) { const u = a / 16; put(cx - 7 + u * 12, cy + 4 - Math.sin(u * Math.PI) * 10, a > 12 ? 51 : 27); }
  for (const [a, b] of [[-3, 0], [3, 0], [0, -3], [2, -2], [-2, -2]]) line(cx + 5, cy + 5, cx + 5 + a, cy + 5 + b, 50);
};
const SPELL_LOOK = { slam: [[13, 14, 15, 16], glyphSlam], hook: [[28, 29, 30, 31], glyphHook], whirl: [[19, 20, 21, 22], glyphWhirl], leap: [[48, 49, 50, 51], glyphLeap], fireball: [[13, 14, 15, 16], glyphFire], cone: [[114, 115, 116, 117], glyphCone], meteor: [[19, 20, 21, 22], glyphMeteor], blink: [[56, 57, 58, 59], glyphBlink] };
const glyphBolt = (cx, cy) => { for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; line(cx, cy, cx + Math.cos(t) * 7, cy + Math.sin(t) * 7, a % 2 ? 50 : 51); } put(cx, cy, 27); };
const glyphBag = (cx, cy) => { fillRect(cx - 5, cy - 3, 11, 9, 35); frame(cx - 5, cy - 3, 11, 9, 36, 33); line(cx - 3, cy - 3, cx - 1, cy - 6, 36); line(cx + 3, cy - 3, cx + 1, cy - 6, 36); fillRect(cx - 1, cy, 3, 2, 50); };
const glyphSound = (cx, cy) => {
  fillRect(cx - 5, cy - 2, 3, 5, 26); for (let k = 0; k < 4; k++) line(cx - 2 + k, cy - 2 - k, cx - 2 + k, cy + 2 + k, 26);
  if (SFX.muted) { line(cx + 3, cy - 3, cx + 7, cy + 3, 22); line(cx + 7, cy - 3, cx + 3, cy + 3, 22); }
  else { line(cx + 4, cy - 2, cx + 4, cy + 2, 25); line(cx + 6, cy - 4, cx + 6, cy + 4, 24); }
};
// a small upright blue oval: the town portal
const glyphPortal = (cx, cy) => { for (let y = -7; y <= 7; y++) for (let x = -5; x <= 5; x++) { const d = (x / 4.6) ** 2 + (y / 6.6) ** 2; if (d <= 1) put(cx + x, cy + y, d > 0.6 ? 40 : d > 0.25 ? 39 : 27); } };
const glyphMap = (cx, cy) => { fillRect(cx - 6, cy - 5, 13, 11, 26); frame(cx - 6, cy - 5, 13, 11, 27, 24); line(cx - 4, cy + 3, cx - 1, cy - 1, 22); line(cx - 1, cy - 1, cx + 4, cy + 2, 22); put(cx + 4, cy - 3, 22); };

function drawHud() {
  drawNpcLabels(); drawQuestTracker();
  // a boss's title card when it first wakes: a dark band slides open with its name and epithet
  if (G.actCard > 0 && G.mode === 'play') {   // entering an act: ACT II / THE BURNING DEEP / the town's name
    const t = 3.2 - G.actCard, open = Math.min(1, t / 0.3, G.actCard / 0.4), cy = Math.round(H * 0.3), hh = Math.round(30 * open);
    for (let y = cy - hh; y < cy + hh; y++) for (let x = 0; x < W; x++) if (BAYER[((y & 3) << 2) | (x & 3)] < 0.8) put(x, y, BLK);
    if (open > 0.8) { textC(actTitle(), W / 2, cy - 20, 26); textC(ACTS[LV.act].name, W / 2, cy - 9, 51, 2); textC(areaName(), W / 2, cy + 12, 25); }
  }
  if (G.bossIntro > 0 && boss) {
    const t = 2.8 - G.bossIntro, open = Math.min(1, t / 0.25, G.bossIntro / 0.35), cy = Math.round(H * 0.3), hh = Math.round(22 * open);
    for (let y = cy - hh; y < cy + hh; y++) for (let x = 0; x < W; x++) if (BAYER[((y & 3) << 2) | (x & 3)] < 0.75) put(x, y, BLK);
    if (open > 0.8) { textC(boss.def.name, W / 2, cy - 11, 22, 2); if (boss.def.title) textC(boss.def.title, W / 2, cy + 6, 26); }
  }
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
  if (hero.cls === 'mage') drawButton(UI.attack, [37, 38, 39, 40], !!press.attack, glyphMissile);   // magic missiles
  else drawButton(UI.attack, [28, 29, 30, 31], !!press.attack, glyphSword);
  SKILLS.forEach((sk, i) => {
    const fx = btnFx(i), dtu = 1 / 60;
    if (fx.cd > 0 && CD[sk.id] <= 0) fx.ready = 0.3;   // just came off cooldown
    fx.cd = CD[sk.id]; fx.press = Math.max(0, fx.press - dtu); fx.ready = Math.max(0, fx.ready - dtu); fx.deny = Math.max(0, fx.deny - dtu);
    const c0 = UI.skills[i], shake = fx.deny > 0 ? Math.round(Math.sin(fx.deny * 70) * 2) : 0;
    const c = [c0[0] + shake, c0[1], c0[2] + (fx.press > 0.08 ? 1 : 0)], locked = hero.lvl < sk.lvl;
    const sl = SPELL_LOOK[sk.id];
    drawButton(c, locked ? [3, 4, 5] : sl ? sl[0] : [[48, 49, 50, 51], [19, 20, 21, 22], [28, 29, 30, 31], [33, 34, 35, 36]][i], press.skill === i, sl ? sl[1] : i ? SKILL_GLYPH[i] : glyphBolt);
    // cooldown: the button darkens from the top and clears as it recharges; locked buttons stay dark
    const f = locked ? 1 : CD[sk.id] / sk.cd, low = !locked && hero.mana < skillCost(sk);
    if (f > 0 || low) for (let y = c[1] - c[2]; y <= c[1] + c[2]; y++) for (let x = c[0] - c[2]; x <= c[0] + c[2]; x++) {
      if (Math.hypot(x - c[0], y - c[1]) > c[2] - 1) continue;
      const covered = (y - (c[1] - c[2])) / (2 * c[2]) < f;
      if ((covered && BAYER[((y & 3) << 2) | (x & 3)] < 0.7) || (low && ((x + y) & 1))) put(x, y, K1);
    }
    if (locked) textC(`LV${sk.lvl}`, c[0], c[1] - 2, 25);
    // a bright rim: white as it fires or comes ready, red when there is no mana for it
    const rim = fx.deny > 0 ? 22 : fx.press > 0 || fx.ready > 0 ? 27 : 0;
    if (rim && (fx.deny > 0 || fx.press > 0 || Math.floor(fx.ready * 20) % 2 === 0)) for (let a = 0; a < 64; a++) { const t = a / 64 * 6.283; put(c[0] + Math.cos(t) * (c[2] + 1), c[1] + Math.sin(t) * (c[2] + 1), rim); }
  });
  if (hero.buff > 0) textC(`WAR CRY ${Math.ceil(hero.buff)}`, W / 2, H - 46, 51);
  if (hero.frenzy > 0) textC(`FRENZY ${Math.ceil(hero.frenzy)}`, W / 2, H - 54, 23);
  if (hero.stoneskin > 0) textC(`STONESKIN ${Math.ceil(hero.stoneskin)}`, W / 2, H - 62, 39);
  // the boss's health bar, once she is awake
  if (bossAlive() && boss.state !== 'sleep') {
    const bw = 150, bx = Math.round(W / 2 - bw / 2), by = 24, f = boss.hp / boss.maxHp;
    textC(boss.def.name, W / 2, by - 8, 22);
    fillRect(bx - 1, by - 1, bw + 2, 6, BLK);
    for (let x = 0; x < bw; x++) for (let y = 0; y < 4; y++) put(bx + x, by + y, x < bw * f ? (y === 0 ? 23 : y === 3 ? 20 : 22) : 3);
  }
  // champion names over their heads
  const champs = enemies.filter(e => (e.champ || e.def.treasure || e.def.elite) && alive(e) && LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] >= 0.5 && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 7)
    .sort((a, b) => Math.hypot(a.fi - hero.fi, a.fj - hero.fj) - Math.hypot(b.fi - hero.fi, b.fj - hero.fj)).slice(0, 2);   // the two nearest, so labels never pile up
  for (const e of champs) {
    const [x, y] = iso(e.fi, e.fj);
    textC(e.champ ? e.name : e.def.name, Math.round(x - camX), Math.round(y - camY) - e.def.chest * 1.6 - 20, e.champ ? { red: 23, grey: 31, green: 55, purple: 59 }[e.champ.tint] : 51);
  }
  drawButton(UI.bag, [33, 34, 35], false, glyphBag);
  drawButton(UI.map, [4, 5, 6, 7], showMap, glyphMap);
  drawButton(UI.sound, [4, 5, 6, 7], false, glyphSound);
  drawButton(UI.portal, LV.area === 'town' && !G.portal ? [4, 5, 6, 7] : [37, 38, 39], !!G.tp, glyphPortal);
  // movement stick: floating where the thumb lands, ghosted at home otherwise
  const [sx, sy] = stick.id !== null ? [stick.ox, stick.oy] : UI.stickHome;
  for (let a = 0; a < 48; a++) { const t2 = a / 48 * 6.283; put(sx + Math.cos(t2) * 20, sy + Math.sin(t2) * 20, a % 2 ? 30 : 29); }
  if (stick.id !== null) {
    const kx = stick.x, ky = stick.y;
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const d = Math.hypot(x, y); if (d <= 6) put(kx + x, ky + y, d > 5 ? 28 : (-x - y) > 2 ? 31 : 30); }
  }
  // top line: level and gold
  text(areaName(), 4, 4, 26);
  text(`${hero.gold} GOLD`, 4, 11, 50);
  // floor item labels near the hero (Diablo shows names over loot)
  // item labels stack upward instead of overlapping (Diablo does the same)
  const placed = [];
  for (const g of groundItems.filter(g => !g.gold && !g.gem && Math.hypot(g.fi - hero.fi, g.fj - hero.fj) <= 5 && LV.vis[tIdx(Math.floor(g.fi), Math.floor(g.fj))]).sort((a, b) => b.fi + b.fj - a.fi - a.fj)) {
    const [x, y] = iso(g.fi, g.fj), name = itemName(g.item), w = textWidth(name);
    let sx2 = Math.round(x - camX), sy2 = Math.round(y - camY) - 14;
    for (let tries = 0; tries < 6 && placed.some(r => Math.abs(r[0] - sx2) * 2 < r[2] + w + 4 && Math.abs(r[1] - sy2) < 7); tries++) sy2 -= 7;
    placed.push([sx2, sy2, w]);
    textC(name, sx2, sy2, RARITY_COL[g.item.rarity]);
  }
  // floating damage numbers
  for (const fl of floaters) {
    const sx2 = Math.round(fl.x - camX), sy2 = Math.round(fl.y - camY);
    if (fl.t < 0.3 && BAYER[(sx2 & 3) + ((sy2 & 3) << 2)] > fl.t / 0.3) continue;
    textC(fl.text, sx2, sy2, fl.col, fl.size || 1);
  }
  // kill streak banner
  if (G.streakShow && G.streakShow.t > 0) {
    const n = G.streakShow.n, word = n >= 10 ? 'MASSACRE' : n >= 6 ? 'RAMPAGE' : 'KILL STREAK';
    if (G.streakShow.t > 0.3 || BAYER[0] < G.streakShow.t / 0.3) { textC(`${n}`, W / 2, H * 0.2, 51, 3); textC(word, W / 2, H * 0.2 + 18, n >= 6 ? 23 : 50, 1); }
  }
  G.msg.forEach((m, n) => textC(m.text, W / 2, 34 + n * 8, m.col));
  if (hero.dead > 1.2) {
    textC('YOU HAVE DIED', W / 2, H * 0.32, 22, 2);
    if (hero.dead > 2) textC('TAP TO RISE AGAIN', W / 2, H * 0.32 + 18, 26);
  }
  if (G.mode === 'inv') drawInventory();
  if (G.mode === 'skills') drawSkills();
  if (G.paused) { fade(0.6); textC('PAUSED', W / 2, H * 0.4, 26, 2); textC('TAP TO RESUME', W / 2, H * 0.4 + 16, 25); }
  if (G.fade > 0) fade(G.fade);
  if (params.get('fps') === '1') text(`${fpsShown} FPS ${spriteBuilds} SPR`, 4, 20, 31);
}
function fade(a) {
  for (let y = 0, o = 0; y < H; y++) for (let x = 0; x < W; x++, o++) if (BAYER[((y & 3) << 2) | (x & 3)] < a) out32[o] = PAL32[BLK];
}
function drawAutomap() {
  const s = 3, ox = W / 2, oy = 70;
  if (LV.outdoor) {   // outdoors: woods, paths, water, the way on and the boss, over a darkened view
    fade(0.5);
    const at = (i, j) => [Math.round(ox + (i - j) * s - (hero.fi - hero.fj) * s), Math.round(oy + (i + j) * s / 2 - (hero.fi + hero.fj) * s / 2)];
    for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
      const [x, y] = at(i, j); if (x < 0 || y < 0 || x >= W - 1 || y >= H) continue;
      const pd = Math.min(pondD(i + 0.5, j + 0.5), riverD(i + 0.5, j + 0.5) < 0 && pathD(i + 0.5, j + 0.5) >= 0.35 ? 0 : 9), col = pd < 1 ? 117 : pathD(i + 0.5, j + 0.5) < 0.1 ? 102 : LV.solid[tIdx(i, j)] ? 95 : 88;
      fillRect(x - 1, y, 3, 2, col);
    }
    const [sx, sy] = at(LV.stairs.i, LV.stairs.j); fillRect(sx - 1, sy - 1, 3, 3, 40);
    if (bossAlive()) { const [bx, by] = at(boss.fi, boss.fj); fillRect(bx - 1, by - 1, 3, 3, 22); }
    fillRect(Math.round(ox) - 1, Math.round(oy) - 1, 3, 3, 123 | 0);
    textC('N', W / 2, 40, 51); for (let k = 0; k < 4; k++) fillRect(W / 2 - k, 48 + k, 1 + 2 * k, 1, 51);   // north is up
    return;
  }
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
  UI.titleBtns = [];
  const btn = (label, x, y, w, on, col = 27) => { fillRect(x, y, w, 20, 5); frame(x, y, w, 20, 8, 2); textC(label, x + w / 2, y + 7, col); UI.titleBtns.push({ x, y, w, h: 20, on }); };
  // one column per class: continue its save (if any) or start a new one
  [['warrior', 'WARRIOR', 22], ['mage', 'MAGE', 40]].forEach(([cls, name, col], k) => {
    const x = W / 2 - 124 + k * 128, w = 120, save = loadSave(cls);
    textC(name, x + w / 2, H * 0.47, col, 2);
    if (save) btn(`CONTINUE (LEVEL ${save.level})`, x, H * 0.52, w, () => beginGame(true, cls));
    btn(save ? 'NEW ' + name : 'NEW GAME', x, H * 0.52 + 28, w, () => beginGame(false, cls));
  });
  btn(FEEL_OLD ? 'COMBAT: OLD' : 'COMBAT: NEW', W / 2 - 124, H * 0.52 + 62, 120, () => setFeelOld(!FEEL_OLD), 25);
  btn(WORLD2X ? 'DETAIL: SHARP' : 'DETAIL: CLASSIC', W / 2 + 4, H * 0.52 + 62, 120, () => setWorld2x(!WORLD2X), 25);
  btn(HUE_LIGHT ? 'LIGHT: NEW' : 'LIGHT: OLD', W / 2 - 60, H * 0.52 + 88, 120, () => setLightNew(!HUE_LIGHT), 25);
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
  L.skills = { x: W - 66, y: 130, w: 54, h: 14 };
  return L;
}
function drawInventory() {
  fillRect(0, 0, W, H, 2);
  for (let y = 0; y < H; y += 2) for (let x = (y >> 1) & 1; x < W; x += 4) put(x, y, 3);
  const L = invLayout();
  textC('INVENTORY', W / 2, 8, 26, 2);
  frame(L.close.x, L.close.y, L.close.w, L.close.h, 8, 3); textC('X', L.close.x + 12, L.close.y + 5, 27);
  fillRect(L.skills.x, L.skills.y, L.skills.w, L.skills.h, 5); frame(L.skills.x, L.skills.y, L.skills.w, L.skills.h, 8, 3); textC('SKILLS', L.skills.x + L.skills.w / 2, L.skills.y + 5, 51);
  // paper doll: the real hero sprite at 2x, so gear changes show here too
  const doll = getSprite('hero', hero.look, 1, 'idle', Math.floor(G.t / 0.2) % 4, hero, 1);
  sprite(doll, 150, 148, 2, 4);
  const nm = { helm: 'HEAD', chest: 'BODY', weapon: 'HAND', shield: 'OFF' };
  for (const s of SLOTS) {
    const r = L.slots[s], it = hero.equip[s];
    const special = it && (it.rarity === 'legend' || it.rarity === 'set') ? RARITY_COL[it.rarity] : 8;
    fillRect(r.x, r.y, r.w, r.h, 4); frame(r.x, r.y, r.w, r.h, INV.sel && INV.sel.slot === s ? 51 : special, 3);
    if (it) sprite(itemIcon(it), r.x + 15, r.y + 21, 1, 4); else textC(nm[s], r.x + 15, r.y + 13, 6);
    if (it) put(r.x + 2, r.y + 2, RARITY_COL[it.rarity]);
  }
  text(`DMG ${STAT.dmg[0]}-${STAT.dmg[1]}`, 54, 34, 26); text(`ARMOR ${STAT.armor}`, 54, 42, 26);
  text(`LIFE ${STAT.maxHp}`, 54, 50, 22); text(`MANA ${STAT.maxMana}`, 54, 58, 39);
  text(`LEVEL ${hero.lvl}`, 54, 66, 51); text(`GOLD ${hero.gold}`, 54, 74, 50);
  frame(L.color.x, L.color.y, L.color.w, L.color.h, 8, 3); textC('COLOR', L.color.x + 27, L.color.y + 5, hero.team === 'red' ? 22 : 39);
  L.bag.forEach((r, n) => {
    const it = hero.bag[n];
    // legendaries and set pieces get a border in their color so they stand out in the bag
    const special = it && (it.rarity === 'legend' || it.rarity === 'set') ? RARITY_COL[it.rarity] : 6;
    fillRect(r.x, r.y, r.w, r.h, 4); frame(r.x, r.y, r.w, r.h, INV.sel && INV.sel.item === it && it ? 51 : special, 3);
    if (it) {
      sprite(itemIcon(it), r.x + 17, r.y + 21, 1, 4); put(r.x + 2, r.y + 2, RARITY_COL[it.rarity]); put(r.x + 3, r.y + 2, RARITY_COL[it.rarity]);
      const b = ITEM_BASES[it.base], cur = hero.equip[b.slot];
      if (b.slot !== 'potion' && (!cur || itemScore(it) > itemScore(cur) + 0.5)) for (let k = 0; k < 3; k++) for (let x = -k; x <= k; x++) put(r.x + r.w - 6 + x, r.y + 3 + k, 55);   // upgrade arrow
    }
  });
  // detail panel
  const py = 176 + 3 * 34 + 6;
  if (INV.sel && INV.sel.item) {
    const it = INV.sel.item, b = ITEM_BASES[it.base];
    text(itemName(it), 12, py, RARITY_COL[it.rarity]);
    itemLines(it).forEach((l, n) => text(l, 12, py + 9 + n * 7, 25));
    const cur = INV.sel.from === 'bag' ? hero.equip[b.slot] : null;
    if (cur) {   // what equipping it would change, against what is worn now
      const y0 = py + 9 + 7 * itemLines(it).length + 3;
      text(`VS ${itemName(cur)}`, 12, y0, 24);
      compareLines(it, cur).forEach(([l, c], n) => text(l, 130, py + 9 + n * 7, c));
    }
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
  if (inRect(p, L.skills)) { G.mode = 'skills'; SKV.sel = null; return; }
  if (inRect(p, L.color)) { hero.team = hero.team === 'red' ? 'blue' : 'red'; recalcHero(); prewarmHero(); return; }
  for (const s of SLOTS) if (inRect(p, L.slots[s])) { INV.sel = hero.equip[s] ? { item: hero.equip[s], from: 'equip', slot: s } : null; return; }
  for (let n = 0; n < L.bag.length; n++) if (inRect(p, L.bag[n])) { INV.sel = hero.bag[n] ? { item: hero.bag[n], from: 'bag' } : null; return; }
}

// ---------------------------------------------------------------- skills screen (round 29)
// one row per skill: its name, then its three modifiers; tap one to choose it (tap again for none).
// Locked ones show the level they open at. The chosen one's line describes it.
const SKV = { sel: null };
function skillsLayout() {
  const L = { close: { x: W - 30, y: 6, w: 24, h: 14 }, rows: [] };
  SKILLS.forEach((sk, n) => { const y = 40 + n * 74; L.rows.push({ sk, y, chips: [0, 1, 2].map(k => ({ k, x: 8 + k * 87, y: y + 14, w: 82, h: 22 })) }); });
  return L;
}
function drawSkills() {
  fillRect(0, 0, W, H, 2);
  for (let y = 0; y < H; y += 2) for (let x = (y >> 1) & 1; x < W; x += 4) put(x, y, 3);
  const L = skillsLayout();
  textC('SKILLS', W / 2, 8, 26, 2);
  frame(L.close.x, L.close.y, L.close.w, L.close.h, 8, 3); textC('X', L.close.x + 12, L.close.y + 5, 27);
  for (const row of L.rows) {
    const sk = row.sk, mods = SKILL_MODS[sk.id], cur = hero.mods && hero.mods[sk.id], open = hero.lvl >= sk.lvl;
    text(sk.name + (open ? '' : `  (LEVEL ${sk.lvl})`), 8, row.y, open ? 51 : 25);
    if (!mods) { text('MODIFIERS COMING SOON', 8, row.y + 20, 24); continue; }
    for (const c of row.chips) {
      const m = mods[c.k], lv = modUnlock(sk.id, c.k), unlocked = hero.lvl >= lv, on = cur === m.id;
      fillRect(c.x, c.y, c.w, c.h, on ? 38 : unlocked ? 5 : 3); frame(c.x, c.y, c.w, c.h, on ? 40 : 8, on ? 37 : 3);
      textC(m.name, c.x + c.w / 2, c.y + 4, unlocked ? (on ? 27 : 26) : 24);
      textC(unlocked ? (on ? 'CHOSEN' : 'TAP TO CHOOSE') : `LEVEL ${lv}`, c.x + c.w / 2, c.y + 13, on ? 51 : 24);
    }
    const show = SKV.sel && SKV.sel.id === sk.id ? mods[SKV.sel.k] : cur ? mods.find(m => m.id === cur) : null;
    if (show) text(show.desc, 8, row.y + 42, 25);
  }
}
function skillsTap(p) {
  const L = skillsLayout();
  if (inRect(p, L.close)) { G.mode = 'inv'; return; }
  for (const row of L.rows) for (const c of row.chips) {
    if (!inRect(p, c) || !SKILL_MODS[row.sk.id]) continue;
    const m = SKILL_MODS[row.sk.id][c.k]; SKV.sel = { id: row.sk.id, k: c.k };
    if (hero.lvl < modUnlock(row.sk.id, c.k)) { sfx('tap'); return; }
    hero.mods = hero.mods || {}; hero.mods[row.sk.id] = hero.mods[row.sk.id] === m.id ? null : m.id; const m0 = G.mode; G.mode = 'play'; saveGame(); G.mode = m0; return;
  }
}

// ---------------------------------------------------------------- input
function toNative(e) { const r = cvs.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
function capture(e) { try { cvs.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or already-ended pointer */ } }
function clearInput() { stick.id = null; input.mx = input.my = 0; input.attack = false; press.attack = null; press.skill = -1; input.keys.clear(); }
cvs.addEventListener('pointerdown', e => {
  e.preventDefault();
  audioInit();
  const p = toNative(e);
  if (G.paused) { G.paused = false; last = performance.now(); return; }
  if (G.mode === 'title') { for (const b of UI.titleBtns || []) if (inRect(p, b)) { sfx('tap'); b.on(); } return; }
  if (G.mode === 'inv') { sfx('tap'); invTap(p); return; }
  if (G.mode === 'skills') { sfx('tap'); skillsTap(p); return; }
  if (hero.dead > 2) { respawn(); return; }
  if (hitCircle(p, UI.bag)) { G.mode = 'inv'; clearInput(); return; }
  if (hitCircle(p, UI.sound)) { setMuted(!SFX.muted); sfx('tap'); return; }
  if (hitCircle(p, UI.map)) { showMap = !showMap; return; }
  if (hitCircle(p, UI.portal)) { usePortal(); return; }
  if (hitCircle(p, UI.potion)) { drinkPotion(); return; }
  for (let i = 0; i < UI.skills.length; i++) if (hitCircle(p, UI.skills[i], 5)) { press.skill = i; useSkill(i); return; }
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
  press.skill = -1;
};
cvs.addEventListener('pointerup', endPointer);
cvs.addEventListener('pointercancel', endPointer);
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  audioInit();
  if (k === 'n') setMuted(!SFX.muted);
  if (G.mode === 'title' && (k === 'enter' || k === ' ')) { beginGame(!!loadSave()); return; }
  input.keys.add(k);
  if (k === ' ' || k === 'j') input.attack = true;
  if (k === 'k' || k === '1') useSkill(0);
  if (k === '2' || k === 'l') useSkill(1);
  if (k === '3') useSkill(2);
  if (k === '4') useSkill(3);
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
  // fit the stage element when the page provides one (an embedded frame may pad the window)
  const st = document.getElementById('stage'), vw = st ? st.clientWidth : innerWidth, vh = st ? st.clientHeight : innerHeight;
  const aspect = vh / Math.max(1, vw);
  const h = clamp(Math.round(270 * aspect), 420, 600);
  if (h !== H || !scr) allocBuffers(270, h);
  let s = Math.min(vw / W, vh / H);
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
if (typeof ResizeObserver !== 'undefined' && document.getElementById('stage')) new ResizeObserver(fitCanvas).observe(document.getElementById('stage'));
fitCanvas();
requestAnimationFrame(tick);
