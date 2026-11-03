// round 23: the lich in the Sanctum. Rings (hit when not in a gap, safe in one), bone walls (block
// tiles, then fall), phase 2 (blue braziers, wraiths, teleports), death and loot
Math.random = (() => { let s = 23; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const log = [], shots = {};
const step = n => { for (let i = 0; i < n; i++) { update(1 / 60); warmStep(60); } };
newHero(); G.mode = 'play'; hero.lvl = 10; recalcHero(); hero.hp = STAT.maxHp = 99999;
startLevel(15, 1000 + 15 * 37);
const L = boss; log.push({ area: areaName(), boss: L && L.id, phase: L.phase });
for (const e of enemies) if (e !== L) e.hp = 0, e.dying = 0, e.corpse = true;
hero.fi = L.fi + 3.5; hero.fj = L.fj + 0.5; wake(L); L.state = 'hunt';
// force a ring and stand still: it hits unless a gap happens to face the hero
step(5); L.special = 0; L.pattern = null; L.castT = 0; lichRing(L, false); const ringHp = hero.hp;
const R = G.rings[0], a = Math.atan2(hero.fj - R.fj, hero.fi - R.fi);
R.gaps = [a + 1.5, a - 1.5];   // gaps away from the hero
for (let k = 0; k < 90 && !R.hit; k++) { update(1 / 60); }
log.push({ ringHit: R.hit, ringDamage: ringHp - hero.hp, chilled: hero.chillT > 0 });
render(); shots.ring = cvs.toDataURL();
// a ring with a gap facing the hero: no hit
G.rings = []; lichRing(L, false); const R2 = G.rings[0]; R2.gaps = [Math.atan2(hero.fj - R2.fj, hero.fi - R2.fi), 0]; const hp2 = hero.hp;
for (let k = 0; k < 120; k++) update(1 / 60);
log.push({ gapDodged: !R2.hit });
// bone wall
G.rings = []; lichWall(L); const Wl = G.walls[0]; step(50);
log.push({ wallTiles: Wl.tiles.length, wallSolid: Wl.tiles.filter(k => LV.solid[k]).length });
render(); shots.wall = cvs.toDataURL();
step(400); log.push({ wallGone: Wl.tiles.every(k => !LV.solid[k]) });
// phase 2
const n0 = enemies.filter(alive).length;
damageEnemy(L, Math.ceil(L.maxHp * 0.55), hero.fi, hero.fj); step(10);
const blue = fires.filter(f => f.blue).length;
let tele = 0; const p0 = [L.fi, L.fj];
for (let k = 0; k < 900 && !tele; k++) { update(1 / 60); if (Math.hypot(L.fi - p0[0], L.fj - p0[1]) > 1.5) tele = k; }
log.push({ phase: L.phase, blueBraziers: blue, wraiths: enemies.filter(e => alive(e) && e.id === 'wraith').length - 0, enemiesBefore: n0, teleportedAfterFrames: tele });
render(); shots.phase2 = cvs.toDataURL();
damageEnemy(L, 99999, hero.fi, hero.fj); step(60);
log.push({ dead: !bossAlive(), legend: groundItems.some(g => g.item && g.item.rarity === 'legend') });
window.__out = { log, shots };
