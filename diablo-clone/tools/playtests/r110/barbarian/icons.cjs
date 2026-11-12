// round 110: the barbarian's new pieces' bag icons, big: node tools/playtests/r110/barbarian/icons.cjs <out.png>
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const url = await p.evaluate(() => { newHero('warrior'); const ids = ['bt_tusk', 'bt_boar', 'bt_tuskaxe', 'bt_club', 'bt_thunder', 'bt_ram', 'bt_dblaxe', 'bt_flail', 'bt_mammoth', 'bt_mskull', 'bt_emberaxe', 'bt_cleaver'], Z = 6;
    const c = document.createElement('canvas'); c.width = 30 * Z * 4; c.height = 30 * Z * 3; const g = c.getContext('2d'); g.fillStyle = '#1c1719'; g.fillRect(0, 0, c.width, c.height);
    ids.forEach((id, n) => { const sp = itemIcon({ base: id }), ox = (n % 4) * 30, oy = ((n / 4) | 0) * 30; for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((ox + 2 + q % sp.w) * Z, (oy + 2 + ((q / sp.w) | 0)) * Z, Z, Z); } });
    return c.toDataURL(); });
  fs.writeFileSync(process.argv[2], Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close(); })();
