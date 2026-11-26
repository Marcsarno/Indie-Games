const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 400)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + process.argv[2] + '/index.html');
  const shot = await p.evaluate(() => {
    newHero('mage'); hero.lvl = 8; recalcHero(); G.mode = 'play'; startLevel(3, 777); for (let i = 0; i < 300; i++) warmStep(50);
    for (let k = 0; k < 10; k++) { update(1 / 60); render(); }
    G.mode = 'skills'; let err = '';
    for (let k = 0; k < 400; k++) { try { if (typeof tick === 'function') tick(k * 16.7 + 1000); else { update(1 / 60); render(); } } catch (e) { err = String(e.stack || e).slice(0, 300); break; } }
    return { url: cvs.toDataURL(), err }; });
  fs.writeFileSync(process.argv[3], Buffer.from(shot.url.split(',')[1], 'base64'));
  console.log(shot.err || 'ok', errs.length ? 'ERR ' + errs.join('\n') : 'no errors'); await b.close(); })();
