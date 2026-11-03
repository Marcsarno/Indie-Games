// deaths: each family killed by an ordinary blow, then by an overkill crit, the hero standing: node deathcap.cjs <gameDir> <out.json>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + dir + '/index.html');
  const res = await p.evaluate(() => {
    Math.random = (() => { let s = 41; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    newHero(); G.mode = 'play'; const fr = [], labels = [];
    function arena() {
      startLevel(3, 777);
      let best = null, bs = -1;
      for (let i = 4; i < MW - 4; i++) for (let j = 4; j < MH - 4; j++) { let n = 0; for (let a = -5; a <= 5; a++) for (let c = -5; c <= 5; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
      enemies.length = 0; hero.fi = best[0]; hero.fj = best[1]; hero.hp = STAT.maxHp = 9999; hero.dir = dirFrom(-1, 1);
      const ci = Math.floor(hero.fi), cj = Math.floor(hero.fj); for (let j = cj - 6; j <= cj + 6; j++) for (let i = ci - 6; i <= ci + 6; i++) { LV.map[tIdx(i, j)] = FLOOR; LV.solid[tIdx(i, j)] = 0; } computeFlow();
      for (let k = 0; k < 3; k++) update(1 / 60);
    }
    const warm = () => { for (let i = 0; i < 600; i++) warmStep(50); };
    const step = (n, label, cb) => { for (let k = 0; k < n; k++) { cb && cb(k); update(1 / 60); warmStep(30); if (k % 2 === 0) { render(); fr.push(cvs.toDataURL()); labels.push(label); } } };
    for (const [id, label] of [['fallen', 'FALLEN'], ['skeleton', 'SKELETON'], ['ghoulhound', 'HOUND'], ['spider', 'SPIDER']]) {
      for (const big of [false, true]) {
        arena(); const e = makeEnemy(id, hero.fi - 1.3, hero.fj + 1.3, 50); e.state = 'hunt'; e.cool = 99; e.def = Object.assign({}, e.def, { dmg: [0, 0], speed: 0 }); enemies.push(e); warm();
        step(70, label + (big ? ' OVERKILL' : ''), k => { if (k === 8) { e.hp = big ? 5 : 3; G.pierce = true; damageEnemy(e, big ? e.maxHp * 2 + 40 : 5, hero.fi, hero.fj, big, big ? 2 : 0); G.pierce = false; } });
      }
    }
    return { fr, labels };
  });
  fs.writeFileSync(out, JSON.stringify(res)); if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
