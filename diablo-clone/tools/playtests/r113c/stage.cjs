// round 113c: each new boss, staged: the entrance, each of its three moves (warning half way, then the hit), the
// rage, the enraged versions, the fall. Frames + a log. node stage.cjs <tower|cellar|barrow2|king> <outDir> [cls]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const [where, out, cls = 'warrior'] = process.argv.slice(2), b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(__dirname, '../../../game/index.html') + '?cine=0');
  const res = await p.evaluate(([where, cls]) => {
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, cls); for (let k = 0; k < 5; k++) update(1 / 60);
    hero.lvl = { tower: 5, cellar: 7, barrow2: 9, king: 10 }[where]; recalcHero(); hero.hp = STAT.maxHp;
    const run = s => { for (let i = 0; i < s * 60; i++) update(1 / 60); };
    if (where === 'king') startLevel(5, 1234); else if (where === 'barrow2') { enterSide('barrow'); run(1.5); descendSide(); } else enterSide(where);
    run(1.5);
    const log = [], pics = [], snap = t => { render(); pics.push([t, cvs.toDataURL()]); };
    const A = boss; log.push(`${where}: boss ${A && A.id} kind ${A && A.bossKind} hp ${A && A.hp} hero hp ${hero.hp} arena ${LV.rooms && LV.rooms[LV.leaderRoom] ? JSON.stringify((({ x, y, w, h }) => ({ x, y, w, h }))(LV.rooms[LV.leaderRoom])) : '-'}`);
    if (!A) return { log, pics };
    const place = (r) => { for (let a = 0; a < 6.28; a += 0.2) { const fi = A.fi + Math.cos(a) * r, fj = A.fj + Math.sin(a) * r; if (standable(fi, fj, 0.4) && los(A.fi, A.fj, fi, fj)) { hero.fi = fi; hero.fj = fj; return; } } };
    place(5); updateFov(hero.fi, hero.fj); A.state = 'hunt'; wake(A, true);
    for (const e of enemies) if (e !== A) { e.hp = 0; e.dying = 9; e.corpse = true; }
    run(0.6); snap('enter'); run(2.4);
    const kinds = { gchief: ['pots', 'barrels', 'slam'], banditchief: ['axe', 'oil', 'charge'], barrowwight: ['hands', 'beam', 'raise'], skelking: ['cleave', 'charge', 'raise'] }[A.bossKind];
    const order = { gchief: [1, 2, 0], banditchief: [1, 2, 0], barrowwight: [1, 2, 0], skelking: [1, 2, 0] }[A.bossKind];
    const stage = (name, m, dist) => {
      A.mv = null; A.stunT = 0; hero.hp = STAT.maxHp; place(dist); hero.dead = 0; A.moves = (m + 2) % 3; A.special = 0; A.cool = 0;
      let k = 0; while (!A.mv && k++ < 120) update(1 / 60);
      if (!A.mv) { log.push(name + ': did not start'); return; }
      const hp0 = hero.hp, M = A.mv; run(M.wind * 0.6); snap(name + '-warn'); run(M.wind * 0.45 + 0.1); snap(name + '-hit'); run(0.6); snap(name + '-after');
      run(2); log.push(`${name} (${M.kind}): warn ${M.warn.length} shapes; hero stood still, took ${hp0 - hero.hp} of ${STAT.maxHp}`);
      for (const e of enemies) if (e.calledBy === A) { e.hp = 0; e.dying = 9; e.corpse = true; }
    };
    kinds.forEach((n, q) => stage('p1-' + n, order[q], n === 'cleave' ? 2 : 4));
    A.mv = null; A.special = 0; A.hp = Math.round(A.maxHp * 0.45); place(4); run(0.1); log.push(`rage: phase ${A.phase} cam ${!!G.bossCam}`); run(0.6); snap('rage'); run(2.0);
    for (const e of enemies) if (e.calledBy === A) { e.hp = 0; e.dying = 9; e.corpse = true; }
    kinds.forEach((n, q) => stage('p2-' + n, order[q], n === 'cleave' ? 2 : 4));
    const bag0 = groundItems.length; A.mv = null; damageEnemy(A, A.hp + 50, hero.fi, hero.fj); run(0.3); snap('fall'); run(2.5);
    log.push(`fall: alive ${alive(A)} loot ${groundItems.slice(bag0).filter(g => g.item).map(g => ITEM_BASES[g.item.base].name + '(' + g.item.rarity + ')').join(', ')}`);
    return { log, pics };
  }, [where, cls]);
  fs.mkdirSync(out, { recursive: true }); res.pics.forEach(([t, u], i) => fs.writeFileSync(`${out}/${String(i).padStart(2, '0')}-${t}.png`, Buffer.from(u.split(',')[1], 'base64')));
  console.log(res.log.join('\n')); console.log([...new Set(errs)].slice(0, 3).join('\n') || 'no errors'); await b.close(); })();
