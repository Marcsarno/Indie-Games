// round 40a: the hero's poses in a sheet (rows = clip, columns = frames, two facings), zoomed
// node tools/capture/posesheet.cjs <gameDir> <out.png> [cls] [dirs e.g. 1,3]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => { const [dir, out, cls = 'warrior', dirs = '1,3'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(dir, 'index.html'));
  const url = await p.evaluate(([cls, dirs]) => {
    newHero(cls); recalcHero(); buildBudget.ms = Infinity; buildBudget.used = 0;
    const DS = dirs.split(',').map(Number);
    const rows = [['idle', [0, 1, 2, 3]], ['walk', [0, 1, 2, 3, 4, 5, 6, 7]], ['go', [0]], ['stop', [0]], ['skid', [0]], ['pivot', [0]], ['hit', [0, 1, 2, 3]], ['drink', [0, 2, 4, 8]], ['fidget', [0, 1, 2, 4, 5, 6, 8, 9, 10]],
      ...(cls === 'warrior' ? [['hook', [0, 1, 2]], ['spin', [0, 1, 2, 3]], ['attack4', [0, 1, 2, 3, 4, 5]]] : []), ...(cls === 'mage' ? [['channel', [0, 1, 2, 3, 4, 5]], ['channel', [6, 7, 8, 9, 10, 11]], ['storm', [0, 1, 2, 3]]] : []), ...(cls === 'ranger' ? [['shoot', [0, 1, 2, 3]], ['vault', [0, 1, 2]], ['toss', [0, 1]], ['volley', [0, 1, 2, 3]], ['skyshot', [0, 1, 2, 3]]] : [])];
    const Z = 3, cw = 76, ch = 80;
    const ncol = Math.max(...rows.map(r => r[1].length)) * DS.length;
    const c = document.createElement('canvas'); c.width = 70 + ncol * cw * Z / 2; c.height = rows.length * ch * Z / 2;
    const g = c.getContext('2d'); g.fillStyle = '#4a4038'; g.fillRect(0, 0, c.width, c.height); g.font = '12px monospace';
    rows.forEach(([clip, fs], r) => {
      g.fillStyle = '#eee'; g.fillText(clip, 4, r * ch * Z / 2 + 20);
      let col = 0;
      for (const d of DS) for (const f of fs) {
        const sp = getSprite('hero', hero.look, d, clip, f, Object.assign({}, hero, { combo: 3 }), 2);
        const x0 = 70 + col * cw * Z / 2 + cw * Z / 4, y0 = r * ch * Z / 2 + ch * Z / 2 - 14;
        for (let k = 0; k < sp.w * sp.h; k++) { const v0 = sp.data[k]; if (!v0) continue; const v = v0 & 127; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect(x0 + ((k % sp.w) - sp.ax) * Z / 2, y0 + (((k / sp.w) | 0) - sp.ay) * Z / 2, Z / 2 + 0.5, Z / 2 + 0.5); }
        col++;
      }
    });
    return c.toDataURL();
  }, [cls, dirs]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close(); })();
