const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const url = await p.evaluate(() => {
    const Z = 5, rows = [];
    for (const cls of ['warrior', 'mage', 'ranger']) for (const up of [0, 3]) {
      newHero(cls); hero.equip.weapon.up = up; recalcHero();
      const row = []; for (const [d, clip, f] of [[1, 'idle', 0], [1, 'idle', 1], [3, 'walk', 2], [5, 'walk', 5], [7, 'idle', 0], [2, 'idle', 1]]) row.push(getSprite('hero', hero.look, d, clip, f));
      rows.push(row);
    }
    const cw = 60, ch = 76, c = document.createElement('canvas'); c.width = cw * 6 * Z; c.height = ch * rows.length * Z;
    const g = c.getContext('2d'); g.fillStyle = '#3d4a2c'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach((row, r) => row.forEach((sp, k) => { for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((k * cw + cw / 2 - sp.ax + (q % sp.w)) * Z, (r * ch + ch - 6 - sp.ay + ((q / sp.w) | 0)) * Z, Z, Z); } }));
    return c.toDataURL();
  });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close();
})();
