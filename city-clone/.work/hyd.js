// Round 42 test: drive the player car through a fire hydrant, screenshot the water jet.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => console.log('ERR', e.message));
  await pg.goto('http://localhost:8102/?world=cc&fresh&notitle', { timeout: 120000 });
  await pg.waitForFunction(() => window.__city && document.getElementById('loading').hidden, null, { timeout: 240000 });
  const r = await pg.evaluate(() => { const C = window.__city, w = C.world, h = w.hydrants[40]; C.setManual(true); const v = C.drive;
    for (let i = 0; i < 30; i++) { v.x = h[0] - .3; v.z = -h[1]; v.vx = 9; v.vz = 0; C.tick(1 / 30, false); if (i > 2) { v.vx = 0; v.vz = 0; v.x = h[0] - 6; } }
    C.renderer.render(C.scene, C.camera); return h; });
  await pg.screenshot({ path: 'm2/hyd.png' }); console.log('hydrant', JSON.stringify(r)); await b.close();
})();
