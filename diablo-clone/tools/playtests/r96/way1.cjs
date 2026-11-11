// waystones: node way1.cjs <outDir>  (run from diablo-clone/)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const shots = await p.evaluate(() => {
    allocBuffers(270, 480); newHero('warrior'); G.mode = 'play'; G.ways = {}; G.story = { f: { met: true, woodTold: true }, n: 0 }; startLevel(1, 4242); G.actCard = 0;
    const res = [], info = LV.ways.map(w => [w.id, w.fi.toFixed(1), w.fj.toFixed(1)]);
    const snap = (name, at, hud) => { if (at) { hero.fi = at[0]; hero.fj = at[1]; } for (let k = 0; k < 40; k++) update(1 / 60); G.msg = []; G.qBanner = null; for (let i = 0; i < 600; i++) warmStep(30); render(); warmStep(1e4); render(); res.push([name, cvs.toDataURL()]); };
    const c = LV.ways[0];
    snap('1-camp-near', [c.fi - 1.6, c.fj - 2.2]);
    snap('2-camp-on', [c.fi + 0.2, c.fj + 0.3]);
    for (const w of LV.ways.slice(1)) snap('3-asleep-' + w.id, [w.fi - 1.5, w.fj - 1.8]);
    const g = LV.ways[1]; hero.fi = g.fi; hero.fj = g.fj; update(1 / 60); snap('4-woken-' + g.id, [g.fi + 0.3, g.fj + 0.4]);
    openWays(c); render(); res.push(['5-map', cvs.toDataURL()]);
    WAYS.sel = g.key; render(); res.push(['6-map-sel', cvs.toDataURL()]);
    return { res, info, ways: G.ways };
  });
  for (const [n, u] of shots.res) fs.writeFileSync(`${out}/${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  console.log(JSON.stringify(shots.info), Object.keys(shots.ways));
  console.log(errs.length ? errs.join('\n') : 'ok'); await b.close();
})();
