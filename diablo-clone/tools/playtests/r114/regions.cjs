// round 114: the Act I regions in the game: the Hollow's snowy north and green south, the Riverlands frozen with
// the golden farm. Frames at chosen spots, the build time. node regions.cjs <outDir> [gameDir]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const [out, game = 'game'] = process.argv.slice(2), b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e.stack).slice(0, 300)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=0');
  const res = await p.evaluate(() => {
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'ranger'); for (let k = 0; k < 5; k++) update(1 / 60);
    const pics = [], log = [], shot = (tag, fi, fj) => { hero.fi = fi; hero.fj = fj; enemies.length = 0; updateFov(fi, fj); G.autoTalkT = 1e9; for (let k = 0; k < 90; k++) { update(1 / 60); if (G.talk) { G.talk = null; G.mode = 'play'; } } G.msg = []; G.actCard = 0; render(); pics.push([tag, cvs.toDataURL()]); log.push(`${tag}: ${JSON.stringify(biomeAt(fi, fj))}`); };
    const C = id => { const c = HOLLOW.clearings.find(c => c.id === id); return US(c.u, c.s); };
    let t0 = performance.now(); buildWorld(); log.push('hollow build ' + Math.round(performance.now() - t0) + ' ms');
    for (const id of ['camp', 'westwood', 'tower', 'graves', 'crossing']) { const [i, j] = C(id); shot('hollow-' + id, i + 0.5, j + 2.5); }
    // the Riverlands
    t0 = performance.now(); startLevel(LV.level + 1, 777); log.push('riverlands start ' + Math.round(performance.now() - t0) + ' ms, riv ' + LV.riv);
    for (const [tag, p] of [['start', RIV.start], ['farm', [RIV.farm[0], RIV.farm[1] + 5]], ['between', [30, 30]], ['mine', [RIV.mine[0] + 3, RIV.mine[1] + 3]]]) shot('riv-' + tag, p[0], p[1]);
    return { pics, log };
  });
  fs.mkdirSync(out, { recursive: true }); res.pics.forEach(([t, u]) => fs.writeFileSync(`${out}/${t}.png`, Buffer.from(u.split(',')[1], 'base64')));
  console.log(res.log.join('\n')); console.log(errs.slice(0, 3).join('\n') || 'no errors'); await b.close(); })();
