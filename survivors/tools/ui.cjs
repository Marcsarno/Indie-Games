const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 780 } });
  p.on('pageerror', e => console.log('PAGEERR', String(e.stack || e).slice(0, 300)));
  await p.goto('file:///home/user/Indie-Games/survivors/index.html');
  await p.waitForTimeout(1500); await p.screenshot({ path: 'ui-title.png' });
  await p.mouse.click(195, 400); await p.waitForTimeout(2500);
  await p.evaluate(() => { SV.w.fireball = { lvl: 2, cd: 1 }; SV.pas.might = 1; SV.queue = 1; });
  await p.waitForTimeout(800); await p.screenshot({ path: 'ui-cards.png' });
  const fb = await p.evaluate(() => SV.cards.findIndex(c => c.id === 'fireball'));
  if (fb < 0) await p.evaluate(() => { SV.cards[0] = { kind: 'w', id: 'fireball', name: 'FIREBALL', line: 'LEVEL 3', desc: SV_WLVL[3] }; });
  await p.waitForTimeout(300); await p.screenshot({ path: 'ui-cards2.png' });
  await p.evaluate(() => svPick(SV.cards.findIndex(c => c.id === 'fireball')));
  await p.waitForTimeout(500); await p.screenshot({ path: 'ui-rune.png' });
  await p.evaluate(() => svPick(1)); await p.waitForTimeout(3000);
  await p.evaluate(() => { SV.t = 100; svEnd(false); }); await p.waitForTimeout(1500); await p.screenshot({ path: 'ui-end.png' });
  await b.close();
})();
