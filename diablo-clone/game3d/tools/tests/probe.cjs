const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('ERR', String(e.stack || e).slice(0, 600))); p.on('console', m => { if (m.type() === 'error') console.log('CON', m.text().slice(0, 400)); });
  await p.addInitScript(() => { window.__raf = window.requestAnimationFrame; window.requestAnimationFrame = () => 0; });
  await p.goto('http://localhost:8202/index.html');
  await p.waitForFunction('window.R3D && window.R3D.ready', null, { timeout: 90000 });
  const lvl = +(process.argv[3] || 1);
  const r = await p.evaluate(async ([lvl, code]) => {
    const t0 = performance.now(); newHero('warrior'); G.mode = 'play'; startLevel(lvl, 1000 + lvl * 37); const t1 = performance.now();
    if (code) eval(code);
    LV.vis.fill(1); update(1 / 60); render(); const t2 = performance.now();
    await new Promise(r => setTimeout(r, 3000)); for (let i = 0; i < 40; i++) { update(1 / 60); render(); } await new Promise(r => setTimeout(r, 1500)); for (let i = 0; i < 5; i++) { update(1 / 60); render(); } const t3 = performance.now(); render(); const t4 = performance.now(); render(); const t5 = performance.now();
    return JSON.stringify({ start: Math.round(t1 - t0), first: Math.round(t2 - t1), frame: Math.round(t4 - t3), frame2: Math.round(t5 - t4), props: props.length, unnamed: R3D.unnamedProps, missing: [...R3D.missingProps].join(' '), calls: R3D.renderer.info.render.calls, tris: R3D.renderer.info.render.triangles, geos: R3D.renderer.info.memory.geometries, enemies: enemies.length, npcs: npcs.length });
  }, [lvl, process.argv[4] || '']);
  console.log(r);
  await p.screenshot({ path: process.argv[2], timeout: 120000 });
  await b.close();
})();
