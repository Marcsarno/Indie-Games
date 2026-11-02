Math.random = (() => { let s = 77; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const log = [], shots = {};
const step = n => { for (let i = 0; i < n; i++) { update(1 / 60); warmStep(80); } };
newHero(); G.mode = 'play';
for (let L = 1; L <= 12; L++) {
  const t0 = performance.now();
  startLevel(L, 1000 + L * 37);
  hero.hp = STAT.maxHp = 9999;
  const d = bfs(LV.start.cx, LV.start.cy), reach = d[tIdx(LV.stairs.i, LV.stairs.j)] >= 0;
  const bossId = boss ? boss.id : null;
  if (boss) damageEnemy(boss, 99999, hero.fi, hero.fj, false);
  input.attack = true; step(150); input.attack = false; step(30);
  render();
  if (L === 6 || L === 10) shots['L' + L] = cvs.toDataURL();
  saveGame(); const sv = loadSave();
  log.push({ L, area: LV.area, name: areaName(), boss: bossId, bossDead: !bossAlive(), stairsReach: reach, enemies: enemies.length, ms: Math.round(performance.now() - t0), save: sv && sv.level === L });
}
window.__out = { log, shots };
