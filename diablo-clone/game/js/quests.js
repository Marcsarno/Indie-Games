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
const STORY_NAMES = { hollow: 'CLEAR THE HOLLOW', woodcutter: 'THE MISSING WOODCUTTER', farm: 'THE STOLEN FARM', king: 'THE KING BELOW' };
function storyF() { if (!G.story) G.story = { f: {}, n: 0 }; return G.story.f; }
const storyOn = () => LV.act === 0 && !(LV.loop > 0);   // the story is Act I's, first time through
const mineOpen = () => { const f = storyF(); return !!(f.mineOpen || f.kingDead || (G.gates && G.gates[0]) || LV.loop > 0); };
// ---------------------------------------------------------------- round 78: three at once
// The user: following the quest you see under half the Hollow. After Aldo is home the road north
// stays shut until three places are dealt with, in any order: the Old Watchtower (goblins and their
// chieftain), the Standing Stones (an outdoor fight: wake them and hold the ring against three waves
// out of the woods) and the Barrow (the shielded dead and the wraith). Whichever you take first is
// set at level 3, the next at 4, the last at 5, so no order is the wrong one. Each pays on the spot
// with loot of its own kind. The tracker lists all three in their colours; tap a line to have the
// arrow lead there (else it leads to the nearest), and the others show as small marks at the edge.
const H3 = [
  { k: 'tower', flag: 'h3tower', name: 'THE WATCHTOWER', text: 'CLEAR THE OLD WATCHTOWER', col: 55, side: 'tower', boss: 'gchief', lean: ['weapon'] },
  { k: 'stones', flag: 'h3stones', name: 'THE STANDING STONES', text: 'HOLD THE STANDING STONES', col: 40, lean: ['ring', 'amulet'] },
  { k: 'barrow', flag: 'h3barrow', name: 'THE BARROW', text: 'QUIET THE BARROW', col: 59, side: 'barrow', boss: 'wraith', lean: ['helm', 'chest', 'shield'] },
];
const h3Count = () => { const f = storyF(); return H3.filter(o => f[o.flag]).length; }, h3Done = () => h3Count() === 3;
const h3Legacy = f => !!(f.treeCleared || f.sawChain || f.farmTold || f.chiefDead || f.mineOpen || f.kingDead || (G.gates && G.gates[0]));   // a save from before this step: already past it
const h3Level = () => 3 + Math.min(2, h3Count());
const STONES_AT = () => { const [a, b] = US(-20, 48); return [a + 0.5, b + 0.5]; };
const h3Pos = o => o.k === 'stones' ? STONES_AT() : SIDES[o.side].door();
// a side area's level: the three follow the order they are taken in until each is done
function sideDiff(side) { const o = H3.find(o => o.side === side), f = storyF(); return o && storyOn() && !f[o.flag] && !h3Legacy(f) ? h3Level() : SIDES[side].diff; }
function h3Pick() {
  const f = storyF(), open = H3.filter(o => !f[o.flag]); if (!open.length) return null;
  const sel = open.find(o => o.k === G.h3sel); if (sel) return sel;
  return open.reduce((b, o) => { const p = h3Pos(o), q = h3Pos(b); return Math.hypot(p[0] - hero.fi, p[1] - hero.fj) < Math.hypot(q[0] - hero.fi, q[1] - hero.fj) ? o : b; });
}
function h3Complete(o) {
  const f = storyF(); if (f[o.flag]) return;
  const lvl = h3Level(); f[o.flag] = true; if (h3Done()) f.h3all = true;   // (h3all: this hero took the long way, about two levels more: the rest of the act is raised to match)
  const R = rng((Math.random() * 1e9) | 0), gold = 40 * lvl, xp = 110 * lvl;
  let it = null; for (let t = 0; t < 300 && !it; t++) { const x = rollItem(R, lvl + 1); if (x.rarity !== 'normal' && o.lean.includes(ITEM_BASES[x.base].slot)) it = x; }
  if (it) groundItems.push({ item: it, fi: hero.fi + 0.7, fj: hero.fj + 0.3, t: 0 });
  hero.gold += gold; gainXp(xp); sfx('levelUp');
  questBanner(o.name + ': DONE', h3Done() ? 'THE HOLLOW IS SAFE. THE ROAD NORTH WILL OPEN' : `${h3Count()}/3. +${gold} GOLD, +${xp} XP`, o.col);
  if (G.h3sel === o.k) G.h3sel = null;
  saveGame();
}
// the Standing Stones: wake them and hold the ring against three waves out of the woods
const STONE_WAVES = [[['boar', 3]], [['shroom', 4], ['sporecap', 2]], [['bear', 1], ['boar', 2]]];
function stonesAction() {
  if (!LV.hub || !storyOn() || G.stones) return null;
  const f = storyF(), c = STONES_AT(); if (f.h3stones || !f.met || Math.hypot(hero.fi - c[0], hero.fj - c[1]) > 3.2) return null;
  return { label: 'WAKE THE STONES', go: () => { G.stones = { wave: 0, t: 1.6, list: [] }; sfx('cry'); sfx('crack'); say('THE STONES WAKE. HOLD THE RING', 40, 3); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.4); } };
}
function updateStones(dt) {
  const S = G.stones; if (!S) return;
  const c = STONES_AT();
  if (!LV.hub || hero.dead || Math.hypot(hero.fi - c[0], hero.fj - c[1]) > 15) {   // left the ring, or fell: the stones sleep again
    for (const e of S.list) { const k = enemies.indexOf(e); if (k >= 0 && alive(e)) enemies.splice(k, 1); }
    G.stones = null; if (LV.hub && !hero.dead) say('THE STONES FALL SILENT', 24, 3); return;
  }
  if (Math.random() < dt * 26) { const a = Math.random() * 6.283, [x, y] = iso(c[0] + Math.cos(a) * 2.6, c[1] + Math.sin(a) * 2.6); pspawn(4, x, y, 4 + Math.random() * 22, 0, 0, 26, 0.7, Math.random() < 0.5 ? 40 : 118); }   // light climbing the stones
  if (S.list.some(alive)) return;
  S.t -= dt; if (S.t > 0) return;
  if (S.wave >= STONE_WAVES.length) { G.stones = null; shockwave(c[0], c[1], 4, 0.4, [118, 40]); h3Complete(H3[1]); return; }
  const lvl = h3Level(); S.list = []; let n = 0;
  for (const [id, cnt] of STONE_WAVES[S.wave]) for (let k = 0; k < cnt; k++) {
    for (let t = 0; t < 40; t++) {   // out of the woods, all round
      const a = Math.random() * 6.283, d = 8 + Math.random() * 2.5, fi = c[0] + Math.cos(a) * d, fj = c[1] + Math.sin(a) * d;
      if (blocked(fi, fj) || blocked(fi + 0.3, fj + 0.3) || blocked(fi - 0.3, fj - 0.3)) continue;
      const e = makeEnemy(id, fi, fj, enemies.length + n++, lvl); e.wave = true; enemies.push(e); S.list.push(e); wake(e, true);
      const [x, y] = iso(fi, fj); for (let q = 0; q < 6; q++) pspawn(5, x + (Math.random() - 0.5) * 10, y, 2, (Math.random() - 0.5) * 30, 0, 30 + Math.random() * 30, 0.6, 96);
      break;
    }
  }
  S.wave++; S.t = 1.4; questBanner(`WAVE ${S.wave}/${STONE_WAVES.length}`, S.wave === STONE_WAVES.length ? 'SOMETHING BIG IS COMING' : 'THEY COME OUT OF THE WOODS', 40); sfx('growl');
}
function storyStage() {
  const f = storyF();
  if (G.gates && G.gates[0]) f.kingDead = true;
  if (!f.met) return 'meet';
  if (!f.woodTold && !f.aldoFree) return 'wren';
  if (!f.aldoFree) return f.alphaDead ? 'cage' : 'den';
  if (!f.woodPaid) return 'aldoBack';
  if (!h3Done() && !h3Legacy(f)) return 'hollow3';   // round 78: the Hollow's three dangers, in any order
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
const STAGE_QUEST = { hollow3: 'hollow', wren: 'woodcutter', den: 'woodcutter', cage: 'woodcutter', aldoBack: 'woodcutter', mine: 'woodcutter', hollis: 'farm', farm: 'farm', cellar: 'farm', farmBack: 'farm', letter: 'king', unlock: 'king', king: 'king', kingBack: 'king' };
function stageText(st) {
  if (st === 'hollow3') return `THREE DANGERS BAR THE ROAD NORTH ${h3Count()}/3`;
  return { meet: 'SPEAK TO BROTHER OSRIC', wren: 'TALK TO WREN BY THE TENTS', den: 'FIND ALDO IN THE WOLF DEN (NORTHEAST)', cage: 'FREE ALDO', aldoBack: 'RETURN TO WREN',
    mine: 'LOOK AT THE OLD MINE (NORTH, THE RIVERLANDS)', hollis: 'ASK HOLLIS ABOUT THE CHAINS', farm: `DRIVE THE BANDITS FROM THE FARM ${Math.min(4, G.story.n || 0)}/4`, cellar: 'FIND THEIR CHIEF IN THE CELLAR',
    farmBack: 'RETURN TO HOLLIS', letter: 'SHOW THE LETTER TO BROTHER OSRIC', unlock: 'UNLOCK THE OLD MINE (THE RIVERLANDS)', king: 'PUT THE KING TO REST, BELOW THE MINE', kingBack: 'RETURN TO BROTHER OSRIC', done: 'THE ROAD ON IS OPEN (PAST THE RIVERLANDS)' }[st] || '';
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
  { const o3 = H3.find(o => o.boss === id && o.side === LV.side); if (o3) h3Complete(o3); }   // (round 78: done out of order still counts)
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
  const T = G.talk, lines = talkLines(), textH = 14 + lines.length * 8, h = Math.min(H - 40, textH + (T.reward ? 110 : 0) + 30), y = H - h - 8;
  const L = { box: { x: 6, y, w: W - 12, h }, btn: null, cards: [], lines };
  if (T.reward) T.reward.forEach((it, n) => L.cards.push({ x: 12 + n * 84, y: y + textH + 14, w: 78, h: 68, it }));
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
      textC((ITEM_BASES[it.base].slot === 'shield' ? 'OFF HAND' : ITEM_BASES[it.base].slot.toUpperCase()) + ' LV ' + itemLvl(it), c.x + c.w / 2, c.y + 48, 24);
      // round 75 (the user: you can't tell whether a reward is an upgrade): the verdict against what is worn, on every card
      { const cur = hero.equip[ITEM_BASES[it.base].slot], u = upgradeOf(it), v = !canWear(it) ? 'NOT YOURS' : !cur ? 'EMPTY SLOT' : u > 0 ? 'UPGRADE' : u < 0 ? 'WORSE' : 'SAME', vc = !canWear(it) ? 23 : u > 0 ? 55 : u < 0 ? 23 : 25;
        fillRect(c.x + 2, c.y + c.h - 12, c.w - 4, 10, u > 0 && canWear(it) ? 52 : 3); textC(v, c.x + c.w / 2 + (u ? 4 : 0), c.y + c.h - 10, vc);
        const ax = c.x + c.w / 2 - textWidth(v) / 2 - 4; if (u > 0 && canWear(it)) arrowUp(ax, c.y + c.h - 11, 55, 4); else if (u < 0) arrowDown(ax, c.y + c.h - 5, 23, 4); }
    }
    if (T.pick >= 0) itemLines(T.reward[T.pick]).slice(0, 2).forEach((l, n) => textC(l, W / 2, L.cards[0].y + 72 + n * 7, 25));
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
    if (!on) return openTalk([[O, LV.gateOpen ? 'THE ROAD ON IS OPEN, PAST THE RIVERLANDS. GO WITH THE LIGHT.' : 'THE LIGHT KEEPS YOU.']]);
    if (st === 'meet') return openTalk([
      [O, 'GOD BE THANKED, A BLADE. I AM OSRIC. THIS CAMP IN THE HOLLOW IS ALL THAT IS LEFT OF OAKHOLLOW.'],
      [O, 'THE DEAD WALK HERE. AND THE GRAVES BEHIND MY CHURCH WERE NOT CLAWED OPEN FROM BELOW. THEY WERE DUG, WITH SPADES.'],
      [O, 'ALDO THE WOODCUTTER WENT UP TO THE WOLF GLADE THREE DAYS AGO AND DID NOT COME BACK. THE WOLVES HAVE A DEN PAST IT, NORTHEAST. FIND HIM, AND BRING HIM HOME TO HIS DAUGHTER WREN.']], 'ACCEPT', () => { f.met = true; f.woodTold = true; });   // round 51: Osric gives the quest himself (no second talk with Wren first)
    if (st === 'letter') return openTalk([
      [O, 'A LETTER? LET ME SEE.'],
      [O, '"EVERY BONE YOU BRING IS PAID IN SILVER. THE KING MUST BE WHOLE. - M."'],
      [O, 'I KNOW THIS HAND. MAELIS. HE WAS A BROTHER OF MY ORDER, UNTIL WE CAST HIM OUT FOR THE BOOKS HE READ. I SHOULD HAVE BURNED THEM MYSELF.'],
      [O, 'HE IS RAISING THE OLD KING UNDER THE MINE. TAKE THE KEY. PUT THE KING BACK IN HIS GRAVE, AND FIND MAELIS IF YOU CAN.']], 'ACCEPT', () => { f.letterRead = true; });
    if (st === 'kingBack') return openTalk([
      [O, 'THE KING IS DUST AGAIN. I FELT IT, LIKE A WINDOW OPENED IN A SICKROOM.'],
      f.maelisSeen ? [O, 'AND MAELIS STOOD OVER THE BONES AND LAUGHED? THEN HE HAS WHAT HE WANTED FROM THE KING. HE WENT SOUTH, PAST THE RIVERLANDS. THE ROAD IS OPEN NOW. TAKE THIS, AND MY THANKS.']
        : [O, 'BUT MAELIS IS NOT FINISHED. THE ROAD ON IS OPEN NOW, PAST THE RIVERLANDS, AND THAT IS THE WAY HE WENT. TAKE THIS, AND MY THANKS.']], 'COLLECT', () => { f.kingPaid = true; payQuest('king'); f.endDue = true; }, rewardChoice());   // (round 67: then the end of the act)
    const hint = { wren: 'WREN IS BY THE TENTS. SHE NEEDS YOU MORE THAN I DO.', den: 'THE DEN IS PAST THE WOLF GLADE, NORTHEAST. GO CAREFULLY.', cage: 'THE DEN IS PAST THE WOLF GLADE, NORTHEAST. GO CAREFULLY.', aldoBack: 'WREN WILL WANT TO KNOW.', mine: 'ALDO SAW SOMEONE AT THE MINE? THEN LOOK THERE.', hollis: 'HOLLIS SITS BY THE FIRE. HE LOST HIS FARM TO THE BANDITS.', farm: 'THE FARM IS EAST, PAST THE GATE.', cellar: 'THE FARM IS EAST, PAST THE GATE.', farmBack: 'HOLLIS WILL WANT TO KNOW.', unlock: 'THE MINE IS NORTH. THE LIGHT GOES WITH YOU.', king: 'THE MINE IS NORTH. THE LIGHT GOES WITH YOU.' }[st];
    return openTalk([[O, hint || 'THE LIGHT KEEPS YOU.']]);
  }
  if (n.role === 'wren') {
    if (on && st === 'meet') return openTalk([[Wn, 'BROTHER OSRIC IS ON THE CHURCH STEPS. SPEAK TO HIM FIRST, PLEASE.']]);
    if (on && st === 'wren') return openTalk([
      [Wn, 'YOU ARE THE ONE OSRIC SENT? MY FATHER IS ALDO. HE WENT TO CUT WOOD BY THE WOLF GLADE AND NEVER CAME HOME. THE DEN IS PAST IT, NORTHEAST.'],
      [Wn, 'THE WOLVES HAVE BEEN WRONG ALL MONTH. THEY HOWL IN DAYLIGHT. HE SAID THEY HAD A DEN PAST THE OLD TREES.'],
      [Wn, 'PLEASE. BRING HIM BACK.']], 'ACCEPT', () => { f.woodTold = true; });
    if (on && st === 'aldoBack') return openTalk([
      [Wn, 'FATHER! YOU BROUGHT HIM BACK!'],
      [Al, 'THEY HAD ME IN A CAGE. A CAGE, LIKE A HEN FOR THE POT. WOLVES DO NOT BUILD CAGES.'],
      [Al, 'AND THEY WERE NOT HUNTING. THEY WERE RUNNING. SOMETHING IN THE NORTH HILLS DROVE THEM OUT.'],
      [Al, 'BEFORE THEY TOOK ME I SAW A HOODED MAN AT THE OLD MINE, WITH A LANTERN THAT BURNED GREEN. LOOK THERE.'],
      [Wn, 'TAKE SOMETHING. AND FATHER WILL KEEP THE CAMPFIRE HIGH: REST BY IT AND IT WILL MEND YOU.'],
      ['ALDO', 'THE ROAD NORTH? NOT WHILE GOBLINS HOLD THE TOWER, THE STONES ARE STIRRING AND THE BARROW IS OPEN. DEAL WITH THOSE THREE, ANY ORDER YOU LIKE, AND I WILL CUT THE TREE.']], 'COLLECT', () => { f.woodPaid = true; payQuest('woodcutter'); say('REST BY THE CAMPFIRE TO HEAL', 26, 3); }, rewardChoice());
    return openTalk([[Wn, f.aldoFree ? 'FATHER IS HOME. I CAN SLEEP AGAIN.' : 'PLEASE FIND HIM.']]);
  }
  if (n.role === 'aldo') {   // in the den's cage, or at home by his woodpile
    if (LV.side === 'den') {
      if (!f.alphaDead) return openTalk([[Al, 'BEHIND YOU! THE BIG ONE! KILL IT FIRST, THEN GET ME OUT OF HERE!']]);
      return openTalk([[Al, 'YOU KILLED IT? BLESS YOU. BREAK THE LOCK, QUICK.'], [Al, 'I KNOW THE WAY HOME. TELL WREN I AM COMING.']], 'OK', () => freeAldo(n));
    }
    return openTalk([[Al, st === 'mine' ? 'THE OLD MINE, NORTH IN THE RIVERLANDS. THAT IS WHERE I SAW HIM. GREEN FIRE. I CLEARED THE TREE OFF THE ROAD FOR YOU.' : 'THE FIRE IS HIGH. SIT A WHILE.']]);
  }
  if (n.role === 'hollis') {
    if (on && (st === 'hollis' || st === 'mine')) return openTalk([   // (round 64: straight after Wren's reward, no trip to the chains first)
      [Ho, f.sawChain ? 'CHAINS ON THE MINE? THAT IS THE BANDITS. THEY TOOK MY FARM A WEEK AGO AND PUT ME OUT IN MY NIGHTSHIRT.' : 'A MAN AT THE OLD MINE? THE BANDITS HAVE CHAINED IT SHUT. THEY TOOK MY FARM A WEEK AGO AND PUT ME OUT IN MY NIGHTSHIRT.'],
      [Ho, 'EVERY NIGHT THEY HAUL SACKS IN AND OUT OF MY CELLAR. HEAVY SACKS. I DO NOT WANT TO KNOW WHAT IS IN THEM.'],
      [Ho, 'THEIR CHIEF WEARS THE MINE KEY ON HIS BELT. THE FARM IS NORTH, IN THE RIVERLANDS, PAST THE FALLEN TREE. GET IT BACK FOR ME?']], 'ACCEPT', () => { f.farmTold = true; G.story.n = 0; });
    if (on && st === 'farmBack') return openTalk([
      [Ho, 'BONES? MY CELLAR FULL OF BONES. FROM THE GRAVEYARD. GOD HAVE MERCY.'],
      [Ho, 'I AM GOING HOME ALL THE SAME. AND THE POTION WAGON WILL HAVE FRESH HERBS FROM MY FIELDS: POTIONS COST LESS NOW.'],
      [Ho, 'THAT LETTER THE CHIEF HAD. SHOW IT TO BROTHER OSRIC. HE READS BETTER THAN ME.']], 'COLLECT', () => { f.farmPaid = true; payQuest('farm'); }, rewardChoice());
    return openTalk([[Ho, f.farmPaid ? 'THE FIELDS WILL TAKE A YEAR TO COME BACK. BUT THEY WILL COME BACK.' : 'I HAD A FARM, ONCE. NORTH, IN THE RIVERLANDS.']]);
  }
}
// round 42b: Aldo runs home from the den; the cage door hangs open
function freeAldo(n) {
  const f = storyF(); f.aldoFree = true;
  for (const p of dynProps) if (p.kind === 'cage') p.open = true;
  n.leaving = 1.2; sfx('chest'); say('ALDO IS FREE. RETURN TO WREN', 51, 3);
}
// ---------------------------------------------------------------- round 64: the quest flow
// The user: you can miss a quest, you walk all the way back following the arrow, and where you're
// going and what you're doing should be more obvious. Now: (1) in camp, whoever has your next step
// speaks to you as soon as you arrive (no walking up to them): Osric at the start, the turn-ins with
// their rewards, and the next quest right after (Wren's reward, then Hollis; Hollis's, then Osric's
// letter). (2) Finishing a quest in the field rings a bell with a QUEST COMPLETE banner and a big
// TOWN PORTAL prompt (tap it, or the portal button); the arrow then points at the portal you opened,
// not at the long walk home. (3) Each new step shows its objective in a banner.
const CAMP_ROLE = { meet: 'priest', wren: 'wren', aldoBack: 'wren', mine: 'hollis', hollis: 'hollis', farmBack: 'hollis', letter: 'priest', kingBack: 'priest' };
const TURN_IN = { aldoBack: 'woodcutter', farmBack: 'farm', kingBack: 'king' };
const campStep = st => !!CAMP_ROLE[st];
// a step that waits in camp while the hero is away from it: the portal home is the way
const portalHome = () => storyOn() && campStep(storyStage()) && LV.area !== 'town' && !hero.dead;
function questBanner(title, line, col = 51) { G.qBanner = { title, line, col, t: 3.4 }; }
function storyFlow(dt) {
  const st = storyStage(), key = LV.level + ':' + LV.seed + ':' + (LV.side || '');
  if (G.qBanner) { G.qBanner.t -= dt; if (G.qBanner.t <= 0) G.qBanner = null; }
  if (G.lastSt === undefined || G.lastStory !== G.story) { G.lastSt = st; G.lastStory = G.story; }   // (a load or a new game: no banner for where it starts)
  if (st !== G.lastSt) {
    const prev = G.lastSt; G.lastSt = st;
    if (TURN_IN[st]) { questBanner('QUEST COMPLETE', STORY_NAMES[TURN_IN[st]]); sfx('levelUp'); if (LV.area !== 'town') say('OPEN A TOWN PORTAL TO CLAIM YOUR REWARD', 51, 4); }
    else if (st !== 'done' && !(LV.hub && campStep(st))) { { const nq = STAGE_QUEST[st] && STAGE_QUEST[st] !== STAGE_QUEST[prev]; questBanner(nq ? 'NEW QUEST' : 'NEW OBJECTIVE', (nq ? STORY_NAMES[STAGE_QUEST[st]] + ': ' : '') + stageText(st)); } sfx('chest'); }
    else if (st === 'done') questBanner('ACT I COMPLETE', 'THE ROAD ON IS OPEN');
  }
  // in camp: the one with your next step speaks to you, a moment after you arrive (and after each talk)
  if (G.autoKey !== key) { G.autoKey = key; G.autoTalkT = G.t + 1.0; }
  if (LV.hub && campStep(st) && G.mode === 'play' && !G.talk && !G.fadeTo && !(G.actCard > 0) && !hero.dead && G.t > (G.autoTalkT || 0)) {
    const n = npcs.find(n => n.role === CAMP_ROLE[st]);
    if (n) { G.autoTalkT = G.t + 0.8; talkTo(n); }
  }
}
// the prompt: a big button under the tracker while a reward waits in camp (tap = the portal button)
function drawPortalPrompt() {
  UI.tpPrompt = null;
  if (G.mode !== 'play' || !portalHome()) return;
  const open = G.tp && !G.tp.back, label = open ? 'WALK INTO THE PORTAL' : TURN_IN[storyStage()] ? 'TOWN PORTAL: CLAIM YOUR REWARD' : 'TOWN PORTAL: BACK TO CAMP';
  const w = textWidth(label) + 28, h = 20, x = Math.round(W / 2 - w / 2), y = 92, pulse = Math.floor(G.t * 3) % 2;
  fillRect(x, y, w, h, 5); frame(x, y, w, h, pulse ? 40 : 39, 3); frame(x + 1, y + 1, w - 2, h - 2, 4, 2);
  glyphPortal(x + 11, y + 10); text(label, x + 21, y + 8, 27);
  if (!open) UI.tpPrompt = { x: x - 4, y: y - 4, w: w + 8, h: h + 8 };
  if (!open && pulse) { const [bx, by, br] = UI.portal; for (let a = 0; a < 40; a++) { const q = a / 40 * 6.283; put(Math.round(bx + Math.cos(q) * (br + 3)), Math.round(by + Math.sin(q) * (br + 3)), 51); } }   // a ring round the portal button too
}
// the banner: a dark band with the title and the line, high on the screen
function drawQuestBanner() {
  const B = G.qBanner; if (!B || G.mode !== 'play') return;
  const t = 3.4 - B.t, open = Math.min(1, t / 0.25, B.t / 0.35), cy = Math.round(H * 0.33), hh = Math.round(17 * open);   // (below the portal prompt)
  for (let y = cy - hh; y < cy + hh; y++) for (let x = 0; x < W; x++) if (BAYER[((y & 3) << 2) | (x & 3)] < 0.8) put(x, y, BLK);
  if (open > 0.8) { textC(B.title, W / 2, cy - 10, B.col, 2); wrapText(B.line, 60).slice(0, 2).forEach((l, n) => textC(l, W / 2, cy + 5 + n * 8, 26)); }
}
// ---------------------------------------------------------------- the camp and the mine
function updateStory(dt) {
  if (!storyOn()) return;
  const f = storyF();
  updateFinale(dt);
  storyFlow(dt);
  // Aldo leaves the den: he walks off and fades
  for (let k = npcs.length - 1; k >= 0; k--) { const n = npcs[k]; if (n.leaving === undefined) continue; n.leaving -= dt; n.clip = 'walk'; n.walk += dt * 8; tryMove(n, dt * 1.5, -dt * 1.5, 0.2); if (n.leaving <= 0) npcs.splice(k, 1); }
  updateStones(dt);
  if (LV.side === 'cellar' && !f.cellarSeen) { f.cellarSeen = true; say('SACKS OF BONES, STACKED TO THE ROOF.', 26, 4); say('THE GRAVES WERE DUG FOR THIS.', 26, 4); }
  // round 48c: the fallen tree on the road north: a word when one walks up to it; once Aldo is home, it's cleared
  if (LV.treeBlock && Math.hypot(hero.fi - LV.treeBlock[0], hero.fj - LV.treeBlock[1]) < 3.2 && !(G.sealT > 0)) { say('A FALLEN TREE BLOCKS THE ROAD NORTH', 22, 2.5); if (!f.aldoFree) say('ONLY A WOODCUTTER COULD MOVE IT', 26, 2.5); else say('ALDO WILL NOT CUT IT WHILE THE HOLLOW IS UNSAFE', 26, 2.5); G.sealT = 3; }
  if (LV.hub && hollowOpen() && storyOn() && !f.treeCleared) { f.treeCleared = true; say('ALDO HAS CLEARED THE FALLEN TREE', 51, 3.5); say('THE ROAD NORTH IS OPEN', 51, 3.5); }
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
  if (!LV.riv || mineOpen()) return false;
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
  if (!LV.riv || !LV.stairs || !LV.stairs.mine || mineOpen()) return null;
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
// where the next goal is, for the marker: [fi, fj] or null (.npc set when it is a person, who shows
// his own ! or ?). Round 48: always on and step by step: whatever moves the story on next, wherever
// the hero is: the Alpha or the chief even before they are seen, the cage, the nearest bandit at
// the farm, the way out of a side area that isn't this step's, the stairs down (or the King) below
// the mine, and once it is all done, the open road south. drawStoryMark leads there along the ground.
function storyTarget() {
  if (!storyOn()) return null;
  if (portalHome()) { if (G.tp && !G.tp.back) { const p = [G.tp.fi, G.tp.fj]; return p; } return null; }   // round 64: the portal home, not the long walk
  const st = storyStage(), live = id => enemies.filter(e => e.id === id && alive(e));
  const nearest = list => { let b = null, bd = 1e9; for (const e of list) { const d = Math.hypot(e.fi - hero.fi, e.fj - hero.fj); if (d < bd) { bd = d; b = [e.fi, e.fj]; } } return b; };
  const npc = r => { const n = npcs.find(n => n.role === r); if (!n) return null; const p = [n.fi, n.fj]; p.npc = true; return p; };
  const stairs = () => LV.stairs ? [LV.stairs.i + 0.5, LV.stairs.j + 0.5] : null;
  if (LV.side) {
    if (LV.side === 'den' && (st === 'den' || st === 'cage')) return nearest(live('alpha')) || npc('aldo') || stairs();
    if (LV.side === 'cellar' && (st === 'farm' || st === 'cellar')) return nearest(live('banditchief')) || stairs();
    { const o3 = H3.find(o => o.side === LV.side); if (st === 'hollow3' && o3 && !storyF()[o3.flag]) return nearest(live(o3.boss)) || stairs(); }
    return stairs();   // done here (or not this step's place): the way out
  }
  if (LV.riv) {   // the Riverlands: the farm, its cellar and the mine are here; everything else is back south in the Hollow
    if (st === 'farm') return nearest(live('brigand')) || [RIV.farm[0], RIV.farm[1] + 2];
    if (st === 'cellar') return SIDES.cellar.door();
    if (st === 'mine' || st === 'unlock' || st === 'king') return stairs();
    if (st === 'done') return LV.gateOpen && LV.gatePos ? LV.gatePos : null;
    return LV.backExit;
  }
  if (!LV.hub) {   // below the mine: the King when he is on this floor, else the stairs down (in his hall, home)
    if (LV.act !== 0) return null;
    return boss && alive(boss) ? [boss.fi, boss.fj] : stairs();
  }
  // the Hollow: the camp's people and the den here; the rest is north, past the fallen tree, on the road to the Riverlands
  const north = stairs();
  if (st === 'hollow3') { const o3 = h3Pick(); if (!o3) return null; const p = h3Pos(o3).slice(); p.col = o3.col; return p; }
  return { meet: npc('priest'), wren: npc('wren'), aldoBack: npc('wren') || npc('aldo'), den: SIDES.den.door(), cage: SIDES.den.door(), mine: north, hollis: npc('hollis'), farm: north,
    cellar: north, farmBack: npc('hollis'), letter: npc('priest'), unlock: north, king: north, kingBack: npc('priest'), done: north }[st] || null;
}
// a rare (or better) item: rerolls until one comes up
function rollRare(R, level) {
  for (let t = 0; t < 80; t++) { const it = rollItem(R, level); if (it.rarity !== 'normal' && it.rarity !== 'magic') return it; }
  return rollItem(R, level);
}
// the tracker: the quest's name, and what to do next in words
function drawQuestTracker() {
  if (G.mode !== 'play' || !storyOn()) return;
  const st = storyStage(); if (st === 'done' && !(G.gates && G.gates[0] && (LV.hub || LV.riv))) return;
  UI.h3 = null;
  if (st === 'hollow3') {   // round 78: three lines in their colours, ticked off; tap one to be led there
    text(STORY_NAMES.hollow + `  ${h3Count()}/3`, 4, 68, 26);
    const f = storyF(), pick = LV.hub ? h3Pick() : H3.find(o => o.side === LV.side); UI.h3 = [];
    H3.forEach((o, n) => { const y = 78 + n * 11, done = !!f[o.flag], on = pick === o && !done;
      fillRect(4, y, 6, 6, done ? 5 : o.col); frame(4, y, 6, 6, BLK, BLK); if (done) { line(5, y + 3, 6, y + 4, 55); line(6, y + 4, 9, y + 1, 55); }
      text((on ? '> ' : '') + o.text + (done ? ': DONE' : ''), 13, y, done ? 24 : on ? 51 : 26);
      if (!done) UI.h3.push({ x: 0, y: y - 2, w: 150, h: 11, k: o.k }); });
    return;
  }
  const q = STAGE_QUEST[st];
  if (q) text(STORY_NAMES[q], 4, 68, 24);
  text(portalHome() && TURN_IN[st] ? 'QUEST COMPLETE: CLAIM YOUR REWARD IN CAMP' : stageText(st), 4, q ? 76 : 68, 51);
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
  den: { name: 'THE WOLF DEN', theme: 'caves', rooms: 5, pool: ['wolf'], boss: 'alpha', at: 'hub', door: () => [HUB.den[0] + 1.6, HUB.den[1] + 0.6], label: 'WOLF DEN', seed: 0xd3d },
  // round 48c: the Hollow's other doors (the barrow: dangerous, level 6; the watchtower: goblins and their shaman)
  barrow: { name: 'THE BARROW', down: 'barrow2', theme: 'crypt', rooms: 6, pool: ['spearman', 'axeman', 'skeleton', 'skeleton', 'spearman', 'axeman', 'gravebow', 'tombguard'], boss: 'wraith', at: 'hub', diff: 6,   /* round 78: on the main path now: one in eight a crossbow or a shield wall (was one in five each; the ranger bot died 13 times to bolts from out of sight) */ door: () => [HUB.barrow[0] + 1.6, HUB.barrow[1] + 0.6], label: 'THE BARROW: DANGER', labelCol: 22, seed: 0xba770 },
  // round 67: the barrow's second floor, down the stairs in the wraith's room: bigger and harder, its
  // dead led by the Barrow Wight (it raises the dead and calls frost orbs); its hoard is in two chests
  barrow2: { name: 'THE BARROW: THE DEEP TOMB', theme: 'crypt', rooms: 7, pool: ['spearman', 'axeman', 'gravebow', 'tombguard', 'tombguard', 'wraith'], boss: 'barrowwight', bigLeader: true, at: 'below', diff: 7, label: '', seed: 0xba772 },
  tower: { name: 'THE OLD WATCHTOWER', theme: 'crypt', rooms: 4, pool: ['goblin', 'goblin', 'gshaman'], boss: 'gchief', at: 'hub', diff: 3, door: () => [HUB.tower[0] + 1.6, HUB.tower[1] - 0.4], label: 'OLD WATCHTOWER', seed: 0x70e7 },
  cellar: { name: 'THE FARM CELLAR', theme: 'crypt', rooms: 5, pool: ['brigand'], boss: 'banditchief', at: 'riv', door: () => RIV.cellar, label: 'FARMHOUSE CELLAR', seed: 0xce11a },
};
const sidesHere = () => Object.keys(SIDES).filter(k => (SIDES[k].at === 'hub' && LV.hub) || (SIDES[k].at === 'riv' && LV.riv));
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
  const trySolidBlocks = (i, j) => { LV.solid[tIdx(i, j)] = 1; const d = bfs(LV.start.cx, LV.start.cy); LV.solid[tIdx(i, j)] = 0; for (let q = 0; q < MW * MH; q++) if (LV.map[q] === FLOOR && !LV.solid[q] && q !== tIdx(i, j) && d[q] < 0) return true; return false; };
  if (kind === 'den') {   // round 69: the wolves' nests: straw and gnawed bones in every room but the first
    for (const [n, r] of LV.rooms.entries()) { if (!n) continue; for (let q = 0; q < 2; q++) { const fi = r.x + 1 + R() * (r.w - 2), fj = r.y + 1 + R() * (r.h - 2); LV.stamps.push({ kind: 'straw', fi, fj, seed: R.int(1, 1e6) }); LV.decor.push({ kind: 'bones', fi: fi + 0.4, fj: fj + 0.3, seed: R.int(1, 1e6) }); } }
  }
  if (kind === 'barrow2') {   // the hoard: two chests at the back of the Wight's room
    const r = LV.rooms[LV.leaderRoom], c = (roomFloor(r, 1).filter(([i, j]) => clearOf(i, j)).length >= 3 ? roomFloor(r, 1) : roomFloor(r, 0)).filter(([i, j]) => clearOf(i, j) && !(LV.down && Math.abs(i - LV.down.i) <= 2 && Math.abs(j - LV.down.j) <= 2)).sort((p, q) => Math.hypot(q[0] - r.cx, q[1] - r.cy) - Math.hypot(p[0] - r.cx, p[1] - r.cy));
    for (let k = 0, n = 0; k < c.length && n < 2; k++) { const [i, j] = c[k]; if (LV.decor.some(d => Math.abs(d.i - i) <= 1 && Math.abs(d.j - j) <= 1) || trySolidBlocks(i, j)) continue; n++; LV.decor.push({ kind: 'chest', i, j, seed: R.int(0, 999) }); LV.solid[tIdx(i, j)] = 1; }
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
  if (G.fadeTo || LV.side) return;
  for (const k of sidesHere()) {
    const [fi, fj] = SIDES[k].door(), d = Math.hypot(fi - hero.fi, fj - hero.fj);
    if (d > EXIT_R.door + 0.75) { G['armed_' + k] = true; continue; }
    if (d < EXIT_R.door && G['armed_' + k] !== false && (Math.hypot(input.mx, input.my) >= 0.18 || input.keys.size > 0 || !!hero.goTalk)) enterSide(k);   // round 81: a wide doorway, walked into
  }
}
function enterSide(kind) {
  sfx('stairs');
  const back = { level: LV.level, seed: LV.seed, door: SIDES[kind].door(), snap: { enemies, boss, groundItems, seen: LV.seen.slice(), props: dynProps.map(p => ({ open: p.open, broken: p.broken, hp: p.hp, hatch: p.hatch })) } };
  G.fadeTo = () => { G.sideBack = back; startLevel(back.level, (back.seed ^ SIDES[kind].seed) >>> 0, kind); say(SIDES[kind].name, 51, 3); saveGame(); };
}
// round 67: down the barrow's stairs to its second floor, and back up to where you left the first
function descendSide() {
  const to = LV.sideCfg && LV.sideCfg.down; if (!to) return;
  sfx('stairs');
  const back = { level: LV.level, seed: LV.seed, side: LV.side, snap: { enemies, boss, groundItems, seen: LV.seen.slice(), props: dynProps.map(p => ({ open: p.open, broken: p.broken, hp: p.hp, hatch: p.hatch })) } };
  G.fadeTo = () => { G.sideDown = back; startLevel(back.level, (back.seed ^ SIDES[to].seed) >>> 0, to); say(SIDES[to].name, 22, 3); G.upArmed = false; saveGame(); };
}
function climbSide() {
  const B = G.sideDown; if (!B) return leaveSide();
  sfx('stairs');
  G.fadeTo = () => {
    const keep = G.sideBack; startLevel(B.level, B.seed, B.side); G.sideBack = keep;
    const S = B.snap; enemies = S.enemies; boss = S.boss; groundItems = S.groundItems; LV.seen.set(S.seen);
    S.props.forEach((q, n) => { if (dynProps[n]) Object.assign(dynProps[n], q); });
    hero.fi = LV.down.i + 1.5; hero.fj = LV.down.j + 1.5; G.sideDown = null; G.downArmed = false;
    updateFov(hero.fi, hero.fj); saveGame();
  };
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
    hero.fi = R0.door[0] + 1.5; hero.fj = R0.door[1] + 1.0; G.sideBack = null; G.sideDown = null;   // (round 68a: 1.5 out, past the 1.2 that re-arms the door: at 1.17 you couldn't turn straight back in)
    for (const k in SIDES) G['armed_' + k] = false;
    updateFov(hero.fi, hero.fj); saveGame();
  };
}
function drawSideDoorLabels() {
  if (LV.down && Math.hypot(LV.down.i + 0.5 - hero.fi, LV.down.j + 0.5 - hero.fj) < 6) { const [x, y] = iso(LV.down.i + 0.5, LV.down.j + 0.5); textC('DOWN: THE DEEP TOMB', Math.round(x - camX), Math.round(y - camY) - 30, 22); }
  if (LV.side) return;
  for (const k of sidesHere()) {
    const [fi, fj] = SIDES[k].door(); if (Math.hypot(fi - hero.fi, fj - hero.fj) > 6) continue;
    const [x, y] = iso(fi, fj); textC(SIDES[k].label, Math.round(x - camX), Math.round(y - camY) - 30, SIDES[k].labelCol || 51);
  }
}

// ---------------------------------------------------------------- the Act I finale (round 67)
// The King falls; a moment later Maelis steps out of a cold green flash a few paces off, his lantern
// swinging, and says his piece (the game pauses for it); then he walks off and is gone in another
// flash. Back in camp, Osric's thanks ends the act: the end screen (time, level, kills, deaths, what
// comes next), then the game goes on with the road south open.
const finaleDue = () => storyOn() && !storyF().maelisSeen;
function startFinale() { G.finale = { t: 0, ph: 'wait' }; }
function maelisFlash(fi, fj) {
  impactFlash(fi, fj, 18, 9); sfx('blink'); sfx('whoomp');
  const [x, y] = iso(fi, fj);
  for (let k = 0; k < 26; k++) { const a = k / 26 * 6.283, v = 30 + Math.random() * 50; pspawn(4, x, y, 18, Math.cos(a) * v, Math.sin(a) * v * 0.5, 20 + Math.random() * 50, 0.5 + Math.random() * 0.3, k % 3 ? 55 : k % 2 ? 54 : 27); }
  G.smoke.push({ fi, fj, r: 1.1, t: 1.6, t0: 1.6 });
}
const MAELIS = 'MAELIS';
function updateFinale(dt) {
  const F = G.finale, ff = storyF(); if (!F || G.mode !== 'play') { if ((ff.endDue || (ff.kingPaid && ff.maelisSeen && !ff.endShown)) && G.mode === 'play' && !G.talk && !G.fadeTo) showEnd(); return; }   // (however the king quest was handed in)
  F.t += dt;
  const m = npcs.find(n => n.maelis);
  if (F.ph === 'wait' && F.t > 2.4 && !hero.dead) {
    let spot = null;   // a clear floor spot four to five paces off, in sight
    for (let r = 4.6; r >= 2.6 && !spot; r -= 0.5) for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283 + 0.4, fi = hero.fi + Math.cos(a) * r, fj = hero.fj + Math.sin(a) * r; if (!blocked(fi, fj) && !clearance(fi, fj, 0.4) && LV.vis[tIdx(Math.floor(fi), Math.floor(fj))] > 0.5 && los(hero.fi, hero.fj, fi, fj)) { spot = [fi, fj]; break; } }
    spot = spot || [hero.fi + 1.5, hero.fj - 1.5];
    npcs.push({ role: 'maelis', name: MAELIS, maelis: true, fam: 'hero', look: NPC_LOOKS.maelis, fi: spot[0], fj: spot[1], home: spot, dir: dirFrom(hero.fi - spot[0], hero.fj - spot[1]), clip: 'idle', clock: 0, walk: 0, wait: 99, target: null, npc: true });
    maelisFlash(spot[0], spot[1]); F.ph = 'appear'; F.t = 0;
  } else if (F.ph === 'appear' && F.t > 1.1 && m) {
    F.ph = 'talk'; hero.atk = -1; clearInput();
    openTalk([
      [MAELIS, 'SO THE OLD KING SLEEPS AGAIN. NO MATTER. HE HAD ALREADY GIVEN ME WHAT I CAME FOR.'],
      [MAELIS, "YOU ARE OSRIC'S, AREN'T YOU? HE BURNED MY BOOKS AND CALLED IT MERCY. TELL HIM THEY WERE RIGHT: WHAT IS BURIED IN THIS LAND DOES NOT STAY BURIED."],
      [MAELIS, 'FOLLOW ME SOUTH, IF YOU LIKE. I WOULD SO LIKE YOU TO SEE WHAT I WAKE NEXT.']], 'OK', () => { F.ph = 'flee'; F.t = 0; });
  } else if (F.ph === 'flee' && m) {
    const dx = m.fi - hero.fi, dy = m.fj - hero.fj, d = Math.hypot(dx, dy) || 1;
    m.dir = dirFrom(dx, dy); m.clip = 'walk'; m.walk += dt * 7; tryMove(m, dx / d * dt * 1.6, dy / d * dt * 1.6, 0.2);
    if (F.t > 1.1) {
      maelisFlash(m.fi, m.fj); npcs.splice(npcs.indexOf(m), 1); G.finale = null; storyF().maelisSeen = true;
      say('MAELIS IS GONE, SOUTH', 55, 4); say('THE WAY UP IS OPEN', 26, 4); saveGame();
    }
  }
  if (m && Math.random() < 0.5) { const [x, y] = iso(m.fi, m.fj); pspawn(3, x + 7 + (Math.random() - 0.5) * 3, y, 13 + Math.random() * 3, (Math.random() - 0.5) * 4, 0, 6 + Math.random() * 8, 0.6, Math.random() < 0.6 ? 55 : 54); }   // the green lantern's glow
}
// the end of Act I: shown once, after Osric's thanks
function showEnd() { const f = storyF(); f.endDue = false; f.endShown = true; G.mode = 'end'; G.endT = 0; G.endStats = Object.assign({ t: 0, deaths: 0, kills: 0 }, hero.stats || {}, { lvl: hero.lvl }); sfx('levelUp'); saveGame(); }
function endLayout() { return { btn: { x: W / 2 - 52, y: H - 46, w: 104, h: 20 } }; }
function drawEnd() {
  G.endT = (G.endT || 0) + 1 / 60;
  const a = Math.min(1, G.endT / 0.8); fade(0.55 + 0.4 * a); if (a < 0.6) return;
  const S = G.endStats || {}, mm = Math.floor((S.t || 0) / 60), ss = Math.floor((S.t || 0) % 60), y0 = Math.round(H * 0.16);
  textC('ACT I', W / 2, y0, 50, 2); textC('COMPLETE', W / 2, y0 + 18, 51, 3);
  textC('THE KING SLEEPS. MAELIS HAS FLED SOUTH.', W / 2, y0 + 50, 26);
  const rows = [['TIME', `${mm}:${String(ss).padStart(2, '0')}`], ['LEVEL', String(S.lvl || hero.lvl)], ['KILLS', String(S.kills || 0)], ['DEATHS', String(S.deaths || 0)]];
  rows.forEach(([k, v], n) => { const y = y0 + 72 + n * 12; text(k, W / 2 - 60, y, 25); text(v, W / 2 + 60 - textWidth(v, 1), y, 51); });
  const ty = y0 + 136;
  for (let x = W / 2 - 70; x < W / 2 + 70; x++) put(x, ty - 6, 8);
  textC('NEXT: ACT II, ASHFORD', W / 2, ty + 2, 50);
  wrapText('A MINING TOWN UNDER A SMOKING MOUNTAIN. THE MINERS HAVE STOPPED COMING UP, AND SOMETHING BELOW HAS STARTED DIGGING TOWARD THEM.', 44).forEach((l, n) => textC(l, W / 2, ty + 16 + n * 8, 26));
  textC('THANK YOU FOR PLAYING THE DEMO', W / 2, ty + 56, 25);
  const L = endLayout(), b = L.btn;
  if (G.endT > 1.6) { fillRect(b.x, b.y, b.w, b.h, 3); frame(b.x, b.y, b.w, b.h, 8, 3); textC('KEEP PLAYING', W / 2, b.y + 7, 51); }
}
function endTap(p) { const b = endLayout().btn; if (G.endT > 1.6 && inRect(p, b)) { sfx('tap'); G.mode = 'play'; clearInput(); say('THE ROAD SOUTH IS OPEN, PAST THE RIVERLANDS', 51, 4); } }
