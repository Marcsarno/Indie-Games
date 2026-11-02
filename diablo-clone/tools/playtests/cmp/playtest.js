Math.random = (() => { let s = 31; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const shots = {}, log = [];
newHero(); G.mode = 'play'; startLevel(3, 777);
const R = rng(9);
const a = rollItem(R, 4, 'war_axe'), c = rollItem(R, 1, 'cap'), p = rollItem(R, 3, 'plate_mail');
hero.bag.push(a, c, p, rollLegendary(R));
G.mode = 'inv'; INV.sel = { item: a, from: 'bag' }; render(); shots.cmp = cvs.toDataURL();
log.push({ score: itemScore(a), worn: itemScore(hero.equip.weapon), lines: compareLines(a, hero.equip.weapon) });
window.__out = { log, shots };
