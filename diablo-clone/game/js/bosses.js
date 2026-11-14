// Round 113: real boss fights (the user: "2 or 3 moves with an actual mechanic that needs to be dodged ...
// some risk, some challenge", "I love its own entrance, and I love the push in"). Each act boss gets:
// - an entrance: the world stops, the camera pushes in on it while it roars, its title card shows;
// - three moves, each with a warning drawn on the ground that a player learns to read and step out of;
// - a second phase at half life (faster, the moves change);
// - a death: slow motion, the camera pushes in again, a boss's loot with the set piece still missing.
// The camera push is a zoom of the finished world picture toward the boss (ov32), under the HUD.
// First: THE ALPHA, in the Wolf Den (it was a big elite wolf with a borrowed blink).

const BOSS_KINDS = { den: 'alpha', tower: 'gchief', cellar: 'banditchief', barrow2: 'barrowwight' };   // a side area's leader that fights as a boss (round 113c: all of Act I's)
const BOSS_HP = { alpha: 3.4, gchief: 3.4, banditchief: 3.4, barrowwight: 1.0, skelking: 1.5 };   // life x: a fight of about half a minute, every move and the rage seen (the leaders were elites; the Wight and the King already bosses)
let bossFx = [];   // howl waves and rake slashes, drawn with the warnings
{ const sb0 = setupBoss; setupBoss = function (...a) {
  const r = sb0(...a); bossFx = [];
  const kind = LV.side ? BOSS_KINDS[LV.side] : LV.arena === 'king' ? 'skelking' : null, e = kind && enemies.find(o => o.id === kind && alive(o));
  if (e && !e.bossKind) {
    boss = e; e.bossKind = kind; e.pw = null; e.maxHp = e.hp = Math.round(e.maxHp * (BOSS_HP[kind] || 2));
    e.special = 2.2; e.phase = 1; e.moves = 0; e.mv = null;   // (round 113c: a comment had swallowed this line: the Alpha never raged or howled)
  }
  return r;
}; }
{ const ub0 = updateBoss; updateBoss = function (e, dt, d, dx, dy) { const f = e.bossKind && BOSS_UPDATE[e.bossKind]; return f ? f(e, dt, d, dx, dy) : ub0(e, dt, d, dx, dy); }; }
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
{ const dt0 = drawTelegraph; drawTelegraph = function (...a) { const r = dt0(...a); drawAlphaWarnings(); drawWarns(); drawBossFx(); drawBossFx2(); return r; }; }

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
  tickBossFx(dt);
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
  say(`${e.def.name.startsWith('THE ') ? e.def.name : 'THE ' + e.def.name} FALLS`, 51, 4);
  bossFx = bossFx.filter(f => f.kind === 'wave');   // (its axes, barrels and beams go with it)
  if (e.id === 'skelking' && typeof finaleDue === 'function' && finaleDue()) startFinale(); else if (!LV.side) say('THE WAY DOWN IS OPEN', 26, 4);
  startBossCam(2.2, 1.5, false, [e.fi, e.fj]); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.7);
  const [x, y] = screenOf(e); burst(4, x, y, 20, 30, 70, 51); burst(5, x, y, 4, 24, 60, LV.outdoor ? DIRT[3] : S[5]);
}

// ================================================================ round 113c: the rest of Act I's bosses
// Shared: a move is e.mv = { kind, t, wind, warn: [shapes] }; the shapes are drawn on the ground in bold red and fill
// as the move charges (a shape's own t0/dur, else the move's wind-up): lane {a, b, w}, cone {c, ang, R, arc},
// disc {c, R} (a filled circle). Hazards that outlive a move live in bossFx with a tick: fire fields (the elites'
// fire patches), beams, thrown axes, rolling barrels, hands out of the ground.
const BOSS_UPDATE = { alpha: (...a) => updateAlpha(...a), gchief: (...a) => updateGChief(...a), banditchief: (...a) => updateBandit(...a), barrowwight: (...a) => updateWight(...a), skelking: (...a) => updateKingB(...a) };
const bSegDist = (p, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1, t = clamp(((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l2, 0, 1); return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vy * t); };
const angDiff = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
const heroAt = () => [hero.fi, hero.fj];
function laneEnd(e, ux, uy, max) { let l = max; for (let s = 0.5; s <= max; s += 0.25) if (!standable(e.fi + ux * s, e.fj + uy * s, 0.35)) { l = Math.max(1, s - 0.4); break; } return l; }
function hitHero(e, k, shake = 0.3) { hurtHero(Math.round(roll(e.dmg) * k), e); if (SHAKE) G.trauma = Math.min(1, G.trauma + shake); }
function summonAround(e, id, n, c, r0, r1) {
  let got = 0;
  for (let q = 0; q < 50 && got < n; q++) {
    const a = Math.random() * 6.283, r = r0 + Math.random() * (r1 - r0), fi = c[0] + Math.cos(a) * r, fj = c[1] + Math.sin(a) * r;
    if (!standable(fi, fj, 0.35) || Math.hypot(fi - hero.fi, fj - hero.fj) < 1.5) continue;
    const w = makeEnemy(id, fi, fj, enemies.length); w.state = 'hunt'; w.calledBy = e; enemies.push(w); got++;
    const [x, y] = iso(fi, fj); burst(5, x, y, 2, 8, 40, LV.outdoor ? DIRT[3] : S[5]);
  }
}
const called = e => enemies.filter(o => o.calledBy === e && alive(o)).length;
function fireField(e, c, R, dur) { for (let y = -R; y <= R; y += 0.55) for (let x = -R; x <= R; x += 0.55) { if (x * x + y * y > R * R) continue; const fi = c[0] + x + (Math.random() - 0.5) * 0.2, fj = c[1] + y + (Math.random() - 0.5) * 0.2; if (standable(fi, fj, 0.1)) G.eliteFire.push({ fi, fj, t: dur * (0.85 + Math.random() * 0.3), arm: 0.05, dmg: e.dmg, src: e, weak: false }); } }
function blast(e, c, R, k) { const [x, y] = iso(c[0], c[1]); for (let q = 0; q < 26; q++) { const a = q / 26 * 6.283; pspawn(3, x, y, 3, Math.cos(a) * 70, Math.sin(a) * 35, 30 + Math.random() * 40, 0.5, q % 2 ? 16 : 17); } sfx('boom'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.3); if (Math.hypot(hero.fi - c[0], hero.fj - c[1]) < R) hitHero(e, k, 0.2); }
// a boss's rage at half life: a roar, a short push in, faster; `extra` for its own change
function enrage(e, line, extra) { e.phase = 2; e.speedK = (e.speedK || 1) * 1.2; e.special = 1.0; say(line, 22, 2.5); sfx('cry'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.6); startBossCam(1.2, 1.45, true); if (extra) extra(); }

// ---------------------------------------------------------------- hazards over time
function tickBossFx(dt) {
  for (const f of bossFx) {
    f.t += dt;
    if (f.kind === 'beam' && f.t > f.at && !hero.dead && G.t > (f.next || 0) && bSegDist(heroAt(), f.a, f.b) < f.w) { f.next = G.t + 0.35; hitHero(f.src, 0.45, 0.1); hero.chillT = Math.max(hero.chillT || 0, 1.5); }
    if (f.kind === 'axe') {   // out along its line and back to the hand
      const u = f.t / f.dur, k = u < 0.5 ? u * 2 : (1 - u) * 2, home = alive(f.src) ? [f.src.fi, f.src.fj] : f.a; f.p = [home[0] + (f.b[0] - home[0]) * k, home[1] + (f.b[1] - home[1]) * k];
      const leg = u < 0.5 ? 'out' : 'back'; if (!f[leg] && Math.hypot(hero.fi - f.p[0], hero.fj - f.p[1]) < 0.75) { f[leg] = true; hitHero(f.src, 1.1, 0.25); }
      if (Math.floor(f.t * 9) !== f.ws) { f.ws = Math.floor(f.t * 9); sfx('swing', 0.35); }
    }
    if (f.kind === 'barrel') {   // rolls down its lane; bursts at its end or on the hero
      const u = Math.min(1, f.t / f.dur); f.p = [f.a[0] + (f.b[0] - f.a[0]) * u, f.a[1] + (f.b[1] - f.a[1]) * u];
      if (!f.done && (u >= 1 || Math.hypot(hero.fi - f.p[0], hero.fj - f.p[1]) < 0.7)) { f.done = true; f.dur = f.t + 0.01; blast(f.src, f.p, 1.4, 1.3); }
    }
    if (f.kind === 'hands' && !f.hit && f.t > 0.05) { f.hit = true; if (Math.hypot(hero.fi - f.c[0], hero.fj - f.c[1]) < f.r) { hitHero(f.src, 0.8, 0.15); hero.chillT = Math.max(hero.chillT || 0, 2); } }
  }
  bossFx = bossFx.filter(f => f.t < f.dur);
}
function drawBossFx2() {
  const t = G.t;
  for (const f of bossFx) {
    if (f.kind === 'beam' && f.t > f.at) {   // a frost beam: pale, flickering
      const l = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]), nx = -(f.b[1] - f.a[1]) / l, ny = (f.b[0] - f.a[0]) / l;
      for (let s = 0; s <= l; s += 0.05) for (let o = -f.w * 0.8; o <= f.w * 0.8; o += 0.08) { const fi = f.a[0] + (f.b[0] - f.a[0]) * s / l + nx * o, fj = f.a[1] + (f.b[1] - f.a[1]) * s / l + ny * o, [x, y] = scrAt(fi, fj); if (Math.random() < 0.55) scrPx(x, y - 10 - Math.sin(s * 3 + t * 20) * 2, (Math.abs(o) < f.w * 0.3 ? 32 : Math.random() < 0.5 ? 118 : 117) | EMIS); }
    }
    if (f.kind === 'axe' && f.p) {   // a spinning axe and its shadow
      const [x, y] = scrAt(f.p[0], f.p[1]), a = f.t * 26;
      for (let r = -4; r <= 4; r++) for (const q of [0, Math.PI / 2]) scrPx(x + Math.cos(a + q) * r, y - 12 + Math.sin(a + q) * r * 0.6, (Math.abs(r) > 2 ? 31 : 26) | EMIS);
      for (let k = -2; k <= 2; k++) scrPx(x + k, y, 2);
    }
    if (f.kind === 'barrel' && f.p && !f.done) {   // a rolling powder keg
      const [x, y] = scrAt(f.p[0], f.p[1]), rot = Math.floor(f.t * 12) % 4;
      for (let yy = -7; yy <= 7; yy++) for (let xx = -6; xx <= 6; xx++) { const q = (xx * xx) / 36 + (yy * yy) / 49; if (q > 1) continue; const band = (yy + 8 + rot) % 5 === 0; scrPx(x + xx, y - 7 + yy, (q > 0.8 ? K1 : band ? S[2] : xx < -2 ? WOOD[3] : xx > 2 ? WOOD[0] : WOOD[2]) | EMIS); }   // (solid: drawn bright, over the warnings)
      scrPx(x, y - 15, K1 | EMIS); if (Math.floor(t * 12) % 2) { scrPx(x, y - 16, 17 | EMIS); scrPx(x + 1, y - 17, 51 | EMIS); }   // the fuse
    }
    if (f.kind === 'hands') {   // bony fingers clawing up out of the floor
      const [x, y] = scrAt(f.c[0], f.c[1]), k = Math.sin(Math.min(1, f.t / f.dur) * Math.PI);
      for (let q = 0; q < 7; q++) { const a = q / 7 * 6.283, hx = x + Math.cos(a) * f.r * 11, hy = y + Math.sin(a) * f.r * 5.5; for (let h = 0; h < 9 * k; h++) scrPx(hx + (h > 5 ? (q % 2 ? 1 : -1) : 0), hy - h, h > 6 ? 27 : 26); }
    }
  }
}
// ---------------------------------------------------------------- the warnings of the new bosses
function drawWarns() {
  const e = boss; if (!e || !e.bossKind || e.bossKind === 'alpha' || !alive(e) || !e.mv || !e.mv.warn) return;
  const M = e.mv, pulse = Math.floor(G.t * 10) % 2, edge = (pulse ? RED[4] : RED[3]) | EMIS, fill = RED[2] | EMIS, chk = (x, y) => ((Math.round(x) + Math.round(y)) & 1) === 0;
  for (const w of M.warn) {
    const t0 = w.t0 || 0, du = w.dur || M.wind, u = clamp((M.t - t0) / du, 0, 1); if (M.t < t0 || M.t > t0 + du) continue;
    if (w.k === 'lane') {
      const [ax, ay] = w.a, [bx, by] = w.b, l = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / l, ny = (bx - ax) / l;
      for (let s = 0; s <= l; s += 0.04) { const fi = ax + (bx - ax) * s / l, fj = ay + (by - ay) * s / l;
        for (const o of [-w.w - 0.07, -w.w, w.w, w.w + 0.07]) { const [x, y] = scrAt(fi + nx * o, fj + ny * o); scrPx(x, y, edge); }
        if (s <= l * u) for (let o = -w.w + 0.05; o <= w.w - 0.05; o += 0.06) { const [x, y] = scrAt(fi + nx * o, fj + ny * o); if (chk(x, y)) scrPx(x, y, fill); } }
    } else if (w.k === 'cone') {
      const c = w.c || [e.fi, e.fj];
      for (let r = 0.4; r <= w.R; r += 0.05) for (const s2 of [-1, 1]) { const [x, y] = scrAt(c[0] + Math.cos(w.ang + s2 * w.arc) * r, c[1] + Math.sin(w.ang + s2 * w.arc) * r); scrPx(x, y, edge); scrPx(x, y + 1, edge); }
      for (let q = -w.arc; q <= w.arc; q += 0.01) for (const rr of [w.R, w.R - 0.06]) { const [x, y] = scrAt(c[0] + Math.cos(w.ang + q) * rr, c[1] + Math.sin(w.ang + q) * rr); scrPx(x, y, edge); }
      for (let r = 0.4; r <= w.R * u; r += 0.05) for (let q = -w.arc; q <= w.arc; q += 0.02) { const [x, y] = scrAt(c[0] + Math.cos(w.ang + q) * r, c[1] + Math.sin(w.ang + q) * r); if (chk(x, y)) scrPx(x, y, fill); }
    } else if (w.k === 'disc') {
      const [cx, cy] = scrAt(w.c[0], w.c[1]), rx = w.R * 22.6, ry = rx / 2;
      for (let a = 0; a < 260; a++) { const t = a / 260 * 6.283; for (const k of [1, 0.96]) scrPx(cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k, edge); }
      for (let y = -ry * u; y <= ry * u; y++) for (let x = -rx * u; x <= rx * u; x++) if ((x / rx) ** 2 + (y / ry) ** 2 <= u * u && chk(cx + x, cy + y)) scrPx(cx + x, cy + y, fill);
    }
  }
}

// ---------------------------------------------------------------- THE GOBLIN CHIEFTAIN (the watchtower)
// FIREPOTS: circles land round you (3, then 5), each bursts and leaves burning ground. BARREL ROLL: kegs roll down
// marked lanes toward you (2, then 3) and burst at their ends. LEAP SLAM: a circle on you, he lands in it, and his
// goblins come running.
function updateGChief(e, dt, d, dx, dy) {
  const p2 = e.phase === 2;
  if (e.phase === 1 && e.hp < e.maxHp * 0.5 && !e.mv) { enrage(e, 'THE CHIEFTAIN BLOWS HIS WAR HORN', () => summonAround(e, 'goblin', 3, [e.fi, e.fj], 3, 6)); return true; }
  e.special -= dt;
  if (e.mv) {
    const M = e.mv; M.t += dt; e.dir = dirFrom(hero.fi - e.fi, hero.fj - e.fj);
    if (M.kind === 'pots') {
      e.clip = M.t < 0.4 ? 'attack' : 'idle'; e.atk = M.t < 0.4 ? 0 : -1;
      for (const w of M.warn) if (!w.boom && M.t >= (w.t0 || 0) + (w.dur || M.wind)) { w.boom = true; blast(e, w.c, w.R, 1.0); fireField(e, w.c, w.R * 0.8, 2.5); }
      if (M.warn.every(w => w.boom)) { e.mv = null; e.special = p2 ? 1.6 : 2.4; }
      return true;
    }
    if (M.kind === 'barrels') {
      e.clip = 'attack'; e.atk = M.t < M.wind ? 0 : 200;
      if (M.t >= M.wind && !M.rolled) { M.rolled = true; sfx('heavySwing'); for (const w of M.warn) bossFx.push({ kind: 'barrel', src: e, a: w.a, b: w.b, t: 0, dur: Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) / 6 + 0.01 }); }
      if (M.t > M.wind + 0.4) { e.mv = null; e.atk = -1; e.special = p2 ? 1.8 : 2.6; }
      return true;
    }
    if (M.kind === 'slam') {   // crouch, a high leap onto the circle, the landing
      const W = M.warn[0], jump = 0.5;
      if (M.t < M.wind - jump) { e.clip = 'attack'; e.atk = 0; return true; }
      if (M.t < M.wind) { const u = (M.t - (M.wind - jump)) / jump; tryMove(e, M.a[0] + (W.c[0] - M.a[0]) * u - e.fi, M.a[1] + (W.c[1] - M.a[1]) * u - e.fj, 0.35); e.leapZ = Math.sin(u * Math.PI) * 26; return true; }
      if (!M.landed) { M.landed = true; e.leapZ = 0; blast(e, W.c, W.R, 1.8); bossFx.push({ kind: 'wave', fi: e.fi, fj: e.fj, t: 0, dur: 0.4 }); if (called(e) < (p2 ? 6 : 4)) summonAround(e, Math.random() < 0.3 ? 'gshaman' : 'goblin', p2 ? 3 : 2, [e.fi, e.fj], 5, 8); }
      if (M.t > M.wind + 0.7) { e.mv = null; e.special = p2 ? 1.8 : 2.8; }
      e.clip = 'idle'; return true;
    }
  }
  if (e.special > 0 || d > 11 || !los(e.fi, e.fj, hero.fi, hero.fj)) return false;
  const m = ++e.moves % 3;
  if (m === 0) { const tgt = heroAt(); e.mv = { kind: 'slam', t: 0, wind: 1.0, a: [e.fi, e.fj], warn: [{ k: 'disc', c: tgt, R: 1.6 }] }; say('THE CHIEFTAIN LEAPS', 22, 1.2); sfx('growl'); }
  else if (m === 1) {   // pots: one on you, the rest round you, landing one after another
    const n = p2 ? 5 : 3, warn = [];
    for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, r = k ? 1.6 + Math.random() * 1.6 : 0; const c = [hero.fi + Math.cos(a) * r, hero.fj + Math.sin(a) * r]; warn.push({ k: 'disc', c, R: 1.15, t0: k * 0.18, dur: 0.85 }); }
    e.mv = { kind: 'pots', t: 0, wind: 0.85, warn }; sfx('swing');
  } else {   // barrels: parallel lanes toward you
    const l0 = Math.hypot(dx, dy) || 1, ux = dx / l0, uy = dy / l0, nx = -uy, ny = ux, n = p2 ? 3 : 2, warn = [];
    for (let k = 0; k < n; k++) { const o = (k - (n - 1) / 2) * 1.6, a = [e.fi + nx * o + ux * 0.8, e.fj + ny * o + uy * 0.8]; let l = 9; for (let s = 0.5; s <= 9; s += 0.25) if (!standable(a[0] + ux * s, a[1] + uy * s, 0.3)) { l = Math.max(1.5, s - 0.3); break; } warn.push({ k: 'lane', a, b: [a[0] + ux * l, a[1] + uy * l], w: 0.5 }); }
    e.mv = { kind: 'barrels', t: 0, wind: 0.8, warn }; sfx('growl');
  }
  e.atk = -1; return true;
}

// ---------------------------------------------------------------- THE BANDIT CHIEF (the farm cellar)
// AXE THROW: a lane; the axe spins out and comes back (two in a V in phase 2). OIL FIRE: a flask of oil, a big ring,
// a burning field (two flasks in phase 2). SHIELD CHARGE: a lane to the wall; if he misses he hits the wall and is
// STUNNED for two seconds.
function updateBandit(e, dt, d, dx, dy) {
  const p2 = e.phase === 2;
  if (e.phase === 1 && e.hp < e.maxHp * 0.5 && !e.mv) { enrage(e, 'THE CHIEF CALLS HIS MEN', () => summonAround(e, 'brigand', 3, [e.fi, e.fj], 4, 7)); return true; }
  e.special -= dt;
  if (e.stunT > 0) { e.stunT -= dt; e.clip = 'hit'; e.atk = -1; if (Math.random() < dt * 10) { const [x, y] = screenOf(e), a = G.t * 9; pspawn(4, x + Math.cos(a) * 6, y + Math.sin(a) * 2, 40, 0, 0, 0, 0.25, 51); } return true; }
  if (e.mv) {
    const M = e.mv; M.t += dt;
    if (M.kind === 'axe') {
      e.dir = dirFrom(M.warn[0].b[0] - e.fi, M.warn[0].b[1] - e.fj); e.clip = 'attack'; e.atk = M.t < M.wind ? 0 : 260;
      if (M.t >= M.wind && !M.thrown) { M.thrown = true; sfx('heavySwing'); for (const w of M.warn) bossFx.push({ kind: 'axe', src: e, a: w.a, b: w.b, t: 0, dur: 1.0 }); }
      if (M.t > M.wind + 1.0) { e.mv = null; e.atk = -1; e.special = p2 ? 1.5 : 2.3; }
      return true;
    }
    if (M.kind === 'oil') {
      e.clip = M.t < 0.35 ? 'attack' : 'idle'; e.atk = M.t < 0.35 ? 0 : -1;
      for (const w of M.warn) if (!w.lit && M.t >= w.dur) { w.lit = true; sfx('fireball'); fireField(e, w.c, w.R, 4); }
      if (M.warn.every(w => w.lit)) { e.mv = null; e.special = p2 ? 1.6 : 2.4; }
      return true;
    }
    if (M.kind === 'charge') {
      const W = M.warn[0]; e.dir = dirFrom(W.b[0] - W.a[0], W.b[1] - W.a[1]);
      if (M.t < M.wind) { e.clip = 'attack'; e.atk = 0; return true; }
      const l = Math.hypot(W.b[0] - W.a[0], W.b[1] - W.a[1]), u = (M.t - M.wind) / (l / 11);
      if (u < 1) { tryMove(e, W.a[0] + (W.b[0] - W.a[0]) * u - e.fi, W.a[1] + (W.b[1] - W.a[1]) * u - e.fj, 0.35); e.clip = 'attack'; e.atk = 300; if (!M.hit && Math.hypot(hero.fi - e.fi, hero.fj - e.fj) < 1.1) { M.hit = true; hitHero(e, 2.0, 0.5); const k = 1.6 / (Math.hypot(hero.fi - e.fi, hero.fj - e.fj) || 1); tryMove(hero, (hero.fi - e.fi) * k, (hero.fj - e.fj) * k, 0.3); } return true; }
      e.atk = -1; e.mv = null; e.special = p2 ? 1.6 : 2.4;
      if (!M.hit && W.wall) { e.stunT = 2.2; floater('STUNNED', e.fi, e.fj, e.def.chest + 26, 51); sfx('crit'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.4); const [x, y] = screenOf(e); burst(5, x, y, 10, 14, 50, S[5]); }   // into the wall: the opening
      return true;
    }
  }
  if (e.special > 0 || d > 11 || !los(e.fi, e.fj, hero.fi, hero.fj)) return false;
  const m = ++e.moves % 3, l0 = Math.hypot(dx, dy) || 1, ux = dx / l0, uy = dy / l0;
  if (m === 1) {   // the axe (two, in a V, when enraged)
    const warn = []; for (const off of p2 ? [-0.3, 0.3] : [0]) { const a = Math.cos(off), b2 = Math.sin(off), vx = ux * a - uy * b2, vy = ux * b2 + uy * a, l = laneEnd(e, vx, vy, 8); warn.push({ k: 'lane', a: [e.fi, e.fj], b: [e.fi + vx * l, e.fj + vy * l], w: 0.5 }); }
    e.mv = { kind: 'axe', t: 0, wind: 0.7, warn }; sfx('growl');
  } else if (m === 2) {   // oil: on you (and beside you)
    const warn = [{ k: 'disc', c: heroAt(), R: 2.0, dur: 1.0 }]; if (p2) { const a = Math.random() * 6.283; warn.push({ k: 'disc', c: [hero.fi + Math.cos(a) * 3, hero.fj + Math.sin(a) * 3], R: 1.8, dur: 1.25 }); }
    e.mv = { kind: 'oil', t: 0, wind: 1.0, warn }; say('OIL!', 22, 1); sfx('swing');
  } else {   // the charge: to the far wall
    const l = laneEnd(e, ux, uy, 10), wall = l < 10 && !standable(e.fi + ux * (l + 0.8), e.fj + uy * (l + 0.8), 0.35);
    e.mv = { kind: 'charge', t: 0, wind: p2 ? 0.6 : 0.75, warn: [{ k: 'lane', a: [e.fi, e.fj], b: [e.fi + ux * l, e.fj + uy * l], w: 0.7, wall }] }; sfx('growl');
  }
  e.atk = -1; return true;
}

// ---------------------------------------------------------------- THE BARROW WIGHT (the deep tomb)
// GRASPING HANDS: small circles round you, bony hands burst up (they hurt and chill); two waves in phase 2. FROST
// BEAM: a lane, then a beam for a second and a half (twin beams in phase 2). RAISE THE DEAD: circles where the dead
// claw up; standing on one hurts. Phase 2: it vanishes and returns elsewhere in its tomb after each move.
function updateWight(e, dt, d, dx, dy) {
  const p2 = e.phase === 2;
  if (e.phase === 1 && e.hp < e.maxHp * 0.5 && !e.mv) { enrage(e, 'THE WIGHT RISES IN ITS FURY'); return true; }
  e.special -= dt;
  if (e.mv) {
    const M = e.mv; M.t += dt; e.dir = dirFrom(hero.fi - e.fi, hero.fj - e.fj); e.clip = 'cast'; e.atk = 0;
    if (M.kind === 'hands') { for (const w of M.warn) if (!w.up && M.t >= (w.t0 || 0) + w.dur) { w.up = true; sfx('clatter', 0.5); bossFx.push({ kind: 'hands', src: e, c: w.c, r: w.R, t: 0, dur: 0.7 }); } if (M.warn.every(w => w.up)) wightDone(e, p2); return true; }
    if (M.kind === 'beam') { if (M.t >= M.wind && !M.fired) { M.fired = true; sfx('frost'); for (const w of M.warn) bossFx.push({ kind: 'beam', src: e, a: w.a, b: w.b, w: w.w, at: 0, t: 0, dur: 1.5 }); } if (M.t > M.wind + 1.5) wightDone(e, p2); return true; }
    if (M.kind === 'raise') {
      for (const w of M.warn) if (!w.up && M.t >= w.dur) { w.up = true; if (Math.hypot(hero.fi - w.c[0], hero.fj - w.c[1]) < w.R) hitHero(e, 0.9, 0.2); if (standable(w.c[0], w.c[1], 0.3) && called(e) < 6) { const s2 = makeEnemy('skeleton', w.c[0], w.c[1], enemies.length); s2.state = 'hunt'; s2.calledBy = e; enemies.push(s2); } const [x, y] = iso(w.c[0], w.c[1]); burst(5, x, y, 4, 10, 40, 25); sfx('clatter', 0.6); }
      if (M.warn.every(w => w.up)) wightDone(e, p2); return true;
    }
  }
  if (e.special > 0 || d > 12 || !los(e.fi, e.fj, hero.fi, hero.fj)) return false;
  const m = ++e.moves % 3;
  if (m === 1) {   // hands: one on you, a ring round you; a second, wider wave when enraged
    const warn = [{ k: 'disc', c: heroAt(), R: 0.95, dur: 0.85 }];
    for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 + Math.random() * 0.5; warn.push({ k: 'disc', c: [hero.fi + Math.cos(a) * 1.8, hero.fj + Math.sin(a) * 1.8], R: 0.95, dur: 0.85 }); }
    if (p2) for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + 0.3; warn.push({ k: 'disc', c: [hero.fi + Math.cos(a) * 3.2, hero.fj + Math.sin(a) * 3.2], R: 0.95, t0: 0.6, dur: 0.85 }); }
    e.mv = { kind: 'hands', t: 0, wind: 0.85, warn }; sfx('cry');
  } else if (m === 2) {   // the beam(s), aimed at you
    const l0 = Math.hypot(dx, dy) || 1, warn = [];
    for (const off of p2 ? [-0.35, 0.35] : [0]) { const ux = dx / l0, uy = dy / l0, c = Math.cos(off), s2 = Math.sin(off), vx = ux * c - uy * s2, vy = ux * s2 + uy * c, l = laneEnd(e, vx, vy, 10); warn.push({ k: 'lane', a: [e.fi + vx * 0.6, e.fj + vy * 0.6], b: [e.fi + vx * l, e.fj + vy * l], w: 0.6 }); }
    e.mv = { kind: 'beam', t: 0, wind: 0.85, warn }; sfx('frost');
  } else {   // raise: circles round you where the dead will rise
    const n = p2 ? 5 : 3, warn = []; for (let k = 0; k < n; k++) { const a = k / n * 6.283 + Math.random(); warn.push({ k: 'disc', c: [hero.fi + Math.cos(a) * 2.2, hero.fj + Math.sin(a) * 2.2], R: 0.9, dur: 0.9 }); }
    e.mv = { kind: 'raise', t: 0, wind: 0.9, warn }; say('THE DEAD ANSWER THE WIGHT', 26, 1.4); sfx('cry');
  }
  return true;
}
function wightDone(e, p2) {
  e.mv = null; e.atk = -1; e.special = p2 ? 1.6 : 2.4;
  if (!p2) return;   // enraged: it fades and returns somewhere else in its tomb, not too near
  const r = LV.rooms[LV.leaderRoom], [x0, y0] = screenOf(e);
  G.ghosts.push({ sp: getSprite(e.fam, e.look, e.dir, 'idle', 0, e), x: x0, y: y0, t: 0.4, t0: 0.4 });
  for (let t = 0; t < 40; t++) { const fi = r.x + 1.5 + Math.random() * (r.w - 3), fj = r.y + 1.5 + Math.random() * (r.h - 3); if (!standable(fi, fj, 0.4) || Math.hypot(fi - hero.fi, fj - hero.fj) < 3.5) continue; e.fi = fi; e.fj = fj; break; }
  sfx('blink'); const [x1, y1] = screenOf(e); burst(4, x1, y1, 30, 16, 40, 118);
}

// ---------------------------------------------------------------- THE SKELETON KING (the King's Hall)
// GREAT CLEAVE: a wide cone (a second, the other way, in phase 2). KING'S CHARGE: a wide lane (twice in phase 2).
// RAISE THE DEAD: circles round you where his dead rise (more in phase 2).
function updateKingB(e, dt, d, dx, dy) {
  const p2 = e.phase === 2;
  if (e.phase === 1 && e.hp < e.maxHp * 0.5 && !e.mv) { enrage(e, 'THE KING WILL NOT KNEEL'); return true; }
  e.special -= dt;
  if (e.mv) {
    const M = e.mv; M.t += dt;
    if (M.kind === 'cleave') {
      const W = M.warn[M.step || 0]; e.dir = dirFrom(Math.cos(W.ang), Math.sin(W.ang)); e.clip = 'attack'; e.atk = M.t < W.t0 + W.dur ? 0 : 380;
      if (M.t >= W.t0 + W.dur && !W.hit) { W.hit = true; sfx('heavySwing'); bossFx.push({ kind: 'rake', fi: e.fi, fj: e.fj, ang: W.ang, t: 0, dur: 0.25 }); if (Math.hypot(hero.fi - e.fi, hero.fj - e.fj) < W.R + 0.3 && angDiff(Math.atan2(hero.fj - e.fj, hero.fi - e.fi), W.ang) < W.arc) hitHero(e, 2.2, 0.5); if ((M.step || 0) + 1 < M.warn.length) M.step = (M.step || 0) + 1; }
      const last = M.warn[M.warn.length - 1]; if (M.warn.every(w => w.hit) && M.t > last.t0 + last.dur + 0.35) { e.mv = null; e.atk = -1; e.special = p2 ? 1.6 : 2.4; }
      return true;
    }
    if (M.kind === 'charge') {
      const W = M.warn[0]; e.dir = dirFrom(W.b[0] - W.a[0], W.b[1] - W.a[1]);
      if (M.t < M.wind) { e.clip = 'attack'; e.atk = 0; return true; }
      const l = Math.hypot(W.b[0] - W.a[0], W.b[1] - W.a[1]), u = (M.t - M.wind) / (l / 12);
      if (u < 1) { tryMove(e, W.a[0] + (W.b[0] - W.a[0]) * u - e.fi, W.a[1] + (W.b[1] - W.a[1]) * u - e.fj, 0.4); e.clip = 'attack'; e.atk = 300; if (!M.hit && Math.hypot(hero.fi - e.fi, hero.fj - e.fj) < 1.3) { M.hit = true; hitHero(e, 2.0, 0.5); } return true; }
      if (p2 && !M.second && !hero.dead) { const ddx = hero.fi - e.fi, ddy = hero.fj - e.fj, dd = Math.hypot(ddx, ddy) || 1, l2 = laneEnd(e, ddx / dd, ddy / dd, 9); e.mv = { kind: 'charge', t: 0, wind: 0.45, second: true, warn: [{ k: 'lane', a: [e.fi, e.fj], b: [e.fi + ddx / dd * l2, e.fj + ddy / dd * l2], w: 0.85 }] }; return true; }
      e.mv = null; e.atk = -1; e.special = p2 ? 1.6 : 2.6; return true;
    }
    if (M.kind === 'raise') {
      e.clip = 'attack'; e.atk = 0;
      for (const w of M.warn) if (!w.up && M.t >= w.dur) { w.up = true; if (Math.hypot(hero.fi - w.c[0], hero.fj - w.c[1]) < w.R) hitHero(e, 0.9, 0.2); if (standable(w.c[0], w.c[1], 0.3) && called(e) < (p2 ? 6 : 4)) { const s2 = makeEnemy('skeleton', w.c[0], w.c[1], enemies.length); s2.state = 'hunt'; s2.calledBy = e; s2.raisedBy = e; enemies.push(s2); } const [x, y] = iso(w.c[0], w.c[1]); burst(5, x, y, 4, 10, 40, 25); burst(4, x, y, 6, 8, 30, 59); }
      if (M.warn.every(w => w.up)) { e.mv = null; e.atk = -1; sfx('cry'); e.special = p2 ? 2.0 : 2.8; }
      return true;
    }
  }
  if (e.special > 0 || d > 12 || !los(e.fi, e.fj, hero.fi, hero.fj)) return false;
  const m = ++e.moves % 3, ang = Math.atan2(dy, dx), l0 = Math.hypot(dx, dy) || 1;
  if (m === 1 || (d < 3 && m !== 0)) {   // the cleave (close in), then back the other way when enraged
    const warn = [{ k: 'cone', ang, R: 3.0, arc: 1.0, t0: 0, dur: 1.0 }]; if (p2) warn.push({ k: 'cone', ang: ang + Math.PI, R: 3.0, arc: 1.0, t0: 1.2, dur: 0.6 });
    e.mv = { kind: 'cleave', t: 0, wind: 1.0, warn }; sfx('growl');
  } else if (m === 2) { const l = laneEnd(e, dx / l0, dy / l0, 9); e.mv = { kind: 'charge', t: 0, wind: 0.8, warn: [{ k: 'lane', a: [e.fi, e.fj], b: [e.fi + dx / l0 * l, e.fj + dy / l0 * l], w: 0.85 }] }; say('THE KING CHARGES', 22, 1.2); sfx('growl'); }
  else { const n = p2 ? 5 : 3, warn = []; for (let k = 0; k < n; k++) { const a = k / n * 6.283 + Math.random(); warn.push({ k: 'disc', c: [hero.fi + Math.cos(a) * 2.4, hero.fj + Math.sin(a) * 2.4], R: 0.9, dur: 1.0 }); } e.mv = { kind: 'raise', t: 0, wind: 1.0, warn }; say('THE KING RAISES HIS DEAD', 22, 1.6); }
  e.atk = -1; return true;
}
