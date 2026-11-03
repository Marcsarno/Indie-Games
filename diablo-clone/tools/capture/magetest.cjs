// mage smoke test: start a mage, fight a pack with missiles, fireball, frost nova, meteor; screenshots
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file:///home/user/indie-games/diablo-clone/game/index.html');
  const r = await p.evaluate(() => {
    Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const log = {}, shots = {};
    newHero('mage'); hero.lvl = 5; recalcHero(); hero.hp = STAT.maxHp; hero.mana = STAT.maxMana; G.mode = 'play'; startLevel(3, 777);
    log.look = hero.look; log.stats = { hp: STAT.maxHp, mana: STAT.maxMana, dmg: STAT.dmg, skills: SKILLS.map(s => s.id) };
    let best = null, bs = -1;
    for (let i = 2; i < 38; i++) for (let j = 2; j < 38; j++) { let n = 0; for (let a = -3; a <= 3; a++) for (let c = -3; c <= 3; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
    const pack = enemies.filter(e => e.id === 'skeleton' || e.id === 'fallen').slice(0, 5); enemies.length = 0; enemies.push(...pack);
    hero.fi = best[0]; hero.fj = best[1]; hero.dir = 7;
    const spots = [[2.6, -2.2], [3.2, -1.2], [2.0, -3.0], [3.6, -2.6], [2.8, -0.6]];
    pack.forEach((e, k) => { e.fi = best[0] + spots[k][0]; e.fj = best[1] + spots[k][1]; e.state = 'hunt'; e.def = Object.assign({}, e.def, { dmg: [0, 0], speed: 8 }); e.hp = e.maxHp = 60; });
    for (let i = 0; i < 400; i++) warmStep(50);
    const run = (n, cb) => { for (let k = 0; k < n; k++) { cb && cb(k); update(1 / 60); warmStep(30); } };
    const hp0 = () => pack.reduce((a, e) => a + Math.max(0, e.hp), 0);
    let h = hp0(); input.attack = true; let fired = 0;
    run(8); render(); shots.missiles = cvs.toDataURL(); run(52); input.attack = false; run(30);
    log.missileDmg = h - hp0(); h = hp0();
    useSkill(0); run(6); render(); shots.fireball = cvs.toDataURL(); run(40); log.fireballDmg = h - hp0(); h = hp0();
    pack.forEach((e, k) => { if (alive(e)) { e.fi = hero.fi + spots[k][0] * 0.5; e.fj = hero.fj + spots[k][1] * 0.5; } });
    useSkill(1); run(10); render(); shots.frost = cvs.toDataURL(); log.frozen = pack.filter(e => e.frozen > 0).length; log.frostDmg = h - hp0(); run(40); h = hp0();
    pack.forEach((e, k) => { if (alive(e)) { e.fi = best[0] + spots[k][0]; e.fj = best[1] + spots[k][1]; } });
    CD.meteor = 0; hero.mana = STAT.maxMana; useSkill(2); run(36); render(); shots.meteorFall = cvs.toDataURL(); run(30); render(); shots.meteorHit = cvs.toDataURL(); run(30);
    log.meteorDmg = h - hp0(); log.alive = pack.filter(alive).length; log.mana = Math.round(hero.mana);
    return { log, shots };
  });
  console.log(JSON.stringify(r.log)); if (errs.length) console.log('ERR', errs.join('\n'));
  for (const k in r.shots) fs.writeFileSync(`${out}/${k}.png`, Buffer.from(r.shots[k].split(',')[1], 'base64'));
  await b.close();
})();
