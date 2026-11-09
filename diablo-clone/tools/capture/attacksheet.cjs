// A hero attack clip key by key, as the game draws it (detail sprites), in three facings.
// node tools/capture/attacksheet.cjs <gameDir> <out.png> [cls=warrior] [clip=attack] [frames=6] [zoom=4]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [dir, out, cls = 'warrior', clip = 'attack', frames = '6', zoom = '4'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(dir) + '/index.html');
  const url = await p.evaluate(([cls, clip, N, Z]) => {
    buildBudget.ms = Infinity; newHero(cls); const look = hero.look;
    const rows = [7, 0, 1, 3].map(d => [...Array(N).keys()].map(f => getSprite('hero', look, d, clip, f, hero, SPX)));
    const all = rows.flat(); let x0 = 1e9, x1 = 0, y0 = 1e9, y1 = 0;
    for (const sp of all) for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) if (sp.data[y * sp.w + x]) { x0 = Math.min(x0, x - sp.ax); x1 = Math.max(x1, x - sp.ax); y0 = Math.min(y0, y - sp.ay); y1 = Math.max(y1, y - sp.ay); }
    const cw = (x1 - x0 + 5) * Z, ch = (y1 - y0 + 5) * Z;
    const c = document.createElement('canvas'); c.width = N * cw; c.height = rows.length * ch; const g = c.getContext('2d'); g.fillStyle = '#3a2c22'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach((cells, r) => cells.forEach((sp, i) => { for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v = sp.data[y * sp.w + x]; if (!v) continue; const k = (v & 128) ? v & 127 : LTAB[3][v]; g.fillStyle = `rgb(${PR[k]},${PG[k]},${PB[k]})`; g.fillRect(i * cw + (x - sp.ax - x0 + 2) * Z, r * ch + (y - sp.ay - y0 + 2) * Z, Z, Z); } }));
    return c.toDataURL();
  }, [cls, clip, +frames, +zoom]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.length ? errs.join('\n') : out);
  await b.close();
})();
