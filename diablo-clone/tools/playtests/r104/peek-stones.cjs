// round 104: Dave peeking in (a screenshot mid-line), and the Standing Stones: every wave's monsters can walk
// to the ring (killed here only if a walk reaches them, so a stuck one would hang the event). node peek-stones.cjs <outDir>
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const r = await p.evaluate(() => { const log = [], shots = [];
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'paladin'); G.actCard = 0;
    Object.assign(storyF(), { met: true, woodTold: true, alphaDead: true, aldoFree: true, woodPaid: true, h3tower: true });
    startLevel(LV.level, LV.seed); G.actCard = 0; enemies.length = 0;
    const step = n => { for (let k = 0; k < n; k++) { G.guide = null; update(1 / 60); } };
    hero.fi = HUB.camp[0] + 4; hero.fj = HUB.camp[1] - 6; step(10);
    showClue('barrow'); step(60); { const P = G.peek; while (G.peek && G.peek.k < 1) step(1); step(40); }
    for (let i = 0; i < 400; i++) warmStep(40); render(); drawHud(); shots.push(['peek', cvs.toDataURL()]); log.push('peek mode ' + G.mode + ' line ' + (G.peek && G.peek.k));
    let k = 0; while (G.peek && k++ < 3000) step(1); log.push('peek gone ' + !G.peek);
    // the stones, eight times over: kill only what a walk from the ring reaches
    const c = STONES_AT(); let okRuns = 0, worst = 0;
    for (let run = 0; run < 8; run++) {
      storyF().h3stones = false; G.stones = null; enemies.length = 0; hero.fi = c[0] + 1; hero.fj = c[1] + 1; hero.hp = STAT.maxHp;
      stonesAction().go(); let f = 0, maxStuck = 0;
      while (G.stones && f++ < 60 * 90) {
        hero.hp = STAT.maxHp; step(1);
        if (G.stones) { const D = bfs(Math.floor(c[0]), Math.floor(c[1])); for (const e of G.stones.list) if (alive(e) && D[tIdx(Math.floor(e.fi), Math.floor(e.fj))] >= 0 && Math.hypot(e.fi - c[0], e.fj - c[1]) < 9) { e.hp = 0; damageEnemy(e, 99999, c[0], c[1], false, 0); } maxStuck = Math.max(maxStuck, ...G.stones.list.filter(alive).map(e => e.stoneFar || 0), 0); }
      }
      worst = Math.max(worst, f / 60); if (storyF().h3stones) okRuns++; log.push('run ' + run + ' done ' + !!storyF().h3stones + ' in ' + (f / 60).toFixed(1) + ' s, longest straggle ' + maxStuck.toFixed(1) + ' s');
    }
    log.push('stones completed ' + okRuns + '/8, slowest ' + worst.toFixed(1) + ' s');
    return { log, shots }; });
  for (const [n, u] of r.shots) fs.writeFileSync(`${out}/${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  console.log(r.log.join('\n')); console.log(errs.length ? 'PAGE ERR ' + errs.join('\n') : 'no page errors'); await b.close(); })();
