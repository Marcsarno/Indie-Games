// hero in 4 looks x 5 directions, lit at level 3 on a floor tone: node hero8.cjs <gameDir> <out>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + dir + '/sheet.html');
  const url = await p.evaluate(() => {
    const looks = [
      { team: 'red', helm: 'none', chest: 'tunic', weapon: 'sword', shield: 'none' },
      { team: 'red', helm: 'cap', chest: 'chain', weapon: 'sword', shield: 'buckler' },
      { team: 'blue', helm: 'great', chest: 'plate', weapon: 'sword', shield: 'kite' },
      { team: 'red', helm: 'barbute', chest: 'brigandine', weapon: 'axe', shield: 'round' },
    ];
    const dirs = [1, 0, 2, 7, 5];
    const Z = 3, cw = 64 * Z, ch = 72 * Z, c = document.createElement('canvas'); c.width = dirs.length * cw + 20; c.height = looks.length * ch + 20; const g = c.getContext('2d'); g.fillStyle = '#4a3828'; g.fillRect(0, 0, c.width, c.height);
    looks.forEach((l, r) => dirs.forEach((d, i) => { const sp = getSprite('hero', l, d, 'idle', 0); for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v = sp.data[y * sp.w + x]; if (!v) continue; const k = (v & 128) ? v & 127 : LTAB[3][v]; g.fillStyle = `rgb(${PR[k]},${PG[k]},${PB[k]})`; g.fillRect(10 + i * cw + (x - 4) * Z, 10 + r * ch + y * Z, Z, Z); } }));
    return c.toDataURL();
  });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); if (errs.length) console.log(errs);
  await b.close();
})();
