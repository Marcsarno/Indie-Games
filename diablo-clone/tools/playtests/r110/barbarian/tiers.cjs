// round 110: the barbarian's new tiers (L6 Tuskbreaker, L8 Thunderhorn, L10 Mammoth Chieftain) as he looks in game:
// 4 directions idle, a walk frame, two swing frames (right hand, left hand), on a mid-lit floor.
//   node tools/playtests/r110/barbarian/tiers.cjs <out.png> [Z=3] [mode=new|before|tusk|thunder|mammoth] [game=game]
// mode before: the old top look (L5 Warlord's Furs) over the three new ones.
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const ROWS = {
  warlord: [['L5 WARLORD (OLD TOP)', 'b_warlord', 'b_horns', 'copper_raider_weapon', 'war_axe']],
  tusk: [['L6 TUSKBREAKER', 'bt_tusk', 'bt_boar', 'bt_tuskaxe', 'bt_club']],
  thunder: [['L8 THUNDERHORN 2H', 'bt_thunder', 'bt_ram', 'bt_dblaxe', null], ['L8 THUNDERHORN DUAL', 'bt_thunder', 'bt_ram', 'bt_flail', 'bt_tuskaxe']],
  mammoth: [['L10 MAMMOTH 2H', 'bt_mammoth', 'bt_mskull', 'bt_emberaxe', null], ['L10 MAMMOTH DUAL', 'bt_mammoth', 'bt_mskull', 'bt_cleaver', 'bt_flail']],
};
(async () => {
  const [out, Zs = '3', mode = 'new', game = 'game'] = process.argv.slice(2);
  const T = mode === 'before' ? [...ROWS.warlord, ROWS.tusk[0], ROWS.thunder[0], ROWS.mammoth[0]] : mode === 'new' ? [...ROWS.tusk, ...ROWS.thunder, ...ROWS.mammoth] : ROWS[mode];
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=0');
  const url = await p.evaluate(([Z, T]) => {
    const PXQ = window.__px || 2, rows = [];
    for (const [nm, ...ids] of T) {
      newHero('warrior'); for (const s of SLOTS) if (s !== 'ring' && s !== 'amulet') hero.equip[s] = null;
      ids.forEach((id, k) => { if (!id) return; const it = rollItem(rng(1), 10, id); it.rarity = 'normal'; it.mods = {}; hero.equip[k === 3 ? 'shield' : ITEM_BASES[id].slot] = it; });
      recalcHero();
      const fr = [[1, 'idle', 0, 0], [3, 'idle', 0, 0], [5, 'idle', 0, 0], [7, 'idle', 0, 0], [1, 'walk', 2, 0], [1, 'attack', 2, 0], [3, 'attack', 2, 1]];
      rows.push([nm, fr.map(([d, c, f, combo]) => getSprite('hero', hero.look, d, c, f, { look: hero.look, cls: 'warrior', combo }, PXQ))]);
    }
    const cw = 64 * PXQ, ch = 70 * PXQ, c = document.createElement('canvas'); c.width = cw * 7 * Z; c.height = ch * rows.length * Z;
    const g = c.getContext('2d'); g.fillStyle = '#3a3530'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach(([nm, sps], n) => { const oy = n * ch;
      sps.forEach((sp, k) => { for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((k * cw + cw / 2 - sp.ax + (q % sp.w)) * Z, (oy + ch - 4 * PXQ - sp.ay + ((q / sp.w) | 0)) * Z, Z, Z); } });
      g.fillStyle = '#fff'; g.font = (6 * PXQ * Z) + 'px monospace'; g.fillText(nm, 4, oy * Z + 7 * PXQ * Z); });
    return c.toDataURL();
  }, [+Zs, T]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close();
})();
