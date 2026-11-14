const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 300)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(__dirname, '../../../game/index.html') + '?cine=0');
  console.log(await p.evaluate(() => { allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'warrior'); for (let k = 0; k < 5; k++) update(1 / 60);
    enterSide('barrow'); for (let k = 0; k < 5; k++) update(1 / 60); descendSide(); const f = G.fadeTo; G.fadeTo = null; f(); for (let k = 0; k < 30; k++) update(1 / 60);
    return JSON.stringify({ side: LV.side, fail: LV.genFail, ids: [...new Set(enemies.map(e => e.id))], boss: boss && boss.id, kind: boss && boss.bossKind, uniq: enemies.filter(e => e.def.unique).map(e => e.id) }); }));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
