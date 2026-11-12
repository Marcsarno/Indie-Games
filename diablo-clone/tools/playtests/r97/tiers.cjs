// the paladin's tiers, full outfits, 4 directions + a swing frame: node tiers.cjs <out.png> [Z]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [out, Zs = '4'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const url = await p.evaluate((Z) => {
    const PXQ = window.__px || 2, T = [['SQUIRE', 'pal_plate1', 'pal_helm1', 'pal_hammer', 'pal_shield1'], ['TEMPLAR', 'pal_plate2', 'pal_helm2', 'pal_mace', 'pal_shield2'], ['CRUSADER', 'pal_plate3', 'pal_helm3', 'pal_warhammer', 'pal_shield3'],
      ['CRUSADER 2H', 'pal_plate3', 'pal_helm3', 'pal_maul', null], ['SUNGUARD', 'pal_plate4', 'pal_helm4', 'pal_maul2', null], ['DAWNBRINGER', 'pal_plate5', 'pal_helm4', 'pal_warhammer', 'pal_shield4'], ['DAWN + DAWNBREAKER', 'pal_plate5', 'pal_helm4', 'pal_dawn', null]];
    const rows = [];
    for (const [nm, ...ids] of T) {
      newHero('paladin'); for (const s of SLOTS) if (s !== 'ring' && s !== 'amulet') hero.equip[s] = null;
      for (const id of ids) if (id) { const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; hero.equip[ITEM_BASES[id].slot] = it; }
      recalcHero();
      rows.push([nm, [[1, 'idle', 0], [3, 'idle', 0], [5, 'idle', 0], [7, 'walk', 2], [1, 'attack', 2]].map(([d, c, f]) => getSprite('hero', hero.look, d, c, f, { look: hero.look, cls: 'paladin', combo: 0 }, PXQ))]);
    }
    const cw = 64 * PXQ, ch = 66 * PXQ, c = document.createElement('canvas'); c.width = cw * 5 * Z; c.height = ch * rows.length * Z;
    const g = c.getContext('2d'); g.fillStyle = '#3d4a2c'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach(([nm, sps], n) => { const oy = n * ch;
      sps.forEach((sp, k) => { for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((k * cw + cw / 2 - sp.ax + (q % sp.w)) * Z, (oy + ch - 4 * PXQ - sp.ay + ((q / sp.w) | 0)) * Z, Z, Z); } });
      g.fillStyle = '#fff'; g.font = (7 * PXQ * Z) + 'px monospace'; g.fillText(nm, 4, oy * Z + 8 * PXQ * Z); });
    return c.toDataURL();
  }, +Zs);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close();
})();
