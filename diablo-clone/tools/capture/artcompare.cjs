// Before/after strips for the art chat: renders the same Bestiary frames (six facings, walk,
// wind-up, strike, hit, dead) for each monster id from one or more copies of the game, stacked.
//   node tools/capture/artcompare.cjs <out.png> <zoom> <id,id,...> <label=gameDir> [<label=gameDir> ...]
// A label may be "silhouette:" + label to draw that copy's frames as flat black on a light floor.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [out, zoom, ids, ...srcs] = process.argv.slice(2);
  const b = await chromium.launch(); const shots = [];
  for (const src of srcs) {
    const [label, dir] = src.split('=');
    const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await p.goto('file://' + path.resolve(dir, 'index.html'));
    const res = await p.evaluate(({ ids, Z, label }) => {
      const col = v => `rgb(${PR[v]},${PG[v]},${PB[v]})`, BG = col(4), INK = col(26);
      buildBudget.ms = Infinity; G.mode = 'play'; newHero('warrior'); startLevel(3, 777);
      const sil = label.startsWith('silhouette:');
      const pix = sp => (q => { const v0 = sp.data[q]; return v0 ? ((v0 & 128) ? v0 & 127 : LTAB[4][v0]) : -1; });
      const box = sp => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let q = 0; q < sp.w * sp.h; q++) if (sp.data[q]) { const x = q % sp.w, y = (q / sp.w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { l: x0 - sp.ax, r: x1 - sp.ax + 1, t: y0 - sp.ay, b: y1 - sp.ay + 1 }; };
      const get = (e, d, clip, f) => { try { return getSprite(e.fam, e.look, d, clip, f, e, SPX); } catch (er) { return null; } };
      const urls = [];
      for (const id of ids) {
        const e = makeEnemy(id, 10, 10, 1);
        const cells = [[1, 'idle', 0, 'front'], [0, 'idle', 0, 'fr-right'], [7, 'idle', 0, 'right'], [6, 'idle', 0, 'bk-right'], [5, 'idle', 0, 'back'], [3, 'idle', 0, 'fr-left'],
          [0, 'walk', 1, 'walk'], [0, 'walk', 3, 'walk'], [0, 'attack', 1, 'wind-up'], [0, 'attack', 2, 'strike'], [1, 'hit', 0, 'hit'], [0, 'death', 5, 'dead']]
          .map(([d, clip, f, cap]) => ({ sp: get(e, d, clip, f), cap })).filter(c => c.sp);
        for (const c of cells) c.bx = box(c.sp);
        const up = Math.max(...cells.map(c => -c.bx.t)), down = Math.max(...cells.map(c => c.bx.b));
        const ws = cells.map(c => Math.max(c.bx.r - c.bx.l + 6, 20));
        const top = 24, capH = 16, cv = document.createElement('canvas');
        cv.width = ws.reduce((a, w) => a + w, 0) * Z; cv.height = top + (up + down + 4) * Z + capH; const g = cv.getContext('2d');
        g.fillStyle = sil ? '#d8c4a0' : BG; g.fillRect(0, 0, cv.width, cv.height);
        g.fillStyle = sil ? '#000' : INK; g.font = 'bold 16px monospace'; g.fillText(label.replace('silhouette:', '') + '  ' + (MONSTERS[id].name || id) + (sil ? ' (silhouette)' : ''), 8, 17);
        let x = 0;
        cells.forEach((c, k) => {
          const at = pix(c.sp), cx = x + (ws[k] * Z) / 2 - ((c.bx.l + c.bx.r) / 2) * Z, y0 = top + (up + 2) * Z;
          for (let q = 0; q < c.sp.w * c.sp.h; q++) { const v = at(q); if (v < 0) continue; g.fillStyle = sil ? '#000' : col(v); g.fillRect(cx + ((q % c.sp.w) - c.sp.ax) * Z, y0 + (((q / c.sp.w) | 0) - c.sp.ay) * Z, Z, Z); }
          g.fillStyle = sil ? '#333' : col(25); g.font = '11px monospace'; g.textAlign = 'center'; g.fillText(c.cap, x + ws[k] * Z / 2, cv.height - 4); g.textAlign = 'left';
          x += ws[k] * Z;
        });
        urls.push(cv.toDataURL());
      }
      return urls;
    }, { ids: ids.split(','), Z: +zoom, label });
    if (errs.length) console.log(label, 'errors:', errs.join('\n'));
    shots.push(res); await p.close();
  }
  // stack: for each id, every source's strip under one another
  const p = await b.newPage();
  const url = await p.evaluate(async (shots) => {
    const imgs = await Promise.all(shots.flat().map(u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; })));
    const nIds = shots[0].length, order = [];
    for (let k = 0; k < nIds; k++) for (let s = 0; s < shots.length; s++) order.push(imgs[s * nIds + k]);
    const W = Math.max(...order.map(i => i.width)), H = order.reduce((a, i) => a + i.height + 6, 0);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H); let y = 0; for (const i of order) { g.drawImage(i, 0, y); y += i.height + 6; }
    return cv.toDataURL();
  }, shots);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(out);
  await b.close();
})();
