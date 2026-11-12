// the paladin's swing animations, frame by frame, for a few loadouts: node swings.cjs <out.png> [Z]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [out, Zs = '3'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const url = await p.evaluate((Z) => {
    const L = [['SQUIRE', ['pal_plate1', 'pal_helm1', 'pal_hammer', 'pal_shield1']], ['CRUSADER', ['pal_plate3', 'pal_helm3', 'pal_warhammer', 'pal_shield3']], ['SUNGUARD 2H', ['pal_plate4', 'pal_helm4', 'pal_maul2']], ['DAWN', ['pal_plate5', 'pal_helm4', 'pal_dawn']]];
    const rows = [], PX = 2;
    for (const [nm, ids] of L) {
      newHero('paladin'); hero.equip.shield = null; for (const id of ids) { const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; hero.equip[ITEM_BASES[id].slot] = it; } recalcHero();
      for (const c of [0, 1, 2]) { const sw = weaponSwing(hero.look, c), clip = ATTACK_CLIPS[c], row = [];
        for (let k = 0; k < sw.length; k++) row.push(getSprite('hero', hero.look, 1, clip, k, { look: hero.look, cls: 'paladin', combo: c }, PX));
        rows.push([nm + ' ' + clip + ' ' + sw.map(s => s.ms + (s.hit ? '*' : '')).join(','), row]); }
    }
    const cw = 64 * PX, ch = 64 * PX, cols = Math.max(...rows.map(r => r[1].length)), c = document.createElement('canvas'); c.width = cw * cols * Z; c.height = (ch + 12) * rows.length * Z;
    const g = c.getContext('2d'); g.fillStyle = '#3d4a2c'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach(([nm, sps], r) => { const oy = r * (ch + 12);
      sps.forEach((sp, k) => { for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((k * cw + cw / 2 - sp.ax + (q % sp.w)) * Z, (oy + 12 + ch - 8 - sp.ay + ((q / sp.w) | 0)) * Z, Z, Z); } });
      g.fillStyle = '#fff'; g.font = (9 * Z) + 'px monospace'; g.fillText(nm, 4, (oy + 10) * Z); });
    return c.toDataURL();
  }, +Zs);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close();
})();
