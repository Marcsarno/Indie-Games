// the mage against a pack: missiles held, fireball, cone of cold, a meteor, then a blink. node magecap.cjs <gameDir> <out.json>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + dir + '/index.html');
  const res = await p.evaluate(() => {
    Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    newHero('mage'); hero.lvl = 5; recalcHero(); hero.hp = 9999; G.mode = 'play'; startLevel(3, 777);
    let best = null, bs = -1;
    for (let i = 2; i < 38; i++) for (let j = 2; j < 38; j++) { let n = 0; for (let a = -3; a <= 3; a++) for (let c = -3; c <= 3; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
    const pack = enemies.filter(e => e.id === 'skeleton' || e.id === 'fallen').slice(0, 6); enemies.length = 0; enemies.push(...pack);
    hero.fi = best[0] - 0.8; hero.fj = best[1] + 0.8; hero.dir = 7;
    const spots = [[2.6, -2.2], [3.2, -1.2], [2.0, -3.0], [3.6, -2.6], [2.8, -0.6], [3.8, -1.8]];
    pack.forEach((e, k) => { e.fi = hero.fi + spots[k][0]; e.fj = hero.fj + spots[k][1]; e.state = 'hunt'; e.def = Object.assign({}, e.def, { dmg: [0, 0] }); e.hp = e.maxHp = 45; });
    for (let i = 0; i < 500; i++) warmStep(50);
    const fr = [], labels = []; let lab = 'MISSILES';
    const step = (n, cb) => { for (let k = 0; k < n; k++) { cb && cb(k); update(1 / 60); warmStep(30); if (k % 2 === 0) { render(); fr.push(cvs.toDataURL()); labels.push(lab); } } };
    input.attack = true; step(54); input.attack = false; step(6);
    hero.mana = STAT.maxMana; lab = 'FIREBALL'; useSkill(0); step(40);
    lab = 'CONE OF COLD'; useSkill(1); step(50);
    lab = 'METEOR'; useSkill(2); step(80);
    lab = 'BLINK'; input.mx = -1; input.my = 0.3; useSkill(3); input.mx = 0; input.my = 0; step(30);
    return { fr, labels, W, H };
  });
  fs.writeFileSync(out, JSON.stringify(res)); if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
