// round 26: quests and side areas. Talk to the priest (quests given), kill the hub wolves, walk
// into the wolf den, kill the alpha, take the way out (back at the den door with the hub as it
// was), hand in for the reward; the same for the farm cellar
Math.random = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const run = n => { for (let k = 0; k < n; k++) { update(1 / 60); warmStep(10); } };
const shot = k => { G.actCard = 0; for (let i = 0; i < 90 && G.fade > 0; i++) update(1 / 60); for (let i = 0; i < 300; i++) warmStep(30); G.msg = G.msg.slice(-1); render(); shots[k] = cvs.toDataURL(); };
newHero('warrior'); hero.lvl = 8; recalcHero(); hero.hp = STAT.maxHp = 99999; G.mode = 'play'; startLevel(1, 4242); G.actCard = 0;
const priest = npcs.find(n => n.role === 'priest');
hero.fi = priest.fi + 1; hero.fj = priest.fj; run(2); shot('priest-before');
trade(priest); L.push({ given: Object.keys(G.quests).join(',') });
run(30); shot('tracker');
// the six wolves of step one
const kill = e => { damageEnemy(e, 99999, e.fi - 1, e.fj); run(2); };
for (const e of enemies.filter(e => e.id === 'wolf').slice(0, 6)) kill(e);
L.push({ wolvesStep: G.quests.wolves.step, hubEnemies: enemies.filter(alive).length });
const hubAlive = enemies.filter(alive).length;
// into the den
const [dfi, dfj] = SIDES.den.door(); hero.fi = dfi + 2; hero.fj = dfj; run(5); hero.fi = dfi; hero.fj = dfj; run(60);
L.push({ inSide: LV.side, area: areaName(), leader: enemies.filter(e => e.id === 'alpha').length, others: enemies.filter(e => e.id === 'wolf').length });
shot('den');
const alphaE = enemies.find(e => e.id === 'alpha'); hero.fi = alphaE.fi - 1.5; hero.fj = alphaE.fj; run(20); shot('alpha'); kill(alphaE); run(30);
L.push({ wolvesDone: G.quests.wolves.done });
// the way out
hero.fi = LV.stairs.i + 2.5; hero.fj = LV.stairs.j + 2.5; run(5); hero.fi = LV.stairs.i + 0.5; hero.fj = LV.stairs.j + 0.5; run(60);
L.push({ backInHub: !!LV.hub, atDoor: +Math.hypot(hero.fi - dfi, hero.fj - dfj).toFixed(1), hubAliveKept: enemies.filter(alive).length === hubAlive });
// hand in
hero.fi = priest.fi + 1; hero.fj = priest.fj; run(2); const g0 = hero.gold, items0 = groundItems.length; trade(npcs.find(n => n.role === 'priest'));
L.push({ paid: G.quests.wolves.paid, goldGain: hero.gold - g0, rewardItem: groundItems.length > items0 ? groundItems[groundItems.length - 1].item.rarity : null });
// the cellar
const [cfi, cfj] = SIDES.cellar.door(); hero.fi = cfi + 2; hero.fj = cfj; run(5); hero.fi = cfi; hero.fj = cfj; run(60);
L.push({ cellar: LV.side, chief: enemies.filter(e => e.id === 'banditchief').length, bandits: enemies.filter(e => e.id === 'brigand').length });
shot('cellar');
window.__out = { log: L, shots };
