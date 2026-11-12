// the barbarian's non-swing poses with two blades: node poses.cjs <out.png> [Z]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [out, Zs = '2'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const url = await p.evaluate((Z) => {
    const PX = 2, rows = [];
    newHero('warrior'); for (const [s, id] of [['chest', 'b_bear'], ['helm', 'b_skull'], ['weapon', 'war_axe'], ['shield', 'long_sword']]) { const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; hero.equip[s] = it; } recalcHero();
    for (const d of [1, 3, 7]) rows.push(['DIR ' + d + ': idle, walk, bash x2, spin x2, death', [['idle', 0], ['walk', 1], ['walk', 3], ['bash', 0], ['bash', 1], ['spin', 0], ['spin', 2], ['death', 2]].map(([c, f]) => getSprite('hero', hero.look, d, c, f, { look: hero.look, cls: 'warrior', combo: 0 }, PX))]);
    const cw = 64 * PX, ch = 64 * PX, cols = 8, c = document.createElement('canvas'); c.width = cw * cols * Z; c.height = (ch + 12) * rows.length * Z;
    const g = c.getContext('2d'); g.fillStyle = '#3d4a2c'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach(([nm, sps], r) => { const oy = r * (ch + 12);
      sps.forEach((sp, k) => { for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((k * cw + cw / 2 - sp.ax + (q % sp.w)) * Z, (oy + 12 + ch - 8 - sp.ay + ((q / sp.w) | 0)) * Z, Z, Z); } });
      g.fillStyle = '#fff'; g.font = (9 * Z) + 'px monospace'; g.fillText(nm, 4, (oy + 10) * Z); });
    return c.toDataURL();
  }, +Zs);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close();
})();
