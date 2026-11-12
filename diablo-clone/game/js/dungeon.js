'use strict';
// Round 103: what a dungeon floor's roles do in play (world.js `assignRoles` lays them out).
// The user: dungeons were tiny squares, nothing to find, the arrow led straight to the boss. With the
// dungeon handoff's rules each floor now has a VAULT behind a locked gate (a champion on the floor carries
// its key), a SHRINE (pray: a minute of might, speed or warding), treasure dead ends, an AMBUSH room
// (empty until you walk in, then waves, then a reward), and the arrow only leads to what you have seen.

// ---------------------------------------------------------------- the floor starts
{ const sl0 = startLevel; startLevel = function (...a) {
  const r = sl0(...a);
  LV.hasKey = false; LV.floorT0 = G.t; LV.ambush = null; LV.vaultHintT = 0;
  if (LV.spawns && !LV.outdoor) LV.spawns.forEach((sp, n) => { if (sp.key && enemies[n]) enemies[n].vaultKey = true; });
  return r;
}; }

// ---------------------------------------------------------------- the key and the vault
{ const d0 = damageEnemy; damageEnemy = function (e, dmg, ...rest) {
  const was = alive(e);
  if (hero.shrine && hero.shrine.kind === 'might') dmg = Math.round(dmg * 1.25);
  const r = d0(e, dmg, ...rest);
  if (was && !alive(e) && e.vaultKey && LV.vault && !LV.hasKey) {
    LV.hasKey = true; e.vaultKey = false; sfx('chest'); sfx('levelUp', 0.5);
    floater('VAULT KEY', e.fi, e.fj, 40, 51); questBanner('THE VAULT KEY', 'A LOCKED VAULT ON THIS FLOOR WILL OPEN FOR IT', 51);
  }
  return r;
}; }
const nearGate = (r = 1.8) => LV.vault && !LV.vault.open && LV.vault.gate.some(([i, j]) => Math.hypot(i + 0.5 - hero.fi, j + 0.5 - hero.fj) < r);
function vaultAction() {
  if (LV.outdoor || !nearGate()) return null;
  if (!LV.hasKey) {
    if (G.t > (LV.vaultHintT || 0)) { LV.vaultHintT = G.t + 6; say('A LOCKED VAULT', 22, 2.5); say('A CHAMPION ON THIS FLOOR CARRIES THE KEY', 26, 3); }
    return null;
  }
  return { label: 'UNLOCK THE VAULT', go: unlockVault };
}
function unlockVault() {
  const V = LV.vault; if (!V || V.open) return;
  V.open = true;
  for (const [i, j] of V.gate) LV.solid[tIdx(i, j)] = 0;
  LV.decor = LV.decor.filter(d => !d.vault);
  const keep = dynProps.map(p => ({ open: p.open, broken: p.broken, hp: p.hp, hatch: p.hatch }));
  buildWorld(); keep.forEach((q, n) => { if (dynProps[n]) Object.assign(dynProps[n], q); });
  const [i, j] = V.gate[V.gate.length >> 1], [x, y] = iso(i + 0.5, j + 0.5);
  for (let k = 0; k < 16; k++) pspawn(5, x + (Math.random() - 0.5) * 24, y - 8, 4 + Math.random() * 20, (Math.random() - 0.5) * 50, -20, 30, 0.7, 30);
  sfx('chest'); sfx('stairs'); questBanner('THE VAULT IS OPEN', 'THREE CHESTS INSIDE', 51); saveGame();
}
// the vault's chests hold more, and at least one fine thing
{ const oc0 = openChest; openChest = function (p) {
  const was = p.open; oc0(p);
  if (!was && p.rich) { dropLoot(p.i + 0.5, p.j + 1.2, 2, true); const it = rollRare(rng((Math.random() * 1e9) | 0), LV.diff + 1); groundItems.push({ item: it, fi: p.i + 0.8, fj: p.j + 1.4, t: 0 }); }
}; }

// ---------------------------------------------------------------- the shrine
const DG_SHRINES = [
  { kind: 'might', name: 'SHRINE OF MIGHT', line: '+25% DAMAGE FOR A MINUTE', col: 23 },
  { kind: 'swift', name: 'SHRINE OF HASTE', line: '+20% SPEED FOR A MINUTE', col: 55 },
  { kind: 'ward', name: 'SHRINE OF WARDING', line: '30% LESS DAMAGE TAKEN FOR A MINUTE', col: 40 },
];
function shrineAction() {
  const S = LV.shrine; if (LV.outdoor || !S || S.used || S.i === undefined || Math.hypot(S.i + 0.5 - hero.fi, S.j + 0.5 - hero.fj) > 2.0) return null;
  return { label: 'PRAY AT THE SHRINE', go: () => {
    S.used = true; const s = DG_SHRINES[(S.i * 7 + S.j * 13 + LV.seed) % DG_SHRINES.length];
    hero.shrine = { kind: s.kind, t: 60, name: s.name }; recalcHero();
    questBanner(s.name, s.line, s.col); sfx('levelUp'); sfx('portal', 0.5);
    const [x, y] = iso(S.i + 0.5, S.j + 0.5); for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; pspawn(4, x, y - 14, 6, Math.cos(a) * 40, Math.sin(a) * 20, 30 + Math.random() * 20, 0.8, k % 2 ? 51 : 27); }
  } };
}
{ const rc0 = recalcHero; recalcHero = function (...a) { const r = rc0(...a); if (hero.shrine && hero.shrine.kind === 'swift') STAT.speed *= 1.2; return r; }; }
{ const hh0 = hurtHero; hurtHero = function (dmg, ...rest) { if (hero.shrine && hero.shrine.kind === 'ward') dmg = Math.max(1, Math.round(dmg * 0.7)); return hh0(dmg, ...rest); }; }
{ const at0 = actionTarget; actionTarget = function () { const a = at0(); if (a) return a; if (G.mode !== 'play' || hero.dead || G.fadeTo) return null; return vaultAction() || shrineAction(); }; }

// ---------------------------------------------------------------- the ambush room
function ambushPool() {
  if (LV.sideCfg) return LV.sideCfg.pool;
  const ids = [...new Set((LV.spawns || []).map(s => s.id).filter(id => MONSTERS[id] && !MONSTERS[id].unique && id !== 'treasure'))];
  return ids.length ? ids : ['skeleton'];
}
function updateAmbush(dt) {
  if (LV.outdoor || !(LV.arenaRoom >= 0) || hero.dead) return;
  const r = LV.rooms[LV.arenaRoom]; if (!r) return;
  const A = LV.ambush;
  if (!A) {
    if (LV.roomOf[tIdx(Math.floor(hero.fi), Math.floor(hero.fj))] !== LV.arenaRoom || Math.hypot(hero.fi - r.cx - 0.5, hero.fj - r.cy - 0.5) > Math.min(r.w, r.h) * 0.35) return;
    LV.ambush = { wave: 0, t: 0.8, list: [], waves: (r.area || 0) > 140 ? 3 : 2, done: false };
    questBanner('AMBUSH', 'THEY COME OUT OF THE WALLS. HOLD THE ROOM', 22); sfx('cry'); sfx('growl'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.3);
    return;
  }
  if (A.done) return;
  if (A.list.some(alive)) return;
  A.t -= dt; if (A.t > 0) return;
  if (A.wave >= A.waves) {   // held: the reward
    A.done = true; const R = rng((Math.random() * 1e9) | 0);
    dropLoot(r.cx + 0.5, r.cy + 0.5, 3, true); groundItems.push({ item: rollRare(R, LV.diff + 1), fi: r.cx + 0.9, fj: r.cy + 0.3, t: 0 });
    gainXp(60 * LV.diff); questBanner('AMBUSH SURVIVED', 'THE ROOM IS YOURS', 51); sfx('levelUp');
    shockwave(r.cx + 0.5, r.cy + 0.5, 3, 0.4, [27, 51]); return;
  }
  A.wave++; A.t = 1.2; A.list = [];
  const pool = ambushPool(), n = 3 + Math.min(4, Math.floor(LV.diff / 2)) + A.wave;
  for (let k = 0; k < n; k++) {
    for (let t = 0; t < 40; t++) {   // out of the walls: near the room's edge, a few steps from him
      const fi = r.x + 0.5 + Math.random() * (r.w - 1), fj = r.y + 0.5 + Math.random() * (r.h - 1), kk = tIdx(Math.floor(fi), Math.floor(fj));
      if (LV.roomOf[kk] !== LV.arenaRoom || LV.solid[kk] || clearance(fi, fj, 0.3) || Math.hypot(fi - hero.fi, fj - hero.fj) < 3) continue;
      const edge = Math.min(fi - r.x, r.x + r.w - fi, fj - r.y, r.y + r.h - fj); if (edge > 2.2 && t < 30) continue;
      const e = makeEnemy(R0pick(pool), fi, fj, enemies.length, LV.diff); enemies.push(e); A.list.push(e); wake(e, true);
      const [x, y] = iso(fi, fj); for (let q = 0; q < 6; q++) pspawn(5, x + (Math.random() - 0.5) * 10, y, 2, (Math.random() - 0.5) * 30, 0, 20 + Math.random() * 30, 0.6, 26);
      break;
    }
  }
  questBanner(`WAVE ${A.wave}/${A.waves}`, A.wave === A.waves ? 'THE LAST OF THEM' : 'MORE COMING', 22);
}
const R0pick = a => a[Math.floor(Math.random() * a.length)];

// ---------------------------------------------------------------- the arrow only leads to what you have seen
// (the user: no searching, no "is it here, is it there"). Below ground, the arrow waits until the goal's tile
// has been seen; after three minutes on a floor it helps anyway. The bots read storyTarget, which still knows.
function markHidden(t) {
  if (!t || t.npc || LV.outdoor || LV.arena || LV.hub || !LV.seen) return false;
  if (G.t - (LV.floorT0 || 0) > 180) return false;
  const k = tIdx(Math.floor(t[0]), Math.floor(t[1]));
  return !(LV.seen[k] > 0);
}
{ const st0 = storyTarget; storyTargetShown = function () { const t = st0(); return markHidden(t) ? null : t; }; }
var storyTargetShown;

// ---------------------------------------------------------------- each frame
{ const up0 = updatePortal; updatePortal = function (dt) {
  up0(dt);
  if (hero.shrine) { hero.shrine.t -= dt; if (hero.shrine.t <= 0) { const sw = hero.shrine.kind === 'swift'; hero.shrine = null; if (sw) recalcHero(); say('THE SHRINE\'S BLESSING FADES', 26, 2); } }
  updateAmbush(dt);
  const S = LV.shrine;   // the unused shrine glows
  if (!LV.outdoor && S && !S.used && S.i !== undefined && Math.random() < dt * 10) { const [x, y] = iso(S.i + 0.5, S.j + 0.5); pspawn(4, x + (Math.random() - 0.5) * 10, y - 16, 2, 0, 0, 20 + Math.random() * 16, 0.9, Math.random() < 0.5 ? 51 : 27); }
}; }
// a line under the tracker: what is going on on this floor
{ const dh0 = drawHud; drawHud = function (...a) {
  const r = dh0(...a);
  if (G.mode === 'play' && !LV.outdoor) {
    let y = 104;
    if (hero.shrine) { text(hero.shrine.name.replace('SHRINE OF ', '') + ' ' + Math.ceil(hero.shrine.t), 4, y, 51); y += 8; }
    if (LV.hasKey && LV.vault && !LV.vault.open) { text('VAULT KEY: FIND THE LOCKED VAULT', 4, y, 51); y += 8; }
    if (storyOn() && !LV.arena && markHidden(storyTarget())) text('EXPLORE: THE WAY ON IS SOMEWHERE ON THIS FLOOR', 4, y, 26);
  }
  return r;
}; }
// the safety net: a hero who ends up behind the shut vault gate, or inside a wall, steps back to where he can walk
{ const up1 = updatePortal; updatePortal = function (dt) {
  up1(dt);
  if (LV.outdoor || hero.dead || hero.leap || G.mode !== 'play') return;
  const k = tIdx(Math.floor(hero.fi), Math.floor(hero.fj)), V = LV.vault, behind = V && !V.open && V.inside && V.inside.has(k);
  if (!behind && LV.map[k] === FLOOR) return;
  const d = bfs(LV.start.cx, LV.start.cy); let best = null, bd = 1e9;
  for (let j = Math.max(0, Math.floor(hero.fj) - 12); j < Math.min(MH, Math.floor(hero.fj) + 13); j++) for (let i = Math.max(0, Math.floor(hero.fi) - 12); i < Math.min(MW, Math.floor(hero.fi) + 13); i++) {
    const kk = tIdx(i, j); if (d[kk] < 0 || !standable(i + 0.5, j + 0.5)) continue; const dd = Math.hypot(i + 0.5 - hero.fi, j + 0.5 - hero.fj); if (dd < bd) { bd = dd; best = [i + 0.5, j + 0.5]; } }
  if (best) { hero.fi = best[0]; hero.fj = best[1]; if (behind) say('THE VAULT IS LOCKED', 22, 2); }
}; }

// ---------------------------------------------------------------- round 104: Dave peeks in
// The user: Dave popped up at the wrong time, mid-fight: kill the right one and the table scene took over.
// Now the small beats (what was found at the three dangers) come as a strip folding down from the top of the
// screen: Dave (or whoever speaks) peeking over the edge with his book, the line typed out beside him, and the
// game going on underneath. The big beats stay at the table, and only when no foe is near (`foesNear`).
const foesNear = (r = 9) => enemies.some(e => alive(e) && !e.ally && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < r);
const PEEK_H = 52;
function peek(lines) { G.peek = { lines, k: 0, lt: 0, open: 0, closing: false }; sfx('tap', 0.6); }
function updatePeek(dt) {
  const P = G.peek; if (!P) return;
  if (P.closing) { P.open -= dt / 0.28; if (P.open <= 0) G.peek = null; return; }
  P.open = Math.min(1, P.open + dt / 0.28); if (P.open < 1) return;
  P.lt += dt; const L = P.lines[P.k], dur = 1.5 + L[2].length * 0.05;
  if (P.lt >= dur) { P.k++; P.lt = 0; if (P.k >= P.lines.length) { P.k = P.lines.length - 1; P.closing = true; } else sfx('tap', 0.4); }
}
function drawPeek() {
  const P = G.peek; if (!P || !(P.open > 0)) return;
  const k01 = P.open, e = k01 * k01 * (3 - 2 * k01), oy = Math.round(PEEK_H * e) - PEEK_H;   // it folds down from the top
  for (let y = 0; y < PEEK_H + oy; y++) { const row = y * W; for (let x = 0; x < W; x++) if (BAYER[((y & 3) << 2) | (x & 3)] < 0.9) out32[row + x] = PAL32[BLK]; }
  const yb = PEEK_H + oy; for (let x = 0; x < W; x++) { put(x, yb - 1, 50); put(x, yb, 3); }
  const [who, as, line] = P.lines[P.k], Pp = CINE_PEOPLE[who] || CINE_PEOPLE.dave;
  // his head, half size, peeking in over the strip's lower edge
  const cw = 72, ch = 60, x0 = Math.max(0, Pp.face[0] - 36), y0 = Math.max(0, Pp.face[1] - 38), talking = P.lt < line.length / 40, blink = (G.t % 3.1) < 0.12;
  for (let v = 0; v < ch / 2; v++) { const Y = yb - 2 - ch / 2 + v + 6; if (Y < 0 || Y >= yb - 1) continue;
    for (let u = 0; u < cw / 2; u++) { const sx = x0 + u * 2, sy = y0 + v * 2; if (sx >= Pp.w || sy >= Pp.h) continue; const si = sy * Pp.w + sx; let c = Pp.g[si]; if (!c) continue;
      if (blink && Pp.blinkM.has(si)) c = Pp.blinkM.get(si); if (talking && (G.t * 8 | 0) % 2 && Pp.talkM.has(si)) c = Pp.talkM.get(si);
      out32[Y * W + 6 + u] = Pp.lit.N[c]; } }
  if (who === 'dave') { fillRect(12, yb - 9, 24, 7, 34); fillRect(13, yb - 8, 10, 5, 26); fillRect(25, yb - 8, 10, 5, 26); put(23, yb - 8, 33); put(24, yb - 8, 33); }   // his book, held up to the chin
  const name = who === 'dave' ? 'DAVE' + (as ? ', AS ' + as : '') : (CINE_PEOPLE[who] ? CINE_PEOPLE[who].name : who.toUpperCase());
  text(name, 48, oy + 7, (CINE_PEOPLE[who] && CINE_PEOPLE[who].col) || 51);
  const n = Math.min(line.length, Math.floor(P.lt * 40)), shown = line.slice(0, n);
  wrapText(shown, 54).slice(0, 4).forEach((l, q) => text(l, 48, oy + 17 + q * 8, 26));
}
{ const up2 = updatePortal; updatePortal = function (dt) { up2(dt); updatePeek(dt); }; }
{ const dh2 = drawHud; drawHud = function (...a) { const r = dh2(...a); if (G.mode === 'play') drawPeek(); return r; }; }
