// usage: node run.cjs <query> <seconds of game time> <out prefix> [shots...]
const { chromium } = require('playwright');
(async () => {
  const [q, secs, out] = [process.argv[2] || 'bot=1', +(process.argv[3] || 20), process.argv[4] || 'shot'];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('Fetch API')) errs.push(m.text()); });
  await p.goto('file:///home/user/Indie-Games/survivors/index.html?' + q);
  await p.waitForTimeout(1500);
  const t0 = Date.now(); let shots = 0;
  while (true) {
    const s = await p.evaluate(() => ({ t: SV.t, mode: G.mode, lvl: SV.lvl, kills: SV.kills, hp: Math.round(hero.hp), max: STAT.maxHp, foes: enemies.filter(e => e.dying < 0 && e.hp > 0).length, all: enemies.length, cls: hero.cls, guard: SV.guardOn, w: JSON.stringify(Object.fromEntries(Object.entries(SV.w).map(([k, v]) => [k, v.lvl]))), mods: JSON.stringify(SV.mods), pas: JSON.stringify(SV.pas), fps: fpsShown, ms: workShown, gi: groundItems.length }));
    if (Date.now() - t0 > shots * 15000) { console.log(JSON.stringify(s)); await p.screenshot({ path: `${out}${shots}.png` }); shots++; }
    if (s.t >= secs || s.mode === 'svend' || Date.now() - t0 > 400000) { console.log('END', JSON.stringify(s)); await p.screenshot({ path: `${out}-end.png` }); break; }
    await p.waitForTimeout(500);
  }
  console.log('errors:', errs.slice(0, 8).join('\n'));
  await b.close();
})();
