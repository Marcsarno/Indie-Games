// round 41: the camp from a few spots, in game: node tools/capture/campshots.cjs <gameDir> <outPrefix>
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(dir, 'index.html'));
  const shots = await p.evaluate(() => {
    newHero('warrior'); G.mode = 'play'; startLevel(1, 4242); G.actCard = 0; G.msg = [];
    const res = [], spots = [['start', HUB.start], ['fire-north', [HUB.camp[0] - 2, HUB.camp[1] - 3]], ['east', [HUB.camp[0] + 4, HUB.camp[1] - 1]], ['west', [HUB.camp[0] - 5, HUB.camp[1] + 3]]];
    for (const [name, at] of spots) { hero.fi = at[0]; hero.fj = at[1]; for (let k = 0; k < 30; k++) update(1 / 60); G.actCard = 0; G.msg = []; for (let i = 0; i < 400; i++) warmStep(30); render(); warmStep(1e4); render(); res.push([name, cvs.toDataURL()]); }
    return res;
  });
  for (const [n, u] of shots) fs.writeFileSync(`${out}-${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  if (errs.length) console.log(errs.join('\n')); await b.close();
})();
