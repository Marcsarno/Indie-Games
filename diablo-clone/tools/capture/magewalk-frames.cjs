// mage walk frames, zoomed: dirs given as args; node walk.cjs out.png [look json]
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file:///home/user/indie-games/diablo-clone/game/sheet.html');
  const url = await p.evaluate((lk) => { const l = lk ? JSON.parse(lk) : { team: 'red', helm: 'hood', chest: 'robe_purple', weapon: 'staff', shield: 'none' };
    const rows = [[7, 'walk'], [1, 'walk'], [5, 'walk'], [7, 'channel'], [1, 'channel'], [3, 'channel']];
    const Z = 4, c = document.createElement('canvas'); c.width = 8 * 56 * Z; c.height = rows.length * 76 * Z; const g = c.getContext('2d'); g.fillStyle = '#4a3828'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach(([d, clip], r) => { for (let f = 0; f < 8; f++) { if (clip !== 'walk' && f > 5) continue; const sp = getSprite('hero', l, d, clip, f); for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v = sp.data[y * sp.w + x]; if (!v) continue; const k = (v & 128) ? v & 127 : LTAB[3][v]; g.fillStyle = `rgb(${PR[k]},${PG[k]},${PB[k]})`; g.fillRect(f * 56 * Z + (x - 8) * Z, r * 76 * Z + y * Z, Z, Z); } } });
    return c.toDataURL(); }, process.argv[3] || null);
  fs.writeFileSync(process.argv[2], Buffer.from(url.split(',')[1], 'base64')); if (errs.length) console.log(errs); await b.close(); })();
