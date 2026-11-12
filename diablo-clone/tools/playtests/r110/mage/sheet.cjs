// round 110 mage tiers: full outfits in 4 directions, walk, cast (channel), storm, hurl, slam, + icons.
// node tools/playtests/r110/mage/sheet.cjs <out.png> [Z] [px] [rows: comma list of tier keys]   (run from diablo-clone)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const TIERS = {
  sun: ['L6 SUNWARDEN (old top)', 'sunwarden_robe', 'sunwarden_hat', 'sunwarden_staff'],
  rune: ['L5 RUNEBINDER', 'runebinder_robe', 'runebinder_hat', 'runebinder_staff'],
  storm: ['L6 STORMCALLER', 'mt_storm_robe', 'mt_storm_hat', 'mt_storm_staff'],
  frost: ['L6 + FROSTSPIRE', 'mt_storm_robe', 'mt_storm_hat', 'mt_frost_staff'],
  star: ['L8 STARSEER', 'mt_star_robe', 'mt_star_hat', 'mt_star_staff'],
  ember: ['L8 + EMBER BRAZIER', 'mt_star_robe', 'mt_star_hat', 'mt_ember_staff'],
  eclipse: ['L10 ECLIPSE ARCHMAGE', 'mt_eclipse_robe', 'mt_eclipse_hat', 'mt_eclipse_staff'],
  root: ['L10 + ELDER ROOT', 'mt_eclipse_robe', 'mt_eclipse_hat', 'mt_root_staff'],
};
(async () => {
  const [out, Zs = '3', pxs = '1', rowsArg = 'sun,storm,star,eclipse', mode = 'pose'] = process.argv.slice(2);   // mode 'gate': idle 4 dirs at light 1 / 3 / 6 and as silhouettes
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const T = rowsArg.split(',').map(k => TIERS[k]);
  const url = await p.evaluate(([T, Z, PXQ, mode]) => {
    const gate = mode === 'gate', LV = []; let cols = [[1, 'idle', 0], [3, 'idle', 0], [5, 'idle', 0], [7, 'idle', 0], [1, 'walk', 2], [3, 'walk', 6], [1, 'channel', 1], [2, 'channel', 4], [1, 'channel', 7], [3, 'channel', 9], [1, 'storm', 1]];
    if (mode === 'walk') cols = [0, 1, 2, 3, 4, 5, 6, 7].map(f => [1, 'walk', f]).concat([0, 2, 4, 6].map(f => [3, 'walk', f]));
    if (gate) { cols = []; for (const lv of [1, 3, 6, -1]) for (const d of [1, 3, 5, 7]) { cols.push([d, 'idle', 0]); LV.push(lv); } }
    const old = buildBudget.ms; buildBudget.ms = Infinity;
    const rows = [];
    for (const [nm, ...ids] of T) {
      newHero('mage'); for (const s of SLOTS) hero.equip[s] = null;
      for (const id of ids) if (id) { if (!ITEM_BASES[id]) throw new Error('no base ' + id); const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; hero.equip[ITEM_BASES[id].slot] = it; }
      recalcHero();
      rows.push([nm, cols.map(([d, c, f]) => getSprite('hero', hero.look, d, c, f, hero, PXQ)), ids.map(id => itemIcon({ base: id }))]);
    }
    buildBudget.ms = old;
    const cw = 52 * PXQ, ch = 70 * PXQ, iw = 30, c = document.createElement('canvas'); c.width = (cw * cols.length + iw * 3) * Z; c.height = ch * rows.length * Z;
    const g = c.getContext('2d'); g.fillStyle = '#4a4a52'; g.fillRect(0, 0, c.width, c.height);
    const blit = (sp, x0, y0, lv = 4) => { for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = lv < 0 ? 1 : (v0 & 128) ? v0 & 127 : LTAB[lv][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((x0 + (q % sp.w)) * Z, (y0 + ((q / sp.w) | 0)) * Z, Z, Z); } };
    rows.forEach(([nm, sps, icons], n) => { const oy = n * ch;
      sps.forEach((sp, k) => blit(sp, k * cw + cw / 2 - sp.ax, oy + ch - 4 * PXQ - sp.ay, gate ? LV[k] : 4));
      icons.forEach((ic, k) => blit(ic, cw * cols.length + k * iw, oy + ch / 2 - 13));
      g.fillStyle = '#fff'; g.font = (6 * Z) + 'px monospace'; g.fillText(nm, 4, oy * Z + 7 * Z); });
    return c.toDataURL();
  }, [T, +Zs, +pxs, mode]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close();
})();
