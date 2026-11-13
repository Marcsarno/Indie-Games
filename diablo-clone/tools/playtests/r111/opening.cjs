// round 111: the voiced opening, start to finish: a frame from each shot (and the key moments), the
// timeline (each shot's start and length) and any errors. node opening.cjs <outDir> [gameDir] [cls]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const [out, game = 'game', cls = 'paladin'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=1');
  const res = await p.evaluate((cls) => {
    allocBuffers(270, 480); G.mode = 'title'; titleScene(); for (let k = 0; k < 5; k++) update(1 / 60);
    TITLE.splash = true; leaveSplash(); const frames = [], log = []; let T = 0, lastK = -1, lastKind = '';
    const step = () => { T += 1 / 60; update(1 / 60); };   // (update moves G.t itself)
    const snap = tag => { render(); frames.push([tag, cvs.toDataURL()]); };
    // the title's opening: tap nothing, let it run; snap each shot a little in (and the die and the rise late)
    for (let i = 0; i < 60 * 70 && G.cine; i++) {
      const C = G.cine;
      if (C.k !== lastK || C.kind !== lastKind) { lastK = C.k; lastKind = C.kind; const s = C.shots[C.k]; log.push(`${T.toFixed(2)}s ${C.kind} #${C.k} ${s.vo || (s.roll ? 'roll' : s.fx || '')} ${s.text || ''}`); C._snaps = [0.45, ...(s.roll ? [1.3, 2.0] : []), ...(s.fx === 'rise' ? [0.15, 0.55, 0.75, 1.0, 1.8] : []), ...(s.fx === 'coin' ? [0.6, 0.8, 1.05, 2.5] : []), ...(s.fx === 'glow' ? [1.5, 3.0] : []), ...(s.pick ? [1.6] : []), ...(s.papers ? [0.15, 0.9, 1.9] : []), ...(s.minis ? [0.15, 0.35, 0.6, 1.5, 2.5] : [])].sort((a, b) => a - b).filter((v, i, a) => a.indexOf(v) === i); }
      if (C.ph === 'shots' && C._snaps && C._snaps.length && C.st >= C._snaps[0]) { C._snaps.shift(); snap(`${C.kind}${C.k}-${C.st.toFixed(1)}`); }
      if (C.shots[C.k].gate && cineGateReady(C)) { snap('gate'); log.push(`${T.toFixed(2)}s gate ready`); cineTitleTap([135, 300]); }
      if (C.kind === 'title' && C.shots[C.k].pick && C.st > 2) { snap('pick'); titlePick(cls); startGame(false, cls); lastK = -1; continue; }
      if (C.kind === 'open' && C.shots[C.k].roll && C.rollT === null && C.st > 1.2) cineRoll();
      step();
    }
    log.push(`${T.toFixed(2)}s end, mode ${G.mode}, story ${JSON.stringify(storyF())}`);
    return { frames, log };
  }, cls);
  fs.mkdirSync(out, { recursive: true }); res.frames.forEach(([t, u], i) => fs.writeFileSync(`${out}/${String(i).padStart(2, '0')}-${t}.png`, Buffer.from(u.split(',')[1], 'base64')));
  console.log(res.log.join('\n')); console.log(errs.slice(0, 3).join('\n') || 'no errors'); await b.close(); })();
