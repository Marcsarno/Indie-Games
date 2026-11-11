// Stills (and optionally frames for a clip) of a cinematic at Dave's table:
//   node tools/capture/cineshots.cjs <outDir> [kind=open] [cls=warrior] [gameDir] [w=270] [h=480]
// Writes one PNG per page of the script, then frames of the die roll and the push into the map
// (zoom-00.png ...). FRAMES=1 also writes every 3rd frame of the whole thing as f-0000.png ...
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [out, kind = 'open', cls = 'warrior', gd0, w = '270', h = '480'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const gd = gd0 || path.resolve(__dirname, '../../game');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } }); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(gd, 'index.html') + '?cine=1');
  const save = (name, url) => fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  const r = await p.evaluate(([kind, cls]) => {
    try {
      fitCanvas(); newHero(cls); G.mode = 'play'; G.town = null; G.portal = null; G.story = null; G.gates = null; G.sideBack = null; startLevel(1, 4242); G.actCard = 0;
      for (let i = 0; i < 300; i++) warmStep(50);
      for (let k = 0; k < 30; k++) update(1 / 60);
      startCine(kind); return { pages: G.cine.pages.length, W: OW, H: OH };
    } catch (e) { return 'ERR ' + e.stack; }
  }, [kind, cls]);
  console.log(JSON.stringify(r)); if (typeof r === 'string') { await b.close(); return; }
  const step = (n, tap) => p.evaluate(([n, tap]) => { try { let ms = 0; for (let k = 0; k < n; k++) { update(1 / 60); const t0 = performance.now(); render(); ms = Math.max(ms, performance.now() - t0); } if (tap) cineTap(null); return { url: cvs.toDataURL(), ph: G.cine ? G.cine.ph : 'done', mode: G.mode, ms }; } catch (e) { return { err: e.stack }; } }, [n, tap]);
  let f = 0, worst = 0; const all = process.env.FRAMES === '1';
  const run = async (n, name) => { let q = null; if (all) { for (let k = 0; k < n; k += 3) { q = await step(3, false); if (q.err) break; save('f-' + String(f++).padStart(4, '0'), q.url); } } else q = await step(n, false); if (q.err) { console.log(q.err); return q; } worst = Math.max(worst, q.ms); if (name) save(name, q.url); return q; };
  if (kind === 'actEnd') { for (let k = 0; k < 6; k++) await run(22, 'out-' + String(k).padStart(2, '0')); }
  for (let k = 0; k < r.pages; k++) {
    const q = await run(k ? 50 : 70, null); if (q.err) break;
    await p.evaluate(() => { G.cine.fi = 0; G.cine.chars = G.cine.total; });   // typed out
    await run(12, 'page-' + String(k).padStart(2, '0'));
    await p.evaluate(() => { cineTap(null); });   // next
  }
  for (let k = 0; k < 40; k++) { const q = await run(8, 'zoom-' + String(k).padStart(2, '0')); if (q.err || q.ph === 'done') { console.log('ended in mode', q.mode, 'after zoom frame', k); break; } }
  console.log('worst render ms', worst.toFixed(1), errs.length ? 'ERR ' + errs.slice(0, 3).join('\n') : 'no page errors'); await b.close();
})();
