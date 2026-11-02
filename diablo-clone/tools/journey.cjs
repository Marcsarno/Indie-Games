// Plays through levels 1-12 (towns, forests, dungeons, every boss): checks the exit is reachable,
// kills the boss, fights a few seconds, renders, saves and reloads. Prints one line per level and
// any page errors. Usage: node tools/journey.cjs
const { chromium } = require('playwright'), path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../game/index.html'));
  const log = await p.evaluate(() => {
    Math.random = (() => { let s = 77; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const step = n => { for (let i = 0; i < n; i++) { update(1 / 60); warmStep(80); } };
    const out = [];
    newHero(); G.mode = 'play';
    for (let L = 1; L <= 12; L++) {
      const t0 = performance.now();
      startLevel(L, 1000 + L * 37); hero.hp = STAT.maxHp = 9999;
      const d = bfs(LV.start.cx, LV.start.cy), reach = d[tIdx(LV.stairs.i, LV.stairs.j)] >= 0, bossId = boss ? boss.id : '-';
      if (boss) damageEnemy(boss, 99999, hero.fi, hero.fj, false);
      input.attack = true; step(150); input.attack = false; step(30); render();
      saveGame(); const sv = loadSave();
      out.push(`L${L} ${areaName().padEnd(10)} boss=${bossId.padEnd(11)} exit=${reach ? 'ok' : 'BLOCKED'} enemies=${enemies.length} save=${sv && sv.level === L ? 'ok' : 'FAIL'} ${Math.round(performance.now() - t0)}ms`);
    }
    return out;
  });
  console.log(log.join('\n'));
  if (errs.length) console.log('ERRORS\n' + errs.join('\n')); else console.log('no page errors');
  await b.close();
})();
