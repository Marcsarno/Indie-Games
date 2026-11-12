// round 101: Aldo at the fallen tree, the clues, the chop, the one-goal tracker: node aldo.cjs <outDir>
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const r = await p.evaluate(() => { const log = [], shots = [];
    try {
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'warrior'); G.actCard = 0;
    const f = storyF(); Object.assign(f, { met: true, woodTold: true, alphaDead: true, aldoFree: true });
    hero.lvl = 6; recalcHero(); startLevel(LV.level, LV.seed); G.actCard = 0; enemies.length = 0;
    const step = (n) => { for (let k = 0; k < n; k++) { G.guide = null; update(1 / 60); if (G.mode === 'cine') { G.cine = null; G.mode = 'play'; } } };
    const snap = name => { G.msg = G.msg || []; for (let i = 0; i < 400; i++) warmStep(40); render(); warmStep(1e4); render(); drawHud && drawHud(); shots.push([name, cvs.toDataURL()]); };
    const closeAll = () => { let k = 0; while (G.talk && k++ < 9) { if (G.talk.reward) G.talk.pick = 0; closeTalk(); } };
    log.push('stage ' + storyStage() + ' aldo ' + npcs.filter(n => n.role === 'aldo').map(n => n.atTree ? 'tree' : 'home'));
    // Wren's hand-in: Aldo goes to the tree
    const wren = npcs.find(n => n.role === 'wren'); talkTo(wren); log.push('wren talk ' + !!G.talk); closeAll(); step(90);
    log.push('stage ' + storyStage() + ' aldo ' + npcs.filter(n => n.role === 'aldo').map(n => n.atTree ? 'tree' : 'home') + ' woodPaid ' + f.woodPaid);
    const aldo = npcs.find(n => n.atTree), T = LV.treeBlock;
    // tap Aldo: what is done and what is left
    talkTo(aldo); log.push('aldo says: ' + (G.talk ? G.talk.pages.map(x => x[1]).join(' | ') : 'nothing')); closeAll();
    // the tower, done in its side area (simulated): the clue follows
    hero.fi = aldo.fi - 3; hero.fj = aldo.fj + 3; h3Complete(H3[0]); step(120);
    log.push('after tower: talk ' + (G.talk ? G.talk.pages.map(x => x[0] + ': ' + x[1]).join(' | ') : 'none')); closeAll();
    // the tracker, mid-way
    hero.fi = HUB.camp[0]; hero.fj = HUB.camp[1] - 3; step(5); snap('a-tracker-hollow3');
    h3Complete(H3[2]); step(120); log.push('after barrow: talk ' + (G.talk ? G.talk.pages.length + ' pages' : 'none')); closeAll();
    // walk up to the tree before the last: Aldo names what is left
    hero.fi = T[0] - 2.4; hero.fj = T[1] + 0.8; G.sealT = 0; G.msg = []; step(2); log.push('at the tree: ' + JSON.stringify((G.msg || []).map(m => m.text || m.t || m)));
    hero.fi = aldo.fi + 1.6; hero.fj = aldo.fj + 2.2; hero.dir = 0; step(2); snap('b-aldo-waits');
    // the stones last, out in the Hollow
    hero.fi = HUB.camp[0]; hero.fj = HUB.camp[1] - 3; h3Complete(H3[1]); step(120);
    log.push('after stones: talk ' + (G.talk ? G.talk.pages.map(x => x[1]).slice(-1)[0] : 'none')); closeAll();
    log.push('stage ' + storyStage() + ' target ' + JSON.stringify(storyTarget()) + ' aldo at ' + [aldo.fi.toFixed(1), aldo.fj.toFixed(1)] + ' mark ' + storyMark('aldo'));
    step(5); snap('c-tracker-chop');
    // walk up to him: the chop
    hero.fi = aldo.fi - 2.0; hero.fj = aldo.fj + 2.2; step(2); log.push('chop started ' + !!G.chop);
    const C = G.chop; let frames = 0;
    while (G.chop && C.k < 1 && frames++ < 300) step(1); snap('d-chop-blow1');
    while (G.chop && !C.cracked && frames++ < 600) step(1); step(3); snap('e-chop-crack');
    while (G.chop && frames++ < 900) step(1);
    log.push('chop done ' + !G.chop + ' tree ' + !!LV.treeBlock + ' treeCleared ' + f.treeCleared + ' stage ' + storyStage() + ' frames ' + frames);
    step(150); log.push('next: talk ' + (G.talk ? G.talk.pages[0][0] + ': ' + G.talk.pages[0][1].slice(0, 60) : 'none'));
    closeAll(); step(5); snap('f-after');
    log.push('stage ' + storyStage() + ' target ' + JSON.stringify(storyTarget()));
    // old saves: past the tree (old flag) and past the farm: no chop step, the tree is down
    for (const flags of [{ treeCleared: true }, { farmTold: true }, { h3tower: true, h3stones: true, h3barrow: true, treeCleared: true }]) {
      G.story = { f: Object.assign({ met: true, woodTold: true, alphaDead: true, aldoFree: true, woodPaid: true }, flags), n: 0 }; startLevel(LV.level, LV.seed); step(3);
      log.push('legacy ' + JSON.stringify(flags) + ' stage ' + storyStage() + ' tree ' + !!LV.treeBlock + ' aldo ' + npcs.filter(n => n.role === 'aldo').map(n => n.atTree ? 'tree' : 'home'));
    }
    // a save made while waiting at the tree: Aldo is there on load
    G.story = { f: { met: true, woodTold: true, alphaDead: true, aldoFree: true, woodPaid: true, h3tower: true, h3stones: true, h3barrow: true }, n: 0 }; startLevel(LV.level, LV.seed); step(3);
    log.push('reload at chop: stage ' + storyStage() + ' tree ' + !!LV.treeBlock + ' aldo ' + npcs.filter(n => n.role === 'aldo').map(n => n.atTree ? 'tree' : 'home'));
    } catch (e) { log.push('ERR ' + e.stack); }
    return { log, shots }; });
  for (const [n, u] of r.shots) fs.writeFileSync(`${out}/${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  console.log(r.log.join('\n')); console.log(errs.length ? 'PAGE ERR ' + errs.join('\n') : 'no page errors'); await b.close(); })();
