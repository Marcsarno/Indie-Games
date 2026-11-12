// Round 109: reference sheets of every CURRENT gear look per class, for the gear style guide.
//   node tools/playtests/r109/classsheet.cjs <barbarian|paladin|mage|ranger|overview> <out.png> [Z=2]
// Sprites render at the game's own detail (SPX = 2) and are drawn Z times (default 3 = 6x world pixels).
// Sections: tier outfits (front 3/4 = dir 1, back = dir 5, a swing frame), then every chest (dir 1),
// helm (head crop, doubled), weapon (dir 1) and shield/quiver look the class can wear, then a
// palette + materials strip (the rig's M.* ramps under the normal light table). 'overview' puts
// each class's best current tier side by side (the house-style reference). Read-only on game/.
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [which, out, Zs = '3'] = process.argv.slice(2);
  if (!which || !out) { console.log('usage: classsheet.cjs <barbarian|paladin|mage|ranger|overview> <out.png> [Z]'); process.exit(1); }
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(__dirname, '../../../game/index.html') + '?cine=0');
  const url = await p.evaluate(([which, Z]) => {
    buildBudget.ms = Infinity;
    const PXQ = 2, CW = 44 * PXQ * Z, CH = 48 * PXQ * Z, LAB = 34, COLS = 9, BG = '#4a4d52';
    const CLS = { barbarian: 'warrior', paladin: 'paladin', mage: 'mage', ranger: 'ranger' };
    // tier outfits: [label, {chest, helm, weapon, off (barbarian 2nd weapon) / shield}]
    const OUTFITS = {
      barbarian: [['L1 HIDE WRAPS', { chest: 'b_hide', helm: 'b_band', weapon: 'hand_axe', off: 'short_sword' }], ['L2 WOLFPELT', { chest: 'b_wolf', helm: 'b_wolfhood', weapon: 'war_axe', off: 'hand_axe' }],
        ['L3 BEARHIDE', { chest: 'b_bear', helm: 'horned_helm', weapon: 'mace', off: 'war_axe' }], ['L4 BONECLAD', { chest: 'b_bone', helm: 'b_skull', weapon: 'broadsword', off: 'flail' }],
        ['L5 WARLORD (DUAL)', { chest: 'b_warlord', helm: 'b_horns', weapon: 'copper_raider_weapon', off: 'war_axe' }], ['L5 WARLORD (2H)', { chest: 'b_warlord', helm: 'b_horns', weapon: 'battle_axe' }]],
      paladin: [['L1 SQUIRE', { chest: 'pal_plate1', helm: 'pal_helm1', weapon: 'pal_hammer', shield: 'pal_shield1' }], ['L2 TEMPLAR', { chest: 'pal_plate2', helm: 'pal_helm2', weapon: 'pal_mace', shield: 'pal_shield2' }],
        ['L3 CRUSADER', { chest: 'pal_plate3', helm: 'pal_helm3', weapon: 'pal_warhammer', shield: 'pal_shield3' }], ['L3 CRUSADER (2H)', { chest: 'pal_plate3', helm: 'pal_helm3', weapon: 'pal_maul' }],
        ['L4 SUNGUARD (2H)', { chest: 'pal_plate4', helm: 'pal_helm4', weapon: 'pal_maul2' }], ['L6 DAWNBRINGER', { chest: 'pal_plate5', helm: 'pal_helm4', weapon: 'pal_warhammer', shield: 'pal_shield4' }],
        ['DAWNBRINGER + DAWNBREAKER', { chest: 'pal_plate5', helm: 'pal_helm4', weapon: 'pal_dawn' }]],
      mage: [['L1 APPRENTICE', { chest: 'apprentice_robe', helm: 'wizard_hat', weapon: 'oak_staff' }], ['L1 WAYFARER', { chest: 'wayfarer_robe', helm: 'wayfarer_hat', weapon: 'wayfarer_staff' }],
        ['L2 TIDEKEEPER', { chest: 'tidekeeper_robe', helm: 'tidekeeper_hat', weapon: 'tidekeeper_staff' }], ['L2 FROST SCHOLAR', { chest: 'frost_scholar_robe', helm: 'frost_scholar_hat', weapon: 'frost_scholar_staff' }],
        ['L3 CRIMSON ORACLE', { chest: 'rose_oracle_robe', helm: 'rose_oracle_hat', weapon: 'rose_oracle_staff' }], ['L3 DUSKWEAVER', { chest: 'duskweaver_robe', helm: 'duskweaver_hat', weapon: 'duskweaver_staff' }],
        ['L4 CINDER SAGE', { chest: 'cinder_sage_robe', helm: 'cinder_sage_hat', weapon: 'cinder_sage_staff' }], ['L5 RUNEBINDER', { chest: 'runebinder_robe', helm: 'runebinder_hat', weapon: 'runebinder_staff' }],
        ['L6 SUNWARDEN', { chest: 'sunwarden_robe', helm: 'sunwarden_hat', weapon: 'sunwarden_staff' }]],
      ranger: [['L1 LEATHER', { chest: 'leather_jerkin', helm: 'ranger_hood', weapon: 'hunting_bow', shield: 'quiver' }], ['L1 BRAMBLE SCOUT', { chest: 'bramble_scout_jerkin', helm: 'ranger_hood', weapon: 'bramble_scout_bow', shield: 'quiver' }],
        ['L2 ASHWOOD HUNTER', { chest: 'ashwood_hunter_jerkin', helm: 'shadow_hood', weapon: 'ashwood_hunter_bow', shield: 'war_quiver' }], ['L3 DUNE STRIDER', { chest: 'dune_strider_jerkin', helm: 'hunter_hood', weapon: 'dune_strider_bow', shield: 'quiver' }],
        ['L3 NIGHT TRACKER', { chest: 'night_tracker_jerkin', helm: 'shadow_hood', weapon: 'night_tracker_bow', shield: 'quiver' }], ['L4 THORN SENTINEL', { chest: 'thorn_sentinel_jerkin', helm: 'hunter_hood', weapon: 'thorn_sentinel_bow', shield: 'deep_quiver' }],
        ['L5 FROSTPATH STALKER', { chest: 'frostpath_stalker_jerkin', helm: 'night_hood', weapon: 'frostpath_stalker_bow', shield: 'deep_quiver' }], ['L5 DRAKE HIDE', { chest: 'drake_hide', helm: 'night_hood', weapon: 'war_bow', shield: 'deep_quiver' }],
        ['L6 BLACKTHORN WARDEN', { chest: 'blackthorn_warden_jerkin', helm: 'night_hood', weapon: 'blackthorn_warden_bow', shield: 'deep_quiver' }]],
    };
    const BEST = { barbarian: OUTFITS.barbarian[4], paladin: OUTFITS.paladin[5], mage: OUTFITS.mage[8], ranger: OUTFITS.ranger[8] };
    const dress = (cls, o) => {
      newHero(cls); for (const s of SLOTS) if (s !== 'ring' && s !== 'amulet') hero.equip[s] = null;
      for (const [k, id] of Object.entries(o)) { if (!id) continue; const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; hero.equip[k === 'off' ? 'shield' : ITEM_BASES[id].slot] = it; }
      recalcHero();
    };
    const sprite = (cls, d, c, f) => getSprite('hero', hero.look, d, c, f, { look: hero.look, cls, combo: 0 }, PXQ);
    // ------------------------------------------------ drawing
    const blocks = [];   // {h, draw(g, y)}
    let W = COLS * CW;
    const paint = (g, sp, x0, y0, z, crop) => {   // crop: [x, y, w, h] in sprite pixels
      const [cx, cy, cw, chh] = crop || [0, 0, sp.w, sp.h];
      for (let y = cy; y < cy + chh && y < sp.h; y++) for (let x = Math.max(0, cx); x < cx + cw && x < sp.w; x++) {
        const v0 = sp.data[y * sp.w + x]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127];
        g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect(x0 + (x - cx) * z, y0 + (y - cy) * z, z, z);
      }
    };
    const label = (g, x, y, t1, t2) => {
      g.fillStyle = '#f2ead8'; g.font = 'bold 14px monospace'; g.fillText(t1, x + 6, y + 15);
      if (t2) { g.fillStyle = '#b9b3a6'; g.font = '12px monospace'; g.fillText(t2, x + 6, y + 29); }
    };
    // a cell = {t1, t2, sp, head}
    const cellDraw = (g, c, x, y) => {
      g.save(); g.beginPath(); g.rect(x, y, CW, LAB + CH); g.clip();
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + 1, y + 1, CW - 2, LAB + CH - 2);
      label(g, x, y, c.t1, c.t2); cellSprite(g, c, x, y); g.restore();
    };
    const cellSprite = (g, c, x, y) => { const sp = c.sp; if (!sp) { g.fillStyle = '#f44'; g.fillText('NO SPRITE', x + 20, y + 80); return; }
      if (c.head) {   // the head: top rows of the sprite, doubled
        let top = sp.h; for (let q = 0; q < sp.w * sp.h; q++) if (sp.data[q]) { top = (q / sp.w) | 0; break; }
        const hw = 26 * PXQ, hh = 24 * PXQ, z = Math.max(2, Math.round(Z * 5 / 3)), cx = sp.ax - hw / 2;
        paint(g, sp, x + (CW - hw * z) / 2, y + LAB + (CH - hh * z) / 2, z, [Math.round(cx), top, hw, hh]);
      } else paint(g, sp, x + CW / 2 - sp.ax * Z, y + LAB + CH - 4 * PXQ * Z - sp.ay * Z, Z);
    };
    const header = (t, sub) => blocks.push({ h: 44, draw: (g, y) => { g.fillStyle = '#23252a'; g.fillRect(0, y, W, 44); g.fillStyle = '#ffd77a'; g.font = 'bold 20px monospace'; g.fillText(t, 10, y + 28); const tw = g.measureText(t).width; if (sub) { g.fillStyle = '#c9c2b2'; g.font = '13px monospace'; g.fillText(sub, 30 + tw, y + 28); } } });
    const grid = (cells, cols = COLS) => { for (let i = 0; i < cells.length; i += cols) { const row = cells.slice(i, i + cols); blocks.push({ h: LAB + CH, draw: (g, y) => row.forEach((c, k) => cellDraw(g, c, k * CW, y)) }); } };
    const outfitCells = (cls, [nm, o]) => { dress(cls, o); const pieces = Object.values(o).filter(Boolean).map(id => ITEM_BASES[id].look);
      return [{ t1: nm, t2: pieces.slice(0, 2).join(' + '), sp: sprite(cls, 1, 'idle', 0) }, { t1: 'back', t2: pieces.slice(2).join(' + '), sp: sprite(cls, 5, 'idle', 0) }, { t1: 'swing', t2: '', sp: sprite(cls, 1, 'attack', 2) }]; };
    // every look of a slot the class can wear: lowest-level base per look, class-signature looks first
    const looksFor = (key, slot) => {
      const cls = CLS[key]; newHero(cls); const by = new Map();
      for (const [id, o] of Object.entries(ITEM_BASES)) { if (o.slot !== slot || /_t\d$/.test(id) || !forCls(o)) continue; const c = by.get(o.look); if (!c || o.lvl < ITEM_BASES[c].lvl) by.set(o.look, id); }
      const sig = id => key === 'barbarian' ? /^b_/.test(ITEM_BASES[id].look) || slot === 'weapon' : key === 'paladin' ? ITEM_BASES[id].cls === 'paladin' : true;
      const ids = [...by.values()].sort((a, c) => (sig(c) - sig(a)) || (ITEM_BASES[a].lvl - ITEM_BASES[c].lvl));
      return ids.map(id => ({ id, sig: sig(id) }));
    };
    const slotCells = (key, slot) => looksFor(key, slot).map(({ id, sig }) => {
      const cls = CLS[key], B = ITEM_BASES[id], o = { [slot === 'shield' ? 'shield' : slot]: id }; if (slot !== 'chest') o.chest = OUTFITS[key][0][1].chest;   // helms/weapons/shields over the class's L1 chest
      dress(cls, o); const back = B.look.startsWith('quiver');
      return { t1: B.name.slice(0, 24), t2: `${B.look} L${B.lvl}${sig ? '' : ' shared'}${back ? ' (back)' : ''}`, sp: sprite(cls, back ? 5 : 1, 'idle', 0), head: slot === 'helm' };
    });
    // ------------------------------------------------ materials strip
    const MATGROUPS = [['METAL', ['STEEL', 'PLATE', 'WPLATE', 'SLATE', 'DSTEEL', 'IRON', 'CHAIN', 'BLADE', 'GOLD', 'BRONZE', 'RUST']],
      ['HIDE / FUR / BONE / WOOD', ['LEATHER', 'HIDE', 'FUR', 'BOAR', 'HAIR', 'BONE', 'OLDBONE', 'HORN', 'CHITIN', 'WOOD', 'BARK', 'STRAWM']],
      ['CLOTH / SKIN', ['CLOTH_RED', 'CLOTH_WINE', 'CLOTH_BLUE', 'CLOTH_NAVY', 'CLOTH_GREEN', 'PINE', 'CLOTH_PURPLE', 'CLOTH_WHITE', 'CLOTH_TAN', 'CLOTH_DARK', 'CLOTH_SHADOW', 'FACE', 'SKIN']],
      ['GLOW (emissive, flat)', ['FIREM', 'HOLY', 'ARCANE', 'ICE', 'MAGIC', 'EYE_RED', 'EYE_GRN', 'LAVAM']]];
    const SW = 180, SH = 70;
    const matsBlock = () => {
      header('PALETTE + MATERIALS', 'rig material ramps (dark -> light) as lit in game; light from upper left');
      for (const [gname, names] of MATGROUPS) {
        const per = Math.floor(W / SW), rows = Math.ceil(names.length / per);
        blocks.push({ h: 24 + rows * SH, draw: (g, y) => {
          g.fillStyle = '#e8dcc0'; g.font = 'bold 14px monospace'; g.fillText(gname, 10, y + 17);
          names.forEach((n, k) => { const m = MATS[M[n]]; if (!m) return; const x = (k % per) * SW + 10, yy = y + 24 + Math.floor(k / per) * SH, bw = Math.floor((SW - 24) / m.ramp.length);
            m.ramp.forEach((pi, j) => { const v = m.emis ? pi : LTAB[4][pi]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect(x + j * bw, yy, bw, 34); });
            g.strokeStyle = '#000'; g.strokeRect(x + 0.5, yy + 0.5, bw * m.ramp.length - 1, 33);
            if (m.shiny) { g.fillStyle = '#fff'; g.fillRect(x + bw * m.ramp.length - 7, yy + 3, 4, 4); }
            g.fillStyle = '#f2ead8'; g.font = '13px monospace'; g.fillText(n + (m.shiny ? ' *' : ''), x, yy + 52); });
        } });
      }
      blocks.push({ h: 22, draw: (g, y) => { g.fillStyle = '#b9b3a6'; g.font = '12px monospace'; g.fillText('* = shiny (specular glint). Every part gets a 1 px black outline; shading is 3-5 flat steps per material, no gradients.', 10, y + 15); } });
    };
    // ------------------------------------------------ build
    if (which === 'overview') {
      W = 8 * CW;
      header('DUNGEONS OF BONES - HOUSE STYLE', 'best current tier per class (lvl 5-6), in-game sprites, each sprite pixel x3');
      const keys = ['barbarian', 'paladin', 'mage', 'ranger'], r1 = [], r2 = [];
      for (const k of keys) { const [nm, o] = BEST[k], cls = CLS[k]; dress(cls, o);
        r1.push({ t1: k.toUpperCase(), t2: nm, sp: sprite(cls, 1, 'idle', 0) }, { t1: '(back)', t2: '', sp: sprite(cls, 5, 'idle', 0) });
        r2.push({ t1: k + ' side', t2: '', sp: sprite(cls, 3, 'idle', 0) }, { t1: k + ' swing', t2: '', sp: sprite(cls, 1, 'attack', 2) }); }
      grid(r1, 8); grid(r2, 8);
      header('TIER LADDER (front 3/4)', 'lvl 1 -> 5/6, one per class per row');
      const ladder = { barbarian: [0, 1, 2, 3, 4, 5], paladin: [0, 1, 2, 4, 5, 6], mage: [0, 2, 4, 6, 7, 8], ranger: [0, 2, 3, 5, 6, 8] };
      for (const k of keys) grid(ladder[k].map(i => { const [nm, o] = OUTFITS[k][i]; dress(CLS[k], o); return { t1: nm, t2: k, sp: sprite(CLS[k], 1, 'idle', 0) }; }), 8);
      matsBlock();
    } else {
      const k = which, cls = CLS[k]; if (!cls) throw new Error('unknown class ' + k);
      header(`${k.toUpperCase()} - CURRENT GEAR LOOKS`, `class id '${cls}'; outfits = front 3/4 (dir 1), back (dir 5), swing frame`);
      grid(OUTFITS[k].flatMap(t => outfitCells(cls, t)));
      header('CHESTS', 'every chest look this class can wear (dir 1, no other gear)'); grid(slotCells(k, 'chest'));
      header('HELMS', 'head crop, enlarged, over the L1 chest'); grid(slotCells(k, 'helm'));
      header('WEAPONS', 'every weapon look (dir 1, idle, over the L1 chest)'); grid(slotCells(k, 'weapon'));
      if (k !== 'mage') { const sh = slotCells(k, 'shield'); if (k === 'barbarian') { header('OFF HAND', 'none: the barbarian never carries a shield; the off hand holds a second one-hander'); } else { header(k === 'ranger' ? 'QUIVERS' : 'SHIELDS', k === 'ranger' ? 'back view' : 'dir 1'); grid(sh); } }
      matsBlock();
    }
    const H = blocks.reduce((s, bl) => s + bl.h, 0), c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.fillStyle = BG; g.fillRect(0, 0, W, H); g.imageSmoothingEnabled = false;
    let y = 0; for (const bl of blocks) { bl.draw(g, y); y += bl.h; }
    return c.toDataURL();
  }, [which, +Zs]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(errs.join('\n') || 'ok'); await b.close();
})();
