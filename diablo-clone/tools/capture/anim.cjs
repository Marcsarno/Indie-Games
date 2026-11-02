// animation strips: node anim.cjs <gameDir> <out.png>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  if (process.env.ROWS) await p.addInitScript('window.ROWS = (tun, plate, axe) => ' + process.env.ROWS); await p.goto('file://' + dir + '/sheet.html');
  const url = await p.evaluate(() => {
    const plate = { team: 'blue', helm: 'great', chest: 'plate', weapon: 'sword', shield: 'kite' };
    const tun = { team: 'red', helm: 'none', chest: 'tunic', weapon: 'sword', shield: 'none' };
    const axe = { team: 'red', helm: 'barbute', chest: 'brigandine', weapon: 'axe', shield: 'round' };
    const rows = window.ROWS ? window.ROWS(tun, plate, axe) : [
      ['hero', tun, 7, 'walk', 8], ['hero', tun, 1, 'walk', 8], ['hero', plate, 5, 'walk', 8],
      ['hero', axe, 2, 'walk', 8],
      ['skeleton', MONSTERS.skeleton.look, 7, 'walk', 8], ['fallen', MONSTERS.fallen.look, 7, 'walk', 8],
    ];
    const Z = 3, cw = 60 * Z, ch = 74 * Z, c = document.createElement('canvas'); c.width = 8 * cw + 20; c.height = rows.length * ch + 20; const g = c.getContext('2d'); g.fillStyle = '#4a3828'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach(([fam, l, d, clip, n], r) => { for (let i = 0; i < n; i++) { const dd = d < 0 ? i : d, ff = d < 0 ? 0 : i; const sp = getSprite(fam, l, dd, clip, ff, { look: l, eq: l }); for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v = sp.data[y * sp.w + x]; if (!v) continue; const k = (v & 128) ? v & 127 : LTAB[3][v]; g.fillStyle = `rgb(${PR[k]},${PG[k]},${PB[k]})`; g.fillRect(10 + i * cw + (x - 6) * Z, 10 + r * ch + y * Z - 6*Z, Z, Z); } } });
    return c.toDataURL();
  });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); if (errs.length) console.log(errs);
  await b.close();
})();
