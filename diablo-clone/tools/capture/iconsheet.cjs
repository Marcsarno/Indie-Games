// item icons side by side at 4x on the bag's slot color: node tools/capture/iconsheet.cjs <gameDir> <out.png> ring,amulet,short_sword,...
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const [dir, out, list] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(dir, 'index.html'));
  const url = await p.evaluate(list => {
    const names = list.split(','), Z = 4, cw = 34, ch = 30;
    const c = document.createElement('canvas'); c.width = cw * Z * names.length; c.height = ch * Z; const g = c.getContext('2d');
    const col = v => `rgb(${PR[v]},${PG[v]},${PB[v]})`;
    names.forEach((n, k) => {
      g.fillStyle = col(4); g.fillRect(k * cw * Z, 0, cw * Z, ch * Z); g.fillStyle = col(6); g.fillRect(k * cw * Z, 0, Z, ch * Z);
      const sp = itemIcon({ base: n, mods: {} });
      for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0]; g.fillStyle = col(v); g.fillRect((k * cw + 17 + (q % sp.w) - sp.ax) * Z, (21 + ((q / sp.w) | 0) - sp.ay) * Z, Z, Z); }
    });
    return c.toDataURL(); }, list);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); if (errs.length) console.log(errs.join('\n')); await b.close(); })();
