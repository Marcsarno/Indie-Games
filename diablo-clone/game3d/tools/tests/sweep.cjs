// plays each class through Act I's areas and side areas in the 3D build, using every skill, and reports errors
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 1 });
  const errs = new Map(); const note = s => errs.set(s, (errs.get(s) || 0) + 1);
  p.on('pageerror', e => note('PAGE ' + String(e.stack || e).slice(0, 300))); p.on('console', m => { if (m.type() === 'error') note('CON ' + m.text().slice(0, 300)); });
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('http://localhost:8202/index.html');
  await p.waitForFunction('window.R3D && window.R3D.ready', null, { timeout: 90000 });
  for (const cls of (process.argv[2] || 'warrior,mage,ranger').split(',')) {
    const log = await p.evaluate(async (cls) => {
      const out = []; const step = n => { for (let i = 0; i < n; i++) { update(1 / 60); render(); } };
      newHero(cls); G.mode = 'play'; hero.lvl = 12;
      for (let L = 1; L <= 5; L++) {
        const t0 = performance.now(); startLevel(L, 1000 + L * 37); hero.hp = STAT.maxHp = 99999; hero.mana = 9999; LV.vis.fill(1);
        const near = enemies.slice(0, 10); near.forEach((m, k) => { m.fi = hero.fi + 1.4 + (k % 4); m.fj = hero.fj - 1 + Math.floor(k / 4) * 1.3; });
        input.attack = true; step(90); input.attack = false;
        for (let k = 0; k < SKILLS.length; k++) { try { CD[SKILLS[k].id] = 0; hero.mana = 9999; hero.fury = 99; useSkill(k); } catch (e) { out.push('skill ' + k + ' ' + e); } step(45); }
        await new Promise(r => setTimeout(r, 300)); step(20);
        out.push(`${cls} L${L} ${areaName()} enemies=${enemies.length} calls=${R3D.renderer.info.render.calls} tris=${R3D.renderer.info.render.triangles} missing=${[...R3D.missingProps].join(',')} ${Math.round(performance.now() - t0)}ms`);
        if (L === 1) for (const side of ['den', 'tower', 'barrow', 'barrow2', 'cellar']) { try { enterSide(side); if (G.fadeTo) { const f = G.fadeTo; G.fadeTo = null; f(); } LV.vis.fill(1); step(30); out.push(`  side ${side}: ${areaName()} enemies=${enemies.length} missing=${[...R3D.missingProps].join(',')}`); } catch (e) { out.push('  side ' + side + ' ' + String(e).slice(0, 120)); } }
      }
      return out;
    }, cls);
    console.log(log.join('\n'));
  }
  for (const [k, v] of errs) console.log(v + 'x ' + k);
  if (!errs.size) console.log('no errors');
  await b.close();
})();
