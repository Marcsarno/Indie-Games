'use strict';
// Round 96: WAYSTONES (the user: like Diablo 4's, flat on the ground, walked onto, never in the way).
// A round stone slab set flush into the ground: a lip of fitted blocks, a ring of carved runes and a
// star in the middle. Walk over one and it wakes (its runes light blue); stand on a woken one and the
// action button says TRAVEL: a map of the act opens with where you are, every stone you have found
// and where the quest wants you; tap a stone, then TRAVEL. The camp's stone is awake from the start.
// Act I's hand-built areas (the Hollow, the Riverlands) have stones at set places; every other area
// (dungeon floors, the later acts' towns and wilds) has one near where you arrive. The King's hall
// and the side areas have none.
const WAY_R = 1.3;   // the slab's radius, in tiles
const WAY_STAND = 1.15;   // how close counts as standing on it
const hcl = (id, du = 0, ds = 0) => US(HCL[id].u + du, HCL[id].s + ds).map(v => v + 0.5);
const WAY_DEFS = {
  hub: () => [
    { id: 'camp', name: 'CAMP', at: CAMP_AT(0.3, -4.2) },   // in the middle of the camp, on the path from the gate to the fire
    { id: 'glade', name: 'WOLF GLADE', at: hcl('glade', -3, 2) },   // the way to the wolf den
    { id: 'graves', name: 'GRAVEYARD PATH', at: hcl('graves', 1, 1) },   // by the barrow
    { id: 'crossing', name: 'FALLEN TREE', at: hcl('crossing', 0, 2) },   // the road north, the watchtower (on the camp's side of the tree)
  ],
  riv: () => [
    { id: 'south', name: 'SOUTH ROAD', at: [51.5, 51.5] },   // just past where you arrive from the Hollow
    { id: 'farm', name: 'THE FARM', at: [42.6, 27.5] },
    { id: 'mine', name: 'THE OLD MINE', at: [21.5, 22.5] },
  ],
};
// which kind of area this is, for its stones: null where there are none
function wayArea() {
  if (LV.side || LV.arena || PREVIEW) return null;
  return LV.hub ? 'hub' : LV.riv ? 'riv' : 'gen';
}
// open ground for a slab near p: nothing solid under it and clear of the exits' pads
function wayFree(p) {
  const zs = exitZones(), ok = (fi, fj) => {
    for (let r = 0; r <= WAY_R * 0.95; r += WAY_R * 0.475) for (let a = 0; a < (r ? 8 : 1); a++) if (blocked(fi + Math.cos(a * 0.785) * r, fj + Math.sin(a * 0.785) * r)) return false;
    return !zs.some(z => Math.hypot(z.fi - fi, z.fj - fj) < z.r + WAY_R + 0.4);
  };
  for (let r = 0; r <= 6; r += 0.5) for (let a = 0; a < (r ? 12 : 1); a++) { const fi = p[0] + Math.cos(a * 0.5236) * r, fj = p[1] + Math.sin(a * 0.5236) * r; if (ok(fi, fj)) return [fi, fj]; }
  return p;
}
// after a level is generated (and before it is built): where its stones lie
function setupWays() {
  LV.ways = [];
  const A = wayArea(); if (!A) return;
  G.ways = G.ways || {};
  const defs = A === 'gen' ? [{ id: 'start', name: areaName(), at: LV.plaza ? [LV.plaza.x + 0.5, LV.plaza.y + 3.5] : [LV.start.cx + 0.5, LV.start.cy + 0.5] }] : WAY_DEFS[A]();
  for (const d of defs) {
    const [fi, fj] = A === 'hub' && d.id === 'camp' ? d.at : wayFree(d.at), key = LV.level + ':' + d.id;
    const w = { key, id: d.id, name: d.name, fi, fj, glow: 0 };
    LV.ways.push(w);
    if (d.id === 'camp' && !G.ways[key]) wake(w, true);   // the camp's stone is awake from the start
  }
  if (A !== 'gen') LV.spawns = LV.spawns.filter(sp => LV.ways.every(w => w.id === 'camp' || Math.hypot(sp.fi - w.fi, sp.fj - w.fj) > 6));   // nothing waits on a stone
  function wake(w, quiet) {
    G.ways[w.key] = { level: LV.level, seed: LV.seed, fi: w.fi, fj: w.fj, name: w.name, cyc: LV.cyc, area: A, floor: LV.floor || 0 };
    if (!quiet) wayWoke(w);
  }
  LV.wayWake = w => wake(w, false);
}
function wayWoke(w) {
  sfx('portal'); sfx('chest');
  say('WAYSTONE: ' + w.name, 39, 3);
  const [x, y] = iso(w.fi, w.fj);
  for (let k = 0; k < 26; k++) { const a = Math.random() * 6.283, r = 10 + Math.random() * 14; pspawn(4, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5, 2, Math.cos(a) * 6, Math.sin(a) * 3, 30 + Math.random() * 24, 0.9, Math.random() < 0.5 ? 40 : 27); }
  w.flash = 1;
  saveGame();
}
const wayOn = w => !!(G.ways && G.ways[w.key]);
function updateWays(dt) {
  for (const w of LV.ways || []) {
    const d = Math.hypot(w.fi - hero.fi, w.fj - hero.fj);
    if (!wayOn(w) && d < WAY_STAND && !hero.dead && LV.wayWake) LV.wayWake(w);
    w.glow += ((wayOn(w) && d < WAY_STAND + 0.4 ? 1 : 0) - w.glow) * Math.min(1, dt * 4);
    if (w.flash) w.flash = Math.max(0, w.flash - dt * 0.8);
    if (wayOn(w) && Math.random() < dt * (3 + w.glow * 10)) {   // motes rising off the runes
      const a = Math.random() * 6.283, [x, y] = iso(w.fi + Math.cos(a) * WAY_R * 0.6, w.fj + Math.sin(a) * WAY_R * 0.6);
      pspawn(4, x, y, 1, 0, 0, 14 + Math.random() * 12, 1.1, Math.random() < 0.7 ? 40 : 39);
    }
  }
}
// the action button: standing on a woken stone
function wayAction() {
  if (G.mode !== 'play' || hero.dead || G.fadeTo) return null;
  for (const w of LV.ways || []) if (wayOn(w) && Math.hypot(w.fi - hero.fi, w.fj - hero.fj) < WAY_STAND) return { label: 'TRAVEL', go: () => openWays(w) };
  return null;
}
// ---------------------------------------------------------------- the slab, on the detail layer
// One pixel of the stone at (di, dj) tiles from its middle: a palette index (| EMIS for the glowing
// runes) or -1 for bare ground. The light comes from the upper left of the screen, which is -fi.
const WAY_GLYPHS = [
  [[0, -1, 0, 1], [0, 0.2, 0.8, -0.6]], [[-0.7, 1, 0, -1], [0, -1, 0.7, 1]], [[0, -1, 0, 1], [0, -1, 0.7, -0.3], [0.7, -0.3, 0, 0.3]], [[-0.7, -1, 0.7, 1], [0.7, -1, -0.7, 1]],
  [[0, -1, 0, 1], [-0.7, -0.3, 0.7, -0.3]], [[-0.6, -1, -0.6, 1], [0.6, -1, 0.6, 1], [-0.6, -0.8, 0.6, 0.2]], [[0, -1, 0.7, 0], [0.7, 0, 0, 1], [0, 1, -0.7, 0], [-0.7, 0, 0, -1]], [[0, -1, 0, 1], [0, 1, 0.6, 0.5], [0, 0.3, 0.6, -0.2]],
];
function segD(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1); return Math.hypot(px - ax - dx * t, py - ay - dy * t); }
const WS = CAVE;   // the slab's stone: a cool grey, apart from the warm dirt and the crypts' brown stone
function wayPx(di, dj, on, t, glow) {
  const rr = Math.hypot(di, dj), d = rr / WAY_R;
  if (d > 1.07) return -1;
  const lit = rr > 0 ? -(di * 0.95 + dj * 0.31) / rr : 0;   // +1 facing the light
  if (d > 1) return lit < -0.15 ? K2 : -1;   // the slab's edge throws a thin shadow on the lower right
  const a = Math.atan2(dj, di), turn = (a / 6.2832 + 1) % 1;
  const rune = q => on ? (q > 0.82 + (1 - glow) * 0.12 ? 27 : q > 0.45 ? BLUE[3] : q > 0.15 ? BLUE[2] : BLUE[1]) | EMIS : K2;
  const wave = 0.5 + 0.5 * Math.sin(a * 2 - t * 2.4), q0 = 0.25 + wave * 0.45 + glow * 0.35;
  const grain = hash(Math.floor(di * 18 + 99), Math.floor(dj * 18 + 99), 71);
  if (d > 0.92) return lit > 0.4 ? WS[5] : lit < -0.35 ? WS[1] : grain < 0.2 ? WS[2] : WS[3];   // the lip
  if (d > 0.69) {   // the ring of fitted blocks, the groove inside it
    if (d < 0.715) return on ? rune(q0 * 0.7) : K2;
    const n = 10, f = (turn * n + 0.25) % 1, blk = Math.floor(turn * n + 0.25) % n;
    if (f < 0.06) return WS[1];   // the joints
    if (f < 0.12 && lit < 0) return WS[2];
    return grain < 0.12 ? WS[2] : (hash(blk, 5, 73) < 0.5 ? WS[4] : WS[3]) + (d > 0.86 && lit > 0.3 ? 1 : 0);
  }
  if (d > 0.47) {   // the rune band: a paler dressed stone with eight runes cut in it
    const g = Math.round(turn * 8) % 8, da = Math.atan2(Math.sin(a - g * 0.7854), Math.cos(a - g * 0.7854)), u = da * rr / 0.13, v = (d - 0.58) * WAY_R / 0.1;
    let cut = false;
    if (Math.abs(u) < 1.35 && Math.abs(v) < 1.35) for (const s of WAY_GLYPHS[g]) if (segD(u, v, s[0], s[1], s[2], s[3]) < 0.27) { cut = true; break; }
    if (cut) return on ? rune(q0 + (Math.sin(t * 3 + g * 1.7) * 0.15)) : WS[1];
    return grain < 0.1 ? WS[3] : WS[4];
  }
  if (d > 0.44) return on ? rune(q0 * 0.7) : K2;   // the inner groove
  // the middle: a four-pointed star (points up, down, left and right on screen) and a bead
  const sa = a - 0.7854, star = 0.42 * (0.34 + 0.66 * Math.pow(Math.abs(Math.cos(sa * 2)), 2.5));
  if (Math.abs(d - star) < 0.045 || d < 0.07) return on ? rune(0.55 + glow * 0.45 + Math.sin(t * 2) * 0.1) : BLUE[0];   // (asleep: a faint blue, so it reads as something to step on)
  if (d < star) return on && glow > 0.5 ? BLUE[1] | EMIS : WS[4];
  return grain < 0.12 ? WS[2] : WS[3];
}
function drawWays() {
  if (!LV.ways || !LV.ways.length) return;
  const t = G.t;
  for (const w of LV.ways) {
    const [wx, wy] = iso(w.fi, w.fj), cx = Math.round(wx * SPX) - cam2x, cy = Math.round(wy * SPX) - cam2y, rx = Math.ceil(WAY_R * 1.08 * 22.63 * SPX), ry = Math.ceil(rx / 2);
    if (cx + rx < 0 || cx - rx >= OW || cy + ry < 0 || cy - ry >= OH) continue;
    const on = wayOn(w), glow = Math.max(w.glow, w.flash || 0);
    for (let Y = Math.max(0, cy - ry); Y <= Math.min(OH - 1, cy + ry); Y++) {
      const y = (Y + cam2y) / SPX - WY0;
      for (let X = Math.max(0, cx - rx); X <= Math.min(OW - 1, cx + rx); X++) {
        const x = (X + cam2x) / SPX - WX0, di = (x + 2 * y) / 32 - w.fi, dj = (2 * y - x) / 32 - w.fj;
        const c = wayPx(di, dj, on, t, glow); if (c < 0) continue;
        if (c & EMIS) { ov32[Y * OW + X] = PAL32[c & 127]; continue; }
        const col = envCol((X + hx) >> 1, (Y + hy) >> 1, c, -2); if (col) ov32[Y * OW + X] = col;
      }
    }
  }
}
function wayGlows() {
  for (const w of LV.ways || []) { if (!wayOn(w)) continue; const [x, y] = iso(w.fi, w.fj); glowAt(x, y, 30 + Math.round(w.glow * 12), 0.16 + w.glow * 0.22 + (w.flash || 0) * 0.4, GLOW_BLUE); }
}

// ---------------------------------------------------------------- the travel map
// Act I is drawn as it lies: the Hollow at the bottom, the Riverlands north of it, and the mine's
// floors in a row at the top; the later acts as a list of their areas. Lit stones can be tapped.
const WAYS = { sel: null, from: null, cyc: 0, hits: [], cache: {} };
function openWays(from) { G.mode = 'ways'; WAYS.sel = null; WAYS.from = from ? from.key : null; WAYS.cyc = LV.cyc; clearInput(); sfx('portal'); }
function closeWays() { G.mode = 'play'; WAYS.sel = null; }
function wayTravel(key) {
  const w = G.ways[key]; if (!w) return;
  G.mode = 'play'; WAYS.sel = null; clearInput(); sfx('portal');
  const here = w.level === LV.level && !LV.side;
  G.fadeTo = () => {
    if (!here) { const seed = G.town && G.town.level === w.level ? G.town.seed : w.seed; G.sideBack = null; G.sideDown = null; startLevel(w.level, seed); }
    const s = (LV.ways || []).find(q => q.key === key) || w;
    hero.fi = s.fi + 0.35; hero.fj = s.fj + 0.6; hero.atk = -1; hero.clip = 'idle'; hero.goTalk = null;
    if (s.glow !== undefined) s.flash = 1;
    const [x, y] = iso(s.fi, s.fj); for (let k = 0; k < 20; k++) { const a = Math.random() * 6.283; pspawn(4, x + Math.cos(a) * 16, y + Math.sin(a) * 8, 2, 0, 0, 30 + Math.random() * 30, 0.9, Math.random() < 0.6 ? 40 : 27); }
    updateFov(hero.fi, hero.fj); say(w.name, 39, 2.5); saveGame();
  };
}
// where the quest wants you, wherever that is: [{ at: 'hub'|'riv'|'deep', p: [fi, fj] or floor, col }]
function questSpots() {
  if (!(G.story && LV.act === 0 && !(LV.loop > 0))) return [];
  const st = storyStage(), camp = HUB.camp, f = storyF();
  if (st === 'hollow3') return H3.filter(o => !f[o.flag]).map(o => ({ at: 'hub', p: h3Pos(o), col: o.col }));
  const M = { meet: ['hub', camp], wren: ['hub', camp], aldoBack: ['hub', camp], hollis: ['hub', camp], farmBack: ['hub', camp], letter: ['hub', camp], kingBack: ['hub', camp],
    den: ['hub', SIDES.den.door()], cage: ['hub', SIDES.den.door()], mine: ['riv', RIV.mine], farm: ['riv', [RIV.farm[0], RIV.farm[1] + 3]], cellar: ['riv', RIV.cellar], unlock: ['riv', RIV.mine], king: ['deep', 3], done: ['riv', RIV.gate] }[st];
  return M ? [{ at: M[0], p: M[1], col: 51 }] : [];
}
// where you are on the map
function waySelf() {
  if (LV.side) { const sd = SIDES[LV.side === 'barrow2' ? 'barrow' : LV.side]; return { at: sd.at === 'riv' ? 'riv' : 'hub', p: sd.door() }; }
  if (LV.hub) return { at: 'hub', p: [hero.fi, hero.fj] };
  if (LV.riv) return { at: 'riv', p: [hero.fi, hero.fj] };
  return { at: 'deep', p: LV.arena ? 3 : LV.floor };
}
// the two outdoor maps, painted once into small palette images
function wayMapImage(kind, w, h, proj) {
  const key = kind + w + 'x' + h; if (WAYS.cache[key]) return WAYS.cache[key];
  const img = new Uint8Array(w * h), inv = (X, Y) => proj.inv(X, Y);
  if (kind === 'hub') {
    const segs = [];
    const cAt = id => id === 'camp' ? HUB.camp : US(HCL[id].u, HCL[id].s).map(v => v + 0.5);
    for (const r of HOLLOW.roads) { const pts = [cAt(r.from), ...(r.via || []).map(p => US(p[0], p[1]).map(v => v + 0.5)), cAt(r.to)]; for (let k = 0; k + 1 < pts.length; k++) segs.push([...pts[k], ...pts[k + 1], r.w * 0.3]); }
    const water = []; for (const wt of HOLLOW.water) { const P = wt.path.map(p => US(p[0], p[1])); for (let k = 0; k + 1 < P.length; k++) water.push([...P[k], ...P[k + 1], wt.w * 0.48]); }
    const cliffs = []; for (const c of HOLLOW.cliffs) { const P = c.path.map(p => US(p[0], p[1])); for (let k = 0; k + 1 < P.length; k++) cliffs.push([...P[k], ...P[k + 1], c.w * 0.4]); }
    const cl = HOLLOW.clearings.map(c => [...US(c.u, c.s).map(v => v + 0.5), c.id === 'camp' ? 14 : c.r, c]);
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
      const [fi, fj] = inv(X, Y);
      if (fi < 1 || fj < 1 || fi > MW_HUB - 1 || fj > MW_HUB - 1) continue;
      let dc = 99, dr = 99, dw = 99, dk = 99;
      for (const c of cl) dc = Math.min(dc, Math.hypot(fi - c[0], fj - c[1]) - c[2]);
      for (const s of segs) dr = Math.min(dr, segD(fi, fj, s[0], s[1], s[2], s[3]) - s[4]);
      for (const s of water) dw = Math.min(dw, segD(fi, fj, s[0], s[1], s[2], s[3]) - s[4]);
      for (const s of cliffs) dk = Math.min(dk, segD(fi, fj, s[0], s[1], s[2], s[3]) - s[4]);
      const bay = BAYER[((Y & 3) << 2) | (X & 3)], o = Y * w + X;
      if (dw < 0) img[o] = WATER[2];
      else if (dk < 0) img[o] = S[2];
      else if (dr < 0.4) img[o] = DIRT[2];
      else if (dc < 0) img[o] = GRASS[2];
      else if (Math.min(dc, dr) < HOLLOW.woodsFringe) img[o] = bay < 0.5 ? LEAF[1] : LEAF[0];
      else if (Math.min(dc, dr) < HOLLOW.woodsFringe + 6) img[o] = bay < 0.25 ? LEAF[0] : 0;
    }
  } else {
    const roads = [[RIV.back, RIV.start], [RIV.start, [40, 40]], [[40, 40], [26, 26]], [[26, 26], [RIV.mine[0] + 1.5, RIV.mine[1] + 1.5]], [[40, 40], [44, 26]], [[44, 26], [RIV.farm[0], RIV.farm[1] + 3]], [[26, 26], [18, 36]], [[18, 36], [RIV.gate[0] + 1.5, RIV.gate[1] - 1.5]]];
    const fields = [{ x0: 38.5, y0: 11.5, x1: 48.5, y1: 17.5 }, { x0: 49.5, y0: 13.5, x1: 54.5, y1: 19.5 }];
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
      const [fi, fj] = inv(X, Y), o = Y * w + X, bay = BAYER[((Y & 3) << 2) | (X & 3)];
      if (fi < 2 || fj < 2 || fi > 62 || fj > 62) continue;
      let dr = 99; for (const [a, b] of roads) dr = Math.min(dr, segD(fi, fj, a[0], a[1], b[0], b[1]));
      const wall = Math.abs((fi - RIV.gate[0]) - (fj - RIV.gate[1])) < 0.9;
      if (wall) img[o] = S[3];
      else if (dr < 1.3) img[o] = DIRT[2];
      else if (fields.some(f => fi > f.x0 && fi < f.x1 && fj > f.y0 && fj < f.y1)) img[o] = (Math.floor(fj) & 1) ? STRAW[2] : STRAW[1];
      else if (Math.hypot(fi - RIV.mine[0], fj - RIV.mine[1]) < 5) img[o] = S[3];
      else if (dr < 5 || Math.hypot(fi - RIV.farm[0], fj - RIV.farm[1]) < 9) img[o] = GRASS[2];
      else img[o] = bay < 0.6 ? LEAF[1] : LEAF[0];
      if (fi < 3.2 || fj < 3.2 || fi > 60.8 || fj > 60.8) img[o] = bay < 0.4 ? LEAF[0] : 0;
    }
  }
  return (WAYS.cache[key] = img);
}
const MW_HUB = 100;
const ACT_NUM = ['I', 'II', 'III'];
function waysLayout() {
  const L = { close: { x: W - 56, y: 3, w: 52, h: 20 }, tabs: [] };
  const cycs = [...new Set(Object.values(G.ways || {}).map(w => w.cyc))].sort((a, b) => a - b);
  if (cycs.length > 1) cycs.forEach((c, n) => L.tabs.push({ x: 4 + n * 46, y: 27, w: 42, h: 16, cyc: c }));
  L.top = cycs.length > 1 ? 48 : 30;
  L.foot = H - 64;
  return L;
}
function drawWaysScreen() {
  fillRect(0, 0, W, H, 2);
  for (let y = 0; y < H; y += 2) for (let x = (y >> 1) & 1; x < W; x += 4) put(x, y, 3);
  const L = waysLayout(), pulse = Math.floor(G.t * 4) % 2, cyc = WAYS.cyc, act = cyc % 3;
  text('WAYSTONES', 6, 6, 51, 2);
  fillRect(L.close.x, L.close.y, L.close.w, L.close.h, 20); frame(L.close.x, L.close.y, L.close.w, L.close.h, 51, 49); textC('CLOSE', L.close.x + L.close.w / 2, L.close.y + 7, 27);
  for (const tb of L.tabs) { const sel = tb.cyc === cyc; fillRect(tb.x, tb.y, tb.w, tb.h, sel ? 5 : 3); frame(tb.x, tb.y, tb.w, tb.h, sel ? 51 : 8, sel ? 50 : 3); textC('ACT ' + ACT_NUM[tb.cyc % 3], tb.x + tb.w / 2, tb.y + 5, sel ? 27 : 25); }
  WAYS.hits = [];
  const mine = Object.entries(G.ways || {}).filter(([, w]) => w.cyc === cyc), self = cyc === LV.cyc ? waySelf() : null, quest = cyc === LV.cyc ? questSpots() : [];
  const pip = (x, y, key, name, lit, here) => {   // a stone on the map
    x = Math.round(x); y = Math.round(y);
    const sel = WAYS.sel === key, R = sel ? 5 : 4;
    for (let b = -R; b <= R; b++) for (let a = -R; a <= R; a++) { const d = Math.abs(a) + Math.abs(b) * 1.6; if (d > R + 0.5) continue; put(x + a, y + b, d > R - 0.8 ? BLK : !lit ? 6 : sel && pulse ? 27 : d < 1.5 ? 27 : BLUE[3]); }
    if (lit) { WAYS.hits.push({ x: x - 12, y: y - 10, w: 24, h: 20, key }); if (name) textC(name, x, y + 7, sel ? 51 : here ? 27 : 39); }
  };
  const youMark = (x, y) => { x = Math.round(x); y = Math.round(y); const b = Math.round(Math.sin(G.t * 5) * 1.5); for (let k = 0; k < 5; k++) for (let d = -k; d <= k; d++) put(x + d, y - 12 + k + b, k === 4 || Math.abs(d) === k ? BLK : 27); textC('YOU', x, y - 21 + b, 27); };
  const questMark = (x, y, col) => { x = Math.round(x); y = Math.round(y); const b = Math.round(Math.sin(G.t * 4 + x) * 1.5); arrowHead(x, y - 4 + b, 0, 1, col, col - 1); };
  if (act === 0) {   // ---- Act I, drawn as it lies
    const avail = L.foot - L.top - 6, deepH = 30, gap = 12;
    let kR = Math.min(2, (W - 12) / 128), kH = Math.min(1.6, (W - 6) / 180);
    const need = 64 * kR + 96 * kH, room = avail - deepH - gap * 2; if (need > room) { kR *= room / need; kH *= room / need; }
    const top = L.top + Math.max(0, Math.floor((room - 64 * kR - 96 * kH) / 2));
    const hubH = Math.round(96 * kH), rivH = Math.round(64 * kR), rivY = top + deepH + gap, hubY = rivY + rivH + gap;
    // the Riverlands: X = cx + (fi - fj) kR, Y = rivY + (fi + fj) kR / 2
    const rivW = Math.round(128 * kR), rivX = Math.round(W / 2 - rivW / 2);
    const projR = { to: (fi, fj) => [W / 2 + (fi - fj) * kR, rivY + (fi + fj) * kR / 2], inv: (X, Y) => { const a = (X + rivX - W / 2) / kR, b = (Y * 2) / kR; return [(a + b) / 2, (b - a) / 2]; } };
    const hubW = Math.min(W - 4, Math.round(180 * kH)), hubX = Math.round(W / 2 - hubW / 2);
    // the Hollow: (u, s) from the middle line; X = cx + 2u kH, Y = hubY + (s - 2) kH
    const projH = { to: (fi, fj) => [W / 2 + (fi - fj) * kH, hubY + ((fi + fj) / 2 - 2) * kH], inv: (X, Y) => { const u = (X + hubX - W / 2) / (2 * kH), s = Y / kH + 2; return [s + u, s - u]; } };
    const blitImg = (img, x0, y0, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = img[y * w + x]; if (v) put(x0 + x, y0 + y, v); } };
    blitImg(wayMapImage('riv', rivW, rivH, projR), rivX, rivY, rivW, rivH);
    blitImg(wayMapImage('hub', hubW, hubH, projH), hubX, hubY, hubW, hubH);
    // the deep: the mine's floors in a row at the top
    const deep = [['THE MINE', null], ['CRYPT 1', 1], ['CRYPT 2', 2], ["KING'S HALL", 3]], dw = 60, dx0 = Math.round(W / 2 - (deep.length * dw + (deep.length - 1) * 4) / 2), dPos = {};
    deep.forEach(([nm, fl], n) => { const x = dx0 + n * (dw + 4); fillRect(x, top, dw, deepH - 4, fl === 3 ? 19 : 4); frame(x, top, dw, deepH - 4, fl === 3 ? 21 : 7, 3); textC(nm, x + dw / 2, top + 3, fl === 3 ? 22 : 25); if (n) for (let k = 0; k < 3; k++) put(x - 3 + k, top + 12, 26); dPos[fl === null ? 'm' : fl] = [x + dw / 2, top + 16]; });
    // the way between the maps: a dotted road
    const dots = (a, b) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3); for (let k = 0; k <= n; k++) if (k % 2 === 0) put(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n), DIRT[3]); };
    dots(projH.to(...HUB.exit.map(v => v + 0.5)), projR.to(...RIV.back));
    dots(projR.to(...RIV.mine), [dPos.m[0], top + deepH - 4]);
    // names of the places
    textC('THE RIVERLANDS', W / 2 + 76, rivY + 6, 26); textC('THE HOLLOW', W / 2 - 84, hubY + 10, 26);
    const lbl = (p, nm, proj, col = 24) => { const [x, y] = proj.to(...p); textC(nm, Math.round(x), Math.round(y) + 3, col); };
    lbl(SIDES.den.door(), 'DEN', projH); lbl(SIDES.barrow.door(), 'BARROW', projH, 22); lbl(SIDES.tower.door(), 'TOWER', projH); lbl(RIV.cellar, 'FARM', projR); lbl(RIV.gate, 'GATE', projR);
    { const [x, y] = projH.to(...HUB.camp); for (let a = 0; a < 40; a++) { const t = a / 40 * 6.283; put(Math.round(x + Math.cos(t) * 12 * kH * 1.41), Math.round(y + Math.sin(t) * 12 * kH * 0.71), WOOD[2]); } put(Math.round(x), Math.round(y), FIRE[4]); }
    // the stones: every one this act has, lit when found
    const at = { hub: projH, riv: projR };
    for (const A of ['hub', 'riv']) for (const d of WAY_DEFS[A]()) {
      const lev = cyc * AREA_CYCLE + (A === 'hub' ? 1 : 2), key = lev + ':' + d.id, w = G.ways[key], [x, y] = at[A].to(...(w ? [w.fi, w.fj] : d.at));
      pip(x, y, key, w ? w.name : null, !!w, WAYS.from === key);
    }
    for (const fl of [1, 2]) { const key = (cyc * AREA_CYCLE + 2 + fl) + ':start', w = G.ways[key], [x, y] = dPos[fl]; pip(x, y + 3, key, null, !!w, WAYS.from === key); }
    for (const q of quest) { const P = q.at === 'deep' ? dPos[q.p] : at[q.at].to(...q.p); questMark(P[0], P[1], q.col); }
    if (self) { const P = self.at === 'deep' ? (dPos[self.p] || dPos.m) : at[self.at].to(...self.p); youMark(P[0], P[1]); }
  } else {   // ---- a later act: its areas as a list
    const lv0 = cyc * AREA_CYCLE + 1, names = [areaNameOf(lv0), areaNameOf(lv0 + 1), `${ACTS[act].name.replace(/^THE /, '')} 1`, `${ACTS[act].name.replace(/^THE /, '')} 2`];
    names.forEach((nm, n) => {
      const y = L.top + 6 + n * 52, key = (lv0 + n) + ':start', w = G.ways[key];
      fillRect(20, y, W - 40, 42, 4); frame(20, y, W - 40, 42, w ? 39 : 7, 3); text(nm, 30, y + 8, w ? 27 : 24);
      text(w ? 'WAYSTONE FOUND' : 'NOT FOUND YET', 30, y + 22, w ? 39 : 6);
      pip(W - 46, y + 21, key, null, !!w, WAYS.from === key);
      if (self && LV.level === lv0 + n && !LV.side) youMark(W - 70, y + 30);
    });
  }
  // the foot: the chosen stone and TRAVEL, or what to do
  const fy = L.foot;
  frame(4, fy, W - 8, 58, 8, 3);
  const sel = WAYS.sel && G.ways[WAYS.sel];
  if (sel) {
    textC(sel.name, W / 2, fy + 8, 27);
    const b = { x: W / 2 - 50, y: fy + 24, w: 100, h: 24 }; L.go = b;
    fillRect(b.x, b.y, b.w, b.h, 38); frame(b.x, b.y, b.w, b.h, pulse ? 27 : 40, 37); textC('TRAVEL', b.x + b.w / 2, b.y + 9, 27);
  } else {
    textC('TAP A GLOWING STONE TO TRAVEL', W / 2, fy + 10, 26);
    const st = typeof storyOn === 'function' && G.story && LV.act === 0 && !(LV.loop > 0) ? stageText(storyStage()) : '';
    if (st) { textC('QUEST:', W / 2, fy + 26, 50); textC(st, W / 2, fy + 36, 51); }
  }
  WAYS.L = L;
}
const areaNameOf = lv => { const A = areaOf(lv); return A.kind === 'town' ? AREA_NAMES.town[A.act % 3] : AREA_NAMES.forest[A.act % 3]; };
function waysTap(p) {
  const L = WAYS.L || waysLayout();
  if (inRect(p, L.close)) { sfx('tap'); closeWays(); return; }
  for (const tb of L.tabs) if (inRect(p, tb)) { sfx('tap'); WAYS.cyc = tb.cyc; WAYS.sel = null; return; }
  if (L.go && WAYS.sel && inRect(p, L.go)) { if (WAYS.sel === WAYS.from) { closeWays(); say('YOU ARE HERE', 26, 1.5); return; } wayTravel(WAYS.sel); return; }
  let best = null, bd = 1e9;
  for (const h of WAYS.hits) if (inRect(p, h)) { const d = Math.hypot(p[0] - h.x - h.w / 2, p[1] - h.y - h.h / 2); if (d < bd) { bd = d; best = h; } }
  if (best) { sfx('tap'); WAYS.sel = best.key; L.go = null; }
}
