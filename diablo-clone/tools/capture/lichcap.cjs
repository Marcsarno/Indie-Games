// the lich fight: rings dodged and taken, a bone wall, then phase 2 (blue fire, wraiths, teleports).
// node lichcap.cjs <gameDir> <out.json>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + dir + '/index.html');
  const res = await p.evaluate(() => {
    Math.random = (() => { let s = 31; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    newHero('mage'); hero.lvl = 10; recalcHero(); hero.hp = STAT.maxHp = 99999; hero.mana = STAT.maxMana = 999; G.mode = 'play';
    startLevel(15, 1000 + 15 * 37);
    const L = boss; for (const e of enemies) if (e !== L) { e.hp = 0; e.dying = 0; e.corpse = true; }
    hero.fi = L.fi + 4; hero.fj = L.fj + 1; wake(L);
    for (let i = 0; i < 900; i++) warmStep(50);
    const fr = [], labels = [];
    const step = (n, label, cb) => { for (let k = 0; k < n; k++) { cb && cb(k); update(1 / 60); warmStep(30); if (k % 2 === 0) { render(); fr.push(cvs.toDataURL()); labels.push(label); } } };
    step(60, 'THE LICH WAKES');
    L.special = 9; L.castT = 0.55; L.pattern = 'ring';
    step(70, 'A RING OF FROST: FIND THE GAP', k => { input.attack = k % 30 < 14; });
    L.special = 9; L.castT = 0.55; L.pattern = 'wall';
    step(110, 'BONES ERUPT ACROSS YOUR PATH', k => { input.attack = false; input.mx = k > 20 && k < 40 ? 0.7 : 0; input.my = k > 20 && k < 40 ? -0.7 : 0; });
    input.mx = input.my = 0;
    damageEnemy(L, Math.ceil(L.maxHp * 0.55), hero.fi, hero.fj);
    step(200, 'PHASE 2: COLD FIRE, WRAITHS, TELEPORTS', k => { input.attack = k % 24 < 10; if (k === 100) useSkill(2); });
    input.attack = false;
    return { fr, labels };
  });
  fs.writeFileSync(out, JSON.stringify(res)); if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
