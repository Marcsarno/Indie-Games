// every warrior chest (or helm/shield/weapon) on the hero: node gear.cjs <slot> <out.png> [cls] [extra-js]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [slot = 'chest', out, cls = 'warrior', extra = ''] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const url = await p.evaluate(([slot, cls, extra]) => {
    const Z = 4, cw = 64, ch = 74, ids = Object.keys(ITEM_BASES).filter(k => ITEM_BASES[k].slot === slot && (ITEM_BASES[k].cls === cls || cls === 'any'));
    const rows = [];
    for (const id of ids) {
      newHero(cls === 'any' ? 'warrior' : cls); if (extra) eval(extra);
      const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; hero.equip[slot] = it; recalcHero();
      rows.push([id, [1, 3, 5, 7].map(d => getSprite('hero', hero.look, d, 'idle', 0))]);
    }
    const cols = 3, c = document.createElement('canvas'); c.width = cw * 4 * Z * cols; c.height = ch * Math.ceil(rows.length / cols) * Z;
    const g = c.getContext('2d'); g.fillStyle = '#3d4a2c'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach(([id, sps], n) => { const ox = (n % cols) * cw * 4, oy = Math.floor(n / cols) * ch;
      sps.forEach((sp, k) => { for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((ox + k * cw + cw / 2 - sp.ax + (q % sp.w)) * Z, (oy + ch - 4 - sp.ay + ((q / sp.w) | 0)) * Z, Z, Z); } });
      g.fillStyle = '#fff'; g.font = '28px monospace'; g.fillText(id, ox * Z + 6, oy * Z + 28); });
    return c.toDataURL();
  }, [slot, cls, extra]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close();
})();
