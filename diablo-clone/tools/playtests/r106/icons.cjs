// the barbarian's helm icons, big: node icons.cjs <out.png>
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const url = await p.evaluate(() => { newHero('warrior'); const ids = ['b_band', 'b_wolfhood', 'b_skull', 'b_horns', 'horned_helm', 'cap'], Z = 8;
    const c = document.createElement('canvas'); c.width = 30 * Z * ids.length; c.height = 30 * Z; const g = c.getContext('2d'); g.fillStyle = '#1c1719'; g.fillRect(0, 0, c.width, c.height);
    ids.forEach((id, n) => { for (const k in iconCache) delete iconCache[k]; const sp = itemIcon({ base: id }); for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((n * 30 + 2 + q % sp.w) * Z, (2 + ((q / sp.w) | 0)) * Z, Z, Z); } });
    return c.toDataURL(); });
  fs.writeFileSync(process.argv[2], Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close(); })();
