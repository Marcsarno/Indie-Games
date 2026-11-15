// round 116: Act II's first region, walked through by script: a level-10 hero arrives in Ashford, Mara's quest,
// the Rescue Pit (the Enforcer's three moves staged, the rage, the kill, Renn freed), Renn at the Haul Gate, the
// gate opens, the way on; then Blackwake. Frames + a log. node ashford.cjs <outDir> [cls]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const [out, cls = 'warrior'] = process.argv.slice(2), b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e.stack).slice(0, 400)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(__dirname, '../../../game/index.html') + '?cine=0');
  const res = await p.evaluate((cls) => {
    const log = [], pics = [], snap = t => { G.msg = G.msg.slice(-2); render(); pics.push([t, cvs.toDataURL()]); }, run = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
    try {
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, cls); for (let k = 0; k < 5; k++) update(1 / 60);
    hero.tut = null; hero.lvl = 10; hero.xp = 0; for (let k = 0; k < 14; k++) hero.bag.push(rollItem(rng(k * 7 + 3), 10)); for (let q = 0; q < 3; q++) for (const it of bestUpgrades()) equipItem(it); hero.bag = []; recalcHero(); hero.hp = STAT.maxHp;
    Object.assign(storyF(), { met: true, woodTold: true, aldoFree: true, alphaDead: true, woodPaid: true, h3tower: true, h3stones: true, h3barrow: true, h3all: true, treeCleared: true, farmTold: true, chiefDead: true, farmPaid: true, letterRead: true, mineOpen: true, kingDead: true, kingPaid: true, maelisSeen: true }); G.gates = { 0: true };
    startLevel(6, 777); G.mode = 'play'; G.actCard = 0; run(0.5);
    log.push(`arrived: ${areaName()} act ${LV.act} reg ${LV.reg} diff ${LV.diff} stage ${storyStage()} "${stageText(storyStage())}" npcs ${npcs.filter(n => n.name).map(n => n.role + ':' + n.name).join(', ')}`);
    log.push(`spawn levels ${[...new Set(LV.spawns.map(s => s.lvl))].sort((a, b) => a - b).join(',')} enemies ${enemies.length} gate ${JSON.stringify(LV.regGate && { open: LV.regGate.open })} doors ${Object.keys(LV.doorsAt || {})} sides ${sidesHere()}`);
    const mara = npcs.find(n => n.role === 'mara'); hero.fi = mara.fi + 1.2; hero.fj = mara.fj + 1.2; updateFov(hero.fi, hero.fj); run(0.2); snap('town-mara');
    log.push('mark over mara ' + storyMark('mara') + ', smith ' + storyMark('smith') + ', bram ' + storyMark('bram') + ', edda ' + storyMark('edda') + ', merchant ' + storyMark('merchant') + ' target ' + JSON.stringify(storyTarget()));
    talkTo(mara); log.push('talk open: ' + !!G.talk + ' pages ' + (G.talk && G.talk.pages.length)); snap('talk-mara'); if (G.talk && G.talk.on) G.talk.on(); G.talk = null; G.mode = 'play';
    log.push('after mara: stage ' + storyStage() + ' target ' + JSON.stringify(storyTarget().map(v => +v.toFixed(1))));
    // the exit is barred
    hero.fi = LV.stairs.i + 0.5; hero.fj = LV.stairs.j + 0.5; log.push('exit barred ' + exitBarred()); snap('gate-shut');
    // the pit
    const d = SIDES.rescuepit.door(); hero.fi = d[0] + 1.5; hero.fj = d[1] + 1; updateFov(hero.fi, hero.fj); run(0.2); snap('pit-door');
    enterSide('rescuepit'); run(1.5);
    log.push(`in ${areaName()}: side ${LV.side} diff ${LV.diff} fail ${LV.genFail} boss ${boss && boss.id} kind ${boss && boss.bossKind} hp ${boss && boss.maxHp} lvl ${boss && boss.lvl} enemies ${enemies.length} ids ${[...new Set(enemies.map(e => e.id))]} lv ${[...new Set(enemies.map(e => e.lvl))]} npcs ${npcs.map(n => n.role)} arena ${JSON.stringify((({ x, y, w, h }) => ({ x, y, w, h }))(LV.rooms[LV.leaderRoom]))}`);
    const A = boss, place = r => { for (let a = 0; a < 6.28; a += 0.2) { const fi = A.fi + Math.cos(a) * r, fj = A.fj + Math.sin(a) * r; if (standable(fi, fj, 0.4) && los(A.fi, A.fj, fi, fj)) { hero.fi = fi; hero.fj = fj; return; } } };
    place(5); updateFov(hero.fi, hero.fj); A.state = 'hunt'; wake(A, true); for (const e of enemies) if (e !== A) { e.hp = 0; e.dying = 9; e.corpse = true; }
    run(0.6); snap('enforcer-enter'); run(2.4);
    const stage = (name, m, dist) => { A.mv = null; A.stunT = 0; hero.hp = STAT.maxHp; place(dist); hero.dead = 0; A.moves = (m + 2) % 3; A.special = 0; A.cool = 0; let k = 0; while (!A.mv && k++ < 120) update(1 / 60); if (!A.mv) { log.push(name + ': did not start'); return; } const hp0 = hero.hp, M = A.mv; run(M.wind * 0.6); snap(name + '-warn'); run(M.wind * 0.45 + 0.1); snap(name + '-hit'); run(0.7); snap(name + '-after'); run(2.5); log.push(`${name} (${M.kind}): ${M.warn.length} shapes; stood still, took ${Math.round(hp0 - hero.hp)} of ${STAT.maxHp}`); for (const e of enemies) if (e.calledBy === A) { e.hp = 0; e.dying = 9; e.corpse = true; } };
    stage('p1-slam', 1, 4); stage('p1-charge', 2, 5); stage('p1-cavein', 0, 4);
    A.mv = null; A.special = 0; A.hp = Math.round(A.maxHp * 0.45); place(4); run(0.1); log.push(`rage: phase ${A.phase}`); run(0.6); snap('rage'); run(1.5); for (const e of enemies) if (e.calledBy === A) { e.hp = 0; e.dying = 9; e.corpse = true; }
    stage('p2-slam', 1, 4); stage('p2-cavein', 0, 4);
    const renn = npcs.find(n => n.role === 'renn'); talkTo(renn); log.push('renn before the kill: ' + (G.talk && G.talk.pages[0][1])); G.talk = null; G.mode = 'play';
    A.mv = null; damageEnemy(A, A.hp + 50, hero.fi, hero.fj); run(3.5); log.push(`enforcer dead: stage ${storyStage()} flags ${Object.keys(storyF()).filter(k => k.startsWith('a2'))}`);
    hero.fi = renn.fi + 1.2; hero.fj = renn.fj + 1.2; updateFov(hero.fi, hero.fj); run(0.3); const at = actionTarget(); log.push('action near renn: ' + (at && at.label)); snap('renn-caged');
    talkTo(renn); run(1.6); log.push(`renn freed: stage ${storyStage()} npcs left ${npcs.map(n => n.role)}`); snap('renn-free');
    leaveSide(); run(1.5); log.push(`back in ${areaName()}: renn at gate ${!!npcs.find(n => n.role === 'renn')} target ${JSON.stringify(storyTarget() && storyTarget().map(v => +v.toFixed(1)))}`);
    const rg = npcs.find(n => n.role === 'renn'); hero.fi = rg.fi - 1.2; hero.fj = rg.fj + 1; updateFov(hero.fi, hero.fj); run(0.3); snap('renn-gate');
    const lvl0 = hero.lvl, gold0 = hero.gold; talkTo(rg); snap('renn-talk'); if (G.talk && G.talk.on) G.talk.on(); G.talk = null; G.mode = 'play'; run(1.5);
    log.push(`gate: stage ${storyStage()} open ${LV.regGate.open} gold +${hero.gold - gold0} lvl ${lvl0}->${hero.lvl} barred ${exitBarred()} renn in town ${!!npcs.find(n => n.role === 'renn' && n.name === 'RENN PIKE')}`); snap('gate-open');
    // errand: Tamsin's ore
    const sm = npcs.find(n => n.role === 'smith'); trade(sm); log.push('smith first: ' + (G.talk ? G.talk.pages[0][1].slice(0, 40) : 'shop ' + G.mode)); if (G.talk && G.talk.on) G.talk.on(); G.talk = null; G.mode = 'play';
    const C = LV.cacheAt["Tamsin's ore"], ch = dynProps.find(q => q.kind === 'chest' && q.i === C[0] && q.j === C[1]); openChest(ch); log.push('ore: ' + !!storyF().a2ore + ' mark ' + storyMark('smith'));
    trade(sm); if (G.talk && G.talk.on) G.talk.on(); G.talk = null; G.mode = 'play'; log.push('ore paid ' + !!storyF().a2orePaid); trade(sm); log.push('then the smith opens: ' + G.mode); G.mode = 'play'; if (typeof SHOP !== 'undefined') SHOP.open = false;
    // Blackwake
    const d2 = SIDES.blackwake.door(); hero.fi = d2[0] + 1.5; hero.fj = d2[1] + 1; updateFov(hero.fi, hero.fj); run(0.3); snap('blackwake-door');
    enterSide('blackwake'); run(1.5); log.push(`in ${areaName()}: diff ${LV.diff} boss ${boss && boss.id} kind ${boss && boss.bossKind} hp ${boss && boss.maxHp} ids ${[...new Set(enemies.map(e => e.id))]}`);
    { const A = boss, place = r => { for (let a = 0; a < 6.28; a += 0.2) { const fi = A.fi + Math.cos(a) * r, fj = A.fj + Math.sin(a) * r; if (standable(fi, fj, 0.4) && los(A.fi, A.fj, fi, fj)) { hero.fi = fi; hero.fj = fj; return; } } };
      place(5); updateFov(hero.fi, hero.fj); A.state = 'hunt'; wake(A, true); for (const e of enemies) if (e !== A) { e.hp = 0; e.dying = 9; e.corpse = true; } run(0.6); snap('warden-enter'); run(2.4);
      const stage = (name, m, dist) => { A.mv = null; hero.hp = STAT.maxHp; place(dist); hero.dead = 0; A.moves = (m + 2) % 3; A.special = 0; A.cool = 0; let k = 0; while (!A.mv && k++ < 120) update(1 / 60); if (!A.mv) { log.push(name + ': did not start'); return; } const hp0 = hero.hp, M = A.mv; run(M.wind * 0.6); snap(name + '-warn'); run(M.wind * 0.45 + 0.15); snap(name + '-hit'); run(0.7); snap(name + '-after'); run(2.5); log.push(`${name} (${M.kind}): ${M.warn.length} shapes; stood still, took ${Math.round(hp0 - hero.hp)} of ${STAT.maxHp}`); for (const e of enemies) if (e.calledBy === A) { e.hp = 0; e.dying = 9; e.corpse = true; } };
      stage('w-rush', 1, 5); stage('w-volley', 2, 4); stage('w-ledger', 0, 4);
      A.mv = null; damageEnemy(A, A.hp + 50, hero.fi, hero.fj); run(3); log.push('warden dead: ledger ' + !!storyF().a2ledger + ' edda mark (in town) ' + JSON.stringify(Object.keys(storyF()).filter(k => /ledger/.test(k)))); }
    } catch (err) { log.push('ERR ' + String(err.stack).slice(0, 500)); }
    return { log, pics };
  }, cls);
  fs.mkdirSync(out, { recursive: true }); res.pics.forEach(([t, u], i) => fs.writeFileSync(`${out}/${String(i).padStart(2, '0')}-${t}.png`, Buffer.from(u.split(',')[1], 'base64')));
  console.log(res.log.join('\n')); console.log([...new Set(errs)].slice(0, 4).join('\n') || 'no errors'); await b.close(); })();
