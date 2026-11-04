// mage idle: 8 dirs x 4 frames, sharp sprite. node dirs.cjs <gameDir> <out.png>
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(process.argv[2], 'index.html'));
  const url = await p.evaluate(() => { buildBudget.ms = Infinity; newHero('mage'); const look = { ...hero.look };
    const Z = 3, cw = 70, ch = 110, cv = document.createElement('canvas'); cv.width = 8 * cw * Z; cv.height = 4 * ch * Z; const g = cv.getContext('2d'); g.fillStyle = `rgb(${PR[2]},${PG[2]},${PB[2]})`; g.fillRect(0, 0, cv.width, cv.height);
    for (let d = 0; d < 8; d++) for (let f = 0; f < 4; f++) { const sp = getSprite('hero', look, d, 'idle', f, { look, cls: 'mage', combo: 0 }, SPX);
      for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[6][v0]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((d * cw + cw / 2 + (q % sp.w) - sp.ax) * Z, (f * ch + 95 + ((q / sp.w) | 0) - sp.ay) * Z, Z, Z); } }
    return cv.toDataURL(); });
  fs.writeFileSync(process.argv[3], Buffer.from(url.split(',')[1], 'base64')); await b.close(); })();
