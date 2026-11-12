// round 110: the barbarian's three armor sets at game scale: node sets.cjs <out.png> [Z] [which] [game]
// which: all (default) | bloodmoon | frostjaw | ashen | before | pieces
// Rows: the full set (3 pieces, a plain hand axe in the off hand) in 4 directions, walk, two swings (main and
// off hand) and Whirlwind; then each piece worn alone with the starting kit (no set look).
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [out, Zs = '3', which = 'all', game = 'game'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=0');
  const url = await p.evaluate(([Z, which]) => {
    const PXQ = window.__px || 2;
    const SET = { bloodmoon: ['bs_blood_helm', 'bs_blood_chest', 'bs_blood_axe'], frostjaw: ['bs_frost_helm', 'bs_frost_chest', 'bs_frost_axe'], ashen: ['bs_ash_helm', 'bs_ash_chest', 'bs_ash_axe'] };
    const COLS = [[1, 'idle', 0], [3, 'idle', 0], [5, 'idle', 0], [7, 'idle', 0], [1, 'walk', 2], [7, 'walk', 5], [1, 'attack', 2, 0], [7, 'attack', 2, 1], [1, 'spin', 1]];
    const wear = (ids, setK) => {
      newHero('warrior'); for (const s of SLOTS) if (s !== 'ring' && s !== 'amulet') hero.equip[s] = null;
      ids.forEach((id, k) => { if (!id) return; const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; if (setK && id.startsWith('bs_')) { it.rarity = 'set'; it.set = setK; }
        hero.equip[k === 3 ? 'shield' : ITEM_BASES[id].slot] = it; });
      recalcHero();
    };
    const shot = (d, c, f, combo) => getSprite('hero', hero.look, d, c, f, { look: hero.look, cls: 'warrior', combo: combo || 0 }, PXQ);
    const rows = [];
    const sets = which === 'all' || which === 'pieces' ? Object.keys(SET) : which === 'before' ? [] : [which];
    if (which === 'before') for (const [nm, ids] of [['WARLORD (ROUND 106)', ['b_horns', 'b_warlord', 'war_axe', 'hand_axe']], ['BONECLAD', ['b_skull', 'b_bone', 'war_axe', 'hand_axe']]]) { wear(ids); rows.push([nm, COLS.map(([d, c, f, cb]) => shot(d, c, f, cb))]); }
    for (const k of sets) {
      if (which !== 'pieces') { wear([...SET[k], 'hand_axe'], k); rows.push([k.toUpperCase() + ' SET (' + hero.look.set + ')', COLS.map(([d, c, f, cb]) => shot(d, c, f, cb))]); }
      if (which === 'pieces' || which !== 'all') {
        const cells = [];
        for (const [i, slot] of [[0, 'helm'], [1, 'chest'], [2, 'weapon']]) { const ids = ['b_band', 'b_hide', 'hand_axe', 'short_sword']; ids[i] = SET[k][i]; wear(ids, k); for (const d of [1, 5]) cells.push(shot(d, 'idle', 0)); void slot; }
        rows.push([k.toUpperCase() + ' PIECES ALONE (HELM, CHEST, AXE)', cells]);
      }
    }
    const nc = Math.max(...rows.map(r => r[1].length)), cw = 64 * PXQ, ch = 70 * PXQ, c = document.createElement('canvas'); c.width = cw * nc * Z; c.height = ch * rows.length * Z;
    const g = c.getContext('2d'); g.fillStyle = '#3d4a2c'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach(([nm, sps], n) => { const oy = n * ch;
      sps.forEach((sp, k) => { if (!sp) return; for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((k * cw + cw / 2 - sp.ax + (q % sp.w)) * Z, (oy + ch - 4 * PXQ - sp.ay + ((q / sp.w) | 0)) * Z, Z, Z); } });
      g.fillStyle = '#fff'; g.font = (6 * PXQ * Z) + 'px monospace'; g.fillText(nm, 4, oy * Z + 7 * PXQ * Z); });
    return c.toDataURL();
  }, [+Zs, which]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close();
})();
