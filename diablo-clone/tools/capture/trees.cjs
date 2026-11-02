const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + dir + '/sheet.html');
  const url = await p.evaluate(() => {
    const sps = [0, 1, 2, 3].map(s => OUT.pine(s)).concat([OUT.oak(0), OUT.oak(1, true)]);
    const Z = 3, c = document.createElement('canvas'); c.width = sps.length * 82 * Z; c.height = 110 * Z; const g = c.getContext('2d'); g.fillStyle = '#6f8545'; g.fillRect(0, 0, c.width, c.height);
    sps.forEach((sp, i) => { for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v = sp.data[y * sp.w + x]; if (!v) continue; const k = (v & 128) ? v & 127 : LTAB[3][v]; g.fillStyle = `rgb(${PR[k]},${PG[k]},${PB[k]})`; g.fillRect((i * 82 + x) * Z, y * Z, Z, Z); } });
    return c.toDataURL();
  });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); if (errs.length) console.log(errs);
  await b.close();
})();
