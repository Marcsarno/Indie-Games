'use strict';
// SURVIVORS: what lasts between runs (round 3, the user: "keep the gold when I die ... it can save within the
// browser ... level 1 beatable, the next levels harder: you won't beat them unless you have some unlocks and some
// levels"). Everything lives in this phone's browser (localStorage 'sv-save-1').
//   GOLD      picked up in a run (kills now and then, chests, elites, bosses, barrels, the goblin); all of it is kept
//   BLESSINGS bought at the camp shrine with gold: small, capped, refunded free (about +50% power in all)
//   RANKS     each hero levels from its own runs (XP = kills, time, a win); a rank adds a little power and better
//             gear on the hero (the Diablo game's armour, a look: its stats are replaced by the rank's)
//   UNLOCKS   earned by doing things: two heroes, three harder levels, relics (new cards), blessings
//   LEVELS    NORMAL (beatable fresh), NIGHTMARE, HELL, TORMENT: each needs the one before won, and each adds a twist
// The camp (the title screen) has three pages: HEROES (hero + level, START), SHRINE (blessings), UNLOCKS.

const SVM_KEY = 'sv-save-1';
const SVM = { gold: 0, bless: {}, ach: {}, xp: {}, stats: { kills: 0, runs: 0, banked: 0, wins: 0 }, best: {}, diff: 1, cls: 'mage' };
function svmLoad() { try { const d = JSON.parse(localStorage.getItem(SVM_KEY) || 'null'); if (d) { Object.assign(SVM, d); SVM.stats = Object.assign({ kills: 0, runs: 0, banked: 0, wins: 0 }, d.stats || {}); } } catch (e) { /* storage blocked */ } }
function svmSave() { if (SV_PARAMS.get('unlock') || SV_PARAMS.get('nosave')) return; try { localStorage.setItem(SVM_KEY, JSON.stringify(SVM)); } catch (e) { /* storage blocked */ } }

// ---------------------------------------------------------------- the levels of difficulty
// hp/dmg: monster health and blows; rate/cap: the waves; elite: seconds between elites; champs: share of the horde
// that are champions; twist: what makes the level play differently
const SV_DIFFS = [null,
  { name: 'NORMAL', col: 26, hp: 1, dmg: 1, rate: 1, cap: 1, gold: 1, elite: 75, champs: 0, lines: ['THE BLIGHTED WOOD. SURVIVE, LEVEL UP,', 'AND KILL THE SKELETON KING AT 9:00'] },
  { name: 'NIGHTMARE', col: 39, hp: 2.1, dmg: 1.5, rate: 1.2, cap: 1.15, gold: 1.7, elite: 55, champs: 0.04, night: true, kingGuard: 2,
    lines: ['NIGHT FALLS. ELITES COME MORE OFTEN AND', 'CHAMPIONS WALK IN THE HORDE'] },
  { name: 'HELL', col: 22, hp: 3.6, dmg: 2.1, rate: 1.35, cap: 1.25, gold: 2.6, elite: 45, champs: 0.07, night: true, fire: 7, kingGuard: 4,
    lines: ['FIRE RAINS ON THE WOOD: GET OUT OF THE', 'RED CIRCLES. THE KING BRINGS HIS GUARD'] },
  { name: 'TORMENT', col: 57, hp: 6, dmg: 2.8, rate: 1.5, cap: 1.35, gold: 3.8, elite: 40, champs: 0.1, night: true, fire: 5, haste: 1.15, kingGuard: 6,
    lines: ['EVERYTHING IS FASTER AND THE FIRE NEVER', 'STOPS. ONLY THE STRONGEST BUILDS LIVE'] },
];
const svDiff = () => SV_DIFFS[SV.diff || 1];

// ---------------------------------------------------------------- blessings (the camp shrine)
const SV_BLESS = {
  vit: { name: 'VITALITY', max: 5, cost: 50, desc: '+8% LIFE' },
  might: { name: 'MIGHT', max: 5, cost: 70, desc: '+6% DAMAGE' },
  ward: { name: 'WARD', max: 5, cost: 50, desc: '+3 ARMOR' },
  haste: { name: 'HASTE', max: 5, cost: 80, desc: 'ATTACKS AND SKILLS 4% FASTER' },
  swift: { name: 'SWIFTNESS', max: 3, cost: 60, desc: '+4% MOVE SPEED' },
  magnet: { name: 'MAGNETISM', max: 3, cost: 40, desc: 'PICK UP GEMS 15% FARTHER AWAY' },
  greed: { name: 'GREED', max: 5, cost: 40, desc: '+12% GOLD' },
  growth: { name: 'GROWTH', max: 5, cost: 60, desc: '+6% XP FROM GEMS' },
  reroll: { name: 'FORTUNE', max: 3, cost: 120, desc: '+1 REROLL A RUN' },
  banish: { name: 'BANISHMENT', max: 3, cost: 120, desc: '+1 BANISH A RUN: STRIKE A CARD FROM THE RUN', need: 'lvl20' },
  luck: { name: 'LUCK', max: 3, cost: 90, desc: 'CHESTS MORE OFTEN HOLD 3 OR 5', need: 'alpha' },
  revive: { name: 'SECOND LIFE', max: 1, cost: 400, desc: 'ONCE A RUN, RISE AGAIN AT HALF LIFE', need: 'gold1000' },
};
const svBl = id => (SV_PARAMS.get('bless') === 'max' ? SV_BLESS[id].max : SVM.bless[id] || 0);
const svBlessCost = (id, r = SVM.bless[id] || 0) => SV_BLESS[id].cost * (r + 1);

// ---------------------------------------------------------------- unlocks
// test: when it is checked; give: what it opens (shown on the UNLOCKS page and as a banner when earned)
const SV_ACH = [
  { id: 'barb', name: 'BLOOD ON THE AXE', how: 'KILL 400 FOES IN ONE RUN', give: 'THE BARBARIAN' },
  { id: 'ranger', name: 'THE CAGED HUNTRESS', how: 'FREE THE RANGER FROM HER CAGE IN THE WOOD', give: 'THE RANGER' },
  { id: 'win1', name: 'KINGSLAYER', how: 'KILL THE SKELETON KING ON NORMAL', give: 'NIGHTMARE' },
  { id: 'win2', name: 'NIGHTMARE ENDS', how: 'WIN ON NIGHTMARE', give: 'HELL' },
  { id: 'win3', name: 'HARROWER', how: 'WIN ON HELL', give: 'TORMENT' },
  { id: 'win4', name: 'LORD OF TORMENT', how: 'WIN ON TORMENT', give: 'A GOLDEN NAME ON THE CAMP' },
  { id: 'alpha', name: 'PACK BREAKER', how: 'KILL THE ALPHA', give: 'THE LUCK BLESSING' },
  { id: 'lvl20', name: 'ASCENDANT', how: 'REACH LEVEL 20 IN A RUN', give: 'THE BANISHMENT BLESSING' },
  { id: 'gold1000', name: 'HOARDER', how: 'BANK 1000 GOLD IN ALL', give: 'THE SECOND LIFE BLESSING' },
  { id: 'shrine3', name: 'PILGRIM', how: 'USE 3 SHRINES IN ONE RUN', give: 'THE GROWTH BLESSING COSTS HALF' },
  { id: 'r_ember', name: 'RELIC: EMBERBRAND', how: 'TAKE A RELIC FROM A GUARDED ALTAR', give: 'CARD: KILLS BURST INTO FIRE', relic: true },
  { id: 'r_thorns', name: 'RELIC: THORNMAIL', how: 'TAKE A SECOND RELIC', give: 'CARD: BLOWS AGAINST YOU HURT THE STRIKER', relic: true },
  { id: 'r_blood', name: 'RELIC: BLOODSTONE', how: 'TAKE A THIRD RELIC', give: 'CARD: KILLS MEND YOU A LITTLE', relic: true },
  { id: 'r_coin', name: 'RELIC: LUCKY COIN', how: 'TAKE A FOURTH RELIC', give: 'CARD: MORE GOLD, RICHER CHESTS', relic: true },
  { id: 'r_wind', name: 'RELIC: SECOND WIND', how: 'TAKE A FIFTH RELIC', give: 'CARD: AT A THIRD OF YOUR LIFE, MEND FOR GOOD', relic: true },
];
const svHas = id => SV_PARAMS.get('unlock') === 'all' || !!SVM.ach[id];
const svHeroOpen = cls => SV_PARAMS.get('cls') === cls || cls === 'mage' || cls === 'paladin' || (cls === 'warrior' ? svHas('barb') : svHas('ranger'));
const svDiffOpen = d => d === 1 || svHas('win' + (d - 1));
function svUnlock(id) {
  if (SVM.ach[id]) return;
  const A = SV_ACH.find(a => a.id === id); if (!A) return;
  SVM.ach[id] = Date.now(); SV.unlocked.push(id); svmSave();
  SV.unlockShow = { t: 4, a: A }; sfx('levelUp'); sfx('chest');
}
// the relic cards (each joins the pool once its relic is taken): the dungeon game's own item powers
Object.assign(SV_PASSIVES, {
  ember: { relic: 'r_ember', name: 'EMBERBRAND', max: 1, desc: 'KILLS BURST INTO FIRE THAT SCORCHES WHAT IS NEAR', ramp: [13, 14, 15, 16] },
  thorns: { relic: 'r_thorns', name: 'THORNMAIL', max: 3, desc: 'A BLOW AGAINST YOU HURTS THE STRIKER 50% AS MUCH', ramp: [28, 29, 30, 31] },
  blood: { relic: 'r_blood', name: 'BLOODSTONE', max: 3, desc: 'EACH KILL MENDS HALF A LIFE (AT MOST 4 A SECOND)', ramp: [19, 20, 21, 22] },
  coin: { relic: 'r_coin', name: 'LUCKY COIN', max: 3, desc: '+25% GOLD, AND CHESTS HOLD MORE', ramp: [48, 49, 50, 51] },
  wind: { relic: 'r_wind', name: 'SECOND WIND', max: 1, desc: 'ONCE A MINUTE, AT A THIRD OF YOUR LIFE, MEND 40%', ramp: [52, 53, 54, 55] },
});
{ const pool0 = svPool; svPool = function () { return pool0().filter(c => !(c.kind === 'p' && SV_PASSIVES[c.id].relic && !svHas(SV_PASSIVES[c.id].relic)) && !SV.banished[c.id]); }; }

// ---------------------------------------------------------------- hero ranks
const SV_RANK_XP = [0, 0, 40, 100, 180, 280, 400, 550, 730, 950, 1200];   // total XP for ranks 1-10
const svRank = cls => { if (SV_PARAMS.get('rank')) return +SV_PARAMS.get('rank'); const x = SVM.xp[cls] || 0; let r = 1; while (r < 10 && x >= SV_RANK_XP[r + 1]) r++; return r; };
// the gear each rank wears (a look: its stats are replaced): [weapon, chest, helm, off hand]; later ranks carry on
const SV_RANK_GEAR = {
  mage: [null, ['oak_staff', 'apprentice_robe', 'wizard_hat'], [0, 'mystic_robe'], ['ember_staff'], [0, 'archmage_robe', 'conjurer_hat'], ['frost_staff'],
    [0, 'mt_storm_robe', 'mt_storm_hat'], ['battle_staff'], ['mt_star_staff', 'mt_star_robe', 'mt_star_hat'], ['runed_staff'], ['mt_eclipse_staff', 'mt_eclipse_robe', 'mt_eclipse_hat']],
  paladin: [null, ['pal_hammer', 'pal_plate1', 'pal_helm1', 'pal_shield1'], [0, 'pal_plate2', 0, 'pal_shield2'], ['pal_mace', 0, 'pal_helm2'], [0, 'pal_plate3', 0, 'pal_shield3'], ['pal_warhammer', 'pal_plate4', 'pal_helm3'],
    [0, 'pt_vigil_plate', 'pt_vigil_helm', 'pt_vigil_shield'], ['pt_vigil_mace', 'pal_plate5', 'pal_helm4', 'pal_shield4'], ['pt_auric_hammer', 'pt_auric_plate', 'pt_auric_helm', 'pt_auric_shield'], [0, 0, 0, 0], ['pt_seraph_hammer', 'pt_seraph_plate', 'pt_seraph_helm', 'pt_seraph_shield']],
  warrior: [null, ['hand_axe', 'b_hide', 'b_band', 'hand_axe'], [0, 'b_wolf', 'b_wolfhood'], ['war_axe', 0, 0, 'war_axe'], [0, 'b_bear', 'b_skull'], [0, 'b_bone'],
    ['bt_tuskaxe', 'bt_tusk', 'bt_boar', 'bt_tuskaxe'], [0, 'b_warlord', 'b_horns'], ['bt_flail', 'bt_thunder', 'bt_ram', 'bt_cleaver'], [0, 0, 0, 0], ['bt_cleaver', 'bt_mammoth', 'bt_mskull', 'bt_cleaver']],
  ranger: [null, ['hunting_bow', 'leather_jerkin', 'ranger_hood', 'quiver'], [0, 'studded_jerkin', 'shadow_hood'], ['long_bow', 0, 0, 'war_quiver'], [0, 'hide_coat', 'hunter_hood'], ['horn_bow', 'scale_jerkin', 'night_hood', 'deep_quiver'],
    ['rt_falconer_bow', 'rt_falconer_jerkin', 'rt_falconer_hood', 'rt_falconer_quiver'], ['recurve_bow', 'drake_hide'], ['rt_antler_bow', 'rt_antler_jerkin', 'rt_antler_hood', 'rt_antler_quiver'], ['war_bow'], ['rt_wildheart_bow', 'rt_wildheart_jerkin', 'rt_wildheart_hood', 'rt_wildheart_quiver']],
};
function svRankKit(cls, rank) {
  const kit = [null, null, null, null], L = SV_RANK_GEAR[cls];
  for (let r = 1; r <= rank && r < L.length; r++) L[r].forEach((b, k) => { if (b) kit[k] = b; });
  return kit;
}
// a rank adds 3% damage and 3% life a step (rank 10: +27%); rank 5 gives a reroll
const svRankK = () => 1 + 0.03 * (svRank(SV.cls) - 1);

// ---------------------------------------------------------------- a run, as the meta shapes it
SV_HOOKS.newRun.push(() => {
  SV.diff = SV.diffPick || SVM.diff || 1; if (!svDiffOpen(SV.diff)) SV.diff = 1;
  const D = svDiff(), cls = SV.cls;
  SV.base = null; recalcHero();
  SV.base = { dmg: STAT.dmg.slice(), armor: STAT.armor || 0, maxHp: STAT.maxHp, block: STAT.block || 0 };   // the starting kit's power
  const R = rng(11), kit = svRankKit(cls, svRank(cls)), slots = ['weapon', 'chest', 'helm', 'shield'];
  kit.forEach((b, k) => { if (!b || !ITEM_BASES[b]) return; const it = rollItem(R, 1, b); it.rarity = 'normal'; it.mods = {}; hero.equip[slots[k]] = it; });
  SV.rerolls = 2 + svBl('reroll') + (svRank(cls) >= 5 ? 1 : 0); SV.banish = svBl('banish'); SV.revives = svBl('revive');
  SV.rateK = D.rate; SV.capK = D.cap; SV.eliteEvery = D.elite; SV.eliteT = D.elite;
  SV.dmgInK = 1; SV.cdK = Math.pow(0.96, svBl('haste')); SV.atkK = 4 * svBl('haste');
  SV.windT = -99; SV.bloodT = 0; SV.bloodN = 0;
});
SV_HOOKS.recalc.push(() => {
  const k = svRankK();
  STAT.dmg = [STAT.dmg[0] * k * (1 + 0.06 * svBl('might')), STAT.dmg[1] * k * (1 + 0.06 * svBl('might'))];
  STAT.maxHp = Math.round(STAT.maxHp * k * (1 + 0.08 * svBl('vit')));
  STAT.armor = (STAT.armor || 0) + 3 * svBl('ward');
  STAT.speed *= 1 + 0.04 * svBl('swift');
  // relic cards
  STAT.fireburst = SV.pas.ember ? 1 : 0; STAT.thorns = 50 * (SV.pas.thorns || 0);
});
SV_HOOKS.spawn.push((e, opt) => {
  const D = svDiff(); if (!D) return;
  const boss = e.def.unique, kingK = e.id === 'skelking' ? 1.4 : 1;   // (the King had fallen in 20 seconds to a Paladin; x2 dragged past 3 minutes for three heroes)
  e.hp = e.maxHp = Math.round(e.maxHp * D.hp * kingK); e.dmg = e.dmg.map(v => Math.max(1, Math.round(v * D.dmg)));
  if (D.haste) e.speedK = (e.speedK || 1) * D.haste;
  if (!boss && !opt.noChamp && D.champs && Math.random() < D.champs) { makeChampion(e, rng((Math.random() * 1e9) >>> 0)); e.svGold = 6; }
});

// ---------------------------------------------------------------- gold, XP growth, relic powers, the King's guard
const svGoldK = () => svDiff().gold * (1 + 0.12 * svBl('greed')) * (1 + 0.25 * (SV.pas.coin || 0));
function svDropGold(fi, fj, v) { if (v <= 0) return; groundItems.push({ gold: Math.max(1, Math.round(v * svGoldK())), fi, fj, t: 0 }); }
SV_HOOKS.killed.push(e => {
  SVM.stats.kills++;
  if (e.def.unique) { for (let k = 0; k < 8; k++) svDropGold(e.fi + Math.cos(k) * 0.8, e.fj + Math.sin(k) * 0.8, 12); if (e.id === 'alpha') svUnlock('alpha'); }
  else if (e.svChest) svDropGold(e.fi, e.fj, 14);   // an elite
  else if (e.champ) svDropGold(e.fi, e.fj, 3);   // a champion in the horde (Nightmare and up: they are common)
  else if (Math.random() < 0.035) svDropGold(e.fi, e.fj, 1 + Math.floor(Math.random() * 3));
  if (SV.kills >= 400) svUnlock('barb');
  if (SV.pas.blood) {   // Bloodstone: kills mend, at most 4 life a second
    if (G.t - SV.bloodT > 1) { SV.bloodT = G.t; SV.bloodN = 0; }
    if (SV.bloodN < 4) { const h = Math.min(4 - SV.bloodN, 0.5 * SV.pas.blood); SV.bloodN += h; hero.hp = Math.min(STAT.maxHp, hero.hp + h); }
  }
});
{ const g0 = svGainXp; svGainXp = v => { g0(v * (1 + 0.06 * svBl('growth'))); if (SV.lvl >= 20) svUnlock('lvl20'); }; }
{ const c0 = svChest; svChest = function () {   // Luck and the Lucky Coin: richer chests; every chest holds some gold
  const l = svBl('luck') + (SV.pas.coin || 0), r0 = Math.random; let first = true;
  Math.random = () => { if (first) { first = false; return r0() * Math.max(0.2, 1 - 0.18 * l); } return r0(); };
  try { c0(); } finally { Math.random = r0; }
  svDropGold(hero.fi + 0.4, hero.fj, 20);
}; }
SV_HOOKS.update.push(dt => {
  const D = svDiff();
  // Second Wind: once a minute, at a third of his life
  if (SV.pas.wind && hero.hp < STAT.maxHp / 3 && SV.t - SV.windT > 60) { SV.windT = SV.t; hero.hp = Math.min(STAT.maxHp, hero.hp + STAT.maxHp * 0.4); say('SECOND WIND', 54, 1.5); sfx('potion'); shockwave(hero.fi, hero.fj, 1.5, 0.3, [53, 55]); }
  // the King's guard (Nightmare and up) and his calls for help as he weakens
  const B = SV.boss;
  if (B && B.id === 'skelking' && alive(B)) {
    if (!B.svGuard && D.kingGuard) { B.svGuard = true; for (let k = 0; k < D.kingGuard; k++) { const a = k / D.kingGuard * 6.283; svSpawn(k % 2 ? 'tombguard' : 'axeman', B.fi + Math.cos(a) * 1.6, B.fj + Math.sin(a) * 1.6, { noChamp: true }); } }
    const f = B.hp / B.maxHp, ph = f < 0.33 ? 2 : f < 0.66 ? 1 : 0;
    if (ph > SV.kingPh) {
      SV.kingPh = ph; say('RISE, MY SERVANTS!', 22, 2); sfx('cry'); shockwave(B.fi, B.fj, 3, 0.4, [57, 59]);
      for (let k = 0; k < 6 + SV.diff * 2; k++) { const a = k / (6 + SV.diff * 2) * 6.283; const p = [B.fi + Math.cos(a) * 3, B.fj + Math.sin(a) * 3]; if (!blocked(p[0], p[1])) svSpawn(k % 3 ? 'skeleton' : 'archer', p[0], p[1], { noChamp: true }); }
    }
  }
  if (SV.unlockShow) { SV.unlockShow.t -= dt; if (SV.unlockShow.t <= 0) SV.unlockShow = null; }
});
// Second Life: the killing blow is caught once
SV_HOOKS.fatal.push(() => {
  if (!(SV.revives > 0)) return;
  SV.revives--; hero.dead = 0; hero.hp = STAT.maxHp * 0.5; hero.clip = 'idle'; SV.grace = G.t + 2;
  say('YOU RISE AGAIN', 51, 2); sfx('portal'); sfx('boom');
  shockwave(hero.fi, hero.fj, 4, 0.5, [27, 51]);
  for (const e of enemies) if (alive(e) && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 4) { damageEnemy(e, heroDmg(3), hero.fi, hero.fj, true, 2); if (alive(e)) e.stun = 1; }
});
// the end of a run: bank the gold, the hero's XP, the wins
SV_HOOKS.end.push(won => {
  const cls = SV.cls, r0 = svRank(cls), xp = Math.round(SV.kills / 8 + SV.t / 6 + (won ? 60 : 0)) * (SV.diff || 1);
  SVM.gold += SV.gold; SVM.stats.banked += SV.gold; SVM.stats.runs++; SVM.xp[cls] = (SVM.xp[cls] || 0) + xp;
  if (won) { SVM.stats.wins++; svUnlock('win' + SV.diff); }
  if (SVM.stats.banked >= 1000) svUnlock('gold1000');
  const k = cls + SV.diff, b = SVM.best[k]; if (!b || won && !b.won || (!b.won && SV.t > b.t)) SVM.best[k] = { t: Math.round(SV.t), won, kills: SV.kills };
  SV.end.xp = xp; SV.end.rank0 = r0; SV.end.rank1 = svRank(cls);
  svmSave();
});

// ---------------------------------------------------------------- the camp (the title screen)
let SVC = { page: 'heroes', msg: null };
function svCampRects() {
  const tabs = ['heroes', 'shrine', 'unlocks'].map((id, k) => ({ id, x: 8 + k * ((W - 16) / 3), y: 44, w: (W - 16) / 3 - 4, h: 16 }));
  const heroes = SV_HERO_ORDER.map((id, k) => ({ id, x: 10, y: 68 + k * 52, w: W - 20, h: 48 }));
  const dy = 68 + 4 * 52 + 4;
  const diffs = { prev: { x: 10, y: dy, w: 30, h: 40 }, next: { x: W - 40, y: dy, w: 30, h: 40 }, box: { x: 42, y: dy, w: W - 84, h: 40 } };
  const start = { x: W / 2 - 60, y: dy + 48, w: 120, h: 22 };
  const bless = Object.keys(SV_BLESS).map((id, k) => ({ id, x: 10, y: 68 + k * 26, w: W - 20, h: 24 }));
  const refund = { x: W / 2 - 50, y: 68 + Object.keys(SV_BLESS).length * 26 + 4, w: 100, h: 16 };
  return { tabs, heroes, diffs, start, bless, refund };
}
function svButton(r, label, on = true, col = 50) { fillRect(r.x, r.y, r.w, r.h, 3); frame(r.x, r.y, r.w, r.h, on ? col : 4, on ? 48 : 3); textC(label, r.x + r.w / 2, r.y + Math.round(r.h / 2) - 3, on ? (col === 50 ? 51 : col) : 4); }
function svPips(x, y, n, max, col) { for (let k = 0; k < max; k++) { fillRect(x + k * 5, y, 4, 4, BLK); fillRect(x + k * 5 + 1, y + 1, 2, 2, k < n ? col : 4); } }
function svTitleCamp() {
  svDim(0.6);
  const R = svCampRects();
  textC('DUNGEONS OF BONES', W / 2, 6, 26); textC('SURVIVORS', W / 2, 15, svHas('win4') ? 51 : 50, 2);
  text(`${SVM.gold} GOLD`, 6, 34, 50); { const s = `${SVM.stats.runs} RUNS, ${SVM.stats.wins} WINS`; text(s, W - 6 - textWidth(s), 34, 4); }
  for (const t of R.tabs) svButton(t, t.id.toUpperCase(), true, SVC.page === t.id ? 51 : 6);
  if (SVC.page === 'heroes') {
    for (const r of R.heroes) {
      const H0 = SV_HEROES[r.id], open = svHeroOpen(r.id), sel = SV.cls === r.id, rk = svRank(r.id), x0 = SVM.xp[r.id] || 0;
      fillRect(r.x, r.y, r.w, r.h, 3); frame(r.x, r.y, r.w, r.h, sel ? 51 : 6, sel ? 48 : 3);
      if (open) {
        svIcon({ kind: 'hero', id: r.id }, r.x + 16, r.y + 20, 10);
        text(H0.name, r.x + 32, r.y + 5, sel ? 51 : 27); text(`RANK ${rk}`, r.x + r.w - 6 - textWidth(`RANK ${rk}`), r.y + 5, 50);
        text(H0.role, r.x + 32, r.y + 14, 50);
        text(H0.lines[0], r.x + 32, r.y + 23, 26); text(H0.lines[1], r.x + 32, r.y + 31, 26);
        if (rk < 10) { const a = SV_RANK_XP[rk], b = SV_RANK_XP[rk + 1], f = (x0 - a) / (b - a); fillRect(r.x + 32, r.y + 41, r.w - 40, 3, BLK); fillRect(r.x + 32, r.y + 41, Math.round((r.w - 40) * f), 2, 39); }
      } else {
        textC('LOCKED', r.x + r.w / 2, r.y + 10, 4, 1); const A = SV_ACH.find(a => a.give === H0.name);
        textC(H0.name, r.x + r.w / 2, r.y + 20, 25); if (A) textC(A.how, r.x + r.w / 2, r.y + 31, 26);
      }
    }
    const d = SV.diffPick || SVM.diff || 1, D = SV_DIFFS[d], open = svDiffOpen(d);
    svButton(R.diffs.prev, '<', d > 1); svButton(R.diffs.next, '>', d < 4);
    const B = R.diffs.box; fillRect(B.x, B.y, B.w, B.h, 3); frame(B.x, B.y, B.w, B.h, open ? D.col : 4, 3);
    textC(`LEVEL ${d}: ${D.name}`, W / 2, B.y + 4, open ? D.col : 4);
    if (open) { textC(D.lines[0], W / 2, B.y + 15, 26); textC(D.lines[1], W / 2, B.y + 23, 26); textC(d > 1 ? `GOLD X${D.gold}` : '', W / 2, B.y + 32, 50);
      const b = SVM.best[SV.cls + d]; if (b) text(b.won ? 'WON' : svTime(b.t), B.x + 4, B.y + 32, b.won ? 54 : 4); }
    else textC(`WIN ${SV_DIFFS[d - 1].name} TO OPEN`, W / 2, B.y + 20, 4);
    svButton(R.start, 'START', svHeroOpen(SV.cls) && open, 54);
  } else if (SVC.page === 'shrine') {
    for (const r of R.bless) {
      const B = SV_BLESS[r.id], n = SVM.bless[r.id] || 0, need = B.need && !svHas(B.need), cost = svBlessCost(r.id), maxed = n >= B.max;
      fillRect(r.x, r.y, r.w, r.h, 3); frame(r.x, r.y, r.w, r.h, 6, 3);
      if (need) { text(B.name, r.x + 4, r.y + 4, 4); text(`LOCKED: ${SV_ACH.find(a => a.id === B.need).how}`, r.x + 4, r.y + 13, 4); continue; }
      text(B.name, r.x + 4, r.y + 4, 27); svPips(r.x + 4 + textWidth(B.name) + 4, r.y + 4, n, B.max, 51);
      text(B.desc, r.x + 4, r.y + 13, 26);
      const s = maxed ? 'MAX' : `${cost}G`; text(s, r.x + r.w - 4 - textWidth(s), r.y + 4, maxed ? 54 : SVM.gold >= cost ? 50 : 22);
    }
    svButton(R.refund, 'REFUND ALL', Object.values(SVM.bless).some(v => v > 0), 6);
    textC('TAP TO BUY. REFUNDS ARE FREE', W / 2, R.refund.y + 22, 4);
  } else {
    let y = 66;
    for (const A of SV_ACH) {
      const done = svHas(A.id);
      text(done ? '+' : '-', 8, y, done ? 54 : 4); text(A.name, 16, y, done ? 51 : 25); y += 8;
      text(A.how, 16, y, done ? 4 : 26); y += 8; text(`OPENS: ${A.give}`, 16, y, done ? 4 : 50); y += 11;
      if (y > H - 20) break;
    }
  }
  if (SVC.msg && G.t < SVC.msg.t) textC(SVC.msg.s, W / 2, H - 14, SVC.msg.c);
}
function svCampTap(p) {
  const R = svCampRects();
  for (const t of R.tabs) if (inRect(p, t)) { SVC.page = t.id; sfx('tap'); return; }
  if (SVC.page === 'heroes') {
    for (const r of R.heroes) if (inRect(p, r)) { if (svHeroOpen(r.id)) { if (SV.cls !== r.id) { SV.cls = r.id; SVM.cls = r.id; svmSave(); svNewRun(r.id); G.mode = 'svtitle'; } sfx('tap'); } else sfx('block'); return; }
    let d = SV.diffPick || SVM.diff || 1;
    if (inRect(p, R.diffs.prev) && d > 1) { d--; } else if (inRect(p, R.diffs.next) && d < 4) { d++; } else if (inRect(p, R.start)) { svCampStart(); return; } else return;
    SV.diffPick = d; if (svDiffOpen(d)) { SVM.diff = d; svmSave(); } sfx('tap');
  } else if (SVC.page === 'shrine') {
    for (const r of R.bless) if (inRect(p, r)) {
      const B = SV_BLESS[r.id], n = SVM.bless[r.id] || 0, c = svBlessCost(r.id) * (r.id === 'growth' && svHas('shrine3') ? 0.5 : 1);
      if (B.need && !svHas(B.need)) { sfx('block'); return; }
      if (n >= B.max) { SVC.msg = { s: 'ALREADY AT ITS BEST', c: 26, t: G.t + 1.5 }; return; }
      if (SVM.gold < c) { SVC.msg = { s: 'NOT ENOUGH GOLD', c: 22, t: G.t + 1.5 }; sfx('block'); return; }
      SVM.gold -= Math.round(c); SVM.bless[r.id] = n + 1; svmSave(); sfx('gold'); sfx('levelUp', 0.5); SVC.msg = { s: `${B.name} ${n + 1}`, c: 51, t: G.t + 1.5 }; return;
    }
    if (inRect(p, R.refund)) {   // every coin back
      let back = 0; for (const id in SVM.bless) for (let r = 0; r < SVM.bless[id]; r++) back += Math.round(svBlessCost(id, r) * (id === 'growth' && svHas('shrine3') ? 0.5 : 1));
      SVM.gold += back; SVM.bless = {}; svmSave(); sfx('gold'); SVC.msg = { s: `REFUNDED ${back} GOLD`, c: 50, t: G.t + 2 };
    }
  }
}
function svCampStart() {
  const d = SV.diffPick || SVM.diff || 1;
  if (!svHeroOpen(SV.cls) || !svDiffOpen(d)) { sfx('block'); return; }
  SV.diffPick = d; svChooseHero(SV.cls, true);
}
svTitle = svTitleCamp;
svTitleTap = svCampTap;
svTitleKey = k => {
  if (k >= '1' && k <= '4') { const id = SV_HERO_ORDER[+k - 1]; if (svHeroOpen(id) && id !== SV.cls) { SV.cls = id; svNewRun(id); G.mode = 'svtitle'; } }
  else if (k === 'arrowleft' || k === 'arrowright') { const d = Math.max(1, Math.min(4, (SV.diffPick || SVM.diff || 1) + (k === 'arrowright' ? 1 : -1))); SV.diffPick = d; }
  else if (k === 'enter' || k === ' ') svCampStart();
};
// choosing a hero always builds a fresh run for the chosen level (its waves, its night)
svChooseHero = function (cls, fresh = false) {
  if (!svHeroOpen(cls)) cls = 'mage';
  if (fresh || cls !== SV.cls || SV.t > 0 || SV.kills || SV.diff !== (SV.diffPick || 1)) svNewRun(cls);
  SVM.cls = cls; svmSave();
  svBegin();
  say(`${svDiff().name}`, svDiff().col, 2);
};

// ---------------------------------------------------------------- the end screen and the unlock banner
svDrawEnd = function () {
  svDim(0.75);
  const E = SV.end, y0 = Math.round(H * 0.12);
  textC(E.won ? 'VICTORY!' : 'YOU HAVE FALLEN', W / 2, y0, E.won ? 51 : 22, 2);
  textC(E.won ? `THE SKELETON KING IS DEAD (${svDiff().name})` : `YOU LASTED ${svTime(E.t)} ON ${svDiff().name}`, W / 2, y0 + 20, 26);
  textC(`LEVEL ${E.lvl}    ${E.kills} KILLS`, W / 2, y0 + 30, 25);
  textC(`+${E.gold} GOLD (NOW ${SVM.gold})`, W / 2, y0 + 44, 50);
  textC(`${SV_HEROES[SV.cls].name}: +${E.xp || 0} XP` + (E.rank1 > E.rank0 ? `, RANK ${E.rank1}!` : ''), W / 2, y0 + 53, E.rank1 > E.rank0 ? 51 : 39);
  let y = y0 + 68;
  if (SV.unlocked.length) { textC('UNLOCKED', W / 2, y, 54, 2); y += 16; for (const id of SV.unlocked) { const A = SV_ACH.find(a => a.id === id); textC(`${A.name}: ${A.give}`, W / 2, y, 51); y += 9; } y += 6; }
  textC('YOUR BUILD', W / 2, y, 50); y += 12;
  for (const id in SV.w) { svIcon({ kind: 'w', id }, 40, y + 4, 7); text(`${SV_WEAPONS[id].name} LV ${SV.w[id].lvl}`, 54, y, 27); if (SV.mods[id]) { const m = SKILL_MODS[id].find(m => m.id === SV.mods[id]); if (m) text(m.name, 54, y + 8, 51); } y += 19; }
  const ps = Object.keys(SV.pas).map(id => `${SV_PASSIVES[id].name} ${SV.pas[id]}`); wrapText(ps.join(', '), 48).forEach(l => { textC(l, W / 2, y, 25); y += 8; });
  if (G.t - SV.endAt > 1.2) textC('TAP TO GO BACK TO CAMP', W / 2, H - 30, 27);
};
SV_HOOKS.hud.push(() => {
  if (SV.unlockShow) { const U = SV.unlockShow, y = Math.round(H * 0.33); for (let yy = y - 4; yy < y + 26; yy++) for (let x = 0; x < W; x++) if (BAYER[((yy & 3) << 2) | (x & 3)] < 0.7) put(x, yy, BLK);
    textC('UNLOCKED!', W / 2, y, 54, 2); textC(`${U.a.name}: ${U.a.give}`, W / 2, y + 16, 51); }
});
// banish: on the level-up screen, a button that turns the next tapped card into a banishment
{ const dc0 = svDrawCards; svDrawCards = function () {
  dc0(); if (SV.rune || !SV.banish && !SV.banishing) return;
  const B = svBanishRect(); fillRect(B.x, B.y, B.w, B.h, 3); frame(B.x, B.y, B.w, B.h, SV.banishing ? 22 : 6, 3);
  textC(SV.banishing ? 'TAP A CARD TO BANISH' : `BANISH (${SV.banish})`, B.x + B.w / 2, B.y + 6, SV.banishing ? 22 : 25);
}; }
function svBanishRect() { const r = svRerollRect(); return { x: r.x, y: r.y + r.h + 6, w: r.w, h: r.h }; }
{ const pk0 = svPick; svPick = function (k) {
  if (SV.banishing && SV.cards && SV.cards[k] && G.t - SV.cardT > 0.35) {
    const c = SV.cards[k]; SV.banishing = false; SV.banish--; SV.banished[c.id] = true; svLog('banish', c); sfx('crack');
    SV.cards[k] = svOffer(3).find(x => !SV.cards.some(y => y.id === x.id)) || { kind: 'heal', id: 'heal', name: 'A DRINK FROM THE WELL', line: '', desc: 'HEALS YOU FULLY' };
    SV.cardT = G.t; return;
  }
  pk0(k);
}; }
svCardExtraTap = p => {
  if (SV.rune || !(SV.banish > 0 || SV.banishing) || !inRect(p, svBanishRect())) return false;
  SV.banishing = !SV.banishing; sfx('tap'); return true;
};

svmLoad();
SV.cls = SV_PARAMS.get('cls') || SVM.cls || 'mage'; if (!svHeroOpen(SV.cls)) SV.cls = 'mage';
SV.diffPick = +SV_PARAMS.get('diff') || SVM.diff || 1;
window.SVM = SVM;
