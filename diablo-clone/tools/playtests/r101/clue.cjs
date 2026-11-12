// round 101: a clue told at Dave's table (cinematics on): node clue.cjs <outDir>
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=1');
  const r = await p.evaluate(() => { const log = [], shots = [];
    try {
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'warrior'); G.actCard = 0; G.cine = null; G.mode = 'play';
    Object.assign(storyF(), { met: true, woodTold: true, alphaDead: true, aldoFree: true, woodPaid: true, h3tower: true, h3barrow: true });
    hero.lvl = 6; recalcHero(); startLevel(LV.level, LV.seed); G.actCard = 0; enemies.length = 0; G.cine = null; G.mode = 'play';
    const step = n => { for (let k = 0; k < n; k++) { G.guide = null; update(1 / 60); } };
    const snap = name => { for (let i = 0; i < 400; i++) warmStep(40); render(); shots.push([name, cvs.toDataURL()]); };
    step(10); h3Complete(H3[1]); let k = 0; while (G.mode !== 'cine' && k++ < 300) step(1);
    log.push('cine ' + (G.cine && G.cine.kind) + ' shots ' + (G.cine ? G.cine.shots.length : 0));
    const seen = new Set();
    for (let f = 0; f < 60 * 40 && G.cine; f++) { step(1); const C = G.cine; if (!C) break; if (C.ph === 'shots' && !seen.has(C.k) && C.pt > 1.2) { seen.add(C.k); snap('clue-' + C.k); log.push('shot ' + C.k + ' ' + (C.shots[C.k].as || C.shots[C.k].who) + ': ' + C.shots[C.k].text); } if (C.shots[C.k] && C.shots[C.k].wait) { cineNext(); } }
    log.push('after: mode ' + G.mode + ' stage ' + storyStage());
    } catch (e) { log.push('ERR ' + e.stack); }
    return { log, shots }; });
  for (const [n, u] of r.shots) fs.writeFileSync(`${out}/${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  console.log(r.log.join('\n')); console.log(errs.length ? 'PAGE ERR ' + errs.join('\n') : 'no page errors'); await b.close(); })();
