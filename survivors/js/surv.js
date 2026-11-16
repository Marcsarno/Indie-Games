'use strict';
// SURVIVORS MODE: the Diablo-style game (diablo-clone/game/js, loaded first) played as an auto-attack
// arena run. The game's own systems do the work: rig sprites, monsters and their AI, the spells and their
// effects, gore, sound, particles. This file swaps out the level (an open forest arena), the controls
// (move only: spells cast themselves), the spawns (waves on a timer), XP (gems to collect), levelling
// (pick 1 of 3 cards; a spell's third level is a choice of its three runes) and the HUD.
// Started with the Mage (the user, 2026-11-16). Design notes: survivors/PLAN.md and RESEARCH.md.

const SV_PARAMS = new URLSearchParams(location.search);
const SV = {
  on: false, t: 0, kills: 0, lvl: 1, xp: 0, queue: 0, serial: 0, spawnT: 0, eliteT: 0, cards: null, rune: null,
  w: {}, mods: {}, pas: {}, echo: [], end: null, endAt: 0, boss: null, bossDone: {}, picks: [], firstHurt: 0,
};

// ---------------------------------------------------------------- the Mage's spells as weapons
// cd = seconds between casts at level 1; range = how near a foe must be before it casts
const SV_WEAPONS = {
  missile: { name: 'MAGIC MISSILE', cd: 1.05, range: 8, fn: () => castMissiles(), desc: 'A HOMING BOLT OF ARCANE FORCE AT THE NEAREST FOE' },
  fireball: { name: 'FIREBALL', cd: 2.4, range: 8.5, fn: () => castFireball(), desc: 'A BALL OF FIRE THAT BURSTS ON WHAT IT HITS' },
  cone: { name: 'CONE OF COLD', cd: 4.2, range: 3.6, fn: () => coneOfCold(), desc: 'A BLAST OF FROST IN FRONT OF YOU. FREEZES THE WEAK, SLOWS THE STRONG' },
  meteor: { name: 'METEOR', cd: 6.5, range: 8, fn: () => castMeteor(), desc: 'A METEOR FALLS ON THE THICKEST CROWD' },
  chain: { name: 'CHAIN LIGHTNING', cd: 3.2, range: 7.5, fn: () => chainLightning(), desc: 'LIGHTNING THAT JUMPS FROM FOE TO FOE' },
};
const SV_WLVL = ['', 'NEW', 'CASTS 25% MORE OFTEN', 'CHOOSE ONE OF THREE RUNES', 'CASTS TWICE EACH TIME', 'CASTS 25% MORE OFTEN'];
const SV_MAXW = 5;
// passives: the item affixes of the Diablo game as level-up picks
const SV_PASSIVES = {
  might: { name: 'MIGHT', max: 5, desc: '+15% SPELL DAMAGE', ramp: [19, 20, 21, 22] },
  haste: { name: 'HASTE', max: 5, desc: 'ALL SPELLS CAST 8% MORE OFTEN', ramp: [48, 49, 50, 51] },
  vigor: { name: 'VIGOR', max: 5, desc: '+20 MAXIMUM LIFE, AND HEALS YOU', ramp: [52, 53, 54, 55] },
  swift: { name: 'SWIFTNESS', max: 3, desc: '+10% MOVE SPEED', ramp: [33, 34, 35, 36] },
  magnet: { name: 'MAGNETISM', max: 3, desc: 'PICK UP GEMS FROM 50% FARTHER AWAY', ramp: [56, 57, 58, 59] },
  regen: { name: 'RENEWAL', max: 3, desc: 'REGAIN 0.6 LIFE A SECOND', ramp: [52, 53, 54, 55] },
  crit: { name: 'INSIGHT', max: 3, desc: '+6% CHANCE TO CRIT', ramp: [37, 38, 39, 40] },
  ward: { name: 'WARD', max: 3, desc: '+5 ARMOR: TAKE LESS DAMAGE', ramp: [28, 29, 30, 31] },
};

// ---------------------------------------------------------------- waves (seconds from the start)
// [from, monster ids, groups a second, most alive at once]
const SV_WAVES = [
  [0, ['shroom', 'slime'], 0.7, 18],
  [40, ['wolf', 'shroom', 'fallen'], 1.1, 30],
  [90, ['fallen', 'knifer', 'goblin', 'wolf'], 2.0, 50],
  [150, ['skeleton', 'spearman', 'boar', 'fallen'], 2.6, 65],
  [210, ['skeleton', 'axeman', 'hound', 'gravebow'], 3.0, 80],
  [270, ['wolf', 'hound', 'mastiff', 'boar'], 3.4, 90],
  [330, ['skeleton', 'tombguard', 'archer', 'spearman', 'axeman'], 3.6, 100],
  [400, ['oclubber', 'goblin', 'gshaman', 'fallen', 'knifer'], 3.8, 105],
  [470, ['burning', 'wraith', 'skeleton', 'ghoulhound'], 4.0, 110],
  [540, ['oclubber', 'oenforcer', 'tombguard', 'burning'], 3.4, 100],
];
const SV_BOSSES = [[300, 'alpha'], [540, 'skelking']];   // the Alpha at 5:00, the Skeleton King at 9:00 (killing him wins)
const SV_PACKS = { wolf: 1, hound: 1, fallen: 1, knifer: 1, goblin: 1, shroom: 1, slime: 1, mastiff: 1 };

// ---------------------------------------------------------------- the arena
// A forest from the game's own generator, its middle cleared: the rim of trees, the dirt paths and a
// few lone trees stay (cover to weave round), everything else goes.
function svArena(seed) {
  genLevel(12, seed);   // a forest (the base game's Thornwood): its ground, paths and rim of trees
  LV.act = 0; LV.diff = 1; LV.night = false; LV.dusk = false; LV.stairs = { i: 0, j: 0, room: 0, road: true }; LV.backExit = null; LV.down = null; LV.gatePos = null;
  LV.spawns = []; LV.npcs = []; LV.river = []; LV.ponds = []; LV.bridges = []; bakePathField();   // no water: open ground all round
  const cx = MW / 2, cy = MH / 2, keep = new Set();
  LV.decor = LV.decor.filter(d => {
    const i = Math.floor(d.i ?? d.fi), j = Math.floor(d.j ?? d.fj);
    if (!(i >= 0 && j >= 0 && i < MW && j < MH)) return false;
    if (edgeBand(i, j)) return true;
    const k = tIdx(i, j);
    if ((d.kind === 'tree' || d.kind === 'rock') && LV.solid[k] && hash(i, j, 77) < 0.14 && Math.hypot(i - cx, j - cy) > 5) { keep.add(k); return true; }
    return !LV.solid[k] && d.kind !== 'signpost';
  });
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) { const k = tIdx(i, j); if (!edgeBand(i, j) && !keep.has(k)) LV.solid[k] = 0; }
  LV.start = { cx: Math.floor(cx), cy: Math.floor(cy), x: Math.floor(cx) - 2, y: Math.floor(cy) - 2, w: 4, h: 4 };
  LV.rooms = [LV.start];
  buildWorld();
  SV.floor0 = floorBuf.slice(); SV.washAt = 0;   // the clean ground, for the wash (svWash)
  makeNpcs();
  hero.fi = cx + 0.5; hero.fj = cy + 0.5; hero.atk = -1; hero.clip = 'idle'; hero.dead = 0; hero.dir = 1;
  enemies = []; boss = null;
  resetSkills(); resetFx();
  updateFov(hero.fi, hero.fj); flowT = 0; computeFlow();
  warmStep(1e9, prewarm());
  G.msg = [];
}

// ---------------------------------------------------------------- a run
function svReset() {
  Object.assign(SV, { t: 0, kills: 0, lvl: 1, xp: 0, queue: 0, spawnT: 0.5, eliteT: 75, cards: null, rune: null, w: { missile: { lvl: 1, cd: 0.4 } }, mods: {}, pas: {}, echo: [], end: null, boss: null, bossDone: {}, picks: [], firstHurt: 0, grace: 0 });
  if (SV_PARAMS.get('t')) SV.t = +SV_PARAMS.get('t');   // (testing: start the clock later)
}
function svNewRun() {
  newHero('mage'); hero.lvl = 1; svReset(); SV.on = true;
  svArena((Math.random() * 1e9) >>> 0);
  recalcHero(); hero.hp = STAT.maxHp;
}
function svBegin() { G.mode = 'play'; G.hudInT = 0; sfx('portal'); say('SURVIVE', 51, 2); }
const svNeed = l => Math.round(3 + l * 3 + l * l * 0.2);   // gems to the next level (6, 10, 14 ... 53 at 10: a pick every 20-30 s)
const svAlive = () => { let n = 0; for (const e of enemies) if (alive(e)) n++; return n; };

// ---------------------------------------------------------------- casting
// A spell is cast in one go: the game's own cast function aims and starts it, then its release runs at
// once and the cast is cleared, so the Mage never stops walking.
function svCast(id) {
  const W = SV_WEAPONS[id];
  if (!nearestEnemy(W.range)) return false;
  hero.cast = -1; hero.castFn = null;
  if (W.fn() === false) return false;
  const f = hero.castFn; hero.castFn = null;
  if (f) f();
  hero.cast = -1; hero.castKind = null; if (hero.clip === 'channel') hero.clip = 'idle';
  return true;
}
const svCd = id => SV_WEAPONS[id].cd * (SV.w[id].lvl >= 2 ? 0.8 : 1) * (SV.w[id].lvl >= 5 ? 0.8 : 1) * Math.pow(0.92, SV.pas.haste || 0);
function svWeapons(dt) {
  for (const id in SV.w) {
    const w = SV.w[id]; w.cd -= dt;
    if (w.cd > 0) continue;
    if (svCast(id)) { w.cd = svCd(id); if (w.lvl >= 4) SV.echo.push({ id, t: 0.28 }); }
    else w.cd = 0.15;   // nothing in reach: look again shortly
  }
  for (const q of SV.echo) { q.t -= dt; if (q.t <= 0) svCast(q.id); }
  SV.echo = SV.echo.filter(q => q.t > 0);
}

// ---------------------------------------------------------------- spawning
function svWave() { let w = SV_WAVES[0]; for (const x of SV_WAVES) if (SV.t >= x[0]) w = x; return w; }
const svMonLvl = () => 1 + SV.t / 50;
// a free spot r0-r1 tiles from the hero; off = just outside the view instead (the portrait view reaches
// about 6 tiles to the sides but 20 up and down, so a ring round the hero would pop monsters in on screen)
function svSpot(r0, r1, off = false) {
  for (let t = 0; t < 40; t++) {
    let fi, fj;
    if (off) {
      const m = 14, w = W + 2 * m, h = H + 2 * m, s = Math.random() * 2 * (w + h);
      const [x, y] = s < w ? [s, 0] : s < w + h ? [w, s - w] : s < 2 * w + h ? [s - w - h, h] : [0, s - 2 * w - h];
      [fi, fj] = groundToTile(camX - m + x, camY - m + y);
    } else { const a = Math.random() * 6.283, r = r0 + Math.random() * (r1 - r0); fi = hero.fi + Math.cos(a) * r; fj = hero.fj + Math.sin(a) * r; }
    if (!blocked(fi, fj) && !edgeBand(Math.floor(fi), Math.floor(fj))) return [fi, fj];
  }
  return null;
}
function svSpawn(id, fi, fj, opt = {}) {
  const e = makeEnemy(id, fi, fj, SV.serial++, opt.lvl || svMonLvl());
  e.state = 'hunt'; e.alertT = 0; e.mayEngage = true; e.dir = dirFrom(hero.fi - fi, hero.fj - fj);
  // many small hits, not a few big ones: a monster's blow grows 10% a level (the dungeon game's curve, made for
  // one pack at a time, had a crowd at 4:00 killing the Mage in two blows)
  { const L = opt.lvl || svMonLvl(); e.dmg = e.def.dmg.map(v => Math.max(1, Math.round(v * (1 + (L - 1) * 0.1)))); }
  enemies.push(e);
  return e;
}
function svSpawns(dt) {
  const [, ids, rate, cap] = svWave();
  SV.spawnT -= dt;
  while (SV.spawnT <= 0) {
    SV.spawnT += 1 / rate;
    if (svAlive() >= cap) continue;
    const id = ids[Math.floor(Math.random() * ids.length)], p = svSpot(9.5, 12, true);
    if (!p) continue;
    const n = SV_PACKS[id] ? 2 + Math.floor(Math.random() * 3) : 1;
    for (let k = 0; k < n; k++) { const q = [p[0] + (Math.random() - 0.5) * 1.6, p[1] + (Math.random() - 0.5) * 1.6]; if (!blocked(q[0], q[1])) svSpawn(id, q[0], q[1]); }
  }
  // an elite every 75 seconds from 1:15: a champion with its powers, two of its kind beside it; it drops a chest
  if (SV.t >= SV.eliteT) {
    SV.eliteT += 75;
    const id = ids.filter(x => !SV_PACKS[x])[0] || ids[0], p = svSpot(9.5, 11, true);
    if (p) { const e = svSpawn(id, p[0], p[1]); makeChampion(e, rng((Math.random() * 1e9) >>> 0)); e.svChest = true; for (let k = 0; k < 2; k++) svSpawn(id, p[0] + (k ? 0.8 : -0.8), p[1] + 0.5); say(`${e.name || 'AN ELITE'} APPROACHES`, 22, 2.5); sfx('growl'); }
  }
  // stragglers left far behind come round again: moved to just outside the view, so the crowd stays on the hero
  SV.relocT = (SV.relocT || 0) - dt;
  if (SV.relocT <= 0) {
    SV.relocT = 0.5;
    for (const e of enemies) if (alive(e) && e !== boss && !e.champ && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) > 15) { const p = svSpot(0, 0, true); if (p) { e.fi = p[0]; e.fj = p[1]; e.atk = -1; } }
  }
  for (const [at, id] of SV_BOSSES) if (SV.t >= at && !SV.bossDone[id]) {
    SV.bossDone[id] = true;
    const p = svSpot(8, 10, true); if (!p) { SV.bossDone[id] = false; continue; }
    const e = svSpawn(id, p[0], p[1], { lvl: svMonLvl() * 0.7 }); e.svChest = true; boss = e; boss.special = 4; SV.boss = e;
  }
}

// ---------------------------------------------------------------- kills, gems, chests
const XP_GEM = { blue: { name: 'XP', cols: [38, 39, 40], worth: 0 }, green: { name: 'XP', cols: [53, 54, 55], worth: 0 }, purple: { name: 'XP', cols: [57, 58, 59], worth: 0 } };
const HEAL_GEM = { name: 'LIFE', cols: [20, 22, 23], worth: 0 }, CHEST_GEM = { name: 'CHEST', cols: [49, 50, 51], worth: 0 };
function svKilled(e) {
  SV.kills++;
  const v = e.def.unique ? 40 : Math.max(1, Math.round((e.def.xp || 12) / 12)) * (e.champ ? 5 : 1);
  groundItems.push({ gem: v >= 10 ? XP_GEM.purple : v >= 3 ? XP_GEM.green : XP_GEM.blue, xp: v, fi: e.fi, fj: e.fj, t: 0.3 });
  if (Math.random() < 0.012) groundItems.push({ gem: HEAL_GEM, svHeal: true, fi: e.fi + 0.3, fj: e.fj, t: 0 });
  if (e.svChest) { groundItems.push({ gem: CHEST_GEM, svChest: true, fi: e.fi, fj: e.fj + 0.3, t: 0 }); say('A CHEST!', 51, 2); }
  if (e === SV.boss) { SV.boss = null; if (e.id === 'skelking') { SV.won = true; setTimeout(() => svEnd(true), 1600); } }
}
function svPickup(g) {
  if (g.xp) { svGainXp(g.xp); sfx('clink', 0.35); return true; }
  if (g.svHeal) { hero.hp = Math.min(STAT.maxHp, hero.hp + STAT.maxHp * 0.3); sfx('potion'); floater('+LIFE', hero.fi, hero.fj, 40, 54); return true; }
  if (g.svChest) { svChest(); return true; }
  return false;
}
// a chest: usually one free upgrade, sometimes three, rarely five (the slot machine)
function svChest() {
  const q = Math.random(), n = q < 0.06 ? 5 : q < 0.3 ? 3 : 1, got = [];
  for (let k = 0; k < n; k++) { const c = svOffer(1, true)[0]; if (!c) break; if (c.kind === 'w' && SV.w[c.id] && SV.w[c.id].lvl === 2) { SV.queue++; got.push(c.name + ': PICK A RUNE'); continue; } svApply(c); got.push(c.name + (c.kind === 'w' && SV.w[c.id].lvl === 1 ? '' : ' ' + svLvlOf(c))); }
  SV.chestShow = { t: 3.2, lines: got, n };
  sfx('chest'); sfx('levelUp'); if (n > 1) sfx('gold');
  const [x, y] = screenOf(hero); burst(4, x, y, 10, 30 * n, 60, 51);
}
function svGainXp(v) {
  SV.xp += v;
  while (SV.xp >= svNeed(SV.lvl)) { SV.xp -= svNeed(SV.lvl); SV.lvl++; SV.queue++; }
}
function svMagnet(dt) {
  const R = 1.7 * (1 + 0.5 * (SV.pas.magnet || 0));
  for (const g of groundItems) {
    if (!(g.xp || g.svHeal || g.svChest)) continue;
    const dx = hero.fi - g.fi, dy = hero.fj - g.fj, d = Math.hypot(dx, dy);
    if (g.pull || (d < R && !g.svChest)) { g.pull = (g.pull || 3) + dt * 14; const s = Math.min(d, g.pull * dt); if (d > 1e-3) { g.fi += dx / d * s; g.fj += dy / d * s; } g.t = Math.max(g.t, 0.41); }
  }
}

// ---------------------------------------------------------------- level-up cards
function svLvlOf(c) { return c.kind === 'w' ? `LV ${SV.w[c.id] ? SV.w[c.id].lvl : 1}` : `LV ${SV.pas[c.id] || 0}`; }
// every card the pool can offer now
function svPool() {
  const out = [], nw = Object.keys(SV.w).length;
  for (const id in SV_WEAPONS) {
    const w = SV.w[id];
    if (!w && nw < SV_MAXW) out.push({ kind: 'w', id, name: SV_WEAPONS[id].name, line: 'NEW SPELL', desc: SV_WEAPONS[id].desc, wt: 1.4 });
    else if (w && w.lvl < 5) out.push({ kind: 'w', id, name: SV_WEAPONS[id].name, line: `LEVEL ${w.lvl + 1}`, desc: SV_WLVL[w.lvl + 1], wt: w.lvl === 2 ? 1.6 : 1.2 });
  }
  for (const id in SV_PASSIVES) { const p = SV_PASSIVES[id], l = SV.pas[id] || 0; if (l < p.max) out.push({ kind: 'p', id, name: p.name, line: l ? `LEVEL ${l + 1}` : 'NEW', desc: p.desc, wt: 1 }); }
  return out;
}
function svOffer(n = 3, noRune = false) {
  let pool = svPool(); if (noRune) pool = pool.filter(c => !(c.kind === 'w' && SV.w[c.id] && SV.w[c.id].lvl === 2)).concat([]);
  const out = [];
  // the first two level-ups always offer a new spell: the run takes a shape early
  if (SV.lvl <= 3 && !noRune) { const nw = pool.filter(c => c.kind === 'w' && !SV.w[c.id]); if (nw.length) { const c = nw[Math.floor(Math.random() * nw.length)]; out.push(c); pool = pool.filter(x => x !== c); } }
  while (out.length < n && pool.length) {
    let tot = 0; for (const c of pool) tot += c.wt;
    let r = Math.random() * tot, pick = pool[0];
    for (const c of pool) { r -= c.wt; if (r <= 0) { pick = c; break; } }
    out.push(pick); pool = pool.filter(x => x !== pick);
  }
  if (!out.length) out.push({ kind: 'heal', id: 'heal', name: 'A DRINK FROM THE WELL', line: '', desc: 'HEALS YOU FULLY' });
  return out;
}
function svApply(c) {
  SV.picks.push(c.id);
  if (c.kind === 'heal') { hero.hp = STAT.maxHp; return; }
  if (c.kind === 'w') { if (!SV.w[c.id]) SV.w[c.id] = { lvl: 1, cd: 0.3 }; else SV.w[c.id].lvl++; return; }
  if (c.kind === 'p') { SV.pas[c.id] = (SV.pas[c.id] || 0) + 1; const hp0 = STAT.maxHp; recalcHero(); if (c.id === 'vigor') hero.hp = Math.min(STAT.maxHp, hero.hp + (STAT.maxHp - hp0) + STAT.maxHp * 0.25); return; }
  if (c.kind === 'rune') { SV.mods[c.wid] = c.id; SV.w[c.wid].lvl = 3; }
}
function svOpenCards() {
  SV.queue--;
  SV.cards = svOffer(3); SV.rune = null; SV.cardT = G.t;
  G.mode = 'svcards'; clearInput(); sfx('levelUp');
}
function svPick(k) {
  const c = SV.cards && SV.cards[k]; if (!c || G.t - SV.cardT < 0.35) return;
  sfx('tap');
  if (c.kind === 'w' && SV.w[c.id] && SV.w[c.id].lvl === 2) {   // the third level: the rune choice
    SV.cards = SKILL_MODS[c.id].map(m => ({ kind: 'rune', wid: c.id, id: m.id, name: m.name, line: SV_WEAPONS[c.id].name + ' RUNE', desc: m.desc.replace(/[.,]? ?COSTS? \d+ MORE (MANA|FURY)/, '').replace(/[.,] \d+ MORE (MANA|FURY)/, '') }));   // (no mana here)
    SV.rune = c.id; SV.cardT = G.t; return;
  }
  svApply(c); SV.cards = null; SV.rune = null;
  if (c.kind === 'rune') { say(`${SV_WEAPONS[c.wid].name}: ${c.name}`, 51, 2.5); sfx('chest'); }
  G.mode = 'play'; last = performance.now();
}
function svCardRects() {
  const n = SV.cards.length, w = W - 28, h = 62, gap = 8, y0 = Math.round(H * 0.5 - (n * h + (n - 1) * gap) / 2) + 10;
  return SV.cards.map((c, k) => ({ x: 14, y: y0 + k * (h + gap), w, h }));
}

// ---------------------------------------------------------------- the end of a run
function svEnd(won) {
  if (SV.end) return;
  SV.end = { won, t: SV.t, kills: SV.kills, lvl: SV.lvl }; SV.endAt = G.t; G.mode = 'svend'; clearInput();
  if (won) { sfx('levelUp'); sfx('chest'); } else sfx('death');
  try { const best = JSON.parse(localStorage.getItem('sv-best') || '{}'); if (!(best.t >= SV.t)) { best.t = SV.t; best.kills = SV.kills; localStorage.setItem('sv-best', JSON.stringify(best)); } } catch (e) { /* storage blocked */ }
}

// The dungeon game presses blood, bones and body parts into the floor for good. A thousand kills would
// carpet the arena and hide the next wave, so the ground washes back to clean, a scattered pixel at a time
// (a random order through every pixel): a mark fades out over about WASH_T seconds.
const WASH_T = 25, WASH_STEP = 1000003;
function svWash(dt) {
  const F0 = SV.floor0; if (!F0 || F0.length !== floorBuf.length) return;
  const N = F0.length, n = Math.ceil(N * dt / WASH_T);
  let k = SV.washAt;
  for (let s = 0; s < n; s++) {
    k += WASH_STEP; if (k >= N) k -= N;
    const v = F0[k]; if (floorBuf[k] !== v) { floorBuf[k] = v; if (wFloor[k]) wIdx[k] = v; }
  }
  SV.washAt = k;
}

// ---------------------------------------------------------------- per frame (after the game's own update)
function svUpdate(dt) {
  if (G.mode !== 'play' || G.paused) return;
  if (hero.dead) { if (hero.dead > 1.4) svEnd(false); return; }
  SV.t += dt;
  svWeapons(dt); svSpawns(dt); svMagnet(dt); svWash(dt);
  G.trauma = Math.min(G.trauma, 0.32);   // a kill shakes the screen in the dungeon game: a hundred at once would never stop
  if (SV.chestShow) { SV.chestShow.t -= dt; if (SV.chestShow.t <= 0) SV.chestShow = null; }
  // the dead are cleared away once their death has played (the list would grow by thousands)
  if (enemies.length > 60) enemies = enemies.filter(e => alive(e) || e.dying < 2.2 || e === boss);
  // gems far behind are folded into one, so the floor never holds hundreds
  if (groundItems.length > 160) { let v = 0; groundItems = groundItems.filter(g => { if (g.xp && Math.hypot(g.fi - hero.fi, g.fj - hero.fj) > 9) { v += g.xp; return false; } return true; }); if (v) { const p = svSpot(4, 7); if (p) groundItems.push({ gem: XP_GEM.purple, xp: v, fi: p[0], fj: p[1], t: 0 }); } }
  if (SV.queue > 0 && !SV.end) svOpenCards();
  if (SV_PARAMS.get('bot')) svBot();
}
// testing: ?bot=1 picks at random; ?bot=2 plays focused: up to three spells, levels them, then might and haste
function svBotPick() {
  if (SV_PARAMS.get('bot') !== '2') return Math.floor(Math.random() * SV.cards.length);
  const C = SV.cards, nw = Object.keys(SV.w).length, score = c => c.kind === 'rune' ? Math.random() : c.kind === 'w' ? (SV.w[c.id] ? 10 + SV.w[c.id].lvl : nw < 3 ? 9 : 0) : c.id === 'might' ? 6 : c.id === 'haste' ? 5 : c.id === 'vigor' ? 4 : 1;
  let best = 0; C.forEach((c, k) => { if (score(c) > score(C[best])) best = k; }); return best;
}
// testing: a bot that walks away from the crowd, round the arena, and goes for gems
function svBot() {
  let ax = 0, ay = 0;
  for (const e of enemies) { if (!alive(e)) continue; const dx = hero.fi - e.fi, dy = hero.fj - e.fj, d = Math.hypot(dx, dy); if (d < 5) { ax += dx / (d * d + 0.3); ay += dy / (d * d + 0.3); } }
  const cx = MW / 2 - hero.fi, cy = MH / 2 - hero.fj, a = G.t * 0.35; ax += cx * 0.02 + Math.cos(a) * 0.3; ay += cy * 0.02 + Math.sin(a) * 0.3;
  let g = null, gd = 6; for (const q of groundItems) { const d = Math.hypot(q.fi - hero.fi, q.fj - hero.fj); if (d < gd) { gd = d; g = q; } }   // and goes for the gems
  if (g) { ax += (g.fi - hero.fi) / gd * 0.8; ay += (g.fj - hero.fj) / gd * 0.8; }
  const sx = ax - ay, sy = (ax + ay) * 0.5, l = Math.hypot(sx, sy) || 1;   // tile space to the screen-space stick
  input.mx = sx / l; input.my = sy / l;
}

// ---------------------------------------------------------------- the HUD
function svPad(n) { return n < 10 ? '0' + n : '' + n; }
function svTime(t) { t = Math.max(0, Math.floor(t)); return `${svPad(Math.floor(t / 60))}:${svPad(t % 60)}`; }
function svDim(a = 0.7) { for (let y = 0, o = 0; y < H; y++) for (let x = 0; x < W; x++, o++) if (BAYER[((y & 3) << 2) | (x & 3)] < a) out32[o] = PAL32[BLK]; }
function svIcon(c, cx, cy, r) {
  if (c.kind === 'w' || c.kind === 'rune') { const id = c.kind === 'rune' ? c.wid : c.id, sk = SKILLSETS.mage.find(s => s.id === id) || { id, lvl: 1 }; skillIcon(sk, 0, cx, cy, r, false); return; }
  const p = SV_PASSIVES[c.id]; drawButton([cx, cy, r], p ? p.ramp : [52, 53, 54, 55], false, (x, y) => textC(p ? p.name[0] : '+', x + 1, y - 2, 27));
}
function svHud() {
  // floating damage numbers
  for (const fl of floaters) {
    const sx2 = Math.round(fl.x - camX), sy2 = Math.round(fl.y - camY);
    if (fl.t < 0.3 && BAYER[(sx2 & 3) + ((sy2 & 3) << 2)] > fl.t / 0.3) continue;
    textC(fl.text, sx2, sy2, fl.col, fl.size || 1);
  }
  if (G.mode === 'svtitle') return svTitle();
  // the hero's life under his feet
  { const [x, y] = screenOf(hero), sx = Math.round(x - camX), sy = Math.round(y - camY) + 5, w = 22, f = Math.max(0, hero.hp / STAT.maxHp);
    fillRect(sx - w / 2 - 1, sy - 1, w + 2, 4, BLK); fillRect(sx - w / 2, sy, Math.round(w * f), 2, f < 0.3 && Math.sin(G.t * 10) > 0 ? 23 : 21); }
  // top: the XP bar, the level, the clock, the kills
  { const f = SV.xp / svNeed(SV.lvl); fillRect(0, 0, W, 7, BLK); fillRect(1, 1, Math.round((W - 2) * f), 5, 39); fillRect(1, 1, Math.round((W - 2) * f), 1, 40);
    text(`LV ${SV.lvl}`, 3, 10, 27); textC(svTime(SV.t), W / 2, 10, 27, 2); const k = `${SV.kills}`; text(k, W - 3 - textWidth(k), 10, 25); text('KILLS', W - 3 - textWidth('KILLS'), 17, 4); }
  // the spells owned, with their levels
  { let x = 4; for (const id in SV.w) { svIcon({ kind: 'w', id }, x + 8, 34, 7); for (let l = 0; l < SV.w[id].lvl; l++) put(x + 2 + l * 3, 44, SV.mods[id] && l === 2 ? 51 : 27); x += 19; }
    for (const id in SV.pas) { text(`${SV_PASSIVES[id].name[0]}${SV.pas[id]}`, x + 2, 32, 25); x += 13; } }
  G.msg.forEach((m, n) => textC(m.text, W / 2, 52 + n * 8, m.col));
  // a boss: its name and its life along the bottom
  if (SV.boss && alive(SV.boss)) { const b = SV.boss, w = W - 40, f = b.hp / b.maxHp; textC(b.def.name, W / 2, H - 24, 22); fillRect(19, H - 15, w + 2, 6, BLK); fillRect(20, H - 14, Math.round(w * f), 4, 21); }
  if (G.bossIntro > 0 && boss) {
    const t = 2.8 - G.bossIntro, open = Math.min(1, t / 0.25, G.bossIntro / 0.35), cy = Math.round(H * 0.3), hh = Math.round(22 * open);
    for (let y = cy - hh; y < cy + hh; y++) for (let x = 0; x < W; x++) if (BAYER[((y & 3) << 2) | (x & 3)] < 0.75) put(x, y, BLK);
    if (open > 0.8) { textC(boss.def.name, W / 2, cy - 11, 22, 2); if (boss.def.title) textC(boss.def.title, W / 2, cy + 6, 26); }
  }
  if (SV.chestShow) { const C = SV.chestShow, y0 = Math.round(H * 0.24); textC(C.n >= 5 ? 'A HUGE CHEST!' : C.n >= 3 ? 'A RICH CHEST!' : 'A CHEST', W / 2, y0, 51, 2); C.lines.forEach((l, n) => textC(l, W / 2, y0 + 18 + n * 8, 26)); }
  text(SFX.muted ? 'SOUND OFF' : 'SOUND ON', W - 3 - textWidth(SFX.muted ? 'SOUND OFF' : 'SOUND ON'), H - 8, 4);
  if (SV_PARAMS.get('fps')) text(`${fpsShown} FPS ${workShown.toFixed(1)}MS ${svAlive()} FOES`, 3, H - 8, 25);
  if (G.mode === 'svcards') svDrawCards();
  if (G.mode === 'svend') svDrawEnd();
  if (G.paused) { svDim(0.5); textC('PAUSED', W / 2, H * 0.45, 27, 2); textC('TAP TO GO ON', W / 2, H * 0.45 + 18, 26); }
}
function svDrawCards() {
  svDim(0.6);
  const R = svCardRects();
  textC(SV.rune ? 'CHOOSE A RUNE' : 'LEVEL UP!', W / 2, R[0].y - 30, 51, 2);
  textC(SV.rune ? SV_WEAPONS[SV.rune].name + ' CHANGES FOR GOOD' : 'PICK ONE', W / 2, R[0].y - 13, 26);
  SV.cards.forEach((c, k) => {
    const r = R[k];
    fillRect(r.x, r.y, r.w, r.h, 3); frame(r.x, r.y, r.w, r.h, c.kind === 'rune' ? 50 : 6, c.kind === 'rune' ? 48 : 3);
    svIcon(c, r.x + 18, r.y + 20, 11);
    text(c.name, r.x + 36, r.y + 8, c.kind === 'rune' ? 51 : 27);
    text(c.line, r.x + 36, r.y + 17, c.line === 'NEW SPELL' || c.line === 'NEW' ? 54 : 50);
    wrapText(c.desc, 44).forEach((l, n) => text(l, r.x + 36, r.y + 29 + n * 8, 26));
    text(`${k + 1}`, r.x + r.w - 9, r.y + 6, 4);
  });
}
function svDrawEnd() {
  svDim(0.75);
  const E = SV.end, y0 = Math.round(H * 0.22);
  textC(E.won ? 'VICTORY!' : 'YOU HAVE FALLEN', W / 2, y0, E.won ? 51 : 22, 2);
  textC(E.won ? 'THE SKELETON KING IS DEAD' : `YOU LASTED ${svTime(E.t)}`, W / 2, y0 + 20, 26);
  textC(`LEVEL ${E.lvl}    ${E.kills} KILLS`, W / 2, y0 + 32, 25);
  let y = y0 + 54; textC('YOUR BUILD', W / 2, y, 50); y += 12;
  for (const id in SV.w) { svIcon({ kind: 'w', id }, 40, y + 4, 7); text(`${SV_WEAPONS[id].name} LV ${SV.w[id].lvl}`, 54, y, 27); if (SV.mods[id]) text(SKILL_MODS[id].find(m => m.id === SV.mods[id]).name, 54, y + 8, 51); y += 20; }
  const ps = Object.keys(SV.pas).map(id => `${SV_PASSIVES[id].name} ${SV.pas[id]}`); wrapText(ps.join(', '), 48).forEach(l => { textC(l, W / 2, y, 25); y += 8; });
  try { const best = JSON.parse(localStorage.getItem('sv-best') || '{}'); if (best.t) textC(`BEST: ${svTime(best.t)}`, W / 2, y + 8, 4); } catch (e) { /* storage blocked */ }
  if (G.t - SV.endAt > 1.2) textC('TAP TO PLAY AGAIN', W / 2, H - 50, 27);
}
function svTitle() {
  svDim(0.45);
  const y0 = Math.round(H * 0.2);
  textC('DUNGEONS OF BONES', W / 2, y0, 26); textC('SURVIVORS', W / 2, y0 + 12, 51, 3);
  textC('THE MAGE', W / 2, y0 + 50, 39, 2);
  ['MOVE: DRAG ANYWHERE (OR WASD)', 'YOUR SPELLS CAST THEMSELVES', 'GRAB THE GEMS TO LEVEL UP', 'THE SKELETON KING COMES AT 9:00'].forEach((l, n) => textC(l, W / 2, y0 + 80 + n * 10, 26));
  try { const best = JSON.parse(localStorage.getItem('sv-best') || '{}'); if (best.t) textC(`BEST: ${svTime(best.t)}, ${best.kills} KILLS`, W / 2, y0 + 130, 4); } catch (e) { /* storage blocked */ }
  if (Math.sin(G.t * 4) > -0.3) textC('TAP TO START', W / 2, H * 0.72, 27, 2);
}

// ---------------------------------------------------------------- input (ahead of the game's own)
// Taps go to the cards and screens here; in play a touch anywhere is the floating stick.
addEventListener('pointerdown', e => {
  if (e.target !== cvs) return;
  e.preventDefault(); e.stopImmediatePropagation();
  audioInit();
  const p = toNative(e);
  if (G.paused) { G.paused = false; last = performance.now(); return; }
  if (G.mode === 'svtitle') { svBegin(); return; }
  if (G.mode === 'svcards') { const R = svCardRects(); R.forEach((r, k) => { if (inRect(p, r)) svPick(k); }); return; }
  if (G.mode === 'svend') { if (G.t - SV.endAt > 1.2) { svNewRun(); svBegin(); } return; }
  if (G.mode !== 'play') return;
  if (p[0] > W - 50 && p[1] > H - 16) { setMuted(!SFX.muted); return; }
  if (stick.id === null) { stick.id = e.pointerId; stick.ox = p[0]; stick.oy = p[1]; stick.x = p[0]; stick.y = p[1]; capture(e); }
}, { capture: true, passive: false });
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  audioInit();
  if (G.mode === 'svtitle') { if (k === 'enter' || k === ' ') svBegin(); e.stopImmediatePropagation(); return; }
  if (G.mode === 'svcards') { if (k >= '1' && k <= '3') svPick(+k - 1); e.stopImmediatePropagation(); return; }
  if (G.mode === 'svend') { if ((k === 'enter' || k === ' ') && G.t - SV.endAt > 1.2) { svNewRun(); svBegin(); } e.stopImmediatePropagation(); return; }
  if (k === 'n') { setMuted(!SFX.muted); e.stopImmediatePropagation(); return; }
  if (k === 'p' || k === 'escape') { G.paused = !G.paused; e.stopImmediatePropagation(); return; }
  if (!['w', 'a', 's', 'd', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) e.stopImmediatePropagation();   // only movement reaches the game
}, { capture: true });

// ---------------------------------------------------------------- hooks into the game
{
  const _update = update, _damage = damageEnemy, _pickup = pickup, _recalc = recalcHero, _hurt = hurtHero;
  // a moment's grace after a blow (0.3 s), so a crowd's swings land one by one instead of all in one frame
  hurtHero = function (dmg, src) { if (SV.on) { if (G.t < SV.grace) return; SV.grace = G.t + 0.3; } _hurt(dmg, src); };
  update = function (dt) {
    for (let k = 0, n = +SV_PARAMS.get('speed') || 1; k < n; k++) { _update(dt); if (SV.on) svUpdate(dt); }   // (?speed=4 for test runs)
    if (!SV.on) return;
    if (SV_PARAMS.get('bot')) { if (G.mode === 'svtitle') svBegin(); if (G.mode === 'svcards' && G.t - SV.cardT > 0.4) svPick(svBotPick()); }   // (testing)
  };
  damageEnemy = function (e, ...a) { const was = alive(e); _damage(e, ...a); if (SV.on && was && !alive(e)) svKilled(e); };
  pickup = g => SV.on ? svPickup(g) || (!g.xp && !g.svHeal && !g.svChest && _pickup(g)) : _pickup(g);
  recalcHero = function () {
    _recalc(); if (!SV.on) return;
    const p = SV.pas, k = 1 + 0.15 * (p.might || 0);
    STAT.dmg = [STAT.dmg[0] * k, STAT.dmg[1] * k];
    STAT.maxHp = Math.round(STAT.maxHp * 2.5) + 20 * (p.vigor || 0); STAT.speed *= 1 + 0.1 * (p.swift || 0);
    STAT.crit = (STAT.crit || 0) + 6 * (p.crit || 0); STAT.armor = (STAT.armor || 0) + 5 * (p.ward || 0); STAT.regen = (STAT.regen || 0) + 0.6 * (p.regen || 0);
  };
  skillMod = id => SV.on ? SV.mods[id] || null : null;   // the runes are chosen in the run
  gainXp = () => {};   // XP comes from the gems
  dropLoot = () => {};   // no gear on the floor (chests instead)
  assignEngage = () => { for (const e of enemies) e.mayEngage = true; };   // the whole swarm comes on (the dungeon game holds most of a pack back)
  saveGame = () => {};   // never touches the dungeon game's saves
  startGuide = () => {}; guideKill = () => {}; guideLevel = () => {};   // no tutorial pop-ups
  drawHud = svHud;
  MUSIC_MODES.svtitle = 0.6; MUSIC_MODES.svcards = 0.6; MUSIC_MODES.svend = 0.8;
  window.SV = SV;
}
// boot: a run is ready behind the title
svNewRun(); G.mode = 'svtitle';
