// groups noticing and coming at a standing hero, three scenes: node packcap.cjs <gameDir> <out.json>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + dir + '/index.html');
  const res = await p.evaluate(() => {
    Math.random = (() => { let s = 33; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    newHero(); G.mode = 'play'; const fr = [], labels = [];
    function arena() {
      startLevel(3, 777);
      let best = null, bs = -1;
      for (let i = 4; i < MW - 4; i++) for (let j = 4; j < MH - 4; j++) { let n = 0; for (let a = -5; a <= 5; a++) for (let c = -5; c <= 5; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
      enemies.length = 0; hero.fi = best[0]; hero.fj = best[1]; hero.hp = STAT.maxHp = 99999; hero.dir = dirFrom(-1, 1);
      const ci = Math.floor(hero.fi), cj = Math.floor(hero.fj); for (let j = cj - 8; j <= cj + 8; j++) for (let i = ci - 8; i <= ci + 8; i++) { LV.map[tIdx(i, j)] = FLOOR; LV.solid[tIdx(i, j)] = 0; } computeFlow();
      for (let k = 0; k < 3; k++) update(1 / 60);
    }
    const spawn = (id, di, dj) => { const e = makeEnemy(id, hero.fi + di, hero.fj + dj, enemies.length + 50); e.state = 'sleep'; e.def = Object.assign({}, e.def, { dmg: [0, 0] }); e.hp = e.maxHp = 999; enemies.push(e); return e; };
    const warm = () => { for (let i = 0; i < 700; i++) warmStep(50); };
    const step = (n, label) => { for (let k = 0; k < n; k++) { update(1 / 60); warmStep(30); if (k % 2 === 0) { render(); fr.push(cvs.toDataURL()); labels.push(label); } } };
    // the sleepers are out of sight range at first; the hero takes a step toward them to be seen
    const scene = (label, list) => { arena(); for (const [id, a, b2] of list) spawn(id, a, b2); warm(); hero.fi -= 0.2; hero.fj += 0.2; step(200, label); };
    scene('A PACK OF FALLEN', [['fallen', -5.5, 3], ['fallen', -6, 4], ['fallen', -4.5, 4.5], ['fallen', -6.5, 2.5], ['fallen', -5, 5.5]]);
    scene('WOLVES', [['wolf', -5.5, 3.5], ['wolf', -6, 4.5], ['wolf', -4.8, 5]]);
    scene('SKELETONS AND A SPIDER', [['skeleton', -5, 3.5], ['skeleton', -6, 4.5], ['spider', -4.5, 5]]);
    return { fr, labels };
  });
  fs.writeFileSync(out, JSON.stringify(res)); if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
