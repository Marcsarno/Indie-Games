// round 116: the Cinderworks smoke test: arrive, the new monsters build and act, Rusk, Maelis, Silkshaft and its
// Broodmother, the sluice drains the road. Frames + a log. node cinder.cjs <outDir>
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const [out] = process.argv.slice(2), b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e.stack).slice(0, 400)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(__dirname, '../../../game/index.html') + '?cine=0');
  const res = await p.evaluate(() => {
    const log = [], pics = [], snap = t => { G.msg = G.msg.slice(-2); render(); pics.push([t, cvs.toDataURL()]); }, run = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
    try {
      allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'warrior'); for (let k = 0; k < 5; k++) update(1 / 60);
      hero.tut = null; hero.lvl = 12; for (let k = 0; k < 14; k++) hero.bag.push(rollItem(rng(k * 7 + 3), 12)); for (let q = 0; q < 3; q++) for (const it of bestUpgrades()) equipItem(it); hero.bag = []; recalcHero(); hero.hp = STAT.maxHp;
      Object.assign(storyF(), { kingDead: true, kingPaid: true, maelisSeen: true, endShown: true, a2met: true, a2enforcer: true, a2rennFree: true, a2gate: true }); G.gates = { 0: true };
      startLevel(7, 4321); G.mode = 'play'; G.actCard = 0; run(0.5);
      log.push(`arrived ${areaName()} reg ${LV.reg} diff ${LV.diff} stage ${storyStage()} start ${hero.fi.toFixed(1)},${hero.fj.toFixed(1)} enemies ${enemies.length} ids ${[...new Set(enemies.map(e => e.id))]} boss ${boss && boss.id} sides ${sidesHere()} back ${!!LV.regBack} flood ${JSON.stringify(LV.regGate)} marks ${Object.keys(LV.marks || {})}`);
      snap('landing');
      // the new monsters, staged
      for (const id of ['shaleripper', 'cinderhusk']) {
        enemies.length = 0; const e = makeEnemy(id, hero.fi + 4, hero.fj - 2, 0, 12); e.state = 'hunt'; enemies.push(e); run(0.1);
        const seen = {}; for (let k = 0; k < 600; k++) { update(1 / 60); seen[e.clip] = 1; if (k === 150 || k === 260) snap(id + '-' + k); hero.hp = STAT.maxHp; }
        log.push(`${id}: clips seen ${Object.keys(seen)} under ${!!e.under} fx ${(G.a2Fx || []).length}`);
      }
      enemies.length = 0;
      // Rusk at the wheel
      startLevel(7, 4321); run(0.3); const R = boss; log.push(`rusk: ${R && R.id} kind ${R && R.bossKind} hp ${R && R.maxHp}`);
      if (R) { hero.fi = R.fi + 3; hero.fj = R.fj + 2; updateFov(hero.fi, hero.fj); for (const e of enemies) if (e !== R) { e.hp = 0; e.dying = 9; e.corpse = true; } R.state = 'hunt'; wake(R, true); run(3.5); R.special = 0; run(0.5); snap('rusk-move'); run(1.5); R.mv = null; damageEnemy(R, R.hp + 99, hero.fi, hero.fj); run(3); log.push(`rusk dead: stage ${storyStage()} box ${storyF().a2box}`); }
      // Maelis
      const F = (REGIONS.cinder.clearings.find(c => c.id === 'forecourt')), fc = US(F.u, F.s); hero.fi = fc[0] + 0.5; hero.fj = fc[1] + 0.5; for (const e of enemies) if (alive(e)) { e.hp = 0; e.dying = 9; e.corpse = true; } updateFov(hero.fi, hero.fj); run(2.2); snap('maelis');
      log.push('maelis talk ' + !!G.talk); if (G.talk && G.talk.on) G.talk.on(); G.talk = null; G.mode = 'play'; run(3); log.push(`after maelis: stage ${storyStage()}`);
      // Silkshaft
      enterSide('silkshaft'); run(1.5); const B = boss; log.push(`silkshaft: fail ${LV.genFail} boss ${B && B.id} kind ${B && B.bossKind} hp ${B && B.maxHp} eggs ${dynProps.filter(q => q.kind === 'egg').length}`);
      if (B) { for (let a = 0; a < 6.28; a += 0.2) { const fi = B.fi + Math.cos(a) * 4, fj = B.fj + Math.sin(a) * 4; if (standable(fi, fj, 0.4)) { hero.fi = fi; hero.fj = fj; break; } } for (const e of enemies) if (e !== B) { e.hp = 0; e.dying = 9; e.corpse = true; } updateFov(hero.fi, hero.fj); B.state = 'hunt'; wake(B, true); run(3.5);
        const kinds = {}; for (let k = 0; k < 900; k++) { update(1 / 60); if (B.mv) kinds[B.mv.kind] = 1; hero.hp = STAT.maxHp; if (k === 300) snap('brood-move'); if (k === 450) B.hp = Math.round(B.maxHp * 0.45); if (k === 520) snap('brood-rage'); }
        log.push(`brood moves ${Object.keys(kinds)} phase ${B.phase} hatched ${enemies.filter(e => e.hatched).length}`); B.mv = null; damageEnemy(B, B.hp + 99, hero.fi, hero.fj); run(3); log.push(`brood dead: stage ${storyStage()}`); }
      leaveSide(); run(1.5);
      const s = LV.marks && LV.marks.sluice; if (s) { hero.fi = s[0] + 1.6; hero.fj = s[1] + 1.4; updateFov(hero.fi, hero.fj); run(0.3); const a = actionTarget(); log.push('at sluice: ' + (a && a.label)); if (a && a.go) a.go(); run(1.5); log.push(`drained: ${storyF().a2drained} stage ${storyStage()} barred ${exitBarred()} stairs to ${LV.stairs.to}`); snap('drained'); }
    } catch (err) { log.push('ERR ' + String(err.stack).slice(0, 600)); }
    return { log, pics };
  });
  fs.mkdirSync(out, { recursive: true }); res.pics.forEach(([t, u], i) => fs.writeFileSync(`${out}/${String(i).padStart(2, '0')}-${t}.png`, Buffer.from(u.split(',')[1], 'base64')));
  console.log(res.log.join('\n')); console.log([...new Set(errs)].slice(0, 4).join('\n') || 'no errors'); await b.close(); })();
