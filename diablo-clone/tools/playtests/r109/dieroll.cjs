// round 109: the D&D table's die roll, frame by frame: node dieroll.cjs <out.png> [gameDir]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const [out, game = 'game'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=0');
  const url = await p.evaluate(() => {
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'paladin'); for (let k = 0; k < 5; k++) update(1 / 60);
    startCine('open'); const C = G.cine; const k = C.shots.findIndex(s => s.roll); cineShot(k);
    for (let i = 0; i < 120; i++) { G.t += 1 / 60; update(1 / 60); }   // the camera settles on the table
    cineRoll(); const Ts = [0.08, 0.22, 0.36, 0.43, 0.6, 0.75, 0.86, 0.96, 1.05, 1.18, 1.35, 1.8], frames = [];
    let T = 0;
    for (const t1 of Ts) { while (T < t1) { G.t += 1 / 60; update(1 / 60); T += 1 / 60; } render(); frames.push(cvs.toDataURL()); }
    return frames; });
  const Z = 1, { createCanvas } = { createCanvas: null };
  fs.mkdirSync(out, { recursive: true }); url.forEach((u, i) => fs.writeFileSync(`${out}/f${String(i).padStart(2, '0')}.png`, Buffer.from(u.split(',')[1], 'base64')));
  console.log(errs.slice(0, 3).join('\n') || 'ok'); await b.close(); })();
