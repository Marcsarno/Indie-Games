Math.random = (() => { let s = 17; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const log = [], shots = {};
const step = n => { for (let i = 0; i < n; i++) { update(1 / 60); warmStep(80); } };
newHero(); G.mode = 'play'; hero.hp = STAT.maxHp = 9999;
const levels = []; for (let L = 1; L <= 15; L++) { const a = areaOf(L); if (a.arena) levels.push([L, a.arena]); }
log.push({ bossLevels: levels });
startLevel(5, 5150);   // round 22: the King's Hall ends act I
log.push({ depth: LV.depth, theme: LV.theme, boss: boss && boss.id, eggs: LV.decor.filter(d => d.kind === 'egg').length });
const k = boss; for (const e of enemies) if (e !== k) { e.state = 'sleep'; }
hero.fi = k.fi + 2; hero.fj = k.fj + 1; k.state = 'hunt'; k.special = 0.2;
const n0 = enemies.length; step(90);
log.push({ raised: enemies.filter(e => e.raisedBy === k).length, n0, n1: enemies.length });
render(); shots.king = cvs.toDataURL();
damageEnemy(k, 99999, hero.fi, hero.fj, false); step(40);
log.push({ dead: !bossAlive(), legend: groundItems.some(g => g.item && g.item.rarity === 'legend') });
window.__out = { log, shots };
