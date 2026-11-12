// the barbarian's tiers (round 106), full outfits, 4 directions + a swing frame: node tiers.cjs <out.png> [Z]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [out, Zs = '4', game = 'game', which = 'new'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=0');
  const url = await p.evaluate(([Z, which]) => {
    const PXQ = window.__px || 2, T = which === 'old' ? [['OLD WARRIOR START', 'tunic', null, 'short_sword', null], ['CHAIN + KITE', 'chain_mail', 'great_helm', 'long_sword', 'kite_shield'], ['PLATE + TOWER', 'plate_mail', 'crown_helm', 'broadsword', 'tower_shield'], ['DARK PLATE 2H', 'dark_plate', 'barbute', 'greatsword', null]] : [['HIDE + AXE/SWORD', 'b_hide', 'b_band', 'hand_axe', 'short_sword'], ['WOLFPELT', 'b_wolf', 'b_wolfhood', 'war_axe', 'hand_axe'], ['BEARHIDE', 'b_bear', 'horned_helm', 'mace', 'war_axe'],
      ['BONECLAD', 'b_bone', 'b_skull', 'broadsword', 'flail'], ['WARLORD', 'b_warlord', 'b_horns', 'copper_raider_weapon', 'war_axe'], ['WARLORD 2H', 'b_warlord', 'b_horns', 'battle_axe', null]];
    const rows = [];
    for (const [nm, ...ids] of T) {
      newHero('warrior'); for (const s of SLOTS) if (s !== 'ring' && s !== 'amulet') hero.equip[s] = null;
      ids.forEach((id, k) => { if (!id) return; const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; hero.equip[k === 3 ? 'shield' : ITEM_BASES[id].slot] = it; });
      recalcHero();
      rows.push([nm, [[1, 'idle', 0], [3, 'idle', 0], [5, 'idle', 0], [7, 'walk', 2], [1, 'attack', 2]].map(([d, c, f]) => getSprite('hero', hero.look, d, c, f, { look: hero.look, cls: 'warrior', combo: 0 }, PXQ))]);
    }
    const cw = 64 * PXQ, ch = 66 * PXQ, c = document.createElement('canvas'); c.width = cw * 5 * Z; c.height = ch * rows.length * Z;
    const g = c.getContext('2d'); g.fillStyle = '#3d4a2c'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach(([nm, sps], n) => { const oy = n * ch;
      sps.forEach((sp, k) => { for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((k * cw + cw / 2 - sp.ax + (q % sp.w)) * Z, (oy + ch - 4 * PXQ - sp.ay + ((q / sp.w) | 0)) * Z, Z, Z); } });
      g.fillStyle = '#fff'; g.font = (7 * PXQ * Z) + 'px monospace'; g.fillText(nm, 4, oy * Z + 8 * PXQ * Z); });
    return c.toDataURL();
  }, [+Zs, which]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close();
})();
