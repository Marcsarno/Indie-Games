// round 42b: the Act I story from first word to last. Each step unlocks the next; things done out
// of order still count; the mine is chained until the key; rewards are a choice of three; the camp
// changes; old saves convert; the cage and the sacks never cut a side area in two
Math.random = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const run = n => { for (let k = 0; k < n; k++) { update(1 / 60); warmStep(10); } };
const shot = k => { G.actCard = 0; for (let i = 0; i < 90 && G.fade > 0; i++) update(1 / 60); for (let i = 0; i < 300; i++) warmStep(30); render(); shots[k] = cvs.toDataURL(); };
const who = r => npcs.find(n => n.role === r);
const goTo = (fi, fj) => { hero.fi = fi; hero.fj = fj; hero.goTalk = null; run(2); };
const finish = (pick = 0) => { let pages = 0, btn = null, reward = 0; while (G.mode === 'talk') { const T = G.talk; T.t = 99; T.typed = true; if (T.k < T.pages.length - 1) { T.k++; pages++; continue; } pages++; btn = T.btn; if (T.reward) { reward = T.reward.length; T.pick = pick; } closeTalk(); } return { pages, btn, reward }; };
const talk = r => { const n = who(r); goTo(n.fi + 1.1, n.fj); talkTo(n); return finish(); };
const enter = k => { const [fi, fj] = SIDES[k].door(); goTo(fi + 2, fj); goTo(fi, fj); run(60); };
const leave = () => { goTo(LV.stairs.i + 2.5, LV.stairs.j + 2.5); goTo(LV.stairs.i + 0.5, LV.stairs.j + 0.5); run(60); };
const kill = e => { damageEnemy(e, 99999, e.fi - 1, e.fj); run(2); };
newHero('warrior'); hero.lvl = 8; recalcHero(); hero.hp = STAT.maxHp = 99999; G.mode = 'play'; G.story = null; startLevel(1, 4242); G.actCard = 0;
const st = () => storyStage();
{ const sm = npcs.find(n => n.role === 'merchant'); goTo(sm.fi + 1.1, sm.fj); L.push({ merchantButton: (actionTarget() || {}).label }); goTo(HUB.camp[0] + 6, HUB.camp[1] + 6); L.push({ nothingNear: actionTarget() === null }); }
L.push({ start: st(), people: npcs.filter(n => n.name).map(n => n.name).join(','), treeDown: !!LV.treeBlock, osricMark: storyMark('priest'), tracker: stageText(st()) });
// the first words, on screen
{ const n = who('priest'); goTo(n.fi + 1.1, n.fj); run(10); shot('osric-near'); talkTo(n); G.talk.t = 99; render(); shots['talk'] = cvs.toDataURL(); }
L.push({ osric: finish(), next: st(), wrenMark: storyMark('wren') });
// tap a person: the hero walks over and talks
{ const n = who('wren'); goTo(n.fi + 4, n.fj + 2); hero.goTalk = n; hero.goTalkT = 6; let k = 0; while (G.mode !== 'talk' && k++ < 400) run(1); L.push({ tapToTalk: G.mode === 'talk', frames: k }); }
L.push({ wren: finish(), next: st(), tracker: stageText(st()), target: (storyTarget() || []).map(v => +v.toFixed(1)).join(',') });
shot('tracker');
// the den: Aldo in his cage won't go until the Alpha is dead
const hubAlive = enemies.filter(alive).length; enter('den'); L.push({ inDen: LV.side, aldoCaged: !!who('aldo'), cage: dynProps.filter(p => p.kind === 'cage').length });
{ const a = enemies.find(e => e.id === 'alpha'), al = who('aldo'); for (const e of enemies) if (e !== a) { e.state = 'sleep'; } goTo(al.fi + 1.2, al.fj + 0.3); run(20); shot('cage'); talkTo(al); L.push({ beforeAlpha: finish(), stillCaged: !storyF().aldoFree }); kill(a); L.push({ afterAlpha: st() }); goTo(al.fi + 1.2, al.fj + 0.3); run(2); render(); const act = actionTarget(); shot('free-button'); L.push({ denButton: act && act.label, buttonArea: !!UI.act });
  { const r = UI.act, ev = new PointerEvent('pointerdown', { clientX: 0, clientY: 0, pointerId: 9 }); const b = cvs.getBoundingClientRect(); cvs.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, clientX: b.left + (r.x + r.w / 2) / W * b.width, clientY: b.top + (r.y + r.h / 2) / H * b.height })); cvs.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9 })); void ev; L.push({ tappedButtonOpensTalk: G.mode === 'talk' }); }
  L.push({ free: finish(), next: st() }); run(90); shot('cage-open'); L.push({ aldoGone: !who('aldo'), cageOpen: dynProps.find(p => p.kind === 'cage').open }); }
leave(); L.push({ back: !!LV.hub, aldoHome: !!who('aldo'), hubKeptAsLeft: enemies.filter(alive).length === hubAlive });
const items0 = hero.bag.length, gold0 = hero.gold;
{ const n = who('wren'); goTo(n.fi + 1.1, n.fj); talkTo(n); const T = G.talk; T.t = 99; T.typed = true; T.k = T.pages.length - 1; T.pick = 1; render(); shots['reward'] = cvs.toDataURL(); T.pick = 0; L.push({ rewardChoice: T.reward.map(it => itemName(it) + ' (' + ITEM_BASES[it.base].slot + ')').join(' | ') }); }
L.push({ wrenCollect: finish(1), gotItem: hero.bag.length > items0 || hero.equip.ring || 0, gold: hero.gold - gold0, next: st() });
// the campfire heals now
{ goTo(HUB.camp[0] + 1.8, HUB.camp[1] + 1); STAT.maxHp = 1000; hero.hp = 100; run(60); L.push({ fireHealsPerSecond: Math.round(hero.hp - 100) }); hero.hp = STAT.maxHp = 99999; }
// the mine is chained (round 48c: north, in the Riverlands)
startLevel(2, 4242); run(5);
{ const s = LV.stairs; goTo(s.i + 1.5, s.j + 1.5); run(5); shot('mine'); goTo(s.i + 0.5, s.j + 0.5); run(30); L.push({ minebarred: !!LV.riv && !G.fadeTo, msgs: G.msg.map(m => m.text).join(' / '), next: st() }); }
startLevel(1, 4242); run(5); L.push({ hollis: talk('hollis'), next: st() });
startLevel(2, 4242); run(5);
// four bandits on the farm, then the chief in the cellar (he drops the key and the letter)
for (const e of enemies.filter(e => e.id === 'brigand' && alive(e)).slice(0, 4)) kill(e);
L.push({ afterBandits: st(), tracker: stageText(st()) });
enter('cellar'); L.push({ cellar: LV.side, sacks: LV.decor.filter(d => d.kind === 'sacks').length, msgs: G.msg.map(m => m.text).join(' / ') });
{ const c = enemies.find(e => e.id === 'banditchief'); for (const e of enemies) if (e !== c) e.state = 'sleep'; const sk = LV.decor.find(d => d.kind === 'sacks'); goTo(sk.i + 1.5, sk.j + 1.5); run(20); shot('sacks'); kill(c); L.push({ afterChief: st() }); }
leave(); startLevel(1, 4242); run(5);
L.push({ hollisCollect: talk('hollis'), next: st(), potion: potionPrice() });
L.push({ letter: talk('priest'), next: st() });
// the key opens the mine
startLevel(2, 4242); run(5);
{ const s = LV.stairs; goTo(s.i + 1.5, s.j + 1.5); const ma = actionTarget(); L.push({ mineButton: ma && ma.label }); doAction(ma); run(5); L.push({ mineSprite: LV.decor.some(d => d.kind === 'mine'), stillBarred: LV.decor.some(d => d.kind === 'minebarred') }); goTo(s.i + 0.5, s.j + 0.5); run(70); L.push({ down: !LV.hub, area: areaName(), next: st() }); }
// the King falls (the hall's stairs take you home with the gate open), then Osric
G.gates = { 0: true }; startLevel(1, 4242); run(5);
L.push({ homeStage: st(), hollisInCamp: !!who('hollis'), kingCollect: talk('priest'), end: st() });
// out of order: the Alpha and Aldo before Wren ever asks
G.story = null; startLevel(1, 4242); talk('priest'); enter('den'); kill(enemies.find(e => e.id === 'alpha')); talkTo(who('aldo')); finish(); leave();
L.push({ outOfOrder: st(), wrenMark: storyMark('wren') });
// old saves
G.gates = null; L.push({ convert: ['none', 'given', 'wolvesDone', 'wolvesPaid', 'banditsPaid', 'king'].map((k, n) => { G.story = convertQuests([null, { wolves: {}, bandits: {}, mine: {} }, { wolves: { done: 1 }, bandits: {}, mine: {} }, { wolves: { done: 1, paid: 1 }, bandits: {}, mine: {} }, { wolves: { done: 1, paid: 1 }, bandits: { done: 1, paid: 1 }, mine: {} }, { wolves: { done: 1, paid: 1 }, bandits: { done: 1, paid: 1 }, mine: { done: 1 } }][n], n === 5 ? { 0: true } : null); G.gates = n === 5 ? { 0: true } : null; return k + ':' + st(); }).join(' ') }); G.gates = null;
// the cage and the sacks never cut a side area in two (40 seeds each)
{ let bad = 0, cages = 0, sacks = 0; G.story = null;
  for (const kind of ['den', 'cellar']) for (let s = 0; s < 40; s++) { genLevel(1, (s * 7919 + 13) >>> 0, kind); cages += LV.decor.filter(d => d.kind === 'cage').length; sacks += LV.decor.filter(d => d.kind === 'sacks').length;
    const seen = new Uint8Array(MW * MH), q = [[LV.stairs.i, LV.stairs.j]]; seen[tIdx(LV.stairs.i, LV.stairs.j)] = 1;
    while (q.length) { const [i, j] = q.pop(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b, t = tIdx(x, y); if (x < 0 || y < 0 || x >= MW || y >= MH || seen[t] || tileAt(x, y) !== FLOOR || LV.solid[t]) continue; seen[t] = 1; q.push([x, y]); } }
    if (LV.spawns.some(sp => !seen[tIdx(Math.floor(sp.fi), Math.floor(sp.fj))])) bad++; }
  L.push({ sideMaps: 80, cages, sacks, unreachableLeaders: bad }); }
window.__out = { log: L, shots };
