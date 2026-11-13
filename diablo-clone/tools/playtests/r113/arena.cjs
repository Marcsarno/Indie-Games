// round 113b: the Wolf Den's boss arena: is the Alpha's room a big open dead end, the Alpha in the middle, Aldo's
// cage off at its far left or right, nothing else in it? Several seeds; a frame of the arena. node arena.cjs <outDir> [gameDir]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const [out, game = 'game'] = process.argv.slice(2), b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e.stack).slice(0, 300)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=0');
  const res = await p.evaluate(() => {
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'ranger'); for (let k = 0; k < 5; k++) update(1 / 60);
    const log = [], pics = [];
    const report = tag => {
      const r = LV.rooms[LV.leaderRoom], A = enemies.find(e => e.id === 'alpha'), cage = LV.decor.find(d => d.kind === 'cage');
      let open = 0, solid = 0; for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) { const k = tIdx(i, j); if (LV.roomOf[k] === LV.leaderRoom && LV.map[k] === FLOOR) { if (LV.solid[k]) solid++; else open++; } }
      const others = enemies.filter(e => e !== A && LV.roomOf[tIdx(Math.floor(e.fi), Math.floor(e.fj))] === LV.leaderRoom).length;
      const sx = (i, j) => i - j, span = [], fl = []; for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) if (LV.roomOf[tIdx(i, j)] === LV.leaderRoom) fl.push(sx(i, j));
      const mn = Math.min(...fl), mx = Math.max(...fl), cs = cage ? (sx(cage.i, cage.j) - mn) / (mx - mn) : -1;
      log.push(`${tag}: attempts ${LV.genAttempts} arena ${!!r.bossArena} ${r.w}x${r.h} open ${open} solid ${solid}; alpha at center ${A ? Math.hypot(A.fi - r.cx - 0.5, A.fj - r.cy - 0.5).toFixed(1) : 'none'}; cage across the screen ${cs.toFixed(2)} (0 = far left, 1 = far right); other monsters inside ${others}; boss ${boss && boss.bossKind}`);
    };
    enterSide('den'); for (let k = 0; k < 60; k++) update(1 / 60); report('den');
    // the arena seen in the game: the hero at its way in, looking in
    const r = LV.rooms[LV.leaderRoom], en = r.entry; { const dx = r.cx - en[0], dy = r.cy - en[1], d = Math.hypot(dx, dy); hero.fi = en[0] + 0.5 + dx / d * 3; hero.fj = en[1] + 0.5 + dy / d * 3; }
    for (const e of enemies) if (e.id !== 'alpha') { e.hp = 0; e.dying = 9; e.corpse = true; }
    const A = enemies.find(e => e.id === 'alpha'); A.state = 'sleep'; updateFov(hero.fi, hero.fj); for (let k = 0; k < 3; k++) update(1 / 60);
    G.areaCard = 0; G.actCard = 0; G.camAt = { fi: (hero.fi + r.cx) / 2, fj: (hero.fj + r.cy) / 2 }; render(); pics.push(['arena', cvs.toDataURL()]); G.camAt = null;
    { const cg = LV.decor.find(d => d.kind === 'cage'); G.camAt = { fi: (r.cx + cg.i) / 2 + 0.5, fj: (r.cy + cg.j) / 2 + 0.5 }; hero.fi = r.cx - 2; hero.fj = r.cy + 2; updateFov(hero.fi, hero.fj); for (let k = 0; k < 3; k++) update(1 / 60); render(); pics.push(['cage', cvs.toDataURL()]); G.camAt = null; }
    // other dens: other seeds, as other saves would have
    for (const sd of [11, 222, 3333, 44444, 98765]) { leaveSide && LV.side && leaveSide(); try { genLevel(LV.level, sd, 'den'); placeSpawnsOk = true; } catch (e) { log.push('seed ' + sd + ' FAILED ' + e.message); continue; }
      const r2 = LV.rooms[LV.leaderRoom]; const cage = LV.decor.find(d => d.kind === 'cage');
      log.push(`seed ${sd}: attempts ${LV.genAttempts} arena ${!!r2.bossArena} ${r2.w}x${r2.h} spawns in it ${LV.spawns.filter(s => LV.roomOf[tIdx(Math.floor(s.fi), Math.floor(s.fj))] === LV.leaderRoom).map(s => s.id).join(',')} cage ${cage ? 'yes' : 'NO'}`); }
    return { log, pics };
  });
  fs.mkdirSync(out, { recursive: true }); res.pics.forEach(([t, u]) => fs.writeFileSync(`${out}/${t}.png`, Buffer.from(u.split(',')[1], 'base64')));
  console.log(res.log.join('\n')); console.log(errs.slice(0, 3).join('\n') || 'no errors'); await b.close(); })();
