// round 111b: the opening over a slow phone connection, with real taps: does every line have its sound when it
// plays? Serves the game over http, throttles it, taps through the splash and the seat, logs each line.
// node loadtest.cjs [gameDir] [kbps]
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
(async () => { const [game = 'game', kbps = '1600'] = process.argv.slice(2), root = path.resolve(game);
  const types = { '.js': 'text/javascript', '.html': 'text/html', '.mp3': 'audio/mpeg', '.png': 'image/png', '.json': 'application/json', '.m4a': 'audio/mp4' };
  const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(8711);
  const b = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] }), p = await b.newPage({ viewport: { width: 390, height: 780 } }), errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => localStorage.clear());
  const cdp = await p.context().newCDPSession(p); await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: +kbps * 1024 / 8, uploadThroughput: 100000 });
  await p.goto('http://localhost:8711/index.html?cine=1', { timeout: 180000 });
  await p.evaluate(() => { const o = vo; window.__vo = []; vo = (n, f, pile) => { window.__vo.push([n, !!VO.buf[n], +G.t.toFixed(2)]); return o(n, f, pile); }; });
  const box = await p.locator('canvas').boundingBox(), tap = () => p.mouse.click(box.x + box.width / 2, box.y + box.height * 0.45);
  await p.waitForTimeout(2500); await tap();   // TAP TO BEGIN (as a person would, a moment after the page shows)
  const t0 = Date.now(); let ready = null;
  for (let i = 0; i < 600; i++) { await p.waitForTimeout(100); const st = await p.evaluate(() => ({ k: G.cine && G.cine.k, gate: !!(G.cine && G.cine.shots[G.cine.k].gate), ok: G.cine && cineGateReady(G.cine), vl: voLoaded(), ml: musicLoaded(), ctx: SFX.ctx && SFX.ctx.state }));
    if (st.gate && st.ok) { ready = ((Date.now() - t0) / 1000).toFixed(1) + 's ' + JSON.stringify(st); break; } }
  console.log('seat ready after', ready);
  await tap();   // TAP TO SIT DOWN
  await p.waitForFunction(() => G.cine && G.cine.shots[G.cine.k].minis, null, { timeout: 120000 });
  const log = await p.evaluate(() => window.__vo);
  console.log(log.map(([n, ok, t]) => `${t}s ${n} ${ok ? 'SOUND' : 'SILENT'}`).join('\n'));
  console.log(errs.slice(0, 3).join('\n') || 'no errors'); await b.close(); srv.close(); })();
