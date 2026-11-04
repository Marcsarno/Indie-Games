// Hero gear one slot at a time, for concept mock-ups: per class, every helm on an unarmored body and
// every chest piece on a bare head (the class's starter weapon in hand), each in front-right and back.
//   node tools/capture/heroparts.cjs <outDir> [zoom]   ->  <cls>-helms.png, <cls>-chests.png
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const out = process.argv[2], Z = +(process.argv[3] || 3); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../../game/index.html'));
  const files = await p.evaluate(Z => {
    const col = v => `rgb(${PR[v]},${PG[v]},${PB[v]})`, BG = col(4), INK = col(26), DIM = col(25);
    buildBudget.ms = Infinity; G.mode = 'play'; newHero('warrior'); startLevel(3, 777);
    const pix = sp => (q => { const v0 = sp.data[q]; return v0 ? ((v0 & 128) ? v0 & 127 : LTAB[4][v0]) : -1; });
    const box = sp => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let q = 0; q < sp.w * sp.h; q++) if (sp.data[q]) { const x = q % sp.w, y = (q / sp.w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { l: x0 - sp.ax, r: x1 - sp.ax + 1, t: y0 - sp.ay, b: y1 - sp.ay + 1 }; };
    let serial = 1e6;
    const mk = base => ({ id: serial++, base, rarity: 'normal', name: base, mods: {} });
    const res = {};
    for (const cls of ['warrior', 'mage', 'ranger']) for (const slot of ['helm', 'chest']) {
      const bases = Object.keys(ITEM_BASES).filter(k => ITEM_BASES[k].slot === slot && ITEM_BASES[k].cls === cls);
      const cells = [];
      for (const base of bases) for (const [d, cap] of [[0, base], [5, 'back']]) {
        newHero(cls); hero.equip = { weapon: mk(cls === 'mage' ? 'oak_staff' : cls === 'ranger' ? 'hunting_bow' : 'short_sword'), helm: null, chest: null, shield: null, ring: null, amulet: null };
        hero.equip[slot] = mk(base); recalcHero();
        const sp = getSprite('hero', hero.look, d, 'idle', 0, hero, SPX); cells.push({ sp, cap, bx: box(sp), first: d === 0 });
      }
      const up = Math.max(...cells.map(c => -c.bx.t)), down = Math.max(...cells.map(c => c.bx.b)), ws = cells.map(c => Math.ceil(Math.max(c.bx.r - c.bx.l + 6, c.cap.length * 7 / Z + 4)));   // whole pixels, or the sprites blur
      const top = 28, capH = 18, cv = document.createElement('canvas');
      cv.width = Math.max(ws.reduce((a, w) => a + w, 0) * Z + cells.filter(c => c.first).length * 10, 520); cv.height = top + (up + down + 4) * Z + capH; const g = cv.getContext('2d');
      g.fillStyle = BG; g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = INK; g.font = 'bold 18px monospace'; g.fillText(`${cls.toUpperCase()} ${slot === 'helm' ? 'HELMS (no armor)' : 'CHESTS (no helm)'}`, 8, 20);
      g.fillStyle = DIM; g.font = '13px monospace'; g.fillText(`${bases.length} looks, front-right and back`, 330, 20);
      let x = 0;
      cells.forEach((c, k) => {
        if (c.first && k) x += 10;
        const at = pix(c.sp), cx = x + (ws[k] * Z) / 2 - ((c.bx.l + c.bx.r) / 2) * Z, y0 = top + (up + 2) * Z;
        for (let q = 0; q < c.sp.w * c.sp.h; q++) { const v = at(q); if (v < 0) continue; g.fillStyle = col(v); g.fillRect(cx + ((q % c.sp.w) - c.sp.ax) * Z, y0 + (((q / c.sp.w) | 0) - c.sp.ay) * Z, Z, Z); }
        g.fillStyle = DIM; g.font = '12px monospace'; g.textAlign = 'center'; g.fillText(c.cap, x + ws[k] * Z / 2, cv.height - 5); g.textAlign = 'left';
        x += ws[k] * Z;
      });
      res[`${cls}-${slot}s.png`] = cv.toDataURL();
    }
    return res;
  }, Z);
  if (errs.length) console.log('errors:', errs.join('\n'));
  for (const [f, u] of Object.entries(files)) { fs.writeFileSync(path.join(out, f), Buffer.from(u.split(',')[1], 'base64')); console.log(path.join(out, f)); }
  await b.close();
})();
