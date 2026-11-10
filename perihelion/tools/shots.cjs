// Plays the game with the built-in bot (?bot=1) and saves screenshots. node tools/shots.cjs <outdir>
const { chromium } = require('playwright'), path = require('path');
(async () => {
  const out = process.argv[2] || '.';
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 400, height: 780 }, deviceScaleFactor: 1 });
  const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const url = 'file://' + path.join(__dirname, '..', 'index.html');
  await pg.goto(url); await pg.waitForTimeout(1200);
  await pg.screenshot({ path: path.join(out, 'title.png') });
  await pg.goto(url + '?bot=1');
  let bestSeen = 0, deaths = 0, prev = 'ready';
  for (let i = 0; i < 60; i++) {
    await pg.waitForTimeout(1000);
    const s = await pg.evaluate(() => { const s = window.__peri.s; return { state: s.state, score: s.score, maxI: s.maxI, shield: s.shield, parts: s.parts }; });
    if (s.state === 'dead' && prev !== 'dead') { deaths++; if (deaths <= 2) await pg.screenshot({ path: path.join(out, `dead${deaths}.png`) }); }
    prev = s.state; bestSeen = Math.max(bestSeen, s.maxI);
    if ([4, 10, 18, 30, 45].includes(i)) await pg.screenshot({ path: path.join(out, `play${i}.png`) });
  }
  console.log(JSON.stringify({ bestSeen, deaths, errs }));
  const wide = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await wide.goto(url + '?bot=1'); await wide.waitForTimeout(6000); await wide.screenshot({ path: path.join(out, 'wide.png') });
  await b.close();
})();
