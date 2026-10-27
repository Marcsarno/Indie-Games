// Contact sheets for rig-rendered characters: every direction for a pose (4x unlit), a clip strip,
// lit bands on a floor color, 1x row, silhouettes. Usage: node tools/rig-sheet.cjs <family> [outdir]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const fam = process.argv[2] || 'hero', OUT = path.resolve(process.argv[3] || '/tmp/rigsheet');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../game/sheet.html'));
  const res = await p.evaluate(async (fam) => {
    const cast = window.SHEET_CAST ? window.SHEET_CAST(fam) : null;
    return cast ? await window.renderSheet(cast) : null;
  }, fam).catch(e => { errs.push(String(e)); return null; });
  if (errs.length) console.log('errors:', errs.join('\n'));
  if (res) { fs.mkdirSync(OUT, { recursive: true }); const f = path.join(OUT, fam + '.png'); fs.writeFileSync(f, Buffer.from(res.url.split(',')[1], 'base64')); console.log(f, res.ms + ' ms per sprite'); if (res.lint) console.table(res.lint); }
  await b.close();
})();
