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

// the ultimate's button (round 31): fills from the bottom as it charges; full, it glows and its rim pulses
function drawUltButton() {
  const U = ULTS[hero.cls]; if (!U) return;
  const fx = btnFx(9), dtu = 1 / 60; fx.press = Math.max(0, fx.press - dtu); fx.deny = Math.max(0, fx.deny - dtu);
  const c0 = UI.ult, shake = fx.deny > 0 ? Math.round(Math.sin(fx.deny * 70) * 2) : 0, c = [c0[0] + shake, c0[1], c0[2] + (fx.press > 0.08 ? 1 : 0)];
  const locked = hero.lvl < ULT_LVL, f = locked ? 0 : (hero.ult || 0) / 100, full = f >= 1;
  drawButton(c, locked ? [3, 4, 5] : hero.cls === 'mage' ? [37, 38, 39, 40] : hero.cls === 'ranger' ? [52, 53, 54, 55] : [48, 49, 50, 51], full || !!hero.ultOn || G.rain.length > 0, hero.cls === 'mage' ? glyphStorm : hero.cls === 'ranger' ? (x, y) => glyphRain(x, y) : glyphWrath);
  // not yet charged: dark from the top down to the charge line
  if (!full) for (let y = c[1] - c[2]; y <= c[1] + c[2]; y++) for (let x = c[0] - c[2]; x <= c[0] + c[2]; x++) {
    if (Math.hypot(x - c[0], y - c[1]) > c[2] - 1) continue;
    const covered = (c[1] + c[2] - y) / (2 * c[2]) > f;
    if (covered && BAYER[((y & 3) << 2) | (x & 3)] < 0.75) put(x, y, K1);
  }
  if (locked) textC(`LV${ULT_LVL}`, c[0], c[1] - 2, 25);
  // a ring around it showing the charge, gold (arcane for the mage), and a pulsing rim when full
  const col = hero.cls === 'mage' ? 40 : hero.cls === 'ranger' ? 55 : 51;
  if (!locked) for (let a = 0; a < 80; a++) { const u = a / 80, t = -Math.PI / 2 + u * 6.283; if (u > f) continue; put(c[0] + Math.cos(t) * (c[2] + 2), c[1] + Math.sin(t) * (c[2] + 2), col); }
  if (full && Math.floor(G.t * 4) % 2 === 0) for (let a = 0; a < 80; a++) { const t = a / 80 * 6.283; put(c[0] + Math.cos(t) * (c[2] + 3), c[1] + Math.sin(t) * (c[2] + 3), 27); }
  if (fx.deny > 0) for (let a = 0; a < 64; a++) { const t = a / 64 * 6.283; put(c[0] + Math.cos(t) * (c[2] + 1), c[1] + Math.sin(t) * (c[2] + 1), 22); }
}
// round 32: health and mana (fury for the warrior) as two thin bars at the bottom left, the
// numbers at their ends, the level above, a hairline of xp along the very bottom. Below 30% health
// the health bar pulses and the screen's edge glows red.
function vitalBar(x, y, w, f, ramp, label, pulse) {
  fillRect(x - 1, y - 1, w + 2, 7, BLK);
  for (let xx = 0; xx < w; xx++) for (let yy = 0; yy < 5; yy++) {
    const on = xx < Math.round(w * Math.max(0, Math.min(1, f)));
    put(x + xx, y + yy, on ? (yy === 0 ? ramp[3] : yy === 4 ? ramp[0] : pulse && ((xx + yy) & 1) ? ramp[3] : ramp[yy === 1 ? 2 : 1]) : yy === 0 ? 4 : 3);
  }
  for (let k = 1; k < 4; k++) put(x + Math.round(w * k / 4), y + 4, BLK);   // quarter ticks
  text(label, x + w + 4, y, 27);
}
function drawVitals(t) {
  const B = UI.bars, hf = hero.hp / STAT.maxHp, low = hf < 0.3, beat = low && Math.sin(t * 9) > 0;
  text(`LV ${hero.lvl}`, B.x, B.yH - 9, 25);
  vitalBar(B.x, B.yH, B.w, hf, [20, 21, 22, 23], `${Math.ceil(hero.hp)}`, beat);
  vitalBar(B.x, B.yM, B.w, hero.mana / STAT.maxMana, hero.cls === 'mage' ? [37, 38, 39, 40] : hero.cls === 'ranger' ? [52, 53, 54, 55] : [14, 15, 16, 17], `${Math.floor(hero.mana)}`, false);
  const f = hero.xp / xpFor(hero.lvl), yb = H - 3;
  for (let x = 0; x < W; x++) { put(x, yb, x < W * f ? 50 : BLK); put(x, yb + 1, BLK); }
  if (low && !hero.dead) {   // the edge of the screen glows red with the heartbeat
    const a = 0.6 + 0.3 * Math.sin(t * 9);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const e = Math.min(x, y, W - 1 - x, H - 1 - y); if (e > 14) { x = Math.max(x, W - 16); continue; }
      if (BAYER[((y & 3) << 2) | (x & 3)] < a * (1 - e / 15) ** 1.5) put(x, y, e < 3 ? 23 : 22);
    }
  }
}
// ---------------------------------------------------------------- layout
const UI = {};
function uiResize() {
  // round 32: Diablo Immortal-style thumbs. The attack sits in the bottom-right corner, the four
  // skills fan round it on one arc (left to straight up), the ultimate on an outer ring between
  // them, the potion at the arc's foot; health and mana are thin bars along the bottom left
  UI.attack = [W - 38, H - 44, 23];
  const ARC = 60; UI.skills = [180, 210, 240, 270].map(a => [Math.round(UI.attack[0] + Math.cos(a * Math.PI / 180) * ARC), Math.round(UI.attack[1] + Math.sin(a * Math.PI / 180) * ARC), 12]);
  UI.ult = [Math.round(UI.attack[0] + Math.cos(225 * Math.PI / 180) * 98), Math.round(UI.attack[1] + Math.sin(225 * Math.PI / 180) * 98), 13];
  UI.potion = [UI.skills[0][0] - 36, H - 44, 11];
  UI.bars = { x: 8, w: 96, yH: H - 24, yM: H - 16 };
  UI.bag = [W - 15, 15, 11]; UI.map = [W - 40, 15, 11]; UI.sound = [W - 65, 15, 11]; UI.portal = [W - 90, 15, 11];
  UI.stickHome = [56, H - 100];
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
const SPELL_LOOK = { multi: [[33, 34, 35, 36], (x, y) => glyphMulti(x, y)], trap: [[28, 29, 30, 31], (x, y) => glyphTrap(x, y)], roll: [[52, 53, 54, 55], (x, y) => glyphRoll(x, y)], mark: [[19, 20, 21, 22], (x, y) => glyphMark(x, y)], slam: [[13, 14, 15, 16], glyphSlam], hook: [[28, 29, 30, 31], glyphHook], whirl: [[19, 20, 21, 22], glyphWhirl], leap: [[48, 49, 50, 51], glyphLeap], fireball: [[13, 14, 15, 16], glyphFire], cone: [[114, 115, 116, 117], glyphCone], meteor: [[19, 20, 21, 22], glyphMeteor], blink: [[56, 57, 58, 59], glyphBlink] };
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
  if (PREVIEW) { pvHud(); return; }
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
  drawVitals(t);
  drawButton(UI.potion, [19, 20, 21, 22], false, (cx, cy) => { sprite(itemIcon({ base: 'heal' }), cx, cy + 4, 1, 4); });
  text(`${hero.potions}`, UI.potion[0] + 9, UI.potion[1] + 4, 27);
  if (hero.cls === 'mage') drawButton(UI.attack, [37, 38, 39, 40], !!press.attack, glyphMissile);   // magic missiles
  else if (hero.cls === 'ranger') drawButton(UI.attack, [33, 34, 35, 36], !!press.attack, (x, y) => glyphBowAtk(x, y));   // arrows
  else drawButton(UI.attack, [28, 29, 30, 31], !!press.attack, glyphSword);
  drawActionButton();   // round 43b: talk, trade, free, unlock
  drawStoryMark();
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
  drawUltButton();
  if (hero.buff > 0) textC(`WAR CRY ${Math.ceil(hero.buff)}`, W / 2, H - 150, 51);
  if (hero.frenzy > 0) textC(`FRENZY ${Math.ceil(hero.frenzy)}`, W / 2, H - 158, 23);
  if (hero.stoneskin > 0) textC(`STONESKIN ${Math.ceil(hero.stoneskin)}`, W / 2, H - 166, 39);
  // the boss's health bar, once she is awake
  if (bossAlive() && boss.state !== 'sleep') {
    const bw = 150, bx = Math.round(W / 2 - bw / 2), by = 24, f = boss.hp / boss.maxHp;
    textC(boss.def.name, W / 2, by - 8, 22);
    fillRect(bx - 1, by - 1, bw + 2, 6, BLK);
    for (let x = 0; x < bw; x++) for (let y = 0; y < 4; y++) put(bx + x, by + y, x < bw * f ? (y === 0 ? 23 : y === 3 ? 20 : 22) : 3);
  }
  // champion names over their heads
  const champs = enemies.filter(e => (e.champ || e.def.treasure || e.def.elite) && alive(e) && LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] >= 0.5 && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 7)
    .sort((a, b) => Math.hypot(a.fi - hero.fi, a.fj - hero.fj) - Math.hypot(b.fi - hero.fi, b.fj - hero.fj)).slice(0, 1);   // round 39: only the nearest is named, so labels never pile up
  for (const e of champs) {
    const [x, y] = iso(e.fi, e.fj), sx = Math.round(x - camX), sy = Math.round(y - camY - e.def.chest * 1.6 - 14 * (e.look.scale || 1)) - 14;
    textC(e.champ ? e.name : e.def.name, sx, sy, e.champ ? { red: 23, grey: 31, green: 55, purple: 59 }[e.champ.tint] : 51);
    if (e.pw && !e.pwWeak) {   // its powers on the line below, each in its own color
      const names = powerLine(e), wsum = names.reduce((a, n) => a + textWidth(n), 0) + (names.length - 1) * 6;
      let px = Math.round(sx - wsum / 2);
      for (let k = 0; k < names.length; k++) { text(names[k], px, sy + 7, POWERS[e.pw[k]].col); px += textWidth(names[k]) + 6; if (k < names.length - 1) put(px - 4, sy + 9, 27); }
    }
  }
  drawEliteLabels(champs);
  drawButton(UI.bag, [33, 34, 35], false, glyphBag);
  { const [bx, by] = UI.bag;   // round 45: an upgrade waits in the bag (green arrow), something new (yellow), a new skill power (purple)
    const ups = bagUpgrades().length, bob = Math.round(Math.sin(G.t * 5) * 1.2);
    if (ups) badge(bx + 6, by + 11 + bob, 54, true); else if (modsUnseen()) badge(bx + 6, by + 11 + bob, 58, false); else if (hero.bag.some(it => it.isNew)) badge(bx + 6, by + 11, 50, false); }
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
  if (G.mode === 'talk') drawTalk();
  drawGuide();   // round 45
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
// round 41: the character screen. One card per class: its hero drawn big and slowly turning, its
// name, how it plays, its four skills and its saved level. Tap a card to pick it (gold frame, the
// hero swings, the others dim), then the big button starts: CONTINUE when that class has a save,
// else NEW GAME. START OVER asks for a second tap before it replaces a save. The developer
// settings sit behind OPTIONS.
const TITLE = { sel: null, looks: null, opts: false, eraseT: 0, pickT: 0 };
const CLASS_INFO = {
  warrior: { name: 'WARRIOR', col: 22, lines: ['BLADE AND ARMOR', 'FIGHTS UP CLOSE'] },
  mage: { name: 'MAGE', col: 40, lines: ['SPELLS FROM AFAR', 'FRAGILE, DEADLY'] },
  ranger: { name: 'RANGER', col: 55, lines: ['BOW AND TRAPS', 'QUICK AND NIMBLE'] },
};
function titlePick(cls) { if (TITLE.sel !== cls) { TITLE.sel = cls; TITLE.pickT = G.t; TITLE.eraseT = 0; try { localStorage.setItem('dcg-cls', cls); } catch (e) { /* ignore */ } } }
function drawTitle() {
  if (!TITLE.looks) {   // each class's starting look (the title's hero is a throwaway)
    TITLE.looks = {};
    for (const c of ['ranger', 'mage', 'warrior']) { newHero(c); TITLE.looks[c] = { ...hero.look }; }
    let last = null; try { last = localStorage.getItem('dcg-cls'); } catch (e) { /* ignore */ }
    TITLE.sel = CLASS_INFO[last] ? last : 'warrior';
  }
  fade(0.7);
  textC('DUNGEON', W / 2, 34, 22, 4);
  if (!MUS.unlocked && !SFX.muted && Math.floor(G.t * 1.5) % 3) textC('TAP ANYWHERE FOR MUSIC', W / 2, 12, 25);   // round 46b: phones stay silent until a tap
  textC('OF BONES', W / 2, 60, 26, 2);
  textC('CHOOSE YOUR HERO', W / 2, 86, 25);
  UI.titleBtns = [];
  const btn = (label, x, y, w, h, on, col = 27, bg = 5, edge = 8) => { fillRect(x, y, w, h, bg); frame(x, y, w, h, edge, 2); textC(label, x + w / 2, y + Math.floor(h / 2) - 2, col); UI.titleBtns.push({ x, y, w, h, on }); };
  const cw = 84, gap = 5, x0 = Math.round((W - cw * 3 - gap * 2) / 2), y0 = 98, ch = 196;
  const saved = budgetOff();
  ['warrior', 'mage', 'ranger'].forEach((cls, k) => {
    const info = CLASS_INFO[cls], x = x0 + k * (cw + gap), sel = TITLE.sel === cls, save = loadSave(cls), look = TITLE.looks[cls];
    fillRect(x, y0, cw, ch, sel ? 4 : 2); frame(x, y0, cw, ch, sel ? 51 : 6, sel ? 49 : 3);
    if (sel) frame(x - 1, y0 - 1, cw + 2, ch + 2, 50, 48);
    textC(info.name, x + cw / 2, y0 + 7, sel ? info.col : 25, 2);
    // the hero: turning slowly; once picked it faces you and swings
    const ent = { look, cls, combo: 0 };
    let sp;
    if (sel && G.t - TITLE.pickT < 1.6) {
      const bow = cls === 'ranger', list = weaponSwing(look, 0), tot = list.reduce((a, q) => a + q.ms, 0), ms = ((G.t - TITLE.pickT) * 1000) % (tot + 500);
      const f = ms < tot ? swingKey(list, ms) : -1;
      sp = f >= 0 ? getSprite('hero', look, 1, bow ? 'shoot' : 'attack', f, ent, 1) : getSprite('hero', look, 1, 'idle', Math.floor(G.t / 0.2) % 4, ent, 1);
    } else sp = getSprite('hero', look, sel ? 1 : Math.floor(G.t / 0.7 + k * 3) % 8, 'idle', Math.floor(G.t / 0.2) % 4, ent, 1);
    // a pool of light under the picked one
    if (sel) for (let yy = -5; yy <= 5; yy++) for (let xx = -26; xx <= 26; xx++) if ((xx / 26) ** 2 + (yy / 5) ** 2 <= 1 && ((xx + yy) & 1)) put(x + cw / 2 + xx, y0 + 112 + yy, 6);
    sprite(sp, x + cw / 2, y0 + 112, 2, sel ? 6 : 4);
    info.lines.forEach((l, n) => textC(l, x + cw / 2, y0 + 124 + n * 8, sel ? 26 : 24));
    // its four skills
    SKILLSETS[cls].forEach((sk, n) => { const sl = SPELL_LOOK[sk.id] || [[48, 49, 50, 51], glyphBolt]; drawButton([x + 12 + n * 20, y0 + 154, 8], sel ? sl[0] : [3, 4, 5, 6], false, sl[1]); });
    textC(save ? `SAVED: LEVEL ${save.hero ? save.hero.lvl : 1}` : 'NO SAVE YET', x + cw / 2, y0 + 172, save ? (sel ? 51 : 49) : 24);
    UI.titleBtns.push({ x, y: y0, w: cw, h: ch, on: () => titlePick(cls) });
  });
  budgetOn(saved);
  // start: continue the picked class's save, or begin it new
  const cls = TITLE.sel, save = loadSave(cls), info = CLASS_INFO[cls], by = y0 + ch + 14;
  btn(save ? `CONTINUE AS ${info.name}` : `NEW GAME AS ${info.name}`, W / 2 - 100, by, 200, 30, () => beginGame(!!save, cls), 51, 6, 51);
  if (save) btn(TITLE.eraseT > G.t ? 'TAP AGAIN: ERASE LEVEL ' + (save.hero ? save.hero.lvl : 1) : 'START OVER', W / 2 - 100, by + 36, 200, 18, () => { if (TITLE.eraseT > G.t) beginGame(false, cls); else TITLE.eraseT = G.t + 3; }, TITLE.eraseT > G.t ? 22 : 25);
  // the developer settings, folded away
  const oy = H - 56;
  btn(TITLE.opts ? 'OPTIONS  -' : 'OPTIONS  +', W / 2 - 40, oy, 80, 16, () => { TITLE.opts = !TITLE.opts; }, 25, 3, 6);
  if (TITLE.opts) {
    btn(FEEL_OLD ? 'COMBAT: OLD' : 'COMBAT: NEW', 6, oy - 22, 84, 16, () => setFeelOld(!FEEL_OLD), 25, 3, 6);
    btn(WORLD2X ? 'DETAIL: SHARP' : 'DETAIL: CLASSIC', 93, oy - 22, 84, 16, () => setWorld2x(!WORLD2X), 25, 3, 6);
    btn(HUE_LIGHT ? 'LIGHT: NEW' : 'LIGHT: OLD', 180, oy - 22, 84, 16, () => setLightNew(!HUE_LIGHT), 25, 3, 6);
    btn(SFX.synth ? 'SOUND: SYNTH' : 'SOUND: REAL', 180, oy, 84, 16, () => { setSynthSfx(!SFX.synth); sfx('hit'); }, 25, 3, 6);   // round 44: compare the recorded sounds with the old synth
  }
  textC('LEFT THUMB MOVES. RIGHT BUTTONS FIGHT.', W / 2, H - 32, 25);
  textC('ALL ART IS DRAWN IN CODE', W / 2, H - 24, 24);
  textC('SOUNDS: KENNEY, ARTISTICDUDE, RUBBERDUCK, QUBODUP,', W / 2, H - 15, 24);   // round 44: the sound packs' credits (sfx/CREDITS.md)
  textC('LITTLE ROBOT SOUND FACTORY, WILL LEAMON, BART + MORE', W / 2, H - 8, 24);
}
// round 42b: a small speech bubble (over the attack button when a tap would talk)
function talkBubble(x, y) {
  for (let b = -5; b <= 5; b++) for (let a = -8; a <= 8; a++) {
    const e = (a * a) / 64 + (b * b) / 25; if (e > 1.12) continue;
    put(x + a, y + b, e > 0.8 ? BLK : 27);
  }
  for (let k = 0; k < 3; k++) for (let a = 0; a <= 2 - k; a++) put(x - 4 + a - k, y + 5 + k, k === 2 - 0 ? BLK : 27);
  for (const a of [-4, 0, 4]) { put(x + a, y, 3); put(x + a + 1, y, 3); }
}
// the person under a tap (their body on screen), for walking over to talk
function npcAtScreen(p) {
  let best = null, bd = 1e9;
  for (const n of npcs) {
    if (!TRADER_ROLES[n.role] || n.leaving !== undefined) continue;
    const [x, y] = iso(n.fi, n.fj), sx = x - camX, sy = y - camY;
    if (p[0] < sx - 12 || p[0] > sx + 12 || p[1] < sy - 46 || p[1] > sy + 6) continue;
    const d = Math.hypot(p[0] - sx, p[1] - (sy - 20)); if (d < bd) { bd = d; best = n; }
  }
  return best;
}
// an arrowhead at the screen's edge pointing at an off-screen point (the stairs, the next goal)
function edgeArrow(sx, sy, c0 = 51, c1 = 50) {
  const X0 = 14, X1 = W - 14, Y0 = 40, Y1 = Math.round(H * 0.6);
  if (sx > X0 && sx < X1 && sy > Y0 && sy < Y1) return false;
  const cx = W / 2, cy = (Y0 + Y1) / 2, dx = sx - cx, dy = sy - cy;
  const k = Math.min((dx > 0 ? X1 - cx : cx - X0) / Math.abs(dx || 1e-6), (dy > 0 ? Y1 - cy : cy - Y0) / Math.abs(dy || 1e-6));
  const bob = Math.sin(G.t * 5) * 1.5, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const ax = cx + dx * k - ux * bob, ay = cy + dy * k - uy * bob;
  for (let b = -10; b <= 10; b++) for (let a = -10; a <= 10; a++) {
    const f = a * ux + b * uy, g = -a * uy + b * ux;
    if (f < -8 || f > 6) continue;
    const half = (6 - f) * 0.5;
    if (Math.abs(g) > half + 1) continue;
    put(Math.round(ax + a), Math.round(ay + b), Math.abs(g) > half || f < -7 ? BLK : (g < 0 ? c0 : c1));
  }
  return true;
}
// the story's next goal: an arrow at the edge while it is off screen (white, so it is not the stairs' gold)
function drawStoryMark() {
  if (G.mode !== 'play' || hero.dead) return;
  const t = storyTarget(); if (!t) return;
  if (LV.stairs && !LV.outdoor && Math.hypot(t[0] - LV.stairs.i - 0.5, t[1] - LV.stairs.j - 0.5) < 0.6) return;   // the stairs' own arrow already points there
  const [x, y] = iso(t[0], t[1]); edgeArrow(x - camX, y - camY - 16, 27, 26);
}
// round 43b: the action button, above the health bars at the bottom middle. It shows only when
// there is something to do in reach (talk, buy, sell, free Aldo, unlock the mine) and says what
const ACT_POS = () => [W / 2 - 16, H - 76];
function actionTarget() {
  if (G.mode !== 'play' || hero.dead || G.fadeTo) return null;
  const n = nearTrader();
  if (n) return { n, label: n.role === 'merchant' ? `BUY POTION ${potionPrice()}G` : n.role === 'smith' ? 'SELL LOOT' : n.role === 'aldo' && LV.side === 'den' && G.story && G.story.f.alphaDead && !G.story.f.aldoFree ? 'FREE ALDO' : 'TALK' };
  const m = mineAction(); if (m) return m;
  return null;
}
function doAction(a) {
  if (G.t < (hero.tradeT || 0)) return;
  hero.tradeT = G.t + 0.35; sfx('tap');
  if (a.n) trade(a.n); else a.go();
}
function drawActionButton() {
  UI.act = null;
  const a = actionTarget(); if (!a) return;
  const [cx, cy] = ACT_POS(), w = textWidth(a.label) + 26, h = 20, x = Math.round(cx - w / 2), y = Math.round(cy - h / 2), pulse = Math.floor(G.t * 3) % 2;
  UI.act = { x: x - 6, y: y - 6, w: w + 12, h: h + 12 };   // a forgiving hit area for thumbs
  fillRect(x, y, w, h, 5); frame(x, y, w, h, pulse ? 51 : 50, 3); frame(x + 1, y + 1, w - 2, h - 2, 4, 2);
  talkBubble(x + 11, y + 10);
  text(a.label, x + 21, y + 8, 27);
}
const budgetOff = () => { const s = buildBudget.ms; buildBudget.ms = Infinity; return s; };
const budgetOn = s => { buildBudget.ms = s; };

// ---------------------------------------------------------------- inventory
// round 45: GEAR and SKILLS tabs; big green/red arrows on what beats or loses to what is worn;
// the slot an item would go in glows; a card compares it side by side with the worn one; double
// tap or EQUIP to wear it, WEAR BEST to wear every upgrade; NEW on what was picked up since the
// bag was last open; the bag button in play shows an arrow when an upgrade waits.
const INV = { sel: null, tapT: 0, tapIt: null, flash: null };   // sel: {item, from: 'bag'|'equip', slot}
const SLOTS = ['helm', 'chest', 'weapon', 'shield', 'ring', 'amulet'];
const canWear = it => { const b = ITEM_BASES[it.base]; return b.slot !== 'potion' && forCls(b); };
// +1 better than worn (or the slot is empty), -1 worse, 0 about the same
function upgradeOf(it) {
  if (!canWear(it)) return 0;
  const cur = hero.equip[ITEM_BASES[it.base].slot];
  if (!cur) return 1;
  const d = itemScore(it) - itemScore(cur);
  return d > 0.5 ? 1 : d < -0.5 ? -1 : 0;
}
const bagUpgrades = () => hero.bag.filter(it => upgradeOf(it) > 0);
// the best wearable bag item for each slot that beats what is worn
function bestUpgrades() {
  const out = [];
  for (const s of SLOTS) {
    const cur = hero.equip[s];
    let best = null;
    for (const it of hero.bag) if (ITEM_BASES[it.base].slot === s && canWear(it) && (!best || itemScore(it) > itemScore(best))) best = it;
    if (best && (!cur || itemScore(best) > itemScore(cur) + 0.5)) out.push(best);
  }
  return out;
}
function wearBest() {
  const ups = bestUpgrades();
  for (const it of ups) equipItem(it);
  INV.sel = null; INV.flash = { text: ups.length ? `WORE ${ups.length} UPGRADE${ups.length > 1 ? 'S' : ''}` : 'NOTHING BETTER IN THE BAG', col: ups.length ? 55 : 24, t: G.t };
  if (ups.length) sfx('clink');
}
// skill modifiers that opened since the skills screen was last looked at
function modsUnseen() {
  let n = 0;
  for (const sk of skillsScreenList()) (SKILL_MODS[sk.id] || []).forEach((m, k) => { const lv = modUnlock(sk.id, k); if (lv <= hero.lvl && lv > (hero.modSeen || 0)) n++; });
  return n;
}
function openInv(tab = 'inv') { G.mode = tab; INV.sel = null; clearInput(); if (tab === 'skills') { SKV.sel = null; SKV.view = null; SKV.seen0 = hero.modSeen || 0; hero.modSeen = hero.lvl; } }
function closeInv() { G.mode = 'play'; INV.sel = null; for (const it of hero.bag) delete it.isNew; }
function invLayout() {
  const L = { slots: {}, bag: [], btns: [] };
  SLOTS.forEach((s, n) => L.slots[s] = n < 4 ? { x: 14, y: 30 + n * 34, w: 30, h: 30 } : { x: W - 44, y: 30 + (n - 4) * 34, w: 30, h: 30 });   // jewelry on the right (round 42a)
  for (let n = 0; n < BAG_SIZE; n++) L.bag.push({ x: 15 + (n % 6) * 41, y: 176 + Math.floor(n / 6) * 34, w: 34, h: 30 });
  L.close = { x: W - 30, y: 6, w: 24, h: 14 };
  L.tabs = { inv: { x: W / 2 - 64, y: 5, w: 62, h: 16 }, skills: { x: W / 2 + 2, y: 5, w: 62, h: 16 } };
  L.color = { x: W - 66, y: 150, w: 54, h: 14 };
  L.best = { x: W - 66, y: 130, w: 54, h: 14 };
  L.card = { x: 8, y: 282, w: W - 16, h: H - 290 };
  return L;
}
// the two tabs at the top of the bag and the skills screens, and the close button
function drawTabs(L, on) {
  for (const k of ['inv', 'skills']) {
    const r = L.tabs[k], sel = k === on;
    fillRect(r.x, r.y, r.w, r.h, sel ? 5 : 3); frame(r.x, r.y, r.w, r.h, sel ? 51 : 8, sel ? 50 : 3);
    textC(k === 'inv' ? 'GEAR' : 'SKILLS', r.x + r.w / 2, r.y + 6, sel ? 27 : 25);
    if (k === 'skills' && !sel && modsUnseen()) dot(r.x + r.w - 5, r.y + 4, 59);
    if (k === 'inv' && !sel && bagUpgrades().length) arrowUp(r.x + r.w - 6, r.y + 3, 55, 3);
  }
  frame(L.close.x, L.close.y, L.close.w, L.close.h, 8, 3); textC('X', L.close.x + 12, L.close.y + 5, 27);
}
// a round badge with a white up-arrow (or a plain colored dot)
function badge(cx, cy, c, arrow) { for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const d = Math.hypot(x, y); if (d <= 5.2) put(cx + x, cy + y, d > 4.2 ? BLK : (x + y < -2 ? c + 1 : c)); } if (arrow) { arrowUp(cx, cy - 3, 27, 3); fillRect(cx - 1, cy, 3, 3, 27); } else fillRect(cx - 1, cy - 1, 3, 3, 27); }
function dot(cx, cy, c) { for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { const d = x * x + y * y; if (d <= 5) put(cx + x, cy + y, d > 2 ? BLK : c); } }
// a solid arrow head n rows tall, tip at (x, y)
function arrowUp(x, y, c, n = 4) { for (let k = 0; k < n; k++) for (let d = -k; d <= k; d++) put(x + d, y + k, c); for (let d = -n; d <= n; d++) put(x + d, y + n, BLK); }
function arrowDown(x, y, c, n = 3) { for (let k = 0; k < n; k++) for (let d = -k; d <= k; d++) put(x + d, y - k, c); }
function drawInventory() {
  fillRect(0, 0, W, H, 2);
  for (let y = 0; y < H; y += 2) for (let x = (y >> 1) & 1; x < W; x += 4) put(x, y, 3);
  const L = invLayout(), pulse = Math.floor(G.t * 4) % 2;
  drawTabs(L, 'inv');
  // paper doll: the real hero sprite at 2x, so gear changes show here too
  const doll = getSprite('hero', hero.look, 1, 'idle', Math.floor(G.t / 0.2) % 4, hero, 1);
  sprite(doll, 150, 148, 2, 4);
  const nm = { helm: 'HEAD', chest: 'BODY', weapon: 'HAND', shield: 'OFF', ring: 'RING', amulet: 'NECK' };
  const target = INV.sel && INV.sel.from === 'bag' ? ITEM_BASES[INV.sel.item.base].slot : null;   // where the chosen bag item would go
  for (const s of SLOTS) {
    const r = L.slots[s], it = hero.equip[s];
    const special = it && (it.rarity === 'legend' || it.rarity === 'set') ? RARITY_COL[it.rarity] : 8;
    fillRect(r.x, r.y, r.w, r.h, 4);
    if (s === target) { frame(r.x - 2, r.y - 2, r.w + 4, r.h + 4, pulse ? 55 : 54, pulse ? 54 : 53); frame(r.x - 1, r.y - 1, r.w + 2, r.h + 2, 53, 53); }
    frame(r.x, r.y, r.w, r.h, INV.sel && INV.sel.slot === s ? 51 : special, 3);
    if (it) sprite(itemIcon(it), r.x + 15, r.y + 21, 1, 4); else textC(nm[s], r.x + 15, r.y + 13, 6);
    if (it) put(r.x + 2, r.y + 2, RARITY_COL[it.rarity]);
  }
  text(`DMG ${STAT.dmg[0]}-${STAT.dmg[1]}`, 54, 34, 26); text(`ARMOR ${STAT.armor}`, 54, 42, 26);
  text(`LIFE ${STAT.maxHp}`, 54, 50, 22); text(`MANA ${STAT.maxMana}`, 54, 58, 39);
  text(`LEVEL ${hero.lvl}`, 54, 66, 51); text(`GOLD ${hero.gold}`, 54, 74, 50);
  { const r = L.best, any = bestUpgrades().length > 0;   // lit green when the bag holds an upgrade
    fillRect(r.x, r.y, r.w, r.h, any ? 53 : 4); frame(r.x, r.y, r.w, r.h, any ? (pulse ? 55 : 54) : 8, 3); textC('WEAR BEST', r.x + r.w / 2, r.y + 5, any ? 27 : 24); }
  frame(L.color.x, L.color.y, L.color.w, L.color.h, 8, 3); textC('COLOR', L.color.x + 27, L.color.y + 5, hero.team === 'red' ? 22 : 39);
  L.bag.forEach((r, n) => {
    const it = hero.bag[n];
    // legendaries and set pieces get a border in their color so they stand out in the bag
    const special = it && (it.rarity === 'legend' || it.rarity === 'set') ? RARITY_COL[it.rarity] : 6;
    fillRect(r.x, r.y, r.w, r.h, 4); frame(r.x, r.y, r.w, r.h, INV.sel && INV.sel.item === it && it ? 51 : special, 3);
    if (!it) return;
    sprite(itemIcon(it), r.x + 17, r.y + 21, 1, 4);
    fillRect(r.x + 2, r.y + r.h - 3, 4, 1, RARITY_COL[it.rarity]);
    if (!canWear(it)) { if (ITEM_BASES[it.base].slot !== 'potion') for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1 + (y & 1); x < r.x + r.w - 1; x += 2) put(x, y, 3); return; }   // not for this class: greyed
    const u = upgradeOf(it);
    if (u > 0) arrowUp(r.x + r.w - 6, r.y + 3, 55, 4);
    else if (u < 0) arrowDown(r.x + r.w - 6, r.y + 5, 23, 3);
    if (it.isNew) text('NEW', r.x + 2, r.y + 2, 51);
  });
  // the detail card
  const C = L.card; L.btns = [];
  fillRect(C.x, C.y, C.w, C.h, 3); frame(C.x, C.y, C.w, C.h, 8, 4);
  const bw = 76, bh = 22, by = C.y + C.h - bh - 6;
  const mk = (label, x, on, lit) => { fillRect(x, by, bw, bh, lit ? 53 : 5); frame(x, by, bw, bh, lit ? (pulse ? 55 : 54) : 8, 2); textC(label, x + bw / 2, by + 8, 27); L.btns.push({ x, y: by, w: bw, h: bh, on, label }); };
  if (INV.sel && INV.sel.item) {
    const it = INV.sel.item, b = ITEM_BASES[it.base], fromBag = INV.sel.from === 'bag';
    const cur = fromBag && b.slot !== 'potion' ? hero.equip[b.slot] : null, u = fromBag ? upgradeOf(it) : 0;
    const col = C.w / 2 - 6, cut = s => s.length * 4 > col ? s.slice(0, Math.floor(col / 4)) : s;
    // the verdict on top
    let vy = C.y + 6;
    if (fromBag && !canWear(it)) textC(b.slot === 'potion' ? 'A POTION' : 'NOT FOR YOUR CLASS', W / 2, vy, 23);
    else if (fromBag) { const v = !cur ? 'EMPTY SLOT' : u > 0 ? 'UPGRADE' : u < 0 ? 'WORSE' : 'ABOUT THE SAME', vc = u > 0 ? 55 : u < 0 ? 23 : 25; textC(v, W / 2, vy, vc, 2); const hw = textWidth(v, 2) / 2; if (u > 0) { arrowUp(W / 2 - hw - 10, vy + 1, 55, 5); arrowUp(W / 2 + hw + 9, vy + 1, 55, 5); } else if (u < 0) { arrowDown(W / 2 - hw - 10, vy + 7, 23, 5); arrowDown(W / 2 + hw + 9, vy + 7, 23, 5); } }
    else textC('WORN', W / 2, vy, 25, 2);
    vy += 18;
    // this item on the left, the worn one on the right
    text(cut(itemName(it)), C.x + 6, vy, RARITY_COL[it.rarity]);
    itemLines(it).slice(0, 7).forEach((l, n) => text(cut(l), C.x + 6, vy + 9 + n * 7, 26));
    if (cur) {
      const x2 = C.x + C.w / 2 + 2;
      for (let y = vy - 2; y < vy + 64; y++) put(C.x + C.w / 2 - 2, y, 5);
      text('WORN NOW', x2, vy - 0, 24);
      text(cut(itemName(cur)), x2, vy + 9, RARITY_COL[cur.rarity]);
      itemLines(cur).slice(0, 6).forEach((l, n) => text(cut(l), x2, vy + 18 + n * 7, 24));
      // the changes, in a row of green gains and red losses
      const ch = compareLines(it, cur).slice(0, -1), cy = vy + 70;
      if (ch.length) { textC('IF YOU WEAR IT', W / 2, cy, 24); ch.slice(0, 3).forEach(([l, c], n) => textC(l, W / 2, cy + 10 + n * 9, c)); }
    }
    if (fromBag) mk('EQUIP', C.x + 6, () => { if (!canWear(it)) { sfx('tap'); return; } const up = upgradeOf(it) > 0; equipItem(it); INV.sel = null; INV.flash = { text: up ? 'BETTER!' : 'EQUIPPED', col: up ? 55 : 26, t: G.t }; sfx('clink'); }, canWear(it) && u > 0);
    else mk('REMOVE', C.x + 6, () => { unequip(INV.sel.slot); INV.sel = null; });
    mk('DROP', C.x + C.w - bw - 6, () => {
      if (INV.sel.from === 'bag') hero.bag.splice(hero.bag.indexOf(it), 1); else { hero.equip[INV.sel.slot] = null; recalcHero(); }
      groundItems.push({ item: it, fi: hero.fi + 0.4, fj: hero.fj + 0.4, t: 0 }); INV.sel = null;
    });
  } else {
    const ups = bagUpgrades().length;
    textC('TAP AN ITEM TO SEE IT', W / 2, C.y + 14, 25);
    textC('DOUBLE TAP TO WEAR IT', W / 2, C.y + 24, 24);
    if (ups) { arrowUp(W / 2 - 52, C.y + 40, 55, 4); textC(`${ups} UPGRADE${ups > 1 ? 'S' : ''} IN YOUR BAG`, W / 2 + 4, C.y + 40, 55); }
  }
  UI.invBtns = L.btns;
  if (INV.flash && G.t - INV.flash.t < 1.6) textC(INV.flash.text, W / 2, 168, INV.flash.col, 1);
}
const inRect = (p, r) => p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h;
function tabTap(p, L) {
  if (inRect(p, L.close)) { closeInv(); return true; }
  if (inRect(p, L.tabs.inv)) { if (G.mode !== 'inv') openInv('inv'); return true; }
  if (inRect(p, L.tabs.skills)) { if (G.mode !== 'skills') openInv('skills'); return true; }
  return false;
}
function invTap(p) {
  const L = invLayout();
  for (const b of UI.invBtns || []) if (inRect(p, b)) { b.on(); return; }
  if (tabTap(p, L)) return;
  if (inRect(p, L.best)) { wearBest(); return; }
  if (inRect(p, L.color)) { hero.team = hero.team === 'red' ? 'blue' : 'red'; recalcHero(); prewarmHero(); return; }
  for (const s of SLOTS) if (inRect(p, L.slots[s])) { INV.sel = hero.equip[s] ? { item: hero.equip[s], from: 'equip', slot: s } : null; return; }
  for (let n = 0; n < L.bag.length; n++) if (inRect(p, L.bag[n])) {
    const it = hero.bag[n];
    if (it && INV.tapIt === it && G.t - INV.tapT < 0.4 && canWear(it)) {   // double tap: wear it
      const up = upgradeOf(it) > 0; equipItem(it); INV.sel = null; INV.tapIt = null; INV.flash = { text: up ? 'BETTER!' : 'EQUIPPED', col: up ? 55 : 26, t: G.t }; sfx('clink'); return;
    }
    INV.tapIt = it; INV.tapT = G.t;
    INV.sel = it ? { item: it, from: 'bag' } : null; return;
  }
}

// ---------------------------------------------------------------- guided steps (round 45)
// Two moments are walked through once, the first time they happen (saved in hero.tut):
// 'gear' - the second wolf killed (or the eighth kill of anything) at level 4 or under drops a
//          weapon for the class that is sure to beat the one worn. Picking it up slows the game to
//          a stop, dims all but the bag button and points at it; in the bag the arrow moves to the
//          new weapon, then to EQUIP.
// 'mod'  - the level the first skill modifier opens (3 for every class): the same freeze, then
//          the bag, the SKILLS tab and the new modifier.
// Each step is read off the game's state every frame, so going back or out of order never strands it.
function guideKill(e) {
  if (!hero.tut || hero.tut.gearDrop || hero.lvl > 4) return;
  hero.tut.kills = (hero.tut.kills || 0) + 1; if (e.id === 'wolf') hero.tut.wolves = (hero.tut.wolves || 0) + 1;
  if ((hero.tut.wolves || 0) < 2 && hero.tut.kills < 8) return;
  hero.tut.gearDrop = true;
  const cur = hero.equip.weapon, need = cur ? itemScore(cur) + 2 : 0;
  const bases = Object.keys(ITEM_BASES).filter(k => ITEM_BASES[k].slot === 'weapon' && forCls(ITEM_BASES[k]) && ITEM_BASES[k].lvl <= 3)
    .sort((a, b) => ITEM_BASES[a].lvl - ITEM_BASES[b].lvl || ITEM_BASES[a].dmg[1] - ITEM_BASES[b].dmg[1]);
  for (const k of bases) {
    const it = { id: itemSerial++, base: k, rarity: 'magic', prefix: 'SHARP', mods: { dmgPct: 25 } };
    if (itemScore(it) < need) continue;
    groundItems.push({ item: it, fi: e.fi, fj: e.fj, t: 0, guide: true }); say('SOMETHING FELL. PICK IT UP!', 51, 2.5); return;
  }
  hero.tut.gear = true;   // already better armed than anything we'd give: nothing to show
}
function guideLevel() {
  if (!hero.tut || hero.tut.mod) return;
  const opens = skillsScreenList().some(sk => (SKILL_MODS[sk.id] || []).some((m, k) => modUnlock(sk.id, k) === hero.lvl));
  if (!opens) return;
  if (G.guide) { G.guideNext = 'mod'; return; }
  startGuide('mod');
}
function startGuide(kind, item) {
  G.guide = { kind, item, t: 0, frozen: G.mode === 'play', dmg0: STAT.dmg.slice() }; if (G.mode === 'play') clearInput();
  if (kind === 'mod') say('NEW SKILL POWER UNLOCKED', 59, 3);
  sfx('levelUp');
}
// the step the guide is on, from what the game shows now
function guideStep() {
  const g = G.guide; if (!g) return null;
  if (g.kind === 'gear') {
    if (Object.values(hero.equip).includes(g.item)) return 'done';
    if (!hero.bag.includes(g.item)) return 'done';   // dropped it: leave them be
    if (G.mode === 'play') return 'bag';
    if (G.mode === 'skills') return 'geartab';
    if (G.mode === 'inv') return INV.sel && INV.sel.item === g.item ? 'equip' : 'item';
    return 'wait';
  }
  if (Object.values(hero.mods || {}).some(Boolean)) return 'done';
  if (G.mode === 'play') return 'bag';
  if (G.mode === 'inv') return 'tab';
  if (G.mode === 'skills') { const g = skillsGuideMod(), v = skillsView(); return g && v.n === g.n && v.k === g.k ? 'choose' : 'chip'; }
  return 'wait';
}
const guideFrozen = () => !!(G.guide && G.guide.frozen && G.mode === 'play' && guideStep() === 'bag');
function updateGuide(dt) {
  const g = G.guide; if (!g) return;
  g.t += dt;
  if (G.mode !== 'play') g.frozen = false;   // once the bag is open, play is never frozen again for it
  const s = guideStep();
  if (s !== 'done') return;
  hero.tut[g.kind] = true; G.guide = null;
  if (g.kind === 'gear') { const d = STAT.dmg; INV.flash = { text: `BETTER! DAMAGE ${g.dmg0[0]}-${g.dmg0[1]} > ${d[0]}-${d[1]}`, col: 55, t: G.t }; sfx('levelUp'); }
  else { SKV.flash = { text: 'CHOSEN! CHANGE IT HERE ANY TIME', col: 55, t: G.t }; }
  if (G.guideNext) { const k = G.guideNext; G.guideNext = null; startGuide(k); G.guide.frozen = G.mode === 'play'; }
}
// where the arrow points: a rect {x, y, w, h}
function guideRect(s) {
  const L = invLayout();
  if (s === 'bag') { const [x, y, r] = UI.bag; return { x: x - r, y: y - r, w: r * 2, h: r * 2, round: true }; }
  if (s === 'item') { const n = hero.bag.indexOf(G.guide.item); return n >= 0 ? L.bag[n] : null; }
  if (s === 'equip') return (UI.invBtns || []).find(b => b.label === 'EQUIP') || null;
  if (s === 'tab') return L.tabs.skills;
  if (s === 'geartab') return L.tabs.inv;
  if (s === 'chip') return skillsGuideRect();
  if (s === 'choose') return skillsLayout().act;
  return null;
}
const GUIDE_TEXT = {
  gear: { bag: ['NEW WEAPON!', 'OPEN YOUR BAG TO WEAR IT'], item: [null, 'TAP THE NEW WEAPON'], equip: [null, 'TAP EQUIP TO WEAR IT'], geartab: [null, 'BACK TO YOUR GEAR'] },
  mod: { bag: ['NEW SKILL POWER!', 'OPEN YOUR BAG TO CHOOSE IT'], tab: [null, 'TAP SKILLS'], chip: [null, 'TAP IT TO WATCH IT'], choose: [null, 'TAP TO USE IT'] },
};
function drawGuide() {
  const g = G.guide; if (!g) return;
  const s = guideStep(), r = guideRect(s); if (!r) return;
  const [big, small] = (GUIDE_TEXT[g.kind] || {})[s] || [];
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  if (G.mode === 'play') {   // dim all but the button: a dither of black, darker the longer it has stopped
    const k = Math.min(1, g.t / 0.4), rr = r.w / 2 + 4;
    for (let y = 0; y < H; y++) for (let x = (y & 1); x < W; x += 2) if (k > 0.5 || ((x + y) & 3) === 0) { if (Math.hypot(x - cx, y - cy) > rr) out32[y * W + x] = PAL32[BLK]; }
    if (g.frozen) for (let a = 0; a < 40; a++) { const t = a / 40 * 6.283; put(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr, Math.floor(G.t * 6) % 2 ? 51 : 50); }
  } else {   // a pulsing frame round the target
    const c = Math.floor(G.t * 6) % 2 ? 51 : 50;
    frame(r.x - 2, r.y - 2, r.w + 4, r.h + 4, c, c); frame(r.x - 3, r.y - 3, r.w + 6, r.h + 6, BLK, BLK);
  }
  // the bouncing arrow, under targets in the top half (pointing up) and over the rest (pointing down)
  const up = cy < H / 2, bob = Math.round(Math.abs(Math.sin(G.t * 5)) * 4);
  const tipY = up ? r.y + r.h + 4 + bob : r.y - 4 - bob, ax = Math.round(Math.min(W - 10, Math.max(10, cx)));
  bigArrow(ax, tipY, up);
  const ty = up ? tipY + 18 : tipY - 26, tx = Math.min(W - 6 - textWidth(small || '') / 2, Math.max(6 + textWidth(small || '') / 2, cx));
  if (big) textC(big, W / 2, H * 0.42, 51, 2);
  if (small) { const w = textWidth(small) + 8; fillRect(Math.round(tx - w / 2), ty - 3, w, 11, BLK); frame(Math.round(tx - w / 2), ty - 3, w, 11, 50, 49); textC(small, tx, ty, 27); }
}
function bigArrow(x, tip, up) {
  const d = up ? 1 : -1;
  for (let k = 0; k < 7; k++) for (let o = -k - 1; o <= k + 1; o++) put(x + o, tip + d * k, BLK);
  for (let k = 0; k < 6; k++) for (let o = -k; o <= k; o++) put(x + o, tip + d * k, k < 2 ? 27 : 51);
  for (let k = 6; k < 13; k++) for (let o = -3; o <= 3; o++) put(x + o, tip + d * k, Math.abs(o) === 3 ? BLK : 50);
  for (let o = -3; o <= 3; o++) put(x + o, tip + d * 13, BLK);
}

// ---------------------------------------------------------------- skills screen (round 29, redone in round 45)
// The class's skills as a row of buttons; the chosen one shows its live preview (preview.js: the
// real skill on three dummies), its cost, and four chips: the plain skill and its three
// modifiers. Tapping a chip plays it in the preview and explains it; CHOOSE puts it in use (one per
// skill). Locked modifiers can be watched too, with the level they open at.
const SKV = { sel: null, view: null, flash: null };   // view: { n: skill row, k: -1 plain or 0-2 }
const skillsScreenList = () => (hero.cls === 'mage' ? [{ id: 'missile', name: 'MAGIC MISSILE', lvl: 1, mana: 0, cd: 0 }] : []).concat(SKILLS);
const RESOURCE = { warrior: 'FURY', mage: 'MANA', ranger: 'FOCUS' };
// what each skill and modifier does, at more length than the chip has room for
const SKILL_TEXT = {
  missile: 'YOUR ATTACK. HOLD IT TO KEEP FIRING ARCANE BOLTS AT THE NEAREST FOE. IT COSTS NOTHING.',
  'missile/seek': 'THREE SMALL BOLTS, EACH FINDS ITS OWN FOE. BEST AGAINST PACKS OF WEAK ONES.',
  'missile/pierce': 'A FAST STRAIGHT BOLT THAT GOES THROUGH EVERY FOE IN ITS LINE. LINE THEM UP IN A DOORWAY.',
  'missile/orb': 'A SLOW ORB THAT ZAPS ALL NEAR IT AS IT FLIES, THEN BURSTS. A SLOWER CAST, BIG ON CROWDS.',
  fireball: 'A FIREBALL THAT BURSTS ON THE FIRST FOE IT HITS, BURNING ALL AROUND IT.',
  'fireball/split': 'THREE SMALLER FIREBALLS IN A SPREAD. COVERS A WIDE FRONT, AND ALL THREE CAN HIT ONE BIG FOE.',
  'fireball/ground': 'LEAVES FIRE ON THE FLOOR FOR 3 SECONDS. GREAT IN DOORWAYS AND ON FOES THAT CHASE YOU.',
  'fireball/great': 'ONE HUGE, SLOW FIREBALL WITH A MUCH BIGGER BLAST. COSTS 6 MORE MANA.',
  cone: 'A BLAST OF FROST IN FRONT OF YOU. WHAT IT HITS IS FROZEN FOR A MOMENT.',
  'cone/nova': 'A RING OF FROST ALL AROUND YOU, SHORTER REACH. FOR WHEN YOU ARE SURROUNDED.',
  'cone/shards': 'A LONG NARROW CONE THAT HITS HARDER. FREEZE THEM BEFORE THEY REACH YOU.',
  'cone/deep': 'FREEZES LONGER. FOES KILLED WHILE FROZEN BURST AND HURT THOSE NEAR THEM.',
  meteor: 'CALLS A METEOR DOWN ON YOUR TARGET AFTER A SHORT DELAY. A HUGE BLAST.',
  'meteor/shower': 'THREE SMALLER METEORS AROUND THE TARGET. A WIDER SPREAD FOR BIG PACKS.',
  'meteor/molten': 'THE CRATER BURNS FOR 4 SECONDS. HOLD A CHOKE POINT WITH IT.',
  'meteor/comet': 'A BALL OF ICE INSTEAD: IT FREEZES WHAT IT HITS RATHER THAN BURNING IT.',
  blink: 'TELEPORT A SHORT WAY. GET OUT OF A CROWD OR AWAY FROM A BIG HIT.',
  'blink/burst': 'A BLAST WHERE YOU LAND THAT THROWS FOES BACK. BLINK IN AND KNOCK THEM AWAY.',
  'blink/double': 'A SECOND BLINK FOR FREE WITHIN 1.5 SECONDS. IN, THEN BACK OUT.',
  'blink/frost': 'FREEZES WHAT STOOD NEAR YOU WHEN YOU LEFT, SO THEY CANNOT FOLLOW.',
  slam: 'SLAM THE GROUND: A WAVE THAT HITS EVERY FOE IN AN ARC IN FRONT OF YOU.',
  'slam/ring': 'HITS ALL AROUND YOU WITH A SHORTER REACH. FOR WHEN THEY SURROUND YOU.',
  'slam/fissure': 'A LONG NARROW CRACK THAT RACES OUT AHEAD AND HITS FOES FAR AWAY IN A LINE.',
  'slam/after': 'A SECOND, WEAKER SLAM HALF A SECOND LATER. MORE DAMAGE FOR THE SAME FURY.',
  hook: 'THROW A CHAIN THAT DRAGS A FOE TO YOU AND DAZES IT. PULL IN ARCHERS AND CASTERS.',
  'hook/line': 'REACHES FARTHER AND DRAGS IN EVERY FOE IT PASSES.',
  'hook/barbed': 'HITS HARDER AND DAZES TWICE AS LONG.',
  'hook/tether': 'HAULS YOU TO THE TARGET INSTEAD, FOR A HEAVY BLOW. GET TO THE ONES AT THE BACK.',
  whirl: 'SPIN WITH YOUR WEAPON OUT, HITTING ALL AROUND YOU AGAIN AND AGAIN. YOU CAN MOVE AS YOU SPIN.',
  'whirl/devil': 'THROWS OUT SMALL WHIRLWINDS AS YOU SPIN THAT WANDER OFF AND HIT ON THEIR OWN.',
  'whirl/long': 'SPINS TWICE AS LONG AND PULLS THE SMALL ONES IN TOWARD THE BLADE. 6 MORE FURY.',
  'whirl/storm': 'A WIDER REACH AND FASTER HITS.',
  leap: 'JUMP AT YOUR TARGET AND CRASH DOWN, HITTING ALL AROUND WHERE YOU LAND.',
  'leap/burn': 'THE LANDING LEAVES FIRE ON THE FLOOR.',
  'leap/quake': 'A MUCH WIDER LANDING THAT KNOCKS EVERY FOE NEAR IT DOWN.',
  'leap/pounce': 'A LONGER JUMP THAT ENDS IN ONE HUGE BLOW ON THE TARGET.',
  multi: 'A FAN OF ARROWS IN FRONT OF YOU. GOOD AGAINST A PACK.',
  'multi/wide': 'NINE ARROWS IN A WIDE FAN, EACH A LITTLE WEAKER.',
  'multi/pierce': 'THE ARROWS GO THROUGH EVERY FOE IN THEIR LINE.',
  'multi/fire': 'BURNING ARROWS THAT SET FOES ALIGHT AND HURT THEM OVER TIME.',
  trap: 'THROW A SNARE THAT HOLDS THE FOES THAT STEP ON IT. SHOOT THEM WHILE THEY ARE STUCK.',
  'trap/spike': 'NO SNARE: IT SPRINGS FOR ONE HEAVY BLOW.',
  'trap/net': 'SNARES EVERYTHING IN A WIDER RING, FOR LONGER.',
  'trap/triple': 'THROWS THREE SMALLER TRAPS IN A SPREAD.',
  roll: 'LEAP BACK, AWAY FROM DANGER, TO KEEP YOUR DISTANCE.',
  'roll/smoke': 'LEAVES SMOKE WHERE YOU STOOD THAT DAZES THE FOES IN IT.',
  'roll/long': 'JUMPS TWICE AS FAR.',
  'roll/volley': 'FIVE STRONGER ARROWS AS YOU LAND.',
  mark: 'MARK A FOE: IT TAKES MORE DAMAGE FROM EVERYTHING FOR A WHILE. MARK THE BIG ONE.',
  'mark/spread': 'WHEN THE MARKED FOE DIES, THE MARK JUMPS TO THE NEXT.',
  'mark/death': 'THE MARKED TAKE 70% MORE DAMAGE, BUT THE MARK LASTS ONLY 5 SECONDS.',
  'mark/blood': 'YOUR HITS ON THE MARKED FOE HEAL YOU.',
};
function wrapText(s, n) {
  const out = []; let line = '';
  for (const w of s.split(' ')) { if (line && (line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; }
  if (line) out.push(line);
  return out;
}
function skillsLayout() {
  const list = skillsScreenList(), n = list.length, L = { list, icons: [], chips: [] };
  const gap = Math.min(54, (W - 20) / n);
  list.forEach((sk, i) => L.icons.push({ x: Math.round(W / 2 + (i - (n - 1) / 2) * gap) - 14, y: 26, w: 28, h: 28, sk }));
  L.pv = { x: 8, y: 80, w: PV_W, h: PV_H };
  for (let k = -1; k < 3; k++) L.chips.push({ k, x: 8 + (k + 1) * 64, y: 248, w: 60, h: 26 });
  L.text = { x: 10, y: 282 };
  L.act = { x: W / 2 - 80, y: 334, w: 160, h: 24 };
  return L;
}
// the view starts on a skill with a modifier just opened, else the first; on what is in use
function skillsView() {
  const list = skillsScreenList();
  if (!SKV.view || SKV.view.n >= list.length) {
    let n = list.findIndex(sk => hero.lvl >= sk.lvl && (SKILL_MODS[sk.id] || []).some((m, k) => modUnlock(sk.id, k) === hero.lvl)); if (n < 0) n = 0;
    const cur = hero.mods && hero.mods[list[n].id], k = cur ? (SKILL_MODS[list[n].id] || []).findIndex(m => m.id === cur) : -1;
    SKV.view = { n, k };
  }
  return SKV.view;
}
// the modifier the skill guide points at: the first one open
function skillsGuideMod() {
  const list = skillsScreenList();
  for (let n = 0; n < list.length; n++) for (let k = 0; k < 3; k++) if (SKILL_MODS[list[n].id] && hero.lvl >= list[n].lvl && hero.lvl >= modUnlock(list[n].id, k)) return { n, k };
  return null;
}
function skillsGuideRect() {
  const g = skillsGuideMod(); if (!g) return null;
  const L = skillsLayout(), v = skillsView();
  return v.n !== g.n ? L.icons[g.n] : L.chips[g.k + 1];
}
function skillIcon(sk, i, cx, cy, r, locked) {
  const sl = SPELL_LOOK[sk.id], si = SKILLS.indexOf(sk);
  if (sk.id === 'missile') drawButton([cx, cy, r], locked ? [3, 4, 5] : [56, 57, 58, 59], false, glyphBolt);
  else drawButton([cx, cy, r], locked ? [3, 4, 5] : sl ? sl[0] : [[48, 49, 50, 51], [19, 20, 21, 22], [28, 29, 30, 31], [33, 34, 35, 36]][si], false, sl ? sl[1] : si ? SKILL_GLYPH[si] : glyphBolt);
  if (locked) textC(`LV${sk.lvl}`, cx, cy - 2, 25);
}
function drawSkills() {
  fillRect(0, 0, W, H, 2);
  for (let y = 0; y < H; y += 2) for (let x = (y >> 1) & 1; x < W; x += 4) put(x, y, 3);
  const L = skillsLayout(), v = skillsView(), sk = L.list[v.n], mods = SKILL_MODS[sk.id] || [], pulse = Math.floor(G.t * 4) % 2;
  drawTabs(invLayout(), 'skills');
  // the skill buttons
  L.icons.forEach((r, i) => {
    const s = r.sk, cx = r.x + 14, cy = r.y + 14;
    if (i === v.n) for (let a = 0; a < 64; a++) { const t = a / 64 * 6.283; put(cx + Math.cos(t) * 14, cy + Math.sin(t) * 14, 51); put(cx + Math.cos(t) * 15, cy + Math.sin(t) * 15, 49); }
    skillIcon(s, i, cx, cy, 11, hero.lvl < s.lvl);
    const fresh = (SKILL_MODS[s.id] || []).some((m, k) => { const lv = modUnlock(s.id, k); return lv <= hero.lvl && lv > (SKV.seen0 || 0); });
    if (fresh && i !== v.n) dot(cx + 10, cy - 10, 59);
  });
  // the name, and what it costs
  textC(sk.name, W / 2, 58, 51, 2);
  const res = RESOURCE[hero.cls] || 'MANA', cost = sk.id === 'missile' ? 'NO COST: YOUR ATTACK' : `${sk.mana + (v.k >= 0 && /6 MORE/.test(mods[v.k].desc) ? 6 : 0)} ${res}   ${sk.cd} S COOLDOWN`;
  textC(hero.lvl < sk.lvl ? `OPENS AT LEVEL ${sk.lvl}   ${cost}` : cost, W / 2, 71, 25);
  // the preview window (its picture is drawn over this hole after the frame, see pvBlit)
  const P = L.pv; UI.pvRect = P;
  frame(P.x - 2, P.y - 2, P.w + 4, P.h + 4, 8, 4); frame(P.x - 1, P.y - 1, P.w + 2, P.h + 2, BLK, BLK); fillRect(P.x, P.y, P.w, P.h, 1);
  pvShow(sk.id, v.k >= 0 ? mods[v.k].id : null);
  if (!pvLive()) textC(PVP.failed ? 'NO PREVIEW ON THIS DEVICE' : 'SETTING UP THE PREVIEW...', W / 2, P.y + P.h / 2 - 2, 24);
  const showing = v.k >= 0 ? mods[v.k].name : sk.name, dmg = pvLive() ? pvDamage() : 0;
  text(`PREVIEW: ${showing}`, P.x, P.y + P.h + 5, 24);
  if (dmg) { const s = `${dmg} DAMAGE A LOOP`; text(s, P.x + P.w - textWidth(s), P.y + P.h + 5, 24); }
  // the chips: the plain skill, then its three modifiers
  const cur = hero.mods && hero.mods[sk.id];
  for (const c of L.chips) {
    const m = c.k >= 0 ? mods[c.k] : null, lv = m ? modUnlock(sk.id, c.k) : sk.lvl, open = hero.lvl >= lv && hero.lvl >= sk.lvl;
    const inUse = m ? cur === m.id : !cur || !mods.some(x => x.id === cur), viewing = c.k === v.k;
    fillRect(c.x, c.y, c.w, c.h, inUse ? 53 : open ? 5 : 3);
    if (viewing) { frame(c.x - 1, c.y - 1, c.w + 2, c.h + 2, pulse ? 51 : 50, pulse ? 51 : 50); frame(c.x, c.y, c.w, c.h, 50, 49); }
    else frame(c.x, c.y, c.w, c.h, inUse ? 55 : 8, 3);
    textC(m ? m.name : 'BASIC', c.x + c.w / 2, c.y + 5, open ? 27 : 24);
    textC(inUse ? 'IN USE' : open ? (viewing ? 'WATCHING' : 'TAP TO WATCH') : `LEVEL ${lv}`, c.x + c.w / 2, c.y + 15, inUse ? 55 : open ? 25 : 24);
    if (m && open && lv > (SKV.seen0 || 0) && !inUse) dot(c.x + c.w - 4, c.y + 3, 59);
  }
  if (!mods.length) textC('NO MODIFIERS FOR THIS SKILL YET', W / 2, L.chips[0].y + 9, 24);
  // what it does
  const key = v.k >= 0 ? sk.id + '/' + mods[v.k].id : sk.id, desc = SKILL_TEXT[key] || (v.k >= 0 ? mods[v.k].desc : '');
  wrapText(desc, 61).slice(0, 5).forEach((l, i) => text(l, L.text.x, L.text.y + i * 9, 26));
  // the button: choose what is being watched
  const m = v.k >= 0 ? mods[v.k] : null, lv = m ? modUnlock(sk.id, v.k) : sk.lvl, open = hero.lvl >= lv && hero.lvl >= sk.lvl;
  const inUse = m ? cur === m.id : !cur || !mods.some(x => x.id === cur), A = L.act;
  const label = !open ? `OPENS AT LEVEL ${Math.max(lv, sk.lvl)}` : inUse ? 'IN USE' : m ? `CHOOSE ${m.name}` : 'GO BACK TO BASIC';
  const lit = open && !inUse;
  fillRect(A.x, A.y, A.w, A.h, lit ? 53 : 4); frame(A.x, A.y, A.w, A.h, lit ? (pulse ? 55 : 54) : 8, 3); textC(label, A.x + A.w / 2, A.y + 9, lit ? 27 : 24);
  if (SKV.flash && G.t - SKV.flash.t < 2) textC(SKV.flash.text, W / 2, A.y + A.h + 8, SKV.flash.col);
  else textC('ONE MODIFIER PER SKILL. CHANGE IT ANY TIME.', W / 2, A.y + A.h + 8, 24);
}
function skillsTap(p) {
  if (tabTap(p, invLayout())) return;
  const L = skillsLayout(), v = skillsView();
  for (let i = 0; i < L.icons.length; i++) if (inRect(p, L.icons[i])) {
    const sk = L.list[i], cur = hero.mods && hero.mods[sk.id];
    SKV.view = { n: i, k: cur ? (SKILL_MODS[sk.id] || []).findIndex(m => m.id === cur) : -1 }; return;
  }
  const sk = L.list[v.n], mods = SKILL_MODS[sk.id] || [];
  for (const c of L.chips) if (inRect(p, c) && (c.k < 0 || mods[c.k])) { v.k = c.k; return; }
  if (inRect(p, L.act)) {
    const m = v.k >= 0 ? mods[v.k] : null, lv = m ? modUnlock(sk.id, v.k) : sk.lvl;
    if (hero.lvl < lv || hero.lvl < sk.lvl) { sfx('tap'); return; }
    hero.mods = hero.mods || {}; hero.mods[sk.id] = m ? m.id : null;
    SKV.flash = { text: m ? `${m.name} IS IN USE` : `BACK TO THE PLAIN ${sk.name}`, col: 55, t: G.t };
    sfx('clink'); const m0 = G.mode; G.mode = 'play'; saveGame(); G.mode = m0;
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
  if (G.mode === 'talk') { talkTap(p); return; }
  if (G.mode === 'skills') { sfx('tap'); skillsTap(p); return; }
  if (hero.dead > 2) { respawn(); return; }
  if (hitCircle(p, UI.bag)) { openInv('inv'); return; }
  if (guideFrozen()) return;   // round 45: stopped to show the bag button; only it answers
  if (hitCircle(p, UI.sound)) { setMuted(!SFX.muted); sfx('tap'); return; }
  if (hitCircle(p, UI.map)) { showMap = !showMap; return; }
  if (hitCircle(p, UI.portal)) { usePortal(); return; }
  if (hitCircle(p, UI.potion)) { drinkPotion(); return; }
  for (let i = 0; i < UI.skills.length; i++) if (hitCircle(p, UI.skills[i], 5)) { press.skill = i; useSkill(i); return; }
  if (ULTS[hero.cls] && hitCircle(p, UI.ult, 4)) { useUlt(); return; }
  { const a = actionTarget(); if (a && UI.act && inRect(p, UI.act)) { doAction(a); return; } }   // round 43b: the action button
  { const n = npcAtScreen(p); if (n) { hero.goTalk = n; hero.goTalkT = 6; return; } }   // round 42b: tap a person to walk over and talk
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
  if (G.mode === 'talk') { if (k === 'enter' || k === ' ' || k === 'j') { const L = talkLayout(); talkTap(L.btn ? [L.btn.x + 2, L.btn.y + 2] : [W / 2, 10]); } else if (G.talk && G.talk.reward && (k === '1' || k === '2' || k === '3')) talkTap([talkLayout().cards[+k - 1].x + 2, talkLayout().cards[+k - 1].y + 2]); e.preventDefault(); return; }
  if (G.mode === 'title' && (k === 'enter' || k === ' ')) { const c = TITLE.sel || 'warrior'; beginGame(!!loadSave(c), c); return; }
  if (G.mode === 'title' && (k === 'arrowleft' || k === 'arrowright')) { const L = ['warrior', 'mage', 'ranger'], n = L.indexOf(TITLE.sel || 'warrior'); titlePick(L[(n + (k === 'arrowleft' ? 2 : 1)) % 3]); return; }
  if (guideFrozen() && k !== 'i' && k !== 'b') { e.preventDefault(); return; }   // round 45: stopped for the guide
  input.keys.add(k);
  if (k === ' ' || k === 'j') input.attack = true;
  if (k === 'k' || k === '1') useSkill(0);
  if (k === '2' || k === 'l') useSkill(1);
  if (k === '3') useSkill(2);
  if (k === '4') useSkill(3);
  if (k === '5' || k === 'r') useUlt();
  if (k === 'q') drinkPotion();
  if (k === 'e' || k === 'f') { const a = actionTarget(); if (a) doAction(a); }   // round 43b: the action key
  if (k === 'i' || k === 'b') { if (G.mode === 'inv' || G.mode === 'skills') closeInv(); else if (G.mode === 'play') openInv('inv'); }
  if (k === 'm' || k === 'tab') showMap = !showMap;
  if (k === 'c') { hero.team = hero.team === 'red' ? 'blue' : 'red'; recalcHero(); prewarmHero(); }
  if (k === 'escape' && (G.mode === 'inv' || G.mode === 'skills')) closeInv();
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
  if (PREVIEW) { if (!scr || W !== PV_W) allocBuffers(PV_W, PV_H); return; }   // the skill preview's frame is a fixed size
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
