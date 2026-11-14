// round 115: the skills screen's live previews still run (they use the real kill code, so the gore too)
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(), errs = [];
  for (const cls of ['warrior', 'paladin', 'mage', 'ranger']) { const p = await b.newPage(); p.on('pageerror', e => errs.push(cls + ' ' + String(e.stack).slice(0, 300)));
    await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
    await p.goto('file://' + path.resolve(__dirname, '../../../game/index.html') + '?cine=0');
    console.log(cls, await p.evaluate((cls) => { allocBuffers(270, 480); G.mode = 'title'; beginGame(false, cls); for (let k = 0; k < 5; k++) update(1 / 60); hero.lvl = 9; recalcHero(); G.mode = 'play'; openInv('skills');
      const list = skillsScreenList(); let n = 0; for (const sk of list) { SKV.sel = sk.id; SKV.view = null; for (let k = 0; k < 150; k++) { update(1 / 60); if (k % 10 === 0) render(); } n++; }
      return n + ' skills previewed, mode ' + G.mode; }, cls)); await p.close(); }
  console.log(errs.slice(0, 4).join('\n') || 'no errors'); await b.close(); })();
