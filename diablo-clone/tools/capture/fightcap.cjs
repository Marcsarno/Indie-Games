// hero vs a small pack, attack held (taps if TAP=1), old/new feel: node fightcap.cjs <gameDir> <out> <query> [weaponBase]
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out, q, wb] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + dir + '/index.html' + (q || ''));
  const res = await p.evaluate(([wb]) => {
    Math.random = (() => { let s = 9; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    newHero(); G.mode = 'play'; startLevel(3, 777); if (wb) hero.equip.weapon.base = wb; recalcHero();
    let best = null, bs = -1;
    for (let i = 2; i < 38; i++) for (let j = 2; j < 38; j++) { let n = 0; for (let a = -3; a <= 3; a++) for (let c = -3; c <= 3; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
    const sk = enemies.filter(e => e.id === 'skeleton').slice(0, 2), fa = enemies.filter(e => e.id === 'fallen').slice(0, 2);
    const pack = sk.concat(fa); enemies.length = 0; enemies.push(...pack);
    hero.fi = best[0]; hero.fj = best[1]; hero.hp = 9999; hero.dir = 7;
    const spots = [[1.1, -1.0], [1.6, -0.2], [0.4, -1.6], [1.9, -1.4]];
    pack.forEach((e, k) => { e.fi = best[0] + spots[k][0]; e.fj = best[1] + spots[k][1]; e.state = 'hunt'; e.def = Object.assign({}, e.def, { dmg: [0, 0] }); e.hp = e.maxHp = e.maxHp * 2; });
    for (let i = 0; i < 400; i++) warmStep(50);
    const fr = [];
    for (let k = 0; k < 220; k++) {
      input.attack = k < 200; update(1 / 60); warmStep(50);
      if (k % 2 === 0) { render(); fr.push(cvs.toDataURL()); }
    }
    return { fr, W, H, kills: G.kills };
  }, [wb || null]);
  console.log(out, 'kills', res.kills);
  fs.writeFileSync(out + '.json', JSON.stringify(res));
  if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
