// the mage walking in four directions, then casting missiles and a meteor: node magewalk.cjs <gameDir> <out.json>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + dir + '/index.html');
  const res = await p.evaluate(() => {
    Math.random = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    newHero('mage'); hero.lvl = 5; recalcHero(); hero.hp = 9999;
    const R = rng(4); hero.equip.helm = rollItem(R, 1, 'hood'); hero.equip.chest = rollItem(R, 1, 'mystic_robe'); recalcHero();
    G.mode = 'play'; startLevel(1, 777); enemies.length = 0;
    for (let i = 0; i < 600; i++) warmStep(50);
    const fr = [];
    const step = (n, mx, my) => { for (let k = 0; k < n; k++) { input.mx = mx; input.my = my; update(1 / 60); warmStep(30); if (k % 2 === 0) { render(); fr.push(cvs.toDataURL()); } } };
    step(40, 1, 0); step(40, 0, 1); step(40, -1, 0); step(40, 0, -1); step(10, 0, 0);
    hero.dir = 7; input.attack = true; step(36, 0, 0); input.attack = false; step(8, 0, 0);
    hero.mana = 999; CD.meteor = 0; useSkill(2); step(40, 0, 0);
    return { fr, W, H };
  });
  fs.writeFileSync(out, JSON.stringify(res)); if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
