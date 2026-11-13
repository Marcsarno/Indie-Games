// round 111d: the proposed Act I "journey sets": five matched outfits per class, one per level band, front
// and back, for the user to approve or swap. Picks are by item name (the plain tier, not TEMPERED/ANCIENT).
//   node tools/playtests/r111/journey.cjs <out.png> [Z=3]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const PICKS = {   // [band, set, chest, helm, weapon, off-hand]
  BARBARIAN: ['warrior', [['1-2', 'HIDE', 'HIDE WRAPS', 'WAR BAND'], ['3-4', 'BEARHIDE', 'BEARHIDE VEST', 'BEAR SKULL'], ['5-6', 'TUSKBREAKER', 'TUSKBREAKER HIDE', "BOAR'S HEAD"], ['7-8', 'THUNDERHORN', 'THUNDERHORN HARNESS', 'THUNDERHORN HELM'], ['9-10', 'MAMMOTH', "CHIEFTAIN'S MAMMOTH FURS", 'MAMMOTH SKULL']]],
  PALADIN: ['paladin', [['1-2', 'SQUIRE', "SQUIRE'S PLATE", "SQUIRE'S HELM"], ['3-4', 'WINTER BULWARK', 'WINTER BULWARK ARMOR', 'WINTER BULWARK HELM'], ['5-6', 'SILVER VIGIL', 'SILVER VIGIL PLATE', 'VIGIL GREAT HELM'], ['7-8', 'AURIC', 'AURIC PLATE', 'AURIC SUNBURST'], ['9-10', 'SERAPH', 'HIGH SERAPH PLATE', 'SERAPH HELM']]],
  MAGE: ['mage', [['1-2', 'WAYFARER', 'WAYFARER ROBE', 'WAYFARER HAT'], ['3-4', 'CRIMSON ORACLE', 'CRIMSON ORACLE ROBE', 'CRIMSON ORACLE HAT'], ['5-6', 'STORMCALLER', 'STORMCALLER ROBE', 'STORMCALLER HAT'], ['7-8', 'STARSEER', 'STARSEER ROBE', 'STARSEER HAT'], ['9-10', 'ECLIPSE', 'ECLIPSE ROBE', 'ECLIPSE HAT']]],
  RANGER: ['ranger', [['1-2', 'LEATHER', 'LEATHER JERKIN', 'RANGER HOOD'], ['3-4', 'THORN SENTINEL', 'THORN SENTINEL JERKIN', 'NIGHT HOOD*'], ['5-6', 'FALCONER', 'FALCONER JERKIN', 'FALCONER HOOD'], ['7-8', 'ANTLER WARDEN', 'ANTLER WARDEN JERKIN', 'ANTLER WARDEN HOOD'], ['9-10', 'WILDHEART', 'WILDHEART JERKIN', 'WILDHEART HOOD']]],
};
(async () => { const [out, Zs = '3'] = process.argv.slice(2), b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(__dirname, '../../../game/index.html') + '?cine=0');
  const url = await p.evaluate(([PICKS, Z]) => {
    buildBudget.ms = Infinity; const PXQ = 2, CW = 40 * PXQ * Z, CH = 46 * PXQ * Z, LAB = 40, NAMEW = 150, warn = [];
    const byName = (cls, nm, slot) => { hero.cls = cls; const ids = Object.keys(ITEM_BASES).filter(k => ITEM_BASES[k].name === nm.replace('*', '') && forCls(ITEM_BASES[k])); return ids[0]; };
    const bestWeapon = (cls, set, lvl) => { hero.cls = cls; const w = Object.keys(ITEM_BASES).filter(k => ITEM_BASES[k].slot === 'weapon' && forCls(ITEM_BASES[k]) && !/^(TEMPERED|ANCIENT)/.test(ITEM_BASES[k].name) && ITEM_BASES[k].lvl <= lvl && !ITEM_BASES[k].setOnly);
      const named = w.filter(k => ITEM_BASES[k].name.includes(set.split(' ').pop())); const pool = named.length ? named : w; return pool.sort((a, c) => ITEM_BASES[c].lvl - ITEM_BASES[a].lvl || (ITEM_BASES[c].dmg[1] - ITEM_BASES[a].dmg[1]))[0]; };
    const offFor = (cls, wid, lvl) => { hero.cls = cls; if (ITEM_BASES[wid].twoHand) return null; const sl = cls === 'ranger' ? 'shield' : cls === 'paladin' ? 'shield' : null; if (!sl) return null;
      const s = Object.keys(ITEM_BASES).filter(k => ITEM_BASES[k].slot === sl && forCls(ITEM_BASES[k]) && ITEM_BASES[k].lvl <= lvl && !/^(TEMPERED|ANCIENT)/.test(ITEM_BASES[k].name)); return s.sort((a, c) => ITEM_BASES[c].lvl - ITEM_BASES[a].lvl)[0]; };
    const rows = Object.entries(PICKS), cvs2 = document.createElement('canvas'); cvs2.width = NAMEW + 5 * 2 * CW; cvs2.height = rows.length * (LAB + CH) + 70; const g = cvs2.getContext('2d');
    g.fillStyle = '#3e4146'; g.fillRect(0, 0, cvs2.width, cvs2.height); g.fillStyle = '#ffd77a'; g.font = 'bold 22px monospace'; g.fillText('ACT I JOURNEY SETS: one matched set per two levels (front, back)', 12, 32);
    const paint = (sp, x0, y0) => { for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v0 = sp.data[y * sp.w + x]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect(x0 + x * Z, y0 + y * Z, Z, Z); } };
    rows.forEach(([cname, [cls, bands]], r) => { const y0 = 50 + r * (LAB + CH);
      g.fillStyle = '#ffd77a'; g.font = 'bold 18px monospace'; g.fillText(cname, 10, y0 + LAB + CH / 2);
      bands.forEach(([band, set, chest, helm], c) => { const x0 = NAMEW + c * 2 * CW, lv = +band.split('-')[1];
        newHero(cls); for (const s of SLOTS) if (s !== 'ring' && s !== 'amulet') hero.equip[s] = null;
        const ids = { chest: byName(cls, chest), helm: byName(cls, helm) }; ids.weapon = bestWeapon(cls, set, lv); const off = offFor(cls, ids.weapon, lv); if (off) ids.shield = off;
        if (!ids.chest || !ids.helm) warn.push(cname + ' ' + band + ' missing ' + (!ids.chest ? chest : helm));
        for (const [s, id] of Object.entries(ids)) if (id) { const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; hero.equip[s] = it; }
        recalcHero(); hero.cls = cls;
        g.fillStyle = c % 2 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.04)'; g.fillRect(x0, y0, 2 * CW, LAB + CH);
        g.fillStyle = '#f2ead8'; g.font = 'bold 14px monospace'; g.fillText('LV ' + band + '  ' + set, x0 + 6, y0 + 16);
        g.fillStyle = helm.includes('*') ? '#ff9a7a' : '#b9b3a6'; g.font = '11px monospace'; g.fillText((ids.weapon ? ITEM_BASES[ids.weapon].name : '') + (helm.includes('*') ? '  (no matching hood yet)' : ''), x0 + 6, y0 + 32);
        for (const [k, d] of [[0, 1], [1, 5]]) { const sp = getSprite('hero', hero.look, d, 'idle', 0, { look: hero.look, cls, combo: 0 }, PXQ); paint(sp, x0 + k * CW + CW / 2 - sp.ax * Z, y0 + LAB + CH - 6 * Z - sp.ay * Z); }
      });
    });
    return [cvs2.toDataURL(), warn];
  }, [PICKS, +Zs]);
  fs.writeFileSync(out, Buffer.from(url[0].split(',')[1], 'base64')); console.log(url[1].join('\n') || 'all pieces found'); console.log(errs.slice(0, 3).join('\n') || 'no errors'); await b.close(); })();
