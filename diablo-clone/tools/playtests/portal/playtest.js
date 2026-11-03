// town portal round trip: open a portal in a dungeon, go to town, come back to the same spot with
// the level as it was (kills, loot, explored map)
Math.random = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {}; const log = (...a) => L.push(a.join(' ')); const shot = k => { G.actCard = 0; for (let i = 0; i < 90 && G.fade > 0; i++) update(1 / 60); for (let i = 0; i < 200; i++) warmStep(30); render(); shots[k] = cvs.toDataURL(); };
newHero('warrior'); hero.lvl = 5; recalcHero(); hero.hp = 9999; G.mode = 'play';
startLevel(1, 4242); const townLevel = LV.level, townSeed = LV.seed;
startLevel(3, 777);
const step = n => { for (let k = 0; k < n; k++) { update(1 / 60); warmStep(10); } };
for (const e of enemies) e.state = 'sleep';
const n0 = enemies.length; enemies.slice(0, 3).forEach(e => { e.hp = 0; e.dying = 0; e.corpse = true; });
groundItems.push({ gold: 77, fi: 5.5, fj: 5.5, t: 1 });
const seenBefore = LV.seen.reduce((a, b) => a + b, 0);
step(5); usePortal(); step(40);
log('portal open', !!G.tp, G.tp && G.tp.fi.toFixed(2), G.tp && G.tp.fj.toFixed(2));
shot('dungeon-portal');
const spot = [G.tp.fi, G.tp.fj];
hero.fi = spot[0]; hero.fj = spot[1]; step(40);
log('after entering: area', LV.area, 'level', LV.level, 'return portal', !!(G.tp && G.tp.back));
shot('town-portal');
step(40); hero.fi = G.tp.fi; hero.fj = G.tp.fj; step(40);
log('back: level', LV.level, 'area', LV.area, 'hero at', hero.fi.toFixed(2), hero.fj.toFixed(2), 'spot', spot.map(v => v.toFixed(2)).join(','));
log('enemies', enemies.length, 'of', n0, 'dead kept', enemies.slice(0, 3).every(e => e.corpse), 'gold item kept', groundItems.some(g => g.gold === 77), 'seen kept', LV.seen.reduce((a, b) => a + b, 0) >= seenBefore, 'portal closed', !G.tp);
shot('back');
window.__out = { log: L, shots };
