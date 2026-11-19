// node survivors/tools/gemzoom.cjs <tag> (run from a scratch dir: writes z_<tag>_<diff>_<frame>.png): one gem close up, 8 frames over 1.3 s, on grass, by day and night: node gemzoom.cjs <tag>
const { chromium } = require('playwright');
(async () => {
  const tag = process.argv[2]; const b = await chromium.launch();
  for (const diff of [1, 3]) {
    const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 }); p.on('console', m => console.log(m.text()));
    await p.goto(`file:///home/user/Indie-Games/survivors/index.html?cls=mage&nosave=1&open=all&diff=${diff}&bot=2`);
    await p.waitForTimeout(2500);
    const box = await p.evaluate(() => { SV_PARAMS.delete('bot'); enemies.length = 0; groundItems.length = 0;
      window.__g = { gem: XP_GEM.blue, xp: 1, fi: hero.fi + 2.5, fj: hero.fj - 2.5, t: 1 }; groundItems.push(__g); groundItems.push({ gem: XP_GEM.green, xp: 5, fi: hero.fi + 3, fj: hero.fj - 2, t: 1 });
      const c = document.getElementById('c').getBoundingClientRect(); return { l: c.left, t: c.top, s: c.width / W }; });
    for (let f = 0; f < 8; f++) {
      await p.evaluate(() => { enemies.length = 0; __g.fi = hero.fi + 2.5; __g.fj = hero.fj - 2.5; });
      await p.waitForTimeout(40);
      const g = await p.evaluate(() => { const g = __g; const [x, y] = iso(g.fi, g.fj); return { x: x - camX, y: y - camY }; });
      await p.screenshot({ path: `z_${tag}_${diff}_${f}.png`, clip: { x: box.l + (g.x - 10) * box.s, y: box.t + (g.y - 16) * box.s, width: 28 * box.s, height: 24 * box.s } });
      await p.waitForTimeout(165);
    }
    await p.close();
  }
  await b.close();
})();
