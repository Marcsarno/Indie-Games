// round 117: where a frame's time goes (Chrome's sampling profiler, self time by function)
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); p.on('pageerror', e => console.log('ERR', String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; Math.random = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); });
  await p.goto('file://' + process.argv[2] + '/index.html' + (process.argv[4] ? '?' + process.argv[4] : ''));
  const cdp = await p.context().newCDPSession(p);
  await p.evaluate((LEVEL) => { newHero('mage'); hero.lvl = 8; recalcHero(); G.mode = 'play'; startLevel(LEVEL, 2024);
    const room = LV.rooms && (LV.rooms[1] || LV.rooms[0]); if (room) { hero.fi = room.cx + 0.5; hero.fj = room.cy + 0.5; }
    for (const e of enemies) e.state = 'hunt'; hero.hp = 1e6; STAT.maxHp = 1e6; hero.mp = 1e6; for (let i = 0; i < 400; i++) warmStep(50);
    window.run = n => { for (let f = 0; f < n; f++) { input.attack = f % 40 < 20; if (f % 90 === 30) { try { useSkill(1); } catch (e) { /* none */ } } hero.mp = 1e6; update(1 / 60); warmStep(2); render(); } }; run(300); }, +(process.argv[3] || 3));
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  await p.evaluate(() => run(900));
  const { profile } = await cdp.send('Profiler.stop');
  const self = {}, dt = profile.timeDeltas, byId = {}; profile.nodes.forEach(n => byId[n.id] = n);
  profile.samples.forEach((id, i) => { const n = byId[id], k = n.callFrame.functionName || '(anon:' + n.callFrame.lineNumber + ')'; self[k] = (self[k] || 0) + dt[i]; });
  const tot = Object.values(self).reduce((a, c) => a + c, 0);
  console.log(Object.entries(self).sort((a, c) => c[1] - a[1]).slice(0, 26).map(([k, v]) => `${(v / 900 / 1000).toFixed(3)} ms  ${(v / tot * 100).toFixed(1)}%  ${k}`).join('\n'));
  await b.close(); })();
