// round 111: the opening's taps (a tap moves on, a held beat ignores it, SKIP jumps to the question), a
// returning player's short title, and Osric giving his quest in the game after the dive. node taps.cjs [gameDir]
const { chromium } = require('playwright'); const path = require('path');
(async () => { const [game = 'game'] = process.argv.slice(2), b = await chromium.launch(), out = [];
  for (const run of ['first', 'again']) {
    const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(r => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); if (r === 'again') localStorage.setItem('dcg-intro', '1'); }, run);
    await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=1');
    out.push(run + ': ' + await p.evaluate(() => {
      allocBuffers(270, 480); G.mode = 'title'; titleScene(); TITLE.splash = true; leaveSplash(); const C = G.cine, log = [];
      const run = s => { for (let i = 0; i < s * 60; i++) update(1 / 60); render(); }, tap = (x, y) => cineTitleTap([x, y]);
      log.push('shots ' + C.shots.length);
      if (C.intro) {
        run(0.5); tap(135, 300); log.push('tap -> #' + C.k);
        while (!C.shots[C.k].noTap) run(0.1); const k = C.k; run(0.4); tap(135, 300); log.push('held #' + k + ' tap -> #' + C.k);
        tap(W - 20, 10); log.push('SKIP -> #' + C.k + ' ' + C.shots[C.k].text);
      }
      run(3); log.push('now #' + C.k + (C.shots[C.k].pick ? ' (pick)' : ''));
      titlePick('ranger'); startGame(false, 'ranger'); for (let i = 0; i < 60 * 30 && G.cine; i++) { if (G.cine.shots[G.cine.k].roll && G.cine.rollT === null && G.cine.st > 1) cineRoll(); update(1 / 60); }
      log.push('mode ' + G.mode); for (let i = 0; i < 60 * 6 && !G.talk; i++) update(1 / 60);
      log.push('talk: ' + (G.talk ? JSON.stringify(G.talk.pages[0]).slice(0, 110) : 'none') + ' / dcg-intro ' + localStorage.getItem('dcg-intro'));
      return log.join(' | ');
    }) + (errs.length ? ' ERR ' + errs[0] : ''));
    await p.close();
  }
  console.log(out.join('\n')); await b.close(); })();
