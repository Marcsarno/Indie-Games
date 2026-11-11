const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('ERR', String(e.stack || e).slice(0, 300))); p.on('console', m => { if (m.type() === 'error') console.log('CON', m.text().slice(0, 300)); }); p.on('requestfailed', r => console.log('FAIL', r.url().slice(-60)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('http://localhost:8202/index.html'); await p.waitForFunction('window.R3D && window.R3D.ready', null, { timeout: 90000 });
  const [out, cls, lvl, skill, frames] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], +(process.argv[6] || 25)];
  await p.evaluate(async ([cls, lvl, skill, frames]) => {
    const gl = R3D.renderer.getContext(); const step = n => { for (let i = 0; i < n; i++) { update(1 / 60); render(); gl.finish(); } };
    newHero(cls); G.mode = 'play'; hero.lvl = 12; startLevel(lvl, 1000 + lvl * 37); hero.hp = STAT.maxHp = 99999; LV.vis.fill(1); G.msg = []; G.actCard = 0;
    enemies.slice(0, 9).forEach((m, k) => { m.fi = hero.fi + 2.2 + (k % 3) * 1.1; m.fj = hero.fj - 1.2 + Math.floor(k / 3) * 1.2; });
    step(3); await new Promise(r => setTimeout(r, 3500)); step(60); await new Promise(r => setTimeout(r, 1500)); step(20);
    if (skill >= 0) { CD[SKILLS[skill].id] = 0; hero.mana = 9999; hero.fury = 99; useSkill(skill); } else input.attack = true;
    step(frames);
  }, [cls, lvl, skill, frames]);
  console.log(await p.evaluate(() => JSON.stringify({ models: Object.keys(R3D.MODELS).length, nulls: Object.entries(R3D.MODELS).filter(e => !e[1]).map(e => e[0]).slice(0, 5), glb: performance.getEntriesByType('resource').filter(r => r.name.endsWith('.glb')).length, loading: Object.keys(R3D.MODELS).length, missing: [...R3D.missingChars].slice(0, 4), hero: R3D.actors.get(hero) && R3D.actors.get(hero).key })));
  await p.screenshot({ path: out, timeout: 120000 }); await b.close();
})();
