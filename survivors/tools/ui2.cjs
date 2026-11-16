const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 780 } });
  p.on('pageerror', e => console.log('PAGEERR', String(e.stack || e).slice(0, 300)));
  await p.goto('file:///home/user/Indie-Games/survivors/index.html');
  await p.waitForTimeout(1500); await p.screenshot({ path: 'u-title.png' });
  const r = await p.evaluate(() => { const R = svHeroRects()[1], c = cvs.getBoundingClientRect(); return [c.left + (R.x + 20) / W * c.width, c.top + (R.y + 20) / H * c.height]; });
  await p.mouse.click(r[0], r[1]); await p.waitForTimeout(2500);
  await p.evaluate(() => { SV.t = 200; for (let k = 0; k < 14; k++) svSpawn('skeleton', hero.fi + Math.cos(k) * 1.6, hero.fj + Math.sin(k) * 1.6); SV.queue = 1; });
  await p.waitForTimeout(700); await p.screenshot({ path: 'u-cards.png' });
  await p.evaluate(() => svPick(0)); await p.waitForTimeout(1200);
  await p.evaluate(() => { G.mode = 'play'; SV.guardOn = true; }); await p.waitForTimeout(900); await p.screenshot({ path: 'u-fight.png' });
  console.log(await p.evaluate(() => JSON.stringify({ mode: G.mode, cls: hero.cls, guard: SV.guardOn, counter: SV.counterT > G.t, hp: hero.hp, kills: SV.kills })));
  await b.close();
})();
