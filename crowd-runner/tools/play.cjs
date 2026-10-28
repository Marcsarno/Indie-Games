// Headless driver: steps the game frame by frame and saves screenshots.
//   node tools/play.cjs <outdir> [bot=good|fail] [t1,t2,...]   (seconds of game time for each screenshot)
// Files are served through Playwright request interception, so no server socket is opened.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', process.env.DIST ? 'dist' : '.');
const [, , outdir = 'out', bot = 'good', times = '1,4,8,14,20,28,36'] = process.argv;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png' };
fs.mkdirSync(outdir, { recursive: true });

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 470, height: 836 }, deviceScaleFactor: 2 });
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log(m.type() + ':', m.text()); });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.route('http://crowd.test/**', route => {
    const u = new URL(route.request().url());
    const fp = path.join(root, decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
    if (fs.existsSync(fp) && fs.statSync(fp).isFile())
      return route.fulfill({ status: 200, contentType: types[path.extname(fp)] || 'application/octet-stream', body: fs.readFileSync(fp) });
    route.fulfill({ status: 404, body: 'not found' });
  });
  await p.goto(`http://crowd.test/index.html?manual=1${bot === 'none' ? '' : '&bot=' + bot}`);
  await p.waitForFunction('window.__ready', null, { timeout: 60000 });
  let now = 0;
  for (const t of times.split(',').map(Number)) {
    await p.evaluate(s => window.__crowd.advance(s), t - now); now = t;
    const st = await p.evaluate(() => { const g = window.__crowd.game; return { state: g.state, n: g.squad.n, z: +g.squad.z.toFixed(1), coins: g.coins, fire: g.squad.fire, weapon: g.squad.weapon, zombies: g.zombies.length, boss: g.boss && Math.round(g.boss.hp) }; });
    console.log('t=' + t, JSON.stringify(st));
    await p.screenshot({ path: path.join(outdir, `t${String(t).padStart(3, '0')}.png`) });
    if (st.state === 'win' || st.state === 'fail') break;
  }
  await b.close();
})();
