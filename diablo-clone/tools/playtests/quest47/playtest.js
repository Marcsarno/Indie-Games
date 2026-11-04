// round 47: one-screen dialogue (and its reward pick), magic rewards, the quest arrow only when
// near, salvage from the bag (one and SALVAGE WORSE), plate later in the loot table
Math.random = (() => { let s = 13; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const run = n => { for (let k = 0; k < n; k++) { update(1 / 60); warmStep(10); } };
const shot = k => { for (let i = 0; i < 200; i++) warmStep(30); render(); shots[k] = cvs.toDataURL(); };
newHero('warrior'); G.mode = 'play'; G.story = null; startLevel(1, 4242); G.actCard = 0; run(5);
const who = r => npcs.find(n => n.role === r);
{ const n = who('priest'); hero.fi = n.fi + 1.1; hero.fj = n.fj; run(3); talkTo(n); render(); shot('talk-osric'); L.push({ mode: G.mode, lines: talkLines().length, btn: G.talk.btn });
  const r = talkLayout().btn; talkTap([r.x + 4, r.y + 4]); L.push({ oneTapClosed: G.mode === 'play', story: storyStage() }); }
{ const n = who('wren'); hero.fi = n.fi + 1.1; hero.fj = n.fj; run(3); talkTo(n); render(); shot('talk-wren'); const r = talkLayout().btn; talkTap([r.x + 4, r.y + 4]); L.push({ wrenAccepted: G.mode === 'play', story: storyStage() }); }
// the arrow: far from the den, none; near, it shows
{ const t = storyTarget(); hero.fi = HUB.camp[0]; hero.fj = HUB.camp[1]; L.push({ target: t && t.map(v => +v.toFixed(1)), distFromCamp: t && +Math.hypot(t[0] - hero.fi, t[1] - hero.fj).toFixed(1), arrowR: QUEST_ARROW_R }); }
// the reward pick: magic items
{ LV.diff = 1; const rw = rewardChoice(); L.push({ reward: rw.map(it => it.rarity + ' ' + itemName(it)).join(' | ') });
  openTalk([['WREN', 'YOU BROUGHT HIM BACK. TAKE SOMETHING.']], 'COLLECT', null, rw); render(); const c = talkLayout().cards[1]; talkTap([c.x + 4, c.y + 4]); render(); shot('talk-reward'); const r = talkLayout().btn; const b0 = hero.bag.length; talkTap([r.x + 4, r.y + 4]); L.push({ took: G.mode === 'play' && (hero.bag.length > b0 || Object.values(hero.equip).includes(rw[1])) }); }
// rewards over many rolls
{ const cnt = {}; for (let k = 0; k < 30; k++) for (const it of rewardChoice()) cnt[it.rarity] = (cnt[it.rarity] || 0) + 1; L.push({ rewardRarities: cnt }); }
// salvage
{ const R = rng(9); hero.bag = []; for (let k = 0; k < 8; k++) hero.bag.push(rollItem(R, 2)); const g0 = hero.gold, n = junk().length; openInv('inv'); INV.sel = { item: hero.bag[0], from: 'bag' }; render(); shot('bag-salvage');
  const sb = UI.invBtns.find(b => b.label === 'SALVAGE'); sb.on(); L.push({ salvagedOne: hero.bag.length === 7, gold: hero.gold - g0 });
  const g1 = hero.gold; salvage(junk()); L.push({ worseBefore: n, salvageWorse: hero.bag.length, gold: hero.gold - g1, worseLeft: junk().length }); closeInv(); }
// loot: plate is later now
{ L.push({ plateLvl: ITEM_BASES.plate_mail.lvl, darkPlateLvl: ITEM_BASES.dark_plate.lvl, greyKeep: GREY_KEEP }); let plate = 0, n = 0; const R = rng(3); for (let k = 0; k < 2000; k++) { const it = rollItem(R, 1); if (ITEM_BASES[it.base].slot === 'chest') { n++; if (it.base === 'plate_mail' || it.base === 'dark_plate') plate++; } } L.push({ plateShareOfChestsAtLv1: Math.round(plate / n * 100) + '%' }); }
window.__out = { log: L, shots };
