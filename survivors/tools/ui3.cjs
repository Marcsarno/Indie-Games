// Screens of round 4: an evolution, an ultimate per hero, the victory choice, the picks page. node ui3.cjs <outdir>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const b = await chromium.launch();
  for (const cls of ['mage', 'paladin', 'warrior', 'ranger']) {
    const p = await b.newPage({ viewport: { width: 390, height: 780 } });
    const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    await p.goto(`file:///home/user/Indie-Games/survivors/index.html?cls=${cls}&nosave=1&bot=2&t=300&rank=5`); await p.waitForTimeout(2500);
    // an evolution: the starting skill at 5 with its partner, then a chest
    await p.evaluate(() => { const id = SV_HEROES[SV.cls].start; SV.w[id].lvl = 5; SV.pas[SV_EVO[id][0]] = 1; SV.lvl = 16; recalcHero(); svChest(); });
    await p.waitForTimeout(700); if (cls === 'mage' || cls === 'warrior') await p.screenshot({ path: `${out}/u3-evo-${cls}.png` });
    await p.evaluate(() => { for (let k = 0; k < 14; k++) svSpawn('skeleton', hero.fi + Math.cos(k) * 2.5, hero.fj + Math.sin(k) * 2.5, { noChamp: true }); SV.ult = 100; });
    await p.waitForTimeout(1600); await p.screenshot({ path: `${out}/u3-ult-${cls}.png` });
    if (cls === 'paladin') {
      await p.evaluate(() => { svVictory = svVictory; G.mode = 'play'; SV.won = true; });
      await p.evaluate(() => { const v = svVictory; v(); }); await p.waitForTimeout(2200); await p.screenshot({ path: `${out}/u3-win.png` });
      await p.evaluate(() => svEnd(true)); await p.waitForTimeout(1500); await p.evaluate(() => { SV.endPage = 'picks'; }); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/u3-picks.png` });
    }
    console.log(cls, await p.evaluate(() => JSON.stringify({ evo: SV.evo, ult: SV.ult, ultOn: !!hero.ultOn, wing: !!hero.wing, errs: SV.errs || [] })), errs.slice(0, 3));
    await p.close();
  }
  await b.close();
})();
