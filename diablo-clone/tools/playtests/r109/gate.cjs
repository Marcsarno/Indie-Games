// the camp gate: the hero at steps through it (and beside a post), cropped: node gate.cjs <out.png> [gameDir]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const [out, game = 'game'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=0');
  const url = await p.evaluate(() => {
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'paladin'); G.story = { f: { met: true, woodTold: true }, n: 0 }; G.actCard = 0;
    for (let k = 0; k < 10; k++) update(1 / 60);
    const g = LV.decor.find(d => d.what === 'campgate') || LV.decor.find(d => d.kind === 'campgate'); if (!g) return 'no gate';
    const [u0, v0] = CAMP_UV(g.fi, g.fj), shots = [];
    const W2 = 160, H2 = 200, c = document.createElement('canvas'), Z = 2, steps = [[0, 1.6], [0, 0.7], [0, 0.2], [0, -0.3], [0, -0.9], [0, -1.6], [1.4, 0.0], [-1.6, -0.4]];
    c.width = W2 * steps.length * Z; c.height = H2 * Z; const gx = c.getContext('2d'); gx.imageSmoothingEnabled = false;
    steps.forEach(([du, dv], k) => {
      const q = CAMP_AT(u0 + du, v0 + dv); hero.fi = q[0]; hero.fj = q[1]; hero.dir = 1; hero.walk = k; G.camFollow = true;
      for (let s = 0; s < 40; s++) update(1 / 60); hero.fi = q[0]; hero.fj = q[1]; hero.dir = dv > 0 ? 5 : 1; update(1 / 60); render();
      gx.drawImage(cvs, (cvs.width - W2 * (cvs.width / 270)) / 2, cvs.height * 0.5 - H2 * (cvs.width / 270) * 0.6, W2 * (cvs.width / 270), H2 * (cvs.width / 270), k * W2 * Z, 0, W2 * Z, H2 * Z);
      gx.fillStyle = '#fff'; gx.font = '20px monospace'; gx.fillText(`${du},${dv}`, k * W2 * Z + 6, 22);
    });
    return c.toDataURL(); });
  if (!url.startsWith('data:')) { console.log(url); process.exit(1); }
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close(); })();
