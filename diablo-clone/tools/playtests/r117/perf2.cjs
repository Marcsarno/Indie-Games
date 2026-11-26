// round 117: one build's render time as it ships (defaults). node perf2.cjs <gameDir> [level]  (run old, new, old, new)
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); p.on('pageerror', e => console.log('ERR', String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; Math.random = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); });
  await p.goto('file://' + process.argv[2] + '/index.html');
  console.log(await p.evaluate((LEVEL) => {
    newHero('mage'); hero.lvl = 8; recalcHero(); G.mode = 'play'; startLevel(LEVEL, 2024);
    const room = LV.rooms && (LV.rooms[1] || LV.rooms[0]); if (room) { hero.fi = room.cx + 0.5; hero.fj = room.cy + 0.5; }
    for (const e of enemies) e.state = 'hunt'; hero.hp = 1e6; STAT.maxHp = 1e6; hero.mp = 1e6; for (let i = 0; i < 400; i++) warmStep(50);
    const T = [];
    for (let f = 0; f < 1200; f++) { input.attack = f % 40 < 20; if (f % 90 === 30) { try { useSkill(1); } catch (e) { /* none */ } } hero.mp = 1e6; update(1 / 60); warmStep(2); const a = performance.now(); render(); T.push(performance.now() - a); }
    const s = T.slice(300).sort((x, y) => x - y); return 'render median ' + s[s.length >> 1].toFixed(2) + ' p95 ' + s[Math.floor(s.length * 0.95)].toFixed(2) + ' mean ' + (s.reduce((a, c) => a + c, 0) / s.length).toFixed(2); }, +(process.argv[3] || 3)));
  await b.close(); })();
