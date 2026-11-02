// hero fighting a tough skeleton, attack held: node atkcap.cjs <gameDir> <out> [lookJSON]
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out, lookJ] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + dir + '/index.html');
  const res = await p.evaluate((lookJ) => {
    Math.random = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    newHero(); G.mode = 'play'; startLevel(3, 777);
    if (lookJ) Object.assign(hero.look, JSON.parse(lookJ));
    let best = null, bs = -1;
    for (let i = 2; i < 60; i++) for (let j = 2; j < 60; j++) { let n = 0; for (let a = -3; a <= 3; a++) for (let c = -3; c <= 3; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
    const sk = enemies.find(e => e.id === 'skeleton') || enemies[0];
    enemies.length = 0; enemies.push(sk);
    hero.fi = best[0]; hero.fj = best[1]; sk.fi = best[0] + 1.2; sk.fj = best[1] - 1.2; sk.hp = sk.maxHp = 9999; sk.state = 'hunt'; sk.def = Object.assign({}, sk.def, { dmg: [0, 0] });
    hero.hp = 9999;
    for (let i = 0; i < 600; i++) warmStep(50);
    const fr = [], log = [];
    for (let k = 0; k < 200; k++) {
      input.attack = k < 180; update(1 / 60); warmStep(50);
      if (hero.atk >= 0 && (log.length === 0 || log[log.length - 1] !== hero.clip)) log.push(hero.clip);
      if (k % 2 === 0) { render(); fr.push(cvs.toDataURL()); }
    }
    return { fr, W, H, log, d: Math.hypot(sk.fi - hero.fi, sk.fj - hero.fj).toFixed(2), blocked: blocked(hero.fi, hero.fj) };
  }, lookJ || null);
  console.log(res.log.join(' '), 'dist', res.d, 'inWall', res.blocked);
  fs.writeFileSync(out + '.json', JSON.stringify(res));
  if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
