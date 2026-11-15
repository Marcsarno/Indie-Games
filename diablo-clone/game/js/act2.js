'use strict';
// Round 116: ACT II, UNDER MOUNT ASH (the user: "Build it ... bring those upgrades to the table with the act 2
// plan ... continue pushing and building out act 2 to completion"). The plan is art/refs/act2/ (OVERVIEW.md and a
// SPEC.md for each of the three regions); NOTES.md "Act II build plan" lists what was decided where the plan
// was silent. This file holds Act II's story: its stages, what its people say, the marks over them, the tracker
// and the arrow, the dungeons (side areas) and their bosses. It hooks into Act I's machinery (quests.js,
// bosses.js) by adding to its tables and wrapping its functions when the hero is in Act II (`a2On`).
//   Region 1 ASHFORD VALE (level 6): Reeve Mara by the silent bell -> the RESCUE PIT (the Pit Enforcer; Foreman
//   Renn in a cage) -> Renn opens the HAUL GATE. Optional: BLACKWAKE TOMB (the Warden; Sister Edda's ledger).
//   Errands: Tamsin's ore, Bram's lockbox, Nella's salts, Edda's ledger.
const a2On = () => LV.act === 1 && !(LV.loop > 0);
const a2F = () => storyF();

// ---------------------------------------------------------------- the stages
function a2Stage() {
  const f = a2F();
  if (!f.a2met) return 'a2meet';
  if (!f.a2rennFree) return f.a2enforcer ? 'a2cage' : 'a2pit';
  if (!f.a2gate) return 'a2haul';
  if (!f.a2rusk) return 'a2wheel';
  if (!f.a2maelis) return 'a2silk';
  if (!f.a2brood) return 'a2brood';
  if (!f.a2drained) return 'a2sluice';
  if (!f.a2gorath) return 'a2breach';
  if (!f.a2paid) return 'a2back';
  return 'a2done';
}
const A2_TEXT = {
  a2meet: 'SPEAK TO REEVE MARA BY THE BELL', a2pit: 'FIND FOREMAN RENN IN THE RESCUE PIT (NORTHEAST)', a2cage: 'FREE RENN', a2haul: 'MEET RENN AT THE HAUL GATE (EAST)',
  a2wheel: 'FOLLOW THE NIGHT CREW EAST, TO THE SILENT WHEEL', a2silk: 'FIND THE CREW AT SILKSHAFT (EAST, OVER THE BRIDGE)', a2brood: 'KILL WHAT NESTS IN SILKSHAFT',
  a2sluice: 'FIT THE HANDLE AT THE SOUTH SLUICE', a2breach: 'GO DOWN INTO THE BREACH (THE BROKEN FLANK)', a2back: 'RETURN TO REEVE MARA', a2done: 'THE ROAD TO GREYMARSH IS OPEN, PAST THE BREACH',
};
Object.assign(STORY_NAMES, { ashford: 'THE SILENT BELL', works: 'THE DEAD WHEEL', breach: 'THE FURNACE MAW' });
Object.assign(STAGE_QUEST, { a2meet: 'ashford', a2pit: 'ashford', a2cage: 'ashford', a2haul: 'ashford', a2wheel: 'works', a2silk: 'works', a2brood: 'works', a2sluice: 'works', a2breach: 'breach', a2back: 'breach' });
Object.assign(CAMP_ROLE, { a2meet: 'mara', a2back: 'mara' });
Object.assign(TURN_IN, { a2back: 'breach' });
{ const s0 = storyStage; storyStage = function () { return a2On() ? a2Stage() : s0(); }; }
{ const t0 = stageText; stageText = function (st) { return A2_TEXT[st] || t0(st); }; }

// ---------------------------------------------------------------- the people
Object.assign(NPC_LOOKS, {
  mara: { team: 'blue', helm: 'none', chest: 'tunic', weapon: 'none', shield: 'none', hair: 'grey' },
  renn: { team: 'tan', helm: 'cap', chest: 'tunic', weapon: 'mace', shield: 'none', hair: 'brown', beard: true },
  bram: { team: 'green', helm: 'none', chest: 'tunic', weapon: 'none', shield: 'none', hair: 'bald', beard: true },
  edda: { team: 'white', helm: 'hood', chest: 'robe_white', weapon: 'none', shield: 'none', hair: 'grey' },
  miner: { team: 'tan', helm: 'cap', chest: 'tunic', weapon: 'none', shield: 'none', hair: 'brown' },
});
Object.assign(TRADER_ROLES, { mara: 'TAP: TALK', renn: 'TAP: TALK', bram: 'TAP: TALK', edda: 'TAP: TALK' });
Object.assign(TALKERS, { mara: 1, renn: 1, bram: 1, edda: 1 });
// the small errands: someone asks, the thing turns up out in the world (a flag), they pay
const A2_ERRANDS = {
  smith: { k: 'ore', who: 'TAMSIN', ask: ['MY ORE CART NEVER CAME DOWN FROM RENN\'S YARD, EAST OF THE CARTWAY. GOBLINS HAVE IT NOW.', 'BRING ME THE ORE AND I WILL PAY YOU IN GOOD STEEL.'], pay: 'THAT IS MY ORE, EVERY LUMP. TAKE YOUR PICK.', gold: 150, choice: true },
  bram: { k: 'box', who: 'BRAM', ask: ['A TOLLMAN CALLED RUSK STOPPED MY WAGON AT THE SILENT WHEEL AND TOOK MY LOCKBOX.', 'HE WEARS A RED SASH. BRING THE BOX BACK AND HALF OF IT IS YOURS.'], pay: 'MY LOCKBOX. AND STILL LOCKED. HALF, AS I SAID.', gold: 600 },
  merchant: { k: 'salts', who: 'NELLA', ask: ['MY POTIONS NEED CRYSTAL SALTS, AND THE ONLY SALTS ARE IN GLASSVEIN GROTTO, PAST THE WHEEL.', 'BRING ME A SACK AND YOU WILL NEVER RUN DRY.'], pay: 'GLASSVEIN SALTS. HERE: FOR THE ROAD.', gold: 100, potions: 3 },
  edda: { k: 'ledger', who: 'SISTER EDDA', ask: ['I KEEP THE NAMES OF OUR DEAD. THE OLD LEDGER LIES IN BLACKWAKE TOMB, SOUTH OF THE GRAVE ROAD.', 'ITS WARDEN DOES NOT SLEEP. DO NOT GO UNTIL YOU ARE STRONG.'], pay: 'THE LEDGER. NOW THE NEW NAMES CAN BE WRITTEN BESIDE THE OLD. TAKE THIS.', gold: 200, rare: true },
};
const a2Errand = role => a2On() && LV.reg === 'ashford' ? A2_ERRANDS[role] : null;
function a2ErrandState(E) { const f = a2F(); return f['a2' + E.k + 'Paid'] ? 'done' : f['a2' + E.k] ? 'have' : f['a2' + E.k + 'Ask'] ? 'asked' : 'new'; }
function a2ErrandTalk(E) {
  const f = a2F(), s = a2ErrandState(E);
  if (s === 'have') {
    const reward = E.choice ? rewardChoice() : E.rare ? [rollRare(rng((Math.random() * 1e9) | 0), LV.diff)] : null;
    return openTalk([[E.who, E.pay]], 'COLLECT', () => { f['a2' + E.k + 'Paid'] = true; hero.gold += E.gold; gainXp(60 * LV.diff); sfx('gold'); say(`+${E.gold} GOLD`, 51, 3); if (E.potions) { hero.potions = (hero.potions || 0) + E.potions; say(`+${E.potions} POTIONS`, 51, 3); } saveGame(); }, reward);
  }
  openTalk(E.ask.map(t => [E.who, t]), 'ACCEPT', () => { f['a2' + E.k + 'Ask'] = true; saveGame(); });
}
function a2Got(k, name) { const f = a2F(); if (f['a2' + k]) return; f['a2' + k] = true; sfx('chest'); questBanner('FOUND', name, 51); saveGame(); }
{ const tr0 = trade; trade = function (n) {   // the smith and the potion seller ask their errand once (and pay it) before the shop opens
  const E = a2Errand(n.role);
  if (E && (n.role === 'smith' || n.role === 'merchant')) { const s = a2ErrandState(E); if (s === 'new' || s === 'have') return a2ErrandTalk(E); }
  return tr0(n);
}; }

// ---------------------------------------------------------------- the quests at Dave's table (captions; no voices yet)
Object.assign(QUEST_TABLE, {
  a2meet: { lines: [
    ['dave', 'REEVE MARA', 'OUR BELL HAS NOT RUNG IN NINE DAYS. THE MOUNTAIN SHOOK, AND THE DAY CREW NEVER CAME UP.'],
    ['dave', 'REEVE MARA', 'FOREMAN RENN IS SHUT IN THE RESCUE PIT. SOMETHING BIG HOLDS THE WAY OUT.'],
    ['marc', null, 'I DIG THEM OUT. I ROLL TO DIG.'],
    ['dave', null, 'YOU DO NOT ROLL TO DIG.'],
    ['chris', null, 'HE ROLLED ANYWAY.']],
    after: () => { a2F().a2met = true; } },
  a2back: { lines: [
    ['dave', 'REEVE MARA', 'THE MOUNTAIN IS QUIET. I FELT IT STOP.'],
    ['dave', 'REEVE MARA', 'AND THIS PAGE, IN THE SAME HAND AS THE SILVER: GREYMARSH. HE HAS GONE TO THE DROWNED VILLAGE.'],
    ['aaron', null, 'A DROWNED VILLAGE HAS SUNKEN TREASURE. THAT IS JUST SCIENCE.'],
    ['dave', 'REEVE MARA', 'LISTEN.', 'coin'],
    ['dave', null, 'FOR THE FIRST TIME IN A MONTH, THE BELL OF ASHFORD RINGS.']],
    reward: ['REEVE MARA', 'ASHFORD OWES YOU ITS MINE AND ITS MEN. TAKE WHAT YOU WILL.'],
    after: () => { const f = a2F(); f.a2paid = true; payQuest('breach'); f.a2endDue = true; } },
});

// ---------------------------------------------------------------- what each person says
{ const tk0 = talkTo; talkTo = function (n) {
  if (!a2On()) return tk0(n);
  const f = a2F(), st = a2Stage(), Ma = 'REEVE MARA', Re = 'RENN';
  if (QUEST_TABLE[st] && CAMP_ROLE[st] === n.role && cineOK()) { startCine('quest', { stage: st }); return; }
  if (n.role === 'mara') {
    if (st === 'a2meet') return openTalk([
      [Ma, 'YOU CAME DOWN THE NORTH ROAD? THEN OAKHOLLOW STILL STANDS. GOOD. ASHFORD MAY NOT.'],
      [Ma, 'OUR BELL HAS NOT RUNG IN NINE DAYS. THE MOUNTAIN SHOOK, AND THE DAY CREW NEVER CAME UP.'],
      [Ma, 'FOREMAN RENN AND HIS MEN ARE SHUT IN THE RESCUE PIT, NORTHEAST. SOMETHING BIG HOLDS THE WAY OUT. BRING THEM UP.']], 'ACCEPT', () => { f.a2met = true; saveGame(); });
    if (st === 'a2back') return openTalk([
      [Ma, 'THE MOUNTAIN IS QUIET. I FELT IT STOP.'],
      [Ma, 'AND THIS PAGE NAMES GREYMARSH, THE DROWNED VILLAGE. THAT IS WHERE YOUR MAN IN THE TALL HAT HAS GONE.'],
      [Ma, 'ASHFORD OWES YOU ITS MINE AND ITS MEN. LISTEN: THE BELL.']], 'COLLECT', () => { f.a2paid = true; payQuest('breach'); f.a2endDue = true; saveGame(); }, rewardChoice());
    const hint = { a2pit: 'THE RESCUE PIT IS NORTHEAST, PAST THE CARTWAY. BRING RENN UP.', a2cage: 'THE RESCUE PIT IS NORTHEAST, PAST THE CARTWAY. BRING RENN UP.', a2haul: 'RENN WENT STRAIGHT TO THE HAUL GATE, EAST. HE WILL NOT REST.', a2done: 'THE BELL RINGS BECAUSE OF YOU. GO WELL.' }[st];
    return openTalk([[Ma, hint || 'THE CINDERWORKS LIE EAST, THROUGH THE HAUL GATE. THE NIGHT CREW WENT THAT WAY.']]);
  }
  if (n.role === 'renn') {
    if (LV.side === 'rescuepit') {
      if (!f.a2enforcer) return openTalk([[Re, 'NOT YET. THAT BRUTE HAS THE KEY ON HIS BELT.']]);
      if (!f.a2rennFree) return a2FreeRenn(n);
      return;
    }
    if (st === 'a2haul') return openTalk([
      [Re, 'YOU PULLED US OUT. I PAY MY DEBTS.'],
      [Re, 'A MAN IN A TALL HAT PAID THOSE OGRES TO HOLD US DOWN THERE. THEN HE WENT EAST, THROUGH THIS GATE.'],
      [Re, 'THE NIGHT CREW IS EAST TOO, AT THE CINDERWORKS. NOBODY HAS HEARD THE WHEEL TURN SINCE. I WILL WIND THE GATE UP.']], 'COLLECT', () => { f.a2gate = true; payQuest('ashford'); a2Rebuild('THE HAUL GATE IS OPEN'); }, rewardChoice());
    return openTalk([[Re, f.a2brood ? 'MY CREW IS HOME. I WILL NOT FORGET IT.' : 'FIND MY NIGHT CREW. FOLLOW THE CART TRACKS EAST.']]);
  }
  const E = a2Errand(n.role);
  if (E) { if (a2ErrandState(E) !== 'done' && a2ErrandState(E) !== 'asked') return a2ErrandTalk(E); return openTalk([[E.who, a2ErrandState(E) === 'done' ? 'YOU DID RIGHT BY ME.' : E.ask[E.ask.length - 1]]]); }
  if (n.role === 'villager' || n.role === 'miner') return openTalk([[n.name || 'VILLAGER', f.a2gorath ? 'THE CHIMNEYS ARE WARM AGAIN.' : f.a2rennFree ? 'RENN IS UP. THERE IS HOPE YET.' : 'NINE DAYS, AND NO BELL.']]);
  return tk0(n);
}; }
{ const m0 = storyMark; storyMark = function (role) {
  if (!a2On()) return m0(role);
  const st = a2Stage();
  if (role === 'mara') return st === 'a2meet' ? '!' : st === 'a2back' ? '?' : null;
  if (role === 'renn') return (st === 'a2haul' && !LV.side) || (st === 'a2cage' && LV.side === 'rescuepit') ? '!' : null;
  const E = a2Errand(role); if (E) { const s = a2ErrandState(E); return s === 'new' ? '!' : s === 'have' ? '?' : null; }
  return null;
}; }
{ const at0 = actionTarget; actionTarget = function () {
  const a = at0();
  if (a && a.n && a.n.role === 'renn' && LV.side === 'rescuepit' && a2F().a2enforcer && !a2F().a2rennFree) a.label = 'FREE RENN';
  return a;
}; }
function a2FreeRenn(n) {
  const f = a2F(); f.a2rennFree = true;
  for (const p of dynProps) if (p.kind === 'cage') p.open = true;
  for (const m of npcs) if (m.role === 'renn' || m.role === 'miner') m.leaving = 1.2 + Math.random() * 0.4;
  sfx('chest'); say('RENN AND HIS MEN ARE FREE', 51, 3); say('MEET HIM AT THE HAUL GATE', 51, 3); saveGame();
}
// the level built again as the story changed it (a gate opened, a road drained), the hero and the fight left as they were
function a2Rebuild(msg) {
  const P = [hero.fi, hero.fj], S = { enemies, boss, groundItems, seen: LV.seen.slice(), props: dynProps.map(p => ({ open: p.open, broken: p.broken, hp: p.hp, hatch: p.hatch })) };
  G.fadeTo = () => {
    startLevel(LV.level, LV.seed); enemies = S.enemies; boss = S.boss; groundItems = S.groundItems; LV.seen.set(S.seen);
    S.props.forEach((q, k) => { if (dynProps[k]) Object.assign(dynProps[k], q); });
    hero.fi = P[0]; hero.fj = P[1]; updateFov(hero.fi, hero.fj); if (msg) { questBanner(msg, 'THE WAY EAST IS CLEAR', 51); sfx('levelUp'); } saveGame();
  };
}

// ---------------------------------------------------------------- the dungeons
const a2Door = id => () => { const p = LV.doorsAt && LV.doorsAt[id]; return p ? [p[0] + 1.6, p[1] + 0.6] : [-99, -99]; };
Object.assign(SIDES, {
  rescuepit: { name: 'THE RESCUE PIT', theme: 'caves', rooms: 9, pool: ['digger', 'digger', 'goblin', 'gshaman', 'oclubber'], boss: 'pitenforcer', bossArena: true, arenaSize: [22, 16], at: 'ashford', diff: 8, door: a2Door('rescuepit'), label: 'RESCUE PIT', seed: 0x9e5c },
  blackwake: { name: 'BLACKWAKE TOMB', theme: 'crypt', rooms: 8, pool: ['tombguard', 'gravebow', 'spearman', 'axeman', 'wraith', 'gravebow'], boss: 'blackwarden', bossArena: true, arenaSize: [20, 16], at: 'ashford', diff: 11, door: a2Door('blackwake'), label: 'BLACKWAKE TOMB: DANGER', labelCol: 22, seed: 0xb1ac },
});
MONSTERS.pitenforcer = { family: 'ogre', name: 'PIT ENFORCER', title: 'HE HOLDS THE WAY OUT', minLevel: 99, look: { grunt: true, pads: true, cleaver: true, scale: 1.45 }, hp: 150, dmg: [8, 14], speed: 24, reach: 2.0, xp: 200, chest: 44, shadow: 13, unique: true };
MONSTERS.blackwarden = { family: 'skeleton', name: 'THE BLACKWAKE WARDEN', title: 'HE KEEPS THE LEDGER OF THE DEAD', minLevel: 99, look: { weapon: 'mace', chunky: true, helm: 'kettle', pauldron: 'both', breastplate: true, towerShield: true, rag: M.CLOTH_DARK, eye: M.EYE_GRN, scale: 1.5, size: [116, 124, 58, 98] }, hp: 150, dmg: [8, 13], speed: 22, reach: 1.9, xp: 220, chest: 40, shadow: 11, unique: true };
Object.assign(BOSS_KINDS, { rescuepit: 'pitenforcer', blackwake: 'blackwarden' });
Object.assign(BOSS_HP, { pitenforcer: 1.5, blackwarden: 1.5 });
// what the story adds inside: Renn's cage and his two men at the far side of the Enforcer's arena
{ const se0 = sideExtras; sideExtras = function (kind) {
  se0(kind);
  if (kind !== 'rescuepit') return;
  const f = a2F(), r = LV.rooms[LV.leaderRoom]; if (!r) return;
  const free = (i, j) => { for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (tileAt(i + a, j + b) !== FLOOR || LV.solid[tIdx(i + a, j + b)]) return false; return Math.hypot(i - LV.stairs.i, j - LV.stairs.j) > 2.5 && !LV.decor.some(d => d.i === i && d.j === j); };
  const c = []; for (let j = r.y + 1; j < r.y + r.h - 1; j++) for (let i = r.x + 1; i < r.x + r.w - 1; i++) if (free(i, j)) c.push([i, j]);
  if (!c.length) return;
  const en = r.entry || [LV.start.cx, LV.start.cy], lo = c.reduce((m, p) => p[0] - p[1] < m[0] - m[1] ? p : m), hi = c.reduce((m, p) => p[0] - p[1] > m[0] - m[1] ? p : m);
  const [i, j] = Math.hypot(lo[0] - en[0], lo[1] - en[1]) > Math.hypot(hi[0] - en[0], hi[1] - en[1]) ? lo : hi;
  LV.decor.push({ kind: 'cage', i, j, open: !!f.a2rennFree }); LV.solid[tIdx(i, j)] = 1;
  if (!f.a2rennFree && a2On()) {
    LV.npcs.push({ role: 'renn', name: 'FOREMAN RENN', fi: i + 0.5, fj: j + 0.5, caged: true, busy: true });
    for (const [a, b] of [[1.3, -0.4], [-0.4, 1.3]]) if (!LV.solid[tIdx(Math.floor(i + 0.5 + a), Math.floor(j + 0.5 + b))]) LV.npcs.push({ role: 'miner', fi: i + 0.5 + a, fj: j + 0.5 + b, busy: true });
  }
}; }
{ const qk0 = questKill; questKill = function (id) {
  qk0(id);
  if (!a2On()) return;
  const f = a2F();
  if (id === 'pitenforcer' && !f.a2enforcer) { f.a2enforcer = true; say('THE WAY OUT IS CLEAR. FREE RENN', 51, 3.5); }
  if (id === 'blackwarden') a2Got('ledger', 'THE BURIAL LEDGER (FOR SISTER EDDA)');
  saveGame();
}; }
// a named cache gives up what someone asked for
{ const oc0 = openChest; openChest = function (p) {
  const was = p.open; oc0(p);
  if (was || !a2On() || !LV.cacheAt) return;
  const C = LV.cacheAt["Tamsin's ore"]; if (C && C[0] === p.i && C[1] === p.j) a2Got('ore', "TAMSIN'S ORE");
}; }

// ---------------------------------------------------------------- the way on, the arrow, the level's own additions
function exitBarred() {
  if (!LV.regGate || LV.regGate.open) return false;
  if (!(G.sealT > 0)) { say(a2F().a2rennFree ? 'RENN WILL WIND THE GATE UP. SPEAK TO HIM' : 'THE HAUL GATE IS SHUT. ONLY THE FOREMAN CAN WIND IT UP', 22, 3); G.sealT = 3; }
  return true;
}
function exitSkip() { return LV.reg === 'flank' ? 3 : 1; }   // the Flank's road on is the next act's (levels 9 and 10 of the old cycle are not used)
{ const sl0 = startLevel; startLevel = function (...a) {
  const r = sl0(...a);
  if (!a2On()) return r;
  const f = a2F();
  if (LV.reg === 'ashford' && !LV.side && f.a2rennFree && !f.a2gate && LV.regGate) {   // Renn waits at the gate he will open
    const p = [LV.regGate.p[0] - 2.2, LV.regGate.p[1] + 0.8];
    npcs.push({ role: 'renn', name: 'FOREMAN RENN', fam: 'hero', look: NPC_LOOKS.renn, fi: p[0], fj: p[1], home: p.slice(), dir: 5, clip: 'idle', clock: 0, walk: 0, wait: 99, target: null, npc: true });
  }
  return r;
}; }
{ const tg0 = storyTarget; storyTarget = function () {
  if (!a2On()) return tg0();
  if (portalHome()) { if (G.tp && !G.tp.back) return [G.tp.fi, G.tp.fj]; return null; }
  const st = a2Stage(), npc = r => { const n = npcs.find(n => n.role === r); if (!n) return null; const p = [n.fi, n.fj]; p.npc = true; return p; };
  const stairs = () => LV.stairs ? [LV.stairs.i + 0.5, LV.stairs.j + 0.5] : null, bossAt = () => boss && alive(boss) ? [boss.fi, boss.fj] : null;
  if (LV.side === 'rescuepit') return st === 'a2pit' ? bossAt() || stairs() : st === 'a2cage' ? npc('renn') || stairs() : stairs();
  if (LV.side) return bossAt() && LV.side !== 'blackwake' ? bossAt() : stairs();
  if (LV.reg === 'ashford') {
    if (st === 'a2meet' || st === 'a2back') return npc('mara');
    if (st === 'a2pit' || st === 'a2cage') return SIDES.rescuepit.door();
    if (st === 'a2haul') return npc('renn') || (LV.regGate ? LV.regGate.p : stairs());
    return stairs();
  }
  return stairs();
}; }
// in town the one with your next step speaks up when you come near (as in the Hollow's camp)
{ const us0 = updateStory; updateStory = function (dt) {
  us0(dt);
  if (!a2On()) return;
  const st = a2Stage();
  if (LV.reg === 'ashford' && !LV.side && campStep(st) && G.mode === 'play' && !G.talk && !G.fadeTo && !hero.dead && !(G.actCard > 0) && G.t > (G.a2TalkT || 0)) {
    const n = npcs.find(n => n.role === CAMP_ROLE[st]);
    if (n && Math.hypot(n.fi - hero.fi, n.fj - hero.fj) < 3.2 && !foesNear()) { G.a2TalkT = G.t + 6; talkTo(n); }
  }
}; }

// ================================================================ the bosses (bosses.js: warnings, hazards, the rage)
// New hazards: a boulder falling on its marked circle, a bolt flying its marked lane.
{ const tb0 = tickBossFx; tickBossFx = function (dt) {
  for (const f of bossFx) {
    if (f.kind === 'shot' && !f.hit && f.t > 0) { const u = Math.min(1, f.t / f.dur), p = [f.a[0] + (f.b[0] - f.a[0]) * u, f.a[1] + (f.b[1] - f.a[1]) * u]; f.p = p; if (Math.hypot(hero.fi - p[0], hero.fj - p[1]) < 0.6) { f.hit = true; hitHero(f.src, f.k || 1.2, 0.2); } }
  }
  tb0(dt);
}; }
{ const db0 = drawBossFx2; drawBossFx2 = function () {
  db0();
  for (const f of bossFx) {
    if (f.kind === 'rock') {   // falling: a grey boulder coming down on its circle
      const [x, y] = scrAt(f.c[0], f.c[1]), z = Math.round((1 - Math.min(1, f.t / f.dur)) * 130);
      for (let yy = -5; yy <= 5; yy++) for (let xx = -6; xx <= 6; xx++) { const q = (xx * xx) / 36 + (yy * yy) / 25; if (q <= 1) scrPx(x + xx, y - z - 6 + yy, (q > 0.75 ? K1 : xx + yy < -3 ? S[6] : xx + yy > 4 ? S[3] : S[4]) | EMIS); }
    }
    if (f.kind === 'shot' && f.p && !f.hit) {   // a crossbow bolt
      const [x, y] = scrAt(f.p[0], f.p[1]), [x2, y2] = scrAt(f.p[0] - (f.b[0] - f.a[0]) * 0.06, f.p[1] - (f.b[1] - f.a[1]) * 0.06);
      for (let s = 0; s <= 6; s++) scrPx(x + (x2 - x) * s / 6, y - 11 + (y2 - y) * s / 6, (s < 2 ? 31 : 26) | EMIS);
    }
  }
}; }

// ---------------------------------------------------------------- THE PIT ENFORCER (the Rescue Pit)
// CLEAVER SLAM: a circle on you, the cleaver comes down in it (three in a row, each on where you stand, when enraged).
// SHOULDER CHARGE: a wide lane; he ends it winded. CAVE-IN: he bellows and the roof comes down in marked circles.
function updateEnforcer(e, dt, d, dx, dy) {
  const p2 = e.phase === 2;
  if (e.phase === 1 && e.hp < e.maxHp * 0.5 && !e.mv) { enrage(e, 'THE ENFORCER BELLOWS FOR HIS DIGGERS', () => summonAround(e, 'digger', 4, [e.fi, e.fj], 4, 7)); return true; }
  e.special -= dt;
  if (e.stunT > 0) { e.stunT -= dt; e.clip = 'hit'; e.atk = -1; return true; }
  if (e.mv) {
    const M = e.mv; M.t += dt;
    if (M.kind === 'slam') {
      e.clip = 'attack'; e.dir = dirFrom(hero.fi - e.fi, hero.fj - e.fj);
      let pending = false;
      for (const w of M.warn) {
        if (!w.c && M.t >= w.t0) { w.c = heroAt(); sfx('swing', 0.6); }   // each slam marks where you stand as it starts
        if (w.c && !w.hit && M.t >= w.t0 + w.dur) { w.hit = true; blast(e, w.c, w.R, 1.9); bossFx.push({ kind: 'wave', fi: w.c[0], fj: w.c[1], t: 0, dur: 0.4 }); }
        if (!w.hit) pending = true;
      }
      const cur = M.warn.find(w => w.c && !w.hit); e.atk = cur ? Math.min(250, (M.t - cur.t0) / cur.dur * 250) : 380;
      if (!pending) { e.mv = null; e.atk = -1; e.special = p2 ? 1.6 : 2.4; }
      return true;
    }
    if (M.kind === 'charge') {
      const W = M.warn[0]; e.dir = dirFrom(W.b[0] - W.a[0], W.b[1] - W.a[1]);
      if (M.t < M.wind) { e.clip = 'attack'; e.atk = 0; return true; }
      const l = Math.hypot(W.b[0] - W.a[0], W.b[1] - W.a[1]), u = (M.t - M.wind) / (l / 11);
      if (u < 1) { tryMove(e, W.a[0] + (W.b[0] - W.a[0]) * u - e.fi, W.a[1] + (W.b[1] - W.a[1]) * u - e.fj, 0.4); e.clip = 'walk'; e.walk += dt * 14; if (!M.hit && Math.hypot(hero.fi - e.fi, hero.fj - e.fj) < 1.3) { M.hit = true; hitHero(e, 1.9, 0.5); const k = 1.8 / (Math.hypot(hero.fi - e.fi, hero.fj - e.fj) || 1); tryMove(hero, (hero.fi - e.fi) * k, (hero.fj - e.fj) * k, 0.3); } return true; }
      e.mv = null; e.atk = -1; e.special = p2 ? 1.6 : 2.4; e.stunT = M.hit ? 0.5 : 1.3; if (!M.hit) floater('WINDED', e.fi, e.fj, e.def.chest + 30, 51);
      return true;
    }
    if (M.kind === 'cavein') {
      e.clip = M.t < 0.6 ? 'attack' : 'idle'; e.atk = M.t < 0.6 ? 0 : -1; e.dir = dirFrom(hero.fi - e.fi, hero.fj - e.fj);
      for (const w of M.warn) {
        if (!w.fall && M.t >= w.t0 + w.dur - 0.35) { w.fall = true; bossFx.push({ kind: 'rock', c: w.c, t: 0, dur: 0.35 }); }
        if (!w.hit && M.t >= w.t0 + w.dur) { w.hit = true; blast(e, w.c, w.R, 1.2); const [x, y] = iso(w.c[0], w.c[1]); burst(5, x, y, 4, 14, 70, S[5]); }
      }
      if (M.warn.every(w => w.hit)) { e.mv = null; e.special = p2 ? 1.8 : 2.6; }
      return true;
    }
  }
  if (e.special > 0 || d > 12 || !los(e.fi, e.fj, hero.fi, hero.fj)) return false;
  const m = ++e.moves % 3, l0 = Math.hypot(dx, dy) || 1;
  if (m === 1) { const n = p2 ? 3 : 1, warn = []; for (let k = 0; k < n; k++) warn.push({ k: 'disc', c: null, R: 1.7, t0: k * 0.8, dur: k ? 0.7 : 0.9 }); warn[0].c = heroAt(); e.mv = { kind: 'slam', t: 0, wind: 0.9, warn }; sfx('growl'); }
  else if (m === 2) { const l = laneEnd(e, dx / l0, dy / l0, 10); e.mv = { kind: 'charge', t: 0, wind: p2 ? 0.65 : 0.8, warn: [{ k: 'lane', a: [e.fi, e.fj], b: [e.fi + dx / l0 * l, e.fj + dy / l0 * l], w: 0.8 }] }; sfx('growl'); }
  else {   // the roof: one on you, the rest scattered round the two of you
    const n = p2 ? 8 : 5, warn = [];
    for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, r = k ? 1.5 + Math.random() * 3.5 : 0, c = [hero.fi + Math.cos(a) * r, hero.fj + Math.sin(a) * r]; if (k && !standable(c[0], c[1], 0.3)) continue; warn.push({ k: 'disc', c, R: 1.1, t0: 0.5 + k * 0.16, dur: 0.85 }); }
    e.mv = { kind: 'cavein', t: 0, wind: 0.85, warn }; say('THE ROOF IS COMING DOWN', 22, 1.6); sfx('cry'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.4);
  }
  e.atk = -1; return true;
}
// ---------------------------------------------------------------- THE BLACKWAKE WARDEN (the optional tomb)
// SHIELD RUSH: a lane behind the tower shield. BOLT VOLLEY: his crossbowmen in the walls loose down marked lanes
// (three, five when enraged). THE LEDGER: the named dead rise in marked circles.
function updateWarden(e, dt, d, dx, dy) {
  const p2 = e.phase === 2;
  if (e.phase === 1 && e.hp < e.maxHp * 0.5 && !e.mv) { enrage(e, 'THE WARDEN OPENS THE LEDGER'); return true; }
  e.special -= dt;
  if (e.mv) {
    const M = e.mv; M.t += dt;
    if (M.kind === 'rush') {
      const W = M.warn[0]; e.dir = dirFrom(W.b[0] - W.a[0], W.b[1] - W.a[1]);
      if (M.t < M.wind) { e.clip = 'attack'; e.atk = 0; return true; }
      const l = Math.hypot(W.b[0] - W.a[0], W.b[1] - W.a[1]), u = (M.t - M.wind) / (l / 10);
      if (u < 1) { tryMove(e, W.a[0] + (W.b[0] - W.a[0]) * u - e.fi, W.a[1] + (W.b[1] - W.a[1]) * u - e.fj, 0.4); e.clip = 'walk'; e.walk += dt * 13; if (!M.hit && Math.hypot(hero.fi - e.fi, hero.fj - e.fj) < 1.2) { M.hit = true; hitHero(e, 1.8, 0.45); const k = 1.4 / (Math.hypot(hero.fi - e.fi, hero.fj - e.fj) || 1); tryMove(hero, (hero.fi - e.fi) * k, (hero.fj - e.fj) * k, 0.3); } return true; }
      e.mv = null; e.atk = -1; e.special = p2 ? 1.5 : 2.3; return true;
    }
    if (M.kind === 'volley') {
      e.clip = 'idle'; e.atk = -1; e.dir = dirFrom(hero.fi - e.fi, hero.fj - e.fj);
      if (M.t >= M.wind && !M.fired) { M.fired = true; sfx('arrow'); for (const w of M.warn) bossFx.push({ kind: 'shot', src: e, a: w.a, b: w.b, t: 0, dur: Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) / 16 + 0.01, k: 1.3 }); }
      if (M.t > M.wind + 0.7) { e.mv = null; e.special = p2 ? 1.4 : 2.2; }
      return true;
    }
    if (M.kind === 'ledger') {
      e.clip = 'attack'; e.atk = 0;
      for (const w of M.warn) if (!w.up && M.t >= w.dur) { w.up = true; if (Math.hypot(hero.fi - w.c[0], hero.fj - w.c[1]) < w.R) hitHero(e, 0.9, 0.2); if (standable(w.c[0], w.c[1], 0.3) && called(e) < (p2 ? 5 : 3)) { const s2 = makeEnemy(w.id, w.c[0], w.c[1], enemies.length, e.lvl); s2.state = 'hunt'; s2.calledBy = e; s2.noLoot = true; enemies.push(s2); } const [x, y] = iso(w.c[0], w.c[1]); burst(5, x, y, 4, 10, 40, 25); sfx('clatter', 0.6); }
      if (M.warn.every(w => w.up)) { e.mv = null; e.atk = -1; e.special = p2 ? 2.0 : 2.8; }
      return true;
    }
  }
  if (e.special > 0 || d > 12 || !los(e.fi, e.fj, hero.fi, hero.fj)) return false;
  const m = ++e.moves % 3, l0 = Math.hypot(dx, dy) || 1, ux = dx / l0, uy = dy / l0;
  if (m === 1) { const l = laneEnd(e, ux, uy, 9); e.mv = { kind: 'rush', t: 0, wind: 0.75, warn: [{ k: 'lane', a: [e.fi, e.fj], b: [e.fi + ux * l, e.fj + uy * l], w: 0.7 }] }; sfx('growl'); }
  else if (m === 2) {   // bolts across the room, through where you stand: from the side walls, so the lanes cross his
    const n = p2 ? 5 : 3, nx = -uy, ny = ux, warn = [];
    for (let k = 0; k < n; k++) { const o = (k - (n - 1) / 2) * 1.5, c = [hero.fi + ux * o, hero.fj + uy * o]; let a = 9, b = 9; for (let s = 0.5; s <= 9; s += 0.25) { if (a === 9 && !standable(c[0] - nx * s, c[1] - ny * s, 0.2)) a = s - 0.3; if (b === 9 && !standable(c[0] + nx * s, c[1] + ny * s, 0.2)) b = s - 0.3; } warn.push(k % 2 ? { k: 'lane', a: [c[0] + nx * b, c[1] + ny * b], b: [c[0] - nx * a, c[1] - ny * a], w: 0.35 } : { k: 'lane', a: [c[0] - nx * a, c[1] - ny * a], b: [c[0] + nx * b, c[1] + ny * b], w: 0.35 }); }
    e.mv = { kind: 'volley', t: 0, wind: 0.9, warn }; say('LOOSE!', 22, 1); sfx('swing');
  } else { const n = p2 ? 3 : 2, warn = []; for (let k = 0; k < n; k++) { const a = k / n * 6.283 + Math.random(); warn.push({ k: 'disc', c: [hero.fi + Math.cos(a) * 2.6, hero.fj + Math.sin(a) * 2.6], R: 0.9, dur: 1.0, id: k === 2 ? 'tombguard' : 'gravebow' }); } e.mv = { kind: 'ledger', t: 0, wind: 1.0, warn }; say('THE WARDEN READS A NAME', 26, 1.5); sfx('cry'); }
  e.atk = -1; return true;
}
Object.assign(BOSS_UPDATE, { pitenforcer: (...a) => updateEnforcer(...a), blackwarden: (...a) => updateWarden(...a) });
