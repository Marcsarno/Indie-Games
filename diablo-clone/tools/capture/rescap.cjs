// resolution test: the same rigs rendered at 1x, 1.5x and 2x detail, shown at the same size
// (1x drawn 6 px per pixel, 1.5x 4 px, 2x 3 px). node rescap.cjs <gameDir> <out.png>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.goto('file://' + dir + '/sheet.html');
  const url = await p.evaluate(() => {
    const cast = [
      ['hero', { team: 'red', helm: 'hood', chest: 'robe_purple', weapon: 'staff', shield: 'none' }, 1, 'idle', 0],
      ['hero', { team: 'red', helm: 'hat', chest: 'robe_blue', weapon: 'staff', shield: 'none' }, 7, 'channel', 1],
      ['hero', { team: 'blue', helm: 'great', chest: 'plate', weapon: 'sword', shield: 'kite' }, 1, 'idle', 0],
      ['skeleton', MONSTERS.skeleton.look, 1, 'idle', 0],
      ['ogre', MONSTERS.warlord.look, 1, 'idle', 0],
    ];
    const K = [1, 1.5, 2], Z = [6, 4, 3];
    const cells = cast.map(([fam, look, d, clip, f]) => {
      const F = FAMILIES[fam], [w, h, ax, ay] = look.size || F.size;
      return K.map(k => { const r = F.rig(look, poseState(fam, { look }, clip, f)); if (k !== 1) scaleRig(r, k); return renderRig(r, yawOf(d), Math.round(w * k), Math.round(h * k), Math.round(ax * k), Math.round(ay * k)); });
    });
    const colW = cells.map(c => c[0].w * 6), rowH = cells.map(c => c[0].h * 6);
    const c = document.createElement('canvas'); c.width = Math.max(...colW) * 3 + 40; c.height = rowH.reduce((a, b) => a + b, 0) + 20;
    const g = c.getContext('2d'); g.fillStyle = '#3a2c20'; g.fillRect(0, 0, c.width, c.height);
    let y0 = 10;
    cells.forEach((row, r) => {
      row.forEach((sp, i) => {
        const z = Z[i], x0 = 10 + i * (Math.max(...colW) + 10);
        for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v = sp.data[y * sp.w + x]; if (!v) continue; const k = (v & 128) ? v & 127 : LTAB[3][v]; g.fillStyle = `rgb(${PR[k]},${PG[k]},${PB[k]})`; g.fillRect(x0 + x * z, y0 + y * z, z, z); }
      });
      y0 += rowH[r];
    });
    return c.toDataURL();
  });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); if (errs.length) console.log(errs);
  await b.close();
})();
