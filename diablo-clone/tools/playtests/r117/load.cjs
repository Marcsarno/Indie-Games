const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const out = [];
  for (const dir of process.argv.slice(2)) { const p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; }); await p.goto('file://' + dir + '/index.html');
    out.push(await p.evaluate(() => { const r = []; for (const lv of [2, 1, 6]) { newHero('warrior'); G.mode = 'play'; const ts = []; for (let k = 0; k < 3; k++) { const a = performance.now(); startLevel(lv, 4242 + k); ts.push(performance.now() - a); } r.push('L' + lv + ' ' + Math.round(Math.min(...ts)) + ' ms'); } return r.join(', '); })); await p.close(); }
  console.log(out.join('\n')); await b.close(); })();
