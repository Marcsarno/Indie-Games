// round 39 before/after: the same champion fights (a few seeds and floors), old game vs new
// node tools/capture/elitefight.cjs <gameDir> <outPrefix>
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(dir, 'index.html'));
  const shots = await p.evaluate(() => {
    Math.random = (() => { let s = 9; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const res = [];
    for (const [lvl, seed, t] of [[3, 101, 2.2], [4, 202, 2.6], [8, 303, 2.4]]) {
      newHero('warrior'); hero.lvl = 9; recalcHero(); hero.hp = STAT.maxHp = 99999; G.mode = 'play'; startLevel(lvl, seed);
      const c = enemies.find(e => e.champ); if (!c) continue;
      let best = null; for (let a = 0; a < 16 && !best; a++) { const q = [c.fi + Math.cos(a / 16 * 6.283) * 3, c.fj + Math.sin(a / 16 * 6.283) * 3]; if (standable(q[0], q[1])) best = q; }
      hero.fi = best[0]; hero.fj = best[1]; updateFov(hero.fi, hero.fj); wake(c);
      for (let k = 0; k < t * 60; k++) { update(1 / 60); if (k % 25 === 0) heroAttack(); }
      for (let i = 0; i < 300; i++) warmStep(30); render(); res.push(cvs.toDataURL());
    }
    return res;
  });
  shots.forEach((s, k) => fs.writeFileSync(`${out}-${k}.png`, Buffer.from(s.split(',')[1], 'base64')));
  if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
