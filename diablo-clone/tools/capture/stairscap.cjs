// stairs close-ups: node tools/capture/stairscap.cjs <gameDir> <outPrefix>
// puts the hero 3 tiles from the stairs on dungeon floors of each act, renders, crops 200x200 frame px
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + process.argv[2] + '/index.html');
  const shots = await p.evaluate(() => {
    Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const out = {};
    for (const [lv, seed] of [[3, 777], [4, 99], [8, 5], [14, 31]]) {
      newHero('warrior'); hero.lvl = 5; recalcHero(); hero.hp = 9999; G.mode = 'play'; startLevel(lv, seed);
      enemies.length = 0; if (typeof boss !== 'undefined') boss = null;
      const s = LV.stairs;
      let best = [s.i + 0.5, s.j + 0.5];
      for (const [di, dj] of [[3.5, -1.5], [-1.5, 3.5], [3, 0], [0, 3], [-3, 0], [0, -3]]) if (!blocked(s.i + 0.5 + di, s.j + 0.5 + dj)) { best = [s.i + 0.5 + di, s.j + 0.5 + dj]; break; }
      hero.fi = best[0]; hero.fj = best[1];
      for (let i = 0; i < 600; i++) warmStep(50);
      for (let k = 0; k < 30; k++) { update(1 / 60); warmStep(20); }
      render(); out['L' + lv] = cvs.toDataURL(); out['L' + lv + 'pos'] = (() => { const [x, y] = iso(LV.stairs.i + 0.5, LV.stairs.j + 0.5); return [x * SPX - cam2x, y * SPX - cam2y].join(','); })();
    }
    return out;
  });
  for (const k in shots) if (k.endsWith('pos')) console.log(k, shots[k]); else fs.writeFileSync(`${process.argv[3]}-${k}.png`, Buffer.from(shots[k].split(',')[1], 'base64'));
  console.log(Object.keys(shots).join(' '), errs.length ? 'ERR ' + errs.join('\n') : 'no errors'); await b.close(); })();
