'use strict';
// SURVIVORS: more skills than slots (round 4, REVIEW.md steps 1-2). Every hero now has 7-8 skills of its own plus
// three any hero can take, and only FOUR slots beside the basic weapon, so two runs of a hero end with different kits.
//   From the Diablo game: Divine Toll and Wrath of Heaven (Paladin); Blood Roar, Earthsplitter, Uproot and Titan's
//   Crescent (Barbarian; the hero stands still for their short wind-up); Multishot, Snare Trap, Hawk and Hunter's Mark
//   (Ranger). Left out: moves that carry the hero on their own (Lance of Dawn, Reaver's Rush, Skyfall, Seraph's Fall).
//   New for the Mage: THUNDERSTORM (bolts from the sky on foes near), BLIZZARD (ice bursts over the thickest crowd),
//   ARCANE ORB (a slow orb that zaps all near it).
//   For every hero (the brief's archetypes): BONE ORBIT (skulls circle you), HOLY AURA (burns all close to you),
//   ASH TRAIL (fire where you walk).
// The survivors passives: AMOUNT (+1 cast of every skill, +1 skull, +1 arrow), AREA (+15% size), DURATION (+20%).
// Skills with no runes of their own get two plain ones: ECHO (casts again) and SWIFT (much more often).

// ---------------------------------------------------------------- the new skills
const SV_FX = { thunder: [], bliz: [] };
SV_HOOKS.newRun.push(() => { SV_FX.thunder = []; SV_FX.bliz = []; SV.orbAng = 0; SV.trailT = 0; SV.auraT = 0; SV.orbHit = new Map(); });
Object.assign(SV_WEAPONS, {
  thunder: { cls: 'mage', name: 'THUNDERSTORM', cd: 6, range: 7, desc: 'FOR 2 SECONDS, BOLTS FROM THE SKY STRIKE FOES NEAR YOU',
    fn: () => { SV_FX.thunder.push({ t: 2.2 * svDur(), next: 0, every: SV.mods.thunder === 'fury' ? 0.18 : 0.3, big: SV.mods.thunder === 'great' }); sfx('zap'); return true; } },
  bliz: { cls: 'mage', name: 'BLIZZARD', cd: 7, range: 8, desc: 'ICE BURSTS RAIN ON THE THICKEST CROWD FOR 3 SECONDS. THEY CHILL AND FREEZE',
    fn: () => { const t = thickest(8); if (!t) return false; SV_FX.bliz.push({ fi: t.fi, fj: t.fj, t: 3 * svDur(), next: 0, r: 2.2 * svArea() * (SV.mods.bliz === 'wide' ? 1.4 : 1) }); sfx('frost'); return true; } },
  orb: { cls: 'mage', name: 'ARCANE ORB', cd: 4.5, range: 7, desc: 'A SLOW ORB OF ARCANE FORCE THAT ZAPS ALL NEAR IT AS IT DRIFTS, THEN BURSTS',
    fn: () => { const t = nearestEnemy(7); const a = t ? Math.atan2(t.fj - hero.fj, t.fi - hero.fi) : 0, [ox, oy] = staffTip ? staffTip() : [hero.fi, hero.fj];
      const big = SV.mods.orb === 'grand', n = SV.mods.orb === 'twin' ? 2 : 1;
      for (let k = 0; k < n; k++) projectiles.push({ kind: 'missile', fi: ox, fj: oy, vx: Math.cos(a + (k - (n - 1) / 2) * 0.5) * 2.2, vy: Math.sin(a + (k - (n - 1) / 2) * 0.5) * 2.2, z: ORB_Z, life: 3.4 * svDur(), owner: 'hero', home: null, noHome: true, orb: true, pulse: 0.15, spell: true, dmgK: big ? 0.65 : 0.45, age: 0, spin: 0, elem: 'arcane' });
      orbFlare(39, 40, 16); sfx('missile'); sfx('whoomp'); return true; } },
  toll: { cls: 'paladin', name: 'DIVINE TOLL', cd: 7, range: 3.5, fn: () => palToll(SV.mods.toll === 'great'), desc: 'HE RINGS HIS HAMMER LIKE A BELL: RINGS OF LIGHT ROLL OUT AND DAZE ALL AROUND' },
  hwrath: { cls: 'paladin', name: 'WRATH OF HEAVEN', cd: 9, range: 9, fn: () => palWrath(), desc: 'THREE HAMMERS FALL FROM THE SKY ON THE THREE THICKEST CROWDS' },
  roar: { cls: 'warrior', name: 'BLOOD ROAR', cd: 7, range: 4.5, fn: () => startRoar(), desc: 'A ROAR IN A WIDE CONE: FOES REEL, AND THE WEAK PANIC AND RUN' },
  split: { cls: 'warrior', name: 'EARTHSPLITTER', cd: 8, range: 8, fn: () => startSplit(), desc: 'THE AXE INTO THE GROUND: A CRACK RACES OUT AND THROWS UP ALL ON IT' },
  uproot: { cls: 'warrior', name: 'UPROOT', cd: 6, range: 8, fn: () => startUproot(), desc: 'HE TEARS UP A SLAB AND HURLS IT: IT BOUNDS THROUGH THE CROWD AND BURSTS' },
  crescent: { cls: 'warrior', name: "TITAN'S CRESCENT", cd: 7, range: 8, fn: () => startCrescent(), desc: 'ONE ENORMOUS SWING: A CRESCENT OF FORCE FLIES ACROSS THE SCREEN' },
  multi: { cls: 'ranger', name: 'MULTISHOT', cd: 2.4, range: 7.5, fn: () => { multishot(); return true; }, desc: 'A FAN OF FIVE ARROWS' },
  trap: { cls: 'ranger', name: 'SNARE TRAP', cd: 4, range: 7, fn: () => throwTrap(), desc: 'A TRAP AT A FOE\'S FEET: THE FIRST TO STEP IN IS HELD FAST' },
  hawk: { cls: 'ranger', name: 'HAWK', cd: 32, range: 9, fn: () => { callHawk(); if (hero.hawks) for (const h of hero.hawks) h.t *= svDur(); return true; }, desc: 'A HAWK CIRCLES YOU FOR 30 SECONDS AND DIVES AT YOUR TARGETS, MARKING THEM' },
  mark: { cls: 'ranger', name: "HUNTER'S MARK", cd: 7, range: 9, fn: () => huntersMark(), desc: 'MARKS THE TOUGHEST FOE IN SIGHT: IT TAKES 35% MORE DAMAGE FROM EVERYTHING' },
  // for every hero: always on once taken (no cooldown); their levels add damage and size
  bones: { cls: 'all', aura: true, name: 'BONE ORBIT', desc: 'SKULLS CIRCLE YOU AND BREAK ON WHAT THEY TOUCH. KEEP FOES AT THEIR DISTANCE',
    lv: ['', 'NEW', 'ONE MORE SKULL', 'CHOOSE ONE OF THREE RUNES', 'A WIDER, FASTER CIRCLE', 'ONE MORE SKULL'] },
  holy: { cls: 'all', aura: true, name: 'HOLY AURA', desc: 'A RING OF LIGHT THAT BURNS EVERY FOE CLOSE TO YOU',
    lv: ['', 'NEW', 'BURNS 30% HARDER', 'CHOOSE ONE OF THREE RUNES', 'A WIDER RING', 'BURNS 30% HARDER'] },
  ash: { cls: 'all', aura: true, name: 'ASH TRAIL', desc: 'FIRE CATCHES WHERE YOU WALK. LEAD THE CROWD THROUGH IT',
    lv: ['', 'NEW', 'BURNS LONGER', 'CHOOSE ONE OF THREE RUNES', 'WIDER FLAMES', 'MORE FIRE'] },
});
Object.assign(SKILL_MODS, {
  thunder: [{ id: 'fury', name: 'TEMPEST', desc: 'BOLTS FALL NEARLY TWICE AS OFTEN' }, { id: 'great', name: 'GREAT BOLTS', desc: 'FEWER BUT HUGE BOLTS THAT STUN' }, { id: 'chain', name: 'FORKED', desc: 'EACH BOLT ALSO JUMPS TO A FOE NEARBY' }],
  bliz: [{ id: 'wide', name: 'WHITEOUT', desc: 'A STORM HALF AGAIN AS WIDE' }, { id: 'deep', name: 'DEEP COLD', desc: 'EVERYTHING CAUGHT IN IT IS FROZEN SOLID' }, { id: 'shards', name: 'SHARDS', desc: 'EACH BURST HITS TWICE AS HARD' }],
  orb: [{ id: 'twin', name: 'TWIN ORBS', desc: 'TWO ORBS IN A V' }, { id: 'grand', name: 'GRAND ORB', desc: 'ITS ZAPS HIT HALF AGAIN AS HARD' }, { id: 'long', name: 'LINGERING', desc: 'IT DRIFTS TWICE AS LONG' }],
  bones: [{ id: 'fire', name: 'BURNING SKULLS', desc: 'THE SKULLS SET FOES ALIGHT' }, { id: 'swarm', name: 'BONE SWARM', desc: 'TWO MORE SKULLS, EACH A LITTLE WEAKER' }, { id: 'heavy', name: 'HEAVY BONE', desc: 'THE SKULLS HIT TWICE AS HARD AND KNOCK BACK' }],
  holy: [{ id: 'mend', name: 'MERCY', desc: 'WHILE IT BURNS FOES, YOU MEND (UP TO 3 LIFE A SECOND)' }, { id: 'frost', name: 'WINTER RING', desc: 'FOES INSIDE ARE SLOWED' }, { id: 'wide', name: 'SUNBURST', desc: 'HALF AGAIN AS WIDE' }],
  ash: [{ id: 'long', name: 'SLOW BURN', desc: 'THE FIRE BURNS TWICE AS LONG' }, { id: 'wide', name: 'WILDFIRE', desc: 'THE FLAMES SPREAD TWICE AS WIDE' }, { id: 'cinder', name: 'CINDERS', desc: 'FOES KILLED IN IT BURST INTO MORE FIRE' }],
});
// the plain runes for the skills that have none of their own
for (const id of ['toll', 'hwrath', 'roar', 'split', 'uproot', 'crescent']) if (!SKILL_MODS[id]) SKILL_MODS[id] = [
  { id: 'echo', name: 'ECHO', desc: 'IT GOES OFF A SECOND TIME RIGHT AFTER' }, { id: 'swift', name: 'SWIFT', desc: 'IT CASTS 35% MORE OFTEN' }];
{ const cd0 = svCd; svCd = id => cd0(id) * (SV.mods[id] === 'swift' ? 0.65 : 1); }

// the passives that change what skills do (the review: every card was a flat number)
Object.assign(SV_PASSIVES, {
  amount: { name: 'AMOUNT', max: 2, desc: 'EVERY SKILL GOES OFF ONE MORE TIME; ONE MORE SKULL AND ARROW', ramp: [56, 57, 58, 59] },
  area: { name: 'AREA', max: 3, desc: '+15% SIZE TO BLASTS, BURSTS, RINGS AND FIRE', ramp: [13, 14, 15, 16] },
  dur: { name: 'DURATION', max: 3, desc: 'LASTING EFFECTS LAST 20% LONGER', ramp: [37, 38, 39, 40] },
});
const svArea = () => 1 + 0.15 * (SV.pas.area || 0), svDur = () => 1 + 0.2 * (SV.pas.dur || 0);
const svAuraK = id => { const l = (SV.w[id] || {}).lvl || 0; return (l >= 2 ? 1.3 : 1) * (l >= 5 ? 1.3 : 1) * (SV.evo && SV.evo[id] ? 1.5 : 1); };   // (evolved: x1.5)

// ---------------------------------------------------------------- echoes, area and duration on every cast
// After a skill goes off, what it made (projectiles, meteors, fire on the floor, hammers...) is grown by AREA and
// made to last by DURATION; ECHO (rune), level 4 and AMOUNT queue repeats.
{ const cast0 = svCast; svCast = function (id) {
  const n0 = { p: projectiles.length, m: G.meteors.length, f: G.fireGround.length, j: G.pal ? G.pal.judges.length : 0, s: (G.sentries || []).length, c: (G.clusters || []).length }, consec0 = G.pal && G.pal.consec;
  const ok = cast0(id); if (!ok) return ok;
  const A = svArea(), D = svDur();
  if (A > 1) {
    for (let k = n0.p; k < projectiles.length; k++) { const p = projectiles[k]; if (p.boom && p.boom.r) p.boom.r *= A; }
    for (let k = n0.m; k < G.meteors.length; k++) { const m = G.meteors[k]; if (m.r) m.r *= A; m.svA = A; }
    for (let k = n0.f; k < G.fireGround.length; k++) G.fireGround[k].r *= A;
    if (G.pal) { for (let k = n0.j; k < G.pal.judges.length; k++) G.pal.judges[k].R *= A; if (G.pal.consec && G.pal.consec !== consec0) G.pal.consec.R *= A; }
  }
  if (D > 1) {
    for (let k = n0.f; k < G.fireGround.length; k++) G.fireGround[k].t *= D;
    if (G.pal && G.pal.consec && G.pal.consec !== consec0) G.pal.consec.T *= D;
    for (let k = n0.s; k < (G.sentries || []).length; k++) { G.sentries[k].t *= D; G.sentries[k].t0 *= D; }
    if (id === 'strafe' && hero.strafe) hero.strafe.t *= D;
    if (id === 'whirl' && hero.whirl > 0) hero.whirl *= D;
  }
  return ok;
}; }
// repeats: the core queues one at level 4; ECHO and AMOUNT add more (not for the summons: one sentry, one hawk)
{ const w0 = svWeapons; svWeapons = function (dt) {
  const before = {}; for (const id in SV.w) before[id] = SV.w[id].cd;
  w0(dt);
  for (const id in SV.w) {
    const W = SV_WEAPONS[id]; if (W.basic || W.aura || id === 'sentry' || id === 'hawk' || id === 'mark' || id === 'consec') continue;
    if (before[id] <= dt && SV.w[id].cd > 0.2) {   // it was cast this frame
      let extra = (SV.pas.amount || 0) + (SV.mods[id] === 'echo' ? 1 : 0);
      for (let k = 0; k < extra; k++) SV.echo.push({ id, t: 0.3 + 0.3 * (k + 1), svSeen: true });
    }
  }
  svAuras(dt);
}; }

// ---------------------------------------------------------------- the Mage's new storms
SV_HOOKS.update.push(dt => {
  for (const T of SV_FX.thunder) {
    T.t -= dt; T.next -= dt;
    if (T.next <= 0) {
      T.next = T.big ? T.every * 2 : T.every;
      const foes = nearFoes(hero.fi, hero.fj, 7); if (!foes.length) continue;
      const e = foes[Math.floor(Math.random() * foes.length)];
      skyStrike(e.fi, e.fj, T.big, e); if (T.big) e.stun = Math.max(e.stun || 0, 0.6);
      if (SV.mods.thunder === 'chain') { const o = nearFoes(e.fi, e.fj, 2.5).find(x => x !== e); if (o) skyStrike(o.fi, o.fj, false, o); }
    }
  }
  SV_FX.thunder = SV_FX.thunder.filter(T => T.t > 0);
  for (const B of SV_FX.bliz) {
    B.t -= dt; B.next -= dt;
    if (B.next <= 0) {
      B.next = 0.22;
      const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * B.r, fi = B.fi + Math.cos(a) * d, fj = B.fj + Math.sin(a) * d, r = 1.1 * svArea();
      iceBlast(fi, fj, r, false);
      G.elem = 'cold';
      for (const e of enemies) if (alive(e) && Math.hypot(e.fi - fi, e.fj - fj) < r + (e.def.unique ? 0.4 : 0)) {
        damageEnemy(e, spellDmg(SV.mods.bliz === 'shards' ? 1.7 : 0.9), fi, fj, false, 0, true);
        if (alive(e)) { if (SV.mods.bliz === 'deep' && !e.def.unique) freezeFoe(e, 1.6); else e.slowT = Math.max(e.slowT || 0, 2); }
      }
      G.elem = null;
    }
  }
  SV_FX.bliz = SV_FX.bliz.filter(B => B.t > 0);
});
// the Arcane Orb's runes: a long drift; a grand orb hits harder (dmgK is set at the cast)
{ const c0 = SV_WEAPONS.orb.fn; SV_WEAPONS.orb.fn = () => { const n = projectiles.length, r = c0(); if (SV.mods.orb === 'long') for (let k = n; k < projectiles.length; k++) projectiles[k].life *= 2; return r; }; }

// ---------------------------------------------------------------- the three for every hero
function svAuras(dt) {
  if (hero.dead) return;
  // BONE ORBIT: skulls on a ring; a foe they touch is hit (once each 0.6 s per foe)
  if (SV.w.bones) {
    const l = SV.w.bones.lvl, n = 2 + (l >= 2 ? 1 : 0) + (l >= 5 ? 1 : 0) + (SV.pas.amount || 0) + (SV.mods.bones === 'swarm' ? 2 : 0) + (SV.evo && SV.evo.bones ? 3 : 0);
    const R = (1.5 + (l >= 4 ? 0.35 : 0)) * svArea(), sp = l >= 4 ? 3.4 : 2.6;
    SV.orbAng = (SV.orbAng || 0) + dt * sp; SV.orbPts = [];
    for (let k = 0; k < n; k++) {
      const a = SV.orbAng + k / n * 6.283, fi = hero.fi + Math.cos(a) * R, fj = hero.fj + Math.sin(a) * R; SV.orbPts.push([fi, fj]);
      for (const e of enemies) {
        if (!alive(e) || Math.hypot(e.fi - fi, e.fj - fj) > 0.55 + (e.def.unique ? 0.4 : 0)) continue;
        const last = SV.orbHit.get(e) || -9; if (G.t - last < 0.6) continue; SV.orbHit.set(e, G.t);
        const heavy = SV.mods.bones === 'heavy';
        if (SV.mods.bones === 'fire') G.elem = 'fire';
        damageEnemy(e, Math.round(heroDmg(0.7 * (heavy ? 2 : SV.mods.bones === 'swarm' ? 0.8 : 1) * svAuraK('bones'))), hero.fi, hero.fj, false, heavy ? 1 : 0, true);
        G.elem = null;
        if (SV.mods.bones === 'fire' && alive(e)) e.burnT = Math.max(e.burnT || 0, 2);
        const [x, y] = iso(fi, fj); burst(5, x, y, 10, 4, 40, 26);
      }
    }
  } else SV.orbPts = null;
  // HOLY AURA: everything inside the ring burns twice a second
  if (SV.w.holy) {
    SV.auraT -= dt;
    if (SV.auraT <= 0) {
      SV.auraT = 0.5; const R = svHolyR(); let n = 0;
      G.elem = 'holy';
      for (const e of enemies) if (alive(e) && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < R + (e.def.unique ? 0.4 : 0)) {
        n++; damageEnemy(e, Math.max(1, Math.round(heroDmg(0.45 * svAuraK('holy')))), hero.fi, hero.fj, false, 0, true);
        if (alive(e) && SV.mods.holy === 'frost') e.slowT = Math.max(e.slowT || 0, 0.7);
      }
      G.elem = null;
      if (n && SV.mods.holy === 'mend') hero.hp = Math.min(STAT.maxHp, hero.hp + 1.5);
    }
  }
  // ASH TRAIL: a patch of fire every half tile walked
  if (SV.w.ash) {
    const l = SV.w.ash.lvl, last = SV.ashAt || [hero.fi, hero.fj];
    if (Math.hypot(hero.fi - last[0], hero.fj - last[1]) > (l >= 5 ? 0.45 : 0.6)) {
      SV.ashAt = [hero.fi, hero.fj];
      if (G.fireGround.length < 70) G.fireGround.push({ fi: hero.fi, fj: hero.fj, r: (0.85 + (l >= 4 ? 0.25 : 0)) * svArea() * (SV.mods.ash === 'wide' ? 1.6 : 1) * (SV.evo && SV.evo.ash ? 1.4 : 1), t: (2 + (l >= 2 ? 1 : 0)) * svDur() * (SV.mods.ash === 'long' ? 2 : 1) * (SV.evo && SV.evo.ash ? 1.5 : 1), tick: 0.1, svAsh: true });
    }
  }
}
const svHolyR = () => (1.6 + (((SV.w.holy || {}).lvl || 0) >= 4 ? 0.4 : 0)) * svArea() * (SV.mods.holy === 'wide' ? 1.5 : 1) * (SV.evo && SV.evo.holy ? 1.4 : 1);
// Cinders: a foe killed standing in the trail's fire bursts into more
SV_HOOKS.killed.push(e => {
  if (SV.mods.ash !== 'cinder' || !SV.w.ash) return;
  if (G.fireGround.some(g => g.svAsh && Math.hypot(g.fi - e.fi, g.fj - e.fj) < g.r) && G.fireGround.length < 80) G.fireGround.push({ fi: e.fi, fj: e.fj, r: 1.2 * svArea(), t: 2 * svDur(), tick: 0.1, svAsh: true });
});
SV_HOOKS.hud.push(() => {
  if (SV.orbPts) for (const [fi, fj] of SV.orbPts) {   // a small skull, drawn over the crowd like any projectile
    const [x, y] = iso(fi, fj), sx = Math.round(x - camX), sy = Math.round(y - camY) - 14;
    for (const [a, b, c] of [[-2, -2, 1], [-1, -3, 1], [0, -3, 1], [1, -3, 1], [2, -2, 1], [-3, -1, 1], [3, -1, 1], [-3, 0, 1], [3, 0, 1], [-2, 1, 1], [2, 1, 1], [-1, 2, 1], [0, 2, 1], [1, 2, 1],
      [-1, -2, 27], [0, -2, 27], [1, -2, 27], [-2, -1, 26], [-1, -1, 27], [0, -1, 27], [1, -1, 27], [2, -1, 26], [-2, 0, 26], [-1, 0, 1], [0, 0, 26], [1, 0, 1], [2, 0, 26], [-1, 1, 25], [0, 1, 26], [1, 1, 25]])
      put(sx + a, sy + b, c === 1 ? BLK : SV.mods.bones === 'fire' && c === 26 ? 16 : c);
  }
  if (SV.w.holy && !hero.dead) {
    const R = svHolyR(), [x, y] = iso(hero.fi, hero.fj), cx = x - camX, cy = y - camY, rx = R * 22.6, ry = R * 11.3, n = Math.ceil(rx * 2.2), ph = G.t * 1.5;
    for (let k = 0; k < n; k++) { if (k % 4 === 3) continue; const t = k / n * 6.283 + ph; put(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, SV.mods.holy === 'frost' ? 118 : 51); }
  }
});
// the Barbarian's standing moves and the Paladin's toll root him only for their wind-up: his legs keep going
{ const cr0 = svCarry; svCarry = function (dt) {
  const B = hero.bz;
  if (B && ['roar', 'split', 'uproot', 'crescent', 'toll'].includes(B.kind)) { const z = hero.bz; hero.bz = null; try { const a0 = hero.atk; hero.atk = Math.max(0, a0); cr0(dt); hero.atk = a0; } finally { hero.bz = z; } return; }
  cr0(dt);
}; }
// AMOUNT: one more arrow from the Ranger's bow (a basic shot fanned out)
{ const sh0 = shootArrow; shootArrow = function (a, o = {}) {
  const r = sh0(a, o);
  if (SV.on && hero.cls === 'ranger' && o.basic && !o.svExtra) for (let k = 1; k <= (SV.pas.amount || 0); k++) sh0(a + (k % 2 ? 1 : -1) * 0.14 * Math.ceil(k / 2), Object.assign({}, o, { svExtra: true, hits: o.hits ? new Set() : o.hits }));
  return r;
}; }
// the Mage's basic missile counts its AMOUNT like any skill (svWeapons above); the melee heroes' AMOUNT is for skills

// icons for the skills the dungeon game never drew one for
{ const G0 = typeof glyphBolt === 'function' ? glyphBolt : null, C = { mage: [37, 38, 39, 40], paladin: [48, 49, 50, 51], warrior: [19, 20, 21, 22], ranger: [33, 34, 35, 36], all: [24, 25, 26, 27] };
  const own = { bliz: [114, 116, 117, 118], ash: [13, 14, 15, 16], holy: [48, 49, 50, 51], orb: [56, 57, 58, 59] };
  for (const id in SV_WEAPONS) { const W = SV_WEAPONS[id]; if (W.basic || SPELL_LOOK[id]) continue; SPELL_LOOK[id] = [own[id] || C[W.cls] || C.all, (x, y) => textC(W.name[0], x + 1, y - 2, 27)]; } }

// ---------------------------------------------------------------- evolutions (REVIEW.md step 3)
// A skill at level 5, with its partner card taken at least once, EVOLVES at the next chest (an elite's, the Alpha's,
// the King's or a barrel's): a new name, twice as often, one more repeat; the basic weapons and the always-on three
// each get their own change. The cards say which passive evolves what.
const SV_EVO = {
  missile: ['amount', 'ARCANE BARRAGE'], fireball: ['area', 'INFERNO'], cone: ['dur', 'ABSOLUTE ZERO'], meteor: ['might', 'CATACLYSM'], chain: ['haste', 'STORM CHAIN'],
  thunder: ['amount', 'THE GREAT STORM'], bliz: ['area', 'ETERNAL WINTER'], orb: ['dur', 'SINGULARITY'],
  swing: ['guard', 'HAMMER OF DAWN'], phammer: ['amount', 'HAMMERS OF LIGHT'], consec: ['area', 'HALLOWED EARTH'], judge: ['might', 'FINAL JUDGMENT'], toll: ['dur', 'THE GREAT BELL'], hwrath: ['haste', 'DIVINE FURY'],
  axes: ['fury', 'ENDLESS RAGE'], slam: ['area', 'WORLDBREAKER'], whirl: ['dur', 'MAELSTROM'], hook: ['amount', 'CHAINS OF WAR'], roar: ['haste', 'WARLORD\'S ROAR'], split: ['area', 'RIFT'], uproot: ['amount', 'AVALANCHE'], crescent: ['might', 'TITAN\'S WRATH'],
  bow: ['eagle', 'STORMBOW'], pierce: ['amount', 'BALLISTA'], cluster: ['area', 'FIRESTORM'], sentry: ['dur', 'FORTRESS'], strafe: ['haste', 'HAIL OF ARROWS'], multi: ['amount', 'ARROW STORM'], trap: ['area', 'KILLING FIELD'], hawk: ['dur', 'THE ROC'], mark: ['might', 'DEATH SENTENCE'],
  bones: ['amount', 'BONE STORM'], holy: ['area', 'SUNFIRE'], ash: ['dur', 'HELLFIRE'],
};
SV_HOOKS.newRun.push(() => { SV.evo = {}; SV.ult = 0; SV.ultShow = 0; });
const svEvoName = id => SV.evo && SV.evo[id] ? SV_EVO[id][1] : SV_WEAPONS[id].name;
const svCanEvo = id => SV_EVO[id] && SV.w[id] && SV.w[id].lvl >= 5 && (SV.pas[SV_EVO[id][0]] || 0) > 0 && !SV.evo[id];
{ const cd0 = svCd; svCd = id => cd0(id) * (SV.evo && SV.evo[id] ? 0.5 : 1); }
{ const ch0 = svChest; svChest = function () {
  const id = Object.keys(SV.w).find(svCanEvo);
  if (!id) return ch0();
  SV.evo[id] = true; recalcHero();
  SV.chestShow = { t: 3.6, lines: [`${SV_WEAPONS[id].name} BECOMES`, SV_EVO[id][1]], n: 5, evo: true };
  sfx('chest'); sfx('levelUp'); sfx('boom'); shockwave(hero.fi, hero.fj, 3.5, 0.5, [49, 51]); G.flashes.push({ fi: hero.fi, fj: hero.fj, t: 0.4, t0: 0.4, r: 180 });
  const [x, y] = screenOf(hero); burst(4, x, y, 10, 90, 80, 51);
  svDropGold(hero.fi + 0.4, hero.fj, 20); svLog('evolve', { id });
}; }
// the cards say what evolves with what
{ const pool0 = svPool; svPool = function () {
  return pool0().map(c => {
    if (c.kind === 'w' && SV.w[c.id] && SV.w[c.id].lvl === 4 && SV_EVO[c.id]) return Object.assign({}, c, { desc: c.desc + `. EVOLVES WITH ${SV_PASSIVES[SV_EVO[c.id][0]].name}` });
    if (c.kind === 'p') { const ev = Object.keys(SV.w).filter(id => SV_EVO[id] && SV_EVO[id][0] === c.id && !SV.evo[id]); if (ev.length && !SV.pas[c.id]) return Object.assign({}, c, { desc: c.desc + `. EVOLVES ${SV_WEAPONS[ev[0]].name}` }); }
    return c;
  });
}; }
// what each evolution does beyond the faster casts and the extra repeat
{ const w0 = svWeapons; svWeapons = function (dt) {
  const before = {}; for (const id in SV.w) before[id] = SV.w[id].cd;
  w0(dt);
  for (const id in SV.evo || {}) {   // one more repeat for an evolved skill
    const W = SV_WEAPONS[id]; if (!SV.w[id] || W.basic || W.aura || id === 'sentry' || id === 'hawk' || id === 'mark') continue;
    if (before[id] <= dt && SV.w[id].cd > 0.1) SV.echo.push({ id, t: 0.45 });
  }
  if (SV.evo.axes && hero.cls === 'warrior' && !(hero.frenzy > 0.5)) hero.frenzy = 0.5;   // ENDLESS RAGE: never out of the frenzy
}; }
SV_HOOKS.recalc.push(() => {
  if (!SV.evo) return;
  if (SV.evo.swing || SV.evo.axes || SV.evo.bow) STAT.dmg = [STAT.dmg[0] * 1.3, STAT.dmg[1] * 1.3];
});
// HAMMER OF DAWN: every swing is a counter (all round); STORMBOW: two more arrows that pierce
{ const r0 = heroHitResolve; heroHitResolve = function (all = false, pow = 0, ...rest) { return r0(all || !!(SV.on && SV.evo && SV.evo.swing && hero.cls === 'paladin'), pow, ...rest); }; }
{ const sh0 = shootArrow; shootArrow = function (a, o = {}) {
  const r = sh0(a, o);
  if (SV.on && SV.evo && SV.evo.bow && hero.cls === 'ranger' && o.basic && !o.svExtra && !o.svEvo) for (const da of [-0.22, 0.22]) sh0(a + da, Object.assign({}, o, { svEvo: true, svExtra: true, pierce: true, hits: new Set() }));
  return r;
}; }

// ---------------------------------------------------------------- the class ultimates (the capstone)
// From level 15 kills fill the meter (elites and bosses much more); full, it goes off on its own when a crowd or a
// boss is near: Arcane Storm, Archangel (wings, a reach of light, speed), Wrath of the Mountain, Rain of Arrows.
const SV_ULT = { mage: 'ARCANE STORM', paladin: 'ARCHANGEL', warrior: 'WRATH OF THE MOUNTAIN', ranger: 'RAIN OF ARROWS' };
const SV_ULT_LVL = 15;
SV_HOOKS.killed.push(e => { if (SV.lvl < SV_ULT_LVL || SV.ult >= 100) return; SV.ult = Math.min(100, SV.ult + (e.def.unique ? 30 : e.champ || e.svChest ? 8 : 0.35)); if (SV.ult >= 100) { say(`${SV_ULT[hero.cls]} IS READY`, 51, 2); sfx('levelUp', 0.7); } });
function svFireUlt() {
  SV.ult = 0; SV.ultShow = 2.2;
  if (hero.cls === 'mage') startStorm();
  else if (hero.cls === 'ranger') startRain();
  else if (hero.cls === 'warrior') startWrath();
  else { const k = 'arch'; hero.wing = { kind: k, t: WINGS[k].T, T: WINGS[k].T }; hero.palRaise = 0.7; hero.atk = -1; recalcHero(); prewarmHero(); palKit(); palBurst(k); say('ARCHANGEL!', 51, 1.6); }
  svLog('ultimate', { id: hero.cls });
}
SV_HOOKS.update.push(dt => {
  if (SV.ultShow > 0) SV.ultShow -= dt;
  if (SV.ult < 100 || hero.dead || hero.ultOn || hero.leap || (hero.wing && hero.wing.t > 0)) return;
  const near = nearFoes(hero.fi, hero.fj, 6).length, boss = SV.boss && alive(SV.boss) && Math.hypot(SV.boss.fi - hero.fi, SV.boss.fj - hero.fj) < 8;
  if (near >= 8 || boss) svFireUlt();
});
SV_HOOKS.hud.push(() => {
  if (SV.lvl < SV_ULT_LVL && !(SV.ult > 0)) return;
  const w = 70, x = W - w - 4, y = 26, f = SV.ult / 100, ready = f >= 1;
  fillRect(x - 1, y - 1, w + 2, 5, BLK); fillRect(x, y, Math.round(w * f), 3, ready ? (Math.floor(G.t * 8) % 2 ? 51 : 27) : 50);
  text(ready ? 'ULTIMATE READY' : 'ULTIMATE', x, y + 5, ready ? 51 : 4);
  if (SV.ultShow > 0) textC(SV_ULT[hero.cls] + '!', W / 2, Math.round(H * 0.42), 51, 2);
});
