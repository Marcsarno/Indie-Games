// Stills (or the frames for a clip) of the table, played through on its own timing:
//   node tools/capture/cineshots.cjs <outDir> [what=open] [cls=warrior] [gameDir] [w=270] [h=480]
// what: title (the game opening at the table) | open (the title, then a new game's opening, taps
// as a player would) | resume | actEnd | quest:<stage> (meet, wren, aldoBack, hollis, farmBack, letter:
// the story set to that stage in camp, the one who gives it spoken to: up to the table and back).
// Writes <phase><shot>-<frame>.png every EVERY frames (default 24); FRAMES=1 writes every 3rd frame as
// f-0000.png ... for a clip (ffmpeg -framerate 20 -i f-%04d.png).
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [out, what = 'open', cls = 'warrior', gd0, w = '270', h = '480'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const gd = gd0 || path.resolve(__dirname, '../../game'), all = process.env.FRAMES === '1', every = all ? 3 : +(process.env.EVERY || 24);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } }); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(gd, 'index.html') + '?cine=1');
  const r = await p.evaluate(([what, cls]) => {
    try {
      fitCanvas(); titleScene(); for (let i = 0; i < 300; i++) warmStep(50); update(1 / 60); render();   // the title: its world, its looks
      if (what === 'title' || what === 'open' || what === 'resume') { leaveSplash(); return { kind: G.cine.kind, W: OW, H: OH }; }
      newHero(cls); G.mode = 'play'; G.town = null; G.portal = null; G.story = null; G.gates = null; G.sideBack = null; startLevel(1, 4242); G.actCard = 0;
      for (let i = 0; i < 300; i++) warmStep(50); for (let k = 0; k < 30; k++) update(1 / 60);
      if (what === 'actEnd') { startCine('actEnd', { done: () => {} }); return { kind: 'actEnd' }; }
      const st = what.split(':')[1], f = storyF(), steps = ['met', 'woodTold', 'alphaDead', 'aldoFree', 'woodPaid', 'h3', 'sawChain', 'farmTold', 'chiefDead', 'farmPaid', 'letterRead'];
      const upTo = { meet: 0, wren: 1, aldoBack: 4, hollis: 7, farmBack: 9, letter: 10 }[st];
      for (let k = 0; k < upTo; k++) { if (steps[k] === 'h3') { for (const o of H3) h3Complete(o); } else f[steps[k]] = true; }
      if (st === 'wren') f.woodTold = false;
      G.msg = []; G.qBanner = null;
      const n = npcs.find(q => q.role === CAMP_ROLE[storyStage()]); if (!n) return 'ERR no ' + CAMP_ROLE[storyStage()] + ' for ' + storyStage();
      talkTo(n); return { kind: G.cine && G.cine.kind, stage: storyStage() };
    } catch (e) { return 'ERR ' + e.stack; }
  }, [what, cls]);
  console.log(JSON.stringify(r)); if (typeof r === 'string') { await b.close(); return; }
  const step = n => p.evaluate(n => { try { let ms = 0; for (let k = 0; k < n; k++) { update(1 / 60); const t0 = performance.now(); render(); ms = Math.max(ms, performance.now() - t0); } const C = G.cine; return { url: cvs.toDataURL(), ph: C ? C.ph : 'done', k: C ? C.k : -1, kind: C ? C.kind : '', talk: !!G.talk, mode: G.mode, ms }; } catch (e) { return { err: e.stack }; } }, n);
  let f = 0, worst = 0, picked = false, frames = 0;
  for (let i = 0; i < 6000 / every; i++) {
    const q = await step(every); frames += every; if (q.err) { console.log(q.err); break; }
    if (i > 2) worst = Math.max(worst, q.ms);
    const name = all ? 'f-' + String(f).padStart(4, '0') : (q.ph === 'shots' ? (q.kind === 'title' ? 't' : 's') + q.k : q.ph === 'done' ? 'game' : q.ph) + '-' + String(f).padStart(3, '0'); f++;
    fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(q.url.split(',')[1], 'base64'));
    // as a player: at the table title, pick the class after a while, then play; take a reward at the table
    if (q.kind === 'title' && q.k === 1 && frames > 300 && !picked && what !== 'title') { picked = true; await p.evaluate(([cls, what]) => { titlePick(cls); G.t += 0; }, [cls, what]); for (let k = 0; k < 2; k++) await step(30); await p.evaluate(([cls, what]) => { if (what === 'resume') { hero.cls = cls; G.mode = 'play'; saveGame(); } startGame(what === 'resume', cls); }, [cls, what]); }
    if (what === 'title' && frames > 420) { await p.evaluate(cls => titlePick(cls), cls); }
    if (what === 'title' && frames > 560) break;
    if (q.talk) { await p.evaluate(() => { const L = talkLayout(); cineTap([L.cards[1].x + 4, L.cards[1].y + 4]); }); await step(20); await p.evaluate(() => { const L = talkLayout(); cineTap([L.btn.x + 2, L.btn.y + 2]); }); }
    if (q.ph === 'done') { console.log('ended in mode', q.mode, 'after', (frames / 60).toFixed(1), 's'); break; }
  }
  const after = await p.evaluate(() => ({ stage: typeof storyStage === 'function' && G.story ? storyStage() : null, banner: G.qBanner && G.qBanner.line, bag: hero.bag.length, mode: G.mode }));
  console.log('after', JSON.stringify(after), 'worst render ms', worst.toFixed(1), errs.length ? 'ERR ' + errs.slice(0, 3).join('\n') : 'no page errors'); await b.close();
})();
