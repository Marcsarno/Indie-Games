// capture the hero running in the real game: node walkcap.cjs <gameDir> <outPrefix> [lookJSON]
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out, lookJ] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + dir + '/index.html');
  const frames = await p.evaluate((lookJ) => {
    Math.random = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    newHero(); G.mode = 'play'; startLevel(1, 777);
    if (lookJ) Object.assign(hero.look, JSON.parse(lookJ));
    enemies.length = 0;
    // find the open spot with the most free floor around it
    let best = null, bs = -1;
    for (let i = 2; i < 60; i++) for (let j = 2; j < 60; j++) { let n = 0; for (let a = -4; a <= 4; a++) for (let c = -4; c <= 4; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
    hero.fi = best[0]; hero.fj = best[1];
    for (let i = 0; i < 400; i++) warmStep(50);
    const fr = []; let t = 0;
    const plan = [[1, 0, 50], [0, 0, 24], [0, 1, 40], [0, 0, 24], [-1, -1, 44], [0, 0, 24], [0, -1, 36], [0, 0, 30]];
    for (const [mx, my, n] of plan) for (let k = 0; k < n; k++) {
      input.mx = mx; input.my = my; update(1 / 60); warmStep(50);
      if (t++ % 2 === 0) { render(); const g = cvs.getContext('2d'); const cx = Math.round(W / 2), cy = Math.round(H * 0.47); fr.push(cvs.toDataURL()); }
    }
    return { fr, W, H };
  }, lookJ || null);
  fs.writeFileSync(out + '.json', JSON.stringify(frames));
  if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
