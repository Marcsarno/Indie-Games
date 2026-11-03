// mage looks x 5 directions (idle), plus walk and cast strips, lit at level 3: node mage8.cjs <gameDir> <out>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + dir + '/sheet.html');
  const url = await p.evaluate(() => {
    const rows = [
      [{ team: 'red', helm: 'hat', chest: 'robe_blue', weapon: 'staff', shield: 'none' }, 'idle'],
      [{ team: 'red', helm: 'hood', chest: 'robe_purple', weapon: 'staff_fire', shield: 'none' }, 'idle'],
      [{ team: 'red', helm: 'none', chest: 'robe_red', weapon: 'staff_ice', shield: 'none' }, 'idle'],
      [{ team: 'red', helm: 'hat', chest: 'robe_blue', weapon: 'staff', shield: 'none' }, 'channel'],
      [{ team: 'red', helm: 'hat', chest: 'robe_blue', weapon: 'staff', shield: 'none' }, 'walk7'],
      [{ team: 'red', helm: 'hat', chest: 'robe_blue', weapon: 'staff', shield: 'none' }, 'walk1'],
    ];
    const dirs = [1, 0, 2, 7, 5, 3, 4, 6];
    const Z = 3, cw = 64 * Z, ch = 76 * Z, c = document.createElement('canvas'); c.width = dirs.length * cw + 20; c.height = rows.length * ch + 20; const g = c.getContext('2d'); g.fillStyle = '#4a3828'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach(([l, clip], r) => dirs.forEach((d, i) => {
      let sp;
      if (clip.startsWith('walk')) sp = getSprite('hero', l, +clip[4], 'walk', i);
      else sp = getSprite('hero', l, d, clip, 0);
      for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v = sp.data[y * sp.w + x]; if (!v) continue; const k = (v & 128) ? v & 127 : LTAB[3][v]; g.fillStyle = `rgb(${PR[k]},${PG[k]},${PB[k]})`; g.fillRect(10 + i * cw + (x - 4) * Z, 10 + r * ch + y * Z, Z, Z); }
    }));
    return c.toDataURL();
  });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); if (errs.length) console.log(errs);
  await b.close();
})();
