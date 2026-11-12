// Round 110 (ranger gear): render ranger outfits at the game's detail (SPX 2) in 4 directions, walk, the shot
// (full draw, the loose), Multishot's canted bow and Rain of Arrows' sky pose.
//   node tools/playtests/r110/ranger/tiers.cjs <out.png> [set=new|old|all|<comma list of outfit names>] [Z=2]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const OUT = {
  'L6 BLACKTHORN (OLD TOP)': { chest: 'blackthorn_warden_jerkin', helm: 'night_hood', weapon: 'blackthorn_warden_bow', shield: 'deep_quiver' },
  'L6 FALCONER': { chest: 'rt_falconer_jerkin', helm: 'rt_falconer_hood', weapon: 'rt_falconer_bow', shield: 'rt_falconer_quiver' },
  'L8 ANTLER WARDEN': { chest: 'rt_antler_jerkin', helm: 'rt_antler_hood', weapon: 'rt_antler_bow', shield: 'rt_antler_quiver' },
  'L10 WILDHEART': { chest: 'rt_wildheart_jerkin', helm: 'rt_wildheart_hood', weapon: 'rt_wildheart_bow', shield: 'rt_wildheart_quiver' },
};
const COLS = [['d1', 1, 'idle', 0], ['d3', 3, 'idle', 0], ['d5 back', 5, 'idle', 0], ['d7', 7, 'idle', 0], ['walk d1', 1, 'walk', 2], ['walk d6', 6, 'walk', 5],
  ['draw d1', 1, 'shoot', 1], ['loose d1', 1, 'shoot', 2], ['draw d3', 3, 'shoot', 1], ['draw d6', 6, 'shoot', 1], ['multi d1', 1, 'volley', 1], ['sky d1', 1, 'skyshot', 1]];
(async () => {
  const [out, which = 'all', Zs = '2'] = process.argv.slice(2);
  const names = which === 'all' ? Object.keys(OUT) : which === 'new' ? Object.keys(OUT).slice(1) : which === 'old' ? Object.keys(OUT).slice(0, 1) : which.split(',');
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(__dirname, '../../../../game/index.html') + '?cine=0');
  const url = await p.evaluate(([rows0, COLS, Z]) => {
    buildBudget.ms = Infinity;
    const PXQ = 2, CW = 44 * PXQ * Z, CH = 50 * PXQ * Z, LAB = 18;
    const rows = rows0.map(([nm, o]) => {
      newHero('ranger'); for (const s of SLOTS) if (s !== 'ring' && s !== 'amulet') hero.equip[s] = null;
      for (const [k, id] of Object.entries(o)) { if (!ITEM_BASES[id]) continue; const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; hero.equip[k] = it; }
      recalcHero();
      return [nm, COLS.map(([, d, c, f]) => getSprite('hero', hero.look, d, c, f, { look: hero.look, cls: 'ranger', combo: 0 }, PXQ))];
    });
    const c = document.createElement('canvas'); c.width = CW * COLS.length; c.height = (CH + LAB) * rows.length + LAB;
    const g = c.getContext('2d'); g.fillStyle = '#4a4d52'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#c9c2b2'; g.font = '12px monospace'; COLS.forEach(([t], k) => g.fillText(t, k * CW + 6, 13));
    rows.forEach(([nm, sps], n) => { const oy = LAB + n * (CH + LAB);
      g.fillStyle = '#ffd77a'; g.font = 'bold 13px monospace'; g.fillText(nm, 6, oy + 14);
      sps.forEach((sp, k) => { g.fillStyle = k % 2 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.03)'; g.fillRect(k * CW, oy + LAB, CW, CH);
        for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect(k * CW + CW / 2 - sp.ax * Z + (q % sp.w) * Z, oy + LAB + CH - 6 * PXQ * Z - sp.ay * Z + ((q / sp.w) | 0) * Z, Z, Z); } });
    });
    return c.toDataURL();
  }, [names.map(n => [n, OUT[n]]), COLS, +Zs]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close();
})();
