'use strict';
// SURVIVORS MODE: the Diablo-style game (diablo-clone/game/js, loaded first) played as an auto-attack
// arena run. The game's own systems do the work: rig sprites, monsters and their AI, the spells and their
// effects, gore, sound, particles. This file swaps out the level (an open forest arena), the controls
// (move only: spells cast themselves), the spawns (waves on a timer), XP (gems to collect), levelling
// (pick 1 of 3 cards; a spell's third level is a choice of its three runes) and the HUD.
// Started with the Mage (the user, 2026-11-16). Design notes: survivors/PLAN.md and RESEARCH.md.
// Round 2 (the user's expanded brief, sections 20-29): the PALADIN as the first melee hero, built to the brief's
// "Warden": swings on his own at foes in reach while he keeps walking (no slowdown while attacking), a broad
// frontal arc with an open back, one visible GUARD charge that blocks a blow and primes a COUNTER (the next swing
// hits all round, much harder), healing capped per swing. Also: two rerolls a run (a limited way to redirect
// offers), the grace after a hit shown on the life bar, and a log of every offer and pick (with its context).

const SV_PARAMS = new URLSearchParams(location.search);
const SV = {
  on: false, cls: 'mage', t: 0, kills: 0, lvl: 1, xp: 0, queue: 0, serial: 0, spawnT: 0, eliteT: 0, cards: null, rune: null,
  w: {}, mods: {}, pas: {}, echo: [], end: null, endAt: 0, boss: null, bossDone: {}, picks: [], firstHurt: 0,
};

// ---------------------------------------------------------------- each hero's attacks as weapons
// cd = seconds between casts at level 1; range = how near a foe must be before it casts; basic = the hero's
// own weapon, used every time a foe is in reach (svSwing)
const SV_WEAPONS = {
  missile: { cls: 'mage', name: 'MAGIC MISSILE', cd: 1.05, range: 8, fn: () => castMissiles(), desc: 'A HOMING BOLT OF ARCANE FORCE AT THE NEAREST FOE' },
  fireball: { cls: 'mage', name: 'FIREBALL', cd: 2.4, range: 8.5, fn: () => castFireball(), desc: 'A BALL OF FIRE THAT BURSTS ON WHAT IT HITS' },
  cone: { cls: 'mage', name: 'CONE OF COLD', cd: 4.2, range: 3.6, fn: () => coneOfCold(), desc: 'A BLAST OF FROST IN FRONT OF YOU. FREEZES THE WEAK, SLOWS THE STRONG' },
  meteor: { cls: 'mage', name: 'METEOR', cd: 6.5, range: 8, fn: () => castMeteor(), desc: 'A METEOR FALLS ON THE THICKEST CROWD' },
  chain: { cls: 'mage', name: 'CHAIN LIGHTNING', cd: 3.2, range: 7.5, fn: () => chainLightning(), desc: 'LIGHTNING THAT JUMPS FROM FOE TO FOE' },
  swing: { cls: 'paladin', basic: true, name: 'HOLY HAMMER', desc: 'YOUR HAMMER: IT SWINGS ON ITS OWN AT FOES IN REACH, IN FRONT OF YOU',
    lv: ['', 'NEW', 'HITS 30% HARDER', 'CHOOSE A FIGHTING STYLE', 'SWINGS 25% FASTER', 'HITS 30% HARDER'] },
  phammer: { cls: 'paladin', name: 'HAMMER OF LIGHT', cd: 2.6, range: 7, fn: () => palThrow(), desc: 'A HAMMER OF LIGHT THROWN AT THE NEAREST FOE. IT FLIES BACK TO YOU' },
  consec: { cls: 'paladin', name: 'CONSECRATE', cd: 9, range: 2.4, fn: () => palConsecrate(), desc: 'HOLY GROUND THAT BURNS FOES. STAND IN IT: YOU MEND AND HIT HARDER',
    lv: ['', 'NEW', 'CASTS 25% MORE OFTEN', 'CHOOSE ONE OF THREE RUNES', 'THE GROUND LASTS TWICE AS LONG', 'CASTS 25% MORE OFTEN'] },
  judge: { cls: 'paladin', name: 'JUDGMENT', cd: 5.5, range: 8, fn: () => palJudge(), desc: 'A HAMMER FALLS FROM THE SKY ON THE THICKEST CROWD' },
  // round 3: the BARBARIAN (the game's 'warrior'): two axes, rage, the brief's Berserker (rage from weapon contact,
  // capped per swing, decays when he backs off; at full it becomes a FRENZY). Bull Rush and Leap are left out: they
  // move him on their own.
  axes: { cls: 'warrior', basic: true, name: 'TWIN AXES', desc: 'TWO AXES THAT SWING ON THEIR OWN. EVERY THIRD BLOW STAGGERS',
    lv: ['', 'NEW', 'HITS 30% HARDER', 'CHOOSE A FIGHTING STYLE', 'SWINGS 25% FASTER', 'HITS 30% HARDER'] },
  slam: { cls: 'warrior', name: 'GROUND SLAM', cd: 3.4, range: 3.2, fn: () => groundSlam(), desc: 'SMASHES THE GROUND IN FRONT OF YOU: A CONE THAT KNOCKS FOES DOWN' },
  whirl: { cls: 'warrior', name: 'WHIRLWIND', cd: 6.5, range: 2.2, fn: () => { hero.whirl = skillMod('whirl') === 'long' ? 1.6 : 0.8; hero.whirlTick = 0; hero.devilT = 0.1; sfx('heavySwing'); return true; },
    desc: 'A SPINNING STORM OF AXES WHEN THEY CROWD YOU. YOU KEEP MOVING', lv: ['', 'NEW', 'CASTS 25% MORE OFTEN', 'CHOOSE ONE OF THREE RUNES', 'SPINS HALF AGAIN AS LONG', 'CASTS 25% MORE OFTEN'] },
  hook: { cls: 'warrior', name: 'CHAIN HOOK', cd: 4.5, range: 6.5, fn: () => chainHook(), desc: 'A HOOK ON A CHAIN DRAGS A FOE (AND WHAT IS BESIDE IT) TO YOUR AXES' },
  // the RANGER: a bow that looses on its own, combo points from basic hits that her shots spend, a sentry, a strafe
  bow: { cls: 'ranger', basic: true, name: 'HUNTING BOW', desc: 'YOUR BOW LOOSES ON ITS OWN AT THE NEAREST FOE. HITS BUILD COMBO POINTS',
    lv: ['', 'NEW', 'HITS 30% HARDER', 'CHOOSE A FIGHTING STYLE', 'DRAWS 25% FASTER', 'HITS 30% HARDER'] },
  pierce: { cls: 'ranger', name: 'PIERCING SHOT', cd: 2.6, range: 8.5, fn: () => piercingShot(), desc: 'A HEAVY BOLT THROUGH EVERY FOE IN A LINE. COMBO POINTS MAKE IT HUGE' },
  cluster: { cls: 'ranger', name: 'CLUSTER ARROW', cd: 3.8, range: 8, fn: () => clusterArrow(), desc: 'A LOBBED ARROW THAT BURSTS INTO BOUNCING BOMBLETS' },
  sentry: { cls: 'ranger', name: 'SENTRY', cd: 9, range: 7, fn: () => { placeSentry(); return true; }, desc: 'PLANTS A CROSSBOW TURRET THAT SHOOTS FOR A FEW SECONDS',
    lv: ['', 'NEW', 'CASTS 25% MORE OFTEN', 'CHOOSE ONE OF THREE RUNES', 'THE SENTRY STANDS TWICE AS LONG', 'CASTS 25% MORE OFTEN'] },
  strafe: { cls: 'ranger', name: 'STRAFE', cd: 8, range: 6, fn: () => { startStrafe(); return true; }, desc: 'A HAIL OF ARROWS AT EVERY FOE NEAR WHILE YOU RUN, AND YOU RUN FASTER' },
};
SKILL_MODS.axes = [
  { id: 'ravager', name: 'RAVAGER', desc: 'EVERY THIRD BLOW IS A SPIN THAT HITS ALL AROUND AND STAGGERS LONGER' },
  { id: 'bleed', name: 'BLOODLETTER', desc: 'YOUR AXES OPEN WOUNDS: FOES BLEED FOR HALF THE HIT AGAIN OVER 3 SECONDS' },
  { id: 'frenzy', name: 'BERSERK', desc: 'RAGE FILLS TWICE AS FAST AND THE FRENZY LASTS 3 SECONDS LONGER' },
];
SKILL_MODS.bow = [
  { id: 'twin', name: 'TWIN SHOT', desc: 'TWO ARROWS EACH TIME, SIDE BY SIDE' },
  { id: 'pierce', name: 'BODKIN POINTS', desc: 'YOUR ARROWS GO THROUGH EVERY FOE IN THEIR WAY' },
  { id: 'fire', name: 'FIRE ARROWS', desc: 'YOUR ARROWS SET FOES ALIGHT' },
];
// the hammer's level 3: a fighting style (the brief: reach and width are separate growth, so shapes stay distinct)
SKILL_MODS.swing = [
  { id: 'wide', name: 'WIDE CLEAVE', desc: 'EVERY SWING HITS ALL AROUND YOU, NOT JUST IN FRONT' },
  { id: 'reach', name: 'LONG REACH', desc: 'A CRESCENT OF LIGHT CARRIES EACH SWING A TILE FARTHER' },
  { id: 'crush', name: 'CRUSHING BLOWS', desc: 'FOES YOU HIT ARE DAZED A MOMENT AND THROWN BACK' },
];
const SV_HEROES = {
  mage: { name: 'THE MAGE', role: 'RANGED: SPELLS FROM AFAR', start: 'missile', hp: 2.5, maxW: 5,
    lines: ['KEEP YOUR DISTANCE. SPELLS FIND THE FOES,', 'RUNES CHANGE HOW EACH SPELL PLAYS'] },
  paladin: { name: 'THE PALADIN', role: 'MELEE: HAMMER AND SHIELD', start: 'swing', hp: 3, maxW: 4,
    lines: ['WORK THE EDGE OF THE CROWD. YOUR GUARD', 'BLOCKS ONE BLOW AND PRIMES A COUNTER'] },
  warrior: { name: 'THE BARBARIAN', role: 'MELEE: TWO AXES AND RAGE', start: 'axes', hp: 2.7, maxW: 4,
    lines: ['STAY IN THE THICK OF IT: HITS FILL', 'YOUR RAGE, FULL RAGE IS A FRENZY'] },
  ranger: { name: 'THE RANGER', role: 'RANGED: BOW, TRAPS AND SPEED', start: 'bow', hp: 2.4, maxW: 5,
    lines: ['KEEP MOVING. WHEN A BLOW LANDS YOU', 'TUMBLE AWAY FASTER FOR A MOMENT'] },
};
const SV_HERO_ORDER = ['mage', 'paladin', 'warrior', 'ranger'];
const svMelee = () => hero.cls === 'paladin' || hero.cls === 'warrior';
const svBasicId = () => SV_HEROES[SV.cls].start;
// round 3: other files (surv_meta.js, surv_map.js) hang their work on these
const SV_HOOKS = { newRun: [], killed: [], update: [], hud: [], end: [], recalc: [], spawn: [], pickup: [], world: [], decor: [], fatal: [] };
const svRun = (k, ...a) => { for (const f of SV_HOOKS[k]) f(...a); };
const SV_WLVL = ['', 'NEW', 'CASTS 25% MORE OFTEN', 'CHOOSE ONE OF THREE RUNES', 'CASTS TWICE EACH TIME', 'CASTS 25% MORE OFTEN'];
const SV_GUARD_CD = 6;   // seconds for the guard to come back
// passives: the item affixes of the Diablo game as level-up picks (cls: that hero only)
const SV_PASSIVES = {
  might: { name: 'MIGHT', max: 5, desc: '+15% DAMAGE', ramp: [19, 20, 21, 22] },
  haste: { name: 'HASTE', max: 5, desc: 'ATTACKS AND SPELLS 8% FASTER', ramp: [48, 49, 50, 51] },
  guard: { cls: 'paladin', name: 'STALWART', max: 3, desc: 'YOUR GUARD COMES BACK 25% SOONER', ramp: [37, 38, 39, 40] },
  oath: { cls: ['paladin', 'warrior'], name: 'BLOOD OATH', max: 3, desc: 'EACH SWING HEALS 1 LIFE PER FOE HIT (UP TO 3)', ramp: [19, 20, 21, 22] },
  fury: { cls: 'warrior', name: 'FURY', max: 3, desc: 'RAGE FILLS 30% FASTER AND DRAINS SLOWER', ramp: [13, 14, 15, 16] },
  fleet: { cls: 'ranger', name: 'FLEET FOOT', max: 3, desc: 'YOUR TUMBLE LASTS LONGER AND COMES WITH A MOMENT OF GRACE', ramp: [52, 53, 54, 55] },
  eagle: { cls: 'ranger', name: 'EAGLE EYE', max: 3, desc: 'YOUR BASIC ARROWS HIT 15% HARDER AND FLY FASTER', ramp: [33, 34, 35, 36] },
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
  svRun('decor');   // (barrels, cages: placed before the bake)
  buildWorld();
  SV.floor0 = floorBuf.slice(); SV.washAt = 0;   // the clean ground, for the wash (svWash)
  makeNpcs();
  hero.fi = cx + 0.5; hero.fj = cy + 0.5; hero.atk = -1; hero.clip = 'idle'; hero.dead = 0; hero.dir = 1;
  enemies = []; boss = null;
  resetSkills(); resetFx();
  updateFov(hero.fi, hero.fj); flowT = 0; computeFlow();
  warmStep(1e9, prewarm());
  G.msg = [];
  svRun('world');   // (the map's places of interest, once the level is clear)
}

// ---------------------------------------------------------------- a run
function svReset() {
  Object.assign(SV, { t: 0, kills: 0, lvl: 1, xp: 0, queue: 0, spawnT: 0.5, eliteT: 75, cards: null, rune: null, w: { [SV_HEROES[SV.cls].start]: { lvl: 1, cd: 0.4 } }, mods: {}, pas: {}, echo: [], end: null, boss: null, bossDone: {}, picks: [], firstHurt: 0, grace: 0,
    rerolls: 2, log: [], guardOn: true, guardT: 0, counterT: 0, won: false, rage: 0, rageT: 0, tumbleT: 0, gold: 0, banish: 0, banished: {}, revives: 0, unlocked: [], kingPh: 0, diff: SV.diff || 1 });
  if (SV_PARAMS.get('t')) SV.t = +SV_PARAMS.get('t');   // (testing: start the clock later)
}
function svNewRun(cls = SV.cls) {
  SV.cls = cls; newHero(cls); hero.lvl = 1; svReset(); SV.on = true;
  if (cls === 'warrior') {   // the Barbarian: an axe in each hand, hide and a war band
    const R = rng(7); for (const [b, slot] of [['hand_axe', 'weapon'], ['hand_axe', 'shield'], ['b_hide', 'chest'], ['b_band', 'helm']]) { const it = rollItem(R, 1, b); it.rarity = 'normal'; it.mods = {}; hero.equip[slot] = it; }
  }
  svRun('newRun');   // (the hero's rank shows in his gear; blessings; the difficulty)
  svArena((Math.random() * 1e9) >>> 0);
  recalcHero(); prewarmHero(); hero.hp = STAT.maxHp;
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
const svCd = id => SV_WEAPONS[id].cd * (SV.w[id].lvl >= 2 ? 0.8 : 1) * (SV.w[id].lvl >= 5 ? 0.8 : 1) * Math.pow(0.92, SV.pas.haste || 0) * (hero.frenzy > 0 ? 0.7 : 1) * (SV.cdK || 1);
function svWeapons(dt) {
  for (const id in SV.w) {
    if (SV_WEAPONS[id].basic) continue;
    const w = SV.w[id]; w.cd -= dt;
    if (w.cd > 0) continue;
    if (svCast(id)) {
      w.cd = svCd(id);
      if (id === 'consec' && w.lvl >= 4 && G.pal && G.pal.consec) G.pal.consec.T *= 2;   // (its level 4: the ground lasts twice as long)
      else if (id === 'whirl' && w.lvl >= 4) hero.whirl *= 1.5;
      else if (id === 'sentry' && w.lvl >= 4 && G.sentries) { for (const o of G.sentries) if (!o.fall && o.age < 0.1) { o.t *= 2; o.t0 *= 2; } }
      else if (id === 'strafe' && w.lvl >= 4 && hero.strafe) hero.strafe.t *= 1.5;
      else if (w.lvl >= 4) SV.echo.push({ id, t: 0.28 });
    }
    else w.cd = 0.15;   // nothing in reach: look again shortly
  }
  for (const q of SV.echo) { q.t -= dt; if (q.t <= 0) svCast(q.id); }
  SV.echo = SV.echo.filter(q => q.t > 0);
  if (SV.w.swing || SV.w.axes) svSwing(dt);
  if (SV.w.bow) svBow(dt);
}
// the Ranger's bow: a shot whenever she is free and a foe is in range (she keeps walking through the draw)
function svBow() {
  if (hero.dead || heroBusy() || hero.strafe || hero.roll) return;
  const t = rangerTarget(ARROW_RANGE - 0.5); if (!t) return;
  rangerShoot(); hero.approach = null;
}
// the Barbarian's rage: each swing that lands adds (capped per swing); it drains once he stops landing blows;
// full rage is a FRENZY (the dungeon game's frenzy: attacks half again as fast) and he moves a little faster
function svRage(n) {
  const k = (SV.mods.axes === 'frenzy' ? 2 : 1) * (1 + 0.3 * (SV.pas.fury || 0));
  SV.rage = Math.min(100, SV.rage + Math.min(n, 3) * 4.5 * k); SV.rageT = G.t;
  if (SV.rage >= 100 && !(hero.frenzy > 0)) {
    hero.frenzy = 6 + (SV.mods.axes === 'frenzy' ? 3 : 0); SV.rage = 0;
    say('FRENZY!', 22, 1.5); sfx('cry'); sfx('heavySwing'); shockwave(hero.fi, hero.fj, 2.2, 0.3, [21, 23]);
    const [x, y] = screenOf(hero); burst(1, x, y, 20, 24, 70, 22);
  }
}
// the Ranger's tumble: a blow that lands sends her off faster for a moment (her one defensive answer)
function svTumble() { SV.tumbleT = G.t + 1.2 + 0.4 * (SV.pas.fleet || 0); if (SV.pas.fleet) SV.grace = Math.max(SV.grace, G.t + 0.3 + 0.15 * SV.pas.fleet); }
// ---------------------------------------------------------------- the Paladin's hammer (melee)
// A swing starts whenever a foe is in reach and he is free; he keeps walking through it (svCarry). The brief:
// slowing movement during auto-attacks felt clumsy in a horde. He faces his target for the swing (locomotion and
// attack direction are separate), so the back of the arc is the opening to watch.
const svReachPlus = () => SV.mods.swing === 'reach' && hero.cls === 'paladin' ? 1.1 : 0;
function svSwing() {
  if (hero.dead || heroBusy() || hero.leap) return;
  const reach = heroReach(), t = nearestEnemy(reach + 0.4 + svReachPlus());
  if (!t) return;
  const d = Math.hypot(t.fi - hero.fi, t.fj - hero.fj);
  hero.dir = dirFrom(t.fi - hero.fi, t.fj - hero.fj);
  hero.mag = Math.min(0.4, Math.max(0, d - (reach - 0.25)));   // the small step into the blow
  hero.combo = G.t - (hero.swingEnd ?? -9) < 0.3 ? ((hero.combo || 0) + 1) % 3 : 0;
  hero.approach = null; hero.atk = 0; hero.hitDone = false;
  sfx(SV.counterT > G.t ? 'heavySwing' : 'swing');
}
// while a swing, a throw or a raised hammer holds the body, the legs still carry him where the stick points
function svCarry(dt) {
  if (hero.dead || !(hero.atk >= 0 || hero.cast >= 0 || hero.palRaise > 0) || hero.leap || hero.bz || hero.roll) return;
  let vx = input.mx, vy = input.my; const K = input.keys;
  if (K.has('a') || K.has('arrowleft')) vx -= 1; if (K.has('d') || K.has('arrowright')) vx += 1;
  if (K.has('w') || K.has('arrowup')) vy -= 1; if (K.has('s') || K.has('arrowdown')) vy += 1;
  const l = Math.hypot(vx, vy); if (l < 0.18) return;
  if (l > 1) { vx /= l; vy /= l; }
  const [gi, gj, m] = stickToGround(vx, vy), sp = STAT.speed * m * 0.85 * dt;
  tryMove(hero, gi * sp, gj * sp);
}
function svGuardCd() { return SV_GUARD_CD * Math.pow(0.75, SV.pas.guard || 0); }
// the guard: one blow stopped dead, the nearest foes shoved off, and the next swing primed as a counter
function svBlock(src) {
  SV.guardOn = false; SV.guardT = svGuardCd(); SV.counterT = G.t + 2.5; SV.grace = G.t + 0.4;
  floater('BLOCKED', hero.fi, hero.fj, 46, 39); sfx('block'); sfx('clank');
  shockwave(hero.fi, hero.fj, 1.6, 0.22, [38, 40]);
  for (const e of enemies) {
    if (!alive(e) || e.def.unique) continue;
    const dx = e.fi - hero.fi, dy = e.fj - hero.fj, d = Math.hypot(dx, dy);
    if (d < 1.7 && d > 1e-3) { tryMove(e, dx / d * 0.7, dy / d * 0.7, 0.25); e.stun = Math.max(e.stun || 0, 0.35); e.atk = -1; }
  }
  void src;
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
  svRun('spawn', e, opt);
  enemies.push(e);
  return e;
}
function svSpawns(dt) {
  const [, ids, rate, cap] = svWave();
  SV.spawnT -= dt;
  while (SV.spawnT <= 0) {
    SV.spawnT += 1 / (rate * (SV.rateK || 1));
    if (svAlive() >= cap * (SV.capK || 1)) continue;
    const id = ids[Math.floor(Math.random() * ids.length)], p = svSpot(9.5, 12, true);
    if (!p) continue;
    const n = SV_PACKS[id] ? 2 + Math.floor(Math.random() * 3) : 1;
    for (let k = 0; k < n; k++) { const q = [p[0] + (Math.random() - 0.5) * 1.6, p[1] + (Math.random() - 0.5) * 1.6]; if (!blocked(q[0], q[1])) svSpawn(id, q[0], q[1]); }
  }
  // an elite every 75 seconds from 1:15: a champion with its powers, two of its kind beside it; it drops a chest
  if (SV.t >= SV.eliteT) {
    SV.eliteT += SV.eliteEvery || 75;
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
  svRun('killed', e);
  if (e === SV.boss) { SV.boss = null; if (e.id === 'skelking') { SV.won = true; setTimeout(() => svEnd(true), 1600); } }
}
function svPickup(g) {
  if (g.xp) { svGainXp(g.xp); sfx('clink', 0.35); return true; }
  if (g.svHeal) { hero.hp = Math.min(STAT.maxHp, hero.hp + STAT.maxHp * 0.3); sfx('potion'); floater('+LIFE', hero.fi, hero.fj, 40, 54); return true; }
  if (g.svChest) { svChest(); return true; }
  for (const f of SV_HOOKS.pickup) if (f(g)) return true;
  if (g.gold) { SV.gold += g.gold; sfx('gold'); floater(`+${g.gold} GOLD`, g.fi, g.fj, 10, 50); return true; }
  if (g.item || g.gem) { const v = 15; SV.gold += v; sfx('gold'); floater(`+${v} GOLD`, g.fi, g.fj, 10, 50); return true; }   // (dungeon loot that falls here, a goblin's sack: gold)
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
    if (!(g.xp || g.svHeal || g.svChest || g.gold || g.svPick)) continue;
    const dx = hero.fi - g.fi, dy = hero.fj - g.fj, d = Math.hypot(dx, dy);
    if (g.pull || (d < R && !g.svChest && !g.svPick)) { g.pull = (g.pull || 3) + dt * 14; const s = Math.min(d, g.pull * dt); if (d > 1e-3) { g.fi += dx / d * s; g.fj += dy / d * s; } g.t = Math.max(g.t, 0.41); }
  }
}

// ---------------------------------------------------------------- level-up cards
function svLvlOf(c) { return c.kind === 'w' ? `LV ${SV.w[c.id] ? SV.w[c.id].lvl : 1}` : `LV ${SV.pas[c.id] || 0}`; }
// every card the pool can offer now
function svPool() {
  const out = [], nw = Object.keys(SV.w).length, H = SV_HEROES[SV.cls];
  for (const id in SV_WEAPONS) {
    const W = SV_WEAPONS[id], w = SV.w[id]; if (W.cls !== SV.cls) continue;
    if (!w && nw < H.maxW) out.push({ kind: 'w', id, name: W.name, line: SV.cls === 'mage' ? 'NEW SPELL' : 'NEW SKILL', desc: W.desc, wt: 1.4 });
    else if (w && w.lvl < 5) out.push({ kind: 'w', id, name: W.name, line: `LEVEL ${w.lvl + 1}`, desc: (W.lv || SV_WLVL)[w.lvl + 1], wt: w.lvl === 2 ? 1.6 : 1.2 });
  }
  for (const id in SV_PASSIVES) { const p = SV_PASSIVES[id], l = SV.pas[id] || 0; if (p.cls && ![].concat(p.cls).includes(SV.cls)) continue; if (l < p.max) out.push({ kind: 'p', id, name: p.name, line: l ? `LEVEL ${l + 1}` : 'NEW', desc: p.desc, wt: 1 }); }
  return out;
}
// every offer and pick, with when and how the run stood (the brief: balance from the choices offered and their
// circumstances, not from winning builds); the last 20 runs are kept in the browser (localStorage 'sv-runs')
function svLog(kind, c) {
  SV.log.push({ t: Math.round(SV.t), lvl: SV.lvl, hp: Math.round(100 * hero.hp / STAT.maxHp), foes: svAlive(), kind, offer: (SV.cards || []).map(x => x.id), pick: c ? c.id : null });
}
function svReroll() {
  if (G.mode !== 'svcards' || SV.rune || !(SV.rerolls > 0) || G.t - SV.cardT < 0.35) return;
  SV.rerolls--; svLog('reroll', null);
  SV.cards = svOffer(3); SV.cardT = G.t; sfx('gold');
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
  sfx('tap'); svLog(SV.rune ? 'rune' : 'level', c);
  if (c.kind === 'w' && SV.w[c.id] && SV.w[c.id].lvl === 2) {   // the third level: the rune choice
    SV.cards = SKILL_MODS[c.id].filter(m => !(c.id === 'hook' && m.id === 'tether')).map(m =>   // (Tether hauls him off on its own: left out)
      ({ kind: 'rune', wid: c.id, id: m.id, name: m.name, line: SV_WEAPONS[c.id].name + (c.id === 'swing' ? ' STYLE' : ' RUNE'), desc: m.desc.replace(/[.,]? ?COSTS? \d+ MORE (MANA|FURY)/, '').replace(/[.,] \d+ MORE (MANA|FURY)/, '') }));   // (no mana here)
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
  SV.end = { won, t: SV.t, kills: SV.kills, lvl: SV.lvl, gold: SV.gold }; SV.endAt = G.t; G.mode = 'svend'; clearInput();
  svRun('end', won);
  if (won) { sfx('levelUp'); sfx('chest'); } else sfx('death');
  try {
    const all = JSON.parse(localStorage.getItem('sv-best2') || '{}'), best = all[SV.cls] || {};
    if (won && !best.won || !(best.t >= SV.t) && !best.won) { all[SV.cls] = { t: SV.t, kills: SV.kills, won }; localStorage.setItem('sv-best2', JSON.stringify(all)); }
    const runs = JSON.parse(localStorage.getItem('sv-runs') || '[]');
    runs.push({ cls: SV.cls, won, t: Math.round(SV.t), lvl: SV.lvl, kills: SV.kills, w: Object.fromEntries(Object.entries(SV.w).map(([k, v]) => [k, v.lvl])), mods: SV.mods, pas: SV.pas, log: SV.log, at: Date.now() });
    localStorage.setItem('sv-runs', JSON.stringify(runs.slice(-20)));
  } catch (e) { /* storage blocked */ }
}
const svBest = cls => { try { return JSON.parse(localStorage.getItem('sv-best2') || '{}')[cls] || null; } catch (e) { return null; } };

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
  if (hero.cls !== 'mage') svCarry(dt);
  if (hero.cls === 'paladin' && !SV.guardOn && (SV.guardT -= dt) <= 0) { SV.guardOn = true; sfx('clank', 0.5); }
  if (hero.cls === 'warrior' && G.t - SV.rageT > 2) SV.rage = Math.max(0, SV.rage - dt * 14 * (1 - 0.25 * (SV.pas.fury || 0)));
  for (const e of enemies) { const B = e.svBleed; if (!B || !alive(e)) continue; B.tick -= dt; if (B.tick <= 0) { B.tick = 0.5; B.left -= 0.5; damageEnemy(e, Math.round(B.per), e.fi, e.fj, false, 0, true); const [x, y] = screenOf(e); burst(1, x, y, e.def.chest * 0.5, 3, 30, 22); if (B.left <= 0) e.svBleed = null; } }
  svWeapons(dt); svSpawns(dt); svMagnet(dt); svWash(dt);
  G.trauma = Math.min(G.trauma, 0.32);   // a kill shakes the screen in the dungeon game: a hundred at once would never stop
  if (SV.chestShow) { SV.chestShow.t -= dt; if (SV.chestShow.t <= 0) SV.chestShow = null; }
  // the dead are cleared away once their death has played (the list would grow by thousands)
  if (enemies.length > 60) enemies = enemies.filter(e => alive(e) || e.dying < 2.2 || e === boss);
  // gems far behind are folded into one, so the floor never holds hundreds
  if (groundItems.length > 160) { let v = 0; groundItems = groundItems.filter(g => { if (g.xp && Math.hypot(g.fi - hero.fi, g.fj - hero.fj) > 9) { v += g.xp; return false; } return true; }); if (v) { const p = svSpot(4, 7); if (p) groundItems.push({ gem: XP_GEM.purple, xp: v, fi: p[0], fj: p[1], t: 0 }); } }
  svRun('update', dt);
  if (SV.queue > 0 && !SV.end) svOpenCards();
  if (SV_PARAMS.get('bot')) svBot();
}
// testing: ?bot=1 picks at random; ?bot=2 plays focused: up to three spells, levels them, then might and haste
function svBotPick() {
  if (SV_PARAMS.get('bot') !== '2') return Math.floor(Math.random() * SV.cards.length);
  const C = SV.cards, nw = Object.keys(SV.w).length, score = c => c.kind === 'rune' ? Math.random() : c.kind === 'w' ? (SV.w[c.id] ? 10 + SV.w[c.id].lvl + (SV_WEAPONS[c.id].basic ? 2 : 0) : nw < 3 ? 9 : 0) : c.id === 'might' ? 6 : c.id === 'haste' ? 5 : c.id === 'vigor' ? 4 : 1;
  let best = 0; C.forEach((c, k) => { if (score(c) > score(C[best])) best = k; }); return best;
}
// testing: a bot that walks away from the crowd, round the arena, and goes for gems (the Paladin: works the edge of
// the crowd while his life holds, standing a swing's length from the nearest foe)
function svBot() {
  let ax = 0, ay = 0;
  const melee = svMelee() && hero.hp > STAT.maxHp * 0.4, near = melee ? nearestEnemy(4) : null;
  for (const e of enemies) { if (!alive(e)) continue; const dx = hero.fi - e.fi, dy = hero.fj - e.fj, d = Math.hypot(dx, dy); if (d < (melee ? 1.6 : 5)) { ax += dx / (d * d + 0.3); ay += dy / (d * d + 0.3); } }
  if (near) { const dx = near.fi - hero.fi, dy = near.fj - hero.fj, d = Math.hypot(dx, dy); if (d > 1.3) { ax += dx / d * 1.2; ay += dy / d * 1.2; } }
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
  if (c.kind === 'w' || c.kind === 'rune') {
    const id = c.kind === 'rune' ? c.wid : c.id;
    if (id === 'swing') { drawButton([cx, cy, r], [48, 49, 50, 51], false, typeof glyphHammer === 'function' ? glyphHammer : glyphSword); return; }
    if (id === 'axes') { drawButton([cx, cy, r], [19, 20, 21, 22], false, glyphSword); return; }
    if (id === 'bow') { drawButton([cx, cy, r], [33, 34, 35, 36], false, typeof glyphBowAtk === 'function' ? glyphBowAtk : glyphBolt); return; }
    const sk = [...SKILLSETS.mage, ...SKILLSETS.paladin, ...SKILLSETS.warrior, ...SKILLSETS.ranger].find(s => s.id === id) || { id, lvl: 1 };
    try { skillIcon(sk, 0, cx, cy, r, false); } catch (e) { drawButton([cx, cy, r], [28, 29, 30, 31], false, glyphBolt); }
    return;
  }
  if (c.kind === 'hero') { const id = c.id; drawButton([cx, cy, r], { mage: [37, 38, 39, 40], paladin: [48, 49, 50, 51], warrior: [19, 20, 21, 22], ranger: [33, 34, 35, 36] }[id], false,
    id === 'mage' ? glyphBolt : id === 'paladin' ? (typeof glyphHammer === 'function' ? glyphHammer : glyphSword) : id === 'ranger' ? (typeof glyphBowAtk === 'function' ? glyphBowAtk : glyphBolt) : glyphSword); return; }
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
  // a broken ring at his feet, over everything: in a crowd (the Paladin's whole job) he must never be lost
  if (!hero.dead) { const [x, y] = screenOf(hero), cx = x - camX, cy = y - camY + 1; for (let a = 0; a < 40; a++) { if (a % 5 === 4) continue; const t = a / 40 * 6.283; put(cx + Math.cos(t) * 11, cy + Math.sin(t) * 5.5, a % 5 === 2 ? 27 : 51); } }
  // (it flashes white through the grace after a blow: the brief asks for that window to be visible)
  { const [x, y] = screenOf(hero), sx = Math.round(x - camX), sy = Math.round(y - camY) + 5, w = 22, f = Math.max(0, hero.hp / STAT.maxHp), grace = G.t < SV.grace && Math.floor(G.t * 20) % 2 === 0;
    fillRect(sx - w / 2 - 1, sy - 1, w + 2, 4, BLK); fillRect(sx - w / 2, sy, Math.round(w * f), 2, grace ? 27 : f < 0.3 && Math.sin(G.t * 10) > 0 ? 23 : 21);
    // the Paladin's guard: a small shield left of the bar, bright when ready, filling while it comes back; gold while a counter is primed
    if (hero.cls === 'paladin') {
      const gx = sx - w / 2 - 7, gy = sy - 4, fill = SV.guardOn ? 1 : 1 - SV.guardT / svGuardCd(), col = SV.counterT > G.t ? 51 : SV.guardOn ? 39 : 4;
      const rows = [[0, 4], [0, 4], [0, 4], [1, 3], [2, 2]];
      rows.forEach(([a, b], r) => { for (let c = a - 1; c <= b + 1; c++) put(gx + c, gy + r, BLK); });
      put(gx + 2, gy + 5, BLK); put(gx + 1, gy - 1, BLK); put(gx + 3, gy - 1, BLK); for (let c = -1; c <= 5; c++) put(gx + c, gy - 1, BLK);
      rows.forEach(([a, b], r) => { const on = SV.guardOn || (4 - r) / 5 < fill; for (let c = a; c <= b; c++) put(gx + c, gy + r, on ? col : 3); });
      if (SV.counterT > G.t && Math.floor(G.t * 8) % 2) textC('COUNTER', sx, sy + 5, 51);
    }
    // the Barbarian's rage under his life bar (it glows through a frenzy)
    if (hero.cls === 'warrior') { const fr = hero.frenzy > 0, f = fr ? hero.frenzy / 9 : SV.rage / 100; fillRect(sx - w / 2 - 1, sy + 3, w + 2, 3, BLK); fillRect(sx - w / 2, sy + 4, Math.round(w * Math.min(1, f)), 1, fr ? (Math.floor(G.t * 12) % 2 ? 51 : 16) : 14); }
    if (hero.cls === 'ranger' && G.t < SV.tumbleT) textC('TUMBLE', sx, sy + 5, 54);
  }
  // top: the XP bar, the level, the clock, the kills
  { const f = SV.xp / svNeed(SV.lvl); fillRect(0, 0, W, 7, BLK); fillRect(1, 1, Math.round((W - 2) * f), 5, 39); fillRect(1, 1, Math.round((W - 2) * f), 1, 40);
    text(`LV ${SV.lvl}`, 3, 10, 27); text(`${SV.gold}G`, 3, 18, 50); textC(svTime(SV.t), W / 2, 10, 27, 2); const k = `${SV.kills}`; text(k, W - 3 - textWidth(k), 10, 25); text('KILLS', W - 3 - textWidth('KILLS'), 17, 4); }
  // the spells owned, with their levels
  { let x = 4; for (const id in SV.w) { svIcon({ kind: 'w', id }, x + 8, 34, 7); for (let l = 0; l < SV.w[id].lvl; l++) put(x + 2 + l * 3, 44, SV.mods[id] && l === 2 ? 51 : 27); x += 19; }
    for (const id in SV.pas) { text(`${SV_PASSIVES[id].name[0]}${SV.pas[id]}`, x + 2, 32, 25); x += 13; } }
  svRun('hud');
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
    text(c.line, r.x + 36, r.y + 17, /^NEW/.test(c.line) ? 54 : 50);
    wrapText(c.desc, 44).forEach((l, n) => text(l, r.x + 36, r.y + 29 + n * 8, 26));
    text(`${k + 1}`, r.x + r.w - 9, r.y + 6, 4);
  });
  // two rerolls a run (the brief: a limited way to redirect offers, not a filter for every menu)
  if (!SV.rune) { const B = svRerollRect(), on = SV.rerolls > 0; fillRect(B.x, B.y, B.w, B.h, 3); frame(B.x, B.y, B.w, B.h, on ? 50 : 4, on ? 48 : 3); textC(on ? `REROLL (${SV.rerolls} LEFT)` : 'NO REROLLS LEFT', W / 2, B.y + 6, on ? 50 : 4); }
}
function svRerollRect() { const R = svCardRects(), last = R[R.length - 1]; return { x: W / 2 - 55, y: last.y + last.h + 12, w: 110, h: 18 }; }
function svDrawEnd() {
  svDim(0.75);
  const E = SV.end, y0 = Math.round(H * 0.22);
  textC(E.won ? 'VICTORY!' : 'YOU HAVE FALLEN', W / 2, y0, E.won ? 51 : 22, 2);
  textC(E.won ? 'THE SKELETON KING IS DEAD' : `YOU LASTED ${svTime(E.t)}`, W / 2, y0 + 20, 26);
  textC(`LEVEL ${E.lvl}    ${E.kills} KILLS`, W / 2, y0 + 32, 25);
  let y = y0 + 54; textC('YOUR BUILD', W / 2, y, 50); y += 12;
  for (const id in SV.w) { svIcon({ kind: 'w', id }, 40, y + 4, 7); text(`${SV_WEAPONS[id].name} LV ${SV.w[id].lvl}`, 54, y, 27); if (SV.mods[id]) text(SKILL_MODS[id].find(m => m.id === SV.mods[id]).name, 54, y + 8, 51); y += 20; }
  const ps = Object.keys(SV.pas).map(id => `${SV_PASSIVES[id].name} ${SV.pas[id]}`); wrapText(ps.join(', '), 48).forEach(l => { textC(l, W / 2, y, 25); y += 8; });
  { const b = svBest(SV.cls); if (b) textC(b.won ? `BEST: A WIN, ${b.kills} KILLS` : `BEST: ${svTime(b.t)}`, W / 2, y + 8, 4); }
  if (G.t - SV.endAt > 1.2) textC('TAP TO GO ON', W / 2, H - 50, 27);
}
function svHeroRects() { const w = W - 28, h = 56, y0 = Math.round(H * 0.3); return SV_HERO_ORDER.map((id, k) => ({ id, x: 14, y: y0 + k * (h + 6), w, h })); }
function svTitle() {
  svDim(0.45);
  const y0 = Math.round(H * 0.12);
  textC('DUNGEONS OF BONES', W / 2, y0, 26); textC('SURVIVORS', W / 2, y0 + 12, 51, 3);
  ['DRAG ANYWHERE TO MOVE (OR WASD). YOUR', 'ATTACKS ARE AUTOMATIC: GRAB GEMS, LEVEL UP,', 'THE SKELETON KING COMES AT 9:00'].forEach((l, n) => textC(l, W / 2, y0 + 46 + n * 9, 26));
  textC('CHOOSE YOUR HERO', W / 2, svHeroRects()[0].y - 14, 50);
  for (const r of svHeroRects()) {
    const H0 = SV_HEROES[r.id], sel = SV.cls === r.id, b = svBest(r.id);
    fillRect(r.x, r.y, r.w, r.h, 3); frame(r.x, r.y, r.w, r.h, sel ? 50 : 6, sel ? 48 : 3);
    svIcon({ kind: 'hero', id: r.id }, r.x + 18, r.y + 22, 11);
    text(H0.name, r.x + 36, r.y + 8, r.id === 'mage' ? 39 : 51); text(H0.role, r.x + 36, r.y + 17, 50);
    H0.lines.forEach((l, n) => text(l, r.x + 36, r.y + 28 + n * 8, 26));
    if (b) text(b.won ? 'BEST: A WIN' : `BEST: ${svTime(b.t)}`, r.x + 36, r.y + r.h - 10, 4);
  }
  { const R = svHeroRects(), last = R[R.length - 1]; if (Math.sin(G.t * 4) > -0.3) textC('TAP A HERO TO START', W / 2, last.y + last.h + 14, 27); }
}
function svChooseHero(cls) {
  if (cls !== SV.cls || SV.t > 0 || SV.kills) svNewRun(cls);   // (the arena behind the title was made for the last hero)
  try { localStorage.setItem('sv-cls', cls); } catch (e) { /* storage blocked */ }
  svBegin();
}
let svCardExtraTap = () => false;   // (surv_meta.js: the banish button)
let svTitleTap = p => { for (const r of svHeroRects()) if (inRect(p, r)) svChooseHero(r.id); };   // (surv_meta.js: the camp)
let svTitleKey = k => { if (k >= '1' && k <= '4') svChooseHero(SV_HERO_ORDER[+k - 1]); else if (k === 'enter' || k === ' ') svChooseHero(SV.cls); };
function svToTitle() { svNewRun(SV.cls); G.mode = 'svtitle'; }

// ---------------------------------------------------------------- input (ahead of the game's own)
// Taps go to the cards and screens here; in play a touch anywhere is the floating stick.
addEventListener('pointerdown', e => {
  if (e.target !== cvs) return;
  e.preventDefault(); e.stopImmediatePropagation();
  audioInit();
  const p = toNative(e);
  if (G.paused) { G.paused = false; last = performance.now(); return; }
  if (G.mode === 'svtitle') { svTitleTap(p); return; }
  if (G.mode === 'svcards') { if (svCardExtraTap(p)) return; const R = svCardRects(); R.forEach((r, k) => { if (inRect(p, r)) svPick(k); }); if (!SV.rune && inRect(p, svRerollRect())) svReroll(); return; }
  if (G.mode === 'svend') { if (G.t - SV.endAt > 1.2) svToTitle(); return; }
  if (G.mode !== 'play') return;
  if (p[0] > W - 50 && p[1] > H - 16) { setMuted(!SFX.muted); return; }
  if (stick.id === null) { stick.id = e.pointerId; stick.ox = p[0]; stick.oy = p[1]; stick.x = p[0]; stick.y = p[1]; capture(e); }
}, { capture: true, passive: false });
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  audioInit();
  if (G.mode === 'svtitle') { svTitleKey(k); e.stopImmediatePropagation(); return; }
  if (G.mode === 'svcards') { if (k >= '1' && k <= '3') svPick(+k - 1); if (k === 'r') svReroll(); e.stopImmediatePropagation(); return; }
  if (G.mode === 'svend') { if ((k === 'enter' || k === ' ') && G.t - SV.endAt > 1.2) svToTitle(); e.stopImmediatePropagation(); return; }
  if (k === 'n') { setMuted(!SFX.muted); e.stopImmediatePropagation(); return; }
  if (k === 'p' || k === 'escape') { G.paused = !G.paused; e.stopImmediatePropagation(); return; }
  if (!['w', 'a', 's', 'd', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) e.stopImmediatePropagation();   // only movement reaches the game
}, { capture: true });

// ---------------------------------------------------------------- hooks into the game
{
  const _update = update, _damage = damageEnemy, _pickup = pickup, _recalc = recalcHero, _hurt = hurtHero, _resolve = heroHitResolve;
  // a moment's grace after a blow (0.3 s), so a crowd's swings land one by one instead of all in one frame;
  // the Paladin's guard takes the first blow whole
  hurtHero = function (dmg, src) {
    if (SV.on) {
      if (G.t < SV.grace || hero.dead || G.mode !== 'play') return;
      if (hero.cls === 'paladin' && SV.guardOn) { svBlock(src); return; }
      SV.grace = G.t + 0.3;
      dmg = Math.max(1, Math.round(dmg * (SV.dmgInK || 1)));   // (the difficulty and blessings)
    }
    const hp0 = hero.hp;
    _hurt(dmg, src);
    if (SV.on && hero.cls === 'ranger' && hero.hp < hp0) svTumble();
    if (SV.on && hero.hp <= 0) svRun('fatal');   // (a revive may catch it)
  };
  // the Paladin's swing, as his hammer's levels and fighting style make it (heroHitResolve is the moment a blow lands)
  heroHitResolve = function (all = false, pow = 0, ...rest) {
    if (!SV.on || !svMelee()) return _resolve(all, pow, ...rest);
    const id = svBasicId(), w = SV.w[id], mod = SV.mods[id], pal = hero.cls === 'paladin', counter = pal && SV.counterT > G.t;
    const third = !pal && hero.combo === 2;   // the Barbarian's every third blow
    const k = (w && w.lvl >= 2 ? 1.3 : 1) * (w && w.lvl >= 5 ? 1.3 : 1) * (counter ? 2.5 : 1) * (third ? 1.3 : 1);
    const hp0 = new Map(); for (const e of enemies) if (alive(e) && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 4) hp0.set(e, e.hp);
    const d0 = STAT.dmg; STAT.dmg = [d0[0] * k, d0[1] * k];
    const spin = pal ? mod === 'wide' || counter : third && mod === 'ravager';
    let r;
    try {
      r = _resolve(all || spin, Math.max(pow, counter ? 2 : pal && mod === 'crush' ? 1 : third ? 1 : 0), ...rest);
      if (pal && mod === 'reach') {   // LONG REACH: a crescent of light carries the blow a tile past the hammer, in front
        const [fx, fy] = dirVec(hero.dir), R0 = heroReach() + 0.1;
        for (const e of enemies) { if (!alive(e) || hp0.has(e) && e.hp < hp0.get(e)) continue; const dx = e.fi - hero.fi, dy = e.fj - hero.fj, d = Math.hypot(dx, dy);
          if (d > R0 && d < R0 + 1.2 + (e.def.unique ? 0.5 : 0) && (dx * fx + dy * fy) / d > 0.35) damageEnemy(e, heroDmg(0.8), hero.fi, hero.fj, false, 0); }
        shockwave(hero.fi + fx * 0.6, hero.fj + fy * 0.6, R0 + 0.9, 0.16, [27, 51], [Math.atan2(fy, fx), 1.1]);   // (arc: [centre angle, half width])
      }
    } finally { STAT.dmg = d0; }
    let n = 0;
    for (const [e, hp] of hp0) if (e.hp < hp) {
      n++;
      if (!alive(e) || e.def.unique) continue;
      if (pal && mod === 'crush') e.stun = Math.max(e.stun || 0, 0.5);
      if (third) e.stun = Math.max(e.stun || 0, mod === 'ravager' ? 0.7 : 0.35);   // the finishing blow staggers (his defensive answer)
      if (!pal && mod === 'bleed') e.svBleed = { left: 3, tick: 0.5, per: Math.max(1, (hp - e.hp) * 0.5 / 6) };
    }
    if (spin && !pal) { shockwave(hero.fi, hero.fj, heroReach() + 0.3, 0.25, [21, 23]); sfx('heavySwing'); }
    if (counter) { SV.counterT = 0; shockwave(hero.fi, hero.fj, heroReach() + 0.4, 0.3, [50, 51]); sfx('palToll'); if (n) floater('COUNTER!', hero.fi, hero.fj, 52, 51); }
    if (SV.pas.oath && n) hero.hp = Math.min(STAT.maxHp, hero.hp + Math.min(n, 3) * SV.pas.oath);   // healing capped per swing (a cleave through ten must not heal ten times)
    if (!pal && n) svRage(n);
    return r;
  };
  // the Ranger's basic arrows, as her bow's levels and style make them
  const _shoot = shootArrow;
  shootArrow = function (a, o = {}) {
    if (!SV.on || hero.cls !== 'ranger' || !o.basic) return _shoot(a, o);
    const w = SV.w.bow, mod = SV.mods.bow, k = (w && w.lvl >= 2 ? 1.3 : 1) * (w && w.lvl >= 5 ? 1.3 : 1) * (1 + 0.15 * (SV.pas.eagle || 0));
    const o2 = Object.assign({}, o, { dmgK: (o.dmgK || 1) * k * (mod === 'twin' ? 0.8 : 1), sp: ARROW_SP * (1 + 0.12 * (SV.pas.eagle || 0)) });
    if (mod === 'pierce') { o2.pierce = true; o2.hits = new Set(); }
    if (mod === 'fire') { o2.elem = 'fire'; o2.fire = true; }
    if (mod === 'twin') { _shoot(a - 0.07, Object.assign({}, o2, o2.hits ? { hits: new Set() } : {})); return _shoot(a + 0.07, o2); }
    return _shoot(a, o2);
  };
  update = function (dt) {
    for (let k = 0, n = +SV_PARAMS.get('speed') || 1; k < n; k++) {   // (?speed=4 for test runs)
      // a frenzy, a tumble or a shrine's haste quickens his legs for the frame
      const s0 = STAT.speed; if (SV.on) STAT.speed *= (hero.frenzy > 0 && hero.cls === 'warrior' ? 1.15 : 1) * (G.t < SV.tumbleT ? 1.4 : 1) * (SV.speedK || 1);
      try { _update(dt); } finally { STAT.speed = s0; }
      if (SV.on) svUpdate(dt);
    }
    if (!SV.on) return;
    if (SV_PARAMS.get('bot')) { if (G.mode === 'svtitle') svChooseHero(SV_PARAMS.get('cls') || 'mage'); if (G.mode === 'svcards' && G.t - SV.cardT > 0.4) svPick(svBotPick()); }   // (testing)
  };
  damageEnemy = function (e, ...a) { const was = alive(e); _damage(e, ...a); if (SV.on && was && !alive(e)) svKilled(e); };
  pickup = g => SV.on ? svPickup(g) : _pickup(g);
  recalcHero = function () {
    _recalc(); if (!SV.on) return;
    if (SV.base) { STAT.dmg = SV.base.dmg.slice(); STAT.armor = SV.base.armor; STAT.maxHp = SV.base.maxHp; STAT.block = SV.base.block; }   // (gear worn for the hero's rank is a look; its power is set in surv_meta.js)
    svRun('recalc');
    const p = SV.pas, k = 1 + 0.15 * (p.might || 0);
    STAT.dmg = [STAT.dmg[0] * k, STAT.dmg[1] * k];
    STAT.maxHp = Math.round(STAT.maxHp * SV_HEROES[SV.cls].hp) + 20 * (p.vigor || 0); STAT.speed *= 1 + 0.1 * (p.swift || 0);
    { const b = SV.w[svBasicId()]; STAT.atkSpeed = (STAT.atkSpeed || 0) + 8 * (p.haste || 0) + (b && b.lvl >= 4 ? 25 : 0) + (SV.atkK || 0); }
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
// boot: in surv_map.js (the last file), once every part has hung its hooks

