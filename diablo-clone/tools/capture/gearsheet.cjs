// hero looks side by side at 3x on a floor tone: each row a look (from items worn), columns = facings
// and a walk and attack frame. node tools/capture/gearsheet.cjs <gameDir> <out.png> <rows.json>
// rows.json: [{ "label": "...", "cls": "warrior", "items": ["great_helm", ...], "sets": true }]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => { const [dir, out, rowsFile] = process.argv.slice(2); const rows = JSON.parse(fs.readFileSync(rowsFile, 'utf8'));
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(dir, 'index.html'));
  const url = await p.evaluate(rows => {
    const Z = 3, CW = 52, CH = 64, cols = [[1, 'idle', 0], [3, 'idle', 0], [5, 'idle', 0], [7, 'idle', 0], [1, 'walk', 2], [3, 'walk', 6], [1, 'atk1', 2], [3, 'atk2', 2]];
    const c = document.createElement('canvas'); c.width = (CW * cols.length + 110) * Z; c.height = CH * rows.length * Z; const g = c.getContext('2d');
    const col = v => `rgb(${PR[v]},${PG[v]},${PB[v]})`;
    g.fillStyle = col(4); g.fillRect(0, 0, c.width, c.height);
    const old = buildBudget.ms; buildBudget.ms = Infinity;
    rows.forEach((row, ri) => {
      newHero(row.cls); hero.equip = { weapon: null, helm: null, chest: null, shield: null, ring: null, amulet: null };
      for (const it of row.items) { const parts = it.split(':'), base = parts[0], set = parts[1]; const item = { id: itemSerial++, base, rarity: set ? 'set' : row.legend ? 'legend' : 'normal', set, name: set ? 'X' : base, mods: (row.mods && ITEM_BASES[base].slot === 'weapon') ? row.mods : {}, fx: row.legend }; hero.equip[ITEM_BASES[base].slot] = item; }
      recalcHero(); const look = hero.look;
      g.fillStyle = col(26); g.font = `${8 * Z}px monospace`; g.fillText(row.label, 4 * Z, (ri * CH + 34) * Z);
      cols.forEach(([d, clip, f], k) => {
        const sp = getSprite('hero', look, d, clip, f, hero, 1);
        const x0 = 110 + k * CW + CW / 2, y0 = ri * CH + CH - 8;
        for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0]; g.fillStyle = col(v); g.fillRect((x0 + (q % sp.w) - sp.ax) * Z, (y0 + ((q / sp.w) | 0) - sp.ay) * Z, Z, Z); }
      });
    });
    buildBudget.ms = old; return c.toDataURL(); }, rows);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); if (errs.length) console.log(errs.join('\n')); await b.close(); })();
