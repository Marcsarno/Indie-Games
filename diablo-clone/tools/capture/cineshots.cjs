// Stills (or the frames for a clip) of a cinematic at Dave's table, played through on its own timing:
//   node tools/capture/cineshots.cjs <outDir> [kind=open|resume|actEnd] [cls=warrior] [gameDir] [w=270] [h=480]
// Writes s<shot>-<frame>.png every EVERY frames (default 24; z-... during the push into the map).
// FRAMES=1 writes every 3rd frame as f-0000.png ... for a clip (ffmpeg -framerate 20 -i f-%04d.png).
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [out, kind = 'open', cls = 'warrior', gd0, w = '270', h = '480'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const gd = gd0 || path.resolve(__dirname, '../../game'), all = process.env.FRAMES === '1', every = all ? 3 : +(process.env.EVERY || 24);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } }); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(gd, 'index.html') + '?cine=1');
  const r = await p.evaluate(([kind, cls]) => {
    try {
      fitCanvas(); newHero(cls); G.mode = 'play'; G.town = null; G.portal = null; G.story = null; G.gates = null; G.sideBack = null; startLevel(1, 4242); G.actCard = 0;
      for (let i = 0; i < 300; i++) warmStep(50);
      for (let k = 0; k < 30; k++) update(1 / 60);
      const t0 = performance.now(); startCine(kind); return { shots: G.cine.shots.length, W: OW, H: OH, startMs: Math.round(performance.now() - t0) };
    } catch (e) { return 'ERR ' + e.stack; }
  }, [kind, cls]);
  console.log(JSON.stringify(r)); if (typeof r === 'string') { await b.close(); return; }
  const step = n => p.evaluate(n => { try { let ms = 0; for (let k = 0; k < n; k++) { update(1 / 60); const t0 = performance.now(); render(); ms = Math.max(ms, performance.now() - t0); } const C = G.cine; return { url: cvs.toDataURL(), ph: C ? C.ph : 'done', k: C ? C.k : -1, mode: G.mode, ms }; } catch (e) { return { err: e.stack }; } }, n);
  let f = 0, worst = 0;
  for (let i = 0; i < 4000 / every; i++) {
    const q = await step(every); if (q.err) { console.log(q.err); break; }
    if (i > 2) worst = Math.max(worst, q.ms);
    const name = all ? 'f-' + String(f).padStart(4, '0') : (q.ph === 'shots' ? 's' + q.k : q.ph === 'done' ? 'game' : 'z') + '-' + String(f).padStart(3, '0'); f++;
    fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(q.url.split(',')[1], 'base64'));
    if (q.ph === 'done') { console.log('ended in mode', q.mode, 'after', (f * every / 60).toFixed(1), 's'); break; }
  }
  console.log('worst render ms', worst.toFixed(1), errs.length ? 'ERR ' + errs.slice(0, 3).join('\n') : 'no page errors'); await b.close();
})();
