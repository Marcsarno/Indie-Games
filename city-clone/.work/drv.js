// Drive-camera screenshots at given spots: node drv.js '[["name", x, y, th], ...]'  (plan coords, th = car heading in radians, page convention)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
  pg.on('pageerror', e => console.log('ERR', e.message));
  const t0 = Date.now();
  await pg.goto('http://localhost:' + (process.env.PORT || 8102) + '/?world=cc&fresh&notitle', { timeout: 120000 });
  await pg.waitForFunction(() => window.__city && document.getElementById('loading').hidden, null, { timeout: 240000 });
  console.log('loaded in', (Date.now() - t0) / 1000, 's', JSON.stringify(await pg.evaluate(() => window.__merge)));
  for (const [name, x, y, th] of JSON.parse(process.argv[2])) {
    await pg.evaluate(([x, y, th]) => { const C = window.__city; C.setManual(true); const v = C.drive; v.x = x; v.z = -y; v.th = th; v.vx = v.vz = v.w = 0;
      for (let i = 0; i < 40; i++) { v.x = x; v.z = -y; v.th = th; v.vx = v.vz = 0; C.tick(1 / 30, false); } C.renderer.render(C.scene, C.camera); }, [x, y, th]);
    await pg.screenshot({ path: name + '.png' });
    const info = await pg.evaluate(() => { const r = window.__city.renderer.info.render; return [r.calls, r.triangles]; }); console.log(name, 'calls/tris', info.join(' '));
  }
  await b.close();
})();
