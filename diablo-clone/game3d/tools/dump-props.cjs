// Exports the scenery (every prop the game builds from a rig) of the given areas for the Blender converter.
//   node tools/dump-props.cjs <outdir> [level,...]      default: Act I's five areas and its side areas, a few seeds each
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
(async () => {
  const OUT = path.resolve(process.argv[2] || 'blender/rigs'); fs.mkdirSync(OUT, { recursive: true });
  const levels = (process.argv[3] || '1,2,3,4,5').split(',').map(Number);
  const b = await chromium.launch(); const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', String(e.stack || e).slice(0, 400)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../../game/index.html'));
  await p.addScriptTag({ path: path.resolve(__dirname, '../js3d/rigdump.js') });
  const names = await p.evaluate((levels) => {
    window.__props = {}; const orig = propSprite;
    propSprite = function (name, build, size, yaw = 0) { window.__props[name] = build; return orig(name, build, size, yaw); };
    newHero('warrior'); G.mode = 'play'; const log = [];
    for (const L of levels) for (const seed of [1000 + L * 37, 77 + L, 4242 + L * 5]) {
      try { startLevel(L, seed); } catch (e) { log.push('level ' + L + ': ' + e); continue; }
      if (seed === 1000 + L * 37) for (const side of ['den', 'tower', 'barrow', 'barrow2', 'cellar']) { try { enterSide(side); if (G.fadeTo) { const f = G.fadeTo; G.fadeTo = null; f(); } } catch (e) { /* not from this area */ } try { startLevel(L, seed); } catch (e) { /* ignore */ } }
    }
    // things only built when first drawn (barrels, chests, cages, eggs ...): ask for each prop function's variants
    for (const lib of [PROPS, typeof OUT !== 'undefined' ? OUT : {}]) for (const k in lib) if (typeof lib[k] === 'function')
      for (const args of [[], [0], [1], [2], [3], [4], [5], [true], [false], [true, 'b'], [true, 'f'], [false, 'b'], [false, 'f']]) { try { lib[k](...args); } catch (e) { /* not its arguments */ } }
    if (log.length) console.log(log.join('\n'));
    return Object.keys(window.__props);
  }, levels);
  const manifest = fs.existsSync(path.join(OUT, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'))) : {};
  let n = 0, parts = 0;
  for (const name of names) {
    const m = await p.evaluate(name => RD.prop(name, window.__props[name]), name).catch(e => { console.log('FAILED', name, String(e).slice(0, 200)); return null; });
    if (!m) continue;
    m.label = name; fs.writeFileSync(path.join(OUT, m.name + '.json'), JSON.stringify(m)); manifest[m.key] = m.name; n++; parts += m.parts.length;
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(`${n} props, ${parts} parts`); console.log(names.join(' ').slice(0, 3000));
  await b.close();
})();
