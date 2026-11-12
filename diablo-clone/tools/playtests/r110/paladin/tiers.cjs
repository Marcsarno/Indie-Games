// round 110: the paladin's new look tiers (L6 Silver Vigil, L8 Auric Champion, L10 High Seraph) at game scale.
// node tools/playtests/r110/paladin/tiers.cjs <out.png> [Z] [rows: new|old|all|swing] (run from diablo-clone)
// columns: 4 directions idle, walk (2 dirs), the swing's strike (2 dirs), blessed (Consecrate) idle, the bag icons
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [out, Zs = '3', which = 'new'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  if (errs.length) { console.log(errs.join('\n')); process.exit(1); }
  const url = await p.evaluate(([Z, which]) => {
    buildBudget.ms = 1e9;
    const PXQ = window.__px || 2;
    const OLD = [['L5 SUNGUARD 2H', 'pal_plate4', 'pal_helm4', 'pal_maul2', null], ['L6 DAWNBRINGER', 'pal_plate5', 'pal_helm4', 'pal_warhammer', 'pal_shield4']];
    const NEW = [['L6 SILVER VIGIL', 'pt_vigil_plate', 'pt_vigil_helm', 'pt_vigil_mace', 'pt_vigil_shield'],
      ['L8 AURIC CHAMPION', 'pt_auric_plate', 'pt_auric_helm', 'pt_auric_hammer', 'pt_auric_shield'], ['L8 AURIC 2H', 'pt_auric_plate', 'pt_auric_helm', 'pt_auric_maul', null],
      ['L10 HIGH SERAPH', 'pt_seraph_plate', 'pt_seraph_helm', 'pt_seraph_hammer', 'pt_seraph_shield'], ['L10 SERAPH 2H', 'pt_seraph_plate', 'pt_seraph_helm', 'pt_seraph_maul', null]];
    const T = which === 'old' ? OLD : which === 'all' ? [...OLD, ...NEW] : NEW;
    const swing = which === 'swing';
    const cols = swing ? [[1, 'attack', 0], [1, 'attack', 1], [1, 'attack', 2], [1, 'attack', 3], [3, 'attack', 1], [3, 'attack', 2], [3, 'attack', 3], [1, 'attack', 2, 'blessed'], [3, 'attack', 2, 'blessed']] : [[1, 'idle', 0], [3, 'idle', 0], [5, 'idle', 0], [7, 'idle', 0], [1, 'walk', 2], [3, 'walk', 5], [1, 'attack', 3], [7, 'attack', 3], [1, 'idle', 0, 'blessed']];
    const rows = [];
    for (const [nm, ...ids] of (swing ? NEW : T)) {
      newHero('paladin'); for (const s of SLOTS) if (s !== 'ring' && s !== 'amulet') hero.equip[s] = null;
      const its = [];
      for (const id of ids) if (id) { const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; hero.equip[ITEM_BASES[id].slot] = it; its.push(it); }
      recalcHero();
      const sps = cols.map(([d, c, f, ench]) => { const look = ench ? Object.assign({}, hero.look, { ench }) : hero.look; return getSprite('hero', look, d, c, f, { look, cls: 'paladin', combo: 0 }, PXQ); });
      rows.push([nm, sps, swing ? [] : its.map(it => itemIcon(it))]);
    }
    const cw = 64 * PXQ, ch = 82 * PXQ, iw = 30, nIc = swing ? 0 : 4, c = document.createElement('canvas'); c.width = (cw * cols.length + iw * PXQ * nIc) * Z; c.height = ch * rows.length * Z;
    const g = c.getContext('2d'); g.fillStyle = '#3d4a2c'; g.fillRect(0, 0, c.width, c.height);
    const blit = (sp, x0, y0, s) => { for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((x0 + (q % sp.w) * s) * Z, (y0 + ((q / sp.w) | 0) * s) * Z, s * Z, s * Z); } };
    rows.forEach(([nm, sps, ics], n) => { const oy = n * ch;
      sps.forEach((sp, k) => blit(sp, k * cw + cw / 2 - sp.ax, oy + ch - 4 * PXQ - sp.ay, 1));
      ics.forEach((ic, k) => { if (!ic) return; if (ic.data) blit(ic, cw * cols.length + k * iw * PXQ, oy + 16 * PXQ, PXQ); else { g.imageSmoothingEnabled = false; g.drawImage(ic, (cw * cols.length + k * iw * PXQ) * Z, (oy + 16 * PXQ) * Z, (ic.width || 26) * PXQ * Z, (ic.height || 26) * PXQ * Z); } });
      g.fillStyle = '#fff'; g.font = (7 * PXQ * Z) + 'px monospace'; g.fillText(nm, 4, oy * Z + 8 * PXQ * Z); });
    return c.toDataURL();
  }, [+Zs, which]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close();
})();
