const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const out = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const url = await p.evaluate(() => { const Z = 3, PX = 2, rows = [];
    for (const [ids, wing] of [[['pal_plate3', 'pal_helm3', 'pal_warhammer', 'pal_shield3'], null], [['pal_plate4', 'pal_helm4', 'pal_maul2'], 'dawn'], [['pal_plate5', 'pal_helm4', 'pal_dawn'], 'arch']]) {
      newHero('paladin'); hero.equip.shield = null; for (const id of ids) { const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; hero.equip[ITEM_BASES[id].slot] = it; } hero.wing = wing ? { kind: wing, t: 9, T: 9 } : null; recalcHero();
      rows.push([[1, 0], [1, 1], [3, 0], [5, 0], [7, 1]].map(([d, f]) => getSprite('hero', hero.look, d, 'raise', f, null, PX)));
    }
    const cw = 120 * PX / 2, ch = 110 * PX / 2, c = document.createElement('canvas'); c.width = cw * 5 * Z; c.height = ch * rows.length * Z;
    const g = c.getContext('2d'); g.fillStyle = '#2a2420'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach((row, r) => row.forEach((sp, k) => { for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((k * cw + cw / 2) * Z + (q % sp.w - sp.ax) * Z / 2, (r * ch + ch - 6) * Z + (((q / sp.w) | 0) - sp.ay) * Z / 2, Z / 2 + 0.5, Z / 2 + 0.5); } }));
    return c.toDataURL(); });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close(); })();
