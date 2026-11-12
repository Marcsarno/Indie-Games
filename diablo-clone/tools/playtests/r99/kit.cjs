// round 99: every paladin move in a crypt, snapped at its best moment: node kit.cjs <outDir>
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const r = await p.evaluate(() => {
    const log = [], shots = [];
    try {
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'paladin'); G.story = { f: { met: true, woodTold: true }, n: 0 }; G.actCard = 0;
    hero.lvl = 6; for (const [s, id] of [['chest', 'pal_plate4'], ['helm', 'pal_helm4'], ['weapon', 'pal_warhammer'], ['shield', 'pal_shield3']]) { const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; hero.equip[s] = it; }
    recalcHero(); startLevel(3, 777); G.msg = []; G.actCard = 0; window.drawHud = () => {};
    const s0 = LV.start; hero.fi = s0.cx + 0.5; hero.fj = s0.cy + 0.5; hero.dir = 1; const home = [hero.fi, hero.fj];
    enemies.length = 0;
    const spawn = (di, dj) => { const fi = home[0] + di, fj = home[1] + dj; if (blocked(fi, fj)) return; const e = makeEnemy('skeleton', fi, fj, enemies.length, 3); e.maxHp = e.hp = 99999; e.home0 = [fi, fj]; enemies.push(e); };
    for (const [di, dj] of [[1.2, 0.3], [3.4, 0.6], [4.0, -0.6], [3.6, 1.6], [4.6, 0.8], [2.0, 3.2]]) spawn(di, dj);
    const warm = () => { for (let i = 0; i < 900; i++) warmStep(40); };
    const step = (n, dt = 1 / 60) => { for (let k = 0; k < n; k++) { for (const e of enemies) { e.atk = -1; e.cd = 9; } update(dt); for (const e of enemies) if (e.home0) { e.fi = e.home0[0]; e.fj = e.home0[1]; e.hp = Math.max(e.hp, 1000); e.downT = 0; e.stun = 0; e.kb = [0, 0]; } hero.hp = STAT.maxHp; hero.mana = 99; } };
    const snap = name => { G.msg = []; floaters.length = 0; warm(); render(); warmStep(1e4); render(); const [x, y] = screenOf(hero); shots.push([name, cvs.toDataURL(), Math.round(x - camX), Math.round(y - camY)]); };
    const free = () => { let k = 0; while ((heroBusy() || hero.bz) && k++ < 600) step(1); };
    const reset = () => { free(); step(30); for (const k in G.pal) if (Array.isArray(G.pal[k])) G.pal[k].length = 0; G.pal.bell = null; G.screenFlash = null; G.flashes.length = 0; G.ghosts.length = 0; G.slowmo = 0; hero.fi = home[0]; hero.fj = home[1]; hero.dir = 1; step(2); };
    const until = (fn, max = 400) => { let k = 0; while (!fn() && k++ < max) step(1); };
    const cast = (id, at) => { reset(); const i = SKILLS.findIndex(s => s.id === id); CD[id] = 0; useSkill(i); log.push(id + ' bz ' + (hero.bz && hero.bz.kind)); for (const [n, name] of at) { step(n); snap(name); } };
    warm();
    // the combo's third swing: the finisher's small hammer
    reset(); hero.atk = -1; hero.combo = 1; hero.swingEnd = G.t; heroAttack(); { let k = 0; while (!hero.hitDone && k++ < 200) step(1); } log.push('judges after 3rd ' + G.pal.judges.map(j => (j.mini ? 'mini' : 'big') + '@' + j.fi.toFixed(1) + ',' + j.fj.toFixed(1)).join(' ') + ' combo ' + hero.combo); step(4); snap('a-finisher-fall'); step(8); snap('b-finisher-hit');
    reset(); CD.seraph = 0; useSkill(SKILLS.findIndex(s => s.id === 'seraph')); until(() => hero.bz.t > 0.12); snap('c-seraph-rise'); until(() => hero.bz.t > 0.27); snap('d-seraph-apex'); until(() => hero.bz.t > 0.40); snap('e-seraph-dive'); until(() => !hero.bz || hero.bz.landed); step(2); snap('f-seraph-land'); step(8); snap('f2-seraph-after');
    cast('judge', [[18, 'g-judge-fall'], [12, 'h-judge-fall2'], [10, 'i-judge-hit']]);
    reset(); hero.ult = 60; useUlt(); step(4); snap('j-dawn-burst'); log.push('kit ' + SKILLS.map(s => s.id).join(','));
    cast('lance', []); until(() => !hero.bz || hero.bz.t > 0.1); snap('k-lance'); until(() => !hero.bz); step(8); snap('l-lance-lane');
    cast('toll', [[14, 'm-toll'], [16, 'n-toll2']]);
    reset(); hero.wing = null; recalcHero(); hero.ult = 100; useUlt(); step(5); snap('o-arch-burst'); log.push('kit ' + SKILLS.map(s => s.id).join(','));
    cast('lance3', [[7, 'p-lance3']]); step(8); snap('p2-lance3');
    cast('toll3', [[30, 'q-toll3']]); until(() => G.pal.pillars.length > 0); step(5); snap('q2-toll3-pillars');
    cast('seraph3', [[18, 'r-seraph3'], [30, 's-seraph3b']]);
    cast('wrath', [[20, 't-wrath'], [16, 'u-wrath2'], [20, 'v-wrath3']]);
    } catch (e) { log.push('ERR ' + e.stack); }
    return { log, shots };
  });
  for (const [n, u, x, y] of r.shots) { fs.writeFileSync(`${out}/${n}.png`, Buffer.from(u.split(',')[1], 'base64')); fs.writeFileSync(`${out}/${n}.json`, JSON.stringify([x, y])); }
  console.log(r.log.join('\n')); console.log(errs.length ? errs.join('\n') : 'ok'); await b.close();
})();
