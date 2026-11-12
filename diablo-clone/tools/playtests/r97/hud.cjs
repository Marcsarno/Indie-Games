const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const R = await p.evaluate(() => { const shots = [];
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'paladin'); G.story = { f: { met: true, woodTold: true }, n: 0 }; G.actCard = 0; hero.lvl = 6; recalcHero();
    const warm = () => { for (let i = 0; i < 800; i++) warmStep(40); };
    for (let k = 0; k < 20; k++) update(1 / 60); G.msg = [];
    hero.ult = 62; warm(); render(); shots.push(['hud-62', cvs.toDataURL()]);
    hero.ult = 100; G.t += 0.13; render(); shots.push(['hud-100', cvs.toDataURL()]);
    hero.ult = 100; useUlt(); for (let k = 0; k < 30; k++) update(1 / 60); G.msg = []; warm(); render(); shots.push(['hud-arch', cvs.toDataURL()]);
    const R0 = rng(4); for (const id of ['pal_plate2', 'pal_plate3', 'pal_plate4', 'pal_plate5', 'pal_helm2', 'pal_helm3', 'pal_helm4', 'pal_shield2', 'pal_shield3', 'pal_shield4', 'pal_warhammer', 'pal_maul', 'pal_maul2', 'pal_dawn', 'pal_mace']) { const it = rollItem(R0, 5, id); hero.bag.push(it); }
    openInv('inv'); INV.sel = { item: hero.bag[3], from: 'bag' }; render(); shots.push(['inv', cvs.toDataURL()]);
    return shots; });
  for (const [n, u] of R) fs.writeFileSync(`${out}/${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  console.log(errs.join('\n') || 'ok'); await b.close(); })();
