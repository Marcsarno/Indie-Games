// round 111d: Aldo's homecoming at the table (the user's beat sheet): the timeline, a frame from each shot,
// the reward pick and the line after it. node aldo.cjs <outDir> [gameDir]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const [out, game = 'game'] = process.argv.slice(2), b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=1');
  const res = await p.evaluate(() => {
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'paladin'); for (let k = 0; k < 30; k++) update(1 / 60);
    startCine('quest', { stage: 'aldoBack' }); const frames = [], log = []; let T = 0, lastK = -1, lastPh = '';
    for (let i = 0; i < 60 * 90 && G.cine; i++) {
      const C = G.cine;
      if (C.ph !== lastPh || (C.ph === 'shots' && C.k !== lastK)) { lastPh = C.ph; lastK = C.k; const s = C.ph === 'shots' ? C.shots[C.k] : {}; log.push(`${T.toFixed(2)}s ${C.ph} #${C.k} ${s.who || ''}${s.as ? ' as ' + s.as : ''} ${s.fx || ''} ${s.reward ? 'REWARD' : ''} ${(s.text || '').slice(0, 50)}`); C._snap = s.fx === 'reunion' ? 1.6 : 0.6; }
      if (C.ph === 'shots' && C._snap && C.st >= C._snap) { C._snap = 0; render(); frames.push([`${C.k}`, cvs.toDataURL()]); }
      if (G.talk && G.talk.reward && C.st > 1.5) { G.talk.pick = 0; render(); frames.push(['reward', cvs.toDataURL()]); cineTap(null); }
      update(1 / 60); T += 1 / 60;
    }
    log.push(`${T.toFixed(2)}s end mode ${G.mode} woodPaid ${storyF().woodPaid}`); return { frames, log };
  });
  fs.mkdirSync(out, { recursive: true }); res.frames.forEach(([t, u], i) => fs.writeFileSync(`${out}/${String(i).padStart(2, '0')}-${t}.png`, Buffer.from(u.split(',')[1], 'base64')));
  console.log(res.log.join('\n')); console.log(errs.slice(0, 3).join('\n') || 'no errors'); await b.close(); })();
