// The bestiary (round 47): every monster, the heroes in their outfits, every gear look on the
// hero, every item icon and the palette, as the game draws them (sprites at full detail), for an
// image generator or an artist to work from. One PNG per entry plus overview sheets.
//   node tools/capture/bestiary.cjs <outDir>
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../../game/index.html'));
  const res = await p.evaluate(() => {
    const files = {}, meta = { monsters: [], heroes: [], gear: [], items: [] };
    const col = v => `rgb(${PR[v]},${PG[v]},${PB[v]})`, BG = col(4), INK = col(26);
    buildBudget.ms = Infinity;
    G.mode = 'play'; newHero('warrior'); startLevel(3, 777);
    const pix = sp => (q => { const v0 = sp.data[q]; return v0 ? ((v0 & 128) ? v0 & 127 : LTAB[4][v0]) : -1; });
    // a row of cells: each cell one sprite, all on one baseline; Z = screen pixels per sprite pixel
    // tight box of a sprite's pixels, relative to its anchor (the feet)
    const box = sp => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let q = 0; q < sp.w * sp.h; q++) if (sp.data[q]) { const x = q % sp.w, y = (q / sp.w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { l: x0 - sp.ax, r: x1 - sp.ax + 1, t: y0 - sp.ay, b: y1 - sp.ay + 1 }; };
    function strip(cells, Z, label, sub) {
      cells = cells.filter(c => c.sp); for (const c of cells) c.bx = box(c.sp);
      const up = Math.max(...cells.map(c => -c.bx.t)), down = Math.max(...cells.map(c => c.bx.b));
      const ws = cells.map(c => Math.max(c.bx.r - c.bx.l + 6, c.cap ? Math.ceil(c.cap.length * 7 / Z) + 4 : 0));
      const top = label ? 26 : 4, capH = 18, H0 = (up + down + 4) * Z;
      const cv = document.createElement('canvas'); cv.width = Math.max(ws.reduce((a, w) => a + w, 0) * Z, label ? 520 : 0); cv.height = top + H0 + capH; const g = cv.getContext('2d');
      g.fillStyle = BG; g.fillRect(0, 0, cv.width, cv.height);
      if (label) { g.fillStyle = INK; g.font = 'bold 18px monospace'; g.fillText(label, 8, 19); if (sub) { const w = g.measureText(label).width; g.fillStyle = col(25); g.font = '13px monospace'; g.fillText(sub, 8 + w + 14, 19); } }
      let x = 0;
      cells.forEach((c, k) => {
        const at = pix(c.sp), cx = x + (ws[k] * Z) / 2 - ((c.bx.l + c.bx.r) / 2) * Z, y0 = top + (up + 2) * Z;
        for (let q = 0; q < c.sp.w * c.sp.h; q++) { const v = at(q); if (v < 0) continue; g.fillStyle = col(v); g.fillRect(cx + ((q % c.sp.w) - c.sp.ax) * Z, y0 + (((q / c.sp.w) | 0) - c.sp.ay) * Z, Z, Z); }
        if (c.cap) { g.fillStyle = col(25); g.font = '12px monospace'; g.textAlign = 'center'; g.fillText(c.cap, x + ws[k] * Z / 2, cv.height - 5); g.textAlign = 'left'; }
        x += ws[k] * Z;
      });
      return cv;
    }
    const DIRS = [[1, 'front'], [0, 'front-right'], [7, 'right'], [6, 'back-right'], [5, 'back'], [3, 'front-left']];
    const get = (fam, look, d, clip, f, ent) => { try { return getSprite(fam, look, d, clip, f, ent, SPX); } catch (e) { return null; } };
    const fronts = [];
    // ---------------- monsters: six facings, then walk, attack, hit and death frames
    for (const id of Object.keys(MONSTERS)) {
      const e = makeEnemy(id, 10, 10, 1), m = MONSTERS[id];
      const cells = DIRS.map(([d, cap]) => ({ sp: get(e.fam, e.look, d, 'idle', 0, e), cap }));
      for (const [clip, f, cap] of [['walk', 1, 'walk'], ['walk', 3, 'walk'], ['attack', 1, 'wind-up'], ['attack', 2, 'strike'], ['hit', 0, 'hit'], ['death', 5, 'dead']]) cells.push({ sp: get(e.fam, e.look, 0, clip, f, e), cap });
      const big = m.unique || ['treant', 'warlord', 'broodmother', 'skelking', 'lich', 'bear'].includes(id);
      const name = (m.name || id) + (m.title ? ' - ' + m.title : '');
      files['monsters/' + id + '.png'] = strip(cells, big ? 2 : 3, name, `family: ${m.family}`).toDataURL();
      fronts.push({ sp: cells[1].sp, cap: id, big });
      meta.monsters.push({ id, name: m.name, title: m.title || '', family: m.family, hp: m.hp, boss: !!m.unique });
    }
    // ---------------- heroes: outfits (loadouts) in six facings plus walk and attack
    const R = rng(5);
    const mk = (base, set, rarity) => { const it = rollItem(R, 1, base); it.rarity = rarity || (set ? 'set' : 'normal'); it.mods = {}; if (set) it.set = set; if (rarity === 'legend') { const L = LEGENDARIES.find(x => x.base === base); if (L) { it.fx = L.fx; it.name = L.name; } } return it; };
    const outfits = [
      ['warrior', 'starter', ['short_sword', 'tunic']],
      ['warrior', 'chain and kite', ['long_sword', 'chain_mail', 'barbute', 'kite_shield']],
      ['warrior', "WARDEN'S set", ['long_sword', 'great_helm:warden', 'plate_mail:warden', 'kite_shield:warden']],
      ['warrior', "SCOUT'S set", ['hand_axe', 'cap:ranger', 'brigandine:ranger', 'buckler:ranger']],
      ['warrior', 'dark plate', ['battle_axe', 'dark_plate', 'horned_helm', 'tower_shield']],
      ['warrior', 'best gear', ['bastard_sword', 'gothic_plate', 'bascinet', 'heater_shield']],
      ['warrior', 'legendaries', ['long_sword!', 'crown_helm!', 'tower_shield!', 'brigandine!']],
      ['mage', 'starter', ['oak_staff', 'apprentice_robe', 'wizard_hat']],
      ['mage', 'MAGUS set', ['oak_staff:magus', 'mystic_robe:magus', 'wizard_hat:magus']],
      ['mage', 'fire', ['battle_staff', 'archmage_robe', 'hood']],
      ['mage', 'best gear', ['runed_staff', 'sorcerer_robe', 'conjurer_hat']],
      ['mage', 'legendaries', ['ember_staff!', 'archmage_robe!', 'wizard_hat!']],
      ['ranger', 'starter', ['hunting_bow', 'leather_jerkin', 'ranger_hood', 'quiver']],
      ["ranger", "STALKER'S set", ['long_bow', 'shadow_hood:stalker', 'studded_jerkin:stalker', 'war_quiver:stalker']],
      ['ranger', 'best gear', ['war_bow', 'drake_hide', 'night_hood', 'deep_quiver']],
      ['ranger', 'legendaries', ['long_bow!', 'hide_coat!', 'hunter_hood', 'deep_quiver']],
    ];
    const heroFronts = [];
    for (const [cls, label, items] of outfits) {
      newHero(cls); hero.equip = { weapon: null, helm: null, chest: null, shield: null, ring: null, amulet: null };
      for (const s of items) { const leg = s.endsWith('!'), [base, set] = s.replace('!', '').split(':'); hero.equip[ITEM_BASES[base].slot] = mk(base, set, leg ? 'legend' : null); }
      recalcHero(); const look = hero.look;
      const cells = DIRS.map(([d, cap]) => ({ sp: get('hero', look, d, 'idle', 0, hero), cap }));
      const atk = cls === 'ranger' ? 'shoot' : cls === 'mage' ? 'channel' : 'attack';
      for (const [clip, f, cap] of [['walk', 2, 'walk'], ['walk', 6, 'walk'], [atk, 1, 'wind-up'], [atk, 3, 'strike']]) cells.push({ sp: get('hero', look, 0, clip, f, hero), cap });
      const fn = `heroes/${cls}-${label.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-+$/, '')}.png`;
      files[fn] = strip(cells, 3, `${cls.toUpperCase()}: ${label}`, items.map(s => s.replace(/[!:].*/, '')).join(', ')).toDataURL();
      heroFronts.push({ sp: cells[1].sp, cap: `${cls} ${label}` });
      meta.heroes.push({ cls, label, file: fn, items });
    }
    // ---------------- every gear look worn by the hero (front-right), one row per class and slot
    for (const cls of ['warrior', 'mage', 'ranger']) for (const slot of ['weapon', 'helm', 'chest', 'shield']) {
      const bases = Object.keys(ITEM_BASES).filter(k => ITEM_BASES[k].slot === slot && ITEM_BASES[k].cls === cls);
      if (!bases.length) continue;
      const cells = bases.map(base => {
        newHero(cls); const it = mk(base); hero.equip[slot] = it;
        if (slot !== 'weapon') hero.equip.weapon = hero.equip.weapon || mk(cls === 'mage' ? 'oak_staff' : cls === 'ranger' ? 'hunting_bow' : 'short_sword');
        recalcHero(); return { sp: get('hero', hero.look, 0, 'idle', 0, hero), cap: base };
      });
      const fn = `gear/${cls}-${slot}.png`; files[fn] = strip(cells, 3, `${cls.toUpperCase()} ${slot.toUpperCase()}S`, `${bases.length} looks`).toDataURL();
      meta.gear.push({ cls, slot, file: fn, bases });
    }
    // ---------------- item icons, by slot
    for (const slot of ['weapon', 'helm', 'chest', 'shield', 'ring', 'amulet', 'potion']) {
      const bases = Object.keys(ITEM_BASES).filter(k => ITEM_BASES[k].slot === slot); if (!bases.length) continue;
      const cells = bases.map(base => ({ sp: itemIcon(mk(base)), cap: base.replace(/_/g, ' ').slice(0, 12) }));
      const fn = `items/${slot}.png`; files[fn] = strip(cells, 4, `${slot.toUpperCase()} ICONS`, `${bases.length}`).toDataURL();
      meta.items.push({ slot, file: fn, n: bases.length });
    }
    // ---------------- overview sheets: everyone facing front-right, at one scale (bosses as drawn)
    const sheet = (list, cols, Z, title) => {
      const rows = []; for (let k = 0; k < list.length; k += cols) rows.push(strip(list.slice(k, k + cols), Z, k ? '' : title));
      const cv = document.createElement('canvas'); cv.width = Math.max(...rows.map(r => r.width)); cv.height = rows.reduce((a, r) => a + r.height, 0);
      const g = cv.getContext('2d'); g.fillStyle = BG; g.fillRect(0, 0, cv.width, cv.height); let y = 0; for (const r of rows) { g.drawImage(r, 0, y); y += r.height; }
      return cv.toDataURL();
    };
    files['sheet-monsters.png'] = sheet(fronts.filter(f => !f.big), 6, 3, 'MONSTERS (same scale as in the game)');
    files['sheet-bosses.png'] = sheet(fronts.filter(f => f.big), 3, 2, 'BOSSES AND BIG ONES');
    files['sheet-heroes.png'] = sheet(heroFronts, 6, 3, 'HEROES IN THEIR OUTFITS');
    // ---------------- the palette, with the hero for scale
    { const n = PR.length, Z = 22, cols = 16, cv = document.createElement('canvas'); cv.width = cols * Z; cv.height = Math.ceil(n / cols) * Z; const g = cv.getContext('2d');
      for (let v = 0; v < n; v++) { g.fillStyle = col(v); g.fillRect((v % cols) * Z, Math.floor(v / cols) * Z, Z, Z); g.fillStyle = (PR[v] + PG[v] + PB[v]) > 380 ? '#000' : '#fff'; g.font = '9px monospace'; g.fillText(v, (v % cols) * Z + 2, Math.floor(v / cols) * Z + 10); }
      files['palette.png'] = cv.toDataURL(); meta.palette = Array.from({ length: n }, (_, v) => '#' + [PR[v], PG[v], PB[v]].map(x => x.toString(16).padStart(2, '0')).join('')); }
    // the hero's size in game pixels (world resolution) for the notes
    newHero('warrior'); recalcHero(); const s1 = getSprite('hero', hero.look, 1, 'idle', 0, hero, 1);
    let top = s1.h, bot = 0; for (let q = 0; q < s1.w * s1.h; q++) if (s1.data[q]) { const y = (q / s1.w) | 0; top = Math.min(top, y); bot = Math.max(bot, y); }
    meta.heroHeight = bot - top + 1;
    return { files, meta };
  });
  for (const [f, url] of Object.entries(res.files)) { fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true }); fs.writeFileSync(path.join(out, f), Buffer.from(url.split(',')[1], 'base64')); }
  fs.writeFileSync(path.join(out, 'bestiary.json'), JSON.stringify(res.meta, null, 1));
  console.log(Object.keys(res.files).length, 'files; hero height', res.meta.heroHeight, 'px');
  if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
