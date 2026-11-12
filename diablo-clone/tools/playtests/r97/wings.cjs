const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const out = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const url = await p.evaluate(() => { const Z = 2, PX = 2, rows = [];
    for (const kind of ['dawn', 'arch']) { newHero('paladin'); for (const [s, id] of [['chest', 'pal_plate3'], ['helm', 'pal_helm3'], ['weapon', 'pal_warhammer'], ['shield', 'pal_shield3']]) { const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; hero.equip[s] = it; } hero.wing = { kind, t: 10, T: 10 }; recalcHero();
      rows.push([0, 1, 2, 3, 4, 5, 6, 7].map(d => getSprite('hero', hero.look, d, 'idle', 0, null, PX))); rows.push([[1, 'walk', 0], [1, 'walk', 2], [1, 'walk', 4], [5, 'walk', 2], [3, 'idle', 2], [1, 'attack', 2], [1, 'attack3', 2], [7, 'idle', 1]].map(([d, c, f]) => getSprite('hero', hero.look, d, c, f, { look: hero.look, cls: 'paladin', combo: 0 }, PX))); }
    const cw = 120 * PX, ch = 100 * PX, c = document.createElement('canvas'); c.width = cw * 8 * Z / 2; c.height = ch * rows.length * Z / 2;
    const g = c.getContext('2d'); g.fillStyle = '#2a2420'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach((row, r) => row.forEach((sp, k) => { for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((k * cw / 2 + cw / 4 - sp.ax / 2 * 1 + (q % sp.w) / 2 * 1) * Z, (r * ch / 2 + ch / 2 - 8 - sp.ay / 2 + ((q / sp.w) | 0) / 2) * Z, Z / 2 * 1 + 0.5, Z / 2 * 1 + 0.5); } }));
    return c.toDataURL(); });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close(); })();
