// every key pose of each family's attack, old swing (top) and the round 34 one (bottom), side view:
// node attackposes.cjs <gameDir> <out.png>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + dir + '/sheet.html');
  const url = await p.evaluate(() => {
    const fams = [['fallen', {}], ['skeleton', { shield: true }], ['hound', {}], ['spider', {}]];
    const Z = 3, cw = 64 * Z, ch = 70 * Z, n = 6, c = document.createElement('canvas'); c.width = n * cw + 20; c.height = fams.length * 2 * ch + 20;
    const g = c.getContext('2d'); g.fillStyle = '#4a3828'; g.fillRect(0, 0, c.width, c.height);
    fams.forEach(([fam, look], fi) => [true, false].forEach((old, oi) => {
      FEEL_OLD = old; spriteCache.clear();
      const sw = FAMILIES[fam].swing({ look });
      for (let f = 0; f < Math.min(n, sw.length); f++) {
        const sp = getSprite(fam, look, 2, 'attack', f);
        const ox = 10 + f * cw + (cw - sp.w * Z) / 2, oy = 10 + (fi * 2 + oi) * ch + (ch - sp.h * Z) / 2;
        for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v = sp.data[y * sp.w + x]; if (!v) continue; const k = (v & 128) ? v & 127 : LTAB[3][v]; g.fillStyle = `rgb(${PR[k]},${PG[k]},${PB[k]})`; g.fillRect(ox + x * Z, oy + y * Z, Z, Z); }
        g.fillStyle = '#e8dcc4'; g.font = '12px monospace'; g.fillText((old ? 'OLD ' : 'NEW ') + fam + ' ' + f + (sw[f].tele ? ' wind-up' : sw[f].hit ? ' HIT' : sw[f].open ? ' open' : sw[f].mv ? ' lunge' : ''), 14 + f * cw, 24 + (fi * 2 + oi) * ch);
      }
    }));
    FEEL_OLD = false; return c.toDataURL();
  });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); if (errs.length) console.log(errs);
  await b.close();
})();
