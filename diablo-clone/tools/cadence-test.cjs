// walk cadence: walk frames per second and steps per second for 4 stick directions, warrior and mage.
// node tools/cadence-test.cjs [gameDir]
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(process.argv[2] || path.join(__dirname, '../game')) + '/index.html');
  console.log(await p.evaluate(() => {
    const out = [];
    for (const cls of ['warrior', 'mage']) {
      newHero(cls); G.mode = 'play'; startLevel(2, 4242); enemies.length = 0;
      let best = null, bs = -1;
      for (let i = 4; i < MW - 4; i++) for (let j = 4; j < MH - 4; j++) { let n = 0; for (let a = -4; a <= 4; a++) for (let c = -4; c <= 4; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
      const row = [];
      for (const [name, mx, my] of [['side', 1, 0], ['diag', 0.707, 0.707], ['up/down', 0, 1]]) {
        hero.fi = best[0]; hero.fj = best[1];
        for (let i = 0; i < 20; i++) { input.mx = mx; input.my = my; update(1 / 60); }
        const w0 = hero.walk; for (let i = 0; i < 60; i++) { input.mx = mx; input.my = my; update(1 / 60); }
        const fps = hero.walk - w0; row.push(`${name} ${fps.toFixed(1)} frames/s = ${(fps / 4).toFixed(1)} steps/s`);
        input.mx = input.my = 0; for (let i = 0; i < 30; i++) update(1 / 60);
      }
      out.push(cls.padEnd(8) + row.join(' | '));
    }
    return out.join('\n');
  })); await b.close(); })();
