// Round 113: real boss fights (the user: "2 or 3 moves with an actual mechanic that needs to be dodged ...
// some risk, some challenge", "I love its own entrance, and I love the push in"). Each act boss gets:
// - an entrance: the world stops, the camera pushes in on it while it roars, its title card shows;
// - three moves, each with a warning drawn on the ground that a player learns to read and step out of;
// - a second phase at half life (faster, the moves change);
// - a death: slow motion, the camera pushes in again, a boss's loot with the set piece still missing.
// The camera push is a zoom of the finished world picture toward the boss (ov32), under the HUD.
// First: THE ALPHA, in the Wolf Den (it was a big elite wolf with a borrowed blink).

const BOSS_KINDS = { den: 'alpha' };   // a side area's leader that fights as a boss
let bossFx = [];   // howl waves and rake slashes, drawn with the warnings
{ const sb0 = setupBoss; setupBoss = function (...a) {
  const r = sb0(...a); bossFx = [];
  const kind = LV.side && BOSS_KINDS[LV.side], e = kind && enemies.find(o => o.id === kind && alive(o));
  if (e && !e.bossKind) {
    boss = e; e.bossKind = kind; e.pw = null; e.maxHp = e.hp = Math.round(e.maxHp * 3.4);   // (a fight of about half a minute: every move, and the rage, get seen) e.special = 2.2; e.phase = 1; e.moves = 0; e.mv = null;
  }
  return r;
}; }
{ const ub0 = updateBoss; updateBoss = function (e, dt, d, dx, dy) { return e.bossKind === 'alpha' ? updateAlpha(e, dt, d, dx, dy) : ub0(e, dt, d, dx, dy); }; }
{ const de0 = damageEnemy; damageEnemy = function (e, ...a) {   // during a move a boss can be hurt but not stopped (a freeze still breaks it)
  const r = de0(e, ...a);
  if (e && e.bossKind && e.mv && alive(e)) { if (e.frozen > 0) { e.mv = null; e.leapZ = 0; e.special = 1.5; } else { e.hurt = 0; e.kb = [0, 0]; e.stun = 0; e.downT = 0; } }
  return r;
}; }

// ---------------------------------------------------------------- the Alpha
// POUNCE: it crouches and a red lane marks its leap; out of the lane it lands winded (open). Phase 2: twice, re-aimed.
// REND: close up, a red cone fills in front of it, then three rakes in that cone. Phase 2: a second cone on the other side.
// HOWL: a red ring round it fills; the howl hurts and throws back whoever is in it, and wolves pour in from the dark.
const AL = { wind: 0.75, speed: 15, maxLeap: 7, rendR: 2.9, rendArc: 0.95, howlR: 3.3 };
const alphaPack = e => enemies.filter(o => o.calledBy === e && alive(o)).length;
function updateAlpha(e, dt, d, dx, dy) {
  const p2 = e.phase === 2;
  if (e.phase === 1 && e.hp < e.maxHp * 0.5 && !e.mv) {   // enraged
    e.phase = 2; e.speedK = (e.speedK || 1) * 1.25; e.special = 1.0;
    say('THE ALPHA IS ENRAGED', 22, 2.5); sfx('cry'); sfx('growl'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.6);
    startBossCam(1.2, 1.45, true);
    return true;
  }
  if (p2 && Math.random() < dt * 10) { const [x, y] = screenOf(e); pspawn(3, x + (Math.random() - 0.5) * 18, y, 4 + Math.random() * 16, 0, 0, 10 + Math.random() * 10, 0.5, Math.random() < 0.5 ? 22 : 23); }   // a red haze
  e.special -= dt;
  if (e.mv) return alphaMove(e, dt, p2);
  if (e.special > 0 || d > 11 || !los(e.fi, e.fj, hero.fi, hero.fj)) return false;   // between moves: it fights like a wolf
  e.moves++;
  const pack = alphaPack(e);
  if (e.moves % 3 === 0 && pack < (p2 ? 5 : 3)) startHowl(e, p2);
  else if (d < 2.4) startRend(e, Math.atan2(dy, dx), p2, false);
  else startPounce(e, dx, dy, d, p2, false);
  return true;
}
function startPounce(e, dx, dy, d, p2, second) {
  let l = Math.min(AL.maxLeap, (d || 1) + 1.4); const ux = dx / (d || 1), uy = dy / (d || 1);
  for (let s = 0.5; s <= l; s += 0.25) if (!standable(e.fi + ux * s, e.fj + uy * s, 0.35)) { l = Math.max(1, s - 0.4); break; }   // not through walls
  e.mv = { kind: 'pounce', t: 0, wind: second ? 0.38 : AL.wind * (p2 ? 0.85 : 1), a: [e.fi, e.fj], b: [e.fi + ux * l, e.fj + uy * l], l, hit: false, second };
  e.atk = -1; e.dir = dirFrom(ux, uy); sfx('growl');
}
function startRend(e, ang, p2, second) {
  e.mv = { kind: 'rend', t: 0, wind: second ? 0.42 : 0.65 * (p2 ? 0.85 : 1), ang, rakes: 0, second };
  e.atk = -1; e.dir = dirFrom(Math.cos(ang), Math.sin(ang)); sfx('growl');
}
function startHowl(e, p2) {
  e.mv = { kind: 'howl', t: 0, wind: p2 ? 0.85 : 1.05 };
  e.atk = -1; e.dir = dirFrom(hero.fi - e.fi, hero.fj - e.fj); say('THE ALPHA HOWLS', 22, 1.4); sfx('growl');
}
function alphaMove(e, dt, p2) {
  const M = e.mv; M.t += dt;
  if (M.kind === 'pounce') {
    if (M.t < M.wind) { e.clip = 'attack'; e.atk = 0; e.leapZ = 0; return true; }   // crouched, the lane on the floor
    const dur = M.l / AL.speed, u = (M.t - M.wind) / dur;
    if (u < 1) {
      if (!M.sprang) { M.sprang = true; sfx('heavySwing'); }
      const fi = M.a[0] + (M.b[0] - M.a[0]) * u, fj = M.a[1] + (M.b[1] - M.a[1]) * u; tryMove(e, fi - e.fi, fj - e.fj, 0.35);
      e.leapZ = Math.sin(u * Math.PI) * 14; e.clip = 'attack'; e.atk = 300;
      if (!M.hit && Math.hypot(hero.fi - e.fi, hero.fj - e.fj) < 1.05) { M.hit = true; hurtHero(Math.round(roll(e.dmg) * 2.2), e); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.45); }
      return true;
    }
    if (!M.landed) {
      M.landed = true; e.leapZ = 0; e.atk = -1; const [x, y] = screenOf(e); burst(5, x, y, 1, 14, 50, LV.outdoor ? DIRT[3] : S[5]); sfx('thunk'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.25);
      if (p2 && !M.second && !hero.dead) { const dx = hero.fi - e.fi, dy = hero.fj - e.fj, d = Math.hypot(dx, dy); if (d > 1.2) { startPounce(e, dx, dy, d, p2, true); return true; } }
      M.rest = M.hit ? 0.35 : p2 ? 0.75 : 1.1;   // a miss leaves it winded: the moment to hit it
      if (!M.hit) floater('WINDED', e.fi, e.fj, e.def.chest + 26, 51);
    }
    e.clip = 'idle'; e.atk = -1;
    if (M.t - M.wind - dur > M.rest) { e.mv = null; e.special = p2 ? 1.7 : 2.6; e.cool = 0.4; }
    return true;
  }
  if (M.kind === 'rend') {
    e.dir = dirFrom(Math.cos(M.ang), Math.sin(M.ang));
    if (M.t < M.wind) { e.clip = 'attack'; e.atk = 0; return true; }
    const k = Math.floor((M.t - M.wind) / 0.15);   // three rakes, 0.15 s apart
    while (M.rakes < 3 && M.rakes <= k) {
      M.rakes++; sfx('swing'); e.atk = 120 + M.rakes * 90;
      bossFx.push({ kind: 'rake', fi: e.fi, fj: e.fj, ang: M.ang + (M.rakes - 2) * 0.35, t: 0, dur: 0.22 });
      const hx = hero.fi - e.fi, hy = hero.fj - e.fj, hd = Math.hypot(hx, hy), da = Math.abs(((Math.atan2(hy, hx) - M.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (hd < AL.rendR + 0.3 && (da < AL.rendArc || hd < 0.8)) { hurtHero(Math.round(roll(e.dmg) * 0.9), e); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.2); }
    }
    if (M.rakes >= 3 && M.t - M.wind > 0.5) {
      if (p2 && !M.second && !hero.dead) {   // the other side: toward wherever the hero went
        const ha = Math.atan2(hero.fj - e.fj, hero.fi - e.fi), side = ((ha - M.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI > 0 ? 1 : -1;
        startRend(e, M.ang + side * 1.25, p2, true); return true;
      }
      e.mv = null; e.atk = -1; e.special = p2 ? 1.6 : 2.4; e.cool = 0.5;
    }
    return true;
  }
  if (M.kind === 'howl') {
    e.clip = 'idle'; e.atk = -1; e.leapZ = M.t < M.wind ? Math.min(3, M.t * 6) : 0;   // it rears up
    if (M.t < M.wind) return true;
    if (!M.done) {
      M.done = true; sfx('cry'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.5);
      bossFx.push({ kind: 'wave', fi: e.fi, fj: e.fj, t: 0, dur: 0.4 });
      const hx = hero.fi - e.fi, hy = hero.fj - e.fj, hd = Math.hypot(hx, hy);
      if (hd < AL.howlR) { hurtHero(Math.round(roll(e.dmg) * 1.3), e); const k = (AL.howlR + 0.6 - hd) / (hd || 1); tryMove(hero, hx * k, hy * k, 0.3); }
      const n = Math.min(p2 ? 4 : 3, (p2 ? 5 : 3) - alphaPack(e));
      for (let q = 0, got = 0; q < 40 && got < n; q++) {   // out of the dark at the edge of sight, running in
        const a = Math.random() * 6.283, r = 6 + Math.random() * 2.5, fi = hero.fi + Math.cos(a) * r, fj = hero.fj + Math.sin(a) * r;
        if (!standable(fi, fj, 0.35) || Math.hypot(fi - e.fi, fj - e.fj) < 2) continue;
        const w = makeEnemy('wolf', fi, fj, enemies.length); w.state = 'hunt'; w.calledBy = e; enemies.push(w); got++;
        const [x, y] = iso(fi, fj); burst(5, x, y, 2, 8, 40, LV.outdoor ? DIRT[3] : S[5]);
      }
    }
    if (M.t > M.wind + 0.6) { e.mv = null; e.special = p2 ? 2.0 : 2.8; e.cool = 0.3; }
    return true;
  }
  e.mv = null; return false;
}

// ---------------------------------------------------------------- the warnings on the ground (drawn with the others)
function scrPx(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) scr[y * W + x] = c; }
function scrAt(fi, fj) { const [x, y] = iso(fi, fj); return [x - camX, y - camY]; }
function drawAlphaWarnings() {   // (bold: solid bright edges, a checker fill that grows as the move charges)
  const e = boss; if (!e || !e.bossKind || !alive(e) || !e.mv) return;
  const M = e.mv, pulse = Math.floor(G.t * 10) % 2, edge = (pulse ? RED[4] : RED[3]) | EMIS, fill = RED[2] | EMIS, u = Math.min(1, M.t / M.wind);
  const chk = (x, y) => ((Math.round(x) + Math.round(y)) & 1) === 0;
  if (M.kind === 'pounce' && M.t < M.wind) {   // the lane: two solid edges, the inside filling toward the landing
    const [ax, ay] = M.a, [bx, by] = M.b, l = M.l, nx = -(by - ay) / l, ny = (bx - ax) / l;
    for (let s = 0; s <= l; s += 0.04) {
      const fi = ax + (bx - ax) * s / l, fj = ay + (by - ay) * s / l;
      for (const o of [-0.62, -0.55, 0.55, 0.62]) { const [x, y] = scrAt(fi + nx * o, fj + ny * o); scrPx(x, y, edge); }
      if (s <= l * u) for (let o = -0.5; o <= 0.5; o += 0.06) { const [x, y] = scrAt(fi + nx * o, fj + ny * o); if (chk(x, y)) scrPx(x, y, fill); }
    }
    const [x, y] = scrAt(bx, by); for (let a = 0; a < 60; a++) { const t = a / 60 * 6.283; scrPx(x + Math.cos(t) * 16, y + Math.sin(t) * 8, edge); scrPx(x + Math.cos(t) * 15, y + Math.sin(t) * 7.5, edge); }   // where it lands
  }
  if (M.kind === 'rend' && M.t < M.wind) {   // the cone: solid edges and arc, a checker fill growing outward
    const R = AL.rendR, A = AL.rendArc;
    for (let r = 0.4; r <= R; r += 0.05) for (const s of [-1, 1]) { const [x, y] = scrAt(e.fi + Math.cos(M.ang + s * A) * r, e.fj + Math.sin(M.ang + s * A) * r); scrPx(x, y, edge); scrPx(x, y + 1, edge); }
    for (let q = -A; q <= A; q += 0.012) for (const rr of [R, R - 0.06]) { const [x, y] = scrAt(e.fi + Math.cos(M.ang + q) * rr, e.fj + Math.sin(M.ang + q) * rr); scrPx(x, y, edge); }
    for (let r = 0.4; r <= R * u; r += 0.05) for (let q = -A; q <= A; q += 0.025) { const [x, y] = scrAt(e.fi + Math.cos(M.ang + q) * r, e.fj + Math.sin(M.ang + q) * r); if (chk(x, y)) scrPx(x, y, fill); }
  }
  if (M.kind === 'howl' && M.t < M.wind) {   // the ring round it, solid, and the fill spreading out to it
    const [cx, cy] = scrAt(e.fi, e.fj), rx = AL.howlR * 22.6, ry = rx / 2;
    for (let a = 0; a < 320; a++) { const t = a / 320 * 6.283; for (const k of [1, 0.97]) scrPx(cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k, edge); }
    for (let y = -ry * u; y <= ry * u; y++) for (let x = -rx * u; x <= rx * u; x++) if ((x / rx) ** 2 + (y / ry) ** 2 <= u * u && chk(cx + x, cy + y)) scrPx(cx + x, cy + y, fill);
  }
}
function drawBossFx() {
  for (const f of bossFx) {
    const k = f.t / f.dur, [cx, cy] = scrAt(f.fi, f.fj);
    if (f.kind === 'wave') { const R = (0.6 + k * (AL.howlR + 0.8)) * 22.6; for (let a = 0; a < 220; a++) { const t = a / 220 * 6.283; if (k > 0.5 && a % 3 === 0) continue; scrPx(cx + Math.cos(t) * R, cy + Math.sin(t) * R / 2, (a & 1 ? 27 : 26) | EMIS); } }
    if (f.kind === 'rake') for (const o of [-0.25, 0, 0.25]) for (let r = 0.6; r <= AL.rendR * (0.5 + k * 0.5); r += 0.08) { const q = f.ang + o + (r - 1.5) * 0.18, [x, y] = scrAt(f.fi + Math.cos(q) * r, f.fj + Math.sin(q) * r); if (r > AL.rendR * k * 0.6) { scrPx(x, y - 6, (o ? 26 : 27) | EMIS); scrPx(x, y - 5, RED[4] | EMIS); } }
  }
}
{ const dt0 = drawTelegraph; drawTelegraph = function (...a) { const r = dt0(...a); drawAlphaWarnings(); drawBossFx(); return r; }; }

// ---------------------------------------------------------------- the camera: the entrance, the rage, the fall
// G.bossCam = { t, dur, z, freeze, at: [fi, fj] }: a push in on the boss (or where it fell); with freeze the world
// waits (the entrance and the rage), else it plays on (the death, already in slow motion).
function startBossCam(dur, z, freeze, at) { G.bossCam = { t: 0, dur, z, freeze: !!freeze, at: at || null }; if (freeze) clearInput(); }
const camCurve = C => { const k = Math.min(1, C.t / 0.45, (C.dur - C.t) / 0.5); return k <= 0 ? 0 : k * k * (3 - 2 * k); };
{ const up0 = update; update = function (dt) {
  const C = G.bossCam;
  if (C && C.freeze && G.mode === 'play' && !G.paused) {   // the world holds while the boss is shown
    C.t += dt; G.t += dt; if (G.bossIntro > 0) G.bossIntro -= dt;
    for (const m of G.msg) m.t -= dt; G.msg = G.msg.filter(m => m.t > 0);
    updateMusic(dt); updateParticles(dt);
    const b = boss; if (b && alive(b)) { b.clock += dt; b.dir = dirFrom(hero.fi - b.fi, hero.fj - b.fj); b.clip = C.t < C.dur * 0.75 ? 'attack' : 'idle'; b.atk = C.t < C.dur * 0.75 ? 0 : -1; b.leapZ = Math.max(0, Math.sin(Math.min(1, C.t / 0.6) * Math.PI) * 3); }   // it rears and roars
    if (C.t >= C.dur) { G.bossCam = null; if (b) { b.leapZ = 0; b.atk = -1; } }
    return;
  }
  const r = up0(dt);
  if (C && !C.freeze) { C.t += dt; if (C.t >= C.dur) G.bossCam = null; }
  for (const f of bossFx) f.t += dt; bossFx = bossFx.filter(f => f.t < f.dur);
  const b = boss;
  if (b && b.bossKind && b.introduced && !b.shown && alive(b) && G.mode === 'play') { b.shown = true; G.actCard = 0; G.bossIntro = 2.8; startBossCam(2.6, 1.9, true); sfx('growl'); }   // the entrance
  return r;
}; }
let bossZoomBuf = null;
{ const dh0 = drawHudLayer; drawHudLayer = function (...a) {
  const C = G.bossCam;
  if (C && G.mode === 'play' && (C.at || (boss && alive(boss)))) {
    const k = camCurve(C), z = 1 + (C.z - 1) * k;
    if (z > 1.005) {
      const [wx, wy] = C.at ? iso(C.at[0], C.at[1]) : screenOf(boss), fx = wx * SPX - cam2x, fy = (wy - 14) * SPX - cam2y;
      if (!bossZoomBuf || bossZoomBuf.length !== ov32.length) bossZoomBuf = new Uint32Array(ov32.length);
      bossZoomBuf.set(ov32);
      const cx = OW / 2, cy = OH * 0.45, ax = cx + (fx - cx) * k, ay = cy + (fy - cy) * k, iz = 1 / z;
      for (let y = 0; y < OH; y++) {
        let sy = Math.round(ay + (y - cy) * iz); sy = sy < 0 ? 0 : sy >= OH ? OH - 1 : sy; const row = sy * OW, d = y * OW;
        for (let x = 0; x < OW; x++) { let sx = Math.round(ax + (x - cx) * iz); sx = sx < 0 ? 0 : sx >= OW ? OW - 1 : sx; ov32[d + x] = bossZoomBuf[row + sx]; }
      }
    }
  }
  return dh0(...a);
}; }
// the fall: slow motion (set by the kill), the camera pushes in on the body, its name and FALLS
function bossSlain(e) {
  G.bossIntro = 0; G.slowmo = 1.4; sfx('levelUp'); sfx('cry');
  say(`${e.def.name} FALLS`, 51, 4);
  startBossCam(2.2, 1.5, false, [e.fi, e.fj]); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.7);
  const [x, y] = screenOf(e); burst(4, x, y, 20, 30, 70, 51); burst(5, x, y, 4, 24, 60, LV.outdoor ? DIRT[3] : S[5]);
}
