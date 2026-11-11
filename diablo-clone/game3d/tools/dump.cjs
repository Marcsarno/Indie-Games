// Exports characters from the 2D game as rig data for the Blender converter.
//   node tools/dump.cjs <outdir> [what...]     what = monsters | heroes | <monster id> ...   (default: everything)
// Writes <outdir>/<file>.json per model and <outdir>/manifest.json (key -> file).
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
(async () => {
  const OUT = path.resolve(process.argv[2] || 'blender/rigs'), what = process.argv.slice(3); fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', String(e.stack || e).slice(0, 600)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../../game/index.html'));
  for (const f of ['rigdump.js', 'rigposes.js']) await p.addScriptTag({ path: path.resolve(__dirname, '../js3d', f) });
  const list = await p.evaluate((what) => {
    const out = [], all = !what.length;
    for (const id in MONSTERS) if (all || what.includes('monsters') || what.includes(id)) out.push({ fam: MONSTERS[id].family, look: MONSTERS[id].look, label: id });
    if (all || what.includes('heroes')) for (const cls of ['warrior', 'mage', 'ranger']) { newHero(cls); out.push({ fam: 'hero', look: JSON.parse(JSON.stringify(hero.look)), label: cls }); }
    if (what.includes('knight')) out.push({ fam: 'hero', look: { team: 'red', helm: 'great', chest: 'plate', weapon: 'sword', shield: 'kite' }, label: 'knight' });
    return out;
  }, what);
  const manifest = fs.existsSync(path.join(OUT, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'))) : {};
  for (const t of list) {
    const t0 = Date.now();
    const m = await p.evaluate(([fam, look]) => { const m = RP.model(fam, look); return m; }, [t.fam, t.look]).catch(e => { console.log('FAILED', t.label, String(e).slice(0, 300)); return null; });
    if (!m) continue;
    m.label = t.label; fs.writeFileSync(path.join(OUT, m.name + '.json'), JSON.stringify(m)); manifest[m.key] = m.name;
    const nf = Object.values(m.clips).reduce((a, c) => a + c.t.length, 0);
    console.log(`${t.label.padEnd(14)} ${m.name}  parts ${m.parts.length}  painted ${m.parts.filter(q => q.tex).length}  clips ${Object.keys(m.clips).join(',')}  frames ${nf}  h ${m.height}  ${Date.now() - t0} ms`);
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  await b.close();
})();
