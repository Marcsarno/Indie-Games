'use strict';
// SURVIVORS: reasons to walk the map (round 3; PLAN-PROGRESSION.md part 3). The arena grows to 88x88 tiles and gets:
//   BARRELS     walk into one (or hit it) to smash it: gold, a heal, a MAGNET (pulls every gem and coin), a BOMB
//               (blasts everything near) or, rarely, a chest
//   SHRINES     three a run; stand in the circle 2.5 s while the swarm closes in: 30 s of FRENZY, STONESKIN,
//               GREED (double gems and gold) or WRATH (half again the damage)
//   THE CAGE    until the Ranger is unlocked, she waits in a cage somewhere in the wood: stand by it to free her
//   RELIC ALTAR one a run, far out, guarded by a sleeping elite pack: the relic unlocks a new card for good
//               (once all five are taken, it holds a big purse instead)
//   GOBLINS     a treasure goblin now and then: catch it before it gets away
//   FIRE RAIN   on HELL and TORMENT: red circles mark where fire falls a moment later
// Arrows at the screen's edge point to what is out of sight. The page's boot is at the end of this file.

const SV_MAP_N = 88;
// ---------------------------------------------------------------- a bigger wood
{ const rw0 = resizeWorld; resizeWorld = function (w, h) { return SV.bigMap ? rw0(SV_MAP_N, SV_MAP_N) : rw0(w, h); }; }
{ const ar0 = svArena; svArena = function (seed) { SV.bigMap = true; try { return ar0(seed); } finally { SV.bigMap = false; } }; }

// the Ranger in her cage wears the Ranger's own look
NPC_LOOKS.svranger = (() => { newHero('ranger'); recalcHero(); return Object.assign({}, hero.look); })();

const SV_PICK_GEM = {
  magnet: { name: 'MAGNET', cols: [56, 58, 59], worth: 0 }, bomb: { name: 'BOMB', cols: [13, 16, 18], worth: 0 },
  relic: { name: 'RELIC', cols: [49, 51, 27], worth: 0 },
};
function svFreeSpot(R, dmin, dmax, away = []) {
  const cx = MW / 2, cy = MH / 2;
  for (let t = 0; t < 400; t++) {
    const a = R() * 6.283, d = dmin + R() * (dmax - dmin), i = Math.floor(cx + Math.cos(a) * d), j = Math.floor(cy + Math.sin(a) * d);
    if (i < 4 || j < 4 || i >= MW - 4 || j >= MH - 4 || edgeBand(i, j)) continue;
    let ok = true; for (let b = -1; b <= 1 && ok; b++) for (let a2 = -1; a2 <= 1; a2++) if (LV.solid[tIdx(i + a2, j + b)]) { ok = false; break; }
    if (!ok || away.some(p => Math.hypot(p[0] - i, p[1] - j) < 9)) continue;
    return [i, j];
  }
  return null;
}
// before the bake: barrels, the cage, the night
SV_HOOKS.decor.push(() => {
  LV.night = !!svDiff().night;
  const R = rng((Math.random() * 1e9) >>> 0), used = [];
  SV.poi = { shrines: [], cage: null, altar: null };
  for (let n = 0; n < 55; n++) { const p = svFreeSpot(R, 5, MW / 2 - 6); if (!p) continue; LV.decor.push({ kind: 'barrel', i: p[0], j: p[1], seed: n }); LV.solid[tIdx(p[0], p[1])] = 1; }
  if (!svHas('ranger') && SV.cls !== 'ranger') {
    const p = svFreeSpot(R, 16, 28, used); if (p) { used.push(p); LV.decor.push({ kind: 'cage', i: p[0], j: p[1], open: false }); LV.solid[tIdx(p[0], p[1])] = 1; LV.npcs.push({ role: 'svranger', name: 'THE RANGER', fi: p[0] + 0.5, fj: p[1] + 0.5, caged: true, busy: true }); SV.poi.cage = { fi: p[0] + 0.5, fj: p[1] + 0.5, prog: 0, done: false }; }
  }
  { const p = svFreeSpot(R, 24, 34, used); if (p) { used.push(p); SV.poi.altar = { fi: p[0] + 0.5, fj: p[1] + 1.7, taken: false };   // an altar between two braziers, the relic before it
    LV.decor.push({ kind: 'altar', i: p[0], j: p[1], yaw: 0 }); LV.solid[tIdx(p[0], p[1])] = 1;
    for (const di of [-1, 1]) { LV.decor.push({ kind: 'brazier', i: p[0] + di, j: p[1] - di }); LV.solid[tIdx(p[0] + di, p[1] - di)] = 1; } } }
  const kinds = ['frenzy', 'stone', 'greed', 'wrath'].sort(() => R() - 0.5);
  for (let k = 0; k < 3; k++) { const p = svFreeSpot(R, 10, 30, used); if (p) { used.push(p); SV.poi.shrines.push({ fi: p[0] + 0.5, fj: p[1] + 0.5, kind: kinds[k], prog: 0, used: false }); LV.decor.push({ kind: 'statue', i: p[0], j: p[1] }); LV.solid[tIdx(p[0], p[1])] = 1; } }
  SV.shrineN = 0; SV.buff = null; SV.fires = []; SV.fireT = 6; SV.goblinT = 90;
});
// after the bake: the relic, its sleeping guard
SV_HOOKS.world.push(() => {
  const A = SV.poi && SV.poi.altar; if (!A) return;
  groundItems.push({ gem: SV_PICK_GEM.relic, svPick: 'relic', fi: A.fi, fj: A.fj, t: 1 });
  const lvl = 2 + (SV.diff || 1);
  const ids = ['tombguard', 'axeman', 'skeleton', 'spearman'];
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * 6.283, e = svSpawn(k ? ids[k % ids.length] : 'tombguard', A.fi + Math.cos(a) * 1.6, A.fj + Math.sin(a) * 1.6, { lvl, noChamp: true });
    e.state = 'sleep'; e.alertT = 0; e.svGuard = true; e.home = [e.fi, e.fj];
    if (!k) { makeChampion(e, rng(77)); e.svChest = true; }
  }
});

// ---------------------------------------------------------------- per frame
const SV_SHRINES = {
  frenzy: { name: 'FRENZY', col: 22, ramp: [20, 21, 22, 23], line: 'ATTACKS HALF AGAIN AS FAST' },
  stone: { name: 'STONESKIN', col: 30, ramp: [28, 29, 30, 31], line: 'BLOWS DO HALF DAMAGE' },
  greed: { name: 'GREED', col: 50, ramp: [48, 49, 50, 51], line: 'DOUBLE GEMS AND GOLD' },
  wrath: { name: 'WRATH', col: 57, ramp: [56, 57, 58, 59], line: 'HALF AGAIN THE DAMAGE' },
};
function svBuffOn(kind) {
  SV.buff = { kind, t: 30 }; const S = SV_SHRINES[kind];
  if (kind === 'frenzy') hero.frenzy = 30; if (kind === 'stone') hero.stoneskin = 30;
  if (kind === 'wrath') recalcHero();
  say(`${S.name}: ${S.line}`, S.col, 2.5); sfx('portal'); sfx('levelUp', 0.6);
  shockwave(hero.fi, hero.fj, 2.5, 0.4, S.ramp);
}
SV_HOOKS.recalc.push(() => { if (SV.buff && SV.buff.kind === 'wrath' && SV.buff.t > 0) STAT.dmg = [STAT.dmg[0] * 1.5, STAT.dmg[1] * 1.5]; });
{ const g0 = svGainXp; svGainXp = v => g0(SV.buff && SV.buff.kind === 'greed' ? v * 2 : v); }
SV_HOOKS.update.push(dt => {
  const P = SV.poi; if (!P) return;
  // walking into a barrel smashes it
  for (const p of dynProps) if (p.kind === 'barrel' && !p.broken && Math.hypot(p.i + 0.5 - hero.fi, p.j + 0.5 - hero.fj) < 0.95) hitProp(p);
  // shrines
  for (const S of P.shrines) {
    if (S.used) continue;
    if (Math.hypot(S.fi - hero.fi, S.fj - hero.fj) < 1.7) { S.prog += dt; if (Math.random() < dt * 20) { const [x, y] = iso(S.fi, S.fj); pspawn(4, x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 12, 2, 0, 0, 30, 0.7, SV_SHRINES[S.kind].ramp[3]); } if (S.prog >= 2.5) { S.used = true; svBuffOn(S.kind); SV.shrineN++; if (SV.shrineN >= 3) svUnlock('shrine3'); } }
    else S.prog = Math.max(0, S.prog - dt * 0.5);
  }
  if (SV.buff) { SV.buff.t -= dt; if (SV.buff.t <= 0) { const k = SV.buff.kind; SV.buff = null; if (k === 'wrath') recalcHero(); } }
  // the cage
  const C = P.cage;
  if (C && !C.done) {
    if (Math.hypot(C.fi - hero.fi, C.fj - hero.fj) < 1.8) { C.prog += dt; if (C.prog >= 1.5) {
      C.done = true; for (const p of dynProps) if (p.kind === 'cage') p.open = true;
      say('THE RANGER IS FREE! SHE WAITS AT YOUR CAMP', 54, 3); svUnlock('ranger'); sfx('chest');
      setTimeout(() => { npcs = npcs.filter(n => n.role !== 'svranger'); }, 1500);
    } } else C.prog = Math.max(0, C.prog - dt);
  }
  // treasure goblins
  SV.goblinT -= dt;
  if (SV.goblinT <= 0) { SV.goblinT = 110 + Math.random() * 40; const p = svSpot(0, 0, true); if (p) { const e = svSpawn('treasure', p[0], p[1], { noChamp: true }); e.svGoblin = true; say('A TREASURE GOBLIN! CATCH IT', 51, 2.5); sfx('squeal'); } }
  // fire rain (Hell and Torment)
  const D = svDiff();
  if (D.fire && SV.t > 20) {
    SV.fireT -= dt;
    if (SV.fireT <= 0) { SV.fireT = D.fire * (0.7 + Math.random() * 0.6); const n = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, r = k ? 1.5 + Math.random() * 3 : Math.random() * 1.2; SV.fires.push({ fi: hero.fi + Math.cos(a) * r, fj: hero.fj + Math.sin(a) * r, r: 1.4, t: 1.4, t0: 1.4 }); } }
    for (const F of SV.fires) {
      F.t -= dt;
      if (F.t <= 0 && !F.done) {
        F.done = true; shockwave(F.fi, F.fj, F.r, 0.3, [14, 16]); const [x, y] = iso(F.fi, F.fj); burst(2, x, y, 4, 26, 90, 16); burst(3, x, y, 2, 10, 40, 17); sfx('fireball');
        if (Math.hypot(hero.fi - F.fi, hero.fj - F.fj) < F.r) hurtHero(Math.round(STAT.maxHp * 0.14), null);
        for (const e of enemies) if (alive(e) && Math.hypot(e.fi - F.fi, e.fj - F.fj) < F.r) damageEnemy(e, heroDmg(2), F.fi, F.fj, false, 1, true);
      }
    }
    SV.fires = SV.fires.filter(F => !F.done);
  }
});
// barrels: the game's own break (sound, splinters), then our loot
{ const bb0 = breakBarrel; breakBarrel = function (p) {
  bb0(p); if (!SV.on) return;
  const q = Math.random(), fi = p.i + 0.5, fj = p.j + 0.5;
  if (q < 0.45) svDropGold(fi, fj, 3 + Math.floor(Math.random() * 6));
  else if (q < 0.6) groundItems.push({ gem: HEAL_GEM, svHeal: true, fi, fj, t: 0 });
  else if (q < 0.69) groundItems.push({ gem: SV_PICK_GEM.magnet, svPick: 'magnet', fi, fj, t: 0 });
  else if (q < 0.75) groundItems.push({ gem: SV_PICK_GEM.bomb, svPick: 'bomb', fi, fj, t: 0 });
  else if (q < 0.78) groundItems.push({ gem: CHEST_GEM, svChest: true, fi, fj, t: 0 });
}; }
SV_HOOKS.pickup.push(g => {
  if (!g.svPick) return false;
  if (g.svPick === 'magnet') { for (const q of groundItems) if (q.xp || q.gold) q.pull = 6; say('MAGNET!', 58, 1.5); sfx('portal'); return true; }
  if (g.svPick === 'bomb') {
    say('BOOM!', 16, 1.2); sfx('boom'); sfx('meteor'); if (SHAKE) G.trauma = 0.6;
    shockwave(hero.fi, hero.fj, 6, 0.5, [14, 16]); G.flashes.push({ fi: hero.fi, fj: hero.fj, t: 0.3, t0: 0.3, r: 200, tint: 1 });
    for (const e of enemies) if (alive(e) && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 7) damageEnemy(e, Math.round(heroDmg(5) + e.maxHp * (e.def.unique ? 0.05 : 0.5)), hero.fi, hero.fj, true, 2, true);
    return true;
  }
  if (g.svPick === 'relic') {
    if (SV.poi && SV.poi.altar) SV.poi.altar.taken = true;
    const next = SV_ACH.find(a => a.relic && !svHas(a.id));
    if (next) { svUnlock(next.id); say(`${next.name}`, 51, 3); }
    else { for (let k = 0; k < 10; k++) svDropGold(hero.fi + Math.cos(k) * 1.2, hero.fj + Math.sin(k) * 1.2, 15); say('A PURSE OF OLD GOLD', 50, 2.5); }
    sfx('chest'); sfx('levelUp'); return true;
  }
  return false;
});
// the relic waits until its guard is down (or at least asleep far away): it can't be magnetted
// (svMagnet skips svPick items unless they were pulled)

// ---------------------------------------------------------------- drawing: rings, labels, arrows at the edge
function svRing(fi, fj, r, col, f = 1, dash = 5, glow = 0) {
  const [x, y] = iso(fi, fj), cx = x - camX, cy = y - camY, rx = r * 22.6, ry = r * 11.3, n = Math.ceil(rx * 2.4);
  if (glow) for (let yy = Math.floor(cy - ry); yy <= cy + ry; yy++) for (let xx = Math.floor(cx - rx); xx <= cx + rx; xx++) {   // a faint dithered glow inside
    const dx = (xx - cx) / rx, dy = (yy - cy) / ry; if (dx * dx + dy * dy < 1 && BAYER[((yy & 3) << 2) | (xx & 3)] < glow) put(xx, yy, col); }
  for (let a = 0; a < n; a++) { if (a % dash === dash - 1) continue; if (a / n > f) break; const t = a / n * 6.283 - 1.57, px = cx + Math.cos(t) * rx, py = cy + Math.sin(t) * ry; put(px, py, col); put(px, py + 1, col); }
}
function svArrowAt(fi, fj, col, label) {
  const [x, y] = iso(fi, fj), sx = x - camX, sy = y - camY, X0 = 12, X1 = W - 12, Y0 = 52, Y1 = H - 30;
  if (sx > X0 && sx < X1 && sy > Y0 && sy < Y1) return false;
  const cx = W / 2, cy = (Y0 + Y1) / 2, dx = sx - cx, dy = sy - cy;
  const k = Math.min((dx > 0 ? X1 - cx : cx - X0) / Math.abs(dx || 1e-6), (dy > 0 ? Y1 - cy : cy - Y0) / Math.abs(dy || 1e-6));
  const px = cx + dx * k, py = cy + dy * k, a = Math.atan2(dy, dx);
  for (let s = 0; s < 7; s++) for (let w = -s * 0.5; w <= s * 0.5; w++) { const u = 6 - s; put(px + Math.cos(a) * u - Math.sin(a) * w, py + Math.sin(a) * u + Math.cos(a) * w, s === 6 || Math.abs(w) >= s * 0.5 - 0.5 ? BLK : col); }
  if (label) textC(label, px - Math.cos(a) * 10, py - Math.sin(a) * 10 - 2, col);
  return true;
}
SV_HOOKS.hud.push(() => {
  const P = SV.poi; if (!P) return;
  for (const S of P.shrines) {
    if (S.used) continue; const K = SV_SHRINES[S.kind];
    svRing(S.fi, S.fj, 1.7, K.ramp[3], 1, 6, 0.12 + 0.06 * Math.sin(G.t * 3)); if (S.prog > 0) svRing(S.fi, S.fj, 1.4, 27, S.prog / 2.5, 99);
    const [x, y] = iso(S.fi, S.fj); textC(`SHRINE: ${K.name}`, x - camX, y - camY - 30, K.col);
    svArrowAt(S.fi, S.fj, K.ramp[3], 'S');
  }
  const C = P.cage; if (C && !C.done) { const [x, y] = iso(C.fi, C.fj); textC(C.prog > 0 ? 'FREEING...' : 'FREE THE RANGER', x - camX, y - camY - 46, 54); if (C.prog > 0) svRing(C.fi, C.fj, 1.2, 54, C.prog / 1.5, 99); svArrowAt(C.fi, C.fj, 54, 'R'); }
  const A = P.altar; if (A && !A.taken) { const [x, y] = iso(A.fi, A.fj); svRing(A.fi, A.fj, 0.8, 51, 1, 3, 0.15); textC('RELIC', x - camX, y - camY - 14, 51); svArrowAt(A.fi, A.fj, 51, '!'); }
  for (const e of enemies) if (e.svGoblin && alive(e)) svArrowAt(e.fi, e.fj, 50, 'G');
  if (SV.boss && alive(SV.boss)) svArrowAt(SV.boss.fi, SV.boss.fj, 22, 'B');
  for (const F of SV.fires || []) { const f = 1 - F.t / F.t0; svRing(F.fi, F.fj, F.r, Math.floor(G.t * 12) % 2 ? 22 : 16, 1, 3, 0.1 + 0.3 * f); svRing(F.fi, F.fj, F.r * f, 16, 1, 99); }
  if (SV.buff) { const K = SV_SHRINES[SV.buff.kind], s = `${K.name} ${Math.ceil(SV.buff.t)}`; text(s, W - 3 - textWidth(s), 26, K.col); }
  // labels on pickups in view
  for (const g of groundItems) if (g.svPick && g.svPick !== 'relic') { const [x, y] = iso(g.fi, g.fj), sx = x - camX, sy = y - camY; if (sx > 0 && sx < W && sy > 0 && sy < H) textC(SV_PICK_GEM[g.svPick].name, sx, sy - 12, g.svPick === 'bomb' ? 16 : 58); }
});
// the relic guard keeps its post (stragglers are brought round; sleepers at their post are not)
{ const rel0 = svSpawns; svSpawns = function (dt) { for (const e of enemies) if (e.svGuard && e.state === 'sleep') e._svHold = [e.fi, e.fj]; rel0(dt); for (const e of enemies) if (e._svHold) { [e.fi, e.fj] = e._svHold; e._svHold = null; } }; }

// ---------------------------------------------------------------- boot (every part has hung its hooks)
svNewRun(); G.mode = 'svtitle';
if (window.__svRelease) window.__svRelease();   // let the frame loop run (the page held it until now)
