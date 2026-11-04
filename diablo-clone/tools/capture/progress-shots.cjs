// Current game sprites for the art progress page: one PNG per monster id with three facings
// (front-left, front, front-right) at the given zoom, on a transparent background.
//   node tools/capture/progress-shots.cjs <outDir> <zoom> <id,id,...>
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [out, zoom, ids] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../../game/index.html'));
  const res = await p.evaluate(({ ids, Z }) => {
    const col = v => `rgb(${PR[v]},${PG[v]},${PB[v]})`;
    buildBudget.ms = Infinity; G.mode = 'play'; newHero('warrior'); startLevel(3, 777);
    const pix = sp => (q => { const v0 = sp.data[q]; return v0 ? ((v0 & 128) ? v0 & 127 : LTAB[4][v0]) : -1; });
    const box = sp => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let q = 0; q < sp.w * sp.h; q++) if (sp.data[q]) { const x = q % sp.w, y = (q / sp.w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { l: x0 - sp.ax, r: x1 - sp.ax + 1, t: y0 - sp.ay, b: y1 - sp.ay + 1 }; };
    const files = {};
    for (const id of ids) {
      const e = makeEnemy(id, 10, 10, 1);
      const cells = [3, 1, 0].map(d => getSprite(e.fam, e.look, d, 'idle', 0, e, SPX)).map(sp => ({ sp, bx: box(sp) }));
      const up = Math.max(...cells.map(c => -c.bx.t)), down = Math.max(...cells.map(c => c.bx.b)), ws = cells.map(c => c.bx.r - c.bx.l + 4);
      const cv = document.createElement('canvas'); cv.width = ws.reduce((a, w) => a + w, 0) * Z; cv.height = (up + down + 4) * Z; const g = cv.getContext('2d');
      let x = 0;   // transparent, so the page's own well shows behind the sprites
      cells.forEach((c, k) => {
        const at = pix(c.sp), cx = x + (ws[k] * Z) / 2 - ((c.bx.l + c.bx.r) / 2) * Z, y0 = (up + 2) * Z;
        for (let q = 0; q < c.sp.w * c.sp.h; q++) { const v = at(q); if (v < 0) continue; g.fillStyle = col(v); g.fillRect(cx + ((q % c.sp.w) - c.sp.ax) * Z, y0 + (((q / c.sp.w) | 0) - c.sp.ay) * Z, Z, Z); }
        x += ws[k] * Z;
      });
      files[id] = cv.toDataURL();
    }
    return files;
  }, { ids: ids.split(','), Z: +zoom });
  if (errs.length) console.log('errors:', errs.join('\n'));
  for (const [id, url] of Object.entries(res)) fs.writeFileSync(path.join(out, id + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  console.log(Object.keys(res).length, 'sprites ->', out); await b.close();
})();
