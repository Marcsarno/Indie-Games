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
// round 50: a character drawn big on a menu with its sharp (2x-detail) sprite: queued here, drawn onto
// the sharp layer after the HUD is merged (game.js drawHudLayer), each of its pixels one game pixel
// (the 1x sprite doubled made blocks four phone pixels wide). Same calls as getSprite.
const FINE_Q = [];
function bigHero(look, dir, clip, frame, ent, x, y, L = 4) {
  const sp = getSprite('hero', look, dir, clip, frame, ent, SPX);
  FINE_Q.push({ sp, x, y, L });
}
function drawFineQueue() {
  for (const { sp, x, y, L } of FINE_Q) {
    const X0 = x * SPX - sp.ax * 2, Y0 = y * SPX - sp.ay * 2;
    for (let yy = 0; yy < sp.h; yy++) for (let xx = 0; xx < sp.w; xx++) {
      const v = sp.data[yy * sp.w + xx]; if (!v) continue;
      const c = PAL32[(v & EMIS) ? v & 127 : LTAB[L][v]];
      for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) { const X = X0 + xx * 2 + a, Y = Y0 + yy * 2 + b; if (X >= 0 && Y >= 0 && X < OW && Y < OH) ov32[Y * OW + X] = c; }
    }
  }
  FINE_Q.length = 0;
}
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
  const mage = hero.cls === 'mage', locked = hero.lvl < ULT_LVL, fullEl = mage && !locked ? elemFull() : [];
  const war = hero.cls === 'warrior' && !locked, rg = (hero.rage || 0) / 100, tzOn = war && hero.stance === 2, bzOn = war && hero.stance >= 1, bzReady = war && !bzOn && rg >= RAGE_STANCE / 100, titan = bzOn && !tzOn && rg >= 1;   // round 87: the warrior's button is his stance
  const cata = mage && !locked && orbsAll(), f = locked ? 0 : war ? (bzReady || titan ? 1 : rg) : mage ? (fullEl.length || cata ? 1 : Math.max(0, ...ELEMS.map(k => (hero.el && hero.el[k]) || 0)) / 100) : (hero.ult || 0) / 100, full = f >= 1;
  // round 83: the mage's button takes the colours of what it would cast (all four: it runs through them)
  const mramp = cata ? (Math.floor(G.t * 6) % 2 ? [48, 49, 50, 51] : [49, 50, 51, 27]) : fullEl.length === 4 ? ELEM_INFO[ELEMS[Math.floor(G.t * 7) % 4]].ramp : fullEl.length ? ELEM_INFO[fullEl[Math.floor(G.t * 1.6) % fullEl.length]].ramp : [37, 38, 39, 40];
  drawButton(c, locked ? [3, 4, 5] : war ? (tzOn ? [48, 49, 50, 51] : titan ? (Math.floor(G.t * 6) % 2 ? [48, 49, 50, 51] : [20, 21, 22, 23]) : bzOn || bzReady ? [19, 20, 21, 22] : [3, 4, 5, 6]) : mage ? mramp : hero.cls === 'ranger' ? [52, 53, 54, 55] : [48, 49, 50, 51], full || !!hero.ultOn || G.rain.length > 0, hero.cls === 'mage' ? glyphStorm : hero.cls === 'ranger' ? (x, y) => glyphRain(x, y) : bzOn && !titan ? (x, y) => glyphRoar(x, y) : glyphWrath);
  // not yet charged: dark from the top down to the charge line
  if (!full) for (let y = c[1] - c[2]; y <= c[1] + c[2]; y++) for (let x = c[0] - c[2]; x <= c[0] + c[2]; x++) {
    if (Math.hypot(x - c[0], y - c[1]) > c[2] - 1) continue;
    const covered = (c[1] + c[2] - y) / (2 * c[2]) > f;
    if (covered && BAYER[((y & 3) << 2) | (x & 3)] < 0.75) put(x, y, K1);
  }
  if (locked) textC(`LV${ULT_LVL}`, c[0], c[1] - 2, 25);
  // a ring around it showing the charge, gold (arcane for the mage), and a pulsing rim when full
  const col = hero.cls === 'mage' ? 40 : hero.cls === 'ranger' ? 55 : 51;
  if (mage && !locked) {   // four small gauges round the outside, one an element: they fill from the bottom
    ELEMS.forEach((k, n) => {
      const t = (160 + n * 43) * Math.PI / 180, gx = Math.round(c[0] + Math.cos(t) * (c[2] + 10)), gy = Math.round(c[1] + Math.sin(t) * (c[2] + 10)), r = 6;
      const open = elemOpen(k), v = open ? Math.min(1, ((hero.el && hero.el[k]) || 0) / 100) : 0, ramp = k === 'storm' ? [48, 49, 50, 51] : ELEM_INFO[k].ramp, done = v >= 1;
      const pop = G.elemPop && G.elemPop.k === k ? Math.max(0, 1 - (G.t - G.elemPop.t) / 0.5) : 0, rr = r + (pop > 0 ? Math.round(pop * 3) : 0);
      for (let y = -rr - 1; y <= rr + 1; y++) for (let x = -rr - 1; x <= rr + 1; x++) {
        const d = Math.hypot(x, y); if (d > rr + 0.6) continue;
        if (d > rr - 0.7) { put(gx + x, gy + y, done ? (Math.floor(G.t * 4) % 2 === 0 ? 27 : ramp[3]) : open ? 6 : 4); continue; }
        const lit = (rr - y) / (2 * rr) <= v;
        put(gx + x, gy + y, !open ? 3 : lit ? (done ? ramp[y < -1 ? 3 : 2] : ramp[y < 0 ? 2 : 1]) : (x + y) & 1 ? 2 : 3);
      }
      if (done) put(gx - 1, gy - 2, 27);
      // round 86: the element's orb, a small gem just outside its gauge: lit once its mini ultimate has been cast
      const ox = Math.round(c[0] + Math.cos(t) * (c[2] + 20)), oy = Math.round(c[1] + Math.sin(t) * (c[2] + 20)), lit = open && hero.orbs && hero.orbs[k];
      for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const d = Math.abs(x) + Math.abs(y); if (d > 4) continue; put(ox + x, oy + y, d === 4 ? BLK : !lit ? (d < 2 ? 3 : 4) : d === 0 || (x === -1 && y === -1) || (x === -2 && y === 0) ? 27 : ramp[d < 2 ? 3 : d < 3 ? 2 : 1]); }
      if (lit && cata && Math.floor(G.t * 6) % 2) for (const [x, y] of [[0, -5], [0, 5], [-5, 0], [5, 0]]) put(ox + x, oy + y, 27);
    });
  } else if (war) {   // the rage ring: red round the button, a white tick at the half; in the Berserker it ebbs
    for (let a = 0; a < 80; a++) { const u = a / 80, t = -Math.PI / 2 + u * 6.283; if (u > rg) continue; put(c[0] + Math.cos(t) * (c[2] + 2), c[1] + Math.sin(t) * (c[2] + 2), tzOn ? (a & 1 ? 51 : 27) : bzOn ? (a & 1 ? 23 : 22) : 22); put(c[0] + Math.cos(t) * (c[2] + 3), c[1] + Math.sin(t) * (c[2] + 3), tzOn ? 50 : bzOn ? 21 : 20); }
    { const t = Math.PI / 2; for (let r = c[2] + 1; r <= c[2] + 5; r++) put(c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r, 27); }
    textC(tzOn ? `TITAN ${Math.ceil(hero.titanT || 0)}` : bzOn ? (titan ? 'UNLEASH' : 'BERSERK') : 'RAGE', c[0], c[1] + c[2] + 8, tzOn || titan ? 51 : bzOn ? 22 : 25);
    if ((bzReady || titan) && Math.floor(G.t * 4) % 2 === 0) for (let a = 0; a < 80; a++) { const t = a / 80 * 6.283; put(c[0] + Math.cos(t) * (c[2] + 5), c[1] + Math.sin(t) * (c[2] + 5), titan ? 51 : 23); }
  } else if (!locked) for (let a = 0; a < 80; a++) { const u = a / 80, t = -Math.PI / 2 + u * 6.283; if (u > f) continue; put(c[0] + Math.cos(t) * (c[2] + 2), c[1] + Math.sin(t) * (c[2] + 2), col); }
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
  vitalBar(B.x, B.yM, B.w, hero.mana / STAT.maxMana, hero.cls === 'mage' ? [37, 38, 39, 40] : hero.cls === 'ranger' ? [52, 53, 54, 55] : hero.cls === 'paladin' ? [24, 25, 26, 27] : [14, 15, 16, 17], `${Math.floor(hero.mana)}`, false);
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
// round 66: the ranger's new kit
const glyphPierce = (cx, cy) => { for (let k = -8; k <= 6; k++) { put(cx + k, cy - k * 0.5, 27); put(cx + k, cy - k * 0.5 + 1, k < 4 ? 35 : 31); } for (const [a, b] of [[6, -6], [4, -4], [7, -2]]) line(cx + 4, cy - 2, cx + a, cy + b, 27); for (const o of [-3, 0, 3]) line(cx - 8, cy + 4 + o, cx - 4, cy + 2 + o, 51); };
const glyphCluster = (cx, cy) => { for (const [a, b] of [[0, 0], [-5, 3], [5, 3], [-3, -4], [4, -4]]) for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (q * q + r * r <= 4) put(cx + a + q, cy + b + r, q * q + r * r <= 1 ? 18 : 16); put(cx, cy, 27); };
const glyphStrafe = (cx, cy) => { for (const [dx, dy] of [[-7, -5], [0, -8], [7, -5], [-8, 2], [8, 2]]) { line(cx, cy + 3, cx + dx, cy + dy, 35); put(cx + dx, cy + dy, 27); } for (let a = -3; a <= 3; a++) put(cx + a, cy + 4, 31); };   // round 82: arrows fanning out all round
const glyphSentry = (cx, cy) => { line(cx, cy - 1, cx - 6, cy + 7, 35); line(cx, cy - 1, cx + 6, cy + 7, 35); line(cx, cy - 1, cx, cy + 7, 35); line(cx - 7, cy - 3, cx + 7, cy - 3, 31); line(cx - 6, cy - 6, cx - 6, cy, 27); line(cx + 6, cy - 6, cx + 6, cy, 27); put(cx + 8, cy - 3, 27); };
const glyphHawk = (cx, cy) => { for (let k = -8; k <= 8; k++) { const u = Math.abs(k) / 8; put(cx + k, cy - 4 + u * u * 6 - u * 4, 27); put(cx + k, cy - 3 + u * u * 6 - u * 4, 26); } for (let b = -1; b <= 2; b++) for (let a = -2; a <= 2; a++) put(cx + a, cy + b, 26); put(cx + 2, cy - 1, 51); };
const glyphChain = (cx, cy) => {   // round 65: a forked bolt
  const P = [[3, -8], [-2, -2], [2, -1], [-3, 7]];
  for (let k = 0; k < 3; k++) for (const o of [-1, 0, 1]) line(cx + P[k][0] + o, cy + P[k][1], cx + P[k + 1][0] + o, cy + P[k + 1][1], o ? 40 : 27);
  line(cx + 2, cy - 1, cx + 6, cy + 3, 40); line(cx - 2, cy - 2, cx - 6, cy - 4, 40);
};
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
const glyphCharge = (cx, cy) => {   // a shield driving forward, speed lines behind it
  for (let b = -6; b <= 6; b++) { const w = b < 2 ? 5 : 5 - (b - 2) * 1.2; for (let a = 0; a <= w; a++) { put(cx + 1 + a, cy + b, a >= w - 1 || b === -6 ? 31 : a < 1 ? 27 : 30); } }
  line(cx + 3, cy - 3, cx + 3, cy + 3, 50); line(cx + 2, cy, cx + 5, cy, 50);
  for (const [y0, x0, x1] of [[-4, -9, -3], [0, -10, -2], [4, -9, -3]]) line(cx + x0, cy + y0, cx + x1, cy + y0, 27);
};
const glyphLeap = (cx, cy) => {   // an arc up and down, landing in a burst
  for (let a = 0; a <= 16; a++) { const u = a / 16; put(cx - 7 + u * 12, cy + 4 - Math.sin(u * Math.PI) * 10, a > 12 ? 51 : 27); }
  for (const [a, b] of [[-3, 0], [3, 0], [0, -3], [2, -2], [-2, -2]]) line(cx + 5, cy + 5, cx + 5 + a, cy + 5 + b, 50);
};
const SPELL_LOOK = { multi: [[33, 34, 35, 36], (x, y) => glyphMulti(x, y)], trap: [[28, 29, 30, 31], (x, y) => glyphTrap(x, y)], roll: [[52, 53, 54, 55], (x, y) => glyphRoll(x, y)], mark: [[19, 20, 21, 22], (x, y) => glyphMark(x, y)], slam: [[13, 14, 15, 16], glyphSlam], charge: [[28, 29, 30, 31], glyphCharge], hook: [[28, 29, 30, 31], glyphHook], whirl: [[19, 20, 21, 22], glyphWhirl], leap: [[48, 49, 50, 51], glyphLeap], fireball: [[13, 14, 15, 16], glyphFire], cone: [[114, 115, 116, 117], glyphCone], meteor: [[19, 20, 21, 22], glyphMeteor], blink: [[56, 57, 58, 59], glyphBlink], chain: [[37, 38, 39, 40], glyphChain], pierce: [[48, 49, 50, 51], glyphPierce], cluster: [[13, 14, 15, 16], glyphCluster], sentry: [[33, 34, 35, 36], glyphSentry], hawk: [[28, 29, 30, 31], glyphHawk], vault: [[52, 53, 54, 55], (x, y) => glyphRoll(x, y)], rush: [[19, 20, 21, 22], (x, y) => glyphRush(x, y)], hurl: [[19, 20, 21, 22], (x, y) => glyphHurl(x, y)], roar: [[19, 20, 21, 22], (x, y) => glyphRoar(x, y)], flurry: [[19, 20, 21, 22], (x, y) => glyphFlurry(x, y)], split: [[20, 21, 49, 50], (x, y) => glyphSplit(x, y)], uproot: [[20, 21, 49, 50], (x, y) => glyphUproot(x, y)], crescent: [[20, 21, 49, 50], (x, y) => glyphCrescent(x, y)], skyfall: [[20, 21, 49, 50], (x, y) => glyphSkyfall(x, y)], strafe: [[48, 49, 50, 51], (x, y) => glyphStrafe(x, y)] };
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
  if (G.mode === 'cine') {   // round 89: the table: only its own text box. Round 91: rising to it, the game's HUD fades out first
    const C = G.cine;
    if (C && C.ph === 'lift' && C.pt < 0.35) { G.mode = 'play'; try { drawHud(); } finally { G.mode = 'cine'; } const a = 1 - C.pt / 0.35; for (let y = 0, o = 0; y < H; y++) for (let x = 0; x < W; x++, o++) if (out32[o] && BAYER[((y & 3) << 2) | (x & 3)] >= a) out32[o] = 0; }
    return drawCineHud();
  }
  if (G.mode === 'title' && G.cine) return drawTitle();   // round 91: the table's title (no camp labels over it)
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
  else if (hero.cls === 'ranger') {
    drawButton(UI.attack, [33, 34, 35, 36], !!press.attack, (x, y) => glyphBowAtk(x, y));   // arrows
    // round 66: the combo points, three diamonds over the attack button (the newest one flashes)
    const [ax, ay, ar] = UI.attack, n = hero.pips || 0, fresh = G.t - (hero.pipT || 0) < 0.25;
    if (hero.quick > 0) { textC(`QUICKDRAW ${hero.quick}`, ax, ay - ar - 22, Math.floor(G.t * 4) % 2 ? 51 : 50); }   // round 66b
    for (let k = 0; k < 3; k++) { const cx = ax - 12 + k * 12, cy = ay - ar - 9, on = k < n; for (let b = -4; b <= 4; b++) for (let a = -4; a <= 4; a++) { const d = Math.abs(a) + Math.abs(b); if (d > 4) continue; put(cx + a, cy + b, d === 4 ? BLK : !on ? 3 : fresh && k === n - 1 ? 27 : d < 2 ? 51 : n >= 3 ? 50 : 49); } }
  }
  else if (hero.cls === 'paladin' && typeof glyphHammer === 'function') drawButton(UI.attack, [28, 29, 30, 31], !!press.attack, (x, y) => glyphHammer(x, y));   // round 97
  else drawButton(UI.attack, [28, 29, 30, 31], !!press.attack, glyphSword);
  drawActionButton();   // round 43b: talk, trade, free, unlock
  drawStoryMark();
  if (typeof drawPortalPrompt === 'function') { drawPortalPrompt(); drawQuestBanner(); }   // round 64
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
  if (G.mode === 'end') drawEnd();   // round 67
  if (G.mode === 'ways') drawWaysScreen();   // round 96
  if (G.mode === 'shop') drawShop();
  if (G.mode === 'smith') drawSmith();
  drawGuide();   // round 45
  if (G.paused) { fade(0.6); textC('PAUSED', W / 2, H * 0.4, 26, 2); textC('TAP TO RESUME', W / 2, H * 0.4 + 16, 25); }
  if (G.fade > 0) fade(G.fade);
  if (SHOW_FPS || params.get('fps') === '1') { const tx = `${fpsShown} FPS  ${workShown.toFixed(0)} MS  WORST ${workWorst.toFixed(0)}`; fillRect(2, 54, textWidth(tx) + 6, 10, 2); text(tx, 5, 56, fpsShown >= 55 ? 55 : fpsShown >= 40 ? 51 : 23); }   // round 79: OPTIONS, SPEED: frames a second, and the work per frame (average and worst in the last second)
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
  // round 48: compare the dungeon light while playing
  const b = UI.lightBtn = { x: W / 2 - 44, y: H - 132, w: 88, h: 16 };
  fillRect(b.x, b.y, b.w, b.h, 3); frame(b.x, b.y, b.w, b.h, DL48 ? 51 : 6, 2); textC(DL48 ? 'LIGHT: NEW' : 'LIGHT: OLD', b.x + b.w / 2, b.y + 6, DL48 ? 51 : 25);
}
// round 41: the character screen. One card per class: its hero drawn big and slowly turning, its
// name, how it plays, its four skills and its saved level. Tap a card to pick it (gold frame, the
// hero swings, the others dim), then the big button starts: CONTINUE when that class has a save,
// else NEW GAME. START OVER asks for a second tap before it replaces a save. The developer
// settings sit behind OPTIONS.
const TITLE = { sel: null, looks: null, opts: false, eraseT: 0, pickT: 0, splash: true };   // round 46c: a splash screen first (its tap turns the sound on)
const CLASS_INFO = {
  warrior: { name: 'WARRIOR', col: 22, lines: ['BLADE AND ARMOR', 'FIGHTS UP CLOSE'] },
  mage: { name: 'MAGE', col: 40, lines: ['SPELLS FROM AFAR', 'FRAGILE, DEADLY'] },
  ranger: { name: 'RANGER', col: 55, lines: ['BOW AND TRAPS', 'QUICK AND NIMBLE'] },
  paladin: { name: 'PALADIN', col: 51, lines: ['HAMMER AND LIGHT', 'SLOW TO DIE'] },   // round 97
};
function titlePick(cls) { if (TITLE.sel !== cls) { TITLE.sel = cls; TITLE.pickT = G.t; TITLE.eraseT = 0; try { localStorage.setItem('dcg-cls', cls); } catch (e) { /* ignore */ } } }
// the splash: the title over the camp at night, the three heroes, TAP TO BEGIN. Phones play no
// sound before a tap, so this tap is the one that starts the music for the character screen.
// round 60: the splash is the user's own picture (game/art/splash.webp, the one image file in the
// game); the code-drawn splash stays as the fallback while it loads or if it can't load
const SPLASH_IMG = new Image(); SPLASH_IMG.src = 'art/splash.webp';
const splashReady = () => SPLASH_IMG.complete && SPLASH_IMG.naturalWidth > 0 && location.protocol !== 'file:';   // (from local files the picture would block the test tools' screenshots: the drawn splash there)
function drawSplashImage() {   // over the finished frame, at the canvas's full resolution, filling it (cropped to fit)
  const iw = SPLASH_IMG.naturalWidth, ih = SPLASH_IMG.naturalHeight, k = Math.max(OW / iw, OH / ih), w = iw * k, h = ih * k;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(SPLASH_IMG, (OW - w) / 2, (OH - h) / 2, w, h);
}
function drawSplash() {
  if (splashReady()) { UI.titleBtns = [{ x: 0, y: 0, w: W, h: H, on: leaveSplash }]; return; }
  fade(0.55);
  const cy = Math.round(H * 0.3);
  textC('DUNGEONS', W / 2, cy - 30, 22, 4);
  textC('OF BONES', W / 2, cy - 4, 26, 3);
  const saved = budgetOff();
  ['ranger', 'warrior', 'paladin', 'mage'].forEach((cls, k) => {
    const look = TITLE.looks[cls], ent = { look, cls, combo: 0 };
    bigHero(look, 1, 'idle', Math.floor(G.t / 0.2 + k) % 4, ent, W / 2 + (k - 1.5) * 62, cy + 140 + (k === 1 || k === 2 ? 8 : 0), L_ID);
  });
  budgetOn(saved);
  if (Math.floor(G.t * 1.6) % 2 === 0) textC('TAP TO BEGIN', W / 2, Math.round(H * 0.74), 51, 2);
  textC('SOUND ON FOR THE MUSIC', W / 2, Math.round(H * 0.74) + 20, 24);
  UI.titleBtns = [{ x: 0, y: 0, w: W, h: H, on: leaveSplash }];
}
function leaveSplash() { TITLE.splash = false; TITLE.pickT = G.t - 9; if (cineOK() && !G.cine) startCine('title', { intro: introWanted() }); }   // (round 111: the voiced opening, the first time)   // round 91: on to Dave's table
// round 91: the title's settings and credits (both titles: the table's and, without the table, the old one)
function drawTitleOptions(btn, oy) {
  if (TITLE.opts) {
    btn(FEEL_OLD ? 'COMBAT: OLD' : 'COMBAT: NEW', 6, oy - 22, 84, 16, () => setFeelOld(!FEEL_OLD), 25, 3, 6);
    btn(WORLD2X ? 'DETAIL: SHARP' : 'DETAIL: CLASSIC', 93, oy - 22, 84, 16, () => setWorld2x(!WORLD2X), 25, 3, 6);
    btn(HUE_LIGHT ? 'LIGHT: NEW' : 'LIGHT: OLD', 180, oy - 22, 84, 16, () => setLightNew(!HUE_LIGHT), 25, 3, 6);
    btn(HEAVY ? 'WEIGHT: HEAVY' : 'WEIGHT: LIGHT', 93, oy - 44, 84, 16, () => setHeavy(!HEAVY), 25, 3, 6);   // round 62
    btn(SHOW_FPS ? 'SPEED: SHOWN' : 'SPEED: HIDDEN', 180, oy - 44, 84, 16, () => { SHOW_FPS = !SHOW_FPS; try { localStorage.setItem('dcg-fps', SHOW_FPS ? '1' : '0'); } catch (e) { /* storage blocked */ } }, 25, 3, 6);   // round 79: a speed readout to check a real phone
    btn('HERO LIGHT: ' + (CHAR_CAP === L_ID ? 'DRAWN' : '+' + (CHAR_CAP - L_ID)), 6, oy - 44, 84, 16, () => setCharCap(CHAR_CAP >= L_ID + 2 ? L_ID : CHAR_CAP + 1), 25, 3, 6);   // round 60
    btn(DL48 ? 'DUNGEONS: NEW' : 'DUNGEONS: OLD', 6, oy, 84, 16, () => setDL48(!DL48), 25, 3, 6);   // round 48: the dungeon light
    if (G.cine && G.cine.kind === 'title') btn('WATCH THE OPENING', 93, oy, 84, 16, () => { TITLE.opts = false; G.cine = null; startCine('title', { intro: true }); }, 25, 3, 6);   // round 111
    btn(SFX.synth ? 'SOUND: SYNTH' : 'SOUND: REAL', 180, oy, 84, 16, () => { setSynthSfx(!SFX.synth); sfx('hit'); }, 25, 3, 6);   // round 44: compare the recorded sounds with the old synth
  }
}
function drawTitleCredits(y) {
  textC('LEFT THUMB MOVES. RIGHT BUTTONS FIGHT.', W / 2, y, 25);
  textC('THE GAME ART IS DRAWN IN CODE', W / 2, y + 8, 24);
  textC('SOUNDS: KENNEY, ARTISTICDUDE, RUBBERDUCK, QUBODUP,', W / 2, y + 17, 24);   // round 44: the sound packs' credits (sfx/CREDITS.md)
  textC('LITTLE ROBOT SOUND FACTORY, WILL LEAMON, BART, VOICEBOSCH + MORE', W / 2, y + 24, 24);
  textC('VOICES MADE WITH ELEVENLABS', W / 2, y + 31, 24);   // round 111 (vo/CREDITS.md)
}
function drawTitle() {
  if (!TITLE.looks) {   // each class's starting look (the title's hero is a throwaway)
    TITLE.looks = {};
    for (const c of ['ranger', 'mage', 'paladin', 'warrior']) { newHero(c); const sv = loadSave(c);   // (round 91: a saved hero's miniature wears its gear)
      if (sv && sv.hero && sv.hero.equip) try { Object.assign(hero, { lvl: sv.hero.lvl || 1, equip: sv.hero.equip, team: sv.hero.team || hero.team }); recalcHero(); } catch (e) { newHero(c); }
      TITLE.looks[c] = { ...hero.look }; }
    let last = null; try { last = localStorage.getItem('dcg-cls'); } catch (e) { /* ignore */ }
    TITLE.sel = CLASS_INFO[last] ? last : 'warrior';
  }
  if (TITLE.splash) return drawSplash();
  if (G.cine && G.cine.kind === 'title') {   // round 91: the game opens at Dave's table
    UI.titleBtns = [];
    return drawTableTitle((label, x, y, w, h, on, col = 27, bg = 5, edge = 8) => { fillRect(x, y, w, h, bg); frame(x, y, w, h, edge, 2); textC(label, x + w / 2, y + Math.floor(h / 2) - 2, col); UI.titleBtns.push({ x, y, w, h, on }); });
  }
  fade(0.7);
  textC('DUNGEONS', W / 2, 34, 22, 4);
  textC('OF BONES', W / 2, 60, 26, 2);
  textC('CHOOSE YOUR HERO', W / 2, 86, 25);
  UI.titleBtns = [];
  const btn = (label, x, y, w, h, on, col = 27, bg = 5, edge = 8) => { fillRect(x, y, w, h, bg); frame(x, y, w, h, edge, 2); textC(label, x + w / 2, y + Math.floor(h / 2) - 2, col); UI.titleBtns.push({ x, y, w, h, on }); };
  const cw = 64, gap = 2, x0 = Math.round((W - cw * 4 - gap * 3) / 2), y0 = 98, ch = 196;   // (round 97: four heroes)
  const saved = budgetOff();
  ['warrior', 'paladin', 'mage', 'ranger'].forEach((cls, k) => {
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
      sp = f >= 0 ? [look, 1, bow ? 'shoot' : 'attack', f, ent] : [look, 1, 'idle', Math.floor(G.t / 0.2) % 4, ent];
    } else sp = [look, sel ? 1 : Math.floor(G.t / 0.7 + k * 3) % 8, 'idle', Math.floor(G.t / 0.2) % 4, ent];
    // a pool of light under the picked one
    if (sel) for (let yy = -5; yy <= 5; yy++) for (let xx = -26; xx <= 26; xx++) if ((xx / 26) ** 2 + (yy / 5) ** 2 <= 1 && ((xx + yy) & 1)) put(x + cw / 2 + xx, y0 + 112 + yy, 6);
    bigHero(...sp, x + cw / 2, y0 + 112, L_ID);   // (round 50: the sharp sprite; round 60: as drawn, picked or not: brighter washed it out)
    info.lines.forEach((l, n) => textC(l, x + cw / 2, y0 + 124 + n * 8, sel ? 26 : 24));
    // its four skills
    SKILLSETS[cls].forEach((sk, n) => { const sl = SPELL_LOOK[sk.id] || [[48, 49, 50, 51], glyphBolt]; drawButton([x + 9 + n * 15, y0 + 154, 6], sel ? sl[0] : [3, 4, 5, 6], false, sl[1]); });
    textC(save ? `SAVED: LEVEL ${save.hero ? save.hero.lvl : 1}` : 'NO SAVE YET', x + cw / 2, y0 + 172, save ? (sel ? 51 : 49) : 24);
    UI.titleBtns.push({ x, y: y0, w: cw, h: ch, on: () => titlePick(cls) });
  });
  budgetOn(saved);
  // start: continue the picked class's save, or begin it new
  const cls = TITLE.sel, save = loadSave(cls), info = CLASS_INFO[cls], by = y0 + ch + 14;
  btn(save ? `CONTINUE AS ${info.name}` : `NEW GAME AS ${info.name}`, W / 2 - 100, by, 200, 30, () => startGame(!!save, cls), 51, 6, 51);
  if (save) btn(TITLE.eraseT > G.t ? 'TAP AGAIN: ERASE LEVEL ' + (save.hero ? save.hero.lvl : 1) : 'START OVER', W / 2 - 100, by + 36, 200, 18, () => { if (TITLE.eraseT > G.t) startGame(false, cls); else TITLE.eraseT = G.t + 3; }, TITLE.eraseT > G.t ? 22 : 25);
  // the developer settings, folded away
  const oy = H - 56;
  btn(TITLE.opts ? 'OPTIONS  -' : 'OPTIONS  +', W / 2 - 40, oy, 80, 16, () => { TITLE.opts = !TITLE.opts; }, 25, 3, 6);
  drawTitleOptions(btn, oy);
  drawTitleCredits(H - 32);
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
  arrowHead(cx + dx * k - ux * bob, cy + dy * k - uy * bob, ux, uy, c0, c1);
  return true;
}
// a small diamond at the edge of the view toward an off-screen point; false when it is on screen
function edgePip(sx, sy, c) {
  const X0 = 10, X1 = W - 10, Y0 = 118, Y1 = Math.round(H * 0.62);   // (below the tracker's lines)
  if (sx > X0 && sx < X1 && sy > 46 && sy < Y1) return false;
  const cx = W / 2, cy = (Y0 + Y1) / 2, dx = sx - cx, dy = sy - cy, k = Math.min((dx > 0 ? X1 - cx : cx - X0) / Math.abs(dx || 1e-6), (dy > 0 ? Y1 - cy : cy - Y0) / Math.abs(dy || 1e-6));
  const px = Math.round(cx + dx * k), py = Math.round(cy + dy * k);
  for (let b = -4; b <= 4; b++) for (let a = -4; a <= 4; a++) { const d = Math.abs(a) + Math.abs(b); if (d <= 4) put(px + a, py + b, d === 4 ? BLK : a + b < 0 ? c : c - 1); }
  return true;
}
// a filled arrowhead 14 px long pointing along (ux, uy), with a black edge
function arrowHead(ax, ay, ux, uy, c0, c1) {
  for (let b = -10; b <= 10; b++) for (let a = -10; a <= 10; a++) {
    const f = a * ux + b * uy, g = -a * uy + b * ux;
    if (f < -8 || f > 6) continue;
    const half = (6 - f) * 0.5;
    if (Math.abs(g) > half + 1) continue;
    put(Math.round(ax + a), Math.round(ay + b), Math.abs(g) > half || f < -7 ? BLK : (g < 0 ? c0 : c1));
  }
}
// the story's next goal (white, so it is not the stairs' gold). Round 48: always shown, step by
// step. Off screen: an arrow at the edge pointing the way to walk (along the ground, round walls and
// trees). On screen: a small arrow bobbing over it (people with a ! or ? show their own mark), plus
// the edge arrow when the way there is much longer than the straight line (behind a wall).
// round 64: a steady arrow (the user: it jolts and jitters and moves all over the place). It was
// re-aimed every frame at the farthest point of the path in plain sight, and drawn where that ray
// met the screen's edge, so it jumped along the edges and flicked on and off. Now: the aim is kept
// while it is still in sight (re-aimed when it is reached, lost behind something, or every 1.5 s),
// the arrow turns smoothly toward it, and it rides a ring round the hero instead of the screen's edge.
// The bobbing arrow over the goal comes in and out with some slack, so it doesn't flicker either.
const QA = { aim: null, tgt: null, ang: null, at: 0, ring: false, on: false, t0: 0 };
function drawStoryMark() {
  if (G.mode !== 'play' || hero.dead || G.fadeTo) { QA.ang = null; return; }
  if (LV.hub && storyOn() && storyStage() === 'hollow3') { const f = storyF(), pk = h3Pick(); for (const o of H3) { if (f[o.flag] || o === pk) continue; const [x, y] = iso(...h3Pos(o)), sx = x - camX, sy = y - camY - 16; if (!edgePip(sx, sy, o.col)) arrowHead(sx, sy - 14, 0, 1, o.col, o.col - 1); } }   // round 78: the other open objectives: a small mark at the edge, or over the place
  const t = (typeof storyTargetShown === 'function' ? storyTargetShown : storyTarget)(); if (!t) { QA.aim = null; QA.ang = null; return; }   // (round 103: below ground, only what has been seen)
  const dt = Math.min(0.1, Math.max(0, G.t - QA.t0)); QA.t0 = G.t;
  const d = Math.hypot(t[0] - hero.fi, t[1] - hero.fj); if (d < 1.6) { QA.ang = null; return; }
  if (!QA.tgt || Math.hypot(QA.tgt[0] - t[0], QA.tgt[1] - t[1]) > 2) QA.aim = null;   // a new goal
  QA.tgt = [t[0], t[1]];
  if (!QA.aim || G.t > QA.at || Math.hypot(QA.aim[0] - hero.fi, QA.aim[1] - hero.fj) < 1.5 || !clearLine(hero.fi, hero.fj, QA.aim[0], QA.aim[1])) {
    const w = wayTo(t); QA.aim = [hero.fi + w.dir[0], hero.fj + w.dir[1]]; QA.around = w.around; QA.at = G.t + 1.5;
  }
  // round 75 (the user: it sits too close to the hero and still jumps; the general direction is fine from far off).
  // Far from the goal (and no long way round) it points straight at the goal, which barely moves as you walk;
  // close in, or when the path doubles back, it follows the path. It turns slowly, ignores small changes,
  // and rides near the screen's edge.
  const far = d > 12 && !QA.around, [hx0, hy0] = iso(hero.fi, hero.fj), [ax0, ay0] = far ? iso(t[0], t[1]) : iso(QA.aim[0], QA.aim[1]), want = Math.atan2(ay0 - hy0, ax0 - hx0);
  if (QA.ang === null) QA.ang = want;
  else { let da = want - QA.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > (far ? 0.06 : 0.14)) QA.ang += Math.sign(da) * Math.min(Math.abs(da), Math.max(Math.abs(da) * 2.2, 0.5) * dt); }
  // the goal on screen (with slack: in when well inside, out when well outside)
  const [x, y] = iso(t[0], t[1]), sx = x - camX, sy = y - camY - 16, m = QA.on ? 4 : 18;
  QA.on = sx > m && sx < W - m && sy > 40 + m && sy < Math.round(H * 0.6) - m;
  const ac = t.col || 27, ac2 = t.col ? t.col - 1 : 26;
  if (QA.on && !(t.npc && typeof storyMarkFor === 'function' && storyMarkFor(t))) arrowHead(sx, sy - 14 + Math.sin(G.t * 4) * 1.5, 0, 1, ac, ac2);
  // the ring arrow round the hero: shown while the goal is off screen or the way is a long way round
  QA.ring = !QA.on || (QA.around && d > 6);
  if (QA.ring) {
    const ux = Math.cos(QA.ang), uy = Math.sin(QA.ang), cx = hx0 - camX, cy = hy0 - camY - 14, bob = Math.sin(G.t * 4) * 1.5;
    const ax = clamp(cx + ux * 104, 16, W - 16), ay = clamp(cy + uy * 92, 52, Math.round(H * 0.62));   // out near the edge of the view, clear of the hero and the fight
    arrowHead(Math.round(ax + ux * bob), Math.round(ay + uy * bob), ux, uy, ac, ac2);
  }
}
// the ! or ? a person on the story's next step already shows
function storyMarkFor(t) { const n = npcs.find(n => Math.abs(n.fi - t[0]) < 0.01 && Math.abs(n.fj - t[1]) < 0.01); return n ? storyMark(n.role) : null; }
// round 43b: the action button, above the health bars at the bottom middle. It shows only when
// there is something to do in reach (talk, buy, sell, free Aldo, unlock the mine) and says what
const ACT_POS = () => [W / 2 - 16, H - 76];
function actionTarget() {
  if (G.mode !== 'play' || hero.dead || G.fadeTo) return null;
  const n = nearTrader();
  if (n) return { n, label: n.role === 'merchant' ? 'SHOP' : n.role === 'smith' ? 'UPGRADE GEAR' : n.role === 'aldo' && LV.side === 'den' && G.story && G.story.f.alphaDead && !G.story.f.aldoFree ? 'FREE ALDO' : 'TALK' };
  const m = mineAction(); if (m) return m;
  const sa = stonesAction(); if (sa) return sa;
  const wa = wayAction(); if (wa) return wa;   // round 96: standing on a waystone
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
    const twoOn = hero.equip.weapon && ITEM_BASES[hero.equip.weapon.base].twoHand, shOn = !!hero.equip.shield;   // round 97: a paladin's two-hander and shield never swap each other out here
    for (const it of hero.bag) if (ITEM_BASES[it.base].slot === s && canWear(it) && !(s === 'shield' && twoOn) && !(ITEM_BASES[it.base].twoHand && shOn) && (!best || itemScore(it) > itemScore(best))) best = it;
    if (best && (!cur || itemScore(best) > itemScore(cur) + 0.5)) out.push(best);
  }
  return out;
}
// salvage from the bag (round 47): the smith's price in gold, anywhere; SALVAGE WORSE takes every
// bag item that loses to what is worn (or can't be worn), legendaries and set pieces excepted
function salvage(items) {
  let g = 0; for (const it of items) { const k = hero.bag.indexOf(it); if (k < 0) continue; hero.bag.splice(k, 1); g += itemValue(it); }
  if (!items.length) { INV.flash = { text: 'NOTHING TO SALVAGE', col: 24, t: G.t }; return; }
  hero.gold += g; INV.sel = null; sfx('gold'); INV.flash = { text: `SALVAGED ${items.length} FOR ${g} GOLD`, col: 50, t: G.t };
  const m0 = G.mode; G.mode = 'play'; saveGame(); G.mode = m0;
}
const junk = () => hero.bag.filter(it => ITEM_BASES[it.base].slot !== 'potion' && it.rarity !== 'legend' && it.rarity !== 'set' && (!canWear(it) || upgradeOf(it) < 0));
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
  L.close = { x: W - 56, y: 3, w: 52, h: 20 };   // round 75: a real button (it was a 24 x 14 'X' the user could not find)
  L.tabs = { inv: { x: 8, y: 5, w: 62, h: 16 }, skills: { x: 74, y: 5, w: 62, h: 16 } };
  L.color = { x: W - 66, y: 150, w: 54, h: 14 };
  L.best = { x: W - 66, y: 130, w: 54, h: 14 };
  L.junk = { x: W - 66, y: 110, w: 54, h: 14 };
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
  fillRect(L.close.x, L.close.y, L.close.w, L.close.h, 20); frame(L.close.x, L.close.y, L.close.w, L.close.h, 51, 49); textC('CLOSE', L.close.x + L.close.w / 2, L.close.y + 7, 27);
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
  bigHero(hero.look, 1, 'idle', Math.floor(G.t / 0.2) % 4, hero, 150, 148, L_ID);   // (round 50: the sharp sprite)
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
  { const r = L.junk, n = junk().length; fillRect(r.x, r.y, r.w, r.h, 4); frame(r.x, r.y, r.w, r.h, n ? 50 : 8, 3); textC(n ? `SALVAGE ${n}` : 'SALVAGE', r.x + r.w / 2, r.y + 5, n ? 50 : 24); }
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
    [...(b.slot === 'potion' ? [] : ['ITEM LEVEL ' + itemLvl(it)]), ...itemLines(it)].slice(0, 7).forEach((l, n) => text(cut(l), C.x + 6, vy + 9 + n * 7, n === 0 && b.slot !== 'potion' ? 24 : 26));
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
    if (fromBag && ITEM_BASES[it.base].slot !== 'potion') mk('SALVAGE', C.x + C.w / 2 - bw / 2, () => salvage([it]));   // round 47: break it down for gold, anywhere
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
  if (inRect(p, L.junk)) { salvage(junk()); return; }
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
  chain: 'A BOLT THAT JUMPS FROM FOE TO FOE, UP TO SIX, AND LIGHTNING FROM THE SKY STRIKES EACH ONE, HITTING WHAT STANDS NEAR. ALL ARE SHOCKED: 25% MORE DAMAGE FROM EVERYTHING FOR 3 SECONDS.',
  'chain/fork': 'SPLITS IN TWO AT EVERY JUMP: UP TO TEN FOES, EACH HIT A LITTLE LESS. FOR BIG PACKS.',
  'chain/overload': 'NO JUMPS: ONE HUGE STRIKE FROM THE SKY, TWICE AS WIDE, THAT STUNS EVERYTHING IN IT. FOR THE BIG ONES.',
  'chain/conductor': 'JUMPS TWICE AS FAR THROUGH CHILLED AND FROZEN FOES. CONE OF COLD FIRST.',
  blink: 'TELEPORT A SHORT WAY. GET OUT OF A CROWD OR AWAY FROM A BIG HIT.',
  'blink/burst': 'A BLAST WHERE YOU LAND THAT THROWS FOES BACK. BLINK IN AND KNOCK THEM AWAY.',
  'blink/double': 'A SECOND BLINK FOR FREE WITHIN 1.5 SECONDS. IN, THEN BACK OUT.',
  'blink/frost': 'FREEZES WHAT STOOD NEAR YOU WHEN YOU LEFT, SO THEY CANNOT FOLLOW.',
  slam: 'SLAM THE GROUND: A WAVE THAT HITS EVERY FOE IN AN ARC IN FRONT OF YOU.',
  'slam/ring': 'HITS ALL AROUND YOU WITH A SHORTER REACH. FOR WHEN THEY SURROUND YOU.',
  'slam/fissure': 'A LONG NARROW CRACK THAT RACES OUT AHEAD AND HITS FOES FAR AWAY IN A LINE.',
  'slam/after': 'A SECOND, WEAKER SLAM HALF A SECOND LATER. MORE DAMAGE FOR THE SAME FURY.',
  charge: 'SPRINT A LONG WAY BEHIND YOUR SHIELD, STRAIGHT THROUGH EVERY FOE IN THE WAY. NOTHING CAN HURT YOU AS YOU RUN. IT GOES WHERE YOU STEER.',
  'charge/ram': 'THE FIRST FOES YOU HIT ARE CARRIED ALONG AND CRUSHED AGAINST WHATEVER STOPS YOU.',
  'charge/again': 'AFTER A CHARGE YOU MAY CHARGE ONCE MORE WITHIN 2 SECONDS, FREE, ANY WAY YOU LIKE.',
  'charge/tremor': 'A FISSURE RACES UP THE PATH BEHIND YOU AND HITS EVERYTHING ON IT AGAIN.',
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
  pierce: 'SPENDS YOUR COMBO POINTS ON ONE HEAVY BOLT THROUGH EVERY FOE IN A LINE. EACH POINT MAKES IT FAR STRONGER: AT THREE, A BALLISTA BOLT.',
  'pierce/fire': 'SETS EVERYTHING IT GOES THROUGH ALIGHT.',
  'pierce/frost': 'CHILLS WHAT IT HITS. WITH THREE COMBO POINTS IT FREEZES THEM, READY TO SHATTER.',
  'pierce/twin': 'TWO BOLTS SIDE BY SIDE, EACH A LITTLE WEAKER. A WIDER LINE.',
  cluster: 'A LOBBED ARROW THAT BURSTS AND THROWS OUT BOMBLETS. SPENDS COMBO POINTS: TWO MORE BOMBLETS EACH.',
  'cluster/fire': 'EVERY BLAST LEAVES THE GROUND BURNING.',
  'cluster/frost': 'THE BOMBLETS FREEZE WHAT THEY HIT.',
  'cluster/big': 'NO BOMBLETS: ONE HUGE BLAST INSTEAD.',
  sentry: 'PLANTS A REPEATING CROSSBOW THAT SPRAYS BOLTS AT THE NEAREST FOE FOR 5 SECONDS, FASTER AS IT WARMS UP, THEN FALLS OVER AND BREAKS. ONE AT A TIME.',
  'sentry/ballista': 'SLOWER, HEAVY BOLTS THAT GO THROUGH EVERYTHING IN A LINE.',
  'sentry/fire': 'BURNING BOLTS, AND IT BURSTS INTO FLAME WHEN IT BREAKS.',
  'sentry/twin': 'PLANTS TWO AT ONCE, EACH A LITTLE SLOWER.',
  split: 'DRIVE THE WEAPON INTO THE FLOOR: A CRACK RACES TO THE EDGE OF THE SCREEN, SLABS HEAVE UP ALONG IT AND WHAT STANDS ON IT IS THROWN INTO THE AIR.',
  uproot: 'TEAR A SLAB OUT OF THE FLOOR AND HURL IT. IT BOUNDS THROUGH EVERYTHING IN ITS WAY AND BURSTS AT THE END OF ITS RUN.',
  crescent: 'ONE ENORMOUS SWING: A CRESCENT OF FORCE FLIES ACROSS THE SCREEN AND CUTS EVERYTHING IT PASSES.',
  skyfall: 'LEAP OUT OF SIGHT AND COME DOWN LIKE A METEOR ON THE THICKEST OF THEM. NOTHING CAN TOUCH YOU ON THE WAY.',
  rush: 'BLUR FROM FOE TO FOE, UP TO SIX, WITH A SLASH AT EACH. NOTHING CAN TOUCH YOU WHILE YOU GO.',
  hurl: 'GRAB THE NEAREST FOE, SWING IT ROUND AND THROW IT INTO THE PACK. IT KNOCKS DOWN WHAT IT HITS AND BURSTS WHERE IT LANDS. TOO BIG TO LIFT: A CRUSHING BLOW INSTEAD.',
  roar: 'A ROAR THAT SENDS A RED SHOCKWAVE THROUGH A WIDE CONE. FOES REEL, THE ORDINARY ONES PANIC AND RUN. GIVES BACK A FIFTH OF YOUR RAGE.',
  flurry: 'A DOZEN BLOWS IN A SECOND AND A HALF AT WHAT IS IN FRONT. THE LAST ONE LAUNCHES IT ACROSS THE ROOM INTO ANYTHING IN THE WAY.',
  strafe: 'FOR TWO SECONDS YOU RUN FREE AND FASTER WHILE ARROWS FLY ON THEIR OWN AT THE NEAREST FOES, ABOUT TWENTY OF THEM. KEEP MOVING.',
  'strafe/fire': 'EVERY ARROW BURNS.',
  'strafe/long': 'LASTS HALF AGAIN AS LONG.',
  'strafe/finale': 'ENDS WITH A RING OF SIXTEEN ARROWS FLYING OUT ALL ROUND YOU, THROUGH EVERYTHING.',
  vault: 'FLIP BACK OUT OF TROUBLE. A SNARE SNAPS OPEN WHERE YOU STOOD, SO WHATEVER CHASES YOU STEPS IN IT. YOUR NEXT 3 SHOTS FIRE TWO ARROWS EACH AND ALWAYS CRIT.',
  'vault/spike': 'THE TRAP SPRINGS A HEAVY SPIKE INSTEAD OF A SNARE.',
  'vault/smoke': 'SMOKE WHERE YOU STOOD DAZES EVERYTHING IN IT.',
  'vault/long': 'TWICE AS FAR, AND FIVE QUICKDRAW SHOTS.',
  hawk: 'A HAWK CIRCLES YOU FOR 30 SECONDS AND DIVES AT WHAT YOU SHOOT. EACH DIVE MARKS IT: 25% MORE DAMAGE FROM EVERYTHING.',
  'hawk/pair': 'TWO HAWKS.',
  'hawk/talons': 'EACH DIVE HITS TWICE AS HARD.',
  'hawk/screech': 'EACH DIVE STUNS FOR A MOMENT.',
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
function wrapText(s, n = 56) {   // (also the dialogue box's: one wrapper for both)
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
  if (G.mode === 'title') { if (cineTitleTap(p)) return; for (const b of UI.titleBtns || []) if (inRect(p, b)) { sfx('tap'); b.on(); } return; }   // (round 111: the opening takes its own taps)
  if (G.mode === 'cine') { cineTap(p); return; }   // round 89
  if (G.mode === 'inv') { sfx('tap'); invTap(p); return; }
  if (G.mode === 'talk') { talkTap(p); return; }
  if (G.mode === 'end') { endTap(p); return; }
  if (G.mode === 'skills') { sfx('tap'); skillsTap(p); return; }
  if (G.mode === 'ways') { waysTap(p); return; }   // round 96
  if (G.mode === 'shop') { shopTap(p); return; }
  if (G.mode === 'smith') { smithTap(p); return; }
  if (hero.dead > 2) { respawn(); return; }
  if (hitCircle(p, UI.bag)) { openInv('inv'); return; }
  if (guideFrozen()) return;   // round 45: stopped to show the bag button; only it answers
  if (hitCircle(p, UI.sound)) { setMuted(!SFX.muted); sfx('tap'); return; }
  if (hitCircle(p, UI.map)) { showMap = !showMap; return; }
  if (showMap && !LV.outdoor && UI.lightBtn && inRect(p, UI.lightBtn)) { setDL48(!DL48); sfx('tap'); return; }
  if (hitCircle(p, UI.portal)) { usePortal(); return; }
  if (hitCircle(p, UI.potion)) { drinkPotion(); return; }
  for (let i = 0; i < UI.skills.length; i++) if (hitCircle(p, UI.skills[i], 5)) { press.skill = i; useSkill(i); return; }
  if (ULTS[hero.cls] && hitCircle(p, UI.ult, 4)) { useUlt(); return; }
  { const a = actionTarget(); if (a && UI.act && inRect(p, UI.act)) { doAction(a); return; } }
  if (UI.h3 && G.mode === 'play') for (const r of UI.h3) if (inRect(p, r)) { G.h3sel = r.k; QA.aim = null; sfx('tap'); return; }   // round 78: pick which of the three the arrow leads to
  if (UI.tpPrompt && inRect(p, UI.tpPrompt)) { usePortal(); return; }   // round 64: the town portal prompt   // round 43b: the action button
  // round 42b: tap a person to walk over and talk. Round 51: on the move side a touch on a person still
  // starts the stick; it counts as a tap on them only if it lifts quickly without moving (endPointer),
  // so a thumb landing on someone no longer sends the hero walking off to them
  { const n = npcAtScreen(p); if (n) { if (p[0] < W * 0.55 && stick.id === null) { stick.tap = { n, id: e.pointerId, t: performance.now(), x: p[0], y: p[1] }; } else { hero.goTalk = n; hero.goTalkT = 6; return; } } }
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
  const T = stick.tap; stick.tap = null;
  if (T && T.id === e.pointerId && e.type === 'pointerup' && performance.now() - T.t < 300 && Math.hypot(stick.x - T.x, stick.y - T.y) < 4 && npcs.includes(T.n)) { hero.goTalk = T.n; hero.goTalkT = 6; }
  if (e.pointerId === stick.id) { stick.id = null; input.mx = input.my = 0; }
  if (e.pointerId === press.attack) { press.attack = null; input.attack = false; }
  press.skill = -1;
};
cvs.addEventListener('pointerup', endPointer);
cvs.addEventListener('pointercancel', endPointer);
// round 51: a touch the browser takes over (the iPhone's long-press magnifier, a system gesture) or the
// page losing focus must never leave the stick held: let everything go
cvs.addEventListener('lostpointercapture', endPointer);
const releaseAll = () => { stick.id = null; stick.tap = null; input.mx = input.my = 0; press.attack = null; input.attack = false; press.skill = -1; };
addEventListener('blur', releaseAll); document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
// and no long-press magnifier, text selection or callout over the game once past the title screen
// (the title's first tap still reaches the browser as a normal touch, which turns the sound on)
for (const ev of ['touchstart', 'touchmove']) cvs.addEventListener(ev, e => { if (G.mode !== 'title') e.preventDefault(); }, { passive: false });
cvs.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  audioInit();
  if (k === 'n') setMuted(!SFX.muted);
  if (G.mode === 'talk') { if (k === 'enter' || k === ' ' || k === 'j') { const L = talkLayout(); talkTap(L.btn ? [L.btn.x + 2, L.btn.y + 2] : [W / 2, 10]); } else if (G.talk && G.talk.reward && (k === '1' || k === '2' || k === '3')) talkTap([talkLayout().cards[+k - 1].x + 2, talkLayout().cards[+k - 1].y + 2]); e.preventDefault(); return; }
  if (G.mode === 'cine') { if (k === 'enter' || k === ' ' || k === 'j') cineTap(null); else if (k === 'escape') cineTap([W - 20, 10]); e.preventDefault(); return; }   // round 89
  if (G.mode === 'title' && TITLE.splash) { leaveSplash(); e.preventDefault(); return; }
  if (G.mode === 'title' && (k === 'enter' || k === ' ')) { const c = TITLE.sel || 'warrior'; startGame(!!loadSave(c), c); return; }
  if (G.mode === 'title' && (k === 'arrowleft' || k === 'arrowright')) { const L = ['warrior', 'paladin', 'mage', 'ranger'], n = L.indexOf(TITLE.sel || 'warrior'); titlePick(L[(n + (k === 'arrowleft' ? 3 : 1)) % 4]); return; }
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
  if (k === 'escape' && G.mode === 'ways') closeWays();
  if (k === 'escape' && (G.mode === 'shop' || G.mode === 'smith')) closeShop();
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
let last = performance.now(), fpsN = 0, fpsT = 0, fpsShown = 0, workSum = 0, workMax = 0, workShown = 0, workWorst = 0;
let SHOW_FPS = false; try { SHOW_FPS = localStorage.getItem('dcg-fps') === '1'; } catch (e) { /* storage blocked */ }
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  fpsN++; fpsT += dt; if (fpsT > 1) { fpsShown = fpsN; workShown = workSum / fpsN; workWorst = workMax; fpsN = 0; fpsT = 0; workSum = 0; workMax = 0; }
  const w0 = performance.now();
  update(dt);
  warmStep(G.mode === 'play' ? 2 : 10);
  if (G.mode === 'title' && !LV.rooms.length) titleScene();
  render();
  { const w = performance.now() - w0; workSum += w; if (w > workMax) workMax = w; }
  requestAnimationFrame(tick);
}
// the title screen shows a real level behind it
function titleScene() { newHero(); startLevel(1, 4242); G.msg = []; }
addEventListener('resize', fitCanvas);
if (typeof ResizeObserver !== 'undefined' && document.getElementById('stage')) new ResizeObserver(fitCanvas).observe(document.getElementById('stage'));
fitCanvas();
requestAnimationFrame(tick);
