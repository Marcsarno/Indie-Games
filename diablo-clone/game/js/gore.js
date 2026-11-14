// Round 115 (the user: "work on the death animations ... more blood and gore and interesting deaths where it just
// really feels good to be zipping around quickly, killing these monsters"; asked how far: "Full Diablo gore").
// Bodies come apart. A piece is a part of the monster's own sprite, cut out when it dies (its head, its top half,
// its legs, a quarter), which then flies, spins by quarter turns, bleeds a trail, bounces and is pressed into the
// floor where it lands; blood pools spread under what is left and stay for the life of the level.
//   behead   the head flies off; the body stands a moment with a fountain at the neck, then topples
//   halved   the top half is thrown along the blow; the legs stand, spurt, and fall (a wolf: front and back)
//   gib      (was there) now with the head and two limbs among the chunks
//   bones    a skeleton: skull, ribs and legs fly apart; the skull rolls
//   burst    a spider: four quarters in a splash of green
//   smoke    a wraith: it tears upward into dark smoke
//   splat    slimes and mushrooms: two halves and a pool of their own colour
//   char     killed by fire: a blackened body stands burning, then drops; a scorch mark
//   fried    killed by lightning: the skeleton flashes through the black body, then it drops, smoking
//   ice      killed frozen or by cold: six blocks of ice skid apart
// damageEnemy asks goreKind (which death) and goreDeath (do it) and goreHit (every blow sprays); game.js keeps its
// plain death (the tipping corpse) for the rest, and that gets a smear where it slides and a pool where it lies.
const GORE_FAM = {   // where a body is cut, as shares of its drawn height from the top; quad: cut across its length instead
  fallen: { neck: 0.44, waist: 0.7 }, hero: { neck: 0.27, waist: 0.56 }, skeleton: { neck: 0.27, waist: 0.56 }, ogre: { neck: 0.3, waist: 0.6 },
  hound: { quad: true }, spider: { quad: true }, slime: { quad: true }, shroom: { quad: true },
};
const GORE_MAX = 34;
function goreBlood(e) {   // what it bleeds: [particle colour, pool ramp] or null (bone, cloth, wood)
  const F = e.fam;
  if (F === 'skeleton' || F === 'wraith' || F === 'treant') return null;
  if (F === 'spider') return [54, GREEN];
  if (F === 'slime' || F === 'shroom') { const c = goreMainCol(e); return [c, [LTAB[1][c], LTAB[2][c], c, c]]; }
  return [22, RED];
}
function goreMainCol(e) {   // the colour a body is mostly made of (a slime's own)
  if (e._gcol) return e._gcol;
  const sp = getSprite(e.fam, e.look, 1, 'idle', 0, e, 1), n = new Uint16Array(128); let best = 22, bn = 0;
  for (const v of sp.data) { if (!v || v === BLK || (v & EMIS)) continue; if (++n[v] > bn) { bn = n[v]; best = v; } }
  return (e._gcol = best);
}

// ---------------------------------------------------------------- cutting a sprite
function goreBox(sp) { let x0 = sp.w, y0 = sp.h, x1 = 0, y1 = 0; for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) if (sp.data[y * sp.w + x]) { if (x < x0) x0 = x; if (x >= x1) x1 = x + 1; if (y < y0) y0 = y; if (y >= y1) y1 = y + 1; } return x1 > x0 ? { x0, y0, x1, y1 } : null; }
function goreCut(sp, x0, y0, x1, y1, tint) {   // a part of a sprite as its own sprite, anchored at its centre; cx, cy: where that centre was (sprite px from the feet)
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const w = x1 - x0, h = y1 - y0; if (w < 2 || h < 2) return null;
  const data = new Uint8Array(w * h); let n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = sp.data[(y0 + y) * sp.w + x0 + x]; if (!v) continue; n++; if (tint && v !== BLK) v = tint[v & 127] || v; data[y * w + x] = v; }
  return n > 3 ? { w, h, data, ax: w >> 1, ay: h >> 1, px: sp.px || 1, cx: x0 + w / 2 - sp.ax, cy: y0 + h / 2 - sp.ay } : null;
}
function goreRot(p) {   // a quarter turn clockwise
  const w = p.h, h = p.w, data = new Uint8Array(w * h);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) data[x * w + (p.h - 1 - y)] = p.data[y * p.w + x];
  return { w, h, data, ax: w >> 1, ay: h >> 1, px: p.px };
}
function goreMeat(p, side, ramp) {   // the cut face: the two rows (or columns) at that side turn to meat, a bone showing in the middle
  if (!p || !ramp) return p;
  const vert = side === 'top' || side === 'bottom', N = vert ? p.h : p.w, M = vert ? p.w : p.h, at = (a, b) => vert ? a * p.w + b : b * p.w + a;
  let done = 0;
  for (let q = 0; q < N && done < 2 * p.px; q++) {
    const a = side === 'top' || side === 'left' ? q : N - 1 - q; let lo = M, hi = -1;
    for (let b = 0; b < M; b++) if (p.data[at(a, b)]) { if (b < lo) lo = b; if (b > hi) hi = b; }
    if (hi < 0) continue;
    for (let b = lo; b <= hi; b++) { const k = at(a, b); if (!p.data[k]) continue; p.data[k] = b === lo || b === hi ? BLK : Math.abs(b - (lo + hi) / 2) < p.px && ramp === RED ? BONE[3] : (b + a) & 1 ? ramp[2] : ramp[1]; }
    done++;
  }
  return p;
}
// both sizes of one part: the detail one that flies, the world one that is pressed into the floor
function gorePart(e, box, side, tint, ramp) {
  const out = {};
  for (const [key, px] of [['hi', SPX], ['lo', 1]]) {
    const sp = getSprite(e.fam, e.look, e.dir, 'idle', 0, e, px), b = goreBox(sp); if (!b) return null;
    const W0 = b.x1 - b.x0, H0 = b.y1 - b.y0;
    out[key] = goreMeat(goreCut(sp, b.x0 + W0 * box[0], b.y0 + H0 * box[1], b.x0 + W0 * box[2], b.y0 + H0 * box[3], tint), side, ramp);
    if (!out[key]) return null;
  }
  return out;
}
// a four-legged body is cut across its length: seen from the side that is left and right, seen head-on it is top and bottom
function goreHalves(e) { const b = goreBox(getSprite(e.fam, e.look, e.dir, 'idle', 0, e, 1)); return b && b.x1 - b.x0 < (b.y1 - b.y0) * 1.1 ? [[[0, 0, 1, 0.5], 'bottom'], [[0, 0.5, 1, 1], 'top']] : [[[0, 0, 0.5, 1], 'right'], [[0.5, 0, 1, 1], 'left']]; }
const CHAR_TINT = new Uint8Array(128);   // burned black: every colour at its darkest, eyes and glows put out
function goreTints() { if (CHAR_TINT[5]) return; for (let v = 0; v < 128; v++) CHAR_TINT[v] = v === BLK ? BLK : [2, 3, 3, 4][hash(v, 7) * 4 | 0]; }

// ---------------------------------------------------------------- pieces
function goreSpawn(e, part, o) {
  if (!part) return null;
  if (!G.gore) G.gore = [];
  const h = part.hi, k = h.px;
  const p = Object.assign({ hi: [h], lo: [part.lo], fi: e.fi + h.cx / k / 32, fj: e.fj - h.cx / k / 32, z: -h.cy / k + (e.leapZ || 0), vx: 0, vy: 0, vz: 0, ra: 0, vr: 0, b: 0, t: 0, bt: 0, hold: 0.05, rest: Math.max(1.5, Math.min(h.w, h.h) / k * 0.3), seed: Math.random() * 100 }, o);
  G.gore.push(p);
  if (G.gore.length > GORE_MAX) { const old = G.gore.find(q => !q.stand && !q.float); if (old) goreSettle(old); }
  return p;
}
const goreRotN = p => ((Math.round(p.ra) % 4) + 4) % 4;
function goreSprite(p, key) { const n = goreRotN(p), a = p[key]; while (a.length <= n) a.push(goreRot(a[a.length - 1])); return a[n]; }
function goreSettle(p) {   // pressed into the floor where it lies; a pool under what bleeds
  if (p.done) return; p.done = true;
  const [x, y] = iso(p.fi, p.fj);
  if (p.even && (goreRotN(p) & 1)) p.ra += 1;   // four legs never come to rest standing on end
  const sp2 = goreSprite(p, 'lo'), yy = y - Math.round(sp2.h * 0.3);
  blitWorld(sp2, x, yy, 0, -1, true);
  if (p.pool) gorePool(x, y + 1, p.pool, p.ramp, [sp2, x, yy]);
  if (p.scorch) stampBlood(Math.round(x), Math.round(y), 3, (Math.random() * 1e6) | 0, [2, 3, 3, 4, 5]);
}
function gorePool(x, y, R, ramp, over) { (G.pools = G.pools || []).push({ x: Math.round(x), y: Math.round(y), r: 1, R, ramp: ramp || RED, t: 0, seed: (Math.random() * 1e6) | 0, over }); }   // over: [sprite, x, y] the body lying in it, kept on top
function goreStampPool(p) {   // one more ring of the pool: an ellipse with a ragged, steady edge
  const rx = p.r * 2, ry = p.r;
  for (let y = Math.floor(p.y - ry); y <= p.y + ry; y++) for (let x = Math.floor(p.x - rx); x <= p.x + rx; x++) {
    if (x < 0 || y < 0 || x >= WW || y >= WH) continue;
    const dx = (x - p.x) / rx, dy = (y - p.y) / ry, d = dx * dx + dy * dy; if (d > 1 - hash(x, y, p.seed) * 0.35) continue;
    const k = y * WW + x; if (floorBuf[k] === BLK || !wFloor[k]) continue;
    setFloor(k, hash(x, y, p.seed + 1) < 0.04 ? p.ramp[3] : d < 0.4 ? p.ramp[2] : p.ramp[1]);
  }
  if (p.over) blitWorld(p.over[0], p.over[1], p.over[2], 0, -1, true);
}
function goreSpray(x, y, z, sx, sy, n, speed, col) {   // drops thrown along a screen direction: they stain where they land
  for (let k = 0; k < n; k++) { const s = speed * (0.4 + Math.random() * 0.8), a = (Math.random() - 0.5) * 1.1, ca = Math.cos(a), sa = Math.sin(a); pspawn(1, x, y, z * (0.5 + Math.random() * 0.6), (sx * ca - sy * sa) * s, (sx * sa + sy * ca) * s * 0.5, 30 + Math.random() * 90, 2, col); }
}
function updateGore(dt) {
  const L = G.gore || (G.gore = []);
  for (const p of L) {
    if (p.done) continue;
    p.t += dt;
    if (p.hold > 0) { p.hold -= dt; continue; }
    const [x, y] = iso(p.fi, p.fj);
    if (p.float) {   // torn upward into smoke
      p.z += 30 * dt; p.fi += Math.sin(p.t * 9 + p.seed) * 0.5 * dt; p.fade = Math.min(1, p.t / p.float);
      if (Math.random() < dt * 40) pspawn(8, x + (Math.random() - 0.5) * 14, y, p.z + (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 8, 6, 16 + Math.random() * 14, 0.9, Math.random() < 0.5 ? 2 : 3);
      if (p.t >= p.float) p.done = true;
      continue;
    }
    if (p.stand > 0) {   // still on its feet: a fountain from the cut, embers off the burned, sparks off the shocked
      p.stand -= dt;
      const top = p.z + goreSprite(p, 'hi').h / p.hi[0].px / 2;
      if (p.spurt) for (let k = 0; k < 3; k++) if (Math.random() < dt * 75) pspawn(1, x + (Math.random() - 0.5) * 3, y, top, (Math.random() - 0.5) * 36, (Math.random() - 0.5) * 14, 70 + Math.random() * 70 * Math.min(1, p.stand / 0.2 + 0.3), 2, p.spurt);
      if (p.embers && Math.random() < dt * 30) pspawn(3, x + (Math.random() - 0.5) * 10, y, Math.random() * top, (Math.random() - 0.5) * 8, 0, 18 + Math.random() * 16, 0.6, Math.random() < 0.5 ? 16 : 17);
      if (p.sparks && Math.random() < dt * 50) pspawn(2, x + (Math.random() - 0.5) * 12, y, Math.random() * top, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 40, 20 + Math.random() * 50, 0.25, Math.random() < 0.5 ? 27 : 118);
      if (p.stand <= 0) { p.vx = p.tip[0]; p.vy = p.tip[1]; p.vz = 46; p.vr = p.tipR * 9; p.turn = p.tipTurn === undefined ? 1 : p.tipTurn; p.flick = false; p.fl = 0; if (p.spurt) sfx('splat', 0.5); }
      continue;
    }
    p.vz -= 520 * dt; p.z += p.vz * dt; p.ra += p.vr * dt;
    if (p.turn !== undefined && Math.abs(p.ra) >= p.turn) { p.ra = Math.sign(p.ra) * p.turn; p.vr = 0; }
    const ni = p.fi + p.vx * dt, nj = p.fj + p.vy * dt;
    if (blocked(ni, nj)) { p.vx *= -0.4; p.vy *= -0.4; } else { p.fi = ni; p.fj = nj; }
    if (p.bleed) { p.bt -= dt; if (p.bt <= 0) { p.bt = 0.03; pspawn(1, x + (Math.random() - 0.5) * 4, y, p.z, (Math.random() - 0.5) * 24, (Math.random() - 0.5) * 12, 10 + Math.random() * 30, 2, p.bleed); } }
    if (p.z <= p.rest) {
      p.z = p.rest;
      if (p.vz < -70 && p.b < 2) {   // a bounce: a wet mark, half the speed
        p.b++; p.vz = -p.vz * 0.36; p.vx *= 0.55; p.vy *= 0.55; p.vr *= 0.6;
        if (p.bleed) { stampBlood(Math.round(x), Math.round(y), 1, (Math.random() * 1e6) | 0, p.ramp); burst(1, x, y, 2, 6, 50, p.bleed); sfx('splat', 0.35); } else sfx(p.bone ? 'clink' : 'thunk', 0.4);
      } else if (p.roll > 0 && Math.hypot(p.vx, p.vy) > 0.3) {   // a head rolls on
        p.roll -= dt; p.vz = 0; const f = Math.exp(-dt * 1.6); p.vx *= f; p.vy *= f; p.vr = Math.sign(p.vr || 1) * Math.hypot(p.vx, p.vy) * 4;
        if (p.bleed && Math.random() < dt * 30) stampBlood(Math.round(x), Math.round(y + 1), 0.4, (Math.random() * 1e6) | 0, p.ramp);
      } else goreSettle(p);
    }
  }
  if (L.some(p => p.done)) G.gore = L.filter(p => !p.done);
  // pools spread
  if (G.pools && G.pools.length) {
    for (const p of G.pools) { p.t += dt; if (p.t > 0.08) { p.t = 0; p.r = Math.min(p.R, p.r + 0.45); goreStampPool(p); if (p.r >= p.R) p.done = true; } }
    G.pools = G.pools.filter(p => !p.done);
  }
  // the plain death: a smear where the body slides, a pool where it comes to lie
  for (const e of enemies) {
    if (e.dying < 0 || e.goreDone) continue;
    if (e.dying > 3) { e.goreDone = true; continue; }
    const B = (e.deathKind === null || e.deathKind === undefined || e.deathKind === 'thrown') && goreBlood(e); if (!B) { e.goreDone = true; continue; }
    const [x, y] = screenOf(e);
    if (!e.corpse) { if ((e.deathV || e.throwV) && !(e.leapZ > 3)) stampBlood(Math.round(x), Math.round(y), 0.5, (e.seed * 31 + (e.dying * 40 | 0)) | 0, B[1]); }
    else { e.goreDone = true; gorePool(x, y + 1, e.def.unique ? 11 : e.def.elite || e.champ ? 8 : 5 + Math.random() * 2, B[1], [getSprite(e.fam, e.look, e.dir, 'death', 5, e, 1), x, y]); }
  }
}
function drawGore() {
  const L = G.gore; if (!L || !L.length) return;
  for (const p of L) {
    const [x, y] = iso(p.fi, p.fj), sx = Math.round(x - camX), sy = Math.round(y - camY); if (sx < -30 || sy < -30 || sx > W + 30 || sy > H + 60) continue;
    const o = clamp(sy - 6, 0, H - 1) * W + clamp(sx, 0, W - 1), l = lbuf[o], lv = (typeof TONE !== 'undefined' && !LV.outdoor ? TONE[Math.min(1023, (l * BANDS * 64) | 0)] : l * BANDS), level = Math.min(CHAR_CAP, Math.max(1, Math.round(lv)));
    const sp = goreSprite(p, 'hi'), air = p.z > p.rest + 2 && !p.stand && !p.float;
    if (air) { const X = Math.round(x * SPX) - cam2x, Y = Math.round(y * SPX) - cam2y, hw = Math.max(2, sp.w >> 2); for (let a = -hw; a <= hw; a++) { ovSet(X + a, Y, BLK); if (Math.abs(a) < hw - 1) ovSet(X + a, Y + 1, BLK); } }
    if (p.flick && p.alt && Math.floor(p.t * 26) % 2) { ovBlit(p.alt, p.ax, p.ay, LEVELS - 1, 0, 0, -1); continue; }   // lightning: the bones show through
    const fl = p.hold > 0 ? 1 : p.flick && Math.floor(p.t * 26) % 2 ? 1 : p.fl && p.stand > 0 && Math.floor(p.t * 16) % 3 === 0 ? p.fl : 0;
    ovBlit(sp, x, y - p.z, level, fl, p.fade || 0, -1);
  }
}

// ---------------------------------------------------------------- which death, and the death
function goreKind(e, el, dmg, crit, pow, small) {
  if (!small || e.def.treasure || FEEL_OLD) return;
  const F = e.fam, r = Math.random(), C = GORE_FAM[F];
  if (e.deathKind === 'ash') { e.deathKind = 'char'; return; }
  if (e.deathKind === 'shatter') { e.deathKind = 'ice'; return; }
  if (F === 'skeleton') { e.deathKind = 'bones'; return; }
  if (el === 'shock') { e.deathKind = 'fried'; return; }
  if (F === 'wraith') { e.deathKind = 'smoke'; return; }
  if (F === 'slime' || F === 'shroom') { e.deathKind = 'splat'; return; }
  if (F === 'spider') { e.deathKind = 'burst'; return; }
  if (e.deathKind === 'gib' || !C) return;
  const hard = crit || pow >= 2, mid = pow === 1 || el === 'heavy';
  if (C.neck) {
    if (hard) e.deathKind = r < 0.5 ? 'behead' : 'halved';
    else if (mid) { if (r < 0.3) e.deathKind = 'behead'; else if (r < 0.65) e.deathKind = 'halved'; }
    else if (r < 0.14) e.deathKind = 'behead'; else if (r < 0.24) e.deathKind = 'halved';
  } else if (F === 'hound' && r < (hard ? 0.6 : mid ? 0.4 : 0.14)) e.deathKind = 'halved';
}
function goreDeath(e, fromFi, fromFj, crit, pow) {
  const K = e.deathKind; if (!K || K === 'thrown') return false;
  goreTints();
  const d = Math.hypot(e.fi - fromFi, e.fj - fromFj) || 1, ux = (e.fi - fromFi) / d, uy = (e.fj - fromFj) / d, sx = (ux - uy) * 0.7, sy = (ux + uy) * 0.35;   // the blow: on the ground, and on the screen
  const [x, y] = screenOf(e), ch = e.def.chest * (e.look.scale || 1), B = goreBlood(e), col = B && B[0], ramp = B && B[1], C = GORE_FAM[e.fam] || {};
  const jit = k => (Math.random() - 0.5) * k, side = sx >= 0 ? 1 : -1;
  const quad = !C.neck, stand = (part, T, o) => goreSpawn(e, part, Object.assign({ stand: T, spurt: col, tip: [ux * 1.3, uy * 1.3], tipR: side, tipTurn: quad ? 0 : 1, even: quad, ramp, pool: col ? 6.5 : 0 }, o));
  const fly = (part, sp, vz, o) => goreSpawn(e, part, Object.assign({ vx: ux * sp + jit(1.4), vy: uy * sp + jit(1.4), vz, vr: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 8), bleed: col, ramp, pool: col ? 3 : 0, even: quad }, o));
  const whole = tint => gorePart(e, [0, 0, 1, 1], null, tint, null);
  if (K === 'behead' && C.neck) {
    const head = gorePart(e, [0, 0, 1, C.neck], 'bottom', null, ramp), body = gorePart(e, [0, C.neck, 1, 1], 'top', null, ramp); if (!head || !body) return false;
    fly(head, 2.4 + Math.random() * 1.8, 150 + Math.random() * 70, { roll: 0.7, pool: 2.4 }); stand(body, 0.36 + Math.random() * 0.12);
    goreSpray(x, y, ch * 1.5, sx, sy, 16, 110, col); burst(1, x, y, ch * 1.5, 12, 70, col); sfx('splat'); sfx('crit', 0.5);
  } else if (K === 'halved' && C.neck) {
    const top = gorePart(e, [0, 0, 1, C.waist], 'bottom', null, ramp), legs = gorePart(e, [0, C.waist, 1, 1], 'top', null, ramp); if (!top || !legs) return false;
    fly(top, 3 + Math.random() * 1.8, 110 + Math.random() * 50, { pool: 5.5 }); stand(legs, 0.3 + Math.random() * 0.1, { pool: 4.5 });
    goreSpray(x, y, ch, sx, sy, 26, 130, col); burst(1, x, y, ch, 14, 80, col); stampBlood(Math.round(x + sx * 14), Math.round(y + sy * 14), 3, (Math.random() * 1e6) | 0, ramp); sfx('splat'); sfx('heavySwing', 0.5);
  } else if (K === 'halved') {   // four legs: cut across
    const H = goreHalves(e), a = gorePart(e, H[0][0], H[0][1], null, ramp), b = gorePart(e, H[1][0], H[1][1], null, ramp); if (!a || !b) return false;
    const tall = H[0][1] === 'bottom', far = tall ? a : side > 0 ? b : a, near = far === a ? b : a;
    fly(far, 3 + Math.random() * 1.5, 100 + Math.random() * 50, { pool: 4.5 }); fly(near, 0.8, 50, { vr: 0, pool: 5 });
    goreSpray(x, y, ch, sx, sy, 24, 130, col); burst(1, x, y, ch, 14, 80, col); sfx('splat'); sfx('yelp', 0.7);
  } else if (K === 'gib') {
    gibBurst(e, fromFi, fromFj);   // the chunks and the splash that were there
    if (C.neck) { fly(gorePart(e, [0, 0, 1, C.neck], 'bottom', null, ramp), 2 + Math.random() * 2.5, 170 + Math.random() * 80, { roll: 0.7, pool: 1.6 }); for (const bx of [[0, C.waist, 0.5, 1], [0.5, C.waist, 1, 1]]) fly(gorePart(e, bx, 'top', null, ramp), 1.5 + Math.random() * 3, 120 + Math.random() * 90, { vx: ux * 2 + jit(5), vy: uy * 2 + jit(5), pool: 1.6 }); }
    else if (C.quad) for (const [bx, sd] of goreHalves(e)) fly(gorePart(e, bx, sd, null, ramp), 1.5 + Math.random() * 3, 120 + Math.random() * 90, { vx: ux * 2 + jit(5), vy: uy * 2 + jit(5), pool: 2 });
    goreSpray(x, y, ch, sx, sy, 22, 150, col); gorePool(x, y + 1, 7, ramp);
    return true;
  } else if (K === 'bones' && C.neck) {
    const skull = gorePart(e, [0, 0, 1, C.neck]), ribs = gorePart(e, [0, C.neck, 1, C.waist]), legs = gorePart(e, [0, C.waist, 1, 1]); if (!skull || !ribs || !legs) return false;
    const bone = { bleed: 0, pool: 0, bone: true }, k = crit || pow >= 1 ? 1.5 : 1;
    fly(skull, (2.2 + Math.random() * 1.8) * k, 140 + Math.random() * 70, Object.assign({ roll: 0.9 }, bone)); fly(ribs, (1.2 + Math.random()) * k, 90 + Math.random() * 40, bone); fly(legs, 0.5 * k, 50, Object.assign({}, bone, { vr: side * 6, turn: 1 }));
    burst(5, x, y, ch, 20, 90, e.look.bone === M.OLDBONE ? 25 : 26, sx * 40);
    for (let q = 0; q < 8; q++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 60; pspawn(6, x, y, 10 + Math.random() * 20, Math.cos(a) * s + sx * 40, Math.sin(a) * s * 0.5, 50 + Math.random() * 60, 3, 26); }
    sfx('clatter');
  } else if (K === 'burst') {
    for (const bx of [[0, 0, 0.5, 0.5], [0.5, 0, 1, 0.5], [0, 0.5, 0.5, 1], [0.5, 0.5, 1, 1]]) { const a = Math.atan2(bx[1] - 0.25 + jit(0.3), bx[0] - 0.25 + jit(0.3)) + Math.atan2(uy, ux) * 0.3; fly(gorePart(e, bx, null, null, null), 0, 90 + Math.random() * 70, { vx: Math.cos(a) * 2.6 + ux, vy: Math.sin(a) * 2.6 + uy, pool: 1.5 }); }
    burst(1, x, y, ch + 4, 46, 130, col, sx * 30); goreSpray(x, y, ch + 4, sx, sy, 20, 120, col); gorePool(x, y + 1, 7, ramp); sfx('splat'); sfx('hiss', 0.7);
  } else if (K === 'smoke') {
    const w = whole(); if (!w) return false;
    goreSpawn(e, w, { float: 0.7, hold: 0.03 });
    for (let q = 0; q < 26; q++) pspawn(8, x + jit(16), y, Math.random() * ch * 1.6, jit(20), 8, 20 + Math.random() * 30, 0.6 + Math.random() * 0.6, q % 3 ? 2 : 3);
    burst(4, x, y, ch, 8, 60, 118); sfx('cry', 0.45);
  } else if (K === 'splat') {
    goreHalves(e).forEach(([bx], n) => fly(gorePart(e, bx, null, null, null), 0.6, 80 + Math.random() * 50, { vx: (n ? 1 : -1) * 1.6 + ux, vy: (n ? -1 : 1) * 1.6 + uy, pool: 2.5 }));
    burst(1, x, y, ch, 30, 110, col, sx * 30); gorePool(x, y + 1, 5.5, ramp); sfx('splat');
  } else if (K === 'char' || K === 'fried') {
    const w = whole(CHAR_TINT); if (!w) return false;
    const P = goreSpawn(e, w, { stand: K === 'char' ? 0.5 : 0.42, tip: [ux * 1.2, uy * 1.2], tipR: side, tipTurn: quad ? 0 : 1, even: quad, scorch: true, embers: K === 'char', sparks: K === 'fried', fl: K === 'char' ? 7 : 0, flick: K === 'fried' });
    if (K === 'fried' && P) { if (C.neck && e.fam !== 'skeleton') { P.alt = getSprite('skeleton', MONSTERS.skeleton.look, e.dir, 'idle', 0, null); P.ax = x; P.ay = y; } burst(2, x, y, ch, 16, 120, 27); sfx('zap', 0.6); }
    else { burst(3, x, y, ch, 12, 30, 16); sfx('fireball', 0.4); }
  } else if (K === 'ice') {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { const a = Math.random() * 6.283; fly(gorePart(e, [c / 2, r / 3, (c + 1) / 2, (r + 1) / 3], null, ICE_TINT, null), 0, 40 + Math.random() * 90, { vx: Math.cos(a) * 2.2 + ux * 1.5, vy: Math.sin(a) * 2.2 + uy * 1.5, bleed: 0, pool: 0, bone: true, roll: 0.5 }); }
    burst(5, x, y, ch, 22, 100, 118); burst(2, x, y, ch, 12, 90, 117); sfx('clink'); e.shattered = true;
  } else return false;
  e.corpse = true; e.goreDone = true;   // the pieces are the body now
  return true;
}
// every blow that draws blood throws some of it on along the blow
function goreHit(e, fromFi, fromFj, crit, pow) {
  const B = goreBlood(e); if (!B) return;
  const d = Math.hypot(e.fi - fromFi, e.fj - fromFj) || 1, ux = (e.fi - fromFi) / d, uy = (e.fj - fromFj) / d, [x, y] = screenOf(e);
  goreSpray(x, y, e.def.chest, (ux - uy) * 0.7, (ux + uy) * 0.35, crit ? 12 : pow >= 1 ? 8 : 3, crit ? 130 : 100, B[0]);
  if (crit || pow >= 2) stampBlood(Math.round(x + (ux - uy) * 12), Math.round(y + (ux + uy) * 6), 2, (Math.random() * 1e6) | 0, B[1]);
}

// ---------------------------------------------------------------- wiring
{ const r0 = resetFx; resetFx = function (...a) { const r = r0(...a); G.gore = []; G.pools = []; return r; }; }
{ const u0 = updateDebris; updateDebris = function (dt) { u0(dt); updateGore(dt); }; }
{ const d0 = drawEliteFx; drawEliteFx = function (...a) { drawGore(); return d0(...a); }; }
