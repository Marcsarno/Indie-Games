// the paladin's moves in a crypt: node moves.cjs <outDir> [level]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [out, lvl = '3'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const r = await p.evaluate((lvl) => {
    const log = [], shots = [];
    try {
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'paladin'); G.story = { f: { met: true, woodTold: true }, n: 0 }; G.actCard = 0;
    hero.lvl = 6; recalcHero(); hero.hp = STAT.maxHp; hero.mana = STAT.maxMana;
    for (const [s, id] of [['chest', 'pal_plate3'], ['helm', 'pal_helm3'], ['weapon', 'pal_warhammer'], ['shield', 'pal_shield3']]) { const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; hero.equip[s] = it; }
    recalcHero();
    startLevel(+lvl, 777); G.msg = []; G.actCard = 0;
    const s = LV.start; hero.fi = s.cx + 0.5; hero.fj = s.cy + 0.5; hero.dir = 1;
    enemies.length = 0;
    const spawn = (id, di, dj) => { const fi = hero.fi + di, fj = hero.fj + dj; if (blocked(fi, fj)) return; const e = makeEnemy(id, fi, fj, enemies.length, 3); e.state = 'chase'; e.maxHp = e.hp = 9999; e.home0 = [fi, fj]; enemies.push(e); };
    for (const [di, dj] of [[1.1, 0.3], [4.2, -1.4], [5.0, 1.0], [3.8, 2.4], [2.0, 3.4]]) spawn('skeleton', di, dj);
    const warm = () => { for (let i = 0; i < 800; i++) warmStep(40); };
    const step = (n, dt = 1 / 60) => { for (let k = 0; k < n; k++) { for (const e of enemies) { e.atk = -1; e.cd = 9; } update(dt); for (const e of enemies) if (e.home0) { e.fi = e.home0[0]; e.fj = e.home0[1]; e.hp = Math.max(e.hp, 100); } hero.hp = STAT.maxHp; } };
    const snap = name => { log.push(name + ': hammers ' + G.pal.hammers.length + ' wall ' + !!G.pal.wall + ' waves ' + G.pal.waves.length + ' busy ' + heroBusy() + ' atk ' + hero.atk.toFixed(0) + ' mana ' + hero.mana.toFixed(0) + ' CD ' + JSON.stringify({p: CD.phammer, w: CD.pwall})); G.msg = []; floaters.length = 0; warm(); render(); warmStep(1e4); render(); const [x, y] = screenOf(hero); shots.push([name, cvs.toDataURL(), Math.round(x - camX), Math.round(y - camY)]); };
    const free = () => { let k = 0; while (heroBusy() && k++ < 400) step(1); };
    warm();
    // the combo: three swings, snap the third's wave
    const tgt = enemies[0]; window.drawHud = () => {}; hero.dir = dirFrom(tgt.fi - hero.fi, tgt.fj - hero.fj);
    for (let c = 0; c < 3; c++) { heroAttack(); let k = 0; while (!hero.hitDone && k++ < 200) step(1); if (c === 1) { step(1); snap('0-smite'); } if (c < 2) step(4); }
    step(5); snap('1-wave3');
    step(40);
    free(); CD.phammer = 0; useSkill(0); step(6); snap('2a-swing'); step(8); snap('2-hammer'); step(60);
    free(); CD.consec = 0; hero.mana = 99; useSkill(1); step(30); snap('3-consecrate');
    free(); CD.pwall = 0; hero.mana = 99; useSkill(2); step(30); snap('4-wall'); step(160);
    free(); CD.judge = 0; hero.mana = 99; useSkill(3); step(20); snap('5-judge-fall'); step(16); snap('6-judge-hit'); step(30); snap('6b-scorch');
    free(); hero.ult = 60; useUlt(); step(5); snap('7a-dawn-beam'); step(25); snap('7-dawn'); free(); heroAttack(); { let k = 0; while (!hero.hitDone && k++ < 200) step(1); } step(2); snap('7b-dawn-wave'); log.push('dawn speed ' + STAT.speed.toFixed(2) + ' look ' + hero.look.wings);
    free(); hero.wing = null; recalcHero(); hero.ult = 100; useUlt(); step(8); snap('8a-arch-beam'); step(22); snap('8-arch');
    heroAttack(); let k = 0; while (!hero.hitDone && k++ < 200) step(1); step(5); snap('9-arch-swing');
    log.push('ult after ' + hero.ult + ' wing ' + (hero.wing && hero.wing.kind));
    } catch (e) { log.push('ERR ' + e.stack); }
    return { log, shots };
  }, lvl);
  for (const [n, u, x, y] of r.shots) { fs.writeFileSync(`${out}/${n}.png`, Buffer.from(u.split(',')[1], 'base64')); fs.writeFileSync(`${out}/${n}.json`, JSON.stringify([x, y])); }
  console.log(r.log.join('\n')); console.log(errs.length ? errs.join('\n') : 'ok'); await b.close();
})();
