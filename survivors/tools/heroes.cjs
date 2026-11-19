// Screenshots of each hero mid-fight (for the user): node survivors/tools/heroes.cjs <outdir>
// Starts each hero at 3:20 with a few levels in, lets the bot play 12 seconds, then shoots.
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const b = await chromium.launch();
  for (const cls of ['mage', 'paladin', 'warrior', 'ranger']) {
    const p = await b.newPage({ viewport: { width: 390, height: 780 } });
    p.on('pageerror', e => console.log(cls, 'PAGEERR', String(e.stack || e).slice(0, 300)));
    await p.goto(`file:///home/user/Indie-Games/survivors/index.html?bot=2&cls=${cls}&nosave=1&t=200&rank=6`);
    await p.waitForTimeout(2500);
    await p.evaluate(() => { for (let k = 0; k < 8; k++) SV.queue++; });
    await p.waitForTimeout(14000);
    await p.screenshot({ path: `${out}/hero-${cls}.png` });
    console.log(cls, await p.evaluate(() => JSON.stringify({ w: Object.fromEntries(Object.entries(SV.w).map(([k, v]) => [k, v.lvl])), foes: enemies.length, hp: Math.round(hero.hp) })));
    await p.close();
  }
  await b.close();
})();
