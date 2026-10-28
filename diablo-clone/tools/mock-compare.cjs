// Side by side: the user's mock-up (target) next to the game's sprite at the same height, plus
// the sprite at 1x and in a few directions. Usage:
//   node tools/mock-compare.cjs <mock png> <out png> "<sprite expr>" [dirs...]
// The sprite expr is evaluated in game/sheet.html with `d` bound to a direction, e.g.
//   "getSprite('hero', {team:'red',helm:'great',chest:'plate',weapon:'sword',shield:'none'}, d, 'idle', 0)"
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const [mock, out, expr, ...dirsArg] = process.argv.slice(2);
const dirs = (dirsArg.length ? dirsArg : ['1']).map(Number);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../game/sheet.html'));
  const mockUrl = 'data:image/png;base64,' + fs.readFileSync(mock).toString('base64');
  const url = await p.evaluate(async ({ expr, dirs, mockUrl }) => {
    const sprites = dirs.map(d => eval(expr.replace(/\bd\b/g, d)));
    // tight bounds of the first sprite
    const bounds = sp => { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) if (sp.data[y * sp.w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; };
    const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = mockUrl; });
    // crop the mock to its non-black content
    const mc = document.createElement('canvas'); mc.width = im.width; mc.height = im.height; const mg = mc.getContext('2d'); mg.drawImage(im, 0, 0);
    const md = mg.getImageData(0, 0, im.width, im.height).data; let a = 1e9, bb = 1e9, c = -1, dd = -1;
    for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) { const k = (y * im.width + x) * 4; if (md[k] + md[k + 1] + md[k + 2] > 60) { a = Math.min(a, x); c = Math.max(c, x); bb = Math.min(bb, y); dd = Math.max(dd, y); } }
    const TH = 400, s0 = sprites[0], [x0, y0, x1, y1] = bounds(s0), Z = Math.max(2, Math.floor(TH / (y1 - y0 + 1)));
    const mockW = Math.round((c - a + 1) * TH / (dd - bb + 1));
    const W = 40 + mockW + 40 + (x1 - x0 + 1) * Z + 40 + dirs.length * (s0.w * 3 + 10) + 40;
    const cv = document.createElement('canvas'); cv.width = Math.max(W, 900); cv.height = TH + 150;
    const g = cv.getContext('2d'); g.fillStyle = '#100c09'; g.fillRect(0, 0, cv.width, cv.height); g.imageSmoothingEnabled = false;
    g.fillStyle = '#fff'; g.font = 'bold 18px monospace'; g.fillText('MOCK-UP (target)', 40, 26); g.fillText('GAME (same height)', 80 + mockW, 26);
    g.drawImage(im, a, bb, c - a + 1, dd - bb + 1, 40, 40, mockW, TH);
    const rgb = i => `rgb(${PR[i]},${PG[i]},${PB[i]})`;
    const draw = (sp, ox, oy, z, rx0 = 0, ry0 = 0) => { for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v = sp.data[y * sp.w + x]; if (!v) continue; g.fillStyle = rgb((v & 128) ? v & 127 : LTAB[3][v]); g.fillRect(ox + (x - rx0) * z, oy + (y - ry0) * z, z, z); } };
    draw(s0, 80 + mockW, 40, Z, x0, y0);
    let ox = 80 + mockW + (x1 - x0 + 1) * Z + 40;
    g.fillText('directions (3x) and 1x', ox, 26);
    sprites.forEach((sp, i) => { draw(sp, ox + i * (sp.w * 3 + 10), 40, 3); draw(sp, ox + i * (sp.w + 10), 40 + sp.h * 3 + 20, 1); });
    return cv.toDataURL();
  }, { expr, dirs, mockUrl });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(out);
  await b.close();
})();
