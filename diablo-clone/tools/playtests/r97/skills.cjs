const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 780 } }); const errs = []; p.on('pageerror', e => errs.push(String(e.stack))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => window.localStorage.clear());
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0'); await p.waitForTimeout(600);
  await p.evaluate(() => { startGame(false, 'paladin'); G.story = { f: { met: true, woodTold: true }, n: 0 }; hero.lvl = 6; recalcHero(); G.actCard = 0; });
  await p.waitForTimeout(1200);
  for (const [k, n] of [[0, 'hammer'], [1, 'consec'], [2, 'wall'], [3, 'judge']]) {
    await p.evaluate((k) => { openInv('skills'); SKV.sel = k; SKV.view = null; }, k);
    await p.waitForTimeout(k === 0 ? 3500 : 2200);
    await p.screenshot({ path: `${out}/sk-${n}.png` });
  }
  // two-handed: the maul sends the shield to the bag, a shield brings a one-hander back
  const r = await p.evaluate(() => { closeInv(); const m = rollItem(rng(3), 4, 'pal_maul'); hero.bag.push(m); equipItem(m); const a = [hero.equip.weapon.base, hero.equip.shield, hero.bag.map(i => i.base).join(',')];
    const sh = hero.bag.find(i => ITEM_BASES[i.base].slot === 'shield'); equipItem(sh); a.push(hero.equip.weapon.base, hero.equip.shield && hero.equip.shield.base, hero.bag.map(i => i.base).join(',')); return a; });
  console.log(JSON.stringify(r)); console.log(errs.join('\n') || 'ok'); await b.close(); })();
