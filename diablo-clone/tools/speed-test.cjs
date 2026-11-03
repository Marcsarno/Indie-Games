// on-screen speed (px/s) and on-screen direction for 8 stick directions: node speed.cjs <gameDir>
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + process.argv[2] + '/index.html');
  console.log(await p.evaluate(() => {
    newHero(); G.mode = 'play'; startLevel(2, 4242); enemies.length = 0;
    let best = null, bs = -1;
    for (let i = 4; i < MW - 4; i++) for (let j = 4; j < MH - 4; j++) { let n = 0; for (let a = -4; a <= 4; a++) for (let c = -4; c <= 4; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
    const out = [];
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, mx = Math.cos(a), my = Math.sin(a);
      hero.fi = best[0]; hero.fj = best[1];
      for (let i = 0; i < 20; i++) { input.mx = mx; input.my = my; update(1 / 60); }
      const [x0, y0] = screenOf(hero);
      for (let i = 0; i < 30; i++) { input.mx = mx; input.my = my; update(1 / 60); }
      const [x1, y1] = screenOf(hero); input.mx = input.my = 0; update(1 / 60);
      out.push(`stick ${String(k * 45).padStart(3)}: ${Math.round(Math.hypot(x1 - x0, y1 - y0) * 2)} px/s on screen, heading ${Math.round(Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI)}`);
    }
    return out.join('\n');
  })); await b.close(); })();
