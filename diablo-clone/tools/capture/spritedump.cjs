// dump a world sprite to PNG at 6x: node spritedump.cjs <gameDir> <out.png> "<js expression returning a sprite>"
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + process.argv[2] + '/index.html');
  const url = await p.evaluate((ex) => {
    const sp = eval(ex), Z = 6, c = document.createElement('canvas'); c.width = sp.w * Z; c.height = sp.h * Z;
    const g = c.getContext('2d'); g.fillStyle = '#3a3a3a'; g.fillRect(0, 0, c.width, c.height);
    for (let k = 0; k < sp.w * sp.h; k++) { const v = sp.data[k] & 127; if (!sp.data[k]) continue; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((k % sp.w) * Z, ((k / sp.w) | 0) * Z, Z, Z); }
    return c.toDataURL();
  }, process.argv[4]);
  fs.writeFileSync(process.argv[3], Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close(); })();
