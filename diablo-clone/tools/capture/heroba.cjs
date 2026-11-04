// heroes side by side for a before/after: node heroba.cjs <gameDir> <out.png> <bases,comma-separated per hero; '|' between heroes>
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(process.argv[2], 'index.html'));
  const url = await p.evaluate(spec => { buildBudget.ms = Infinity; G.mode = 'play'; newHero('warrior'); startLevel(3, 777);
    const heroes = spec.split('|').map(s => s.split(','));
    const Z = 3, cw = 46, cv = document.createElement('canvas'); cv.width = heroes.length * cw * Z; cv.height = 64 * Z; const g = cv.getContext('2d'); g.fillStyle = `rgb(${PR[4]},${PG[4]},${PB[4]})`; g.fillRect(0, 0, cv.width, cv.height);
    let serial = 1e6; const mk = base => ({ id: serial++, base, rarity: 'normal', name: base, mods: {} });
    heroes.forEach(([cls, ...bases], n) => { newHero(cls); for (const k of bases) if (ITEM_BASES[k]) hero.equip[ITEM_BASES[k].slot] = mk(k); recalcHero();
      const sp = getSprite('hero', hero.look, 1, 'idle', 0, hero, SPX);
      for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((n * cw + cw / 2 + ((q % sp.w) - sp.ax) / SPX * 1) * Z, (56 + (((q / sp.w) | 0) - sp.ay) / SPX) * Z, Z / SPX * 1 + 0.5, Z / SPX + 0.5); } });
    return cv.toDataURL(); }, process.argv[4]);
  fs.writeFileSync(process.argv[3], Buffer.from(url.split(',')[1], 'base64')); await b.close(); })();
