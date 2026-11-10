// Shield Charge (round 76): distance, hits, the three upgrades, and that nothing hurts the hero mid-charge. node tools/charge-test.cjs
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../game') + '/index.html');
  const res = await p.evaluate(() => {
    const out = [];
    const setup = mod => { newHero('warrior'); hero.lvl = 12; hero.hp = hero.maxHp = 500; hero.mana = 99; G.mode = 'play'; startLevel(1, 4242); G.actCard = 0; enemies.length = 0; recalcHero && recalcHero();
      hero.mods = hero.mods || {}; if (mod) hero.mods.charge = mod; else delete hero.mods.charge;
      const c = CAMP_AT(0, -16); hero.fi = c[0]; hero.fj = c[1]; hero.dir = 5; resetSkills(); clearInput(); return c; };
    const spawnLine = (n, d0) => { const [fx, fy] = dirVec(hero.dir), es = []; for (let k = 0; k < n; k++) { const e = makeEnemy('skeleton', hero.fi + fx * (d0 + k * 1.2), hero.fj + fy * (d0 + k * 1.2)); e.state = 'awake'; enemies.push(e); es.push(e); } return es; };
    const idx = SKILLS.findIndex(s => s.id === 'charge');
    const run = (sec, each) => { for (let f = 0; f < sec * 60; f++) { update(1 / 60); each && each(f); } };
    for (const mod of [null, 'ram', 'again', 'tremor']) {
      setup(mod); const es = spawnLine(4, 2), hp0 = es.map(e => e.hp), start = [hero.fi, hero.fj]; let hurt = 0; const h0 = hero.hp;
      useSkill(idx); let frames = 0, second = false;
      run(0.8, f => { if (hero.charge) frames++; es.forEach(e => { if (alive(e) && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 1.2) hurtHero(5, e); }); });
      const d1 = Math.hypot(hero.fi - start[0], hero.fj - start[1]);
      if (mod === 'again') { const again = hero.chargeAgain > 0, cd = CD.charge; useSkill(idx); second = !!hero.charge; run(0.8); out.push({ mod, windowOpen: again, cdDuringWindow: cd, secondStarted: second, cdAfter: +CD.charge.toFixed(1), total: +Math.hypot(hero.fi - start[0], hero.fj - start[1]).toFixed(1) }); continue; }
      run(1.2);
      out.push({ mod: mod || 'plain', dist: +d1.toFixed(1), frames, dmg: es.map((e, k) => Math.round(hp0[k] - Math.max(0, e.hp))), dead: es.filter(e => !alive(e)).length, heroLost: h0 - hero.hp, fissures: G.fissures.length, cd: +CD.charge.toFixed(1) });
    }
    return out;
  });
  console.log(JSON.stringify(res, null, 0)); console.log(errs.slice(0, 3).join('\n') || 'no page errors'); await b.close();
})();
