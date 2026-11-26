const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 300)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + process.argv[2] + '/index.html');
  const shots = await p.evaluate(() => { const out = {};
    newHero('mage'); hero.lvl = 8; recalcHero(); G.mode = 'play'; startLevel(3, 777); for (let i = 0; i < 300; i++) warmStep(50);
    for (let k = 0; k < 30; k++) { update(1 / 60); render(); }
    for (const m of ['inv', 'skills']) { G.mode = m; for (let k = 0; k < 40; k++) { try { update(1 / 60); } catch (e) { out.err = String(e); } render(); } out[m] = cvs.toDataURL(); }
    G.mode = 'title'; if (typeof titleScene === 'function') titleScene(); TITLE.opts = true; for (let k = 0; k < 20; k++) { update(1 / 60); render(); } out.title = cvs.toDataURL();
    return out; });
  for (const k in shots) if (k !== 'err') fs.writeFileSync(`${process.argv[3]}-${k}.png`, Buffer.from(shots[k].split(',')[1], 'base64'));
  console.log(Object.keys(shots).join(' '), shots.err || '', errs.length ? 'ERR ' + errs.join('\n') : 'no errors'); await b.close(); })();
