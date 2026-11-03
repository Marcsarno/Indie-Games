// overview of each arena: the baked world (unlit palette at the mid light level), cropped to the floor
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file:///home/user/indie-games/diablo-clone/game/index.html');
  const out = await p.evaluate(() => {
    const res = {};
    newHero(); G.mode = 'play';
    for (const [L, name] of [[5, 'king'], [10, 'nest'], [15, 'sanctum']]) {
      startLevel(L, 1000 + L * 37);
      let x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0;
      for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (wIdx[y * WW + x] > 1) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const w = x1 - x0 + 1, h = y1 - y0 + 1, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), img = g.createImageData(w, h), o32 = new Uint32Array(img.data.buffer);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = wIdx[(y + y0) * WW + x + x0]; o32[y * w + x] = v ? ((v & 128) ? PAL32[v & 127] : LCOL[4 * NPAL + v]) : PAL32[BLK]; }
      g.putImageData(img, 0, 0);
      // the boss and guards as markers
      g.fillStyle = '#ff4030'; for (const e of enemies) { const [x, y] = iso(e.fi, e.fj); g.fillRect(x - x0 - (e.def.unique ? 4 : 2), y - y0 - (e.def.unique ? 4 : 2), e.def.unique ? 8 : 4, e.def.unique ? 8 : 4); }
      g.fillStyle = '#60ff60'; { const [x, y] = iso(LV.start.cx + 0.5, LV.start.cy + 0.5); g.fillRect(x - x0 - 3, y - y0 - 3, 6, 6); }
      res[name] = c.toDataURL();
    }
    return res;
  });
  for (const k in out) fs.writeFileSync(`${process.argv[2]}/over-${k}.png`, Buffer.from(out[k].split(',')[1], 'base64'));
  console.log(errs.length ? errs.join('\n') : 'ok'); await b.close(); })();
