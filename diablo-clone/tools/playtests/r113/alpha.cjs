// round 113: the Alpha's fight, staged: into the Wolf Den, near it, the entrance (push in), each move's warning
// and its aftermath, the rage at half life, the fall. Frames and a log. node alpha.cjs <outDir> [cls] [gameDir]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const [out, cls = 'warrior', game = 'game'] = process.argv.slice(2), b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=0');
  const res = await p.evaluate((cls) => {
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, cls); for (let k = 0; k < 5; k++) update(1 / 60);
    hero.lvl = 4; recalcHero(); hero.hp = STAT.maxHp;
    enterSide('den'); for (let k = 0; k < 90 && G.fade > 0 || k < 10; k++) update(1 / 60);
    const log = [], pics = [], snap = t => { render(); pics.push([t, cvs.toDataURL()]); }, run = s => { for (let i = 0; i < s * 60; i++) update(1 / 60); };
    const A = boss; log.push(`side ${LV.side}, boss ${A && A.id} kind ${A && A.bossKind} hp ${A && A.hp} dmg ${A && A.dmg} hero hp ${hero.hp}`);
    if (!A) return { log, pics };
    // put the hero 4 tiles from it, in the open, and let it notice him
    for (let a = 0; a < 6.28; a += 0.3) { const fi = A.fi + Math.cos(a) * 4, fj = A.fj + Math.sin(a) * 4; if (standable(fi, fj, 0.4)) { hero.fi = fi; hero.fj = fj; break; } }
    updateFov(hero.fi, hero.fj); A.state = 'hunt'; wake(A, true);
    for (const e of enemies) if (e !== A) { e.hp = 0; e.dying = 9; e.corpse = true; }   // just the two of them
    run(0.05); log.push('cam ' + JSON.stringify(G.bossCam));
    run(0.4); snap('enter-0.45'); run(0.7); snap('enter-1.15'); run(1.0); snap('enter-2.15'); run(0.6);
    log.push('after entrance: cam ' + !!G.bossCam + ' hero hp ' + hero.hp);
    const stage = (name, fn, at) => { A.mv = null; A.special = 99; hero.hp = STAT.maxHp; const hp0 = hero.hp; fn(); for (const t of at) { run(t[0]); snap(name + '-' + t[1]); } run(2.2); log.push(`${name}: hero took ${hp0 - hero.hp} (stood still)`); };
    const D = () => { const dx = hero.fi - A.fi, dy = hero.fj - A.fj; return [dx, dy, Math.hypot(dx, dy)]; };
    stage('pounce', () => { const [dx, dy, d] = D(); startPounce(A, dx, dy, d, false, false); }, [[0.4, 'wind'], [0.45, 'leap'], [0.4, 'land']]);
    hero.fi = A.fi + 1.6; hero.fj = A.fj; if (!standable(hero.fi, hero.fj, 0.4)) { hero.fi = A.fi; hero.fj = A.fj + 1.6; }
    stage('rend', () => { startRend(A, Math.atan2(hero.fj - A.fj, hero.fi - A.fi), false, false); }, [[0.45, 'wind'], [0.35, 'rakes']]);
    stage('howl', () => startHowl(A, false), [[0.6, 'wind'], [0.55, 'wave'], [1.2, 'pack']]);
    log.push('pack called: ' + enemies.filter(o => o.calledBy === A && alive(o)).length);
    for (const e of enemies) if (e.calledBy === A) { e.hp = 0; e.dying = 9; e.corpse = true; }
    A.mv = null; A.special = 0; A.hp = Math.round(A.maxHp * 0.45); run(0.1); log.push(`rage: phase ${A.phase} cam ${!!G.bossCam}`); run(0.5); snap('rage'); run(1.0);
    stage('p2-pounce', () => { const [dx, dy, d] = D(); startPounce(A, dx, dy, d, true, false); }, [[0.4, 'wind'], [0.9, 'second']]);
    // the fall
    const bag0 = hero.bag.length; hero.fi += 3; A.mv = null; damageEnemy(A, A.hp + 50, hero.fi, hero.fj); run(0.3); snap('fall-0.3'); run(0.9); snap('fall-1.2');
    log.push(`fall: alive ${alive(A)} bag +${hero.bag.length - bag0} loot ${groundItems.filter(g => g.item).map(g => ITEM_BASES[g.item.base].name + '(' + g.item.rarity + ')').join(', ')} story alphaDead ${storyF().alphaDead}`);
    return { log, pics };
  }, cls);
  fs.mkdirSync(out, { recursive: true }); res.pics.forEach(([t, u], i) => fs.writeFileSync(`${out}/${String(i).padStart(2, '0')}-${t}.png`, Buffer.from(u.split(',')[1], 'base64')));
  console.log(res.log.join('\n')); console.log(errs.slice(0, 3).join('\n') || 'no errors'); await b.close(); })();
