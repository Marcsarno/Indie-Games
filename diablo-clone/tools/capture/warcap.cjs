// the warrior's kit in a fight: hook a pack in, slam it, whirlwind, then leap to the next group.
// node warcap.cjs <gameDir> <out.json>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + dir + '/index.html');
  const res = await p.evaluate(() => {
    Math.random = (() => { let s = 43; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    newHero('warrior'); hero.lvl = 6; const R = rng(9); hero.equip.weapon = rollItem(R, 3, 'war_axe'); recalcHero(); hero.hp = STAT.maxHp = 9999; hero.mana = STAT.maxMana = 999; G.mode = 'play';
    startLevel(3, 777);
    let best = null, bs = -1;
    for (let i = 4; i < MW - 4; i++) for (let j = 4; j < MH - 4; j++) { let n = 0; for (let a = -5; a <= 5; a++) for (let c = -5; c <= 5; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
    enemies.length = 0; hero.fi = best[0]; hero.fj = best[1];
    const spawn = (id, di, dj) => { const e = makeEnemy(id, hero.fi + di, hero.fj + dj, enemies.length + 50); e.state = 'hunt'; e.hp = e.maxHp = 40; e.def = Object.assign({}, e.def, { dmg: [0, 0] }); e.cool = 3; enemies.push(e); return e; };
    for (const [a, b2] of [[4.5, 0], [4.9, 0.7], [4.8, -0.8], [5.4, 0.2]]) spawn('fallen', a, b2);
    for (const [a, b2] of [[-1.5, -5], [-1.0, -5.6], [-2.1, -5.4]]) spawn('skeleton', a, b2);
    hero.dir = dirFrom(1, 0);
    for (let i = 0; i < 900; i++) warmStep(50);
    const fr = [], labels = [];
    const step = (n, label, cb) => { for (let k = 0; k < n; k++) { cb && cb(k); update(1 / 60); warmStep(30); if (k % 2 === 0) { render(); fr.push(cvs.toDataURL()); labels.push(label); } } };
    step(10, 'CHAIN HOOK'); useSkill(1); step(40, 'CHAIN HOOK');
    useSkill(0); step(50, 'GROUND SLAM');
    useSkill(2); step(56, 'WHIRLWIND');
    useSkill(3); step(60, 'LEAP');
    return { fr, labels };
  });
  fs.writeFileSync(out, JSON.stringify(res)); if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
