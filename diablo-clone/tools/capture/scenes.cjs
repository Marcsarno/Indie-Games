// screenshots: node shot.cjs <gameDir> <outPrefix> ; dungeon fight (mage + warrior), forest, town
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + process.argv[2] + '/index.html');
  const shots = await p.evaluate(() => {
    Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const out = {};
    const scene = (cls, lv, seed, name, fight) => {
      newHero(cls); hero.lvl = 5; recalcHero(); hero.hp = 9999; G.mode = 'play'; startLevel(lv, seed);
      if (fight) {
        let best = null, bs = -1;
        for (let i = 2; i < MW - 2; i++) for (let j = 2; j < MH - 2; j++) { let n = 0; for (let a = -3; a <= 3; a++) for (let c = -3; c <= 3; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
        const pack = enemies.filter(e => e.id === 'skeleton' || e.id === 'fallen').slice(0, 5); enemies.length = 0; enemies.push(...pack);
        hero.fi = best[0]; hero.fj = best[1];
        pack.forEach((e, k) => { e.fi = hero.fi + 1.2 + k * 0.5; e.fj = hero.fj - 1.0 - (k % 2) * 0.8; e.state = 'hunt'; e.def = Object.assign({}, e.def, { dmg: [0, 0] }); e.hp = e.maxHp = 60; });
      }
      for (let i = 0; i < 600; i++) warmStep(50);
      input.attack = !!fight; for (let k = 0; k < 40; k++) { update(1 / 60); warmStep(20); } input.attack = false;
      render(); out[name] = cvs.toDataURL();
    };
    scene('mage', 3, 777, 'crypt-mage', true);
    scene('warrior', 3, 777, 'crypt-war', true);
    scene('warrior', 2, 4242, 'forest', false);
    scene('mage', 1, 777, 'town', false);
    return out;
  });
  for (const k in shots) fs.writeFileSync(`${process.argv[3]}-${k}.png`, Buffer.from(shots[k].split(',')[1], 'base64'));
  console.log(Object.keys(shots).join(' '), errs.length ? 'ERR ' + errs.join('\n') : 'no errors'); await b.close(); })();
