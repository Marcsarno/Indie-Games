// The three starter heroes as the game draws them (detail sprites): 8 directions, two walk frames and
// two attack frames each, enlarged, plus a row at the phone's size.
// node tools/capture/herosheet.cjs <gameDir> <out.png> [zoom=4] [which=starter|best]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [dir, out, zoom = '4', which = 'starter'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(dir) + '/index.html');
  const url = await p.evaluate(([Z, which]) => {
    buildBudget.ms = Infinity;
    const best = { warrior: ['bastard_sword', 'gothic_plate', 'bascinet', 'heater_shield'], mage: ['runed_staff', 'sorcerer_robe', 'conjurer_hat'], ranger: ['war_bow', 'drake_hide', 'night_hood', 'deep_quiver'] };
    const crop = sp => { let x0 = sp.w, x1 = 0, y0 = sp.h, y1 = 0; for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) if (sp.data[y * sp.w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const w = x1 - x0 + 1, h = y1 - y0 + 1, d = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d[y * w + x] = sp.data[(y + y0) * sp.w + x + x0]; return { w, h, data: d }; };
    const rows = [];
    for (const cls of ['warrior', 'mage', 'ranger']) {
      newHero(cls);
      const look = hero.look, atk = cls === 'ranger' ? 'shoot' : cls === 'mage' ? 'channel' : 'attack';
      const cells = [1, 0, 7, 6, 5, 4, 3, 2].map(d => getSprite('hero', look, d, 'idle', 0, hero, SPX));
      for (const [c, f, d] of [['walk', 2, 1], ['walk', 6, 1], [atk, 1, 0], [atk, 3, 0]]) cells.push(getSprite('hero', look, d, c, f, hero, SPX));
      rows.push(cells.map(crop));
    }
    const cw = Math.max(...rows.flat().map(s => s.w)) * Z + 4, ch = Math.max(...rows.flat().map(s => s.h)) * Z + 4, small = Math.max(...rows.flat().map(s => s.h)) + 8;
    const c = document.createElement('canvas'); c.width = 12 * cw + 16; c.height = 3 * ch + small + 24; const g = c.getContext('2d'); g.fillStyle = '#3a2c22'; g.fillRect(0, 0, c.width, c.height);
    const put = (sp, x0, y0, z) => { for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v = sp.data[y * sp.w + x]; if (!v) continue; const k = (v & 128) ? v & 127 : LTAB[3][v]; g.fillStyle = `rgb(${PR[k]},${PG[k]},${PB[k]})`; g.fillRect(x0 + x * z, y0 + y * z, z, z); } };
    rows.forEach((cells, r) => cells.forEach((sp, i) => put(sp, 8 + i * cw + ((cw - sp.w * Z) >> 1), 8 + r * ch + (ch - sp.h * Z), Z)));
    let x = 8; rows.forEach(cells => cells.slice(0, 4).forEach(sp => { put(sp, x, 3 * ch + 16 + (small - 8 - sp.h), 1); x += sp.w + 6; }));
    return c.toDataURL();
  }, [+zoom, which]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.length ? errs.join('\n') : out);
  await b.close();
})();
