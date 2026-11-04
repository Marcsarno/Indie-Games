'use strict';
// Quests and side areas (round 26). Brother Osric at the cathedral steps hands out the Act I
// quests the first time you speak to him. Each has steps (kill so many of something, then its
// leader), a line in the tracker at the top left, and a reward when you go back to him: gold,
// experience and one rare item. Two of the leaders live in side areas: short generated floors
// entered from the hub (the wolf den in the west woods, the cellar under the farmhouse). Leaving
// one puts you back at its door with the hub as you left it.

// Round 42b: the Act I story as one chain. Each step unlocks the next and leaves a mark on the
// camp; people other than Osric give quests; a dialogue box with ACCEPT or COLLECT (pick one of
// three rewards); a marker at the screen edge points at the next goal.
//   Osric (the graves were dug up; Aldo the woodcutter is missing) -> Wren, his daughter, at the
//   tents -> the wolf den: the Alpha, then the cage -> back to Wren; Aldo tells of a hooded man with
//   a green lantern at the mine (his wood keeps the campfire: rest by it to heal) -> the mine is
//   chained -> Hollis the farmer: the bandits took his farm and the key -> four bandits, their chief
//   in the cellar (sacks of bones; he drops the key and a letter signed M.) -> back to Hollis
//   (potions cheaper, he goes home to his hay cart) -> Osric reads the letter and knows the hand:
//   Maelis -> unlock the mine -> the King -> back to Osric.
// G.story = { f: { flags }, n: bandits killed }. The stage is worked out from the flags, so things
// done out of order (the Alpha killed before Wren asks) still count.
const STORY_NAMES = { woodcutter: 'THE MISSING WOODCUTTER', farm: 'THE STOLEN FARM', king: 'THE KING BELOW' };
function storyF() { if (!G.story) G.story = { f: {}, n: 0 }; return G.story.f; }
const storyOn = () => LV.act === 0 && !(LV.loop > 0);   // the story is Act I's, first time through
const mineOpen = () => { const f = storyF(); return !!(f.mineOpen || f.kingDead || (G.gates && G.gates[0]) || LV.loop > 0); };
function storyStage() {
  const f = storyF();
  if (G.gates && G.gates[0]) f.kingDead = true;
  if (!f.met) return 'meet';
  if (!f.woodTold && !f.aldoFree) return 'wren';
  if (!f.aldoFree) return f.alphaDead ? 'cage' : 'den';
  if (!f.woodPaid) return 'aldoBack';
  if (!f.sawChain && !f.farmTold && !f.chiefDead) return 'mine';
  if (!f.farmTold && !f.chiefDead) return 'hollis';
  if (!f.chiefDead) return (G.story.n || 0) >= 4 ? 'cellar' : 'farm';
  if (!f.farmPaid) return 'farmBack';
  if (!f.letterRead) return 'letter';
  if (!f.mineOpen && !f.kingDead) return 'unlock';
  if (!f.kingDead) return 'king';
  if (!f.kingPaid) return 'kingBack';
  return 'done';
}
const STAGE_QUEST = { wren: 'woodcutter', den: 'woodcutter', cage: 'woodcutter', aldoBack: 'woodcutter', mine: 'woodcutter', hollis: 'farm', farm: 'farm', cellar: 'farm', farmBack: 'farm', letter: 'king', unlock: 'king', king: 'king', kingBack: 'king' };
function stageText(st) {
  return { meet: 'SPEAK TO BROTHER OSRIC', wren: 'TALK TO WREN BY THE TENTS', den: 'FIND ALDO IN THE WOLF DEN (WEST)', cage: 'FREE ALDO', aldoBack: 'RETURN TO WREN',
    mine: 'LOOK AT THE OLD MINE (NORTH)', hollis: 'ASK HOLLIS ABOUT THE CHAINS', farm: `DRIVE THE BANDITS FROM THE FARM ${Math.min(4, G.story.n || 0)}/4`, cellar: 'FIND THEIR CHIEF IN THE CELLAR',
    farmBack: 'RETURN TO HOLLIS', letter: 'SHOW THE LETTER TO BROTHER OSRIC', unlock: 'UNLOCK THE OLD MINE (NORTH)', king: 'PUT THE KING TO REST, BELOW THE MINE', kingBack: 'RETURN TO BROTHER OSRIC' }[st] || '';
}
// who has something to say right now: '!' (a new task or news) or '?' (come back for a reward)
function storyMark(role) {
  if (!storyOn()) return null;
  const st = storyStage();
  if (role === 'priest') return st === 'meet' || st === 'letter' ? '!' : st === 'kingBack' ? '?' : null;
  if (role === 'wren') return st === 'wren' ? '!' : st === 'aldoBack' ? '?' : null;
  if (role === 'hollis') return st === 'hollis' ? '!' : st === 'farmBack' ? '?' : null;
  return null;
}
function questKill(id) {
  if (!storyOn()) return;
  const f = storyF();
  if (id === 'alpha' && !f.alphaDead) { f.alphaDead = true; if (!f.aldoFree) say('THE ALPHA IS DEAD. FREE ALDO', 51, 3); }
  if (id === 'brigand' && f.farmTold && !f.chiefDead) { G.story.n = (G.story.n || 0) + 1; if (G.story.n === 4) say('THE FARM IS CLEAR. THEIR CHIEF IS IN THE CELLAR', 51, 3); }
  if (id === 'banditchief' && !f.chiefDead) { f.chiefDead = true; say('THE CHIEF DROPS THE MINE KEY', 51, 3.5); say('AND A LETTER, SIGNED M.', 51, 3.5); sfx('levelUp'); }
  saveGame();
}
// ---------------------------------------------------------------- the dialogue box
// G.talk = { pages: [[who, text]], k, btn: 'ACCEPT' | 'COLLECT' | null, on: fn, reward: [items] }
// Round 47: everything on one screen, shown at once: each speaker's lines, then the reward choice
// (if any) and the button. One tap on the button (or anywhere, when there's nothing to choose) ends it.
function openTalk(pages, btn = null, on = null, reward = null) {
  G.talk = { pages, k: pages.length - 1, t: 99, typed: true, btn, on, reward, pick: reward ? -1 : null }; G.mode = 'talk'; clearInput(); sfx('tap');
}
// the lines of the whole talk: [text, color] with a name line wherever the speaker changes
function talkLines() {
  const T = G.talk, out = []; let prev = null;
  for (const [who, say_] of T.pages) {
    if (who !== prev) { if (prev !== null) out.push(['', 0]); out.push([who, 51]); prev = who; }
    for (const l of wrapText(say_, 60)) out.push([l, 26]);
  }
  return out;
}
function talkLayout() {
  const T = G.talk, lines = talkLines(), textH = 14 + lines.length * 8, h = Math.min(H - 40, textH + (T.reward ? 96 : 0) + 30), y = H - h - 8;
  const L = { box: { x: 6, y, w: W - 12, h }, btn: null, cards: [], lines };
  if (T.reward) T.reward.forEach((it, n) => L.cards.push({ x: 12 + n * 84, y: y + textH + 14, w: 78, h: 56, it }));
  L.btn = { x: W / 2 - 40, y: y + h - 24, w: 80, h: 18 };
  return L;
}
function drawTalk() {
  const T = G.talk; if (!T) return;
  fade(0.35);
  const L = talkLayout(), b = L.box;
  fillRect(b.x, b.y, b.w, b.h, 2); frame(b.x, b.y, b.w, b.h, 8, 3); frame(b.x + 2, b.y + 2, b.w - 4, b.h - 4, 5, 2);
  L.lines.forEach(([l, c], n) => { if (l) text(l, b.x + 8, b.y + 7 + n * 8, c); });
  if (L.cards.length) {
    textC(T.pick >= 0 ? 'TAP ' + (T.btn || 'COLLECT') + ' TO TAKE IT' : 'CHOOSE ONE', W / 2, L.cards[0].y - 9, 25);
    for (const [n, c] of L.cards.entries()) {
      const it = c.it, on = T.pick === n;
      fillRect(c.x, c.y, c.w, c.h, on ? 5 : 4); frame(c.x, c.y, c.w, c.h, on ? 51 : RARITY_COL[it.rarity], 3);
      sprite(itemIcon(it), c.x + c.w / 2, c.y + 24, 1, 4);
      const nm = wrapText(itemName(it), 18); nm.slice(0, 2).forEach((l, k) => textC(l, c.x + c.w / 2, c.y + 32 + k * 7, RARITY_COL[it.rarity]));
      textC(ITEM_BASES[it.base].slot === 'shield' ? 'OFF HAND' : ITEM_BASES[it.base].slot.toUpperCase(), c.x + c.w / 2, c.y + 48, 24);
    }
    if (T.pick >= 0) itemLines(T.reward[T.pick]).slice(0, 2).forEach((l, n) => textC(l, W / 2, L.cards[0].y + 60 + n * 7, 25));
  }
  const ok = !T.reward || T.pick >= 0, r = L.btn;
  fillRect(r.x, r.y, r.w, r.h, ok ? 5 : 3); frame(r.x, r.y, r.w, r.h, ok ? 51 : 6, 2); textC(T.btn || 'OK', r.x + r.w / 2, r.y + 6, ok ? 27 : 24);
}
function talkTap(p) {
  const T = G.talk; if (!T) return;
  const L = talkLayout();
  for (const [n, c] of L.cards.entries()) if (inRect(p, c)) { T.pick = n; sfx('tap'); return; }
  if (T.reward && T.pick < 0) return;
  if (T.reward && !inRect(p, L.btn)) return;   // with a choice on screen, only the button takes it
  closeTalk();
}
function closeTalk() {
  const T = G.talk; G.talk = null; G.mode = 'play';
  if (T.reward) { const it = T.reward[T.pick]; if (hero.bag.length < BAG_SIZE) { hero.bag.push(it); if (!hero.equip[ITEM_BASES[it.base].slot]) equipItem(it); } else groundItems.push({ item: it, fi: hero.fi + 0.6, fj: hero.fj + 0.6, t: 0 }); say(itemName(it), RARITY_COL[it.rarity], 2.5); }
  if (T.on) T.on();
  saveGame();
}
// three rewards from different slots, rare or better, a level above the area
function rewardChoice() {   // round 47: magic items at the area's level (rares made the game too easy too soon)
  const R = rng((Math.random() * 1e9) | 0), out = [], used = {};
  for (let t = 0; t < 400 && out.length < 3; t++) {
    const it = rollItem(R, LV.diff); if (it.rarity !== 'magic') continue;
    const sl = ITEM_BASES[it.base].slot; if (used[sl] || sl === 'potion') continue; used[sl] = 1; out.push(it);
  }
  while (out.length < 3) { const it = rollItem(R, LV.diff); if (it.rarity !== 'legend' && ITEM_BASES[it.base].slot !== 'potion') out.push(it); }
  return out;
}
function payQuest(id) {
  const gold = 60 * LV.diff, xp = 140 * LV.diff;
  hero.gold += gold; gainXp(xp); sfx('gold');
  say(`${STORY_NAMES[id]}: DONE`, 51, 3); say(`+${gold} GOLD, +${xp} XP`, 51, 3);
}
// ---------------------------------------------------------------- what each person says
function talkTo(n) {
  const f = storyF(), st = storyStage(), on = storyOn();
  const O = 'BROTHER OSRIC', Wn = 'WREN', Ho = 'HOLLIS', Al = 'ALDO';
  if (n.role === 'priest') {
    if (!on) return openTalk([[O, LV.gateOpen ? 'THE ROAD SOUTH IS OPEN. GO WITH THE LIGHT.' : 'THE LIGHT KEEPS YOU.']]);
    if (st === 'meet') return openTalk([
      [O, 'GOD BE THANKED, A BLADE. I AM OSRIC. THIS CAMP IS ALL THAT IS LEFT OF OAKHOLLOW.'],
      [O, 'THE DEAD WALK HERE. AND THE GRAVES BEHIND MY CHURCH WERE NOT CLAWED OPEN FROM BELOW. THEY WERE DUG, WITH SPADES.'],
      [O, 'ALDO THE WOODCUTTER WENT INTO THE WEST WOODS THREE DAYS AGO AND DID NOT COME BACK. HIS DAUGHTER WREN WAITS BY THE TENTS. SPEAK TO HER.']], 'OK', () => { f.met = true; });
    if (st === 'letter') return openTalk([
      [O, 'A LETTER? LET ME SEE.'],
      [O, '"EVERY BONE YOU BRING IS PAID IN SILVER. THE KING MUST BE WHOLE. - M."'],
      [O, 'I KNOW THIS HAND. MAELIS. HE WAS A BROTHER OF MY ORDER, UNTIL WE CAST HIM OUT FOR THE BOOKS HE READ. I SHOULD HAVE BURNED THEM MYSELF.'],
      [O, 'HE IS RAISING THE OLD KING UNDER THE MINE. TAKE THE KEY. PUT THE KING BACK IN HIS GRAVE, AND FIND MAELIS IF YOU CAN.']], 'ACCEPT', () => { f.letterRead = true; });
    if (st === 'kingBack') return openTalk([
      [O, 'THE KING IS DUST AGAIN. I FELT IT, LIKE A WINDOW OPENED IN A SICKROOM.'],
      [O, 'BUT MAELIS IS NOT FINISHED. THE ROAD SOUTH IS OPEN NOW, AND THAT IS THE WAY HE WENT. TAKE THIS, AND MY THANKS.']], 'COLLECT', () => { f.kingPaid = true; payQuest('king'); }, rewardChoice());
    const hint = { wren: 'WREN IS BY THE TENTS. SHE NEEDS YOU MORE THAN I DO.', den: 'THE DEN IS IN THE WEST WOODS. GO CAREFULLY.', cage: 'THE DEN IS IN THE WEST WOODS. GO CAREFULLY.', aldoBack: 'WREN WILL WANT TO KNOW.', mine: 'ALDO SAW SOMEONE AT THE MINE? THEN LOOK THERE.', hollis: 'HOLLIS SITS BY THE FIRE. HE LOST HIS FARM TO THE BANDITS.', farm: 'THE FARM IS EAST, PAST THE GATE.', cellar: 'THE FARM IS EAST, PAST THE GATE.', farmBack: 'HOLLIS WILL WANT TO KNOW.', unlock: 'THE MINE IS NORTH. THE LIGHT GOES WITH YOU.', king: 'THE MINE IS NORTH. THE LIGHT GOES WITH YOU.' }[st];
    return openTalk([[O, hint || 'THE LIGHT KEEPS YOU.']]);
  }
  if (n.role === 'wren') {
    if (on && st === 'meet') return openTalk([[Wn, 'BROTHER OSRIC IS ON THE CHURCH STEPS. SPEAK TO HIM FIRST, PLEASE.']]);
    if (on && st === 'wren') return openTalk([
      [Wn, 'YOU ARE THE ONE OSRIC SENT? MY FATHER IS ALDO. HE WENT TO CUT WOOD IN THE WEST WOODS AND NEVER CAME HOME.'],
      [Wn, 'THE WOLVES HAVE BEEN WRONG ALL MONTH. THEY HOWL IN DAYLIGHT. HE SAID THEY HAD A DEN PAST THE OLD TREES.'],
      [Wn, 'PLEASE. BRING HIM BACK.']], 'ACCEPT', () => { f.woodTold = true; });
    if (on && st === 'aldoBack') return openTalk([
      [Wn, 'FATHER! YOU BROUGHT HIM BACK!'],
      [Al, 'THEY HAD ME IN A CAGE. A CAGE, LIKE A HEN FOR THE POT. WOLVES DO NOT BUILD CAGES.'],
      [Al, 'AND THEY WERE NOT HUNTING. THEY WERE RUNNING. SOMETHING IN THE NORTH HILLS DROVE THEM OUT.'],
      [Al, 'BEFORE THEY TOOK ME I SAW A HOODED MAN AT THE OLD MINE, WITH A LANTERN THAT BURNED GREEN. LOOK THERE.'],
      [Wn, 'TAKE SOMETHING. AND FATHER WILL KEEP THE CAMPFIRE HIGH: REST BY IT AND IT WILL MEND YOU.']], 'COLLECT', () => { f.woodPaid = true; payQuest('woodcutter'); say('REST BY THE CAMPFIRE TO HEAL', 26, 3); }, rewardChoice());
    return openTalk([[Wn, f.aldoFree ? 'FATHER IS HOME. I CAN SLEEP AGAIN.' : 'PLEASE FIND HIM.']]);
  }
  if (n.role === 'aldo') {   // in the den's cage, or at home by his woodpile
    if (LV.side === 'den') {
      if (!f.alphaDead) return openTalk([[Al, 'BEHIND YOU! THE BIG ONE! KILL IT FIRST, THEN GET ME OUT OF HERE!']]);
      return openTalk([[Al, 'YOU KILLED IT? BLESS YOU. BREAK THE LOCK, QUICK.'], [Al, 'I KNOW THE WAY HOME. TELL WREN I AM COMING.']], 'OK', () => freeAldo(n));
    }
    return openTalk([[Al, st === 'mine' ? 'THE OLD MINE, NORTH. THAT IS WHERE I SAW HIM. GREEN FIRE.' : 'THE FIRE IS HIGH. SIT A WHILE.']]);
  }
  if (n.role === 'hollis') {
    if (on && (st === 'hollis' || (st === 'mine' && f.sawChain))) return openTalk([
      [Ho, 'CHAINS ON THE MINE? THAT IS THE BANDITS. THEY TOOK MY FARM A WEEK AGO AND PUT ME OUT IN MY NIGHTSHIRT.'],
      [Ho, 'EVERY NIGHT THEY HAUL SACKS IN AND OUT OF MY CELLAR. HEAVY SACKS. I DO NOT WANT TO KNOW WHAT IS IN THEM.'],
      [Ho, 'THEIR CHIEF WEARS THE MINE KEY ON HIS BELT. THE FARM IS EAST, OUT THE GATE. GET IT BACK FOR ME?']], 'ACCEPT', () => { f.farmTold = true; G.story.n = 0; });
    if (on && st === 'farmBack') return openTalk([
      [Ho, 'BONES? MY CELLAR FULL OF BONES. FROM THE GRAVEYARD. GOD HAVE MERCY.'],
      [Ho, 'I AM GOING HOME ALL THE SAME. AND THE POTION WAGON WILL HAVE FRESH HERBS FROM MY FIELDS: POTIONS COST LESS NOW.'],
      [Ho, 'THAT LETTER THE CHIEF HAD. SHOW IT TO BROTHER OSRIC. HE READS BETTER THAN ME.']], 'COLLECT', () => { f.farmPaid = true; payQuest('farm'); }, rewardChoice());
    return openTalk([[Ho, f.farmPaid ? 'THE FIELDS WILL TAKE A YEAR TO COME BACK. BUT THEY WILL COME BACK.' : 'I HAD A FARM, ONCE. EAST OF HERE.']]);
  }
}
// round 42b: Aldo runs home from the den; the cage door hangs open
function freeAldo(n) {
  const f = storyF(); f.aldoFree = true;
  for (const p of dynProps) if (p.kind === 'cage') p.open = true;
  n.leaving = 1.2; sfx('chest'); say('ALDO IS FREE. RETURN TO WREN', 51, 3);
}
// ---------------------------------------------------------------- the camp and the mine
function updateStory(dt) {
  if (!storyOn()) return;
  const f = storyF();
  // Aldo leaves the den: he walks off and fades
  for (let k = npcs.length - 1; k >= 0; k--) { const n = npcs[k]; if (n.leaving === undefined) continue; n.leaving -= dt; n.clip = 'walk'; n.walk += dt * 8; tryMove(n, dt * 1.5, -dt * 1.5, 0.2); if (n.leaving <= 0) npcs.splice(k, 1); }
  if (LV.side === 'cellar' && !f.cellarSeen) { f.cellarSeen = true; say('SACKS OF BONES, STACKED TO THE ROOF.', 26, 4); say('THE GRAVES WERE DUG FOR THIS.', 26, 4); }
  if (!LV.hub) return;
  // Aldo's wood feeds the fire: resting by it mends life and mana
  if (f.woodPaid && Math.hypot(hero.fi - HUB.camp[0], hero.fj - HUB.camp[1]) < 3.4 && !hero.dead) {
    const was = hero.hp < STAT.maxHp || hero.mana < STAT.maxMana;
    hero.hp = Math.min(STAT.maxHp, hero.hp + STAT.maxHp * 0.12 * dt); hero.mana = Math.min(STAT.maxMana, hero.mana + STAT.maxMana * 0.12 * dt);
    if (was && Math.random() < dt * 3) { const [x, y] = screenOf(hero); pspawn(5, x + (Math.random() - 0.5) * 12, y - 4, 2 + Math.random() * 20, 0, -18, 0.6, 51); }
  }
}
// the mine's stairs: chained until the chief's key opens them (game.js asks before going down)
function mineBarred() {
  if (!LV.hub || mineOpen()) return false;
  const f = storyF();
  if (f.chiefDead) { unlockMine(); return true; }   // the key turns (round 43b: the chains fall now, the stairs take you next step)
  if (!(G.sealT > 0)) {
    say('THE MINE IS CHAINED SHUT', 22, 2.5); say('THE BANDITS TOOK THE KEY', 26, 2.5); G.sealT = 3;
    if (!f.sawChain && storyOn()) { f.sawChain = true; saveGame(); }
  }
  return true;
}
// round 43b: the action button at the mine: UNLOCK with the chief's key, else LOOK at the chains
function mineAction() {
  if (!LV.hub || !LV.stairs || !LV.stairs.mine || mineOpen()) return null;
  const s = LV.stairs; if (Math.hypot(s.i + 0.5 - hero.fi, s.j + 0.5 - hero.fj) > 2.6) return null;
  return storyF().chiefDead ? { label: 'UNLOCK', go: unlockMine } : { label: 'LOOK', go: () => { G.sealT = 0; mineBarred(); } };
}
// the key turns: the chains fall, and the mine mouth is rebuilt open (what is broken or opened in
// the hub stays so)
function unlockMine() {
  const f = storyF(); if (f.mineOpen) return;
  f.mineOpen = true; sfx('chest'); sfx('stairs'); say('THE KEY TURNS. THE CHAINS FALL AWAY', 51, 3);
  for (const d of LV.decor) if (d.kind === 'minebarred') d.kind = 'mine';
  const keep = dynProps.map(p => ({ open: p.open, broken: p.broken, hp: p.hp, hatch: p.hatch }));
  buildWorld(); keep.forEach((q, n) => { if (dynProps[n]) Object.assign(dynProps[n], q); });
  const s = LV.stairs, [x, y] = iso(s.i + 0.5, s.j + 0.5); for (let k = 0; k < 14; k++) pspawn(5, x + (Math.random() - 0.5) * 20, y - 10, 10 + Math.random() * 20, (Math.random() - 0.5) * 40, -20, 30, 0.6, 30);   // dust and links falling
  saveGame();
}
// where the next goal is, for the marker at the screen's edge: [fi, fj] or null
function storyTarget() {
  if (!storyOn()) return null;
  const st = storyStage(), npc = r => { const n = npcs.find(n => n.role === r); return n ? [n.fi, n.fj] : null; };
  if (LV.side) {
    if (LV.side === 'den' && (st === 'den' || st === 'cage')) { const a = enemies.find(e => e.id === 'alpha' && alive(e)); if (a && LV.seen[tIdx(Math.floor(a.fi), Math.floor(a.fj))]) return [a.fi, a.fj]; const al = npc('aldo'); return al && st === 'cage' ? al : null; }
    if (LV.side === 'cellar' && (st === 'farm' || st === 'cellar')) { const c = enemies.find(e => e.id === 'banditchief' && alive(e)); return c && LV.seen[tIdx(Math.floor(c.fi), Math.floor(c.fj))] ? [c.fi, c.fj] : null; }
    return LV.seen[tIdx(LV.stairs.i, LV.stairs.j)] ? [LV.stairs.i + 0.5, LV.stairs.j + 0.5] : null;   // done here: the way out
  }
  if (!LV.hub) return null;
  const mine = [LV.stairs.i + 0.5, LV.stairs.j + 0.5];
  return { meet: npc('priest'), wren: npc('wren'), aldoBack: npc('wren'), den: SIDES.den.door(), cage: SIDES.den.door(), mine, hollis: npc('hollis'), farm: [HUB.farm[0] + 1, HUB.farm[1] + 2],
    cellar: SIDES.cellar.door(), farmBack: npc('hollis'), letter: npc('priest'), unlock: mine, king: mine, kingBack: npc('priest') }[st] || null;
}
// a rare (or better) item: rerolls until one comes up
function rollRare(R, level) {
  for (let t = 0; t < 80; t++) { const it = rollItem(R, level); if (it.rarity !== 'normal' && it.rarity !== 'magic') return it; }
  return rollItem(R, level);
}
// the tracker: the quest's name, and what to do next in words
function drawQuestTracker() {
  if (G.mode !== 'play' || !storyOn()) return;
  const st = storyStage(); if (st === 'done') return;
  const q = STAGE_QUEST[st];
  if (q) text(STORY_NAMES[q], 4, 68, 24);
  text(stageText(st), 4, q ? 76 : 68, 51);
}
// "!" over someone with news or a task, "?" when a reward waits
function priestMark(n, sx, by) {
  const ch = storyMark(n.role); if (!ch) return false;
  textC(ch, sx, by - 2, 51, 2);
  return true;
}
// old saves (round 26's three quests at once) become the matching place in the chain
function convertQuests(q, gates) {
  const f = {}, done = id => q && q[id] && q[id].done, paid = id => q && q[id] && q[id].paid;
  if (q && Object.keys(q).length) f.met = f.woodTold = true;
  if (done('wolves')) f.alphaDead = f.aldoFree = true;
  if (paid('wolves')) f.woodPaid = f.sawChain = f.farmTold = true;
  if (done('bandits')) { f.woodTold = f.alphaDead = f.aldoFree = f.woodPaid = f.sawChain = f.farmTold = f.chiefDead = f.met = true; }
  if (paid('bandits')) f.farmPaid = f.letterRead = f.mineOpen = true;
  if (done('mine') || (gates && gates[0])) Object.assign(f, { met: true, woodTold: true, alphaDead: true, aldoFree: true, woodPaid: true, sawChain: true, farmTold: true, chiefDead: true, farmPaid: true, letterRead: true, mineOpen: true, kingDead: true, kingPaid: !!paid('mine') });
  return { f, n: 0 };
}

// ---------------------------------------------------------------- the story's props (round 42b)
// Aldo's cage: a square of wooden bars on a frame, roped at the corners, a padlock on the door.
// Drawn in two halves (game.js) so Aldo stands between the back bars and the front ones.
PROPS.cage = (open, half) => propSprite('cage' + (open ? 'o' : '') + half, r => {
  const S = 9, Z = 30, front = p => p[0] + p[1] > 0.5;
  const keep = p => half === 'f' ? front(p) : !front(p);
  const bar = (a, b) => { if (keep(V.mul(V.add(a, b), 0.5))) r.cone(a, b, 0.95, 0.95, M.WOOD); };
  for (const [x0, y0, x1, y1] of [[S, -S, S, S], [-S, -S, -S, S], [-S, -S, S, -S], [-S, S, S, S]]) {   // the four sides
    const isDoor = x0 === S && x1 === S;
    for (let k = 0; k <= 4; k++) {
      const t = k / 4; let x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      if (isDoor && open && k > 0 && k < 4) { const a = 1.25 * (k / 4), d = (y + S); x = S + Math.sin(a) * d; y = -S + Math.cos(a) * d; }   // the door swung out on its hinge
      bar([x, y, 0.5], [x, y, Z]);
    }
    if (keep([(x0 + x1) / 2 + (x0 === x1 ? 0 : 0), (y0 + y1) / 2, 0])) for (const z of [1.2, Z - 0.6]) r.cone([x0, y0, z], [x1, y1, z], 1.2, 1.2, M.BARK);   // rails top and bottom
  }
  if (half === 'f') {
    for (const [x, y] of [[S, S], [S, -S], [-S, S]]) r.sph([x, y, Z - 0.8], 1.5, M.LEATHER);   // rope lashings
    if (!open) r.box([S + 1, 0, 9], [0.8, 1.6, 1.8], M.GOLD, null, { mf: p => p[2] < 8.4 && Math.abs(p[1]) < 0.4 ? M.DARK : 0 });
  }
}, [48, 66, 24, 52], 0);
// sacks of bones from the graveyard: burlap sacks tied at the neck, bones poking out, a skull
PROPS.sacks = v => propSprite('sacks' + v, r => {
  const R = rng(v * 17 + 3);
  for (const [k, [x, y, sc]] of [[-4, -5, 1], [5, -3, 0.9], [-1, 6, 0.95]].entries()) {
    const c = [x, y, 8 * sc], lean = V.norm([(R() - 0.5) * 0.5, (R() - 0.5) * 0.5, 1]);
    r.group(() => { r.ell(c, [6.4 * sc, 6.2 * sc, 8.2 * sc], M.CLOTH_TAN, null, { mf: p => Math.abs((p[2] * 1.1 + p[0] * 0.3) % 3.2) < 0.32 ? M.LEATHER : 0 }); r.cone(V.mad(c, lean, 7 * sc), V.mad(c, lean, 11.5 * sc), 2.6 * sc, 1.6 * sc, M.CLOTH_TAN); });
    r.cyl(V.mad(c, lean, 9 * sc), V.mad(c, lean, 10.2 * sc), 2.4 * sc, M.LEATHER);
    if (k !== v % 3) { const b0 = V.mad(c, lean, 11 * sc), dir = V.norm([R() - 0.5, R() - 0.5, 1]); r.cone(b0, V.mad(b0, dir, 5), 1.0, 1.0, M.BONE); r.sph(V.mad(b0, dir, 5.4), 1.4, M.BONE); }
  }
  skullAt(r, [9, 4, 3.2], V.norm([1, 0.2, 0.15]), [0, 1, 0], [0, 0, 1], M.BONE, M.DARK, 0, 0.8);
  for (const [x, y, a] of [[10, -6, 0.3], [7, 9, 2.0]]) r.cone([x, y, 0.8], [x + Math.cos(a) * 5, y + Math.sin(a) * 5, 0.8], 0.9, 0.9, M.BONE);
}, [60, 56, 30, 40], Math.PI / 4);

// ---------------------------------------------------------------- side areas
// Each is a short floor generated like a dungeon (few rooms), with its own monsters and a leader
// in the farthest room. The way out (stairs up) is in the start room.
const SIDES = {
  den: { name: 'THE WOLF DEN', theme: 'caves', rooms: 5, pool: ['wolf'], boss: 'alpha', door: () => [HUB.den[0] + 1.6, HUB.den[1] + 0.6], label: 'WOLF DEN' },
  cellar: { name: 'THE FARM CELLAR', theme: 'crypt', rooms: 5, pool: ['brigand'], boss: 'banditchief', door: () => HUB.cellar, label: 'FARMHOUSE CELLAR' },
};
// round 42b: what the story adds to a side area once it is built: Aldo's cage near the Alpha,
// the cellar's sacks of bones. A cage tile is one with open floor all round it, so it blocks nothing
function sideExtras(kind) {
  const R = rng(LV.seed ^ 0xca9e), roomFloor = (r, pad) => { const out = []; for (let j = r.y + pad; j < r.y + r.h - pad; j++) for (let i = r.x + pad; i < r.x + r.w - pad; i++) { let ok = true; for (let b = -1; b <= 1 && ok; b++) for (let a = -1; a <= 1 && ok; a++) if (tileAt(i + a, j + b) !== FLOOR || LV.solid[tIdx(i + a, j + b)]) ok = false; if (ok) out.push([i, j]); } return out; };
  const clearOf = (i, j) => Math.hypot(i - LV.stairs.i, j - LV.stairs.j) > 2.5 && !LV.decor.some(d => d.i === i && d.j === j) && !LV.spawns.some(s => Math.hypot(s.fi - i - 0.5, s.fj - j - 0.5) < 1.6);
  if (kind === 'den') {
    const f = storyF(), r = LV.rooms[LV.leaderRoom];
    let c = roomFloor(r, 1).filter(([i, j]) => clearOf(i, j));
    if (!c.length) c = roomFloor(r, 0).filter(([i, j]) => clearOf(i, j));   // a small far room: any open tile in it
    if (!c.length) c = LV.rooms.flatMap((q, n) => n ? roomFloor(q, 0) : []).filter(([i, j]) => clearOf(i, j)).sort((p, q) => Math.hypot(p[0] - r.cx, p[1] - r.cy) - Math.hypot(q[0] - r.cx, q[1] - r.cy)).slice(0, 1);   // else the nearest open tile to it
    if (!c.length) return;
    c.sort((p, q) => Math.hypot(q[0] - r.cx, q[1] - r.cy) - Math.hypot(p[0] - r.cx, p[1] - r.cy));   // toward the room's edge, the Alpha in front
    const [i, j] = c[Math.min(c.length - 1, R.int(0, 2))];
    LV.decor.push({ kind: 'cage', i, j, open: !!f.aldoFree }); LV.solid[tIdx(i, j)] = 1;
    if (!f.aldoFree && storyOn()) LV.npcs.push({ role: 'aldo', name: 'ALDO', fi: i + 0.5, fj: j + 0.5, caged: true });
  }
  if (kind === 'cellar') {
    for (const [n, r] of LV.rooms.entries()) {
      if (n === 0) continue;
      const c = roomFloor(r, 0).filter(([i, j]) => clearOf(i, j) && (tileAt(i - 2, j) === WALL || tileAt(i, j - 2) === WALL));   // against the back walls
      for (let k = 0; k < Math.min(c.length, 2 + R.int(0, 2)); k++) { const [i, j] = c.splice(R.int(0, c.length - 1), 1)[0]; LV.decor.push({ kind: 'sacks', i, j, seed: R.int(0, 5) }); LV.solid[tIdx(i, j)] = 1; }
    }
  }
}
// the hub's doors into the side areas: walk onto one to go in
function updateSideDoors() {
  if (!LV.hub || G.fadeTo) return;
  for (const k in SIDES) {
    const [fi, fj] = SIDES[k].door(), d = Math.hypot(fi - hero.fi, fj - hero.fj);
    if (d > 1.2) { G['armed_' + k] = true; continue; }
    if (d < 0.5 && G['armed_' + k] !== false) enterSide(k);
  }
}
function enterSide(kind) {
  sfx('stairs');
  const back = { level: LV.level, seed: LV.seed, door: SIDES[kind].door(), snap: { enemies, boss, groundItems, seen: LV.seen.slice(), props: dynProps.map(p => ({ open: p.open, broken: p.broken, hp: p.hp, hatch: p.hatch })) } };
  G.fadeTo = () => { G.sideBack = back; startLevel(back.level, (back.seed ^ (kind === 'den' ? 0xd3d : 0xce11a)) >>> 0, kind); say(SIDES[kind].name, 51, 3); saveGame(); };
}
function leaveSide() {
  const R0 = G.sideBack; if (!R0) return;
  sfx('stairs');
  G.fadeTo = () => {
    startLevel(R0.level, R0.seed);
    const S = R0.snap;
    enemies = S.enemies; boss = S.boss; groundItems = S.groundItems; LV.seen.set(S.seen);
    S.props.forEach((q, n) => { if (dynProps[n]) Object.assign(dynProps[n], q); });
    // back at the door, a step out so it doesn't take you straight in again
    hero.fi = R0.door[0] + 1; hero.fj = R0.door[1] + 0.6; G.sideBack = null;
    for (const k in SIDES) G['armed_' + k] = false;
    updateFov(hero.fi, hero.fj); saveGame();
  };
}
function drawSideDoorLabels() {
  if (!LV.hub) return;
  for (const k in SIDES) {
    const [fi, fj] = SIDES[k].door(); if (Math.hypot(fi - hero.fi, fj - hero.fj) > 6) continue;
    const [x, y] = iso(fi, fj); textC(SIDES[k].label, Math.round(x - camX), Math.round(y - camY) - 30, 51);
  }
}
