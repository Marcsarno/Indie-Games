// bag icons of the round 110 mage gear next to the old top tier's: node tools/playtests/r110/mage/icons.cjs <out.png> [Z]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [out, Zs = '6'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const url = await p.evaluate((Z) => {
    const rows = [['sunwarden_robe', 'sunwarden_hat', 'sunwarden_staff'], ['mt_storm_robe', 'mt_storm_hat', 'mt_storm_staff', 'mt_frost_staff'], ['mt_star_robe', 'mt_star_hat', 'mt_star_staff', 'mt_ember_staff'], ['mt_eclipse_robe', 'mt_eclipse_hat', 'mt_eclipse_staff', 'mt_root_staff']];
    const c = document.createElement('canvas'); c.width = 30 * 4 * Z; c.height = 30 * rows.length * Z; const g = c.getContext('2d'); g.fillStyle = '#2a2622'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach((row, n) => row.forEach((id, k) => { const sp = itemIcon({ base: id }); for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((k * 30 + 2 + (q % sp.w)) * Z, (n * 30 + 2 + ((q / sp.w) | 0)) * Z, Z, Z); } }));
    return c.toDataURL();
  }, +Zs);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close();
})();
