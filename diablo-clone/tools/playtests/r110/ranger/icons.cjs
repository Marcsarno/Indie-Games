// Round 110 (ranger gear): the bag icons of the new pieces (and the old top tier's), drawn Z times: node icons.cjs <out.png> [Z=6]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [out, Zs = '6'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(__dirname, '../../../../game/index.html') + '?cine=0');
  const url = await p.evaluate((Z) => {
    const rows = [['blackthorn_warden_jerkin', 'night_hood', 'blackthorn_warden_bow', 'deep_quiver'], ['rt_falconer_jerkin', 'rt_falconer_hood', 'rt_falconer_bow', 'rt_falconer_quiver'],
      ['rt_antler_jerkin', 'rt_antler_hood', 'rt_antler_bow', 'rt_antler_quiver'], ['rt_wildheart_jerkin', 'rt_wildheart_hood', 'rt_wildheart_bow', 'rt_wildheart_quiver']];
    const C = 30 * Z, c = document.createElement('canvas'); c.width = C * 4; c.height = C * rows.length; const g = c.getContext('2d'); g.fillStyle = '#2a2622'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach((row, j) => row.forEach((id, i) => { const sp = itemIcon({ base: id }); g.fillStyle = '#3a342e'; g.fillRect(i * C + 2, j * C + 2, C - 4, C - 4);
      for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect(i * C + (C - sp.w * Z) / 2 + (q % sp.w) * Z, j * C + (C - sp.h * Z) / 2 + ((q / sp.w) | 0) * Z, Z, Z); } }));
    return c.toDataURL();
  }, +Zs);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close();
})();
