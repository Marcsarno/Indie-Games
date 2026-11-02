// big single sprites: node one.cjs <gameDir> <out> <jsonRows> ; rows: [[fam, look, dir, clip, f], ...]
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out, rows] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + dir + '/sheet.html');
  const url = await p.evaluate((rows) => {
    rows = JSON.parse(rows).map(r => typeof r[1] === "string" ? [r[0], MONSTERS[r[1]].look, r[2], r[3], r[4]] : r); const Z = 3, cw = 90 * Z, ch = 90 * Z, c = document.createElement('canvas'); c.width = rows.length * cw; c.height = ch; const g = c.getContext('2d'); g.fillStyle = '#6f8545'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach(([fam, l, d, clip, f], i) => { const sp = getSprite(fam, l, d, clip, f, { look: l }); for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v = sp.data[y * sp.w + x]; if (!v) continue; const k = (v & 128) ? v & 127 : LTAB[3][v]; g.fillStyle = `rgb(${PR[k]},${PG[k]},${PB[k]})`; g.fillRect(i * cw + (x - 6) * Z, (y - 8) * Z, Z, Z); } });
    return c.toDataURL();
  }, rows);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); if (errs.length) console.log(errs);
  await b.close();
})();
